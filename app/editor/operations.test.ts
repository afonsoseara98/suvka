import { describe, it, expect } from "vitest";
import { applyOperation, OperationError, type Operation } from "./operations";
import { fromLandingPage } from "./pageState";
import { neutralStrategyDna } from "@/app/ai/testFixtures";
import type { LandingPage } from "@/app/types/landing";
import type { PageState } from "./pageState";

const NOW = 1_000_000;

function basePage(): PageState {
  const landing: LandingPage = {
    dna: neutralStrategyDna(),
    site: {
      seo: { title: "T", description: "D", keywords: [], ogTitle: "", ogDescription: "" },
      branding: { primaryColor: "", secondaryColor: "", accentColor: "", fontHeading: "", fontBody: "", logoPrompt: "" },
      images: { heroPrompt: "", ogImagePrompt: "" },
    },
    sections: [
      { type: "hero", variant: "centered", prominence: "primary", rhythm: "standard" },
      { type: "stats", variant: "cards", prominence: "standard", rhythm: "standard" },
      { type: "footer", variant: "simple", prominence: "compact", rhythm: "standard" },
    ],
    hero: {
      badge: "B",
      title: "T",
      highlightWord: "T",
      subtitle: "S",
      primaryCTA: "Go",
      secondaryCTA: "Learn",
      imageStyle: "abstract",
      imagePrompt: "",
      stats: [],
    },
    stats: [{ value: "10", label: "Years" }],
    features: [],
    benefits: [],
    testimonials: [],
    pricing: [],
    faq: [],
    footer: { company: "Acme", email: "a@acme.com", copyright: "(c)" },
  };
  return fromLandingPage(landing, NOW);
}

function idOf(state: PageState, type: string): string {
  const found = state.sections.find((s) => s.type === type);
  if (!found) throw new Error(`no section of type ${type} in fixture`);
  return found.id;
}

describe("applyOperation - InsertSection", () => {
  it("inserts a new section at the requested index", () => {
    const state = basePage();
    const op: Operation = {
      kind: "InsertSection",
      sectionId: "testimonials-new",
      sectionType: "testimonials",
      index: 1,
      variant: "cards",
      layout: { prominence: "standard", rhythm: "standard" },
      content: [{ name: "Jane", company: "Acme", text: "Great" }],
      createdBy: "user",
    };
    const next = applyOperation(state, op, NOW);
    expect(next.sections.map((s) => s.type)).toEqual(["hero", "testimonials", "stats", "footer"]);
    expect(next.sections[1]).toMatchObject({
      id: "testimonials-new",
      visibility: "visible",
      locked: false,
      version: 0,
      metadata: { createdBy: "user", createdAt: NOW, updatedAt: NOW },
    });
  });

  it("clamps an out-of-range index instead of throwing", () => {
    const state = basePage();
    const next = applyOperation(state, {
      kind: "InsertSection",
      sectionId: "extra",
      sectionType: "faq",
      index: 999,
      variant: "accordion",
      layout: { prominence: "standard", rhythm: "standard" },
      content: [],
      createdBy: "ai",
    });
    expect(next.sections.at(-1)?.id).toBe("extra");
  });

  it("rejects a duplicate sectionId", () => {
    const state = basePage();
    const heroId = idOf(state, "hero");
    expect(() =>
      applyOperation(state, {
        kind: "InsertSection",
        sectionId: heroId,
        sectionType: "stats",
        index: 0,
        variant: "cards",
        layout: { prominence: "standard", rhythm: "standard" },
        content: [],
        createdBy: "user",
      })
    ).toThrow(OperationError);
  });
});

