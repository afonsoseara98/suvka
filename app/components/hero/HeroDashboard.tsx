import type { HeroData } from "@/app/types/landing";
import type { ThemeConfig } from "@/app/styles/theme";

import MetricCard from "../ui/MetricCard";

type Props = {
  data: HeroData;
  theme: ThemeConfig;
};

export default function HeroDashboard({ data, theme }: Props) {
  return (
    <div className="relative">
      <div
        className="rounded-[36px] border p-8 shadow-2xl"
        style={{ borderColor: theme.colors.border, background: theme.colors.card, color: theme.colors.primary }}
      >
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Dashboard</div>

          <div
            className="rounded-full px-3 py-1 text-sm"
            style={{ background: `${theme.colors.success}33`, color: theme.colors.success }}
          >
            Live
          </div>
        </div>

        <div className="mt-10 grid gap-6">
          {data.stats.map((item, index) => (
            <MetricCard key={index} value={item.value} label={item.label} theme={theme} />
          ))}
        </div>
      </div>

      <div
        className="absolute -left-10 top-16 rounded-2xl border p-5 backdrop-blur-xl"
        style={{ borderColor: theme.colors.border, background: theme.colors.card, color: theme.colors.primary }}
      >
        <div className="text-sm" style={{ color: theme.colors.secondary }}>Revenue</div>
        <div className="mt-2 text-3xl font-black">+48%</div>
      </div>

      <div
        className="absolute -right-8 bottom-10 rounded-2xl border p-5 backdrop-blur-xl"
        style={{ borderColor: theme.colors.border, background: theme.colors.card, color: theme.colors.primary }}
      >
        <div className="text-sm" style={{ color: theme.colors.secondary }}>Conversion</div>
        <div className="mt-2 text-3xl font-black">7.3%</div>
      </div>
    </div>
  );
}
