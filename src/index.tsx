#!/usr/bin/env node

import React, { useState } from 'react';
import { render, useApp, Text } from 'ink';
import { readFile } from 'node:fs/promises';
import { loadConfig } from './config.js';
import { runPreflightChecks, validateTranscript } from './preflight.js';
import { formatError } from './errors.js';
import { getRunFolder, loadStageOutput } from './state/manager.js';
import type { ClairifaiConfig, RunSummary, ExtractionResult, ClarifyResult } from './types.js';
import { App } from './ui/App.js';
import { Welcome } from './ui/Welcome.js';
import { MainMenu, type MenuChoice } from './ui/MainMenu.js';
import { RunSelector } from './ui/RunSelector.js';
import { RunHistory } from './ui/RunHistory.js';
import { PushOptions } from './ui/PushOptions.js';
import { ContinueFlow } from './ui/ContinueFlow.js';
import { TranscriptInput } from './ui/TranscriptInput.js';
import { HelpScreen } from './ui/HelpScreen.js';

// ─── Interactive App (menu-driven) ───

type Screen =
	| { type: 'menu' }
	| { type: 'transcript-input' }
	| { type: 'processing'; transcriptPath: string; transcriptContent: string }
	| { type: 'run-selector'; mode: 'continue' | 'push' }
	| { type: 'continue-flow'; run: RunSummary }
	| { type: 'push-loading'; run: RunSummary }
	| { type: 'push-options'; run: RunSummary; extracted: ExtractionResult; reviewed: ClarifyResult }
	| { type: 'history' }
	| { type: 'help' };

function InteractiveApp({ config }: { config: ClairifaiConfig }) {
	const { exit } = useApp();
	const [screen, setScreen] = useState<Screen>({ type: 'menu' });
	const [preflightError, setPreflightError] = useState<string | null>(null);

	function handleMenuChoice(choice: MenuChoice) {
		switch (choice) {
			case 'process':
				setScreen({ type: 'transcript-input' });
				break;
			case 'continue':
				setScreen({ type: 'run-selector', mode: 'continue' });
				break;
			case 'push':
				setScreen({ type: 'run-selector', mode: 'push' });
				break;
			case 'history':
				setScreen({ type: 'history' });
				break;
			case 'help':
				setScreen({ type: 'help' });
				break;
			case 'exit':
				exit();
				break;
		}
	}

	async function handleTranscriptSubmit(transcriptPath: string) {
		if (!transcriptPath) {
			setScreen({ type: 'menu' });
			return;
		}

		// Run preflight checks
		const errors = await runPreflightChecks(transcriptPath, config);
		if (errors.length > 0) {
			setPreflightError(errors.map(e => formatError(e)).join('\n'));
			return;
		}

		let content: string;
		try {
			content = await readFile(transcriptPath, 'utf8');
		} catch {
			setPreflightError(`Could not read file: ${transcriptPath}`);
			return;
		}

		const transcriptError = await validateTranscript(content, config);
		if (transcriptError) {
			setPreflightError(formatError(transcriptError));
			return;
		}

		setPreflightError(null);
		setScreen({ type: 'processing', transcriptPath, transcriptContent: content });
	}

	async function handlePushRunSelect(run: RunSummary) {
		setScreen({ type: 'push-loading', run });

		const extracted = await loadStageOutput<ExtractionResult>(run.folder, 'extract');
		const reviewed = await loadStageOutput<ClarifyResult>(run.folder, 'clarify');

		if (!extracted || !reviewed) {
			setPreflightError('Could not load stage outputs for this run.');
			setScreen({ type: 'menu' });
			return;
		}

		setScreen({ type: 'push-options', run, extracted, reviewed });
	}

	switch (screen.type) {
		case 'menu':
			return <MainMenu onSelect={handleMenuChoice} />;

		case 'transcript-input':
			return (
				<>
					{preflightError && (
						<Text color="red">{preflightError}</Text>
					)}
					<TranscriptInput onSubmit={(p) => void handleTranscriptSubmit(p)} />
				</>
			);

		case 'processing':
			return (
				<App
					config={config}
					transcriptPath={screen.transcriptPath}
					transcriptContent={screen.transcriptContent}
				/>
			);

		case 'run-selector':
			if (screen.mode === 'continue') {
				return (
					<RunSelector
						mode="continue"
						onSelect={(run) => setScreen({ type: 'continue-flow', run })}
						onBack={() => setScreen({ type: 'menu' })}
					/>
				);
			}
			return (
				<RunSelector
					mode="push"
					onSelect={(run) => void handlePushRunSelect(run)}
					onBack={() => setScreen({ type: 'menu' })}
				/>
			);

		case 'continue-flow':
			return (
				<ContinueFlow
					run={screen.run}
					config={config}
					onComplete={() => setScreen({ type: 'menu' })}
				/>
			);

		case 'push-loading':
			return <>{`Loading run data for ${screen.run.transcriptName}...`}</>;

		case 'push-options':
			return (
				<PushOptions
					run={screen.run}
					extracted={screen.extracted}
					reviewed={screen.reviewed}
					config={config}
					onComplete={() => setScreen({ type: 'menu' })}
					onBack={() => setScreen({ type: 'menu' })}
				/>
			);

		case 'history':
			return <RunHistory onBack={() => setScreen({ type: 'menu' })} />;

		case 'help':
			return <HelpScreen onBack={() => setScreen({ type: 'menu' })} />;
	}
}

