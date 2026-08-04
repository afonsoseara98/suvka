import type { ThemeConfig } from "@/app/styles/theme";

type Props = {
  children: React.ReactNode;
  theme: ThemeConfig;
};

export default function PrimaryButton({
  children,
  theme,
}: Props) {
  return (
    <button
      className="
        rounded-xl
        px-8
        py-4
        text-white

        transition-all
        duration-300

        hover:scale-105
        hover:shadow-2xl
      "
      style={{
        backgroundImage: theme.gradients.button,
        ...theme.typography.button,
      }}
    >
      {children}
    </button>
  );
}