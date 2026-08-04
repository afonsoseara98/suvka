import type { LandingPage } from "@/app/types/landing";
import { compileTheme } from "@/app/styles/theme";
import { compileLayout } from "@/app/styles/layout";

import SectionRenderer from "./renderers/SectionRenderer";

type LandingProps = LandingPage;

// The renderer's compiler entry point: landing.dna is a continuous StrategyDNA object,
// never a Theme/DesignStyle label - compileTheme/compileLayout turn it into concrete
// CSS values every component downstream already knew how to consume (they read
// theme.colors.X / layout.sectionWidthPx exactly as before), so no component further
// down the tree needs to know DNA exists at all.
export default function Landing(landing: LandingProps) {
  const currentTheme = compileTheme(landing.dna);
  const layout = compileLayout(landing.dna);

  return (
    <section
      className="mx-auto mt-20 mb-20 max-w-7xl p-12"
      style={{
        background: currentTheme.colors.surface,
        border: `1px solid ${currentTheme.colors.border}`,
        borderRadius: currentTheme.radius.xl,
        color: currentTheme.colors.primary,
        boxShadow: currentTheme.shadow.lg,
      }}
    >
      {landing.sections.map((section, index) => (
        <SectionRenderer
          key={`${section.type}-${index}`}
          section={section}
          landing={landing}
          theme={currentTheme}
          layout={layout}
        />
      ))}
    </section>
  );
}