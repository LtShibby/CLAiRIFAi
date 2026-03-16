import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text, useApp } from 'ink';
import type { ClairifaiConfig, PipelineStage, StageStatus, ExtractionResult, ClarifyResult } from '../types.js';
import { processTranscript, type PipelineResult } from '../agent/runner.js';
import type { StageCallbacks } from '../agent/stage-runner.js';
import { StageRow } from './StageRow.js';
import { LiveLog } from './LiveLog.js';
import { TicketPreview } from './TicketPreview.js';
import path from 'node:path';

type AppProps = {
	config: ClairifaiConfig;
	transcriptPath: string;
	transcriptContent: string;
};

type StageInfo = {
	status: StageStatus;
	elapsedMs: number;
	summary?: string;
	startTime?: number;
};

const STAGE_LABELS: Record<PipelineStage, string> = {
	parse: 'Parse',
	extract: 'Extract',
	clarify: 'Clarify',
	generate: 'Generate',
};

const STAGES: PipelineStage[] = ['parse', 'extract', 'clarify', 'generate'];

export function App({ config, transcriptPath, transcriptContent }: AppProps) {
	const { exit } = useApp();
	const [stages, setStages] = useState<Record<PipelineStage, StageInfo>>({
		parse: { status: 'pending', elapsedMs: 0 },
		extract: { status: 'pending', elapsedMs: 0 },
		clarify: { status: 'pending', elapsedMs: 0 },
		generate: { status: 'pending', elapsedMs: 0 },
	});
	const [logLines, setLogLines] = useState<string[]>([]);
	const [result, setResult] = useState<PipelineResult | null>(null);
	const [error, setError] = useState<string | null>(null);
	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const [currentStage, setCurrentStage] = useState<PipelineStage | null>(null);

	// Update elapsed time for running stage
	useEffect(() => {
		timerRef.current = setInterval(() => {
			setStages(prev => {
				const updated = { ...prev };
				for (const stage of STAGES) {
					if (updated[stage].status === 'running' && updated[stage].startTime) {
						updated[stage] = {
							...updated[stage],
							elapsedMs: Date.now() - updated[stage].startTime!,
						};
					}
				}
				return updated;
			});
		}, 500);

		return () => {
			if (timerRef.current) clearInterval(timerRef.current);
		};
	}, []);

	const callbacks: StageCallbacks = {
		onLogLine: (_stage: PipelineStage, line: string) => {
			setLogLines(prev => [...prev.slice(-49), line]);
		},
		onStageStart: (stage: PipelineStage) => {
			setCurrentStage(stage);
			setStages(prev => ({
				...prev,
				[stage]: { status: 'running' as StageStatus, elapsedMs: 0, startTime: Date.now() },
			}));
		},
		onStageComplete: (stage: PipelineStage, _output: string) => {
			setStages(prev => ({
				...prev,
				[stage]: {
					...prev[stage],
					status: 'done' as StageStatus,
					elapsedMs: prev[stage].startTime ? Date.now() - prev[stage].startTime! : 0,
				},
			}));
		},
		onStageFail: (stage: PipelineStage, errorMsg: string) => {
			setStages(prev => ({
				...prev,
				[stage]: { ...prev[stage], status: 'failed' as StageStatus, summary: errorMsg },
			}));
		},
		onStageTimeout: (stage: PipelineStage) => {
			setStages(prev => ({
				...prev,
				[stage]: { ...prev[stage], status: 'timeout' as StageStatus },
			}));
		},
	};

	useEffect(() => {
		processTranscript(transcriptPath, transcriptContent, config, callbacks)
			.then((res) => {
				setResult(res);
			})
			.catch((err) => {
				setError(err?.message ?? String(err));
			});
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	if (result) {
		return (
			<TicketPreview
				extracted={result.extracted}
				reviewed={result.reviewed}
				reportPath={path.join(result.folder, 'report.md')}
				onConfirm={() => exit()}
			/>
		);
	}

	const filename = path.basename(transcriptPath);

	return (
		<Box flexDirection="column" padding={1}>
			<Text bold color="cyan">
				{`CLAIRIFAI  ${filename}`}
			</Text>
			<Text> </Text>

			{STAGES.map((stage) => (
				<StageRow
					key={stage}
					label={STAGE_LABELS[stage]}
					status={stages[stage].status}
					elapsedMs={stages[stage].elapsedMs}
					summary={stages[stage].summary}
				/>
			))}

			<LiveLog lines={logLines} />

			{error && (
				<Box marginTop={1}>
					<Text color="red">{`Error: ${error}`}</Text>
				</Box>
			)}

			<Box marginTop={1}>
				<Text dimColor>
					{`Stage: ${currentStage ?? 'initializing'}`}
				</Text>
			</Box>
		</Box>
	);
}
