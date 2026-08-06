import { describe, it, expect } from "vitest";
import { validateSignup } from "./validateSignup";

describe("validateSignup", () => {
  it("accepts a valid email/password", () => {
    const result = validateSignup({ email: "a@acme.com", password: "supersecret" });
    expect(result).toEqual({ valid: true, email: "a@acme.com", password: "supersecret", name: undefined });
  });

  it("lowercases and trims the email", () => {
    const result = validateSignup({ email: "  Marta@Acme.COM  ", password: "supersecret" });
    expect(result.valid).toBe(true);
    expect(result).toMatchObject({ email: "marta@acme.com" });
  });

  it("carries an optional name through", () => {
    const result = validateSignup({ email: "a@acme.com", password: "supersecret", name: "Marta" });
    expect(result).toMatchObject({ name: "Marta" });
  });

  it("rejects a missing body", () => {
    expect(validateSignup(undefined).valid).toBe(false);
    expect(validateSignup(null).valid).toBe(false);
  });

  it("rejects a malformed email", () => {
    expect(validateSignup({ email: "not-an-email", password: "supersecret" }).valid).toBe(false);
  });

  it("rejects a missing email", () => {
    expect(validateSignup({ password: "supersecret" }).valid).toBe(false);
  });

  it("rejects a password shorter than the minimum length", () => {
    expect(validateSignup({ email: "a@acme.com", password: "short" }).valid).toBe(false);
  });

  it("rejects a non-string name", () => {
    expect(validateSignup({ email: "a@acme.com", password: "supersecret", name: 123 }).valid).toBe(false);
  });
});
