import type { ExtractionResult, ClarifyResult } from '../../types.js';
import { wrapParsedData, INJECTION_GUARD } from '../prompt.js';

export function buildClarifyPrompt(extracted: ExtractionResult): string {
	return `You are a ticket quality reviewer. Your job is to ensure tickets are complete enough for engineers to implement, and to surface any ambiguities.

${INJECTION_GUARD}

## Review Each Ticket For:

### 1. Missing Acceptance Criteria
- Is there at least one testable criterion?
- Can an engineer know when the work is "done"?
- Are edge cases addressed?

If missing: Generate candidate criteria and mark as INFERRED with confidence

### 2. Conflicting Requirements
- Did different speakers express different expectations?
- Are there implicit conflicts (e.g., "fast" vs "comprehensive")?
- Is priority between conflicts clear?

If found: Create MULTIPLE_CHOICE question listing the options

### 3. Unclear Scope
- Is it clear what's IN vs OUT of this ticket?
- Are there "maybe also" items that need resolution?
- Is MVP vs full vision distinguished?

If unclear: Create question proposing scope split

### 4. Technical Ambiguity
- Are multiple implementation approaches mentioned?
- Are dependencies on other systems confirmed?
- Are technical constraints clear?

If ambiguous: Flag for engineering input or create question

## Question Priority Assignment

BLOCKING: Cannot begin implementation
- Missing core user story / problem statement
- Fundamental scope question
- Conflicting requirements with no resolution

IMPORTANT: Can start, but need answer before completion
- Missing edge case handling
- UX details TBD
- Integration specifics

NICE_TO_HAVE: Can proceed with assumption
- Minor details
- Polish items

Assign each ticket a status: READY | NEEDS_CLARIFICATION | TOO_VAGUE

Output ONLY a valid JSON object matching this schema. No markdown fences. No explanation. No preamble.

Schema:
{
  "reviewed_tickets": [
    {
      "ticket_id": "ticket_001",
      "status": "READY | NEEDS_CLARIFICATION | TOO_VAGUE",
      "confidence": "HIGH | MEDIUM | LOW",
      "review_notes": "string",
      "inferred_additions": [
        {
          "field": "string",
          "addition": "string",
          "confidence": "HIGH | MEDIUM | LOW",
          "rationale": "string"
        }
      ],
      "open_questions": ["q_001"]
    }
  ],
  "consolidated_questions": [
    {
      "id": "q_001",
      "affects_tickets": ["ticket_001"],
      "priority": "BLOCKING | IMPORTANT | NICE_TO_HAVE",
      "question": "string",
      "context": "string",
      "type": "MULTIPLE_CHOICE | FREEFORM | CONFIRMATION",
      "options": [{"option": "A", "text": "string", "implication": "string"}],
      "agent_lean": "string"
    }
  ],
  "summary": {
    "total_tickets": 0,
    "ready": 0,
    "needs_clarification": 0,
    "too_vague": 0,
    "blocking_questions": 0,
    "important_questions": 0,
    "nice_to_have_questions": 0
  }
}

${wrapParsedData(extracted)}`;
}

export function buildClarifyPromptWithAnswers(
	extracted: ExtractionResult,
	previousReview: ClarifyResult,
	answers: Record<string, string>,
): string {
	return `You are a ticket quality reviewer. Incorporate the provided answers and re-review the tickets.

${INJECTION_GUARD}

## User Answers to Previous Questions

${Object.entries(answers).map(([qId, answer]) => `- ${qId}: ${answer}`).join('\n')}

## Instructions

1. Incorporate these answers into the relevant tickets
2. Mark the answered questions as resolved
3. Re-assess ticket confidence based on new information
4. Generate any NEW questions that arise from the answers
5. Update ticket status (READY | NEEDS_CLARIFICATION | TOO_VAGUE)

Output ONLY a valid JSON object. No markdown fences. No explanation. No preamble.

## Extracted Tickets
${wrapParsedData(extracted)}

## Previous Review
${wrapParsedData(previousReview)}`;
}
