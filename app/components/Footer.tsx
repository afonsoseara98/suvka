import type { ThemeConfig } from "@/app/styles/theme";
import type { LayoutPersonality } from "@/app/styles/layout";
import { resolveSectionSpacing } from "@/app/styles/layout";
import type { SectionRhythm } from "@/app/types/landing";

type FooterProps = {
  company: string;
  email: string;
  copyright: string;
  theme: ThemeConfig;
  layout: LayoutPersonality;
  rhythm: SectionRhythm;
};

export default function Footer({
  company,
  email,
  copyright,
  theme,
  layout,
  rhythm,
}: FooterProps) {
  return (
    <footer style={{ marginTop: resolveSectionSpacing(layout.sectionSpacingPx, rhythm) }}>
      <div
        className="mx-auto border-t py-12 text-center"
        style={{ maxWidth: layout.sectionWidthPx, borderColor: theme.colors.border, color: theme.colors.secondary }}
      >

        <div className="font-bold">
          {company}
        </div>

        <div className="mt-2">
          {email}
        </div>

        <div className="mt-6 text-sm">
          {copyright}
        </div>

      </div>
    </footer>
  );
}