describe("applyOperation - DuplicateSection", () => {
  it("deep-copies content/variant/layout/themeOverrides with a new id, right after the source by default", () => {
    const state = basePage();
    const statsId = idOf(state, "stats");
    const next = applyOperation(state, { kind: "DuplicateSection", sectionId: statsId, newSectionId: "stats-copy" }, NOW);
    const sourceIndex = next.sections.findIndex((s) => s.id === statsId);
    const copy = next.sections[sourceIndex + 1];
    expect(copy.id).toBe("stats-copy");
    expect(copy.content).toEqual(next.sections[sourceIndex].content);
    expect(copy.variant).toBe(next.sections[sourceIndex].variant);
  });

  it("inserts at an explicit index when given one", () => {
    const state = basePage();
    const statsId = idOf(state, "stats");
    const next = applyOperation(state, { kind: "DuplicateSection", sectionId: statsId, newSectionId: "stats-copy", index: 0 });
    expect(next.sections[0].id).toBe("stats-copy");
  });

  it("resets version to 0 and unlocks the duplicate even if the source was locked", () => {
    const state = basePage();
    const statsId = idOf(state, "stats");
    const locked = applyOperation(state, { kind: "LockSection", sectionId: statsId }, NOW);
    const next = applyOperation(locked, { kind: "DuplicateSection", sectionId: statsId, newSectionId: "stats-copy" }, NOW);
    const copy = next.sections.find((s) => s.id === "stats-copy")!;
    expect(copy.locked).toBe(false);
    expect(copy.version).toBe(0);
  });

  it("inherits the source's createdBy", () => {
    const state = basePage();
    const statsId = idOf(state, "stats");
    const next = applyOperation(state, { kind: "DuplicateSection", sectionId: statsId, newSectionId: "stats-copy" }, NOW);
    const source = state.sections.find((s) => s.id === statsId)!;
    const copy = next.sections.find((s) => s.id === "stats-copy")!;
    expect(copy.metadata.createdBy).toBe(source.metadata.createdBy);
  });

  it("rejects duplicating an unknown sectionId", () => {
    const state = basePage();
    expect(() => applyOperation(state, { kind: "DuplicateSection", sectionId: "nope", newSectionId: "x" })).toThrow(OperationError);
  });
});

describe("applyOperation - DeleteSection", () => {
  it("removes the section", () => {
    const state = basePage();
    const statsId = idOf(state, "stats");
    const next = applyOperation(state, { kind: "DeleteSection", sectionId: statsId });
    expect(next.sections.find((s) => s.id === statsId)).toBeUndefined();
  });

  it("rejects deleting the last hero", () => {
    const state = basePage();
    const heroId = idOf(state, "hero");
    expect(() => applyOperation(state, { kind: "DeleteSection", sectionId: heroId })).toThrow(OperationError);
  });

  it("rejects deleting the last footer", () => {
    const state = basePage();
    const footerId = idOf(state, "footer");
    expect(() => applyOperation(state, { kind: "DeleteSection", sectionId: footerId })).toThrow(OperationError);
  });

  it("allows deleting a hero when a second hero exists", () => {
    const state = basePage();
    const heroId = idOf(state, "hero");
    const withSecondHero = applyOperation(state, {
      kind: "InsertSection",
      sectionId: "hero-2",
      sectionType: "hero",
      index: 1,
      variant: "minimal",
      layout: { prominence: "standard", rhythm: "standard" },
      content: null,
      createdBy: "user",
    });
    const next = applyOperation(withSecondHero, { kind: "DeleteSection", sectionId: heroId });
    expect(next.sections.find((s) => s.id === heroId)).toBeUndefined();
    expect(next.sections.some((s) => s.type === "hero")).toBe(true);
  });

  it("rejects deleting a locked section", () => {
    const state = basePage();
    const statsId = idOf(state, "stats");
    const locked = applyOperation(state, { kind: "LockSection", sectionId: statsId });
    expect(() => applyOperation(locked, { kind: "DeleteSection", sectionId: statsId })).toThrow(OperationError);
  });

  it("rejects an unknown sectionId", () => {
    const state = basePage();
    expect(() => applyOperation(state, { kind: "DeleteSection", sectionId: "nope" })).toThrow(OperationError);
  });
});

describe("applyOperation - MoveSection", () => {
  it("moves a section to the requested index", () => {
    const state = basePage();
    const footerId = idOf(state, "footer");
    const next = applyOperation(state, { kind: "MoveSection", sectionId: footerId, toIndex: 0 });
    expect(next.sections[0].id).toBe(footerId);
  });

  it("clamps an out-of-range toIndex", () => {
    const state = basePage();
    const heroId = idOf(state, "hero");
    const next = applyOperation(state, { kind: "MoveSection", sectionId: heroId, toIndex: 999 });
    expect(next.sections.at(-1)?.id).toBe(heroId);
  });

  it("is allowed even on a locked section", () => {
    const state = basePage();
    const statsId = idOf(state, "stats");
    const locked = applyOperation(state, { kind: "LockSection", sectionId: statsId });
    expect(() => applyOperation(locked, { kind: "MoveSection", sectionId: statsId, toIndex: 0 })).not.toThrow();
  });
});

