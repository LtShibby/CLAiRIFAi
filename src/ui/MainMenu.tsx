import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

export type MenuChoice = 'process' | 'continue' | 'push' | 'history' | 'help' | 'exit';

type MainMenuProps = {
	onSelect: (choice: MenuChoice) => void;
};

const MENU_ITEMS: { key: MenuChoice; label: string; description: string }[] = [
	{ key: 'process', label: 'Process a new transcript', description: 'Run the full 4-stage pipeline on a transcript file' },
	{ key: 'continue', label: 'Continue a previous run', description: 'Answer open questions and re-generate tickets' },
	{ key: 'push', label: 'Push tickets to GitHub/Jira', description: 'Create issues from a completed run' },
	{ key: 'history', label: 'View run history', description: 'Browse all past pipeline runs' },
	{ key: 'help', label: 'Help', description: 'Learn how CLAiRiFAi works' },
	{ key: 'exit', label: 'Exit', description: '' },
];

export function MainMenu({ onSelect }: MainMenuProps) {
	const [selected, setSelected] = useState(0);

	useInput((_input, key) => {
		if (key.upArrow) {
			setSelected(prev => Math.max(0, prev - 1));
		} else if (key.downArrow) {
			setSelected(prev => Math.min(MENU_ITEMS.length - 1, prev + 1));
		} else if (key.return) {
			onSelect(MENU_ITEMS[selected].key);
		}
	});

	return (
		<Box flexDirection="column" padding={1}>
			<Text bold color="cyan">What would you like to do?</Text>
			<Text> </Text>

			{MENU_ITEMS.map((item, i) => (
				<Box key={item.key}>
					<Text color={i === selected ? 'cyan' : undefined} bold={i === selected}>
						{i === selected ? ' > ' : '   '}
						{item.label}
					</Text>
					{i === selected && item.description && (
						<Text dimColor>{`  — ${item.description}`}</Text>
					)}
				</Box>
			))}

			<Box marginTop={1}>
				<Text dimColor>[↑/↓] navigate  [Enter] select</Text>
			</Box>
		</Box>
	);
}
