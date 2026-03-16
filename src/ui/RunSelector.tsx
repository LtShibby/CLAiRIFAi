import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import type { RunSummary } from '../types.js';
import { listRuns } from '../state/manager.js';

type RunSelectorProps = {
	mode: 'continue' | 'push';
	onSelect: (run: RunSummary) => void;
	onBack: () => void;
};

const STATUS_ICONS: Record<string, string> = {
	done: '✓',
	running: '◉',
	failed: '✗',
	interrupted: '⏱',
	unknown: '?',
};

function formatDate(runId: string): string {
	// Extract date from folder name like "2026-03-16T10-22-00-name"
	const match = runId.match(/^(\d{4}-\d{2}-\d{2})/);
	return match ? match[1] : runId.slice(0, 10);
}

export function RunSelector({ mode, onSelect, onBack }: RunSelectorProps) {
	const [runs, setRuns] = useState<RunSummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [selected, setSelected] = useState(0);

	useEffect(() => {
		listRuns().then((allRuns) => {
			let filtered: RunSummary[];
			if (mode === 'continue') {
				// Show runs that have open questions or weren't fully completed
				filtered = allRuns.filter(r =>
					r.questionCount > 0 || r.lastStage !== 'generate' || r.status !== 'done'
				);
			} else {
				// Push mode: show runs that have extracted tickets
				filtered = allRuns.filter(r => r.ticketCount > 0);
			}
			setRuns(filtered);
			setLoading(false);
		});
	}, [mode]);

	useInput((_input, key) => {
		if (key.escape || key.backspace || key.delete) {
			onBack();
		} else if (key.upArrow) {
			setSelected(prev => Math.max(0, prev - 1));
		} else if (key.downArrow) {
			setSelected(prev => Math.min(runs.length - 1, prev + 1));
		} else if (key.return && runs.length > 0) {
			onSelect(runs[selected]);
		}
	});

	const title = mode === 'continue'
		? 'Select a run to continue'
		: 'Select a run to push tickets from';

	if (loading) {
		return (
			<Box padding={1}>
				<Text dimColor>Loading runs...</Text>
			</Box>
		);
	}

	if (runs.length === 0) {
		return (
			<Box flexDirection="column" padding={1}>
				<Text bold color="cyan">{title}</Text>
				<Text> </Text>
				<Text dimColor>
					{mode === 'continue'
						? 'No runs with open questions found.'
						: 'No runs with extracted tickets found.'}
				</Text>
				<Box marginTop={1}>
					<Text dimColor>[Esc] back to menu</Text>
				</Box>
			</Box>
		);
	}

	return (
		<Box flexDirection="column" padding={1}>
			<Text bold color="cyan">{title}</Text>
			<Text> </Text>

			{runs.map((run, i) => {
				const icon = STATUS_ICONS[run.status] ?? '?';
				const date = formatDate(run.runId);
				const isSelected = i === selected;

				return (
					<Box key={run.runId}>
						<Text color={isSelected ? 'cyan' : undefined} bold={isSelected}>
							{isSelected ? ' > ' : '   '}
							{`${icon} ${date}  ${run.transcriptName.padEnd(28)}`}
						</Text>
						<Text dimColor>
							{`${run.ticketCount} tickets`}
							{run.questionCount > 0 ? `, ${run.questionCount} questions` : ''}
							{run.hasReport ? '  [report]' : ''}
						</Text>
					</Box>
				);
			})}

			<Box marginTop={1}>
				<Text dimColor>[↑/↓] navigate  [Enter] select  [Esc] back</Text>
			</Box>
		</Box>
	);
}
