import type { ThemeConfig } from "@/app/styles/theme";
import type { LayoutPersonality } from "@/app/styles/layout";
import type { SectionRhythm } from "@/app/types/landing";
import SectionShell from "./ui/SectionShell";
import Badge from "./ui/Badge";
import SectionHeader from "./ui/SectionHeader";

type Plan = {
  name: string;
  price: string;
  features: string[];
};

type PricingProps = {
  plans: Plan[];
  theme: ThemeConfig;
  layout: LayoutPersonality;
  rhythm: SectionRhythm;
  variant?: string;
};

type ListProps = { plans: Plan[]; theme: ThemeConfig; layout: LayoutPersonality };

function PricingSimple({ plans, theme, layout }: ListProps) {
  return (
    <div className={`grid gap-8 ${layout.gridColumns}`}>
      {plans.map((plan, index) => (
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
          <h3 className="text-3xl font-bold">{plan.name}</h3>
          <div className="mt-4 text-5xl font-bold">€{plan.price}</div>

          <div className="mt-8 space-y-3">
            {plan.features.map((feature, i) => (
              <div key={i}>✓ {feature}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PricingPremium({ plans, theme, layout }: ListProps) {
  const featuredIndex = Math.min(1, plans.length - 1);

  return (
    <div className={`grid gap-8 ${layout.gridColumns}`}>
      {plans.map((plan, index) => {
        const isFeatured = index === featuredIndex;

        return (
          <div
            key={index}
            className={isFeatured ? "relative border-2 shadow-2xl md:-translate-y-4" : "border"}
            style={{
              borderRadius: theme.radius.xl,
              padding: theme.spacing.lg,
              ...(isFeatured
                ? {
                    borderColor: theme.colors.accent,
                    background: theme.colors.card,
                    color: theme.colors.primary,
                    boxShadow: `0 25px 50px -12px ${theme.colors.accent}33`,
                  }
                : { borderColor: theme.colors.border, background: theme.colors.card, color: theme.colors.primary }),
            }}
          >
            {isFeatured && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <Badge theme={theme}>⭐ Most Popular</Badge>
              </div>
            )}

            <h3 className="text-3xl font-bold">{plan.name}</h3>
            <div className="mt-4 text-5xl font-bold">€{plan.price}</div>

            <div className="mt-8 space-y-3">
              {plan.features.map((feature, i) => (
                <div key={i}>✓ {feature}</div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Pricing({ plans, theme, layout, rhythm, variant }: PricingProps) {
  return (
    <SectionShell theme={theme} layout={layout} rhythm={rhythm}>
      <SectionHeader theme={theme} layout={layout} title="Pricing" />

      <div className="mt-10">
        {variant === "premium" ? (
          <PricingPremium plans={plans} theme={theme} layout={layout} />
        ) : (
          <PricingSimple plans={plans} theme={theme} layout={layout} />
        )}
      </div>
    </SectionShell>
  );
}
