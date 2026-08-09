import type { HeroData } from "@/app/types/landing";
import type { ThemeConfig } from "@/app/styles/theme";
import type { LayoutPersonality } from "@/app/styles/layout";
import { responsivePx } from "@/app/styles/layout";

import GlowBackground from "../ui/GlowBackground";
import HeroTextBlock from "./HeroTextBlock";
import HeroPhotoBackdrop from "./HeroPhotoBackdrop";
import { planHeroVisual } from "./registry";

type Props = {
  data: HeroData;
  theme: ThemeConfig;
  layout: LayoutPersonality;
  onUpdateContent?: (content: HeroData) => void;
};

export default function HeroCenteredLayout({ data, theme, layout, onUpdateContent }: Props) {
  const visual = planHeroVisual(data);

  // The photograph carries the hero rather than following it. See HeroPhotoBackdrop: the
  // first screen used to be a name on a gradient, with the food below the fold.
  if (visual.kind === "photo") {
    return (
      <HeroPhotoBackdrop image={visual.image} theme={theme}>
        <section
          className="relative"
          style={{
            paddingTop: responsivePx(layout.heroPaddingPx),
            paddingBottom: responsivePx(layout.heroPaddingPx),
          }}
        >
          <div className="mx-auto max-w-4xl">
            {/* Light text, fixed, because it sits on the scrim rather than on the theme's
                background - a light-themed restaurant would otherwise put dark text on a
                dark wash. */}
            <HeroTextBlock
              data={data}
              theme={{ ...theme, colors: { ...theme.colors, primary: "#ffffff", secondary: "rgba(255,255,255,0.82)" } }}
              layout={layout}
              align="center"
              onUpdateContent={onUpdateContent}
            />
          </div>
        </section>
      </HeroPhotoBackdrop>
    );
  }

  return (
    <GlowBackground theme={theme} decorative={layout.decorative} opacity={layout.decorationOpacity}>
      <section
        className="relative overflow-hidden"
        style={{ paddingTop: responsivePx(layout.heroPaddingPx), paddingBottom: responsivePx(layout.heroPaddingPx) }}
      >
        <div className="mx-auto max-w-4xl">
          <HeroTextBlock data={data} theme={theme} layout={layout} align="center" onUpdateContent={onUpdateContent} />
        </div>

        {/* No photograph: the section simply ends after the text, which is a finished
            editorial hero rather than a gap. */}
        {visual.kind === "scene" && (
          <div className="relative mx-auto mt-16 max-w-xl">
            <visual.Scene data={data} theme={theme} />
          </div>
        )}
      </section>
    </GlowBackground>
  );
}
