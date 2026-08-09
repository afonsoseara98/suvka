import { describe, it, expect, vi } from "vitest";
import { isEventName, EVENT_NAMES } from "./events";

// /api/events is public and writable - it has to be, because the clicks that matter happen
// on a restaurant's site where the visitor has no account. The whitelist is most of what
// stops that endpoint becoming a free text column.
describe("the event whitelist", () => {
  it("accepts every name the product actually sends", () => {
    for (const name of EVENT_NAMES) expect(isEventName(name), name).toBe(true);
  });

  it.each([
    ["a typo", "phone_click"],
    ["something invented", "hacked_the_gibson"],
    ["an empty string", ""],
    ["a number", 42],
    ["an object", { name: "phone_clicked" }],
    ["null", null],
  ])("refuses %s", (_why, value) => {
    expect(isEventName(value)).toBe(false);
  });

  it("covers both halves of what needs measuring", () => {
    // The funnel, and what a restaurant's own site does for it. Losing either half loses
    // the reason this exists.
    for (const funnel of ["preview_created", "publish_clicked", "signup_completed", "publish_completed"]) {
      expect(EVENT_NAMES, funnel).toContain(funnel);
    }
    for (const action of ["phone_clicked", "whatsapp_clicked", "maps_clicked", "reservation_clicked"]) {
      expect(EVENT_NAMES, action).toContain(action);
    }
  });
});

// A counter must never be able to break the thing it counts. This is not hypothetical: the
// first version took down the creation of a restaurant's site, because `.catch()` only
// covers a promise that was created and a stale generated client throws synchronously.
describe("track never throws", () => {
  it("survives a Prisma client that has no Event model", async () => {
    vi.resetModules();
    vi.doMock("@/app/lib/prisma", () => ({ prisma: {} }));

    const { track } = await import("./events");
    expect(() => track("preview_created", { draftId: "d1" })).not.toThrow();

    vi.doUnmock("@/app/lib/prisma");
    vi.resetModules();
  });

  it("survives a write that rejects", async () => {
    vi.resetModules();
    vi.doMock("@/app/lib/prisma", () => ({
      prisma: { event: { create: () => Promise.reject(new Error("database is on fire")) } },
    }));

    const { track } = await import("./events");
    expect(() => track("phone_clicked", { projectId: "p1" })).not.toThrow();
    // Let the rejection settle so it is handled here rather than surfacing as an unhandled
    // rejection in whichever test happens to run next.
    await new Promise((resolve) => setTimeout(resolve, 0));

    vi.doUnmock("@/app/lib/prisma");
    vi.resetModules();
  });
});
