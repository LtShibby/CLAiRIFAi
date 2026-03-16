import { spawn, type ChildProcess } from 'node:child_process';
import type { PipelineStage, ClairifaiConfig, TimeoutConfig } from '../types.js';
import { createError } from '../errors.js';
import { OutputWatcher } from './watcher.js';

export type StageCallbacks = {
	onLogLine: (stage: PipelineStage, line: string) => void;
	onStageStart: (stage: PipelineStage) => void;
	onStageComplete: (stage: PipelineStage, output: string) => void;
	onStageFail: (stage: PipelineStage, error: string) => void;
	onStageTimeout: (stage: PipelineStage) => void;
};

let activeProcess: ChildProcess | null = null;

export function killActiveProcess(): void {
	if (activeProcess) {
		activeProcess.kill('SIGTERM');
		activeProcess = null;
	}
}

function getStageTimeout(stage: PipelineStage, timeouts: TimeoutConfig): number {
	return timeouts[stage];
}

export async function runStage(
	stage: PipelineStage,
	prompt: string,
	config: ClairifaiConfig,
	callbacks: StageCallbacks,
): Promise<string> {
	callbacks.onStageStart(stage);

	const timeout = getStageTimeout(stage, config.timeouts);

	return new Promise<string>((resolve, reject) => {
		const proc = spawn('claude', [...config.claudeFlags], {
			stdio: ['pipe', 'pipe', 'pipe'],
		});

		activeProcess = proc;

		const watcher = new OutputWatcher(proc.stdout!);

		watcher.on('line', (line: string) => {
			callbacks.onLogLine(stage, line);
		});

		// Capture stderr for error reporting
		let stderrOutput = '';
		proc.stderr!.on('data', (chunk: Buffer) => {
			stderrOutput += chunk.toString();
		});

		let timedOut = false;
		const timeoutId = setTimeout(() => {
			timedOut = true;
			proc.kill('SIGTERM');
			callbacks.onStageTimeout(stage);
		}, timeout * 1000);

		proc.on('exit', (code) => {
			clearTimeout(timeoutId);
			activeProcess = null;

			if (timedOut) {
				reject(createError('STAGE_TIMEOUT', `Stage "${stage}" exceeded ${timeout}s timeout`));
				return;
			}

			if (code === 0) {
				const output = watcher.collectedOutput;
				callbacks.onStageComplete(stage, output);
				resolve(output);
			} else {
				const error = createError(
					'STAGE_FAILED',
					`Stage "${stage}" exited with code ${code}${stderrOutput ? ': ' + stderrOutput.trim() : ''}`,
				);
				callbacks.onStageFail(stage, error.message);
				reject(error);
			}
		});

		proc.stdin!.write(prompt);
		proc.stdin!.end();
	});
}
