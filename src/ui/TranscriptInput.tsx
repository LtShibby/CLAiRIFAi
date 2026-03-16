import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

type TranscriptInputProps = {
	onSubmit: (path: string) => void;
};

export function TranscriptInput({ onSubmit }: TranscriptInputProps) {
	const [value, setValue] = useState('');

	useInput((input, key) => {
		if (key.return) {
			onSubmit(value.trim());
		} else if (key.backspace || key.delete) {
			setValue(prev => prev.slice(0, -1));
		} else if (!key.ctrl && !key.meta && input) {
			setValue(prev => prev + input);
		}
	});

	return (
		<Box flexDirection="column" padding={1}>
			<Text bold>Enter transcript file path:</Text>
			<Box>
				<Text color="cyan">{`> `}</Text>
				<Text>{value}</Text>
				<Text color="gray">{'█'}</Text>
			</Box>
		</Box>
	);
}
