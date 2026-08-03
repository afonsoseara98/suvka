import { describe, it, expect } from "vitest";
import { validatePrompt } from "./validatePrompt";

describe("validatePrompt", () => {
  it("accepts a normal business description", () => {
    const result = validatePrompt("We are a dental clinic offering checkups for the whole family.");
    expect(result.valid).toBe(true);
  });

  it("trims surrounding whitespace", () => {
    const result = validatePrompt("   We run a gym.   ");
    expect(result).toEqual({ valid: true, value: "We run a gym." });
  });

  it("rejects a missing prompt", () => {
    const result = validatePrompt(undefined);
    expect(result.valid).toBe(false);
  });

  it("rejects a non-string prompt", () => {
    const result = validatePrompt({ not: "a string" });
    expect(result.valid).toBe(false);
  });

  it("rejects an empty string", () => {
    const result = validatePrompt("");
    expect(result.valid).toBe(false);
  });

  it("rejects a prompt shorter than the minimum length", () => {
    const result = validatePrompt("hi");
    expect(result.valid).toBe(false);
  });

  it("rejects a prompt longer than the maximum length", () => {
    const result = validatePrompt("a".repeat(2001));
    expect(result.valid).toBe(false);
  });

  it("accepts a prompt exactly at the maximum length", () => {
    const result = validatePrompt("a".repeat(2000));
    expect(result.valid).toBe(true);
  });
});
