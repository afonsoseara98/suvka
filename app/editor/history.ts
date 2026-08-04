import type { PageState } from "./pageState";
import { applyOperation, type Operation } from "./operations";

// HISTORY
//
// Event-sourced, on purpose ("Implementar Undo/Redo e histórico de versões usando essas
// operações" - the operation log itself IS the version history, not a separate concept
// bolted on afterward). `records` is the full, independently-inspectable audit trail
// (who did what, when); `states` caches the PageState after each record so undo/redo/
// goToVersion are O(1) index moves rather than an O(n) replay on every read.
//
// Every record stores one-or-more Operations applied atomically: a plain `dispatch` is
// just `dispatchBatch` with a single-element array. This is what makes an AI turn (which
// is usually several Operations - e.g. "make the hero bolder" -> ChangeVariant +
// ChangeSectionTheme) undo as ONE step instead of forcing the user to undo twice to
// reverse one instruction.
export interface OperationRecord {
  operations: readonly Operation[];
  actor: "user" | "ai";
  label?: string;
  timestamp: number;
}

export interface PageHistory {
  states: readonly PageState[]; // states[0] = initial page, states[i] = after records[i - 1]
  records: readonly OperationRecord[];
  cursor: number; // current position; currentState = states[cursor]
}

export function createHistory(initial: PageState): PageHistory {
  return { states: [initial], records: [], cursor: 0 };
}

export function currentState(history: PageHistory): PageState {
  return history.states[history.cursor];
}

export function canUndo(history: PageHistory): boolean {
  return history.cursor > 0;
}

export function canRedo(history: PageHistory): boolean {
  return history.cursor < history.states.length - 1;
}

// Standard undo/redo semantics: dispatching after an undo discards whatever redo tail
// existed (you can't redo past a point you've since branched away from).
function truncateRedoTail(history: PageHistory): PageHistory {
  if (!canRedo(history)) return history;
  return {
    states: history.states.slice(0, history.cursor + 1),
    records: history.records.slice(0, history.cursor),
    cursor: history.cursor,
  };
}

// Applies every operation in order against a running state, but records and advances
// the cursor exactly ONCE for the whole batch - a single undo reverts all of it. If any
// operation in the batch throws (OperationError from applyOperation), nothing is
// recorded: `history` is only ever derived from the fully-succeeded final state.
export function dispatchBatch(
  history: PageHistory,
  operations: readonly Operation[],
  actor: "user" | "ai",
  label?: string,
  now: number = Date.now()
): PageHistory {
  const truncated = truncateRedoTail(history);

  let state = currentState(truncated);
  for (const operation of operations) {
    state = applyOperation(state, operation, now);
  }

  const record: OperationRecord = { operations, actor, label, timestamp: now };

  return {
    states: [...truncated.states, state],
    records: [...truncated.records, record],
    cursor: truncated.cursor + 1,
  };
}

export function dispatch(
  history: PageHistory,
  operation: Operation,
  actor: "user" | "ai",
  label?: string,
  now: number = Date.now()
): PageHistory {
  return dispatchBatch(history, [operation], actor, label, now);
}

export function undo(history: PageHistory): PageHistory {
  return canUndo(history) ? { ...history, cursor: history.cursor - 1 } : history;
}

export function redo(history: PageHistory): PageHistory {
  return canRedo(history) ? { ...history, cursor: history.cursor + 1 } : history;
}

// Jumps to any past (or, harmlessly, present) state directly - not just one step of
// linear undo. The natural extension a version-history UI needs ("restore this version
// from 20 minutes ago"): still just moving the cursor, states[index] already exists.
export function goToVersion(history: PageHistory, index: number): PageHistory {
  if (index < 0 || index >= history.states.length) {
    throw new RangeError(`version index ${index} is out of range [0, ${history.states.length - 1}]`);
  }
  return { ...history, cursor: index };
}
