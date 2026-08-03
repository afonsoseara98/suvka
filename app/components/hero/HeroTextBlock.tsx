import type { HeroData } from "@/app/types/landing";
import type { ThemeConfig } from "@/app/styles/theme";
import type { LayoutPersonality } from "@/app/styles/layout";

import Badge from "../ui/Badge";
import PrimaryButton from "../ui/PrimaryButton";
import SecondaryButton from "../ui/SecondaryButton";

type Props = {
  data: HeroData;
  theme: ThemeConfig;
  layout: LayoutPersonality;
  align?: "left" | "center";
};

export default function HeroTextBlock({ data, theme, layout, align = "left" }: Props) {
  const isCentered = align === "center";
  const isStacked = layout.ctaLayout === "stacked";

  return (
    <div className={isCentered ? "flex flex-col items-center text-center" : ""}>
      <Badge theme={theme}>✨ {data.badge}</Badge>

      <h1
        className={`mt-8 leading-none ${theme.typography.hero}`}
        style={{ color: theme.colors.primary }}
      >
        {data.title}
        <span
          className="block bg-clip-text text-transparent"
          style={{ backgroundImage: theme.gradients.hero }}
        >
          {data.highlightWord}
        </span>
      </h1>

      <p
        className={`mt-8 ${theme.typography.subtitle} ${isCentered ? "max-w-2xl" : "max-w-xl"}`}
        style={{ color: theme.colors.secondary }}
      >
        {data.subtitle}
      </p>

      <div
        className={
          isStacked
            ? `mt-10 flex flex-col gap-3 ${isCentered ? "items-center" : "items-start"}`
            : `mt-10 flex flex-wrap gap-4 ${isCentered ? "justify-center" : ""}`
        }
      >
        <PrimaryButton theme={theme}>{data.primaryCTA}</PrimaryButton>
        <SecondaryButton theme={theme}>{data.secondaryCTA}</SecondaryButton>
      </div>
    </div>
  );
}
