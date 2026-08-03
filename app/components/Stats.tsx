import type { ThemeConfig } from "@/app/styles/theme";
import type { LayoutPersonality } from "@/app/styles/layout";
import { resolveSectionSpacing } from "@/app/styles/layout";
import type { SectionRhythm } from "@/app/types/landing";

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
    <section className={resolveSectionSpacing(layout.sectionSpacing, rhythm)}>
      <div className={`mx-auto grid ${layout.sectionWidth} gap-6 ${layout.gridColumns}`}>
        {items.map((item, index) => (
          <div
            key={index}
            className={`${layout.cardRadius} border ${layout.cardPadding} text-center`}
            style={{ borderColor: theme.colors.border, background: theme.colors.card }}
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
    </section>
  );
}