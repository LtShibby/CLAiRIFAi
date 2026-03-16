import { readFile, appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const clairifaiDir = (cwd: string) => path.join(cwd, '.clairifai');
const progressPath = (cwd: string) => path.join(clairifaiDir(cwd), 'progress.jsonl');

export type ProgressEntry = {
	timestamp: string;
	transcriptPath: string;
	runFolder: string;
	ticketsGenerated: number;
	questionsRemaining: number;
	status: 'completed' | 'failed' | 'interrupted';
};

export async function readProgress(cwd: string): Promise<ProgressEntry[]> {
	try {
		const content = await readFile(progressPath(cwd), 'utf8');
		return content
			.trim()
			.split('\n')
			.filter(line => line.length > 0)
			.map(line => JSON.parse(line) as ProgressEntry);
	} catch {
		return [];
	}
}

export async function appendProgress(cwd: string, entry: ProgressEntry): Promise<void> {
	await mkdir(clairifaiDir(cwd), { recursive: true });
	await appendFile(progressPath(cwd), JSON.stringify(entry) + '\n');
}
