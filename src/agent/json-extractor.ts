import { createError } from '../errors.js';
import type { ClairifaiError } from '../types.js';

/**
 * Extract JSON from Claude Code output.
 * Handles:
 * - Raw JSON
 * - JSON in ```json fences
 * - JSON with preamble/postamble text
 * - Nested code blocks (extracts outermost JSON)
 */
export function extractJson(raw: string): { json: string; error: ClairifaiError | null } {
	const trimmed = raw.trim();

	// If it starts with { or [, try parsing directly
	if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
		const endChar = trimmed.startsWith('{') ? '}' : ']';
		const lastEnd = trimmed.lastIndexOf(endChar);
		if (lastEnd !== -1) {
			const candidate = trimmed.slice(0, lastEnd + 1);
			if (isValidJson(candidate)) {
				return { json: candidate, error: null };
			}
		}
	}

	// Try to find JSON in markdown fences
	// Match the LAST complete fence block (in case there are multiple)
	const fenceRegex = /```(?:json)?\s*\n([\s\S]*?)\n```/g;
	let lastMatch: string | null = null;
	let match;
	while ((match = fenceRegex.exec(trimmed)) !== null) {
		const candidate = match[1].trim();
		if (isValidJson(candidate)) {
			lastMatch = candidate;
		}
	}
	if (lastMatch) {
		return { json: lastMatch, error: null };
	}

	// Try to find JSON object/array anywhere in the text
	const jsonStart = findJsonStart(trimmed);
	if (jsonStart !== -1) {
		const extracted = extractBalancedJson(trimmed, jsonStart);
		if (extracted && isValidJson(extracted)) {
			return { json: extracted, error: null };
		}
	}

	return {
		json: '',
		error: createError('JSON_PARSE_FAILED', `Could not find valid JSON in output:\n${trimmed.slice(0, 500)}`),
	};
}

function isValidJson(str: string): boolean {
	try {
		JSON.parse(str);
		return true;
	} catch {
		return false;
	}
}

function findJsonStart(str: string): number {
	const objStart = str.indexOf('{');
	const arrStart = str.indexOf('[');

	if (objStart === -1) return arrStart;
	if (arrStart === -1) return objStart;
	return Math.min(objStart, arrStart);
}

function extractBalancedJson(str: string, start: number): string | null {
	const openChar = str[start];
	const closeChar = openChar === '{' ? '}' : ']';

	let depth = 0;
	let inString = false;
	let escape = false;

	for (let i = start; i < str.length; i++) {
		const char = str[i];

		if (escape) {
			escape = false;
			continue;
		}

		if (char === '\\' && inString) {
			escape = true;
			continue;
		}

		if (char === '"') {
			inString = !inString;
			continue;
		}

		if (inString) continue;

		if (char === openChar) depth++;
		if (char === closeChar) depth--;

		if (depth === 0) {
			return str.slice(start, i + 1);
		}
	}

	return null;
}
