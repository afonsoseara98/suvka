import type { ThemeConfig } from "@/app/styles/theme";

type Props = {
  children: React.ReactNode;
  theme: ThemeConfig;
};

export default function SecondaryButton({
  children,
  theme,
}: Props) {
  return (
    <button
      className="
        rounded-xl
        border
        px-8
        py-4
        backdrop-blur-xl

        transition
      "
      style={{
        borderColor: theme.colors.border,
        background: theme.colors.card,
        color: theme.colors.primary,
        ...theme.typography.button,
      }}
    >
      {children}
    </button>
  );
}