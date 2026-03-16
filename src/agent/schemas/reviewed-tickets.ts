import { z } from 'zod';

const confidenceSchema = z.enum(['HIGH', 'MEDIUM', 'LOW']);
const reviewStatusSchema = z.enum(['READY', 'NEEDS_CLARIFICATION', 'TOO_VAGUE']);
const questionPrioritySchema = z.enum(['BLOCKING', 'IMPORTANT', 'NICE_TO_HAVE']);
const questionTypeSchema = z.enum(['MULTIPLE_CHOICE', 'FREEFORM', 'CONFIRMATION']);

const inferredAdditionSchema = z.object({
	field: z.string(),
	addition: z.string(),
	confidence: confidenceSchema,
	rationale: z.string(),
});

const reviewedTicketSchema = z.object({
	ticket_id: z.string(),
	status: reviewStatusSchema,
	confidence: confidenceSchema,
	review_notes: z.string(),
	inferred_additions: z.array(inferredAdditionSchema),
	open_questions: z.array(z.string()),
});

const questionOptionSchema = z.object({
	option: z.string(),
	text: z.string(),
	implication: z.string(),
});

const consolidatedQuestionSchema = z.object({
	id: z.string(),
	affects_tickets: z.array(z.string()),
	priority: questionPrioritySchema,
	question: z.string(),
	context: z.string(),
	type: questionTypeSchema,
	options: z.array(questionOptionSchema).optional(),
	agent_lean: z.string().optional(),
});

export const clarifyResultSchema = z.object({
	reviewed_tickets: z.array(reviewedTicketSchema),
	consolidated_questions: z.array(consolidatedQuestionSchema),
	summary: z.object({
		total_tickets: z.number(),
		ready: z.number(),
		needs_clarification: z.number(),
		too_vague: z.number(),
		blocking_questions: z.number(),
		important_questions: z.number(),
		nice_to_have_questions: z.number(),
	}),
});
