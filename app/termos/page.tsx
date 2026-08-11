import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termos — Suvka",
  robots: { index: true, follow: true },
};

// Same standard as the privacy page: true, plain, and not yet reviewed by a lawyer. The
// clause that matters most commercially is the last one - who owns the content - and it is
// stated the way it should be rather than the way that would favour us.
const SECTIONS = [
  {
    title: "O serviço",
    body: "O Suvka cria e aloja um website para o seu restaurante a partir dos dados que escreve. Enquanto a subscrição estiver ativa, o site fica online.",
  },
  {
    title: "Preço",
    body: "19€ por mês. O primeiro mês é gratuito. Pode cancelar a qualquer momento e não há período mínimo — ao cancelar, o site sai de linha no fim do período já pago.",
  },
  {
    title: "O que escreve é seu",
    body: "O nome, a ementa, os preços, a morada e os textos do seu restaurante continuam a ser seus. Não os usamos para outra coisa e pode levá-los consigo.",
  },
  {
    title: "O que publicamos é o que escreveu",
    body: "Não acrescentamos avaliações, classificações nem números que não tenha fornecido. Se o site afirmar alguma coisa sobre o seu restaurante, foi porque a escreveu.",
  },
  {
    title: "Responsabilidade pelo conteúdo",
    body: "É responsável pelo que publica: preços corretos, alergénios, horários. Não verificamos o conteúdo antes de ficar online.",
  },
  {
    title: "Interrupções",
    body: "Fazemos o possível por manter os sites online, mas não garantimos disponibilidade ininterrupta.",
  },
];

export default function Termos() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link href="/" className="text-sm text-zinc-500 hover:text-white">
          ← Suvka
        </Link>

        <h1 className="mt-6 text-3xl font-bold">Termos</h1>
        <p className="mt-3 text-zinc-400">O acordo entre nós, sem letra pequena.</p>

        <div className="mt-10 space-y-8">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="font-semibold">{section.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{section.body}</p>
            </section>
          ))}
        </div>

        <p className="mt-12 border-t border-zinc-900 pt-6 text-xs text-zinc-600">
          Dúvidas: <a href="mailto:ola@suvka.com" className="underline">ola@suvka.com</a>
        </p>
      </div>
    </main>
  );
}
