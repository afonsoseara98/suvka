import { useState } from "react";
import type { ThemeConfig } from "@/app/styles/theme";
import type { LayoutPersonality } from "@/app/styles/layout";
import { resolveSectionSpacing } from "@/app/styles/layout";
import type { SectionRhythm } from "@/app/types/landing";
import SectionHeader from "./ui/SectionHeader";

type FAQProps = {
  items: {
    question: string;
    answer: string;
  }[];
  theme: ThemeConfig;
  layout: LayoutPersonality;
  rhythm: SectionRhythm;
};

// SectionPlanner.ts always assigns FAQ the "accordion" variant - this is what makes
// that real rather than a label with no matching behavior. Each item toggles
// independently (not a single-open accordion) so opening one never surprises the
// user by closing another.
export default function FAQ({ items, theme, layout, rhythm }: FAQProps) {
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
    <section className={resolveSectionSpacing(layout.sectionSpacing, rhythm)}>
      <div className={`mx-auto ${layout.sectionWidth}`}>
        <SectionHeader theme={theme} layout={layout} title="FAQ" />

        <div className="mt-10 space-y-6">

          {items.map((item, index) => {
            const isOpen = openIndexes.has(index);
            const panelId = `faq-panel-${index}`;
            const buttonId = `faq-button-${index}`;

            return (
              <div
                key={index}
                className={`${layout.cardRadius} border ${layout.cardPadding}`}
                style={{ borderColor: theme.colors.border, background: theme.colors.card, color: theme.colors.primary }}
              >
                <button
                  type="button"
                  id={buttonId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggle(index)}
                  className="flex w-full items-center justify-between gap-4 text-left font-bold"
                >
                  {item.question}
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
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}

        </div>
      </div>
    </section>
  );
}