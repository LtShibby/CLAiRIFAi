import React from 'react';
import { Box, Text } from 'ink';

type LiveLogProps = {
	lines: string[];
	maxLines?: number;
};

export function LiveLog({ lines, maxLines = 5 }: LiveLogProps) {
	const visibleLines = lines.slice(-maxLines);

	return (
		<Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1} marginTop={1}>
			<Text dimColor bold>Claude Code output:</Text>
			{visibleLines.length === 0 ? (
				<Text dimColor>Waiting for output...</Text>
			) : (
				visibleLines.map((line, i) => (
					<Text key={i} dimColor wrap="truncate">{line}</Text>
				))
			)}
		</Box>
	);
}
