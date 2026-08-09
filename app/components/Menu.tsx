import type { MenuItem } from "@/app/types/landing";
import type { ThemeConfig } from "@/app/styles/theme";
import type { LayoutPersonality } from "@/app/styles/layout";
import type { SectionHeading } from "./renderers/SectionRenderer";

import SectionShell from "./ui/SectionShell";
import SectionHeader from "./ui/SectionHeader";
import EditableText from "./editor/EditableText";

type Props = {
  items: MenuItem[];
  theme: ThemeConfig;
  layout: LayoutPersonality;
  rhythm: "dense" | "standard" | "breather";
  variant?: string;
  heading?: SectionHeading;
  onUpdateContent?: (content: MenuItem[]) => void;
};

// A MENU IS NOT A PRICING TABLE
//
// The existing Pricing component renders three tiers in bordered cards with a highlighted
// "most popular" column - the shape of a software subscription. Applied to a restaurant it
// says the wrong thing about the business before a word is read: that you are choosing a
// plan, not ordering dinner.
//
// A menu is a list. Dish on the left, price on the right, description underneath, leader
// dots or a rule between them - the form is centuries old and instantly legible, and every
// restaurant site that works uses it. Nothing here is a card.
function commitAt(items: MenuItem[], index: number, field: keyof MenuItem, onUpdate?: (next: MenuItem[]) => void) {
  return onUpdate && ((value: string) => onUpdate(items.map((item, i) => (i === index ? { ...item, [field]: value } : item))));
}

export default function Menu({ items, theme, layout, rhythm, heading, onUpdateContent }: Props) {
  if (items.length === 0) return null;

  return (
    <SectionShell theme={theme} layout={layout} rhythm={rhythm}>
      {/* The hero CTA links here. Without a target the button scrolls nowhere. */}
      <div id="menu" style={{ scrollMarginTop: 24 }} />
      <SectionHeader
        theme={theme}
        layout={layout}
        eyebrow={heading?.eyebrow}
        title={heading?.title ?? "Menu"}
        description={heading?.description}
      />

      <div className="mx-auto mt-12 max-w-2xl">
        {items.map((item, index) => (
          <div
            key={index}
            className="group flex items-baseline gap-4 py-5"
            style={{ borderBottom: index < items.length - 1 ? `1px solid ${theme.colors.border}` : undefined }}
          >
            <div className="min-w-0 flex-1">
              <EditableText
                as="div"
                className="font-semibold"
                style={{ ...theme.typography.subtitle, color: theme.colors.primary }}
                value={item.name}
                onCommit={commitAt(items, index, "name", onUpdateContent)}
              />
              {item.description && (
                <EditableText
                  as="p"
                  className="mt-1 text-sm leading-relaxed"
                  style={{ color: theme.colors.secondary }}
                  value={item.description}
                  onCommit={commitAt(items, index, "description", onUpdateContent)}
                  multiline
                />
              )}
            </div>

            {/* The price sits on its own baseline against the dish, the way a printed menu
                sets it - not inside a badge, and never styled as a call to action. */}
            <EditableText
              as="div"
              className="shrink-0 tabular-nums font-semibold"
              style={{ color: theme.colors.accent }}
              value={item.price}
              onCommit={commitAt(items, index, "price", onUpdateContent)}
            />

            {onUpdateContent && items.length > 1 && (
              <button
                type="button"
                aria-label={`Remover ${item.name}`}
                onClick={() => onUpdateContent(items.filter((_, i) => i !== index))}
                className="shrink-0 rounded px-2 text-sm opacity-0 transition group-hover:opacity-100 focus:opacity-100"
                style={{ color: theme.colors.secondary }}
              >
                ✕
              </button>
            )}
          </div>
        ))}

        {/* A RESTAURANT HAS MORE THAN THREE DISHES
            The form asks for three, and until now three was all a menu could ever hold -
            there was no way to add a fourth anywhere in the product. An owner reading
            "Ficam na ementa" next to three boxes reasonably concluded that his site would
            show three dishes, which for a restaurant looks like a snack bar.

            No new operation was needed: UpdateContent already replaces the whole list, so
            adding a dish is the same write as renaming one. */}
        {onUpdateContent && (
          <button
            type="button"
            onClick={() => onUpdateContent([...items, { name: "Novo prato", price: "0,00 €", description: "" }])}
            className="mt-6 w-full rounded-xl border border-dashed py-3 text-sm font-medium transition hover:opacity-80"
            style={{ borderColor: theme.colors.border, color: theme.colors.secondary }}
          >
            + Acrescentar prato
          </button>
        )}
      </div>
    </SectionShell>
  );
}
