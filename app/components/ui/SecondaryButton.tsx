import type { ThemeConfig } from "@/app/styles/theme";

type Props = {
  children: React.ReactNode;
  theme: ThemeConfig;
  // See PrimaryButton: a control that looks clickable and does nothing is worse than no
  // control. This used to be "show me the menu", an anchor further down the same page - and
  // that is why nothing here ever left the site.
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
    // O segundo botão passou a ser "Como chegar", que é o Google Maps. Sem isto, tocar-lhe
    // substituía a página do restaurante pelo mapa - e no telemóvel é a aplicação de mapas
    // a tomar conta do ecrã. Para voltar à ementa é preciso saber que existe um botão de
    // retroceder algures, e a maior parte das pessoas não volta.
    //
    // A mesma regra do PrimaryButton, e pela mesma razão: só o que sai do site é que abre
    // fora. Uma âncora na própria página nunca deve abrir um separador novo.
    const leavesTheSite = /^https?:\/\//i.test(href);

    return (
      <a
        href={href}
        className={className}
        style={style}
        {...(leavesTheSite ? { target: "_blank", rel: "noreferrer" } : {})}
      >
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
