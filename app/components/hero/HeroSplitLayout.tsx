import type { HeroData } from "@/app/types/landing";
import type { ThemeConfig } from "@/app/styles/theme";
import type { LayoutPersonality } from "@/app/styles/layout";

import GlowBackground from "../ui/GlowBackground";
import HeroTextBlock from "./HeroTextBlock";
import { heroRegistry } from "./registry";

type Props = {
  data: HeroData;
  theme: ThemeConfig;
  layout: LayoutPersonality;
};

// Text left, scene right. The default in Hero.tsx for backward compatibility. No
// longer renders a logo cloud itself - LandingComposition.ts places that as its own
// "logoCloud" section when an archetype wants one, instead of it being an automatic
// side effect of picking this hero variant.
export default function HeroSplitLayout({ data, theme, layout }: Props) {
  const Scene = heroRegistry[data.imageStyle] ?? heroRegistry.dashboard;

  return (
    <GlowBackground theme={theme} decorative={layout.decorative} opacity={layout.decorationOpacity}>
      <section
        className="relative overflow-hidden"
        style={{ paddingTop: layout.heroPaddingPx, paddingBottom: layout.heroPaddingPx }}
      >
        <div className="mx-auto grid max-w-7xl items-center gap-20 lg:grid-cols-2">
          <HeroTextBlock data={data} theme={theme} layout={layout} />
          <Scene data={data} theme={theme} />
        </div>
      </section>
    </GlowBackground>
  );
}
