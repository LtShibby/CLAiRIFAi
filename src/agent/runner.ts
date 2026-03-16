import type { z } from 'zod';
import type {
	ClairifaiConfig,
	PipelineStage,
	ParsedTranscript,
	ExtractionResult,
	ClarifyResult,
	ClairifaiError,
} from '../types.js';
import { runStage, killActiveProcess, type StageCallbacks } from './stage-runner.js';
import { createRunFolder, writeStageOutput, writeStatus, appendLog } from '../state/manager.js';
import { recordVersion, getNextVersion, loadVersionManifest } from '../state/versions.js';
import { appendProgress, type ProgressEntry } from '../state/progress.js';
import { extractJson } from './json-extractor.js';
import { validateReportStructure } from './schemas/report-validator.js';
import { parsedTranscriptSchema } from './schemas/parsed-transcript.js';
import { extractionResultSchema } from './schemas/extracted-tickets.js';
import { clarifyResultSchema } from './schemas/reviewed-tickets.js';
import { buildParsePrompt } from './stages/parse.js';
import { buildExtractPrompt } from './stages/extract.js';
import { buildClarifyPrompt, buildClarifyPromptWithAnswers } from './stages/clarify.js';
import { buildGeneratePrompt } from './stages/generate.js';
import { createError } from '../errors.js';

/**
 * Parse and validate stage output against a Zod schema.
 */
function validateStageOutput<T>(
	raw: string,
	schema: z.ZodType<T>,
	stage: PipelineStage,
): T {
	const { json, error } = extractJson(raw);
	if (error) throw error;

	let parsed: unknown;
	try {
		parsed = JSON.parse(json);
	} catch {
		throw createError('JSON_PARSE_FAILED', `Stage "${stage}" returned unparseable JSON`);
	}

	const result = schema.safeParse(parsed);
	if (!result.success) {
		const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
		throw createError('SCHEMA_VALIDATION_FAILED', `Stage "${stage}": ${issues}`);
	}

	return result.data;
}

export type RetryAction = 'retry' | 'skip' | 'abort';

export type RetryRequest = {
	stage: PipelineStage;
	reason: 'timeout' | 'failed';
	timeoutSeconds: number;
	error: ClairifaiError;
};

export type PipelineCallbacks = StageCallbacks & {
	onRetryNeeded: (request: RetryRequest) => Promise<RetryAction>;
};

export type PipelineResult = {
	report: string;
	folder: string;
	ticketsGenerated: number;
	questionsRemaining: number;
	extracted: ExtractionResult;
	reviewed: ClarifyResult;
};

/**
 * Run a stage with retry support. On timeout/failure, asks the UI what to do.
 * Returns the raw output string, or null if skipped.
 */
async function runStageWithRetry(
	stage: PipelineStage,
	prompt: string,
	config: ClairifaiConfig,
	callbacks: PipelineCallbacks,
): Promise<string | null> {
	let currentTimeout = config.timeouts[stage];

	// eslint-disable-next-line no-constant-condition
	while (true) {
		// Build a config copy with the current (possibly extended) timeout
		const stageConfig: ClairifaiConfig = {
			...config,
			timeouts: { ...config.timeouts, [stage]: currentTimeout },
		};

		try {
			return await runStage(stage, prompt, stageConfig, callbacks);
		} catch (err) {
			const clairifaiErr = err as ClairifaiError;
			const isTimeout = clairifaiErr.code === 'STAGE_TIMEOUT';

			const action = await callbacks.onRetryNeeded({
				stage,
				reason: isTimeout ? 'timeout' : 'failed',
				timeoutSeconds: currentTimeout,
				error: clairifaiErr,
			});

			if (action === 'retry') {
				// Extend timeout by 1.5x on retry
				currentTimeout = Math.round(currentTimeout * 1.5);
				continue;
			} else if (action === 'skip') {
				return null;
			} else {
				// abort
				throw clairifaiErr;
			}
		}
	}
}

