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

export default function HeroCenteredLayout({ data, theme, layout }: Props) {
  const Scene = heroRegistry[data.imageStyle] ?? heroRegistry.dashboard;

  return (
    <GlowBackground theme={theme} decorative={layout.decorative}>
      <section className={`relative overflow-hidden ${layout.heroPadding}`}>
        <div className="mx-auto max-w-4xl">
          <HeroTextBlock data={data} theme={theme} layout={layout} align="center" />
        </div>

        <div className="relative mx-auto mt-16 max-w-xl">
          <Scene data={data} theme={theme} />
        </div>
      </section>
    </GlowBackground>
  );
}
