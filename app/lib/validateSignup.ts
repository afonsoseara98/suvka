const MIN_PASSWORD_LENGTH = 8;
// Deliberately simple - a full RFC 5322 email validator is not worth the complexity
// here; Auth.js/Prisma's unique constraint on User.email is the real guard against a
// malformed value ever mattering.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SignupValidation =
  | { valid: true; email: string; password: string; name?: string }
  | { valid: false; error: string };

export function validateSignup(body: unknown): SignupValidation {
  if (typeof body !== "object" || body === null) {
    return { valid: false, error: "Request body must be an object." };
  }

  const { email, password, name } = body as Record<string, unknown>;

  if (typeof email !== "string" || !EMAIL_PATTERN.test(email.trim())) {
    return { valid: false, error: "A valid email is required." };
  }

  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }

  if (name !== undefined && typeof name !== "string") {
    return { valid: false, error: "name must be a string if provided." };
  }

  return { valid: true, email: email.trim().toLowerCase(), password, name };
}
