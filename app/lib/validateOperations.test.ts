import { describe, it, expect } from "vitest";
import { validateOperations } from "./validateOperations";

describe("validateOperations", () => {
  it("accepts a single valid operation, wrapping it in an array", () => {
    const result = validateOperations({ kind: "ChangeVariant", sectionId: "stats-1", variant: "inline" });
    expect(result).toEqual({
      valid: true,
      operations: [{ kind: "ChangeVariant", sectionId: "stats-1", variant: "inline" }],
    });
  });

  it("accepts an array of valid operations", () => {
    const result = validateOperations([
      { kind: "ChangeVariant", sectionId: "stats-1", variant: "inline" },
      { kind: "HideSection", sectionId: "stats-1" },
    ]);
    expect(result.valid).toBe(true);
    expect(result.valid && result.operations).toHaveLength(2);
  });

  it("accepts ChangeTheme without a sectionId (page-level operation)", () => {
    const result = validateOperations({ kind: "ChangeTheme", dna: { saturation: 0.9 } });
    expect(result.valid).toBe(true);
  });

  it("rejects an empty array", () => {
    expect(validateOperations([]).valid).toBe(false);
  });

  it("rejects a non-object item", () => {
    expect(validateOperations("not-an-operation").valid).toBe(false);
    expect(validateOperations(null).valid).toBe(false);
  });

  it("rejects an unknown kind", () => {
    const result = validateOperations({ kind: "DoSomethingMadeUp", sectionId: "x" });
    expect(result.valid).toBe(false);
  });

  it("rejects a missing kind", () => {
    expect(validateOperations({ sectionId: "x" }).valid).toBe(false);
  });

  it("rejects a section-targeting kind with a missing sectionId", () => {
    expect(validateOperations({ kind: "HideSection" }).valid).toBe(false);
  });

  it("rejects a section-targeting kind with an empty-string sectionId", () => {
    expect(validateOperations({ kind: "HideSection", sectionId: "" }).valid).toBe(false);
  });

  it("rejects if any item in a batch is invalid, even if others are valid", () => {
    const result = validateOperations([{ kind: "HideSection", sectionId: "stats-1" }, { kind: "NotReal" }]);
    expect(result.valid).toBe(false);
  });
});
