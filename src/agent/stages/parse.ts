import { wrapTranscript, INJECTION_GUARD } from '../prompt.js';

// Transcripts above this character count use the condensed prompt to avoid output token limits
const LARGE_TRANSCRIPT_THRESHOLD = 30000;

export function buildParsePrompt(transcript: string): string {
	const isLarge = transcript.length > LARGE_TRANSCRIPT_THRESHOLD;

	const contentRule = isLarge
		? `- Summarize each segment's content in 1-3 sentences. Do NOT reproduce the full text.
- Combine adjacent segments by the same speaker on the same topic into a single segment.
- Aim for no more than 60 segments total.`
		: `- Preserve the exact wording of each segment. Do not summarize or paraphrase.
- Keep crosstalk and interruptions as separate segments.`;

	const contentFieldDesc = isLarge
		? '"content": "1-3 sentence summary of what was said"'
		: '"content": "exact transcript text"';

	return `You are a meeting transcript parser. Your job is to structure raw meeting transcripts into a clean, analyzable format.

${INJECTION_GUARD}

For each segment of discussion:
1. Identify the speaker (use names if available, otherwise "Speaker 1", "Speaker 2", etc.)
2. Capture the timestamp or approximate position
3. Tag the segment type: DISCUSSION, DECISION, ACTION_ITEM, QUESTION, TANGENT

Rules:
- Preserve speaker names exactly as they appear
- If speaker identification is ambiguous, flag it in parse_issues
${contentRule}
- Mark unclear audio as [INAUDIBLE]

Output ONLY a valid JSON object. No markdown fences. No explanation. No preamble.

Schema:
{
  "meeting_metadata": {
    "title": "string",
    "date": "ISO date or null",
    "duration_minutes": "number or null",
    "attendees": ["string"],
    "attendee_roles": { "name": "role" }
  },
  "segments": [
    {
      "id": "segment_001",
      "timestamp": "HH:MM:SS or null",
      "speaker": "string",
      "speaker_role": "string",
      "type": "DISCUSSION | DECISION | ACTION_ITEM | QUESTION | TANGENT",
      ${contentFieldDesc},
      "references_segment": "segment_id or omit"
    }
  ],
  "parse_issues": [
    {
      "segment_id": "string",
      "issue": "speaker_unclear | audio_unclear | crosstalk",
      "note": "string"
    }
  ]
}

${wrapTranscript(transcript)}`;
}
