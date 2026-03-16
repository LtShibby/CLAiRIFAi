import React from 'react';
import { Box, Text, useInput } from 'ink';

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
				<Text>CLAiRiFAi — Transcripts → Engineer-ready tickets</Text>
				<Text dimColor>Claude Code pipeline • Confidence scoring • Open questions</Text>
			</Box>

			<Box marginTop={1}>
				<Text dimColor>Press any key to continue</Text>
			</Box>
		</Box>
	);
}
