import React from 'react';
import { Box, Text } from 'ink';
import type { StageStatus } from '../types.js';

const STATUS_ICONS: Record<StageStatus, string> = {
	pending: '○',
	running: '◉',
	done: '✓',
	failed: '✗',
	timeout: '⏱',
};

const STATUS_COLORS: Record<StageStatus, string> = {
	pending: 'gray',
	running: 'yellow',
	done: 'green',
	failed: 'red',
	timeout: 'red',
};

type StageRowProps = {
	label: string;
	status: StageStatus;
	elapsedMs: number;
	summary?: string;
};

function formatElapsed(ms: number): string {
	if (ms < 1000) return '';
	const seconds = Math.floor(ms / 1000);
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.floor(seconds / 60);
	const remaining = seconds % 60;
	return `${minutes}m ${remaining}s`;
}

export function StageRow({ label, status, elapsedMs, summary }: StageRowProps) {
	const icon = STATUS_ICONS[status];
	const color = STATUS_COLORS[status];

	return (
		<Box>
			<Text color={color}>{` ${icon} `}</Text>
			<Text bold={status === 'running'}>{label.padEnd(12)}</Text>
			<Text dimColor>{formatElapsed(elapsedMs).padEnd(8)}</Text>
			{summary && <Text dimColor>{summary}</Text>}
			{status === 'running' && <Text color="yellow">{'running...'}</Text>}
		</Box>
	);
}