describe("applyOperation - ChangeVariant / UpdateContent / RegenerateSection", () => {
  it("ChangeVariant updates variant and bumps version/updatedAt", () => {
    const state = basePage();
    const statsId = idOf(state, "stats");
    const next = applyOperation(state, { kind: "ChangeVariant", sectionId: statsId, variant: "inline" }, NOW + 5);
    const instance = next.sections.find((s) => s.id === statsId)!;
    expect(instance.variant).toBe("inline");
    expect(instance.version).toBe(1);
    expect(instance.metadata.updatedAt).toBe(NOW + 5);
  });

  it("UpdateContent replaces content", () => {
    const state = basePage();
    const statsId = idOf(state, "stats");
    const next = applyOperation(state, {
      kind: "UpdateContent",
      sectionId: statsId,
      content: [{ value: "42", label: "New" }],
    });
    expect(next.sections.find((s) => s.id === statsId)?.content).toEqual([{ value: "42", label: "New" }]);
  });

  it("RegenerateSection replaces content and optionally variant, distinctly from UpdateContent", () => {
    const state = basePage();
    const statsId = idOf(state, "stats");
    const next = applyOperation(state, {
      kind: "RegenerateSection",
      sectionId: statsId,
      content: [{ value: "1", label: "AI" }],
      variant: "inline",
    });
    const instance = next.sections.find((s) => s.id === statsId)!;
    expect(instance.content).toEqual([{ value: "1", label: "AI" }]);
    expect(instance.variant).toBe("inline");
  });

  it("RegenerateSection without a variant keeps the existing variant", () => {
    const state = basePage();
    const statsId = idOf(state, "stats");
    const before = state.sections.find((s) => s.id === statsId)!.variant;
    const next = applyOperation(state, { kind: "RegenerateSection", sectionId: statsId, content: [] });
    expect(next.sections.find((s) => s.id === statsId)?.variant).toBe(before);
  });

  it("ChangeVariant, UpdateContent and RegenerateSection are all rejected on a locked section", () => {
    const state = basePage();
    const statsId = idOf(state, "stats");
    const locked = applyOperation(state, { kind: "LockSection", sectionId: statsId });
    const ops: Operation[] = [
      { kind: "ChangeVariant", sectionId: statsId, variant: "inline" },
      { kind: "UpdateContent", sectionId: statsId, content: [] },
      { kind: "RegenerateSection", sectionId: statsId, content: [] },
    ];
    for (const op of ops) {
      expect(() => applyOperation(locked, op)).toThrow(OperationError);
    }
  });
});

describe("applyOperation - ChangeTheme / ChangeSectionTheme", () => {
  it("ChangeTheme merges and clamps into page-level dna", () => {
    const state = basePage();
    const next = applyOperation(state, { kind: "ChangeTheme", dna: { saturation: 1.5, roundedness: 0.2 } });
    expect(next.dna.saturation).toBe(1);
    expect(next.dna.roundedness).toBe(0.2);
  });

  it("ChangeSectionTheme accumulates overrides on a single section, clamped, without touching page dna", () => {
    const state = basePage();
    const statsId = idOf(state, "stats");
    const first = applyOperation(state, { kind: "ChangeSectionTheme", sectionId: statsId, themeOverrides: { saturation: 0.9 } });
    const second = applyOperation(first, { kind: "ChangeSectionTheme", sectionId: statsId, themeOverrides: { roundedness: -1 } });
    const instance = second.sections.find((s) => s.id === statsId)!;
    expect(instance.themeOverrides).toEqual({ saturation: 0.9, roundedness: 0 });
    expect(second.dna).toEqual(state.dna);
  });

  it("ChangeSectionTheme is rejected on a locked section", () => {
    const state = basePage();
    const statsId = idOf(state, "stats");
    const locked = applyOperation(state, { kind: "LockSection", sectionId: statsId });
    expect(() =>
      applyOperation(locked, { kind: "ChangeSectionTheme", sectionId: statsId, themeOverrides: { saturation: 0.9 } })
    ).toThrow(OperationError);
  });
});

