import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildPipeline } from "@/app/ai/builders/PipelineBuilder";

const mockCreate = vi.fn();

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

const { POST } = await import("./route");

function requestWith(body: unknown, ip: string): Request {
  return new Request("http://localhost/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

const VALID_LANDING_JSON = JSON.stringify({
  theme: "startup",
  sections: [{ type: "hero", variant: "centered" }],
  hero: { imageStyle: "dashboard" },
});

beforeEach(() => {
  process.env.OPENAI_API_KEY = "test-key";
  mockCreate.mockReset();
  mockCreate.mockResolvedValue({
    choices: [{ message: { content: VALID_LANDING_JSON } }],
  });
});

describe("POST /api/generate - validation", () => {
  it("rejects a missing prompt with 400", async () => {
    const res = await POST(requestWith({}, "1.1.1.1"));
    expect(res.status).toBe(400);
  });

  it("rejects a too-short prompt with 400", async () => {
    const res = await POST(requestWith({ prompt: "hi" }, "1.1.1.2"));
    expect(res.status).toBe(400);
  });

  it("never calls OpenAI when validation fails", async () => {
    await POST(requestWith({ prompt: "hi" }, "1.1.1.3"));
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe("POST /api/generate - success path", () => {
  it("returns 200 and overrides dna/sections deterministically for a valid prompt", async () => {
    const prompt = "A dental clinic offering checkups for the whole family.";
    const res = await POST(requestWith({ prompt }, "2.2.2.1"));
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

    const res = await POST(requestWith({ prompt: "A boutique law firm serving corporate clients." }, "3.3.3.1"));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.message).not.toMatch(/OPENAI_API_KEY/);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe("POST /api/generate - rate limiting", () => {
  it("blocks a client after enough requests from the same key", async () => {
    const ip = "9.9.9.9";
    let lastStatus = 200;

    for (let i = 0; i < 15; i++) {
      const res = await POST(requestWith({ prompt: "hi" }, ip));
      lastStatus = res.status;
      if (lastStatus === 429) break;
    }

    expect(lastStatus).toBe(429);
  });

  it("does not rate-limit a different client key", async () => {
    const res = await POST(requestWith({ prompt: "hi" }, "unique-key-for-this-test"));
    expect(res.status).toBe(400);
  });
});
