import type { ThemeConfig } from "@/app/styles/theme";
import type { DecorativeStyle } from "@/app/styles/layout";

type Props = {
  children: React.ReactNode;
  theme: ThemeConfig;
  decorative?: DecorativeStyle;
  opacity?: number;
};

// Renders the LayoutPersonality "decorative" treatment behind its children. Started
// as a hero-only radial glow; generalized so Features/Benefits/Hero all share one
// implementation of "glow | grid-lines | none" instead of each hand-rolling its own
// background div. WHICH treatment is still a small structural choice (glow and
// grid-lines are different rendering techniques, not interpolable into each other) -
// `opacity` (StrategyDNA.decorationDensity, compiled through) is the continuous part,
// replacing what used to be a fixed 0.4 constant for grid-lines and no control at all
// for glow.
export default function GlowBackground({
  children,
  theme,
  decorative = "glow",
  opacity = 1,
}: Props) {
  return (
    <div className="relative overflow-hidden">
      {decorative === "glow" && (
        <div
          className="
            absolute
            left-1/2
            top-0
            h-[700px]
            w-[700px]
            -translate-x-1/2
            rounded-full
            blur-[180px]
          "
          style={{
            background: theme.gradients.glow,
            opacity,
          }}
        />
      )}

      {decorative === "grid-lines" && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(${theme.colors.border} 1px, transparent 1px),
              linear-gradient(90deg, ${theme.colors.border} 1px, transparent 1px)
            `,
            backgroundSize: "64px 64px",
            maskImage: "linear-gradient(to bottom, black, transparent)",
            opacity: opacity * 0.4,
          }}
        />
      )}

      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
