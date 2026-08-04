import type { ThemeConfig } from "@/app/styles/theme";
import type { LayoutPersonality } from "@/app/styles/layout";

type Props = {
  theme: ThemeConfig;
  layout: LayoutPersonality;
  title: React.ReactNode;
  eyebrow?: string;
  description?: string;
};

// Consolidates what used to be near-identical hand-rolled header markup in
// Features/Benefits (eyebrow badge + heading + description) and Testimonials/Pricing/
// FAQ (bare heading) into one place, so LayoutPersonality's headerAlign only has to be
// applied once rather than copy-pasted per section.
export default function SectionHeader({ theme, layout, title, eyebrow, description }: Props) {
  const alignClass = layout.headerAlign === "left" ? "text-left" : "text-center mx-auto";
  const isIntro = Boolean(eyebrow || description);

  return (
    <div className={layout.headerAlign === "left" ? "text-left" : "text-center"}>
      {eyebrow && (
        <span
          className="inline-flex rounded-full border px-4 py-2 text-sm backdrop-blur"
          style={{ borderColor: theme.colors.border, background: theme.colors.card, color: theme.colors.secondary }}
        >
          {eyebrow}
        </span>
      )}

      <h2
        className={isIntro ? `${eyebrow ? "mt-6" : ""} text-5xl font-bold tracking-tight` : undefined}
        style={isIntro ? { color: theme.colors.primary } : { ...theme.typography.title, color: theme.colors.primary }}
      >
        {title}
      </h2>

      {description && (
        <p
          className={`mt-6 max-w-2xl text-lg leading-8 ${alignClass}`}
          style={{ color: theme.colors.secondary }}
        >
          {description}
        </p>
      )}
    </div>
  );
}
