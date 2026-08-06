import type { LandingPage, SectionRhythm } from "@/app/types/landing";
import type { ThemeConfig } from "@/app/styles/theme";
import type { LayoutPersonality } from "@/app/styles/layout";
import { updateArrayItemField } from "@/app/editor/contentEdits";
import SectionShell from "./ui/SectionShell";
import SectionHeader from "./ui/SectionHeader";
import EditableText from "./editor/EditableText";

type Items = LandingPage["features"];

type FeaturesProps = {
  items: Items;
  theme: ThemeConfig;
  layout: LayoutPersonality;
  rhythm: SectionRhythm;
  variant?: string;
  onUpdateContent?: (content: Items) => void;
};

type ListProps = { items: Items; theme: ThemeConfig; layout: LayoutPersonality; onUpdateContent?: (content: Items) => void };

function FeaturesGrid({ items, theme, layout, onUpdateContent }: ListProps) {
  return (
    <div className={`mt-20 grid gap-8 ${layout.gridColumns}`}>
      {items.map((feature, index) => (
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
          <div
            className="absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl opacity-0 transition duration-500 group-hover:opacity-100"
            style={{ background: theme.gradients.glow }}
          />

          <div className="relative">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl text-white shadow-lg"
              style={{ backgroundImage: theme.gradients.button }}
            >
              {feature.icon}
            </div>

            <EditableText
              as="h3"
              className="mt-8 text-2xl font-bold"
              value={feature.title}
              onCommit={onUpdateContent && ((v) => onUpdateContent(updateArrayItemField(items, index, "title", v)))}
            />

            <EditableText
              as="p"
              className="mt-4 leading-7"
              style={{ color: theme.colors.secondary }}
              value={feature.description}
              onCommit={onUpdateContent && ((v) => onUpdateContent(updateArrayItemField(items, index, "description", v)))}
              multiline
            />

            <div className="mt-8 flex items-center gap-2 text-sm font-medium" style={{ color: theme.colors.accent }}>
              Learn more
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FeaturesList({ items, theme, onUpdateContent }: ListProps) {
  return (
    <div className="mt-20 divide-y border-t" style={{ borderColor: theme.colors.border }}>
      {items.map((feature, index) => (
        <div key={index} className="flex items-start gap-6 py-8">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl text-white"
            style={{ backgroundImage: theme.gradients.button }}
          >
            {feature.icon}
          </div>

          <div>
            <EditableText
              as="h3"
              className="text-xl font-bold"
              value={feature.title}
              onCommit={onUpdateContent && ((v) => onUpdateContent(updateArrayItemField(items, index, "title", v)))}
            />
            <EditableText
              as="p"
              className="mt-2 leading-7"
              style={{ color: theme.colors.secondary }}
              value={feature.description}
              onCommit={onUpdateContent && ((v) => onUpdateContent(updateArrayItemField(items, index, "description", v)))}
              multiline
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// Editorial treatment: each feature is its own full-width row, icon and copy
// alternating sides down the page - a considered read rather than a scan, the
// "editorial"/"elegant"/"highEndAgency" design families' natural fit.
function FeaturesAlternating({ items, theme, onUpdateContent }: ListProps) {
  return (
    <div className="mt-20 space-y-16">
      {items.map((feature, index) => {
        const reversed = index % 2 === 1;
        return (
          <div key={index} className={`flex flex-col items-center gap-8 md:flex-row ${reversed ? "md:flex-row-reverse" : ""}`}>
            <div
              className="flex h-24 w-24 shrink-0 items-center justify-center text-4xl text-white"
              style={{ backgroundImage: theme.gradients.button, borderRadius: theme.radius.lg }}
            >
              {feature.icon}
            </div>

            <div className={reversed ? "md:text-right" : ""}>
              <EditableText
                as="h3"
                className="text-2xl font-bold"
                value={feature.title}
                onCommit={onUpdateContent && ((v) => onUpdateContent(updateArrayItemField(items, index, "title", v)))}
              />
              <EditableText
                as="p"
                className="mt-3 max-w-xl leading-7"
                style={{ color: theme.colors.secondary }}
                value={feature.description}
                onCommit={onUpdateContent && ((v) => onUpdateContent(updateArrayItemField(items, index, "description", v)))}
                multiline
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Bento treatment: the first feature spans the full width as a headline card, the
// rest sit in a tighter grid beneath it - an asymmetric, high-density layout that
// suits the "bold"/"startupDashboard"/"playful" families' more energetic identity.
function FeaturesBento({ items, theme, layout, onUpdateContent }: ListProps) {
  const [lead, ...rest] = items;

  return (
    <div className="mt-20 grid gap-6">
      {lead && (
        <div
          className="border p-10"
          style={{ borderColor: theme.colors.border, background: theme.colors.card, borderRadius: theme.radius.xl }}
        >
          <div
            className="flex h-16 w-16 items-center justify-center text-3xl text-white"
            style={{ backgroundImage: theme.gradients.button, borderRadius: theme.radius.lg }}
          >
            {lead.icon}
          </div>
          <EditableText
            as="h3"
            className="mt-6 text-3xl font-bold"
            value={lead.title}
            onCommit={onUpdateContent && ((v) => onUpdateContent(updateArrayItemField(items, 0, "title", v)))}
          />
          <EditableText
            as="p"
            className="mt-3 max-w-2xl leading-7"
            style={{ color: theme.colors.secondary }}
            value={lead.description}
            onCommit={onUpdateContent && ((v) => onUpdateContent(updateArrayItemField(items, 0, "description", v)))}
            multiline
          />
        </div>
      )}

      {rest.length > 0 && (
        <div className={`grid gap-6 ${layout.gridColumns}`}>
          {rest.map((feature, index) => {
            const itemIndex = index + 1; // rest[] is items[] minus the lead item at 0
            return (
              <div
                key={index}
                className="border p-6"
                style={{ borderColor: theme.colors.border, background: theme.colors.card, borderRadius: theme.radius.lg }}
              >
                <div
                  className="flex h-12 w-12 items-center justify-center text-xl text-white"
                  style={{ backgroundImage: theme.gradients.button, borderRadius: theme.radius.md }}
                >
                  {feature.icon}
                </div>
                <EditableText
                  as="h3"
                  className="mt-4 text-lg font-bold"
                  value={feature.title}
                  onCommit={onUpdateContent && ((v) => onUpdateContent(updateArrayItemField(items, itemIndex, "title", v)))}
                />
                <EditableText
                  as="p"
                  className="mt-2 text-sm leading-6"
                  style={{ color: theme.colors.secondary }}
                  value={feature.description}
                  onCommit={onUpdateContent && ((v) => onUpdateContent(updateArrayItemField(items, itemIndex, "description", v)))}
                  multiline
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const FEATURES_VARIANTS: Record<string, (props: ListProps) => React.ReactElement> = {
  list: FeaturesList,
  alternating: FeaturesAlternating,
  bento: FeaturesBento,
  grid: FeaturesGrid,
};

export default function Features({ items, theme, layout, rhythm, variant, onUpdateContent }: FeaturesProps) {
  const Variant = (variant && FEATURES_VARIANTS[variant]) || FeaturesGrid;

  return (
    <SectionShell theme={theme} layout={layout} rhythm={rhythm}>
      <SectionHeader
        theme={theme}
        layout={layout}
        eyebrow="Everything you need"
        title={
          <>
            Powerful features,
            <br />
            built for conversions
          </>
        }
        description="Every landing page generated by Noctra is designed to maximize trust, engagement and conversion."
      />

      <Variant items={items} theme={theme} layout={layout} onUpdateContent={onUpdateContent} />
    </SectionShell>
  );
}
