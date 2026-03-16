import { mkdir, readdir, readFile, writeFile, appendFile, copyFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { RunSummary } from '../types.js';
import { loadVersionManifest } from './versions.js';

function runFolder(transcriptPath: string): string {
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
	const basename = path.basename(transcriptPath, path.extname(transcriptPath));
	return path.join(process.cwd(), '.clairifai', 'runs', `${timestamp}-${basename}`);
}

export async function createRunFolder(transcriptPath: string): Promise<string> {
	const folder = runFolder(transcriptPath);
	await mkdir(folder, { recursive: true });

	// Copy original transcript for reference
	const transcriptDest = path.join(folder, 'transcript.txt');
	await copyFile(transcriptPath, transcriptDest);

	return folder;
}

export async function writeStatus(
	folder: string,
	state: { stage: string; status: string; version?: number },
): Promise<void> {
	const statusPath = path.join(folder, 'status.json');
	const status = {
		...state,
		updatedAt: new Date().toISOString(),
	};
	await writeFile(statusPath, JSON.stringify(status, null, 2));
}

export async function writeStageOutput(
	folder: string,
	filename: string,
	content: string,
): Promise<void> {
	await writeFile(path.join(folder, filename), content);
}

export async function appendLog(folder: string, chunk: string): Promise<void> {
	await appendFile(path.join(folder, 'log.txt'), chunk);
}

// ─── Read functions for menu-driven UI ───

export function getRunFolder(runId: string, cwd?: string): string {
	return path.join(cwd ?? process.cwd(), '.clairifai', 'runs', runId);
}

export async function listRuns(cwd?: string): Promise<RunSummary[]> {
	const runsDir = path.join(cwd ?? process.cwd(), '.clairifai', 'runs');

	let entries: string[];
	try {
		entries = await readdir(runsDir);
	} catch {
		return [];
	}

	const runs: RunSummary[] = [];

	for (const entry of entries) {
		const folder = path.join(runsDir, entry);
		const folderStat = await stat(folder).catch(() => null);
		if (!folderStat?.isDirectory()) continue;

		// Read status.json
		let status: Record<string, unknown> = {};
		try {
			const raw = await readFile(path.join(folder, 'status.json'), 'utf8');
			status = JSON.parse(raw) as Record<string, unknown>;
		} catch {
			// No status file — skip this run
			continue;
		}

		// Read versions.json for completed stages
		const manifest = await loadVersionManifest(folder);
		const completedStages = [...new Set(manifest.entries.map(e => e.stage))];

		// Check if report exists
		const hasReport = await stat(path.join(folder, 'report.md')).then(() => true).catch(() => false);

		// Try to get ticket count and question count from stage outputs
		let ticketCount = 0;
		let questionCount = 0;

		// Find latest extract output
		const extractEntries = manifest.entries.filter(e => e.stage === 'extract');
		if (extractEntries.length > 0) {
			const latestExtract = extractEntries[extractEntries.length - 1];
			try {
				const raw = await readFile(path.join(folder, latestExtract.filename), 'utf8');
				const data = JSON.parse(raw) as { tickets?: unknown[] };
				ticketCount = data.tickets?.length ?? 0;
			} catch { /* ignore */ }
		}

		// Find latest clarify output for question count
		const clarifyEntries = manifest.entries.filter(e => e.stage === 'clarify');
		if (clarifyEntries.length > 0) {
			const latestClarify = clarifyEntries[clarifyEntries.length - 1];
			try {
				const raw = await readFile(path.join(folder, latestClarify.filename), 'utf8');
				const data = JSON.parse(raw) as { summary?: { blocking_questions?: number; important_questions?: number } };
				questionCount = (data.summary?.blocking_questions ?? 0) + (data.summary?.important_questions ?? 0);
			} catch { /* ignore */ }
		}

		// Extract transcript name from folder name (strip timestamp prefix)
		const transcriptName = entry.replace(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-/, '');

		runs.push({
			runId: entry,
			folder,
			transcriptName,
			status: (status.status as string) ?? 'unknown',
			lastStage: (status.stage as string) ?? 'unknown',
			updatedAt: (status.updatedAt as string) ?? '',
			completedStages,
			ticketCount,
			questionCount,
			hasReport,
		});
	}

	// Sort by date descending (folder names start with ISO timestamps)
	runs.sort((a, b) => b.runId.localeCompare(a.runId));

	return runs;
}

export async function loadStageOutput<T>(folder: string, stage: string, version?: number): Promise<T | null> {
	const manifest = await loadVersionManifest(folder);
	const stageEntries = manifest.entries.filter(e => e.stage === stage);

	if (stageEntries.length === 0) return null;

	const entry = version
		? stageEntries.find(e => e.version === version)
		: stageEntries[stageEntries.length - 1]; // latest

	if (!entry) return null;

	try {
		const raw = await readFile(path.join(folder, entry.filename), 'utf8');
		return JSON.parse(raw) as T;
	} catch {
		return null;
	}
}
