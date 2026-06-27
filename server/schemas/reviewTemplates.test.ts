import { describe, it, expect } from "vitest";
import {
  ReviewTemplateFieldSchema,
  CreateReviewTemplateRequestSchema,
} from "./reviewTemplates";

describe("ReviewTemplateFieldSchema", () => {
  const base = {
    id: "11111111-1111-1111-1111-111111111111",
    label: "What went well?",
    required: false,
  };

  it("accepts a long_text field", () => {
    const parsed = ReviewTemplateFieldSchema.parse({ ...base, type: "long_text" });
    expect(parsed.type).toBe("long_text");
  });

  it("accepts a section field", () => {
    const parsed = ReviewTemplateFieldSchema.parse({ ...base, type: "section" });
    expect(parsed.type).toBe("section");
  });

  it("requires non-empty options for multiple_choice", () => {
    expect(() =>
      ReviewTemplateFieldSchema.parse({ ...base, type: "multiple_choice", options: [] }),
    ).toThrow();
    const ok = ReviewTemplateFieldSchema.parse({
      ...base,
      type: "multiple_choice",
      options: ["Yes", "No"],
    });
    expect(ok.options).toEqual(["Yes", "No"]);
  });

  it("rejects a blank label", () => {
    expect(() =>
      ReviewTemplateFieldSchema.parse({ ...base, label: "", type: "long_text" }),
    ).toThrow();
  });

  it("rejects an invalid uuid id", () => {
    expect(() =>
      ReviewTemplateFieldSchema.parse({ ...base, id: "not-a-uuid", type: "long_text" }),
    ).toThrow();
  });
});

describe("CreateReviewTemplateRequestSchema", () => {
  it("requires a name and accepts a fields array", () => {
    const parsed = CreateReviewTemplateRequestSchema.parse({
      name: "Developer",
      description: null,
      fields: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          type: "long_text",
          label: "Reflection",
          required: false,
        },
      ],
    });
    expect(parsed.name).toBe("Developer");
    expect(parsed.fields).toHaveLength(1);
  });

  it("rejects an empty name", () => {
    expect(() =>
      CreateReviewTemplateRequestSchema.parse({ name: "", fields: [] }),
    ).toThrow();
  });
});
