import type { ErrorCode, ClairifaiError } from './types.js';

export const ERRORS: Record<ErrorCode, Omit<ClairifaiError, 'details'>> = {
	CLAUDE_NOT_FOUND: {
		code: 'CLAUDE_NOT_FOUND',
		message: 'Claude Code CLI not found',
		recoverable: false,
		suggestion: 'Install Claude Code: npm install -g @anthropic-ai/claude-code',
	},
	CLAUDE_AUTH_FAILED: {
		code: 'CLAUDE_AUTH_FAILED',
		message: 'Claude Code authentication failed',
		recoverable: false,
		suggestion: 'Run "claude login" to authenticate',
	},
	NODE_VERSION_UNSUPPORTED: {
		code: 'NODE_VERSION_UNSUPPORTED',
		message: 'Node.js 22+ is required',
		recoverable: false,
		suggestion: 'Upgrade Node.js: https://nodejs.org/',
	},
	CONFIG_INVALID: {
		code: 'CONFIG_INVALID',
		message: 'Configuration file is invalid',
		recoverable: true,
		suggestion: 'Check .clairifai.json for syntax errors or delete it to regenerate defaults',
	},
	TRANSCRIPT_NOT_FOUND: {
		code: 'TRANSCRIPT_NOT_FOUND',
		message: 'Transcript file not found',
		recoverable: true,
		suggestion: 'Check the file path and try again',
	},
	TRANSCRIPT_TOO_LONG: {
		code: 'TRANSCRIPT_TOO_LONG',
		message: 'Transcript exceeds maximum length',
		recoverable: true,
		suggestion: 'Split the transcript into smaller sections or trim unnecessary content',
	},
	TRANSCRIPT_EMPTY: {
		code: 'TRANSCRIPT_EMPTY',
		message: 'Transcript file is empty',
		recoverable: true,
		suggestion: 'Provide a transcript with content',
	},
	STAGE_TIMEOUT: {
		code: 'STAGE_TIMEOUT',
		message: 'Stage timed out',
		recoverable: true,
		suggestion: 'Retry with a longer timeout or simplify the transcript',
	},
	STAGE_FAILED: {
		code: 'STAGE_FAILED',
		message: 'Stage failed',
		recoverable: true,
		suggestion: 'Check the error details and retry',
	},
	JSON_PARSE_FAILED: {
		code: 'JSON_PARSE_FAILED',
		message: 'Failed to parse JSON from Claude output',
		recoverable: true,
		suggestion: 'Retry the stage — this is usually a transient issue',
	},
	SCHEMA_VALIDATION_FAILED: {
		code: 'SCHEMA_VALIDATION_FAILED',
		message: 'Stage output failed schema validation',
		recoverable: true,
		suggestion: 'Retry the stage — if persistent, report this as a bug',
	},
	REPORT_STRUCTURE_INVALID: {
		code: 'REPORT_STRUCTURE_INVALID',
		message: 'Generated report is missing required sections',
		recoverable: true,
		suggestion: 'Retry the generate stage',
	},
	GITHUB_TOKEN_MISSING: {
		code: 'GITHUB_TOKEN_MISSING',
		message: 'GITHUB_TOKEN environment variable not set',
		recoverable: false,
		suggestion: 'Set GITHUB_TOKEN in your environment to push issues',
	},
	GITHUB_PUSH_FAILED: {
		code: 'GITHUB_PUSH_FAILED',
		message: 'Failed to create GitHub issues',
		recoverable: true,
		suggestion: 'Check your GITHUB_TOKEN permissions and try again',
	},
};

export function createError(
	code: ErrorCode,
	details?: string,
): ClairifaiError {
	return {
		...ERRORS[code],
		details,
	};
}

export function formatError(error: ClairifaiError): string {
	let output = `✗ ${error.message}`;
	if (error.details) {
		output += `\n  ${error.details}`;
	}
	if (error.suggestion) {
		output += `\n  → ${error.suggestion}`;
	}
	return output;
}
