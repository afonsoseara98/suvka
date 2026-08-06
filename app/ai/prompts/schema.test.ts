import { describe, it, expect } from "vitest";
import { SCHEMA_PROMPT } from "./schema";

// Regression test for the bug found in the Signal Trace Audit v1 (docs/noctra-signal-trace-audit-v1.md,
// finding #1): the example JSON schema shown to the LLM used "number" for the top-level
// `stats` array's value field, while `hero.stats` (three lines above, in the same
// example) correctly used "value" - and app/types/landing.ts's StatsItem (what
// Stats.tsx actually reads) is `{ value: string; label: string }`. A model following
// the schema literally produced `{"number": "..."}`, which Stats.tsx read as
// `item.value` -> undefined -> a blank stats section on every generation that included
// one. This test parses the embedded JSON example directly, so a future edit that
// reintroduces the mismatch fails here instead of only being visible in production.
function extractSchemaExample(prompt: string): Record<string, unknown> {
  const start = prompt.indexOf("{");
  const rulesIndex = prompt.indexOf("Rules:");
  const jsonBlock = prompt.slice(start, rulesIndex).trim();
  return JSON.parse(jsonBlock);
}

describe("SCHEMA_PROMPT - embedded JSON example", () => {
  it("is valid, parseable JSON", () => {
    expect(() => extractSchemaExample(SCHEMA_PROMPT)).not.toThrow();
  });

  it("uses 'value' (not 'number') for the top-level stats array, matching StatsItem", () => {
    const example = extractSchemaExample(SCHEMA_PROMPT);
    const stats = example.stats as Array<Record<string, unknown>>;
    expect(stats[0]).toHaveProperty("value");
    expect(stats[0]).not.toHaveProperty("number");
  });

  it("uses the same field name ('value') for hero.stats and the top-level stats array", () => {
    const example = extractSchemaExample(SCHEMA_PROMPT);
    const hero = example.hero as { stats: Array<Record<string, unknown>> };
    const stats = example.stats as Array<Record<string, unknown>>;
    expect(Object.keys(hero.stats[0]).sort()).toEqual(Object.keys(stats[0]).sort());
  });

  // Regression test for a bug found live, not in a test: every real /api/generate call
  // failed to save (POST /api/projects threw "Cannot read properties of undefined
  // (reading 'branding')") because SCHEMA_PROMPT never asked the LLM for a `site` object
  // at all - app/lib/projectService.ts's createProjectFromGeneration unconditionally
  // reads `landing.site.branding`. Deterministic, not occasional: every real generation
  // hit this. This test asserts `site` (matching app/types/landing.ts's SiteData shape
  // exactly - seo/branding/images) is present in the schema shown to the LLM, so a
  // future edit that drops it again fails here instead of only in production.
  it("includes a top-level 'site' object matching SiteData's shape (seo/branding/images)", () => {
    const example = extractSchemaExample(SCHEMA_PROMPT);
    const site = example.site as { seo?: unknown; branding?: unknown; images?: unknown };
    expect(site).toBeTruthy();

    const seo = site.seo as Record<string, unknown>;
    expect(Object.keys(seo).sort()).toEqual(["description", "keywords", "ogDescription", "ogTitle", "title"].sort());

    const branding = site.branding as Record<string, unknown>;
    expect(Object.keys(branding).sort()).toEqual(
      ["accentColor", "fontBody", "fontHeading", "logoPrompt", "primaryColor", "secondaryColor"].sort()
    );

    const images = site.images as Record<string, unknown>;
    expect(Object.keys(images).sort()).toEqual(["heroPrompt", "ogImagePrompt"].sort());
  });
});
