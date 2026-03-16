import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { ExtractionResult, ClarifyResult } from '../types.js';

const CONFIDENCE_ICONS: Record<string, string> = {
	HIGH: '🟢',
	MEDIUM: '🟡',
	LOW: '🔴',
};

type TicketPreviewProps = {
	extracted: ExtractionResult;
	reviewed: ClarifyResult;
	reportPath: string;
	onConfirm: () => void;
};

export function TicketPreview({ extracted, reviewed, reportPath, onConfirm }: TicketPreviewProps) {
	useInput((_input, key) => {
		if (key.return) {
			onConfirm();
		}
	});

	return (
		<Box flexDirection="column" padding={1}>
			<Text bold color="green">Pipeline complete!</Text>
			<Text> </Text>
			<Text bold>Generated Tickets:</Text>
			{extracted.tickets.map((ticket) => {
				const review = reviewed.reviewed_tickets.find(r => r.ticket_id === ticket.id);
				const confidence = review?.confidence ?? ticket.confidence;
				const icon = CONFIDENCE_ICONS[confidence] ?? '';
				const status = review?.status ?? 'READY';

				return (
					<Box key={ticket.id} marginLeft={1}>
						<Text>
							{`${icon} ${ticket.title}`}
						</Text>
						<Text dimColor>
							{`  [${ticket.type}] [${status}]`}
						</Text>
					</Box>
				);
			})}
			<Text> </Text>
			<Text dimColor>
				{`Report saved to: ${reportPath}`}
			</Text>
			<Box marginTop={1}>
				<Text bold>
					{`${extracted.tickets.length} tickets  |  ${reviewed.summary.blocking_questions} blocking questions remaining`}
				</Text>
			</Box>
			<Text> </Text>
			<Text dimColor>Press [Enter] to exit</Text>
		</Box>
	);
}
