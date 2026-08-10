import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface RateLimiter {
  check(key: string): Promise<RateLimitResult>;
}

// Correct only for a single, persistent Node process. On serverless (the deployment
// target for this project - see ArchetypeResolver.ts era decisions), each invocation
// can land on a different instance with its own memory, so this undercounts requests
// across instances. It exists as the local-dev/test default and as the fallback below
// when no shared store is configured - never rely on it in production.
export class InMemoryRateLimiter implements RateLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number
  ) {}

  async check(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const entry = this.hits.get(key);

    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (entry.count >= this.limit) {
      return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
    }

    entry.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

// Thin adapter around @upstash/ratelimit - takes an already-constructed Ratelimit
// instance (constructor injection) rather than building one internally, so this class
// has no dependency on env vars and can be unit tested with a fake/mock limiter.
export class UpstashRateLimiter implements RateLimiter {
  constructor(
    private readonly limiter: {
      limit(key: string): Promise<{ success: boolean; reset: number }>;
    }
  ) {}

  async check(key: string): Promise<RateLimitResult> {
    const result = await this.limiter.limit(key);

    if (result.success) {
      return { allowed: true, retryAfterSeconds: 0 };
    }

    return {
      allowed: false,
      retryAfterSeconds: Math.max(0, Math.ceil((result.reset - Date.now()) / 1000)),
    };
  }
}

const GENERATE_LIMIT = 10;
const GENERATE_WINDOW_MS = 60_000;

// PER-ENDPOINT CEILINGS
//
// One blanket limit did not fit, because the two anonymous endpoints fail in different
// ways and neither of them costs a model call - the restaurant path makes none at all.
//
// Generating: five Pexels lookups per site (one hero, four gallery). At the old ten per
// minute that is 3,000 requests an hour against a free tier of 200, so a single visitor
// holding the button exhausts the quota in four minutes and every site generated after
// that comes out without photographs.
//
// Set to 15 rather than the 5 the quota alone would argue for. Frustrating somebody on
// their first contact costs a customer; the quota only breaks under traffic that does not
// exist yet, and lowering a limit later is trivial where recovering a lost first impression
// is not. Worth watching: 15 an hour is 75 lookups per address, so three simultaneous
// visitors at the ceiling would exhaust the free tier.
export const DRAFT_LIMIT = 15;
export const DRAFT_WINDOW_MS = 60 * 60_000;

// Uploading: ten megabytes each. At the old rate one address could write 100 MB a minute,
// which fills a 40 GB VPS in about seven hours - and the disk it fills is the one holding
// every other restaurant's photographs. Six is the per-draft maximum, so twenty an hour
// covers a full set plus mistakes plus a second restaurant.
export const PHOTO_LIMIT = 20;
export const PHOTO_WINDOW_MS = 60 * 60_000;

// AUTENTICAÇÃO: O CUSTO NÃO É A BASE DE DADOS, É O CPU
//
// Estes dois eram os únicos endpoints públicos sem travão, e eram precisamente os dois que
// calculam um bcrypt. Medido nesta máquina: `bcrypt.compare` com cost 12 demora 439 ms, ou
// seja 2,3 tentativas por segundo chegam para saturar um vCPU - e a máquina tem dois,
// partilhados com o Postgres e o Caddy. Vinte pedidos por segundo, que é um portátil e um
// ciclo, não derrubam o login: derrubam os sites publicados de todos os restaurantes ao
// mesmo tempo, porque vivem todos no mesmo processo.
//
// O cost 12 é a escolha certa e fica. O que faltava era isto.
//
// Por endereço, porque é o que protege o CPU: o custo é gasto por quem faz o pedido, tenha
// ele razão ou não.
export const LOGIN_IP_LIMIT = 10;
export const LOGIN_IP_WINDOW_MS = 60_000;

// E por email, porque só por endereço não trava quem distribui os pedidos por muitos
// endereços - que é exactamente como se adivinha uma password a sério. Dez em quinze
// minutos deixa um dono de restaurante enganar-se várias vezes e ainda assim entrar.
export const LOGIN_EMAIL_LIMIT = 10;
export const LOGIN_EMAIL_WINDOW_MS = 15 * 60_000;

// Criar conta faz-se uma vez. Cinco por hora e por endereço é generoso para uma pessoa e
// inútil para quem quer encher a tabela - ou gastar o CPU a fazer hashes.
export const SIGNUP_IP_LIMIT = 5;
export const SIGNUP_IP_WINDOW_MS = 60 * 60_000;

// Atrás do Caddy, o pedido chega sempre de 127.0.0.1 - o endereço real vem no cabeçalho que
// o proxy escreve. Só é de confiança porque nada fala directamente com o Node: ver
// deploy/Caddyfile. Um dia em que a aplicação seja exposta sem proxy, isto passa a ser um
// campo que o atacante escolhe, e o limite por endereço deixa de valer nada.
export function clientAddress(request: { headers: { get(name: string): string | null } }): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

const cache = new Map<string, RateLimiter>();

// Backend is chosen once, by environment: Upstash when credentials are present
// (production/serverless), in-memory otherwise (local dev, tests, CI). Swapping the
// backend never touches route.ts - it only depends on the RateLimiter interface.
export function getRateLimiter(name: string, limit: number, windowMs: number): RateLimiter {
  const key = `${name}:${limit}:${windowMs}`;
  const existing = cache.get(key);
  if (existing) return existing;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    const ratelimit = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
      prefix: `noctra:${name}`,
    });

    const upstash = new UpstashRateLimiter(ratelimit);
    cache.set(key, upstash);
    return upstash;
  }

  console.warn(
    "[rateLimit] UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN not set - falling back to " +
      "an in-memory rate limiter. This does not protect a multi-instance/serverless " +
      "deployment; configure Upstash before going to production."
  );

  const memory = new InMemoryRateLimiter(limit, windowMs);
  cache.set(key, memory);
  return memory;
}

// The original caller: the free-text generate route, which unlike the restaurant path does
// make a paid model call, so its ceiling is about money rather than quota or disk.
export function getGenerateRateLimiter(): RateLimiter {
  return getRateLimiter("generate", GENERATE_LIMIT, GENERATE_WINDOW_MS);
}

