import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useApp } from 'ink';
import type { ClairifaiConfig, PipelineStage, StageStatus, ExtractionResult, ClarifyResult, RunSummary } from '../types.js';
import { loadStageOutput } from '../state/manager.js';
import { continueFromClarify, type PipelineResult, type PipelineCallbacks, type RetryRequest, type RetryAction } from '../agent/runner.js';
import { StageRow } from './StageRow.js';
import { LiveLog } from './LiveLog.js';
import { QuestionPrompt } from './QuestionPrompt.js';
import { TicketPreview } from './TicketPreview.js';
import { RetryPrompt } from './RetryPrompt.js';
import path from 'node:path';

type ContinueFlowProps = {
	run: RunSummary;
	config: ClairifaiConfig;
	onComplete: () => void;
};

type Phase = 'loading' | 'questions' | 'running' | 'retry' | 'done' | 'error';

type StageInfo = {
	status: StageStatus;
	elapsedMs: number;
	startTime?: number;
};

type RetryState = {
	stage: PipelineStage;
	reason: 'timeout' | 'failed';
	timeoutSeconds: number;
	resolve: (action: RetryAction) => void;
};

const STAGES: PipelineStage[] = ['parse', 'extract', 'clarify', 'generate'];

export function ContinueFlow({ run, config, onComplete }: ContinueFlowProps) {
	const { exit } = useApp();
	const [phase, setPhase] = useState<Phase>('loading');
	const [extracted, setExtracted] = useState<ExtractionResult | null>(null);
	const [reviewed, setReviewed] = useState<ClarifyResult | null>(null);
	const [result, setResult] = useState<PipelineResult | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [logLines, setLogLines] = useState<string[]>([]);
	const [retryState, setRetryState] = useState<RetryState | null>(null);
	const [stages, setStages] = useState<Record<PipelineStage, StageInfo>>({
		parse: { status: 'done', elapsedMs: 0 },
		extract: { status: 'done', elapsedMs: 0 },
		clarify: { status: 'pending', elapsedMs: 0 },
		generate: { status: 'pending', elapsedMs: 0 },
	});
	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// Elapsed time ticker
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
		return () => { if (timerRef.current) clearInterval(timerRef.current); };
	}, []);

	// Load existing stage outputs
	useEffect(() => {
		async function load() {
			const ext = await loadStageOutput<ExtractionResult>(run.folder, 'extract');
			const rev = await loadStageOutput<ClarifyResult>(run.folder, 'clarify');

			if (!ext || !rev) {
				setError('Could not load previous stage outputs from this run.');
				setPhase('error');
				return;
			}

			setExtracted(ext);
			setReviewed(rev);

			const questions = rev.consolidated_questions.filter(
				q => q.priority === 'BLOCKING' || q.priority === 'IMPORTANT'
			);

			if (questions.length > 0) {
				setPhase('questions');
			} else {
				setError('No open questions found in this run.');
				setPhase('error');
			}
		}
		load();
	}, [run.folder]);

	function handleAnswers(answers: Record<string, string>) {
		if (!extracted || !reviewed) return;

		setPhase('running');

		const callbacks: PipelineCallbacks = {
			onLogLine: (_stage, line) => setLogLines(prev => [...prev.slice(-49), line]),
			onStageStart: (stage) => {
				setStages(prev => ({
					...prev,
					[stage]: { status: 'running' as StageStatus, elapsedMs: 0, startTime: Date.now() },
				}));
			},
			onStageComplete: (stage) => {
				setStages(prev => ({
					...prev,
					[stage]: { ...prev[stage], status: 'done' as StageStatus, elapsedMs: prev[stage].startTime ? Date.now() - prev[stage].startTime! : 0 },
				}));
			},
			onStageFail: (stage, err) => {
				setStages(prev => ({ ...prev, [stage]: { ...prev[stage], status: 'failed' as StageStatus } }));
			},
			onStageTimeout: (stage) => {
				setStages(prev => ({ ...prev, [stage]: { ...prev[stage], status: 'timeout' as StageStatus } }));
			},
			onRetryNeeded: (request: RetryRequest): Promise<RetryAction> => {
				return new Promise<RetryAction>((resolve) => {
					setRetryState({
						stage: request.stage,
						reason: request.reason,
						timeoutSeconds: request.timeoutSeconds,
						resolve,
					});
					setPhase('retry');
				});
			},
		};

		continueFromClarify(run.folder, extracted, reviewed, answers, config, callbacks)
			.then((res) => { setResult(res); setPhase('done'); })
			.catch((err) => { setError(err?.message ?? String(err)); setPhase('error'); });
	}

	function handleSkipQuestions() {
		// Skip with empty answers — re-run with no changes
		handleAnswers({});
	}

	if (phase === 'loading') {
		return (
			<Box padding={1}>
				<Text dimColor>Loading run data...</Text>
			</Box>
		);
	}

	if (phase === 'error') {
		return (
			<Box flexDirection="column" padding={1}>
				<Text color="red">{`Error: ${error}`}</Text>
				<Box marginTop={1}>
					<Text dimColor>Press any key to return to menu</Text>
				</Box>
			</Box>
		);
	}

	if (phase === 'questions' && reviewed) {
		const questions = reviewed.consolidated_questions.filter(
			q => q.priority === 'BLOCKING' || q.priority === 'IMPORTANT'
		);

		return (
			<QuestionPrompt
				questions={questions}
				onComplete={handleAnswers}
				onSkip={handleSkipQuestions}
			/>
		);
	}

	if (phase === 'retry' && retryState) {
		return (
			<Box flexDirection="column" padding={1}>
				<Text bold color="cyan">{`Continuing: ${run.transcriptName}`}</Text>
				<Text> </Text>
				{STAGES.map((stage) => (
					<StageRow key={stage} label={stage.charAt(0).toUpperCase() + stage.slice(1)} status={stages[stage].status} elapsedMs={stages[stage].elapsedMs} />
				))}
				<Box marginTop={1}>
					<RetryPrompt
						stage={retryState.stage}
						reason={retryState.reason}
						timeoutSeconds={retryState.timeoutSeconds}
						onAction={(action) => {
							const { resolve } = retryState;
							setRetryState(null);
							if (action === 'retry') {
								setStages(prev => ({ ...prev, [retryState.stage]: { status: 'pending' as StageStatus, elapsedMs: 0 } }));
							}
							setPhase('running');
							resolve(action);
						}}
					/>
				</Box>
			</Box>
		);
	}

	if (phase === 'done' && result) {
		return (
			<TicketPreview
				extracted={result.extracted}
				reviewed={result.reviewed}
				reportPath={path.join(result.folder, 'report.md')}
				onConfirm={onComplete}
			/>
		);
	}

	// Running phase
	return (
		<Box flexDirection="column" padding={1}>
			<Text bold color="cyan">{`Continuing: ${run.transcriptName}`}</Text>
			<Text> </Text>

			{STAGES.map((stage) => (
				<StageRow
					key={stage}
					label={stage.charAt(0).toUpperCase() + stage.slice(1)}
					status={stages[stage].status}
					elapsedMs={stages[stage].elapsedMs}
				/>
			))}

			<LiveLog lines={logLines} />
		</Box>
	);
}
