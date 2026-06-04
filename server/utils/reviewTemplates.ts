import {
  ReviewTemplateFieldsSchema,
  type ReviewTemplateField,
} from "#server/schemas/reviewTemplates";

// Stable ids so the one-time migration can map legacy columns onto known fields.
export const DEFAULT_FIELD_IDS = {
  learnings: "00000000-0000-0000-0000-000000000001",
  highlights: "00000000-0000-0000-0000-000000000002",
  concerns: "00000000-0000-0000-0000-000000000003",
} as const;

export const DEFAULT_TEMPLATE_FIELDS: ReviewTemplateField[] = [
  {
    id: DEFAULT_FIELD_IDS.learnings,
    type: "long_text",
    label: "What have I learnt in the past three months?",
    helpText: "Think about technical skills, soft skills, or domain knowledge...",
    required: false,
  },
  {
    id: DEFAULT_FIELD_IDS.highlights,
    type: "long_text",
    label: "Any highlights?",
    helpText: "Projects delivered, problems solved, or team contributions...",
    required: false,
  },
  {
    id: DEFAULT_FIELD_IDS.concerns,
    type: "long_text",
    label: "Are you worried about anything right now?",
    helpText: "Blockers, uncertainties, or support you might need...",
    required: false,
  },
];

/** Validate + deep-copy a template's fields for storage as an immutable snapshot. */
export function buildSnapshot(fields: ReviewTemplateField[]): ReviewTemplateField[] {
  return ReviewTemplateFieldsSchema.parse(fields);
}

/**
 * Validate a reviewee answers map against a review's field snapshot.
 * Returns an error message string, or null if valid.
 *
 * NOTE: `required` fields are intentionally NOT enforced here - the flag is a
 * UI-only hint in v1 that drives client-side validation. This function only
 * checks that provided answers are structurally valid against the snapshot.
 */
export function validateAnswers(
  snapshot: ReviewTemplateField[],
  answers: Record<string, string>,
): string | null {
  const byId = new Map(snapshot.map((f) => [f.id, f]));
  for (const [fieldId, value] of Object.entries(answers)) {
    const field = byId.get(fieldId);
    if (!field) return `Answer for unknown field "${fieldId}"`;
    if (field.type === "section") return `Cannot answer a section field "${fieldId}"`;
    if (typeof value !== "string") return `Answer for "${fieldId}" must be a string`;
    // Empty string is the "no answer yet" sentinel for multiple_choice and is always allowed.
    if (field.type === "multiple_choice" && value !== "" && !field.options?.includes(value)) {
      return `"${value}" is not a valid option for "${field.label}"`;
    }
  }
  return null;
}
