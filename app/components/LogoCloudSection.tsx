import type { ThemeConfig } from "@/app/styles/theme";
import type { LayoutPersonality } from "@/app/styles/layout";
import type { SectionRhythm } from "@/app/types/landing";
import SectionShell from "./ui/SectionShell";
import LogoCloud from "./ui/LogoCloud";

type Props = {
  theme: ThemeConfig;
  layout: LayoutPersonality;
  rhythm: SectionRhythm;
};

// Promotes the LogoCloud atom (previously baked unconditionally into
// HeroSplitLayout/HeroCenteredLayout) to a standalone composition section, so whether
// it appears - and where - is LandingComposition's decision for that archetype, not an
// automatic side effect of which hero variant happened to be picked.
export default function LogoCloudSection({ theme, layout, rhythm }: Props) {
  return (
    <SectionShell theme={theme} layout={layout} rhythm={rhythm}>
      <p
        className="text-center text-sm uppercase tracking-wide"
        style={{ color: theme.colors.secondary }}
      >
        Trusted by teams at
      </p>

      <LogoCloud theme={theme} />
    </SectionShell>
  );
}
