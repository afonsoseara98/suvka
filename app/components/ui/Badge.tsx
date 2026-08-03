import type { ThemeConfig } from "@/app/styles/theme";

type BadgeProps = {
  children: React.ReactNode;
  theme: ThemeConfig;
};

export default function Badge({
  children,
  theme,
}: BadgeProps) {
  return (
    <span
      className="
        inline-flex
        items-center
        rounded-full
        border
        px-4
        py-2
        text-sm
        font-medium
        backdrop-blur-xl
      "
      style={{
        borderColor: theme.colors.border,
        background: theme.colors.card,
        color: theme.colors.primary,
      }}
    >
      {children}
    </span>
  );
}