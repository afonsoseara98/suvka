import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacidade — Suvka",
  robots: { index: true, follow: true },
};

// A factual description of what this system does with data, written from the code rather
// than from a template. It is deliberately not dressed up as a legal document: it has not
// been reviewed by a lawyer, and it must be before anyone is charged. What it is good for
// is being true - every statement below corresponds to something in app/lib.
const SECTIONS = [
  {
    title: "O que guardamos antes de criar conta",
    body: "Nada permanente. Ao criar um site sem conta, os dados que escreveu ficam apenas em memória no servidor durante 24 horas e são apagados a seguir. Não são gravados em base de dados e não ficam associados a si.",
  },
  {
    title: "O que guardamos depois de criar conta",
    body: "O seu email, uma versão cifrada da palavra-passe, e o conteúdo do site que publicou — o que escreveu no formulário. Nada mais.",
  },
  {
    title: "Fotografias",
    body: "As fotografias iniciais vêm do Pexels e são carregadas a partir dos servidores deles. A licença permite uso comercial. O crédito do fotógrafo aparece no site.",
  },
  {
    title: "Seguimento",
    body: "Não colocamos cookies nem ferramentas de análise de terceiros nos sites publicados dos nossos clientes. Um site seu não carrega Google Analytics, píxeis do Facebook nem rastreadores que os seus clientes não aceitaram.",
  },
  {
    title: "O que contamos no seu site",
    body: "Contamos quantas vezes alguém carrega no telefone, no WhatsApp, em 'Como chegar', em reservar e nas plataformas de encomenda — para lhe podermos dizer o que o site lhe está a trazer. É uma contagem e mais nada: não guardamos cookies, endereços IP nem qualquer identificador, e não conseguimos saber quem carregou, nesta visita ou em qualquer outra.",
  },
  {
    title: "Apagar os seus dados",
    body: "Escreva para ola@suvka.com e apagamos a conta e tudo o que lhe está associado.",
  },
];

export default function Privacidade() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link href="/" className="text-sm text-zinc-500 hover:text-white">
          ← Suvka
        </Link>

        <h1 className="mt-6 text-3xl font-bold">Privacidade</h1>
        <p className="mt-3 text-zinc-400">
          O que fazemos com os seus dados, em português simples.
        </p>

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
