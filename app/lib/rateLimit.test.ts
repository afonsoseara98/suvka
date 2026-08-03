import { describe, it, expect, vi } from "vitest";
import { InMemoryRateLimiter, UpstashRateLimiter } from "./rateLimit";

describe("InMemoryRateLimiter", () => {
  it("allows requests up to the limit within the window", async () => {
    const limiter = new InMemoryRateLimiter(3, 60_000);

    expect((await limiter.check("a")).allowed).toBe(true);
    expect((await limiter.check("a")).allowed).toBe(true);
    expect((await limiter.check("a")).allowed).toBe(true);
  });

  it("blocks requests once the limit is exceeded", async () => {
    const limiter = new InMemoryRateLimiter(2, 60_000);

    await limiter.check("a");
    await limiter.check("a");

    const result = await limiter.check("a");
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks each key independently", async () => {
    const limiter = new InMemoryRateLimiter(1, 60_000);

    await limiter.check("a");
    const resultA = await limiter.check("a");
    const resultB = await limiter.check("b");

    expect(resultA.allowed).toBe(false);
    expect(resultB.allowed).toBe(true);
  });

  it("resets the count once the window has elapsed", async () => {
    const limiter = new InMemoryRateLimiter(1, 10);

    await limiter.check("a");
    expect((await limiter.check("a")).allowed).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect((await limiter.check("a")).allowed).toBe(true);
  });
});

describe("UpstashRateLimiter", () => {
  it("translates a successful upstream result to allowed", async () => {
    const fake = { limit: vi.fn().mockResolvedValue({ success: true, reset: Date.now() + 1000 }) };
    const limiter = new UpstashRateLimiter(fake);

    const result = await limiter.check("a");

    expect(result.allowed).toBe(true);
    expect(fake.limit).toHaveBeenCalledWith("a");
  });

  it("translates a failed upstream result to blocked with a retry-after estimate", async () => {
    const reset = Date.now() + 5000;
    const fake = { limit: vi.fn().mockResolvedValue({ success: false, reset }) };
    const limiter = new UpstashRateLimiter(fake);

    const result = await limiter.check("a");

    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });
});
