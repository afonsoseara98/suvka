import type { HeroData } from "@/app/types/landing";
import type { ThemeConfig } from "@/app/styles/theme";
import type { LayoutPersonality } from "@/app/styles/layout";
import { updateHeroField } from "@/app/editor/contentEdits";

import Badge from "../ui/Badge";
import PrimaryButton from "../ui/PrimaryButton";
import SecondaryButton from "../ui/SecondaryButton";
import EditableText from "../editor/EditableText";

type Props = {
  data: HeroData;
  theme: ThemeConfig;
  layout: LayoutPersonality;
  align?: "left" | "center";
  onUpdateContent?: (content: HeroData) => void;
};

// The headline used to render as TWO stacked blocks: the whole title, and then
// `highlightWord` again underneath in the accent gradient. But schema.ts instructs the
// model that "highlightWord must be one word that already exists inside the title" - so
// the word was always printed twice. Every generated page read "Fresh Sourdough Every
// Morning / Sourdough": a stutter, in the largest type on the page, on the one element a
// visitor reads before deciding whether to stay. Found by looking at a published page,
// not by a test - nothing about two separately-rendered valid strings is detectably wrong
// from inside the code.
//
// The word is now emphasised WHERE IT ALREADY IS. When the model disobeys and returns a
// word absent from the title, the title simply renders unhighlighted rather than growing
// an orphan word - a missing accent is invisible, a duplicated headline is not.
// The one leaf file every Hero layout (split/centered/minimal) renders its text
// through - see HeroSplitLayout/HeroCenteredLayout/HeroMinimalLayout, all three just
// forward onUpdateContent here unchanged. Each field gets its own EditableText, each
// committing via updateHeroField (app/editor/contentEdits.ts) so a one-field edit still
// sends UpdateContent the full HeroData object it requires.
export default function HeroTextBlock({ data, theme, layout, align = "left", onUpdateContent }: Props) {
  const isCentered = align === "center";
  const isStacked = layout.ctaLayout === "stacked";

  // Must produce `undefined`, not a function that no-ops internally, when
  // onUpdateContent isn't provided - EditableText only checks whether onCommit itself
  // is truthy to decide whether a field is editable at all.
  function commit(field: keyof HeroData): ((value: string) => void) | undefined {
    return onUpdateContent && ((value: string) => onUpdateContent(updateHeroField(data, field, value)));
  }

  return (
    <div className={isCentered ? "flex flex-col items-center text-center" : ""}>
      <Badge theme={theme}>
        ✨ <EditableText value={data.badge} onCommit={commit("badge")} />
      </Badge>

      <h1
        className="mt-8 leading-none"
        style={{ ...theme.typography.hero, color: theme.colors.primary }}
      >
        <EditableText
          value={data.title}
          onCommit={commit("title")}
          highlight={{ word: data.highlightWord, gradient: theme.gradients.hero }}
        />
      </h1>

      <EditableText
        as="p"
        className={`mt-8 ${isCentered ? "max-w-2xl" : "max-w-xl"}`}
        style={{ ...theme.typography.subtitle, color: theme.colors.secondary }}
        value={data.subtitle}
        onCommit={commit("subtitle")}
        multiline
      />

      <div
        className={
          isStacked
            ? `mt-10 flex flex-col gap-3 ${isCentered ? "items-center" : "items-start"}`
            : `mt-10 flex flex-wrap gap-4 ${isCentered ? "justify-center" : ""}`
        }
      >
        <PrimaryButton theme={theme} href={data.primaryHref}>
          <EditableText value={data.primaryCTA} onCommit={commit("primaryCTA")} />
        </PrimaryButton>
        <SecondaryButton theme={theme} href={data.secondaryHref}>
          <EditableText value={data.secondaryCTA} onCommit={commit("secondaryCTA")} />
        </SecondaryButton>
      </div>
    </div>
  );
}
