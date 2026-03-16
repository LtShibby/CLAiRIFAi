import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { ExtractionResult, ClarifyResult, ClairifaiConfig, RunSummary } from '../types.js';
import { createGitHubIssues } from '../github/issues.js';

type PushPhase = 'select-target' | 'pushing' | 'done';
type PushTarget = 'github' | 'jira';

type PushOptionsProps = {
	run: RunSummary;
	extracted: ExtractionResult;
	reviewed: ClarifyResult;
	config: ClairifaiConfig;
	onComplete: () => void;
	onBack: () => void;
};

export function PushOptions({ run, extracted, reviewed, config, onComplete, onBack }: PushOptionsProps) {
	const [phase, setPhase] = useState<PushPhase>('select-target');
	const [selected, setSelected] = useState(0);
	const [includeIncomplete, setIncludeIncomplete] = useState(false);
	const [result, setResult] = useState<{ created: number; errors: string[] } | null>(null);
	const [pushError, setPushError] = useState<string | null>(null);

	const hasGithub = !!config.repo;
	const hasJira = !!config.jira;

	const targets: { key: PushTarget; label: string; available: boolean }[] = [
		{ key: 'github', label: `GitHub Issues${hasGithub ? ` (${config.repo})` : ''}`, available: hasGithub },
		{ key: 'jira', label: 'Jira (coming soon)', available: false },
	];

	const readyTicketIds = new Set(
		reviewed.reviewed_tickets
			.filter(r => r.status === 'READY')
			.map(r => r.ticket_id)
	);

	const ticketsToShow = includeIncomplete
		? extracted.tickets
		: extracted.tickets.filter(t => readyTicketIds.has(t.id));

	useInput((_input, key) => {
		if (phase === 'done') {
			if (key.return) onComplete();
			return;
		}
		if (phase === 'pushing') return;

		if (key.escape || key.backspace || key.delete) {
			onBack();
			return;
		}

		if (phase === 'select-target') {
			if (key.upArrow) {
				setSelected(prev => Math.max(0, prev - 1));
			} else if (key.downArrow) {
				setSelected(prev => Math.min(targets.length, prev + 1)); // +1 for checkbox
			} else if (_input === ' ' && selected === targets.length) {
				// Toggle include incomplete
				setIncludeIncomplete(prev => !prev);
			} else if (key.return) {
				if (selected < targets.length) {
					const target = targets[selected];
					if (!target.available) return;
					doPush(target.key);
				}
			}
		}
	});

	async function doPush(target: PushTarget) {
		setPhase('pushing');
		try {
			if (target === 'github') {
				const res = await createGitHubIssues(ticketsToShow, reviewed, config);
				setResult(res);
			}
		} catch (err) {
			setPushError(err instanceof Error ? err.message : String(err));
		}
		setPhase('done');
	}

	if (phase === 'pushing') {
		return (
			<Box flexDirection="column" padding={1}>
				<Text bold color="cyan">Pushing tickets...</Text>
				<Text dimColor>{`${ticketsToShow.length} ticket${ticketsToShow.length === 1 ? '' : 's'} being created`}</Text>
			</Box>
		);
	}

	if (phase === 'done') {
		return (
			<Box flexDirection="column" padding={1}>
				{result && (
					<>
						<Text bold color="green">{`Created ${result.created}/${ticketsToShow.length} issues`}</Text>
						{result.errors.length > 0 && (
							<Box flexDirection="column" marginTop={1}>
								<Text color="red">Errors:</Text>
								{result.errors.map((e, i) => (
									<Text key={i} color="red">{`  ${e}`}</Text>
								))}
							</Box>
						)}
					</>
				)}
				{pushError && (
					<Text color="red">{`Error: ${pushError}`}</Text>
				)}
				<Box marginTop={1}>
					<Text dimColor>[Enter] back to menu</Text>
				</Box>
			</Box>
		);
	}

	return (
		<Box flexDirection="column" padding={1}>
			<Text bold color="cyan">{`Push tickets from: ${run.transcriptName}`}</Text>
			<Text dimColor>{`${ticketsToShow.length} ticket${ticketsToShow.length === 1 ? '' : 's'} selected`}</Text>
			<Text> </Text>

			<Text bold>Target:</Text>
			{targets.map((t, i) => (
				<Box key={t.key}>
					<Text color={!t.available ? 'gray' : i === selected ? 'cyan' : undefined} bold={i === selected}>
						{i === selected ? ' > ' : '   '}
						{t.label}
						{!t.available && ' (not configured)'}
					</Text>
				</Box>
			))}

			<Text> </Text>
			<Box>
				<Text color={selected === targets.length ? 'cyan' : undefined} bold={selected === targets.length}>
					{selected === targets.length ? ' > ' : '   '}
					{`[${includeIncomplete ? 'x' : ' '}] Include incomplete tickets (needs-clarification)`}
				</Text>
			</Box>

			<Box marginTop={1}>
				<Text dimColor>[↑/↓] navigate  [Space] toggle  [Enter] push  [Esc] back</Text>
			</Box>
		</Box>
	);
}