describe("applyOperation - HideSection / ShowSection", () => {
  it("hides and re-shows a section", () => {
    const state = basePage();
    const statsId = idOf(state, "stats");
    const hidden = applyOperation(state, { kind: "HideSection", sectionId: statsId });
    expect(hidden.sections.find((s) => s.id === statsId)?.visibility).toBe("hidden");
    const shown = applyOperation(hidden, { kind: "ShowSection", sectionId: statsId });
    expect(shown.sections.find((s) => s.id === statsId)?.visibility).toBe("visible");
  });

  it("rejects hiding the last hero/footer", () => {
    const state = basePage();
    expect(() => applyOperation(state, { kind: "HideSection", sectionId: idOf(state, "hero") })).toThrow(OperationError);
    expect(() => applyOperation(state, { kind: "HideSection", sectionId: idOf(state, "footer") })).toThrow(OperationError);
  });

  it("rejects hiding a locked section", () => {
    const state = basePage();
    const statsId = idOf(state, "stats");
    const locked = applyOperation(state, { kind: "LockSection", sectionId: statsId });
    expect(() => applyOperation(locked, { kind: "HideSection", sectionId: statsId })).toThrow(OperationError);
  });

  it("ShowSection is allowed even on a locked section", () => {
    const state = basePage();
    const statsId = idOf(state, "stats");
    const locked = applyOperation(state, { kind: "LockSection", sectionId: statsId });
    expect(() => applyOperation(locked, { kind: "ShowSection", sectionId: statsId })).not.toThrow();
  });
});

describe("applyOperation - LockSection / UnlockSection", () => {
  it("locks and unlocks a section", () => {
    const state = basePage();
    const statsId = idOf(state, "stats");
    const locked = applyOperation(state, { kind: "LockSection", sectionId: statsId });
    expect(locked.sections.find((s) => s.id === statsId)?.locked).toBe(true);
    const unlocked = applyOperation(locked, { kind: "UnlockSection", sectionId: statsId });
    expect(unlocked.sections.find((s) => s.id === statsId)?.locked).toBe(false);
  });

  it("unlocking is always allowed on a locked section (never itself locked out)", () => {
    const state = basePage();
    const statsId = idOf(state, "stats");
    const locked = applyOperation(state, { kind: "LockSection", sectionId: statsId });
    expect(() => applyOperation(locked, { kind: "UnlockSection", sectionId: statsId })).not.toThrow();
  });
});

describe("applyOperation - purity", () => {
  it("never mutates the input state", () => {
    const state = basePage();
    const snapshot = JSON.parse(JSON.stringify(state));
    applyOperation(state, { kind: "ChangeVariant", sectionId: idOf(state, "stats"), variant: "inline" });
    expect(JSON.parse(JSON.stringify(state))).toEqual(snapshot);
  });

  it("unknown sectionId throws OperationError carrying the offending operation, for every targeted kind", () => {
    const state = basePage();
    const targeted: Operation[] = [
      { kind: "DeleteSection", sectionId: "nope" },
      { kind: "MoveSection", sectionId: "nope", toIndex: 0 },
      { kind: "ChangeVariant", sectionId: "nope", variant: "x" },
      { kind: "UpdateContent", sectionId: "nope", content: [] },
      { kind: "RegenerateSection", sectionId: "nope", content: [] },
      { kind: "ChangeSectionTheme", sectionId: "nope", themeOverrides: {} },
      { kind: "HideSection", sectionId: "nope" },
      { kind: "ShowSection", sectionId: "nope" },
      { kind: "LockSection", sectionId: "nope" },
      { kind: "UnlockSection", sectionId: "nope" },
    ];
    for (const op of targeted) {
      try {
        applyOperation(state, op);
        expect.unreachable(`expected ${op.kind} to throw`);
      } catch (error) {
        expect(error).toBeInstanceOf(OperationError);
        expect((error as InstanceType<typeof OperationError>).operation).toBe(op);
      }
    }
  });
});
