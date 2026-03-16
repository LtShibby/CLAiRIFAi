import { z } from 'zod';

const confidenceSchema = z.enum(['HIGH', 'MEDIUM', 'LOW']);
const ticketTypeSchema = z.enum(['FEATURE', 'BUG', 'SPIKE', 'TECH_DEBT']);
const questionPrioritySchema = z.enum(['BLOCKING', 'IMPORTANT', 'NICE_TO_HAVE']);
const questionTypeSchema = z.enum(['MULTIPLE_CHOICE', 'FREEFORM', 'CONFIRMATION']);

const acceptanceCriterionSchema = z.object({
	id: z.string(),
	given: z.string(),
	when: z.string(),
	then: z.string(),
	source_segment: z.string(),
	inferred: z.boolean(),
});

const decisionSchema = z.object({
	decision: z.string(),
	made_by: z.string(),
	role: z.string(),
	timestamp: z.string(),
	source_segment: z.string(),
});

const questionOptionSchema = z.object({
	option: z.string(),
	text: z.string(),
	implication: z.string(),
});

const openQuestionSchema = z.object({
	id: z.string(),
	question: z.string(),
	priority: questionPrioritySchema,
	type: questionTypeSchema,
	options: z.array(questionOptionSchema).optional(),
	agent_lean: z.string().optional(),
	context: z.string(),
});

const ticketDependenciesSchema = z.object({
	depends_on: z.array(z.string()),
	blocks: z.array(z.string()),
	related: z.array(z.string()),
});

const extractedTicketSchema = z.object({
	id: z.string(),
	type: ticketTypeSchema,
	title: z.string(),
	confidence: confidenceSchema,
	confidence_factors: z.object({
		explicit_criteria: z.boolean(),
		scope_defined: z.boolean(),
		no_conflicts: z.boolean(),
		inference_required: z.boolean(),
	}),
	source_segments: z.array(z.string()),
	user_story: z.string().optional(),
	problem_statement: z.string().optional(),
	research_question: z.string().optional(),
	current_state: z.string().optional(),
	context: z.string(),
	acceptance_criteria: z.array(acceptanceCriterionSchema),
	technical_notes: z.string().nullable(),
	out_of_scope: z.array(z.string()),
	decisions: z.array(decisionSchema),
	open_questions: z.array(openQuestionSchema),
	dependencies: ticketDependenciesSchema,
});

const meetingSummarySchema = z.object({
	key_decisions: z.array(z.object({
		decision: z.string(),
		made_by: z.string(),
		source_segment: z.string(),
	})),
	action_items: z.array(z.object({
		action: z.string(),
		owner: z.string(),
		due_date: z.string().nullable(),
		source_segment: z.string(),
	})),
	deferred_topics: z.array(z.string()),
});

export const extractionResultSchema = z.object({
	tickets: z.array(extractedTicketSchema),
	meeting_summary: meetingSummarySchema,
	extraction_notes: z.object({
		total_work_items_identified: z.number(),
		tickets_generated: z.number(),
		items_too_vague: z.array(z.string()),
	}),
});
