import type { HeroData } from "@/app/types/landing";
import type { ThemeConfig } from "@/app/styles/theme";

import GlassCard from "../ui/GlassCard";
import MetricCard from "../ui/MetricCard";

type Props = {
  data: HeroData;
  theme: ThemeConfig;
};

export default function HeroWebsite({ data, theme }: Props) {
  return (
    <div className="relative">
      <GlassCard theme={theme}>
        <div className="flex items-center gap-2 border-b pb-4" style={{ borderColor: theme.colors.border }}>
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <div className="h-3 w-3 rounded-full bg-yellow-500" />
          <div className="h-3 w-3 rounded-full" style={{ background: theme.colors.success }} />
          <div
            className="ml-3 flex-1 truncate rounded-md px-3 py-1 text-xs"
            style={{ background: theme.colors.background, color: theme.colors.secondary }}
          >
            yourbusiness.com
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div className="h-6 w-2/3 rounded" style={{ background: theme.colors.border }} />
          <div className="h-3 w-full rounded" style={{ background: theme.colors.background }} />
          <div className="h-3 w-5/6 rounded" style={{ background: theme.colors.background }} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          {data.stats.slice(0, 2).map((item, index) => (
            <MetricCard key={index} value={item.value} label={item.label} theme={theme} />
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
