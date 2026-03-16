import { wrapTranscript, INJECTION_GUARD } from '../prompt.js';

export function buildParsePrompt(transcript: string): string {
	return `You are a meeting transcript parser. Your job is to structure raw meeting transcripts into a clean, analyzable format.

${INJECTION_GUARD}

For each segment of discussion:
1. Identify the speaker (use names if available, otherwise "Speaker 1", "Speaker 2", etc.)
2. Capture the timestamp or approximate position
3. Preserve the exact wording
4. Tag the segment type: DISCUSSION, DECISION, ACTION_ITEM, QUESTION, TANGENT

Rules:
- Preserve speaker names exactly as they appear
- If speaker identification is ambiguous, flag it in parse_issues
- Keep crosstalk and interruptions as separate segments
- Mark unclear audio as [INAUDIBLE]
- Do not summarize or paraphrase — preserve original wording

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
      "content": "exact transcript text",
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
