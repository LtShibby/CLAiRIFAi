export type TranscriptFormat = 'plain' | 'srt' | 'vtt' | 'unknown';

/**
 * Detect the format of a transcript.
 */
export function detectFormat(content: string): TranscriptFormat {
	const trimmed = content.trim();

	// VTT starts with WEBVTT header
	if (trimmed.startsWith('WEBVTT')) {
		return 'vtt';
	}

	// SRT: first line is a number, second line contains -->
	const lines = trimmed.split('\n');
	if (lines.length >= 2 && /^\d+$/.test(lines[0].trim()) && lines[1].includes('-->')) {
		return 'srt';
	}

	// Plain text: contains "Speaker:" patterns
	if (/^[A-Za-z\s]+:/.test(trimmed)) {
		return 'plain';
	}

	return 'unknown';
}

/**
 * Estimate word count from transcript content.
 */
export function estimateWordCount(content: string): number {
	return content.split(/\s+/).filter(w => w.length > 0).length;
}