export async function processTranscript(
	transcriptPath: string,
	transcriptContent: string,
	config: ClairifaiConfig,
	callbacks: PipelineCallbacks,
): Promise<PipelineResult> {
	const folder = await createRunFolder(transcriptPath);

	// Setup signal handlers for clean interrupt
	const cleanup = async (status: 'interrupted' | 'failed') => {
		killActiveProcess();
		await writeStatus(folder, { stage: 'interrupted', status });
		await appendProgress(process.cwd(), {
			timestamp: new Date().toISOString(),
			transcriptPath,
			runFolder: folder,
			ticketsGenerated: 0,
			questionsRemaining: 0,
			status,
		});
	};

	process.on('SIGINT', () => void cleanup('interrupted').then(() => process.exit(0)));
	process.on('SIGTERM', () => void cleanup('interrupted').then(() => process.exit(0)));

	let manifest = await loadVersionManifest(folder);

	// ── Stage 1: Parse ──
	const parseVersion = getNextVersion(manifest, 'parse');
	await writeStatus(folder, { stage: 'parse', status: 'running', version: parseVersion });
	const parsePrompt = buildParsePrompt(transcriptContent);
	const parseRaw = await runStageWithRetry('parse', parsePrompt, config, callbacks);
	if (!parseRaw) {
		throw createError('STAGE_FAILED', 'Stage "parse" was skipped — cannot continue without parsed transcript');
	}
	const parsed = validateStageOutput<ParsedTranscript>(parseRaw, parsedTranscriptSchema, 'parse');
	const parseFilename = await recordVersion(folder, 'parse', parseVersion);
	await writeStageOutput(folder, parseFilename, JSON.stringify(parsed, null, 2));
	await writeStatus(folder, { stage: 'parse', status: 'done', version: parseVersion });

	// ── Stage 2: Extract ──
	manifest = await loadVersionManifest(folder);
	const extractVersion = getNextVersion(manifest, 'extract');
	await writeStatus(folder, { stage: 'extract', status: 'running', version: extractVersion });
	const extractPrompt = buildExtractPrompt(parsed, config.ticketDefaults);
	const extractRaw = await runStageWithRetry('extract', extractPrompt, config, callbacks);
	if (!extractRaw) {
		throw createError('STAGE_FAILED', 'Stage "extract" was skipped — cannot continue without extracted tickets');
	}
	const extracted = validateStageOutput<ExtractionResult>(extractRaw, extractionResultSchema, 'extract');
	const extractFilename = await recordVersion(folder, 'extract', extractVersion);
	await writeStageOutput(folder, extractFilename, JSON.stringify(extracted, null, 2));
	await writeStatus(folder, { stage: 'extract', status: 'done', version: extractVersion });

	// ── Stage 3: Clarify ──
	manifest = await loadVersionManifest(folder);
	const clarifyVersion = getNextVersion(manifest, 'clarify');
	await writeStatus(folder, { stage: 'clarify', status: 'running', version: clarifyVersion });
	const clarifyPrompt = buildClarifyPrompt(extracted);
	const clarifyRaw = await runStageWithRetry('clarify', clarifyPrompt, config, callbacks);
	if (!clarifyRaw) {
		throw createError('STAGE_FAILED', 'Stage "clarify" was skipped — cannot continue without review');
	}
	const reviewed = validateStageOutput<ClarifyResult>(clarifyRaw, clarifyResultSchema, 'clarify');
	const clarifyFilename = await recordVersion(folder, 'clarify', clarifyVersion);
	await writeStageOutput(folder, clarifyFilename, JSON.stringify(reviewed, null, 2));
	await writeStatus(folder, { stage: 'clarify', status: 'done', version: clarifyVersion });

	// ── Stage 4: Generate ──
	await writeStatus(folder, { stage: 'generate', status: 'running' });
	const generatePrompt = buildGeneratePrompt(extracted, reviewed, config);
	const reportRaw = await runStageWithRetry('generate', generatePrompt, config, callbacks);
	if (!reportRaw) {
		throw createError('STAGE_FAILED', 'Stage "generate" was skipped — no report produced');
	}

	// Validate report structure
	const { valid, error: reportError, warnings } = validateReportStructure(reportRaw);
	if (!valid && reportError) {
		throw reportError;
	}
	for (const warning of warnings) {
		await appendLog(folder, `WARNING: ${warning}\n`);
	}

	await writeStageOutput(folder, 'report.md', reportRaw);
	await writeStatus(folder, { stage: 'generate', status: 'done' });

	// Record progress
	const progressEntry: ProgressEntry = {
		timestamp: new Date().toISOString(),
		transcriptPath,
		runFolder: folder,
		ticketsGenerated: extracted.tickets.length,
		questionsRemaining: reviewed.summary.blocking_questions + reviewed.summary.important_questions,
		status: 'completed',
	};
	await appendProgress(process.cwd(), progressEntry);

	return {
		report: reportRaw,
		folder,
		ticketsGenerated: extracted.tickets.length,
		questionsRemaining: reviewed.summary.blocking_questions,
		extracted,
		reviewed,
	};
}

