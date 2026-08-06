import type { ThemeConfig } from "@/app/styles/theme";
import type { LayoutPersonality } from "@/app/styles/layout";
import type { SectionRhythm } from "@/app/types/landing";
import { updateArrayItemField, updatePlanFeature } from "@/app/editor/contentEdits";
import SectionShell from "./ui/SectionShell";
import Badge from "./ui/Badge";
import SectionHeader from "./ui/SectionHeader";
import EditableText from "./editor/EditableText";
import type { SectionHeading } from "./renderers/SectionRenderer";

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
  // Per-business heading copy. Absent on pages stored before headings became content,
  // in which case the section falls back to a plain noun rather than inventing one.
  heading?: SectionHeading;
  variant?: string;
  onUpdateContent?: (content: Plan[]) => void;
};

type ListProps = { plans: Plan[]; theme: ThemeConfig; layout: LayoutPersonality; onUpdateContent?: (content: Plan[]) => void };

function PricingSimple({ plans, theme, layout, onUpdateContent }: ListProps) {
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
          <EditableText
            as="h3"
            className="text-3xl font-bold"
            value={plan.name}
            onCommit={onUpdateContent && ((v) => onUpdateContent(updateArrayItemField(plans, index, "name", v)))}
          />
          <div className="mt-4 text-5xl font-bold">
            €
            <EditableText
              value={plan.price}
              onCommit={onUpdateContent && ((v) => onUpdateContent(updateArrayItemField(plans, index, "price", v)))}
            />
          </div>

          <div className="mt-8 space-y-3">
            {plan.features.map((feature, i) => (
              <div key={i}>
                ✓{" "}
                <EditableText
                  value={feature}
                  onCommit={onUpdateContent && ((v) => onUpdateContent(updatePlanFeature(plans, index, i, v)))}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PricingPremium({ plans, theme, layout, onUpdateContent }: ListProps) {
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

            <EditableText
              as="h3"
              className="text-3xl font-bold"
              value={plan.name}
              onCommit={onUpdateContent && ((v) => onUpdateContent(updateArrayItemField(plans, index, "name", v)))}
            />
            <div className="mt-4 text-5xl font-bold">
              €
              <EditableText
                value={plan.price}
                onCommit={onUpdateContent && ((v) => onUpdateContent(updateArrayItemField(plans, index, "price", v)))}
              />
            </div>

            <div className="mt-8 space-y-3">
              {plan.features.map((feature, i) => (
                <div key={i}>
                  ✓{" "}
                  <EditableText
                    value={feature}
                    onCommit={onUpdateContent && ((v) => onUpdateContent(updatePlanFeature(plans, index, i, v)))}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Comparison treatment: plans as column headers, every distinct feature mentioned by
// any plan as a row - a single table communicates the tier structure at a glance
// instead of asking the reader to compare three separate cards. Suits the
// "corporate"/"startupDashboard" families' more structured identity.
//
// Not wired for inline editing: a row label is deduplicated across every plan that
// shares that exact feature string (Array.from(new Set(...))), so editing one occurrence
// is ambiguous (which plan's feature is it?) - deliberately out of scope, see
// docs plan for this pass. Cells themselves only ever render "✓" or "", never text.
function PricingComparison({ plans, theme }: ListProps) {
  const allFeatures = Array.from(new Set(plans.flatMap((plan) => plan.features)));

  return (
    <div className="overflow-x-auto border" style={{ borderColor: theme.colors.border, borderRadius: theme.radius.lg }}>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
            <th className="p-6 font-medium" style={{ color: theme.colors.secondary }}></th>
            {plans.map((plan, index) => (
              <th key={index} className="p-6 text-center">
                <div className="text-lg font-bold">{plan.name}</div>
                <div className="mt-1 text-2xl font-bold" style={{ color: theme.colors.accent }}>€{plan.price}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allFeatures.map((feature, row) => (
            <tr key={row} style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
              <td className="p-4" style={{ color: theme.colors.secondary }}>{feature}</td>
              {plans.map((plan, col) => (
                <td key={col} className="p-4 text-center" style={{ color: theme.colors.accent }}>
                  {plan.features.includes(feature) ? "✓" : ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const PRICING_VARIANTS: Record<string, (props: ListProps) => React.ReactElement> = {
  premium: PricingPremium,
  comparison: PricingComparison,
  simple: PricingSimple,
};

export default function Pricing({ plans, theme, layout, rhythm, variant, onUpdateContent, heading }: PricingProps) {
  const Variant = (variant && PRICING_VARIANTS[variant]) || PricingSimple;

  return (
    <SectionShell theme={theme} layout={layout} rhythm={rhythm}>
      <SectionHeader theme={theme} layout={layout} eyebrow={heading?.eyebrow} title={heading?.title ?? "Pricing"} description={heading?.description} />

      <div className="mt-10">
        <Variant plans={plans} theme={theme} layout={layout} onUpdateContent={onUpdateContent} />
      </div>
    </SectionShell>
  );
}
