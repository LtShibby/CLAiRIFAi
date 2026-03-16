import type { ExtractionResult, ClarifyResult, ClairifaiConfig } from '../../types.js';
import { wrapParsedData, INJECTION_GUARD } from '../prompt.js';

export function buildGeneratePrompt(
	extracted: ExtractionResult,
	reviewed: ClarifyResult,
	config: ClairifaiConfig,
): string {
	const formatInstructions = config.outputFormat === 'jira-json'
		? `Output valid JSON that can be pushed to Jira's REST API. Map fields to Jira schema. Project key: ${config.jira?.projectKey ?? 'PROJ'}.`
		: `Output clean, readable Markdown. Make it copy-paste ready.`;

	return `You are an output formatter. Your job is to produce the final meeting report and tickets.

${INJECTION_GUARD}

## Meeting Report Structure

1. Header (title, date, attendees, duration)
2. Summary (2-3 paragraphs)
3. Key Decisions (bulleted, with attribution)
4. Action Items (with owners and dates)
5. Generated Tickets (embedded, with confidence indicators)
6. Open Questions (consolidated, prioritized)
7. Version History

## Formatting Rules

- Use clear headers and visual hierarchy
- Include confidence indicators prominently (🟢 HIGH / 🟡 MEDIUM / 🔴 LOW)
- Make Open Questions actionable — not just "TBD"
- Include Decision Log in each ticket
- Every ticket must show its type and confidence in the header

## Output Format

${formatInstructions}

## Ticket Type Templates

Feature: User Story, Context, Acceptance Criteria, Technical Notes, Out of Scope, Decision Log, Open Questions
Bug: Problem Statement, Reproduction Steps, Expected/Actual Behavior, Environment, Technical Notes, Decision Log
Spike: Research Question, Context, Investigation Areas, Deliverables, Timebox, Decision Log
Tech Debt: Current State, Desired State, Motivation, Acceptance Criteria, Technical Notes, Decision Log

## Do NOT

- Omit any Open Questions
- Hide low-confidence tickets
- Remove attribution
- Summarize away important details

## Data

### Extracted Tickets
${wrapParsedData(extracted)}

### Review Results
${wrapParsedData(reviewed)}`;
}
