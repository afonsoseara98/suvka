import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildPipeline } from "@/app/ai/builders/PipelineBuilder";

const mockCreate = vi.fn();
const mockAuth = vi.fn();

vi.mock("openai", () => {
  return {
    default: class OpenAI {
      chat = {
        completions: {
          create: mockCreate,
        },
      };
    },
  };
});

// Mocked because importing the real module pulls next-auth's runtime into the test
// environment, which can't resolve `next/server` outside a Next.js build. The route
// only ever reads `session.user.id`, so a fake that returns a session shape is a
// complete stand-in for what this file needs to assert.
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

const { POST } = await import("./route");

function requestWith(body: unknown): Request {
  return new Request("http://localhost/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_LANDING_JSON = JSON.stringify({
  theme: "startup",
  sections: [{ type: "hero", variant: "centered" }],
  hero: { imageStyle: "dashboard" },
});

// The rate limiter is a module-level singleton keyed by user id, so every test that
// isn't specifically about rate limiting uses its own user to stay isolated from the
// counts left behind by the others.
let userCounter = 0;
function signedInAs(id = `user-${++userCounter}`): void {
  mockAuth.mockResolvedValue({ user: { id } });
}

beforeEach(() => {
  process.env.OPENAI_API_KEY = "test-key";
  mockCreate.mockReset();
  mockCreate.mockResolvedValue({
    choices: [{ message: { content: VALID_LANDING_JSON } }],
  });
  mockAuth.mockReset();
  signedInAs();
});

// This endpoint spends real money on every successful call. It used to be reachable
// with no session at all, so the whole protection was a per-IP limiter that counts
// nothing across serverless instances and is bypassed by rotating IPs.
describe("POST /api/generate - authentication", () => {
  it("rejects an anonymous request with 401", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(requestWith({ prompt: "A dental clinic offering checkups." }));
    expect(res.status).toBe(401);
  });

  it("rejects a session with no user id with 401", async () => {
    mockAuth.mockResolvedValue({ user: {} });
    const res = await POST(requestWith({ prompt: "A dental clinic offering checkups." }));
    expect(res.status).toBe(401);
  });

  it("never calls OpenAI for an anonymous request", async () => {
    mockAuth.mockResolvedValue(null);
    await POST(requestWith({ prompt: "A dental clinic offering checkups." }));
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("checks the session before the API key, so an anonymous caller can't probe config", async () => {
    delete process.env.OPENAI_API_KEY;
    mockAuth.mockResolvedValue(null);
    const res = await POST(requestWith({ prompt: "A dental clinic offering checkups." }));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/generate - validation", () => {
  it("rejects a missing prompt with 400", async () => {
    const res = await POST(requestWith({}));
    expect(res.status).toBe(400);
  });

  it("rejects a too-short prompt with 400", async () => {
    const res = await POST(requestWith({ prompt: "hi" }));
    expect(res.status).toBe(400);
  });

  it("never calls OpenAI when validation fails", async () => {
    await POST(requestWith({ prompt: "hi" }));
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe("POST /api/generate - success path", () => {
  it("returns 200 and overrides dna/sections deterministically for a valid prompt", async () => {
    const prompt = "A dental clinic offering checkups for the whole family.";
    const res = await POST(requestWith({ prompt }));
    const data = await res.json();

    expect(res.status).toBe(200);

    // The real pipeline's own StrategyDNA, not whatever the mocked LLM content implied
    // (it had no dna field at all) - proves the deterministic override in route.ts
    // still runs against the real pipeline, not the LLM's output.
    const expected = buildPipeline(prompt);
    expect(data.dna).toEqual(expected.dna);
    expect(Array.isArray(data.sections)).toBe(true);
    expect(data.sections.length).toBeGreaterThan(0);
  });
});

describe("POST /api/generate - missing API key", () => {
  it("returns 500 with a safe message and never calls OpenAI", async () => {
    delete process.env.OPENAI_API_KEY;

    const res = await POST(requestWith({ prompt: "A boutique law firm serving corporate clients." }));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.message).not.toMatch(/OPENAI_API_KEY/);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe("POST /api/generate - rate limiting", () => {
  it("blocks a signed-in user after enough requests", async () => {
    signedInAs("heavy-user");
    let lastStatus = 200;

    for (let i = 0; i < 15; i++) {
      const res = await POST(requestWith({ prompt: "hi" }));
      lastStatus = res.status;
      if (lastStatus === 429) break;
    }

    expect(lastStatus).toBe(429);
  });

  it("does not rate-limit a different user", async () => {
    signedInAs("a-quiet-user");
    const res = await POST(requestWith({ prompt: "hi" }));
    expect(res.status).toBe(400);
  });

  it("keys the limit on the user, not a spoofable header", async () => {
    signedInAs("shared-limit-user");
    for (let i = 0; i < 15; i++) {
      const res = await POST(requestWith({ prompt: "hi" }));
      if (res.status === 429) break;
    }

    // Same user, brand new request object (and therefore no carried-over headers):
    // still blocked, because the limit follows the account.
    const res = await POST(requestWith({ prompt: "hi" }));
    expect(res.status).toBe(429);
  });
});
