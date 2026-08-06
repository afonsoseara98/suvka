import type { SectionType } from "@/app/types/landing";
import type { StrategyDNA } from "@/app/ai/types/dna";
import { clamp01 } from "@/app/ai/utils/math";
import type { PageState, SectionInstance, SectionContent, SectionLayout, CreatedBy } from "./pageState";
import { mergeDna } from "./pageState";

// OPERATIONS
//
// Every way PageState is allowed to change, expressed as data - never a direct mutation
// anywhere else in the codebase. This is the ONE reducer both the future editor UI and
// an AI co-pilot are meant to call: neither ever touches `sections`/`dna` directly, both
// only ever construct an Operation and hand it to applyOperation (or, batched and
// undo-tracked, to history.ts's dispatch/dispatchBatch). That's what makes AI-driven
// edits inherently safe - an AI can never reach a state the UI couldn't also produce,
// because there is only one path to a state change, not two.
export type Operation =
  | {
      kind: "InsertSection";
      sectionId: string;
      sectionType: SectionType;
      index: number;
      variant: string;
      layout: SectionLayout;
      content: SectionContent;
      createdBy: CreatedBy;
    }
  | { kind: "DuplicateSection"; sectionId: string; newSectionId: string; index?: number }
  | { kind: "DeleteSection"; sectionId: string }
  | { kind: "MoveSection"; sectionId: string; toIndex: number }
  | { kind: "ChangeVariant"; sectionId: string; variant: string }
  | { kind: "UpdateContent"; sectionId: string; content: SectionContent }
  | { kind: "RegenerateSection"; sectionId: string; content: SectionContent; variant?: string }
  | { kind: "ChangeTheme"; dna: Partial<StrategyDNA> }
  | { kind: "ChangeSectionTheme"; sectionId: string; themeOverrides: Partial<StrategyDNA> }
  | { kind: "HideSection"; sectionId: string }
  | { kind: "ShowSection"; sectionId: string }
  | { kind: "LockSection"; sectionId: string }
  | { kind: "UnlockSection"; sectionId: string };

export class OperationError extends Error {
  constructor(
    public readonly operation: Operation,
    message: string
  ) {
    super(message);
    this.name = "OperationError";
  }
}

// Every page must always keep at least one hero and one footer - the one structural
// rule carried over from today's pipeline (LayoutIntelligence.ts's generateLayout always
// places exactly one of each). Enforced here, not left to a UI to remember.
const ANCHOR_TYPES: readonly SectionType[] = ["hero", "footer"];

// Operation kinds a locked section rejects. Reordering (MoveSection) and duplicating
// (DuplicateSection, which never mutates the locked original) are deliberately NOT
// protected - locking freezes a section's own content/variant/theme/visibility, not its
// position on the page or someone's ability to copy it.
const LOCK_PROTECTED_KINDS = new Set<Operation["kind"]>([
  "DeleteSection",
  "UpdateContent",
  "RegenerateSection",
  "ChangeVariant",
  "ChangeSectionTheme",
  "HideSection",
]);

function findIndex(state: PageState, sectionId: string, operation: Operation): number {
  const index = state.sections.findIndex((s) => s.id === sectionId);
  if (index === -1) {
    throw new OperationError(operation, `No section with id "${sectionId}"`);
  }
  return index;
}

function touch(instance: SectionInstance, now: number): SectionInstance {
  return { ...instance, version: instance.version + 1, metadata: { ...instance.metadata, updatedAt: now } };
}

function replaceAt(sections: readonly SectionInstance[], index: number, next: SectionInstance): SectionInstance[] {
  const copy = [...sections];
  copy[index] = next;
  return copy;
}

function assertNotLocked(instance: SectionInstance, operation: Operation): void {
  if (instance.locked && LOCK_PROTECTED_KINDS.has(operation.kind)) {
    throw new OperationError(operation, `Section "${instance.id}" is locked`);
  }
}

function assertNotLastAnchor(state: PageState, instance: SectionInstance, operation: Operation): void {
  if (!ANCHOR_TYPES.includes(instance.type)) return;
  const remaining = state.sections.filter((s) => s.type === instance.type && s.id !== instance.id).length;
  if (remaining === 0) {
    throw new OperationError(operation, `Cannot remove or hide the last "${instance.type}" section`);
  }
}

function clampIndex(index: number, length: number): number {
  return Math.max(0, Math.min(index, length));
}

// Clamps every numeric field of a PARTIAL DNA override to [0, 1] - the ChangeSectionTheme
// counterpart to mergeDna's full-DNA clamp (pageState.ts), needed because a section's
// themeOverrides accumulate incrementally (each ChangeSectionTheme merges into whatever
// was already there) rather than being merged against a complete base DNA every time.
function clampPartialDna(overrides: Partial<StrategyDNA>): Partial<StrategyDNA> {
  const result: Partial<StrategyDNA> = { ...overrides };
  for (const key of Object.keys(result) as (keyof StrategyDNA)[]) {
    if (key === "sectionWeight") continue;
    const value = result[key];
    if (typeof value === "number") {
      (result[key] as number) = clamp01(value);
    }
  }
  return result;
}

