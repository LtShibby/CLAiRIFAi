import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type VersionEntry = {
	stage: string;
	version: number;
	filename: string;
	createdAt: string;
	questionsResolved?: string[];
};

export type VersionManifest = {
	entries: VersionEntry[];
};

export async function loadVersionManifest(folder: string): Promise<VersionManifest> {
	const manifestPath = path.join(folder, 'versions.json');
	try {
		const raw = await readFile(manifestPath, 'utf8');
		return JSON.parse(raw) as VersionManifest;
	} catch {
		return { entries: [] };
	}
}

export async function saveVersionManifest(folder: string, manifest: VersionManifest): Promise<void> {
	const manifestPath = path.join(folder, 'versions.json');
	await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
}

export function getNextVersion(manifest: VersionManifest, stage: string): number {
	const stageEntries = manifest.entries.filter(e => e.stage === stage);
	if (stageEntries.length === 0) return 1;
	return Math.max(...stageEntries.map(e => e.version)) + 1;
}

export async function recordVersion(
	folder: string,
	stage: string,
	version: number,
	questionsResolved?: string[],
): Promise<string> {
	const manifest = await loadVersionManifest(folder);
	const filename = `stage-${stage}-v${version}.json`;

	manifest.entries.push({
		stage,
		version,
		filename,
		createdAt: new Date().toISOString(),
		questionsResolved,
	});

	await saveVersionManifest(folder, manifest);
	return filename;
}
