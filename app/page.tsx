import type { Metadata } from "next";
import Link from "next/link";

// THE FRONT DOOR
//
// This page used to be the sign-in form. Someone arriving from an ad was met with "Welcome
// back", an email box and a password box, before knowing what this was, what they would
// get, how long it takes or what it costs. They were being asked for commitment before
// being shown anything.
//
// Now the first thing anyone sees is what they came for and a way to start. The account is
// asked for at the one moment it buys something - publishing - which is the flow the rest
// of the app already implements: /new/restaurant, /api/restaurant/draft and
// /preview/d/[id] all work with no session at all.
//
// Everything on this page is aimed at a restaurant owner. Not "AI-powered websites that
// convert" - a phrase nobody who runs a restaurant has ever said - but the three things
// they actually care about: it is theirs, it takes minutes, it costs nothing to try.
export const metadata: Metadata = {
  title: "Website para o seu restaurante, em minutos — Noctra",
  description:
    "Preencha os dados do seu restaurante e veja o site pronto em segundos. Sem conta, sem cartão. Só cria conta se quiser publicar.",
};

// The questions a restaurant owner actually asks before spending two minutes on a form.
// Not feature marketing - the four things that decide whether they start.
const FAQ = [
  {
    q: "Preciso de perceber de computadores?",
    a: "Não. Preenche um formulário com o nome, a morada, o horário e três pratos. O site aparece feito.",
  },
  {
    q: "Posso ver antes de pagar?",
    a: "Sim. Cria o site, vê-o todo e envia o link a quem quiser. Só cria conta se decidir publicá-lo.",
  },
  {
    q: "E se quiser mudar alguma coisa depois?",
    a: "Muda quando quiser. Preços da ementa, horário, telefone — está tudo editável e volta a ficar online.",
  },
  {
    q: "As fotografias são do meu restaurante?",
    a: "As iniciais são fotografias profissionais de comida, escolhidas pelo tipo de cozinha. Pode substituí-las pelas suas.",
  },
];

const STEPS = [
  { n: "1", title: "Preencha os dados", body: "Nome, morada, telefone, horário e três pratos. Dois minutos." },
  { n: "2", title: "Veja o site", body: "Aparece em segundos, com fotografias. Sem conta, sem cartão." },
  { n: "3", title: "Publique", body: "Se gostar, cria conta e fica online. Se não, fecha a página." },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-lg font-bold">Noctra</span>
        <Link href="/entrar" className="text-sm text-zinc-400 transition hover:text-white">
          Entrar
        </Link>
      </header>

      <section className="mx-auto max-w-3xl px-6 pb-16 pt-10 text-center sm:pt-20">
        <p className="text-sm font-medium uppercase tracking-widest text-zinc-500">Para restaurantes</p>

        <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
          O website do seu restaurante,
          <br className="hidden sm:block" /> pronto em minutos
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-zinc-400">
          Ementa, morada, horário e telefone — no telemóvel dos seus clientes. Veja o site
          antes de decidir seja o que for.
        </p>

        {/* The only prominent action on the page, and it leads to the product rather than
            to a form about the product. */}
        <div className="mt-10">
          <Link
            href="/new/restaurant"
            className="inline-block rounded-xl bg-white px-8 py-4 text-base font-semibold text-black transition hover:bg-zinc-200"
          >
            Criar o meu site gratuitamente
          </Link>
          <p className="mt-3 text-sm text-zinc-500">Sem conta. Sem cartão. Vê o resultado primeiro.</p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-20">
        <div className="grid gap-6 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.n} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <div className="text-sm font-semibold text-zinc-500">{step.n}</div>
              <h2 className="mt-3 text-lg font-semibold">{step.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* The one promise worth making on a page like this, because it is the one thing
          every other generator gets wrong: nothing on the finished site is invented. */}
      <section className="mx-auto max-w-3xl px-6 pb-20 text-center">
        <p className="text-lg leading-relaxed text-zinc-300">
          Só aparece no site o que <span className="text-white">você</span> escrever.
        </p>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-zinc-500">
          Não inventamos avaliações, estrelas nem números de clientes. O site diz o que o seu
          restaurante é — não o que um computador imaginou.
        </p>
      </section>

      {/* The price, stated plainly and early. A restaurant owner deciding whether to spend
          two minutes on a form wants to know what it costs at the end of them. */}
      <section className="mx-auto max-w-md px-6 pb-20">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center">
          <div className="text-4xl font-bold">
            19€<span className="text-lg font-normal text-zinc-500">/mês</span>
          </div>
          <p className="mt-2 text-sm text-zinc-400">Primeiro mês grátis. Cancela quando quiser.</p>

          <ul className="mt-6 space-y-2 text-left text-sm text-zinc-400">
            {[
              "Site publicado e online",
              "Ementa, morada, horário e telefone",
              "Fotografias incluídas",
              "Funciona no telemóvel",
              "Alterações sempre que precisar",
            ].map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-zinc-600">·</span>
                {line}
              </li>
            ))}
          </ul>

          <Link
            href="/new/restaurant"
            className="mt-8 inline-block w-full rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-zinc-200"
          >
            Criar o meu site grátis
          </Link>
          <p className="mt-3 text-xs text-zinc-500">Não pedimos cartão para experimentar.</p>
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-6 pb-24">
        <h2 className="mb-8 text-center text-sm font-medium uppercase tracking-widest text-zinc-500">
          Perguntas
        </h2>
        <dl className="space-y-6">
          {FAQ.map((item) => (
            <div key={item.q} className="border-b border-zinc-900 pb-6">
              <dt className="font-semibold">{item.q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-zinc-400">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className="border-t border-zinc-900 px-6 py-10">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 text-sm text-zinc-600 sm:flex-row sm:justify-between">
          <span>Noctra · Websites para restaurantes</span>
          <nav className="flex gap-6">
            <a href="mailto:ola@noctra.pt" className="transition hover:text-zinc-300">
              Contacto
            </a>
            <Link href="/termos" className="transition hover:text-zinc-300">
              Termos
            </Link>
            <Link href="/privacidade" className="transition hover:text-zinc-300">
              Privacidade
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
