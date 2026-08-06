import type { ThemeConfig } from "@/app/styles/theme";

type Props = {
  children: React.ReactNode;
  theme: ThemeConfig;
  // See PrimaryButton: a control that looks clickable and does nothing is worse than no
  // control. The secondary action on a restaurant page is "show me the menu", which is an
  // anchor to a section further down the same page.
  href?: string;
};

export default function SecondaryButton({ children, theme, href }: Props) {
  const className = `
        inline-block
        rounded-xl
        border
        px-8
        py-4
        text-center
        no-underline
        backdrop-blur-xl

        transition
      `;

  const style = {
    borderColor: theme.colors.border,
    background: theme.colors.card,
    color: theme.colors.primary,
    ...theme.typography.button,
  };

  if (href) {
    return (
      <a href={href} className={className} style={style}>
        {children}
      </a>
    );
  }

  return (
    <button className={className} style={style}>
      {children}
    </button>
  );
}
