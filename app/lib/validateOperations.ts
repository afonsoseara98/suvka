import type { Operation } from "@/app/editor/operations";

// Shallow structural gate for a request body claiming to be Operation(s) - rejects an
// unrecognized `kind` or an obviously-missing `sectionId` before ever reaching
// applyOperation(). Deliberately NOT a full schema validator: applyOperation() (see its
// "unrecognized kind" default case and per-op invariants - locked sections, unknown
// section ids, index clamping) remains the actual authority on semantic validity. This
// exists so a malformed HTTP body fails with a clear 400 at the API boundary instead of
// a confusing 500 deeper in the stack - the same "structured data before trusting an
// external input" principle this project already applies to prompting an LLM, applied
// here to the reverse direction (an external caller's input, not the LLM's output).
const OPERATION_KINDS = new Set<Operation["kind"]>([
  "InsertSection",
  "DuplicateSection",
  "DeleteSection",
  "MoveSection",
  "ChangeVariant",
  "UpdateContent",
  "RegenerateSection",
  "ChangeTheme",
  "ChangeSectionTheme",
  "HideSection",
  "ShowSection",
  "LockSection",
  "UnlockSection",
]);

export type OperationsValidation = { valid: true; operations: Operation[] } | { valid: false; error: string };

export function validateOperations(body: unknown): OperationsValidation {
  const items = Array.isArray(body) ? body : [body];

  if (items.length === 0) {
    return { valid: false, error: "At least one operation is required." };
  }

  for (const item of items) {
    if (typeof item !== "object" || item === null) {
      return { valid: false, error: "Each operation must be an object." };
    }

    const record = item as Record<string, unknown>;
    const kind = record.kind;

    if (typeof kind !== "string" || !OPERATION_KINDS.has(kind as Operation["kind"])) {
      return { valid: false, error: `Unknown operation kind: ${JSON.stringify(kind)}` };
    }

    // Every kind except the page-level ChangeTheme targets a specific section.
    if (kind !== "ChangeTheme") {
      if (typeof record.sectionId !== "string" || record.sectionId.length === 0) {
        return { valid: false, error: `"${kind}" requires a non-empty sectionId.` };
      }
    }
  }

  return { valid: true, operations: items as Operation[] };
}
