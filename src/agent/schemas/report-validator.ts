import { createError } from '../../errors.js';
import type { ClairifaiError } from '../../types.js';

const REQUIRED_SECTIONS = [
	'## Summary',
	'## Key Decisions',
	'## Generated Tickets',
];

const OPTIONAL_SECTIONS = [
	'## Action Items',
	'## Open Questions',
	'## Version History',
];

export function validateReportStructure(markdown: string): {
	valid: boolean;
	error: ClairifaiError | null;
	warnings: string[];
} {
	const warnings: string[] = [];
	const missing: string[] = [];

	for (const section of REQUIRED_SECTIONS) {
		if (!markdown.includes(section)) {
			missing.push(section);
		}
	}

	for (const section of OPTIONAL_SECTIONS) {
		if (!markdown.includes(section)) {
			warnings.push(`Optional section missing: ${section}`);
		}
	}

	if (missing.length > 0) {
		return {
			valid: false,
			error: createError('REPORT_STRUCTURE_INVALID', `Missing: ${missing.join(', ')}`),
			warnings,
		};
	}

	return { valid: true, error: null, warnings };
}
