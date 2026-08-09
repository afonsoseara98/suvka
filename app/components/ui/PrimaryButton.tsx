import type { ThemeConfig } from "@/app/styles/theme";

type Props = {
  children: React.ReactNode;
  theme: ThemeConfig;
  // When a destination exists the control becomes a real link.
  //
  // A restaurant's primary call to action is "phone us", and it was a <button> with no
  // handler - a dead control on the single thing the page exists to make happen. On a
  // phone, where most of these visits happen, tel: turns the whole booking into one tap.
  href?: string;
};

export default function PrimaryButton({ children, theme, href }: Props) {
  const className = `
        inline-block
        rounded-xl
        px-8
        py-4
        text-white
        text-center
        no-underline

        transition-all
        duration-300

        hover:scale-105
        hover:shadow-2xl
      `;

  const style = {
    backgroundImage: theme.gradients.button,
    ...theme.typography.button,
  };

  if (href) {
    // A booking link goes to somebody else's site - TheFork, or whatever the restaurant
    // already uses - and following it in this tab closes the restaurant's own page behind
    // the customer. tel: and in-page anchors must NOT do this: a new tab for a phone dial
    // leaves an empty window behind on every phone.
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
