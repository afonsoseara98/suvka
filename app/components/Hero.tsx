import type { HeroData } from "@/app/types/landing";
import type { ThemeConfig } from "@/app/styles/theme";
import type { LayoutPersonality } from "@/app/styles/layout";

import HeroSplitLayout from "./hero/HeroSplitLayout";
import HeroCenteredLayout from "./hero/HeroCenteredLayout";
import HeroMinimalLayout from "./hero/HeroMinimalLayout";

type HeroProps = {
  data: HeroData;
  theme: ThemeConfig;
  layout: LayoutPersonality;
  variant?: string;
};

export default function Hero({ data, theme, layout, variant }: HeroProps) {
  switch (variant) {
    case "centered":
      return <HeroCenteredLayout data={data} theme={theme} layout={layout} />;

    case "minimal":
      return <HeroMinimalLayout data={data} theme={theme} layout={layout} />;

    case "split":
    default:
      return <HeroSplitLayout data={data} theme={theme} layout={layout} />;
  }
}
