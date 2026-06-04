import { z } from "zod";

// Accepts any 8-4-4-4-12 hex UUID format (not strictly RFC 4122, to support
// test fixtures and future nil/max UUIDs without variant constraints)
const uuidSchema = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    "Invalid UUID",
  );

export const ReviewTemplateFieldSchema = z
  .object({
    id: uuidSchema,
    type: z.enum(["long_text", "multiple_choice", "section"]),
    label: z.string().min(1, "Label is required").max(200),
    helpText: z.string().max(500).optional(),
    required: z.boolean().default(false),
    options: z.array(z.string().min(1)).optional(),
  })
  .superRefine((field, ctx) => {
    if (field.type === "multiple_choice") {
      if (!field.options || field.options.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Multiple choice fields need at least one option",
          path: ["options"],
        });
      }
    }
  });

export type ReviewTemplateField = z.infer<typeof ReviewTemplateFieldSchema>;

export const ReviewTemplateFieldsSchema = z.array(ReviewTemplateFieldSchema);

export const CreateReviewTemplateRequestSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).nullable().optional(),
  fields: ReviewTemplateFieldsSchema,
});

export const UpdateReviewTemplateRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  fields: ReviewTemplateFieldsSchema.optional(),
});
