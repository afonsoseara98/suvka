import type { ThemeConfig } from "@/app/styles/theme";
import type { LayoutPersonality } from "@/app/styles/layout";
import type { SectionRhythm } from "@/app/types/landing";
import SectionShell from "./ui/SectionShell";

type StatsProps = {
  items: {
    value: string;
    label: string;
  }[];
  theme: ThemeConfig;
  layout: LayoutPersonality;
  rhythm: SectionRhythm;
};

export default function Stats({ items, theme, layout, rhythm }: StatsProps) {
  return (
    <SectionShell theme={theme} layout={layout} rhythm={rhythm}>
      <div className={`grid gap-6 ${layout.gridColumns}`}>
        {items.map((item, index) => (
          <div
            key={index}
            className="border text-center"
            style={{
              borderColor: theme.colors.border,
              background: theme.colors.card,
              borderRadius: theme.radius.xl,
              padding: theme.spacing.lg,
            }}
          >
            <div className="text-5xl font-bold" style={{ color: theme.colors.primary }}>
              {item.value}
            </div>

            <p className="mt-3" style={{ color: theme.colors.secondary }}>
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
