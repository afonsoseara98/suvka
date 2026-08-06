"use client";

import { useState } from "react";
import type { ThemeConfig } from "@/app/styles/theme";
import type { LayoutPersonality } from "@/app/styles/layout";
import type { SectionRhythm } from "@/app/types/landing";
import { updateArrayItemField } from "@/app/editor/contentEdits";
import SectionShell from "./ui/SectionShell";
import SectionHeader from "./ui/SectionHeader";
import EditableText from "./editor/EditableText";

type Item = { question: string; answer: string };

type FAQProps = {
  items: Item[];
  theme: ThemeConfig;
  layout: LayoutPersonality;
  rhythm: SectionRhythm;
  variant?: string;
  onUpdateContent?: (content: Item[]) => void;
};

type ListProps = { items: Item[]; theme: ThemeConfig; onUpdateContent?: (content: Item[]) => void };

// SectionPlanner.ts's default - each item toggles independently (not a single-open
// accordion) so opening one never surprises the user by closing another.
function FAQAccordion({ items, theme, onUpdateContent }: ListProps) {
  const [openIndexes, setOpenIndexes] = useState<Set<number>>(new Set());

  function toggle(index: number) {
    setOpenIndexes((current) => {
      const next = new Set(current);

      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }

      return next;
    });
  }

  return (
    <div className="space-y-6">
      {items.map((item, index) => {
        const isOpen = openIndexes.has(index);
        const panelId = `faq-panel-${index}`;
        const buttonId = `faq-button-${index}`;

        return (
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
            <button
              type="button"
              id={buttonId}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => toggle(index)}
              className="flex w-full items-center justify-between gap-4 text-left font-bold"
            >
              {/* EditableText stops click propagation itself when editable, so entering
                  edit mode never also toggles this button - see EditableText.tsx. */}
              <EditableText
                value={item.question}
                onCommit={onUpdateContent && ((v) => onUpdateContent(updateArrayItemField(items, index, "question", v)))}
              />
              <span aria-hidden="true" className={isOpen ? "rotate-180 transition-transform" : "transition-transform"}>
                ▾
              </span>
            </button>

            {isOpen && (
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className="mt-4"
                style={{ color: theme.colors.secondary }}
              >
                <EditableText
                  value={item.answer}
                  onCommit={onUpdateContent && ((v) => onUpdateContent(updateArrayItemField(items, index, "answer", v)))}
                  multiline
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Two-column treatment: every answer is always visible, laid out as a static
// question/answer grid rather than an interactive accordion - a denser, more
// scannable presentation that suits "bold"/"startupDashboard"/"playful" identities,
// where hiding content behind a click reads as unnecessary friction.
function FAQTwoColumn({ items, theme, onUpdateContent }: ListProps) {
  return (
    <div className="grid gap-8 md:grid-cols-2">
      {items.map((item, index) => (
        <div key={index}>
          <EditableText
            as="h3"
            className="font-bold"
            style={{ color: theme.colors.primary }}
            value={item.question}
            onCommit={onUpdateContent && ((v) => onUpdateContent(updateArrayItemField(items, index, "question", v)))}
          />
          <EditableText
            as="p"
            className="mt-2 leading-7"
            style={{ color: theme.colors.secondary }}
            value={item.answer}
            onCommit={onUpdateContent && ((v) => onUpdateContent(updateArrayItemField(items, index, "answer", v)))}
            multiline
          />
        </div>
      ))}
    </div>
  );
}

const FAQ_VARIANTS: Record<string, (props: ListProps) => React.ReactElement> = {
  accordion: FAQAccordion,
  twoColumn: FAQTwoColumn,
};

export default function FAQ({ items, theme, layout, rhythm, variant, onUpdateContent }: FAQProps) {
  const Variant = (variant && FAQ_VARIANTS[variant]) || FAQAccordion;

  return (
    <SectionShell theme={theme} layout={layout} rhythm={rhythm}>
      <SectionHeader theme={theme} layout={layout} title="FAQ" />

      <div className="mt-10">
        <Variant items={items} theme={theme} onUpdateContent={onUpdateContent} />
      </div>
    </SectionShell>
  );
}
