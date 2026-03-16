#!/usr/bin/env node

import React from 'react';
import { render } from 'ink';
import { readFile } from 'node:fs/promises';
import { loadConfig } from './config.js';
import { runPreflightChecks, validateTranscript } from './preflight.js';
import { formatError } from './errors.js';
import { App } from './ui/App.js';
import { Welcome } from './ui/Welcome.js';

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

	// Get transcript path from CLI args
	const transcriptPath = process.argv[2];
	if (!transcriptPath) {
		console.error('Usage: clairifai <transcript-file>');
		process.exit(1);
	}

	// Run remaining preflight checks
	const preflightErrors = await runPreflightChecks(transcriptPath, config);
	if (preflightErrors.length > 0) {
		for (const error of preflightErrors) {
			console.error(formatError(error));
		}
		process.exit(1);
	}

	// Load and validate transcript
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

void main();
