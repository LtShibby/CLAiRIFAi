// ─── Pipeline types ───

export type PipelineStage = 'parse' | 'extract' | 'clarify' | 'generate';

export type StageStatus = 'pending' | 'running' | 'done' | 'failed' | 'timeout';

export type StageState = {
	stage: PipelineStage;
	status: StageStatus;
	version: number;
	startedAt?: Date;
	finishedAt?: Date;
	elapsedMs: number;
	logLines: string[];
	retryCount: number;
};

export type PipelineState = {
	runId: string;
	stages: Record<PipelineStage, StageState>;
	currentStage: PipelineStage | null;
	startedAt: Date;
	finishedAt?: Date;
};

// ─── Domain types (Stage 1 output) ───

export type SegmentType = 'DISCUSSION' | 'DECISION' | 'ACTION_ITEM' | 'QUESTION' | 'TANGENT';

export type ParsedSegment = {
	id: string;
	timestamp: string | null;
	speaker: string;
	speaker_role: string;
	type: SegmentType;
	content: string;
	references_segment?: string;
};

export type ParseIssue = {
	segment_id: string;
	issue: 'speaker_unclear' | 'audio_unclear' | 'crosstalk';
	note: string;
};

export type MeetingMetadata = {
	title: string;
	date: string | null;
	duration_minutes: number | null;
	attendees: string[];
	attendee_roles: Record<string, string>;
};

export type ParsedTranscript = {
	meeting_metadata: MeetingMetadata;
	segments: ParsedSegment[];
	parse_issues: ParseIssue[];
};

// ─── Domain types (Stage 2 output) ───

export type TicketType = 'FEATURE' | 'BUG' | 'SPIKE' | 'TECH_DEBT';
export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type QuestionPriority = 'BLOCKING' | 'IMPORTANT' | 'NICE_TO_HAVE';
export type QuestionType = 'MULTIPLE_CHOICE' | 'FREEFORM' | 'CONFIRMATION';

export type AcceptanceCriterion = {
	id: string;
	given: string;
	when: string;
	then: string;
	source_segment: string;
	inferred: boolean;
};

export type Decision = {
	decision: string;
	made_by: string;
	role: string;
	timestamp: string;
	source_segment: string;
};

export type QuestionOption = {
	option: string;
	text: string;
	implication: string;
};

export type OpenQuestion = {
	id: string;
	question: string;
	priority: QuestionPriority;
	type: QuestionType;
	options?: QuestionOption[];
	agent_lean?: string;
	context: string;
};

export type TicketDependencies = {
	depends_on: string[];
	blocks: string[];
	related: string[];
};

export type ExtractedTicket = {
	id: string;
	type: TicketType;
	title: string;
	confidence: Confidence;
	confidence_factors: {
		explicit_criteria: boolean;
		scope_defined: boolean;
		no_conflicts: boolean;
		inference_required: boolean;
	};
	source_segments: string[];
	user_story?: string;
	problem_statement?: string;
	research_question?: string;
	current_state?: string;
	context: string;
	acceptance_criteria: AcceptanceCriterion[];
	technical_notes: string | null;
	out_of_scope: string[];
	decisions: Decision[];
	open_questions: OpenQuestion[];
	dependencies: TicketDependencies;
};

export type MeetingSummary = {
	key_decisions: { decision: string; made_by: string; source_segment: string }[];
	action_items: { action: string; owner: string; due_date: string | null; source_segment: string }[];
	deferred_topics: string[];
};

export type ExtractionResult = {
	tickets: ExtractedTicket[];
	meeting_summary: MeetingSummary;
	extraction_notes: {
		total_work_items_identified: number;
		tickets_generated: number;
		items_too_vague: string[];
	};
};

// ─── Domain types (Stage 3 output) ───

export type ReviewStatus = 'READY' | 'NEEDS_CLARIFICATION' | 'TOO_VAGUE';

export type InferredAddition = {
	field: string;
	addition: string;
	confidence: Confidence;
	rationale: string;
};

export type ReviewedTicket = {
	ticket_id: string;
	status: ReviewStatus;
	confidence: Confidence;
	review_notes: string;
	inferred_additions: InferredAddition[];
	open_questions: string[];
};

export type ConsolidatedQuestion = {
	id: string;
	affects_tickets: string[];
	priority: QuestionPriority;
	question: string;
	context: string;
	type: QuestionType;
	options?: QuestionOption[];
	agent_lean?: string;
};

export type ClarifyResult = {
	reviewed_tickets: ReviewedTicket[];
	consolidated_questions: ConsolidatedQuestion[];
	summary: {
		total_tickets: number;
		ready: number;
		needs_clarification: number;
		too_vague: number;
		blocking_questions: number;
		important_questions: number;
		nice_to_have_questions: number;
	};
};

// ─── Config ───

export type TicketFormatConfig = {
	userStoryFormat: 'as-a-i-want' | 'job-story' | 'plain';
	acceptanceCriteriaFormat: 'given-when-then' | 'checklist';
	includeTechnicalNotes: boolean;
	includeOutOfScope: boolean;
};

export type JiraConfig = {
	projectKey: string;
	baseUrl: string;
	customFields: Record<string, string>;
};

export type TimeoutConfig = {
	parse: number;
	extract: number;
	clarify: number;
	generate: number;
};

export type ClairifaiConfig = {
	repo?: string;
	outputFormat: 'markdown' | 'jira-json' | 'both';
	timeouts: TimeoutConfig;
	maxTranscriptTokens: number;
	claudeFlags: string[];
	ticketDefaults: TicketFormatConfig;
	jira?: JiraConfig;
	confidenceThreshold: Confidence;
};

// ─── Error types ───

export type ErrorCode =
	| 'CLAUDE_NOT_FOUND'
	| 'CLAUDE_AUTH_FAILED'
	| 'NODE_VERSION_UNSUPPORTED'
	| 'CONFIG_INVALID'
	| 'TRANSCRIPT_NOT_FOUND'
	| 'TRANSCRIPT_TOO_LONG'
	| 'TRANSCRIPT_EMPTY'
	| 'STAGE_TIMEOUT'
	| 'STAGE_FAILED'
	| 'JSON_PARSE_FAILED'
	| 'SCHEMA_VALIDATION_FAILED'
	| 'REPORT_STRUCTURE_INVALID'
	| 'GITHUB_TOKEN_MISSING'
	| 'GITHUB_PUSH_FAILED';

export type ClairifaiError = {
	code: ErrorCode;
	message: string;
	details?: string;
	recoverable: boolean;
	suggestion?: string;
};
