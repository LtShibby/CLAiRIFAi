import { mkdir, writeFile, appendFile, copyFile } from 'node:fs/promises';
import path from 'node:path';

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
