import { execSync } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { createError } from './errors.js';
import type { ClairifaiConfig, ClairifaiError } from './types.js';

export async function runPreflightChecks(
	transcriptPath: string,
	config: ClairifaiConfig,
): Promise<ClairifaiError[]> {
	const errors: ClairifaiError[] = [];

	// Check Node.js version
	const nodeVersion = process.versions.node;
	const major = parseInt(nodeVersion.split('.')[0], 10);
	if (major < 22) {
		errors.push(createError('NODE_VERSION_UNSUPPORTED', `Found v${nodeVersion}`));
	}

	// Check Claude Code CLI
	try {
		execSync('claude --version', { stdio: 'ignore' });
	} catch {
		errors.push(createError('CLAUDE_NOT_FOUND'));
	}

	// Check Claude Code auth (quick test)
	try {
		execSync('claude --print "test"', { stdio: 'ignore', timeout: 10000 });
	} catch {
		errors.push(createError('CLAUDE_AUTH_FAILED'));
	}

	// Check transcript file exists
	try {
		await stat(transcriptPath);
	} catch {
		errors.push(createError('TRANSCRIPT_NOT_FOUND', transcriptPath));
	}

	return errors;
}

export async function validateTranscript(
	content: string,
	config: ClairifaiConfig,
): Promise<ClairifaiError | null> {
	if (content.trim().length === 0) {
		return createError('TRANSCRIPT_EMPTY');
	}

	// Rough token estimate: ~4 chars per token
	const estimatedTokens = Math.ceil(content.length / 4);
	if (estimatedTokens > config.maxTranscriptTokens) {
		return createError(
			'TRANSCRIPT_TOO_LONG',
			`Estimated ${estimatedTokens.toLocaleString()} tokens (max: ${config.maxTranscriptTokens.toLocaleString()})`,
		);
	}

	return null;
}
