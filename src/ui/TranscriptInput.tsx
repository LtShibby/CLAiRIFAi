import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { openFilePicker } from './file-picker.js';

type TranscriptInputProps = {
	onSubmit: (path: string) => void;
};

type Mode = 'choose' | 'typing' | 'browsing';

export function TranscriptInput({ onSubmit }: TranscriptInputProps) {
	const [mode, setMode] = useState<Mode>('choose');
	const [value, setValue] = useState('');
	const [browseError, setBrowseError] = useState<string | null>(null);

	useInput((input, key) => {
		if (mode === 'choose') {
			if (input === 'b' || input === 'B') {
				setMode('browsing');
				setBrowseError(null);
				void openFilePicker().then((filePath) => {
					if (filePath) {
						onSubmit(filePath);
					} else {
						setBrowseError('No file selected. Try again or type a path.');
						setMode('choose');
					}
				});
			} else if (input === 't' || input === 'T') {
				setMode('typing');
			} else if (key.escape) {
				onSubmit('');
			}
		} else if (mode === 'typing') {
			if (key.return) {
				onSubmit(value.trim());
			} else if (key.escape) {
				setValue('');
				setMode('choose');
			} else if (key.backspace || key.delete) {
				setValue(prev => prev.slice(0, -1));
			} else if (!key.ctrl && !key.meta && input) {
				setValue(prev => prev + input);
			}
		}
	});

	if (mode === 'browsing') {
		return (
			<Box flexDirection="column" padding={1}>
				<Text color="yellow">Opening file browser...</Text>
			</Box>
		);
	}

	if (mode === 'typing') {
		return (
			<Box flexDirection="column" padding={1}>
				<Text bold>Enter transcript file path:</Text>
				<Box>
					<Text color="cyan">{`> `}</Text>
					<Text>{value}</Text>
					<Text color="gray">{'█'}</Text>
				</Box>
				<Box marginTop={1}>
					<Text dimColor>[Enter] submit  [Esc] back</Text>
				</Box>
			</Box>
		);
	}

	// mode === 'choose'
	return (
		<Box flexDirection="column" padding={1}>
			<Text bold>How would you like to select a transcript?</Text>
			<Text> </Text>
			{browseError && (
				<>
					<Text color="yellow">{browseError}</Text>
					<Text> </Text>
				</>
			)}
			<Text>  <Text bold color="cyan">[B]</Text> Browse for file  <Text dimColor>— open file picker</Text></Text>
			<Text>  <Text bold color="cyan">[T]</Text> Type a path     <Text dimColor>— paste or type the file path</Text></Text>
			<Text> </Text>
			<Text dimColor>[Esc] back to menu</Text>
		</Box>
	);
}
