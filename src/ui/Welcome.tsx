import React from 'react';
import { Box, Text, useInput } from 'ink';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json') as { version: string };

type WelcomeProps = {
	onContinue: () => void;
};

export function Welcome({ onContinue }: WelcomeProps) {
	useInput(() => {
		onContinue();
	});

	return (
		<Box flexDirection="column" padding={1}>
			<Box flexDirection="column">
				<Text color="cyan">{` ██████╗██╗      █████╗ ██╗██████╗ ██╗███████╗ █████╗ ██╗`}</Text>
				<Text color="cyan">{`██╔════╝██║     ██╔══██╗██║██╔══██╗██║██╔════╝██╔══██╗██║`}</Text>
				<Text color="cyan">{`██║     ██║     ███████║██║██████╔╝██║█████╗  ███████║██║`}</Text>
				<Text color="cyan">{`██║     ██║     ██╔══██║██║██╔══██╗██║██╔══╝  ██╔══██║██║`}</Text>
				<Text color="cyan">{`╚██████╗███████╗██║  ██║██║██║  ██║██║██║     ██║  ██║██║`}</Text>
				<Text color="cyan">{` ╚═════╝╚══════╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚═╝╚═╝     ╚═╝  ╚═╝╚═╝`}</Text>
			</Box>

			<Box flexDirection="column" marginTop={1}>
				<Text>CLAiRiFAi <Text color="#1a3a6b">v{pkg.version}</Text> — Transcripts → Engineer-ready tickets</Text>
				<Text dimColor>Claude Code pipeline • Confidence scoring • Open questions</Text>
				<Text color="#ff8c00">Created by <Text bold color="#ff8c00">Matt Wozniak</Text></Text>
			</Box>

			<Box marginTop={1}>
				<Text dimColor>Press any key to continue</Text>
			</Box>
		</Box>
	);
}