// ─── Welcome wrapper ───

function showWelcome(): Promise<void> {
	return new Promise(resolve => {
		const { unmount } = render(
			<Welcome onContinue={() => {
				unmount();
				resolve();
			}} />,
		);
	});
}

// ─── Entry point ───

async function main() {
	// Preflight: Check Node version
	const nodeVersion = process.versions.node;
	const major = parseInt(nodeVersion.split('.')[0], 10);
	if (major < 22) {
		console.error(formatError({
			code: 'NODE_VERSION_UNSUPPORTED',
			message: 'Node.js 22+ is required',
			recoverable: false,
			suggestion: `Found v${nodeVersion}. Upgrade at https://nodejs.org/`,
		}));
		process.exit(1);
	}

	await showWelcome();

	const config = await loadConfig();

	const [,, command, arg] = process.argv;

	if (command === 'help' || command === '--help' || command === '-h') {
		// clairifai help
		const { waitUntilExit } = render(<HelpScreen onBack={() => process.exit(0)} />);
		await waitUntilExit();
	} else if (command === 'process' && arg) {
		// clairifai process <transcript>
		await runDirectPipeline(arg, config);
	} else if (command === 'continue' && arg) {
		// clairifai continue <run-id>
		await runContinueFlow(arg, config);
	} else if (command === 'push' && arg) {
		// clairifai push <run-id>
		await runPushFlow(arg, config);
	} else if (command && command !== 'process' && command !== 'continue' && command !== 'push' && command !== 'help' && command !== '--help' && command !== '-h') {
		// Legacy: clairifai <transcript> (backward compatible)
		await runDirectPipeline(command, config);
	} else {
		// No args: interactive menu
		const { waitUntilExit } = render(<InteractiveApp config={config} />);
		await waitUntilExit();
	}
}

async function runDirectPipeline(transcriptPath: string, config: ClairifaiConfig) {
	const preflightErrors = await runPreflightChecks(transcriptPath, config);
	if (preflightErrors.length > 0) {
		for (const error of preflightErrors) {
			console.error(formatError(error));
		}
		process.exit(1);
	}

	const transcriptContent = await readFile(transcriptPath, 'utf8');
	const transcriptError = await validateTranscript(transcriptContent, config);
	if (transcriptError) {
		console.error(formatError(transcriptError));
		process.exit(1);
	}

	const { waitUntilExit } = render(
		<App config={config} transcriptPath={transcriptPath} transcriptContent={transcriptContent} />,
	);
	await waitUntilExit();
}

async function runContinueFlow(runId: string, config: ClairifaiConfig) {
	const folder = getRunFolder(runId);
	const run: RunSummary = {
		runId,
		folder,
		transcriptName: runId.replace(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-/, ''),
		status: 'done',
		lastStage: 'clarify',
		updatedAt: '',
		completedStages: ['parse', 'extract', 'clarify'],
		ticketCount: 0,
		questionCount: 0,
		hasReport: false,
	};

	const { waitUntilExit } = render(
		<ContinueFlow run={run} config={config} onComplete={() => process.exit(0)} />,
	);
	await waitUntilExit();
}

async function runPushFlow(runId: string, config: ClairifaiConfig) {
	const folder = getRunFolder(runId);
	const extracted = await loadStageOutput<ExtractionResult>(folder, 'extract');
	const reviewed = await loadStageOutput<ClarifyResult>(folder, 'clarify');

	if (!extracted || !reviewed) {
		console.error('Could not load stage outputs for this run.');
		process.exit(1);
	}

	const run: RunSummary = {
		runId,
		folder,
		transcriptName: runId.replace(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-/, ''),
		status: 'done',
		lastStage: 'generate',
		updatedAt: '',
		completedStages: ['parse', 'extract', 'clarify', 'generate'],
		ticketCount: extracted.tickets.length,
		questionCount: 0,
		hasReport: true,
	};

	const { waitUntilExit } = render(
		<PushOptions
			run={run}
			extracted={extracted}
			reviewed={reviewed}
			config={config}
			onComplete={() => process.exit(0)}
			onBack={() => process.exit(0)}
		/>,
	);
	await waitUntilExit();
}

void main();
