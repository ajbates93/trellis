import { describe, it, expect } from "vitest";
import {
  DEFAULT_TEMPLATE_FIELDS,
  DEFAULT_FIELD_IDS,
  buildSnapshot,
  validateAnswers,
} from "./reviewTemplates";

describe("DEFAULT_TEMPLATE_FIELDS", () => {
  it("has three long_text fields with stable ids", () => {
    expect(DEFAULT_TEMPLATE_FIELDS).toHaveLength(3);
    expect(DEFAULT_TEMPLATE_FIELDS.every((f) => f.type === "long_text")).toBe(true);
    expect(DEFAULT_TEMPLATE_FIELDS.map((f) => f.id)).toEqual([
      DEFAULT_FIELD_IDS.learnings,
      DEFAULT_FIELD_IDS.highlights,
      DEFAULT_FIELD_IDS.concerns,
    ]);
  });
});

describe("buildSnapshot", () => {
  it("returns a deep copy validated against the field schema", () => {
    const snap = buildSnapshot(DEFAULT_TEMPLATE_FIELDS);
    expect(snap).toEqual(DEFAULT_TEMPLATE_FIELDS);
    expect(snap).not.toBe(DEFAULT_TEMPLATE_FIELDS);
  });

  it("throws on an invalid field", () => {
    expect(() => buildSnapshot([{ id: "x", type: "long_text", label: "" } as never])).toThrow();
  });
});

describe("validateAnswers", () => {
  const snapshot = [
    { id: "a1", type: "long_text", label: "Text", required: false },
    { id: "b2", type: "multiple_choice", label: "Status", required: false, options: ["On track", "At risk"] },
    { id: "c3", type: "section", label: "Heading", required: false },
  ] as never[];

  it("returns null for valid answers", () => {
    expect(validateAnswers(snapshot, { a1: "<p>hi</p>", b2: "On track" })).toBeNull();
  });

  it("rejects an unknown field id", () => {
    expect(validateAnswers(snapshot, { zz: "x" })).toMatch(/unknown field/i);
  });

  it("rejects an answer for a section field", () => {
    expect(validateAnswers(snapshot, { c3: "nope" })).toMatch(/section/i);
  });

  it("rejects a multiple_choice value not in options", () => {
    expect(validateAnswers(snapshot, { b2: "Off track" })).toMatch(/not a valid option/i);
  });
});
