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

let cached: RateLimiter | null = null;

// Backend is chosen once, by environment: Upstash when credentials are present
// (production/serverless), in-memory otherwise (local dev, tests, CI). Swapping the
// backend never touches route.ts - it only depends on the RateLimiter interface.
export function getGenerateRateLimiter(): RateLimiter {
  if (cached) {
    return cached;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    const ratelimit = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(GENERATE_LIMIT, `${GENERATE_WINDOW_MS} ms`),
      prefix: "noctra:generate",
    });

    cached = new UpstashRateLimiter(ratelimit);
    return cached;
  }

  console.warn(
    "[rateLimit] UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN not set - falling back to " +
      "an in-memory rate limiter. This does not protect a multi-instance/serverless " +
      "deployment; configure Upstash before going to production."
  );

  cached = new InMemoryRateLimiter(GENERATE_LIMIT, GENERATE_WINDOW_MS);
  return cached;
}
