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
  // A RESTAURANT'S WEBSITE IS NOT A CARD
  //
  // This component was born inside the benchmark grid, where twenty generated pages sit
  // side by side and a bordered, rounded, shadowed card with 80px of margin is exactly
  // right - it separates one specimen from the next.
  //
  // Then the same component became the published site. Every restaurant Suvka put online
  // was a card floating in the middle of a page, with a visible border, rounded corners, a
  // drop shadow, and margins showing the browser's own background - which follows the
  // VISITOR's light/dark preference, not the restaurant's design. No real restaurant
  // website looks like that, and it is the single loudest tell that this page was produced
  // by something rather than built for someone.
  //
  // So full bleed is the default and the card is opt-in, because the card is the special
  // case: one caller, showing specimens.
  framed?: boolean;
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
export default function Landing({ state, onDispatchOperation, framed = false }: LandingProps) {
  const theme = compileTheme(state.dna);
  const layout = compileLayout(state.dna);

  const visibleSections = state.sections.filter((section) => section.visibility === "visible");

  const sections = visibleSections.map((instance) => (
    <SectionRenderer
      key={instance.id}
      instance={instance}
      page={state}
      theme={theme}
      layout={layout}
      onDispatchOperation={onDispatchOperation}
    />
  ));

  if (framed) {
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
        {sections}
      </section>
    );
  }

  return (
    <>
      {/* The page's own background, not the browser's.
          globals.css paints body from prefers-color-scheme, so a dark restaurant site
          viewed by somebody whose phone is in light mode showed white above and below it,
          and white bands beside it. That is the visitor's operating system decorating a
          restaurant's website. Setting it here covers overscroll and every gap min-height
          alone cannot reach. Server-rendered, so there is no flash of the wrong colour.

          Only where this component IS the page. The editor renders the same tree inside our
          own chrome, and there the body belongs to Suvka - painting it the restaurant's
          colour would leak the customer's palette onto our furniture. Being editable is
          exactly the signal that we are not the whole page. */}
      {!onDispatchOperation && (
        <style
          dangerouslySetInnerHTML={{
            __html: `body{background:${theme.colors.background};color:${theme.colors.primary}}`,
          }}
        />
      )}
      <div
        className="min-h-screen w-full"
        style={{ background: theme.colors.background, color: theme.colors.primary }}
      >
        {sections}
      </div>
    </>
  );
}
