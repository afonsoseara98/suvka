import type { LandingPage } from "@/app/types/landing";
import { getTheme } from "@/app/styles/theme";
import { getLayoutPersonality } from "@/app/styles/layout";

import SectionRenderer from "./renderers/SectionRenderer";

type LandingProps = LandingPage;

export default function Landing(landing: LandingProps) {
  const currentTheme = getTheme(landing.theme);
  const layout = getLayoutPersonality(landing.theme);

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