import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { PipelineStage } from '../types.js';

type RetryAction = 'retry' | 'skip' | 'abort';

type RetryPromptProps = {
	stage: PipelineStage;
	reason: 'timeout' | 'failed';
	timeoutSeconds?: number;
	onAction: (action: RetryAction) => void;
};

const STAGE_LABELS: Record<PipelineStage, string> = {
	parse: 'Parse',
	extract: 'Extract',
	clarify: 'Clarify',
	generate: 'Generate',
};

export function RetryPrompt({ stage, reason, timeoutSeconds, onAction }: RetryPromptProps) {
	const [selected, setSelected] = useState(0);
	const options: { key: string; label: string; action: RetryAction }[] = [
		{ key: 'R', label: `Retry${timeoutSeconds ? ` with extended timeout (${Math.round(timeoutSeconds * 1.5)}s)` : ''}`, action: 'retry' },
		{ key: 'S', label: 'Skip to next stage (may have incomplete data)', action: 'skip' },
		{ key: 'A', label: 'Abort pipeline', action: 'abort' },
	];

	useInput((input, key) => {
		if (key.upArrow) {
			setSelected(prev => Math.max(0, prev - 1));
		} else if (key.downArrow) {
			setSelected(prev => Math.min(options.length - 1, prev + 1));
		} else if (key.return) {
			onAction(options[selected].action);
		} else {
			const upper = input.toUpperCase();
			const match = options.find(o => o.key === upper);
			if (match) {
				onAction(match.action);
			}
		}
	});

	const reasonText = reason === 'timeout'
		? `timed out after ${timeoutSeconds}s`
		: 'failed';

	return (
		<Box flexDirection="column" padding={1}>
			<Text bold color="red">
				{`CLAIRIFAI  Stage ${STAGE_LABELS[stage]} ${reasonText}`}
			</Text>
			<Text> </Text>
			<Text>Options:</Text>
			{options.map((opt, i) => (
				<Box key={opt.key}>
					<Text color={i === selected ? 'cyan' : undefined}>
						{i === selected ? '> ' : '  '}
						{`[${opt.key}] ${opt.label}`}
					</Text>
				</Box>
			))}
			{reason === 'timeout' && (
				<Box marginTop={1}>
					<Text dimColor italic>
						The transcript may be too long. Consider splitting it into smaller sections.
					</Text>
				</Box>
			)}
		</Box>
	);
}
