import type { ThemeConfig } from "@/app/styles/theme";
import type { LayoutPersonality } from "@/app/styles/layout";
import type { SectionRhythm } from "@/app/types/landing";
import { updateArrayItemField } from "@/app/editor/contentEdits";
import SectionShell from "./ui/SectionShell";
import EditableText from "./editor/EditableText";

type Item = { value: string; label: string };

type StatsProps = {
  items: Item[];
  theme: ThemeConfig;
  layout: LayoutPersonality;
  rhythm: SectionRhythm;
  variant?: string;
  onUpdateContent?: (content: Item[]) => void;
};

type ListProps = { items: Item[]; theme: ThemeConfig; layout: LayoutPersonality; onUpdateContent?: (content: Item[]) => void };

function StatsCards({ items, theme, layout, onUpdateContent }: ListProps) {
  return (
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
          <EditableText
            as="div"
            className="text-5xl font-bold"
            style={{ color: theme.colors.primary }}
            value={item.value}
            onCommit={onUpdateContent && ((v) => onUpdateContent(updateArrayItemField(items, index, "value", v)))}
          />

          <EditableText
            as="p"
            className="mt-3"
            style={{ color: theme.colors.secondary }}
            value={item.label}
            onCommit={onUpdateContent && ((v) => onUpdateContent(updateArrayItemField(items, index, "label", v)))}
          />
        </div>
      ))}
    </div>
  );
}

// Inline treatment: no card chrome at all - a single horizontal band of numbers
// separated by dividers, restrained and editorial rather than boxed. Suits
// "minimal"/"corporate"/"editorial"/"elegant"/"highEndAgency" identities.
function StatsInline({ items, theme, onUpdateContent }: ListProps) {
  return (
    <div className="flex flex-wrap items-start justify-center divide-x" style={{ borderColor: theme.colors.border }}>
      {items.map((item, index) => (
        <div key={index} className="px-8 text-center first:pl-0 last:pr-0">
          <EditableText
            as="div"
            className="text-4xl font-bold"
            style={{ color: theme.colors.primary }}
            value={item.value}
            onCommit={onUpdateContent && ((v) => onUpdateContent(updateArrayItemField(items, index, "value", v)))}
          />
          <EditableText
            as="p"
            className="mt-2 text-sm"
            style={{ color: theme.colors.secondary }}
            value={item.label}
            onCommit={onUpdateContent && ((v) => onUpdateContent(updateArrayItemField(items, index, "label", v)))}
          />
        </div>
      ))}
    </div>
  );
}

const STATS_VARIANTS: Record<string, (props: ListProps) => React.ReactElement> = {
  cards: StatsCards,
  inline: StatsInline,
};

export default function Stats({ items, theme, layout, rhythm, variant, onUpdateContent }: StatsProps) {
  const Variant = (variant && STATS_VARIANTS[variant]) || StatsCards;

  return (
    <SectionShell theme={theme} layout={layout} rhythm={rhythm}>
      <Variant items={items} theme={theme} layout={layout} onUpdateContent={onUpdateContent} />
    </SectionShell>
  );
}
