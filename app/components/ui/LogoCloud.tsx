import type { ThemeConfig } from "@/app/styles/theme";

const logos = [
  "OpenAI",
  "Stripe",
  "Vercel",
  "Notion",
  "Framer",
];

type Props = {
  theme: ThemeConfig;
};

export default function LogoCloud({ theme }: Props) {
  return (
    <div
      className="mt-16 flex flex-wrap justify-center gap-10"
      style={{ color: theme.colors.secondary }}
    >
      {logos.map((logo) => (
        <span
          key={logo}
          className="text-lg font-semibold"
        >
          {logo}
        </span>
      ))}
    </div>
  );
}