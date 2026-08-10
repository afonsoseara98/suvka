import {
  getRateLimiter,
  LOGIN_IP_LIMIT,
  LOGIN_IP_WINDOW_MS,
  LOGIN_EMAIL_LIMIT,
  LOGIN_EMAIL_WINDOW_MS,
  type RateLimiter,
} from "./rateLimit";

// O TRAVÃO DAS TENTATIVAS DE ENTRADA
//
// Separado de auth.ts por uma razão prática: o `authorize` do Auth.js não se consegue
// chamar num teste sem levantar meio Auth.js atrás, e esta é a parte que interessa
// verificar. Aqui recebe os limitadores como argumento, tal como o resto do projecto
// (RateLimiter, PhotoStore, DraftStore), portanto testa-se com dois falsos.
//
// A ORDEM É O PONTO TODO. Isto tem de correr ANTES do bcrypt. Um travão que conta as
// tentativas depois de as ter pago não protege coisa nenhuma - o CPU já foi gasto, que é
// exactamente o recurso que se está a defender.

export interface AuthAttempt {
  address: string;
  email: string;
}

export type AuthThrottleResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export interface AuthThrottleLimiters {
  byAddress: RateLimiter;
  byEmail: RateLimiter;
}

function defaultLimiters(): AuthThrottleLimiters {
  return {
    byAddress: getRateLimiter("login-ip", LOGIN_IP_LIMIT, LOGIN_IP_WINDOW_MS),
    byEmail: getRateLimiter("login-email", LOGIN_EMAIL_LIMIT, LOGIN_EMAIL_WINDOW_MS),
  };
}

export async function checkLoginAttempt(
  attempt: AuthAttempt,
  limiters: AuthThrottleLimiters = defaultLimiters()
): Promise<AuthThrottleResult> {
  // O endereço primeiro: é o que defende a máquina, e é a verificação que não depende de o
  // email vir preenchido ou sequer ser um email.
  const address = await limiters.byAddress.check(attempt.address);
  if (!address.allowed) {
    return { allowed: false, retryAfterSeconds: address.retryAfterSeconds };
  }

  // Minúsculas: caso contrário "Joao@..." e "joao@..." são duas contagens para a mesma
  // conta, e quem adivinha passwords só tem de alternar a capitalização.
  const email = attempt.email.trim().toLowerCase();
  if (!email) return { allowed: true };

  const byEmail = await limiters.byEmail.check(email);
  if (!byEmail.allowed) {
    return { allowed: false, retryAfterSeconds: byEmail.retryAfterSeconds };
  }

  return { allowed: true };
}
