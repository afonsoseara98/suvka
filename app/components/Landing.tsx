import type { PageState } from "@/app/editor/pageState";
import { compileTheme } from "@/app/styles/theme";
import { compileLayout } from "@/app/styles/layout";

import SectionRenderer from "./renderers/SectionRenderer";

type LandingProps = { state: PageState };

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
export default function Landing({ state }: LandingProps) {
  const theme = compileTheme(state.dna);
  const layout = compileLayout(state.dna);

  const visibleSections = state.sections.filter((section) => section.visibility === "visible");

  return (
    <section
      className="mx-auto mt-20 mb-20 max-w-7xl p-12"
      style={{
        background: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.radius.xl,
        color: theme.colors.primary,
        boxShadow: theme.shadow.lg,
      }}
    >
      {visibleSections.map((instance) => (
        <SectionRenderer key={instance.id} instance={instance} page={state} theme={theme} layout={layout} />
      ))}
    </section>
  );
}
