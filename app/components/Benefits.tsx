import type { LandingPage, SectionRhythm } from "@/app/types/landing";
import type { ThemeConfig } from "@/app/styles/theme";
import type { LayoutPersonality } from "@/app/styles/layout";
import SectionShell from "./ui/SectionShell";
import SectionHeader from "./ui/SectionHeader";

type BenefitsProps = {
  items: LandingPage["benefits"];
  theme: ThemeConfig;
  layout: LayoutPersonality;
  rhythm: SectionRhythm;
  variant?: string;
};

type ListProps = { items: LandingPage["benefits"]; theme: ThemeConfig; layout: LayoutPersonality };

function BenefitsCards({ items, theme, layout }: ListProps) {
  return (
    <div className={`mt-20 grid gap-8 ${layout.gridColumns}`}>
      {items.map((benefit, index) => (
        <div
          key={index}
          className="group relative overflow-hidden border backdrop-blur transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
          style={{
            borderColor: theme.colors.border,
            background: theme.colors.card,
            color: theme.colors.primary,
            borderRadius: theme.radius.xl,
            padding: theme.spacing.lg,
          }}
        >
          {/* Glow */}
          <div
            className="absolute -left-10 -top-10 h-32 w-32 rounded-full blur-3xl opacity-0 transition duration-500 group-hover:opacity-100"
            style={{ background: theme.gradients.glow }}
          />

          <div className="relative">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl text-white shadow-lg"
              style={{ backgroundImage: theme.gradients.button }}
            >
              {benefit.icon}
            </div>

            <h3 className="mt-8 text-2xl font-bold">{benefit.title}</h3>

            <p className="mt-4 leading-7" style={{ color: theme.colors.secondary }}>{benefit.description}</p>

            <div className="mt-8 flex items-center gap-2 text-sm font-medium" style={{ color: theme.colors.accent }}>
              Discover more
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function BenefitsList({ items, theme }: ListProps) {
  return (
    <div className="mt-20 divide-y border-t" style={{ borderColor: theme.colors.border }}>
      {items.map((benefit, index) => (
        <div key={index} className="flex items-start gap-6 py-8">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl text-white"
            style={{ backgroundImage: theme.gradients.button }}
          >
            {benefit.icon}
          </div>

          <div>
            <h3 className="text-xl font-bold">{benefit.title}</h3>
            <p className="mt-2 leading-7" style={{ color: theme.colors.secondary }}>{benefit.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// Numbered, no card chrome, two-column - the same restrained/editorial treatment
// StatsInline and FAQTwoColumn already give their sections, so a "minimal"/"editorial"
// design family reads consistently restrained across every section, not just some.
function BenefitsMinimal({ items, theme }: ListProps) {
  return (
    <div className="mt-20 grid gap-x-12 gap-y-10 md:grid-cols-2">
      {items.map((benefit, index) => (
        <div key={index} className="flex items-start gap-5">
          <span className="text-sm font-bold" style={{ color: theme.colors.accent }}>
            {String(index + 1).padStart(2, "0")}
          </span>

          <div>
            <h3 className="text-lg font-bold" style={{ color: theme.colors.primary }}>{benefit.title}</h3>
            <p className="mt-2 leading-7" style={{ color: theme.colors.secondary }}>{benefit.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

const BENEFITS_VARIANTS: Record<string, (props: ListProps) => React.ReactElement> = {
  cards: BenefitsCards,
  list: BenefitsList,
  minimal: BenefitsMinimal,
};

export default function Benefits({ items, theme, layout, rhythm, variant }: BenefitsProps) {
  const Variant = (variant && BENEFITS_VARIANTS[variant]) || BenefitsCards;

  return (
    <SectionShell theme={theme} layout={layout} rhythm={rhythm}>
      <SectionHeader
        theme={theme}
        layout={layout}
        eyebrow="Why choose us"
        title={
          <>
            Benefits that make
            <br />
            the difference
          </>
        }
        description="Designed to help businesses build trust, increase conversions and deliver a better experience to every visitor."
      />

      <Variant items={items} theme={theme} layout={layout} />
    </SectionShell>
  );
}
