import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { ConsolidatedQuestion } from '../types.js';

type QuestionPromptProps = {
	questions: ConsolidatedQuestion[];
	onComplete: (answers: Record<string, string>) => void;
	onSkip: () => void;
};

const PRIORITY_ICONS: Record<string, string> = {
	BLOCKING: '🔴',
	IMPORTANT: '🟡',
	NICE_TO_HAVE: '🟢',
};

export function QuestionPrompt({ questions, onComplete, onSkip }: QuestionPromptProps) {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [answers, setAnswers] = useState<Record<string, string>>({});
	const [selectedOption, setSelectedOption] = useState(0);
	const [freeformValue, setFreeformValue] = useState('');

	const question = questions[currentIndex];

	useInput((input, key) => {
		if (!question) return;

		// Skip all
		if (input === 's') {
			onSkip();
			return;
		}

		if (question.type === 'MULTIPLE_CHOICE' && question.options) {
			if (key.upArrow) {
				setSelectedOption(prev => Math.max(0, prev - 1));
			} else if (key.downArrow) {
				setSelectedOption(prev => Math.min((question.options?.length ?? 1) - 1, prev + 1));
			} else if (key.return) {
				const option = question.options[selectedOption];
				const newAnswers = { ...answers, [question.id]: option.option };
				advanceQuestion(newAnswers);
			}
		} else if (question.type === 'CONFIRMATION') {
			if (input === 'y' || input === 'Y') {
				const newAnswers = { ...answers, [question.id]: 'yes' };
				advanceQuestion(newAnswers);
			} else if (input === 'n' || input === 'N') {
				const newAnswers = { ...answers, [question.id]: 'no' };
				advanceQuestion(newAnswers);
			}
		} else {
			// FREEFORM
			if (key.return && freeformValue.trim()) {
				const newAnswers = { ...answers, [question.id]: freeformValue.trim() };
				setFreeformValue('');
				advanceQuestion(newAnswers);
			} else if (key.backspace || key.delete) {
				setFreeformValue(prev => prev.slice(0, -1));
			} else if (!key.ctrl && !key.meta && input) {
				setFreeformValue(prev => prev + input);
			}
		}
	});

	function advanceQuestion(newAnswers: Record<string, string>) {
		setAnswers(newAnswers);
		if (currentIndex < questions.length - 1) {
			setCurrentIndex(prev => prev + 1);
			setSelectedOption(0);
			setFreeformValue('');
		} else {
			onComplete(newAnswers);
		}
	}

	if (!question) {
		return <Text>No questions to answer.</Text>;
	}

	const priorityIcon = PRIORITY_ICONS[question.priority] ?? '';

	return (
		<Box flexDirection="column" padding={1}>
			<Text bold color="cyan">
				{`CLAIRIFAI  ${questions.length} question${questions.length === 1 ? '' : 's'} need answers`}
			</Text>
			<Text> </Text>
			<Text bold>
				{`❓ Q${currentIndex + 1}: ${question.question}`}
			</Text>
			<Text>
				{`Priority: ${priorityIcon} ${question.priority}`}
			</Text>
			<Text dimColor>
				{`Context: ${question.context}`}
			</Text>
			<Text> </Text>

			{question.type === 'MULTIPLE_CHOICE' && question.options && (
				<Box flexDirection="column">
					<Text>Options:</Text>
					{question.options.map((opt, i) => (
						<Box key={opt.option}>
							<Text color={i === selectedOption ? 'cyan' : undefined}>
								{i === selectedOption ? '> ' : '  '}
								{`${opt.option}) ${opt.text}`}
							</Text>
							<Text dimColor>{` — ${opt.implication}`}</Text>
						</Box>
					))}
				</Box>
			)}

			{question.type === 'CONFIRMATION' && (
				<Text>Press [y]es or [n]o</Text>
			)}

			{question.type === 'FREEFORM' && (
				<Box>
					<Text color="cyan">{`> `}</Text>
					<Text>{freeformValue}</Text>
					<Text color="gray">{'█'}</Text>
				</Box>
			)}

			{question.agent_lean && (
				<Box marginTop={1}>
					<Text dimColor italic>{`Agent's lean: ${question.agent_lean}`}</Text>
				</Box>
			)}

			<Box marginTop={1}>
				<Text dimColor>
					{`[Enter] confirm  |  [↑/↓] navigate  |  [s] skip all  |  ${currentIndex + 1}/${questions.length}`}
				</Text>
			</Box>
		</Box>
	);
}
