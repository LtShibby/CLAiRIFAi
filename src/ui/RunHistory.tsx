import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import type { RunSummary } from '../types.js';
import { listRuns } from '../state/manager.js';

type RunHistoryProps = {
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
	const match = runId.match(/^(\d{4}-\d{2}-\d{2})/);
	return match ? match[1] : runId.slice(0, 10);
}

function formatTime(runId: string): string {
	const match = runId.match(/T(\d{2})-(\d{2})-(\d{2})/);
	return match ? `${match[1]}:${match[2]}` : '';
}

export function RunHistory({ onBack }: RunHistoryProps) {
	const [runs, setRuns] = useState<RunSummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [scrollOffset, setScrollOffset] = useState(0);

	const VISIBLE_ROWS = 15;

	useEffect(() => {
		listRuns().then((allRuns) => {
			setRuns(allRuns);
			setLoading(false);
		});
	}, []);

	useInput((_input, key) => {
		if (key.escape || key.backspace || key.delete) {
			onBack();
		} else if (key.upArrow) {
			setScrollOffset(prev => Math.max(0, prev - 1));
		} else if (key.downArrow) {
			setScrollOffset(prev => Math.min(Math.max(0, runs.length - VISIBLE_ROWS), prev + 1));
		}
	});

	if (loading) {
		return (
			<Box padding={1}>
				<Text dimColor>Loading run history...</Text>
			</Box>
		);
	}

	if (runs.length === 0) {
		return (
			<Box flexDirection="column" padding={1}>
				<Text bold color="cyan">Run History</Text>
				<Text> </Text>
				<Text dimColor>No runs found. Process a transcript to get started.</Text>
				<Box marginTop={1}>
					<Text dimColor>[Esc] back to menu</Text>
				</Box>
			</Box>
		);
	}

	const visible = runs.slice(scrollOffset, scrollOffset + VISIBLE_ROWS);

	return (
		<Box flexDirection="column" padding={1}>
			<Text bold color="cyan">Run History</Text>
			<Text dimColor>{`${runs.length} run${runs.length === 1 ? '' : 's'} total`}</Text>
			<Text> </Text>

			{/* Header */}
			<Box>
				<Text bold dimColor>{'   Date        Time   Transcript                   Tickets  Questions  Status'}</Text>
			</Box>

			{visible.map((run) => {
				const icon = STATUS_ICONS[run.status] ?? '?';
				const date = formatDate(run.runId);
				const time = formatTime(run.runId);

				return (
					<Box key={run.runId}>
						<Text>
							{`   ${date}  ${time.padEnd(7)}`}
							{`${run.transcriptName.padEnd(29)}`}
						</Text>
						<Text>{`${String(run.ticketCount).padStart(4)}     `}</Text>
						<Text color={run.questionCount > 0 ? 'yellow' : undefined}>
							{`${String(run.questionCount).padStart(4)}       `}
						</Text>
						<Text color={run.status === 'done' ? 'green' : run.status === 'failed' ? 'red' : undefined}>
							{`${icon} ${run.status}`}
						</Text>
					</Box>
				);
			})}

			{runs.length > VISIBLE_ROWS && (
				<Box marginTop={1}>
					<Text dimColor>
						{`Showing ${scrollOffset + 1}-${Math.min(scrollOffset + VISIBLE_ROWS, runs.length)} of ${runs.length}`}
					</Text>
				</Box>
			)}

			<Box marginTop={1}>
				<Text dimColor>[↑/↓] scroll  [Esc] back to menu</Text>
			</Box>
		</Box>
	);
}
