import type { HeroData } from "@/app/types/landing";
import type { ThemeConfig } from "@/app/styles/theme";

import Badge from "../ui/Badge";
import GlassCard from "../ui/GlassCard";

type Props = {
  data: HeroData;
  theme: ThemeConfig;
};

export default function HeroProduct({ data, theme }: Props) {
  return (
    <div className="relative">
      <GlassCard theme={theme}>
        <div
          className="flex aspect-square items-center justify-center rounded-2xl text-7xl"
          style={{ backgroundImage: theme.gradients.glow }}
        >
          📦
        </div>
      </GlassCard>

      {data.stats[0] && (
        <div className="absolute -left-6 top-8">
          <Badge theme={theme}>
            {data.stats[0].value} {data.stats[0].label}
          </Badge>
        </div>
      )}

      {data.stats[1] && (
        <div className="absolute -right-6 bottom-8">
          <Badge theme={theme}>
            {data.stats[1].value} {data.stats[1].label}
          </Badge>
        </div>
      )}
    </div>
  );
}
