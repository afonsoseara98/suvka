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
// that comes out without photographs. A real restaurant generates once and maybe retries
// twice; five an hour is generous for them and caps us at 25 lookups an hour per address.
export const DRAFT_LIMIT = 5;
export const DRAFT_WINDOW_MS = 60 * 60_000;

// Uploading: ten megabytes each. At the old rate one address could write 100 MB a minute,
// which fills a 40 GB VPS in about seven hours - and the disk it fills is the one holding
// every other restaurant's photographs. Six is the per-draft maximum, so twenty an hour
// covers a full set plus mistakes plus a second restaurant.
export const PHOTO_LIMIT = 20;
export const PHOTO_WINDOW_MS = 60 * 60_000;

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

