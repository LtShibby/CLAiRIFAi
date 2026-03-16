import { z } from 'zod';

const segmentTypeSchema = z.enum(['DISCUSSION', 'DECISION', 'ACTION_ITEM', 'QUESTION', 'TANGENT']);

const parsedSegmentSchema = z.object({
	id: z.string(),
	timestamp: z.string().nullable(),
	speaker: z.string(),
	speaker_role: z.string(),
	type: segmentTypeSchema,
	content: z.string(),
	references_segment: z.string().optional(),
});

const parseIssueSchema = z.object({
	segment_id: z.string(),
	issue: z.enum(['speaker_unclear', 'audio_unclear', 'crosstalk']),
	note: z.string(),
});

const meetingMetadataSchema = z.object({
	title: z.string(),
	date: z.string().nullable(),
	duration_minutes: z.number().nullable(),
	attendees: z.array(z.string()),
	attendee_roles: z.record(z.string()),
});

export const parsedTranscriptSchema = z.object({
	meeting_metadata: meetingMetadataSchema,
	segments: z.array(parsedSegmentSchema),
	parse_issues: z.array(parseIssueSchema),
});
