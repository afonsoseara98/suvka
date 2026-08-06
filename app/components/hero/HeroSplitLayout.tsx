import type { HeroData } from "@/app/types/landing";
import type { ThemeConfig } from "@/app/styles/theme";
import type { LayoutPersonality } from "@/app/styles/layout";
import { responsivePx } from "@/app/styles/layout";

import GlowBackground from "../ui/GlowBackground";
import HeroTextBlock from "./HeroTextBlock";
import HeroPhoto from "./HeroPhoto";
import { planHeroVisual } from "./registry";

type Props = {
  data: HeroData;
  theme: ThemeConfig;
  layout: LayoutPersonality;
  onUpdateContent?: (content: HeroData) => void;
};

// Text left, scene right. The default in Hero.tsx for backward compatibility. No
// longer renders a logo cloud itself - LandingComposition.ts places that as its own
// "logoCloud" section when an archetype wants one, instead of it being an automatic
// side effect of picking this hero variant.
export default function HeroSplitLayout({ data, theme, layout, onUpdateContent }: Props) {
  const visual = planHeroVisual(data);

  return (
    <GlowBackground theme={theme} decorative={layout.decorative} opacity={layout.decorationOpacity}>
      <section
        className="relative overflow-hidden"
        style={{ paddingTop: responsivePx(layout.heroPaddingPx), paddingBottom: responsivePx(layout.heroPaddingPx) }}
      >
        {/* Two columns only when there is a second column to fill. With nothing to show,
            a half-width text block floating beside empty space reads as a broken page, so
            the text recentres into a single readable measure instead. */}
        <div
          className={
            visual.kind === "none"
              ? "mx-auto max-w-3xl"
              : "mx-auto grid max-w-7xl items-center gap-10 lg:gap-20 lg:grid-cols-2"
          }
        >
          <HeroTextBlock
            data={data}
            theme={theme}
            layout={layout}
            align={visual.kind === "none" ? "center" : undefined}
            onUpdateContent={onUpdateContent}
          />
          {visual.kind === "photo" && <HeroPhoto image={visual.image} theme={theme} />}
          {visual.kind === "scene" && <visual.Scene data={data} theme={theme} />}
        </div>
      </section>
    </GlowBackground>
  );
}
