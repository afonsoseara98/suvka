type FooterProps = {
  company: string;
  email: string;
  copyright: string;
};

export default function Footer({
  company,
  email,
  copyright,
}: FooterProps) {
  return (
    <footer className="mt-24 border-t border-zinc-800 py-12 text-center text-zinc-500">

      <div className="font-bold">
        {company}
      </div>

      <div className="mt-2">
        {email}
      </div>

      <div className="mt-6 text-sm">
        {copyright}
      </div>

    </footer>
  );
}