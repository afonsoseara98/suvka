import type { SectionRhythm } from "@/app/types/landing";
import type { ThemeConfig } from "@/app/styles/theme";
import type { LayoutPersonality } from "@/app/styles/layout";
import { resolveSectionSpacing } from "@/app/styles/layout";
import GlowBackground from "./GlowBackground";

type Props = {
  children: React.ReactNode;
  theme: ThemeConfig;
  layout: LayoutPersonality;
  rhythm: SectionRhythm;
};

// The section wrapper (spacing + decorative background + content-width column)
// Features/Benefits/Testimonials/Pricing/FAQ/Stats all hand-rolled identically before
// the DNA compiler made every one of these values continuous (marginTop/maxWidth are
// now px numbers, not Tailwind class strings) - extracted once converting all six
// separately would have meant six copies of the same three style props.
export default function SectionShell({ children, theme, layout, rhythm }: Props) {
  return (
    <section
      className="relative overflow-hidden"
      style={{ marginTop: resolveSectionSpacing(layout.sectionSpacingPx, rhythm) }}
    >
      <GlowBackground theme={theme} decorative={layout.decorative} opacity={layout.decorationOpacity}>
        <div className="mx-auto" style={{ maxWidth: layout.sectionWidthPx }}>
          {children}
        </div>
      </GlowBackground>
    </section>
  );
}
