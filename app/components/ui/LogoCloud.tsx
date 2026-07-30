const logos = [
  "OpenAI",
  "Stripe",
  "Vercel",
  "Notion",
  "Framer",
];

export default function LogoCloud() {
  return (
    <div className="mt-16 flex flex-wrap justify-center gap-10 text-zinc-500">
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