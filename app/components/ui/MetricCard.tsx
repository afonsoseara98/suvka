import type { ThemeConfig } from "@/app/styles/theme";
import GlassCard from "./GlassCard";

type Props = {
  value: string;
  label: string;
  theme: ThemeConfig;
};

export default function MetricCard({
  value,
  label,
  theme,
}: Props) {
  return (
    <GlassCard theme={theme}>
      <div className="text-3xl font-black">
        {value}
      </div>

      <div className="mt-2" style={{ color: theme.colors.secondary }}>
        {label}
      </div>
    </GlassCard>
  );
}