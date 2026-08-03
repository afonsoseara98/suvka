import type { ThemeConfig } from "@/app/styles/theme";

type Props = {
  children: React.ReactNode;
  theme: ThemeConfig;
};

export default function GlassCard({
  children,
  theme,
}: Props) {
  return (
    <div
      className="
        rounded-3xl
        border
        p-6
        backdrop-blur-xl
      "
      style={{
        borderColor: theme.colors.border,
        background: theme.colors.card,
        color: theme.colors.primary,
      }}
    >
      {children}
    </div>
  );
}