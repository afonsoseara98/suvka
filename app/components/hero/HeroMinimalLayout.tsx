import type { HeroData } from "@/app/types/landing";
import type { ThemeConfig } from "@/app/styles/theme";
import type { LayoutPersonality } from "@/app/styles/layout";
import { responsivePx } from "@/app/styles/layout";

import HeroTextBlock from "./HeroTextBlock";

type Props = {
  data: HeroData;
  theme: ThemeConfig;
  layout: LayoutPersonality;
  onUpdateContent?: (content: HeroData) => void;
};

// Deliberately the sparsest layout: no scene, no glow, no logo cloud - just the
// message. This is what makes "minimal" a real, distinct choice rather than a
// smaller version of the other two.
export default function HeroMinimalLayout({ data, theme, layout, onUpdateContent }: Props) {
  return (
    <section
      className="relative overflow-hidden"
      style={{ paddingTop: responsivePx(layout.heroPaddingPx), paddingBottom: responsivePx(layout.heroPaddingPx) }}
    >
      <div className="mx-auto max-w-3xl">
        <HeroTextBlock data={data} theme={theme} layout={layout} align="center" onUpdateContent={onUpdateContent} />
      </div>
    </section>
  );
}
