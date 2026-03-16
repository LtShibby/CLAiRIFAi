import React, { useEffect } from 'react';
import { Box, Text, useInput } from 'ink';

type WelcomeProps = {
	onContinue: () => void;
};

export function Welcome({ onContinue }: WelcomeProps) {
	useInput((_input, key) => {
		if (key.return || _input === ' ') {
			onContinue();
		}
	});

	// Auto-continue after a short delay
	useEffect(() => {
		const timer = setTimeout(onContinue, 2000);
		return () => clearTimeout(timer);
	}, [onContinue]);

	return (
		<Box flexDirection="column" padding={1}>
			<Text bold color="cyan">
				{'  CLAIRIFAI'}
			</Text>
			<Text dimColor>
				{'  Meeting transcripts → Engineer-ready tickets'}
			</Text>
			<Text> </Text>
			<Text dimColor>Press any key to continue...</Text>
		</Box>
	);
}
