import type { z } from 'zod';
import type {
	ClairifaiConfig,
	PipelineStage,
	ParsedTranscript,
	ExtractionResult,
	ClarifyResult,
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
import { buildClarifyPrompt } from './stages/clarify.js';
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

export type PipelineResult = {
	report: string;
	folder: string;
	ticketsGenerated: number;
	questionsRemaining: number;
	extracted: ExtractionResult;
	reviewed: ClarifyResult;
};

export async function processTranscript(
	transcriptPath: string,
	transcriptContent: string,
	config: ClairifaiConfig,
	callbacks: StageCallbacks,
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
	const parseRaw = await runStage('parse', parsePrompt, config, callbacks);
	const parsed = validateStageOutput<ParsedTranscript>(parseRaw, parsedTranscriptSchema, 'parse');
	const parseFilename = await recordVersion(folder, 'parse', parseVersion);
	await writeStageOutput(folder, parseFilename, JSON.stringify(parsed, null, 2));
	await writeStatus(folder, { stage: 'parse', status: 'done', version: parseVersion });

	// ── Stage 2: Extract ──
	manifest = await loadVersionManifest(folder);
	const extractVersion = getNextVersion(manifest, 'extract');
	await writeStatus(folder, { stage: 'extract', status: 'running', version: extractVersion });
	const extractPrompt = buildExtractPrompt(parsed, config.ticketDefaults);
	const extractRaw = await runStage('extract', extractPrompt, config, callbacks);
	const extracted = validateStageOutput<ExtractionResult>(extractRaw, extractionResultSchema, 'extract');
	const extractFilename = await recordVersion(folder, 'extract', extractVersion);
	await writeStageOutput(folder, extractFilename, JSON.stringify(extracted, null, 2));
	await writeStatus(folder, { stage: 'extract', status: 'done', version: extractVersion });

	// ── Stage 3: Clarify ──
	manifest = await loadVersionManifest(folder);
	const clarifyVersion = getNextVersion(manifest, 'clarify');
	await writeStatus(folder, { stage: 'clarify', status: 'running', version: clarifyVersion });
	const clarifyPrompt = buildClarifyPrompt(extracted);
	const clarifyRaw = await runStage('clarify', clarifyPrompt, config, callbacks);
	const reviewed = validateStageOutput<ClarifyResult>(clarifyRaw, clarifyResultSchema, 'clarify');
	const clarifyFilename = await recordVersion(folder, 'clarify', clarifyVersion);
	await writeStageOutput(folder, clarifyFilename, JSON.stringify(reviewed, null, 2));
	await writeStatus(folder, { stage: 'clarify', status: 'done', version: clarifyVersion });

	// ── Stage 4: Generate ──
	await writeStatus(folder, { stage: 'generate', status: 'running' });
	const generatePrompt = buildGeneratePrompt(extracted, reviewed, config);
	const report = await runStage('generate', generatePrompt, config, callbacks);

	// Validate report structure
	const { valid, error: reportError, warnings } = validateReportStructure(report);
	if (!valid && reportError) {
		throw reportError;
	}
	for (const warning of warnings) {
		await appendLog(folder, `WARNING: ${warning}\n`);
	}

	await writeStageOutput(folder, 'report.md', report);
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
		report,
		folder,
		ticketsGenerated: extracted.tickets.length,
		questionsRemaining: reviewed.summary.blocking_questions,
		extracted,
		reviewed,
	};
}
