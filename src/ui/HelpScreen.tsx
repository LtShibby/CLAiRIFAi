import React from 'react';
import { Box, Text, useInput } from 'ink';

type HelpScreenProps = {
	onBack: () => void;
};

export function HelpScreen({ onBack }: HelpScreenProps) {
	useInput((_input, key) => {
		if (key.escape || key.return || _input === 'q') {
			onBack();
		}
	});

	return (
		<Box flexDirection="column" padding={1}>
			<Text bold color="cyan">CLAiRiFAi — Meeting Transcript to Tickets Pipeline</Text>
			<Text> </Text>

			<Text bold color="white">What is CLAiRiFAi?</Text>
			<Text>  CLAiRiFAi takes raw meeting transcripts and transforms them into</Text>
			<Text>  engineer-ready tickets through a 4-stage AI pipeline powered by Claude.</Text>
			<Text>  Created by <Text bold>Matt Wozniak</Text> — https://www.linkedin.com/in/matthew-wozniak/</Text>
			<Text> </Text>

			<Text bold color="white">Pipeline Stages</Text>
			<Text>  1. <Text bold color="green">Parse</Text>     — Structures the raw transcript into speaker segments</Text>
			<Text>  2. <Text bold color="green">Extract</Text>   — Identifies tickets, decisions, and open questions</Text>
			<Text>  3. <Text bold color="green">Clarify</Text>   — Reviews ticket quality, adds confidence scores,</Text>
			<Text>                    and surfaces blocking questions for you to answer</Text>
			<Text>  4. <Text bold color="green">Generate</Text>  — Produces a final Markdown report with all tickets</Text>
			<Text> </Text>

			<Text bold color="white">Commands</Text>
			<Text>  clairifai                          Interactive menu (this screen)</Text>
			<Text>  clairifai process {'<transcript>'}      Run full pipeline on a file</Text>
			<Text>  clairifai continue {'<run-id>'}         Answer questions, re-run stages 3+4</Text>
			<Text>  clairifai push {'<run-id>'}             Push tickets to GitHub as issues</Text>
			<Text>  clairifai help                      Show this help screen</Text>
			<Text> </Text>

			<Text bold color="white">Supported Formats</Text>
			<Text>  Plain text (.txt), SRT subtitles (.srt), WebVTT (.vtt), Markdown (.md)</Text>
			<Text> </Text>

			<Text bold color="white">How It Works</Text>
			<Text>  Each stage spawns a Claude subprocess, sends a tailored prompt, and</Text>
			<Text>  validates the output against a strict schema. Stage outputs are saved</Text>
			<Text>  as versioned JSON files in .clairifai/runs/ so nothing is ever lost.</Text>
			<Text>  If a stage times out or fails, you can retry with an extended timeout,</Text>
			<Text>  skip the stage, or abort the pipeline.</Text>
			<Text> </Text>

			<Text bold color="white">Configuration</Text>
			<Text>  Settings are stored in .clairifai.json at your project root.</Text>
			<Text>  It is auto-generated with defaults on first run.</Text>
			<Text> </Text>

			<Text bold color="white">Requirements</Text>
			<Text>  - Node.js 22+</Text>
			<Text>  - Claude Code CLI installed and authenticated (claude --print)</Text>
			<Text> </Text>

			<Box>
				<Text dimColor>[Enter/Esc/q] back to menu</Text>
			</Box>
		</Box>
	);
}
