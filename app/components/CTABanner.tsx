import type { HeroData } from "@/app/types/landing";
import type { ThemeConfig } from "@/app/styles/theme";
import type { LayoutPersonality } from "@/app/styles/layout";
import type { SectionRhythm } from "@/app/types/landing";
import SectionShell from "./ui/SectionShell";
import PrimaryButton from "./ui/PrimaryButton";
import SecondaryButton from "./ui/SecondaryButton";

type Props = {
  hero: HeroData;
  theme: ThemeConfig;
  layout: LayoutPersonality;
  rhythm: SectionRhythm;
};

// The intermediate/final CTA banner LandingComposition places mid-page or before the
// footer (see lead_generation's "Final CTA", booking's "Booking CTA", hospitality's
// "Reservation CTA"). Deliberately reuses hero.primaryCTA/secondaryCTA rather than
// asking the LLM for new copy - the button text is already business-specific real
// generated content, so repeating it here needs no schema change and stays honest
// (never invents a claim the business didn't make).
export default function CTABanner({ hero, theme, layout, rhythm }: Props) {
  return (
    <SectionShell theme={theme} layout={layout} rhythm={rhythm}>
      <div className="py-16 text-center">
        <h2 style={{ ...theme.typography.title, color: theme.colors.primary }}>
          Ready to get started?
        </h2>

        <p className="mx-auto mt-4 max-w-xl" style={{ color: theme.colors.secondary }}>
          {hero.subtitle}
        </p>

        <div
          className={
            layout.ctaLayout === "stacked"
              ? "mt-8 flex flex-col items-center gap-3"
              : "mt-8 flex flex-wrap items-center justify-center gap-4"
          }
        >
          <PrimaryButton theme={theme}>{hero.primaryCTA}</PrimaryButton>
          <SecondaryButton theme={theme}>{hero.secondaryCTA}</SecondaryButton>
        </div>
      </div>
    </SectionShell>
  );
}
