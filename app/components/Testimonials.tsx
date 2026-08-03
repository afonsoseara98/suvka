import type { ThemeConfig } from "@/app/styles/theme";
import type { LayoutPersonality } from "@/app/styles/layout";
import { resolveSectionSpacing } from "@/app/styles/layout";
import type { SectionRhythm } from "@/app/types/landing";
import SectionHeader from "./ui/SectionHeader";

type Testimonial = {
  name: string;
  company: string;
  text: string;
};

type TestimonialsProps = {
  items: Testimonial[];
  theme: ThemeConfig;
  layout: LayoutPersonality;
  rhythm: SectionRhythm;
  variant?: string;
};

type ListProps = { items: Testimonial[]; theme: ThemeConfig; layout: LayoutPersonality };

function TestimonialsCards({ items, theme, layout }: ListProps) {
  return (
    <div className={`grid gap-8 ${layout.gridColumns}`}>
      {items.map((item, index) => (
        <div
          key={index}
          className={`${layout.cardRadius} border ${layout.cardPadding}`}
          style={{ borderColor: theme.colors.border, background: theme.colors.card, color: theme.colors.primary }}
        >
          <p className="leading-8" style={{ color: theme.colors.secondary }}>
            &ldquo;{item.text}&rdquo;
          </p>

          <div className="mt-8">
            <div className="font-bold">{item.name}</div>
            <div style={{ color: theme.colors.secondary }}>{item.company}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TestimonialsMinimal({ items, theme }: ListProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-14 text-center">
      {items.map((item, index) => (
        <div key={index}>
          <p className="text-2xl font-medium leading-9">
            &ldquo;{item.text}&rdquo;
          </p>

          <div className="mt-6 text-sm" style={{ color: theme.colors.secondary }}>
            <span className="font-semibold" style={{ color: theme.colors.primary }}>{item.name}</span> · {item.company}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Testimonials({ items, theme, layout, rhythm, variant }: TestimonialsProps) {
  return (
    <section className={resolveSectionSpacing(layout.sectionSpacing, rhythm)}>
      <div className={`mx-auto ${layout.sectionWidth}`}>
        <SectionHeader theme={theme} layout={layout} title="Testimonials" />

        <div className="mt-10">
          {variant === "minimal" ? (
            <TestimonialsMinimal items={items} theme={theme} layout={layout} />
          ) : (
            <TestimonialsCards items={items} theme={theme} layout={layout} />
          )}
        </div>
      </div>
    </section>
  );
}