/**
 * Re-run stages 3 (clarify) and 4 (generate) for an existing run,
 * incorporating user answers to previously open questions.
 */
export async function continueFromClarify(
	folder: string,
	extracted: ExtractionResult,
	previousReview: ClarifyResult,
	answers: Record<string, string>,
	config: ClairifaiConfig,
	callbacks: PipelineCallbacks,
): Promise<PipelineResult> {
	let manifest = await loadVersionManifest(folder);

	// ── Stage 3: Re-Clarify with answers ──
	const clarifyVersion = getNextVersion(manifest, 'clarify');
	const answeredIds = Object.keys(answers);
	await writeStatus(folder, { stage: 'clarify', status: 'running', version: clarifyVersion });
	const clarifyPrompt = buildClarifyPromptWithAnswers(extracted, previousReview, answers);
	const clarifyRaw = await runStageWithRetry('clarify', clarifyPrompt, config, callbacks);
	if (!clarifyRaw) {
		throw createError('STAGE_FAILED', 'Stage "clarify" was skipped during continue');
	}
	const reviewed = validateStageOutput<ClarifyResult>(clarifyRaw, clarifyResultSchema, 'clarify');
	const clarifyFilename = await recordVersion(folder, 'clarify', clarifyVersion, answeredIds);
	await writeStageOutput(folder, clarifyFilename, JSON.stringify(reviewed, null, 2));
	await writeStatus(folder, { stage: 'clarify', status: 'done', version: clarifyVersion });

	// ── Stage 4: Re-Generate ──
	await writeStatus(folder, { stage: 'generate', status: 'running' });
	const generatePrompt = buildGeneratePrompt(extracted, reviewed, config);
	const reportRaw = await runStageWithRetry('generate', generatePrompt, config, callbacks);
	if (!reportRaw) {
		throw createError('STAGE_FAILED', 'Stage "generate" was skipped during continue');
	}

	const { valid, error: reportError, warnings } = validateReportStructure(reportRaw);
	if (!valid && reportError) {
		throw reportError;
	}
	for (const warning of warnings) {
		await appendLog(folder, `WARNING: ${warning}\n`);
	}

	await writeStageOutput(folder, 'report.md', reportRaw);
	await writeStatus(folder, { stage: 'generate', status: 'done' });

	// Record progress
	const progressEntry: ProgressEntry = {
		timestamp: new Date().toISOString(),
		transcriptPath: folder,
		runFolder: folder,
		ticketsGenerated: extracted.tickets.length,
		questionsRemaining: reviewed.summary.blocking_questions + reviewed.summary.important_questions,
		status: 'completed',
	};
	await appendProgress(process.cwd(), progressEntry);

	return {
		report: reportRaw,
		folder,
		ticketsGenerated: extracted.tickets.length,
		questionsRemaining: reviewed.summary.blocking_questions,
		extracted,
		reviewed,
	};
}
