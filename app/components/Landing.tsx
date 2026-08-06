import type { PageState } from "@/app/editor/pageState";
import type { Operation } from "@/app/editor/operations";
import { compileTheme } from "@/app/styles/theme";
import { compileLayout } from "@/app/styles/layout";

import SectionRenderer from "./renderers/SectionRenderer";

type LandingProps = {
  state: PageState;
  // Omitted by every read-only caller (app/benchmark/page.tsx, Landing.test.tsx, any
  // future published-page renderer) - undefined flows all the way down through
  // SectionRenderer, where it's bound per-instance into the narrower onUpdateContent
  // callback EditableText actually uses (UpdateContent only) and into the reordering
  // toolbar (MoveSection). A single generic callback here - any Operation, not just
  // UpdateContent - so adding the next editor affordance (hide/show, delete, ...) never
  // needs a new prop threaded through this whole tree again. Only
  // app/editor/[id]/page.tsx passes this.
  onDispatchOperation?: (operation: Operation) => void;
};

// The renderer's compiler entry point: state.dna is a continuous StrategyDNA object,
// never a Theme/DesignStyle label - compileTheme/compileLayout turn it into concrete
// CSS values every component downstream already knew how to consume (they read
// theme.colors.X / layout.sectionWidthPx exactly as before), so no component further
// down the tree needs to know DNA exists at all.
//
// Renders exclusively from PageState (app/editor/pageState.ts) - the canonical,
// editable model. Hidden sections stay in state.sections (HideSection is reversible)
// but never render here; a locked or theme-overridden section renders exactly the same
// way a plain one does, since those are properties SectionRenderer/the compiler read,
// not something this component needs to branch on itself.
export default function Landing({ state, onDispatchOperation }: LandingProps) {
  const theme = compileTheme(state.dna);
  const layout = compileLayout(state.dna);

  const visibleSections = state.sections.filter((section) => section.visibility === "visible");

  return (
    <section
      className="mx-auto mt-20 mb-20 max-w-7xl p-4 sm:p-8 md:p-12"
      style={{
        background: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.radius.xl,
        color: theme.colors.primary,
        boxShadow: theme.shadow.lg,
      }}
    >
      {visibleSections.map((instance) => (
        <SectionRenderer
          key={instance.id}
          instance={instance}
          page={state}
          theme={theme}
          layout={layout}
          onDispatchOperation={onDispatchOperation}
        />
      ))}
    </section>
  );
}
