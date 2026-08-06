import type { ThemeConfig } from "@/app/styles/theme";
import type { LayoutPersonality } from "@/app/styles/layout";
import { responsiveSectionSpacing } from "@/app/styles/layout";
import type { SectionRhythm, FooterData } from "@/app/types/landing";
import { updateFooterField } from "@/app/editor/contentEdits";
import EditableText from "./editor/EditableText";

type FooterProps = {
  company: string;
  email: string;
  copyright: string;
  theme: ThemeConfig;
  layout: LayoutPersonality;
  rhythm: SectionRhythm;
  onUpdateContent?: (content: FooterData) => void;
};

export default function Footer({
  company,
  email,
  copyright,
  theme,
  layout,
  rhythm,
  onUpdateContent,
}: FooterProps) {
  const content: FooterData = { company, email, copyright };

  function commit(field: keyof FooterData): ((value: string) => void) | undefined {
    return onUpdateContent && ((value: string) => onUpdateContent(updateFooterField(content, field, value)));
  }

  return (
    <footer style={{ marginTop: responsiveSectionSpacing(layout.sectionSpacingPx, rhythm) }}>
      <div
        className="mx-auto border-t py-12 text-center"
        style={{ maxWidth: layout.sectionWidthPx, borderColor: theme.colors.border, color: theme.colors.secondary }}
      >

        <EditableText as="div" className="font-bold" value={company} onCommit={commit("company")} />

        <EditableText as="div" className="mt-2" value={email} onCommit={commit("email")} />

        <EditableText as="div" className="mt-6 text-sm" value={copyright} onCommit={commit("copyright")} />

      </div>
    </footer>
  );
}
