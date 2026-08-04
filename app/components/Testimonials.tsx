import type { ThemeConfig } from "@/app/styles/theme";
import type { LayoutPersonality } from "@/app/styles/layout";
import type { SectionRhythm } from "@/app/types/landing";
import SectionShell from "./ui/SectionShell";
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
          className="border"
          style={{
            borderColor: theme.colors.border,
            background: theme.colors.card,
            color: theme.colors.primary,
            borderRadius: theme.radius.xl,
            padding: theme.spacing.lg,
          }}
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

// Spotlight treatment: the first testimonial is presented alone, at real size, with
// the rest reduced to a supporting row beneath it - one story does the emotional work,
// the others just corroborate it. Suits the "editorial"/"elegant"/"highEndAgency"
// families' more considered pacing.
function TestimonialsSpotlight({ items, theme, layout }: ListProps) {
  const [lead, ...rest] = items;

  return (
    <div>
      {lead && (
        <div
          className="mx-auto max-w-3xl border text-center"
          style={{
            borderColor: theme.colors.border,
            background: theme.colors.card,
            borderRadius: theme.radius.xl,
            padding: theme.spacing.xl,
          }}
        >
          <p className="text-2xl font-medium leading-9">&ldquo;{lead.text}&rdquo;</p>
          <div className="mt-6">
            <div className="font-bold">{lead.name}</div>
            <div style={{ color: theme.colors.secondary }}>{lead.company}</div>
          </div>
        </div>
      )}

      {rest.length > 0 && (
        <div className={`mt-10 grid gap-6 ${layout.gridColumns}`}>
          {rest.map((item, index) => (
            <div
              key={index}
              className="border"
              style={{ borderColor: theme.colors.border, background: theme.colors.card, borderRadius: theme.radius.lg, padding: theme.spacing.md }}
            >
              <p className="text-sm leading-6" style={{ color: theme.colors.secondary }}>
                &ldquo;{item.text}&rdquo;
              </p>
              <div className="mt-4 text-sm font-semibold">{item.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const TESTIMONIALS_VARIANTS: Record<string, (props: ListProps) => React.ReactElement> = {
  minimal: TestimonialsMinimal,
  spotlight: TestimonialsSpotlight,
  cards: TestimonialsCards,
};

export default function Testimonials({ items, theme, layout, rhythm, variant }: TestimonialsProps) {
  const Variant = (variant && TESTIMONIALS_VARIANTS[variant]) || TestimonialsCards;

  return (
    <SectionShell theme={theme} layout={layout} rhythm={rhythm}>
      <SectionHeader theme={theme} layout={layout} title="Testimonials" />

      <div className="mt-10">
        <Variant items={items} theme={theme} layout={layout} />
      </div>
    </SectionShell>
  );
}
