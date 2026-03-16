import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { ClairifaiConfig } from './types.js';
import { createError } from './errors.js';

const timeoutSchema = z.object({
	parse: z.number().positive().default(300),
	extract: z.number().positive().default(300),
	clarify: z.number().positive().default(300),
	generate: z.number().positive().default(300),
});

const configSchema = z.object({
	repo: z.string().regex(/^[^/]+\/[^/]+$/, 'Must be in "owner/repo" format').optional(),
	outputFormat: z.enum(['markdown', 'jira-json', 'both']).default('markdown'),
	timeouts: timeoutSchema.default({}),
	maxTranscriptTokens: z.number().positive().default(100000),
	claudeFlags: z.array(z.string()).default(['--print']),
	ticketDefaults: z.object({
		userStoryFormat: z.enum(['as-a-i-want', 'job-story', 'plain']).default('as-a-i-want'),
		acceptanceCriteriaFormat: z.enum(['given-when-then', 'checklist']).default('given-when-then'),
		includeTechnicalNotes: z.boolean().default(true),
		includeOutOfScope: z.boolean().default(true),
	}).default({}),
	jira: z.object({
		projectKey: z.string(),
		baseUrl: z.string().url(),
		customFields: z.record(z.string()).default({}),
	}).optional(),
	confidenceThreshold: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
});

export async function loadConfig(): Promise<ClairifaiConfig> {
	const configPath = path.join(process.cwd(), '.clairifai.json');

	let parsed: Record<string, unknown> = {};
	let fileExisted = false;
	try {
		const raw = await readFile(configPath, 'utf8');
		fileExisted = true;
		parsed = JSON.parse(raw) as Record<string, unknown>;
	} catch (error) {
		if (fileExisted) {
			throw createError('CONFIG_INVALID', 'File contains invalid JSON');
		}
	}

	const result = configSchema.safeParse(parsed);
	if (!result.success) {
		const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
		throw createError('CONFIG_INVALID', issues);
	}

	if (!fileExisted) {
		await writeFile(configPath, JSON.stringify(result.data, null, '\t') + '\n', 'utf8');
	}

	return result.data as ClairifaiConfig;
}