// Pure - never mutates `state`, always returns a new PageState (or throws OperationError
// for an invalid/rejected operation, so a caller gets a clear rejection instead of a
// silently wrong result). `now` defaults to the real clock; tests pass an explicit value
// for determinism, the same pattern pageState.ts's fromLandingPage already uses.
export function applyOperation(state: PageState, operation: Operation, now: number = Date.now()): PageState {
  switch (operation.kind) {
    case "InsertSection": {
      if (state.sections.some((s) => s.id === operation.sectionId)) {
        throw new OperationError(operation, `Section id "${operation.sectionId}" already exists`);
      }
      const instance: SectionInstance = {
        id: operation.sectionId,
        type: operation.sectionType,
        variant: operation.variant,
        content: operation.content,
        layout: operation.layout,
        themeOverrides: {},
        visibility: "visible",
        locked: false,
        metadata: { createdBy: operation.createdBy, createdAt: now, updatedAt: now },
        version: 0,
      };
      const sections = [...state.sections];
      sections.splice(clampIndex(operation.index, sections.length), 0, instance);
      return { ...state, sections };
    }

    case "DuplicateSection": {
      const sourceIndex = findIndex(state, operation.sectionId, operation);
      if (state.sections.some((s) => s.id === operation.newSectionId)) {
        throw new OperationError(operation, `Section id "${operation.newSectionId}" already exists`);
      }
      const source = state.sections[sourceIndex];
      // A duplicate is never locked (copying doesn't mutate the protected original) and
      // inherits the source's createdBy - a copy of AI-generated content is still, in
      // provenance terms, AI-authored until someone actually edits it.
      const duplicate: SectionInstance = {
        ...source,
        id: operation.newSectionId,
        locked: false,
        metadata: { ...source.metadata, createdAt: now, updatedAt: now },
        version: 0,
      };
      const insertAt = operation.index ?? sourceIndex + 1;
      const sections = [...state.sections];
      sections.splice(clampIndex(insertAt, sections.length), 0, duplicate);
      return { ...state, sections };
    }

    case "DeleteSection": {
      const index = findIndex(state, operation.sectionId, operation);
      const instance = state.sections[index];
      assertNotLocked(instance, operation);
      assertNotLastAnchor(state, instance, operation);
      return { ...state, sections: state.sections.filter((_, i) => i !== index) };
    }

    case "MoveSection": {
      const index = findIndex(state, operation.sectionId, operation);
      const sections = [...state.sections];
      const [instance] = sections.splice(index, 1);
      sections.splice(clampIndex(operation.toIndex, sections.length), 0, instance);
      return { ...state, sections };
    }

    case "ChangeVariant": {
      const index = findIndex(state, operation.sectionId, operation);
      const instance = state.sections[index];
      assertNotLocked(instance, operation);
      return {
        ...state,
        sections: replaceAt(state.sections, index, touch({ ...instance, variant: operation.variant }, now)),
      };
    }

    case "UpdateContent": {
      const index = findIndex(state, operation.sectionId, operation);
      const instance = state.sections[index];
      assertNotLocked(instance, operation);
      return {
        ...state,
        sections: replaceAt(state.sections, index, touch({ ...instance, content: operation.content }, now)),
      };
    }

    case "RegenerateSection": {
      // Applies exactly like UpdateContent (+ optional variant swap) - it exists as a
      // distinct, attributable operation kind for history/audit purposes ("AI
      // regenerated this section" vs. "user typed new copy"), not different reducer
      // logic. The LLM call that produces `operation.content` happens OUTSIDE this
      // reducer (a future API route's job) - by the time an Operation reaches here, the
      // new content already exists.
      const index = findIndex(state, operation.sectionId, operation);
      const instance = state.sections[index];
      assertNotLocked(instance, operation);
      const next = { ...instance, content: operation.content, variant: operation.variant ?? instance.variant };
      return { ...state, sections: replaceAt(state.sections, index, touch(next, now)) };
    }

    case "ChangeTheme": {
      return { ...state, dna: mergeDna(state.dna, operation.dna) };
    }

    case "ChangeSectionTheme": {
      const index = findIndex(state, operation.sectionId, operation);
      const instance = state.sections[index];
      assertNotLocked(instance, operation);
      const themeOverrides = { ...instance.themeOverrides, ...clampPartialDna(operation.themeOverrides) };
      return {
        ...state,
        sections: replaceAt(state.sections, index, touch({ ...instance, themeOverrides }, now)),
      };
    }

    case "HideSection": {
      const index = findIndex(state, operation.sectionId, operation);
      const instance = state.sections[index];
      assertNotLocked(instance, operation);
      assertNotLastAnchor(state, instance, operation);
      return {
        ...state,
        sections: replaceAt(state.sections, index, touch({ ...instance, visibility: "hidden" }, now)),
      };
    }

    case "ShowSection": {
      const index = findIndex(state, operation.sectionId, operation);
      const instance = state.sections[index];
      return {
        ...state,
        sections: replaceAt(state.sections, index, touch({ ...instance, visibility: "visible" }, now)),
      };
    }

    case "LockSection": {
      const index = findIndex(state, operation.sectionId, operation);
      const instance = state.sections[index];
      return { ...state, sections: replaceAt(state.sections, index, touch({ ...instance, locked: true }, now)) };
    }

    case "UnlockSection": {
      const index = findIndex(state, operation.sectionId, operation);
      const instance = state.sections[index];
      return { ...state, sections: replaceAt(state.sections, index, touch({ ...instance, locked: false }, now)) };
    }

    default: {
      // Every real Operation kind is handled above - TypeScript proves this switch
      // exhaustive at compile time (`operation` is typed `never` here). But this
      // function's actual callers include HTTP request bodies (see
      // app/api/projects/[id]/pages/[pageId]/operations/route.ts), where nothing
      // guarantees `kind` is one of the 13 known values at runtime. Without this
      // branch, an unrecognized kind fell through the switch silently and returned
      // `undefined` instead of the next PageState - a real bug found while wiring up
      // persistence, not a hypothetical one.
      const unknown = operation as { kind?: unknown };
      throw new OperationError(operation, `Unknown operation kind: "${String(unknown.kind)}"`);
    }
  }
}
