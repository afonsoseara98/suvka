const MIN_LENGTH = 10;
const MAX_LENGTH = 2000;

export type PromptValidation =
  | { valid: true; value: string }
  | { valid: false; error: string };

export function validatePrompt(prompt: unknown): PromptValidation {
  if (typeof prompt !== "string") {
    return { valid: false, error: "prompt is required and must be a string." };
  }

  const trimmed = prompt.trim();

  if (trimmed.length < MIN_LENGTH) {
    return { valid: false, error: `prompt must be at least ${MIN_LENGTH} characters.` };
  }

  if (trimmed.length > MAX_LENGTH) {
    return { valid: false, error: `prompt must be at most ${MAX_LENGTH} characters.` };
  }

  return { valid: true, value: trimmed };
}
