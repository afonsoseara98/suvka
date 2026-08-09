// Every message here reaches a restaurant owner's screen at the moment they are creating
// their account, which is the least forgiving moment in the whole product. They were in
// English - "Password must be at least 8 characters." - on a page that is otherwise
// entirely in Portuguese, to somebody who may not read English at all.
export const MIN_PASSWORD_LENGTH = 8;
// Deliberately simple - a full RFC 5322 email validator is not worth the complexity
// here; Auth.js/Prisma's unique constraint on User.email is the real guard against a
// malformed value ever mattering.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SignupValidation =
  | { valid: true; email: string; password: string; name?: string }
  | { valid: false; error: string };

export function validateSignup(body: unknown): SignupValidation {
  if (typeof body !== "object" || body === null) {
    return { valid: false, error: "Pedido inválido." };
  }

  const { email, password, name } = body as Record<string, unknown>;

  if (typeof email !== "string" || !EMAIL_PATTERN.test(email.trim())) {
    return { valid: false, error: "Escreva um email válido." };
  }

  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, error: `A palavra-passe tem de ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` };
  }

  if (name !== undefined && typeof name !== "string") {
    return { valid: false, error: "Nome inválido." };
  }

  return { valid: true, email: email.trim().toLowerCase(), password, name };
}
