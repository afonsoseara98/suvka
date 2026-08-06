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

export default function HeroCenteredLayout({ data, theme, layout, onUpdateContent }: Props) {
  const visual = planHeroVisual(data);

  return (
    <GlowBackground theme={theme} decorative={layout.decorative} opacity={layout.decorationOpacity}>
      <section
        className="relative overflow-hidden"
        style={{ paddingTop: responsivePx(layout.heroPaddingPx), paddingBottom: responsivePx(layout.heroPaddingPx) }}
      >
        <div className="mx-auto max-w-4xl">
          <HeroTextBlock data={data} theme={theme} layout={layout} align="center" onUpdateContent={onUpdateContent} />
        </div>

        {/* A photograph runs wider than a mockup - it is the subject of the page, not a
            decorative prop beside it. When there is nothing to show, the section simply
            ends after the text, which is a finished editorial hero rather than a gap. */}
        {visual.kind === "photo" && (
          <div className="relative mx-auto mt-16 max-w-3xl">
            <HeroPhoto image={visual.image} theme={theme} />
          </div>
        )}

        {visual.kind === "scene" && (
          <div className="relative mx-auto mt-16 max-w-xl">
            <visual.Scene data={data} theme={theme} />
          </div>
        )}
      </section>
    </GlowBackground>
  );
}
