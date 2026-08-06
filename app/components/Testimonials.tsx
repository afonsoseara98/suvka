import type { ThemeConfig } from "@/app/styles/theme";
import type { LayoutPersonality } from "@/app/styles/layout";
import type { SectionRhythm } from "@/app/types/landing";
import { updateArrayItemField } from "@/app/editor/contentEdits";
import SectionShell from "./ui/SectionShell";
import SectionHeader from "./ui/SectionHeader";
import EditableText from "./editor/EditableText";

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
  onUpdateContent?: (content: Testimonial[]) => void;
};

type ListProps = {
  items: Testimonial[];
  theme: ThemeConfig;
  layout: LayoutPersonality;
  onUpdateContent?: (content: Testimonial[]) => void;
};

function TestimonialsCards({ items, theme, layout, onUpdateContent }: ListProps) {
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
            &ldquo;
            <EditableText
              value={item.text}
              onCommit={onUpdateContent && ((v) => onUpdateContent(updateArrayItemField(items, index, "text", v)))}
              multiline
            />
            &rdquo;
          </p>

          <div className="mt-8">
            <EditableText
              as="div"
              className="font-bold"
              value={item.name}
              onCommit={onUpdateContent && ((v) => onUpdateContent(updateArrayItemField(items, index, "name", v)))}
            />
            <EditableText
              as="div"
              style={{ color: theme.colors.secondary }}
              value={item.company}
              onCommit={onUpdateContent && ((v) => onUpdateContent(updateArrayItemField(items, index, "company", v)))}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function TestimonialsMinimal({ items, theme, onUpdateContent }: ListProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-14 text-center">
      {items.map((item, index) => (
        <div key={index}>
          <p className="text-2xl font-medium leading-9">
            &ldquo;
            <EditableText
              value={item.text}
              onCommit={onUpdateContent && ((v) => onUpdateContent(updateArrayItemField(items, index, "text", v)))}
              multiline
            />
            &rdquo;
          </p>

          <div className="mt-6 text-sm" style={{ color: theme.colors.secondary }}>
            <EditableText
              as="span"
              className="font-semibold"
              style={{ color: theme.colors.primary }}
              value={item.name}
              onCommit={onUpdateContent && ((v) => onUpdateContent(updateArrayItemField(items, index, "name", v)))}
            />{" "}
            ·{" "}
            <EditableText
              value={item.company}
              onCommit={onUpdateContent && ((v) => onUpdateContent(updateArrayItemField(items, index, "company", v)))}
            />
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
function TestimonialsSpotlight({ items, theme, layout, onUpdateContent }: ListProps) {
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
          <p className="text-2xl font-medium leading-9">
            &ldquo;
            <EditableText
              value={lead.text}
              onCommit={onUpdateContent && ((v) => onUpdateContent(updateArrayItemField(items, 0, "text", v)))}
              multiline
            />
            &rdquo;
          </p>
          <div className="mt-6">
            <EditableText
              as="div"
              className="font-bold"
              value={lead.name}
              onCommit={onUpdateContent && ((v) => onUpdateContent(updateArrayItemField(items, 0, "name", v)))}
            />
            <EditableText
              as="div"
              style={{ color: theme.colors.secondary }}
              value={lead.company}
              onCommit={onUpdateContent && ((v) => onUpdateContent(updateArrayItemField(items, 0, "company", v)))}
            />
          </div>
        </div>
      )}

      {rest.length > 0 && (
        <div className={`mt-10 grid gap-6 ${layout.gridColumns}`}>
          {rest.map((item, index) => {
            const itemIndex = index + 1; // rest[] is items[] minus the lead item at 0
            return (
              <div
                key={index}
                className="border"
                style={{ borderColor: theme.colors.border, background: theme.colors.card, borderRadius: theme.radius.lg, padding: theme.spacing.md }}
              >
                <p className="text-sm leading-6" style={{ color: theme.colors.secondary }}>
                  &ldquo;
                  <EditableText
                    value={item.text}
                    onCommit={onUpdateContent && ((v) => onUpdateContent(updateArrayItemField(items, itemIndex, "text", v)))}
                    multiline
                  />
                  &rdquo;
                </p>
                <EditableText
                  as="div"
                  className="mt-4 text-sm font-semibold"
                  value={item.name}
                  onCommit={onUpdateContent && ((v) => onUpdateContent(updateArrayItemField(items, itemIndex, "name", v)))}
                />
              </div>
            );
          })}
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

export default function Testimonials({ items, theme, layout, rhythm, variant, onUpdateContent }: TestimonialsProps) {
  const Variant = (variant && TESTIMONIALS_VARIANTS[variant]) || TestimonialsCards;

  return (
    <SectionShell theme={theme} layout={layout} rhythm={rhythm}>
      <SectionHeader theme={theme} layout={layout} title="Testimonials" />

      <div className="mt-10">
        <Variant items={items} theme={theme} layout={layout} onUpdateContent={onUpdateContent} />
      </div>
    </SectionShell>
  );
}
