import { describe, it, expect } from "vitest";
import {
  createHistory,
  dispatch,
  dispatchBatch,
  undo,
  redo,
  canUndo,
  canRedo,
  currentState,
  goToVersion,
} from "./history";
import { fromLandingPage } from "./pageState";
import { OperationError, type Operation } from "./operations";
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

function statsId(state: PageState): string {
  return state.sections.find((s) => s.type === "stats")!.id;
}

describe("createHistory / currentState", () => {
  it("starts with cursor 0 and no records", () => {
    const page = basePage();
    const history = createHistory(page);
    expect(history.cursor).toBe(0);
    expect(history.records).toEqual([]);
    expect(currentState(history)).toBe(page);
    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(false);
  });
});

describe("dispatch", () => {
  it("applies the operation and advances the cursor", () => {
    const page = basePage();
    const history = createHistory(page);
    const id = statsId(page);
    const next = dispatch(history, { kind: "ChangeVariant", sectionId: id, variant: "inline" }, "user", "Changed stats variant", NOW);

    expect(next.cursor).toBe(1);
    expect(currentState(next).sections.find((s) => s.id === id)?.variant).toBe("inline");
    expect(next.records).toHaveLength(1);
    expect(next.records[0]).toMatchObject({ actor: "user", label: "Changed stats variant", timestamp: NOW });
    expect(next.records[0].operations).toHaveLength(1);
  });

  it("does not mutate the input history", () => {
    const history = createHistory(basePage());
    const id = statsId(currentState(history));
    dispatch(history, { kind: "ChangeVariant", sectionId: id, variant: "inline" }, "user");
    expect(history.cursor).toBe(0);
    expect(history.records).toEqual([]);
  });

  it("propagates OperationError from applyOperation without recording anything", () => {
    const history = createHistory(basePage());
    expect(() => dispatch(history, { kind: "DeleteSection", sectionId: "does-not-exist" }, "user")).toThrow(OperationError);
  });
});

describe("dispatchBatch", () => {
  it("applies every operation but records/advances cursor exactly once", () => {
    const page = basePage();
    const history = createHistory(page);
    const id = statsId(page);
    const ops: Operation[] = [
      { kind: "ChangeVariant", sectionId: id, variant: "inline" },
      { kind: "HideSection", sectionId: id },
    ];
    const next = dispatchBatch(history, ops, "ai", "AI batch edit", NOW);

    expect(next.cursor).toBe(1);
    expect(next.records).toHaveLength(1);
    expect(next.records[0].operations).toEqual(ops);
    const instance = currentState(next).sections.find((s) => s.id === id)!;
    expect(instance.variant).toBe("inline");
    expect(instance.visibility).toBe("hidden");
  });

  it("undoing a batch reverts every operation in it as one step", () => {
    const page = basePage();
    const history = createHistory(page);
    const id = statsId(page);
    const withBatch = dispatchBatch(
      history,
      [
        { kind: "ChangeVariant", sectionId: id, variant: "inline" },
        { kind: "HideSection", sectionId: id },
      ],
      "ai"
    );
    const undone = undo(withBatch);
    expect(currentState(undone)).toEqual(page);
  });

  it("records nothing if any operation in the batch throws", () => {
    const history = createHistory(basePage());
    const ops: Operation[] = [
      { kind: "ChangeVariant", sectionId: statsId(currentState(history)), variant: "inline" },
      { kind: "DeleteSection", sectionId: "does-not-exist" },
    ];
    expect(() => dispatchBatch(history, ops, "user")).toThrow(OperationError);
  });

  it("dispatch is dispatchBatch with a single-element array", () => {
    const page = basePage();
    const id = statsId(page);
    const viaDispatch = dispatch(createHistory(page), { kind: "ChangeVariant", sectionId: id, variant: "inline" }, "user", undefined, NOW);
    const viaBatch = dispatchBatch(createHistory(page), [{ kind: "ChangeVariant", sectionId: id, variant: "inline" }], "user", undefined, NOW);
    expect(viaDispatch).toEqual(viaBatch);
  });
});

describe("undo / redo", () => {
  it("undo moves the cursor back and restores the prior state", () => {
    const page = basePage();
    const id = statsId(page);
    const history = dispatch(createHistory(page), { kind: "ChangeVariant", sectionId: id, variant: "inline" }, "user");
    const undone = undo(history);
    expect(currentState(undone)).toEqual(page);
    expect(canRedo(undone)).toBe(true);
  });

  it("redo moves the cursor forward again", () => {
    const page = basePage();
    const id = statsId(page);
    const history = dispatch(createHistory(page), { kind: "ChangeVariant", sectionId: id, variant: "inline" }, "user");
    const redone = redo(undo(history));
    expect(currentState(redone)).toEqual(currentState(history));
  });

  it("undo past the beginning is a no-op", () => {
    const history = createHistory(basePage());
    expect(undo(history)).toEqual(history);
  });

  it("redo past the end is a no-op", () => {
    const history = createHistory(basePage());
    expect(redo(history)).toEqual(history);
  });

  it("dispatching after an undo truncates the redo tail", () => {
    const page = basePage();
    const id = statsId(page);
    let history = createHistory(page);
    history = dispatch(history, { kind: "ChangeVariant", sectionId: id, variant: "inline" }, "user", "A");
    history = dispatch(history, { kind: "HideSection", sectionId: id }, "user", "B");
    history = undo(history); // back to just "A"
    expect(canRedo(history)).toBe(true);

    history = dispatch(history, { kind: "ShowSection", sectionId: id }, "user", "C");
    expect(canRedo(history)).toBe(false);
    expect(history.records.map((r) => r.label)).toEqual(["A", "C"]);
  });

  it("canUndo/canRedo reflect cursor position through a full undo/redo cycle", () => {
    const page = basePage();
    const id = statsId(page);
    let history = createHistory(page);
    expect(canUndo(history)).toBe(false);

    history = dispatch(history, { kind: "ChangeVariant", sectionId: id, variant: "inline" }, "user");
    expect(canUndo(history)).toBe(true);
    expect(canRedo(history)).toBe(false);

    history = undo(history);
    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(true);
  });
});

describe("goToVersion", () => {
  it("jumps directly to an arbitrary past state", () => {
    const page = basePage();
    const id = statsId(page);
    let history = createHistory(page);
    history = dispatch(history, { kind: "ChangeVariant", sectionId: id, variant: "inline" }, "user");
    history = dispatch(history, { kind: "HideSection", sectionId: id }, "user");
    history = dispatch(history, { kind: "ChangeVariant", sectionId: id, variant: "cards" }, "user");

    const jumped = goToVersion(history, 1);
    expect(currentState(jumped).sections.find((s) => s.id === id)?.variant).toBe("inline");
    expect(currentState(jumped).sections.find((s) => s.id === id)?.visibility).toBe("visible");
  });

  it("throws for an out-of-range index", () => {
    const history = createHistory(basePage());
    expect(() => goToVersion(history, 5)).toThrow(RangeError);
    expect(() => goToVersion(history, -1)).toThrow(RangeError);
  });
});

describe("determinism", () => {
  it("the same sequence of operations produces byte-identical history state", () => {
    const page = basePage();
    const id = statsId(page);
    const run = () => {
      let history = createHistory(page);
      history = dispatch(history, { kind: "ChangeVariant", sectionId: id, variant: "inline" }, "user", "A", NOW);
      history = dispatch(history, { kind: "HideSection", sectionId: id }, "ai", "B", NOW + 1);
      return history;
    };
    expect(run()).toEqual(run());
  });
});
