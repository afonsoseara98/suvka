import type { Metadata } from "next";
import Link from "next/link";
import SuvkaSchema from "@/app/components/SuvkaSchema";

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
// Every line here is written to be one a restaurant owner would say out loud or type into
// Google. Not "AI-powered websites that convert" - a phrase nobody who runs a restaurant
// has ever said. The words "IA", "algoritmo" and "SEO" appear nowhere on purpose: the owner
// is not buying a generator, they are buying the thing they keep meaning to get around to.
export const metadata: Metadata = {
  title: "O restaurante já existe. Falta o website. | Suvka",
  description:
    "Criamos o site do seu restaurante em minutos. Sem designer, sem código. Menu, fotos, horário e contacto. Primeiro mês gratuito.",
  // Um anúncio no Facebook devolve as pessoas a suvka.com/?fbclid=IwAR3x..., e cada visitante
  // traz um valor diferente. Sem isto, o Google vê uma página nova de cada vez que alguém
  // partilha, e reparte por todas elas a autoridade que devia ser de uma só.
  alternates: { canonical: "/" },
  // O CARTÃO DA PARTILHA, QUE NÃO EXISTIA
  //
  // Cada site de restaurante saía com og:title, og:description, og:image e twitter:card
  // completos. Esta página - a que se manda a um dono por WhatsApp, a que se cola num
  // anúncio - saía como uma linha cinzenta com o domínio.
  //
  // A imagem não está aqui: vem do app/opengraph-image.tsx, que o Next liga sozinho ao
  // openGraph E ao twitter, com as dimensões e o texto alternativo já preenchidos.
  openGraph: {
    title: "O restaurante já existe. Falta o website.",
    description:
      "Criamos o site do seu restaurante em minutos. Sem designer, sem código. Menu, fotos, horário e contacto. Primeiro mês gratuito.",
    url: "/",
    siteName: "Suvka",
    locale: "pt_PT",
    type: "website",
  },
  twitter: {
    // summary_large_image e não summary: a diferença é entre uma miniatura ao lado do texto
    // e uma imagem que ocupa a largura do cartão. É a mesma escolha dos sites dos clientes.
    card: "summary_large_image",
    title: "O restaurante já existe. Falta o website.",
    description:
      "Criamos o site do seu restaurante em minutos. Menu, fotos, horário e contacto. Primeiro mês gratuito.",
  },
};

// Terracotta rather than a tech blue. A restaurant is warmth, food and company, and the
// accent is the only colour on an otherwise black page - so it has to mean something.
const ACCENT = "#E2725B";

// Two minutes, everywhere on the page. The form asks for nine things including three dishes
// with prices, so "um minuto" is a number the owner disproves while still filling it in -
// and the moment they notice, the price and the free month get re-read with suspicion.
const HOW_LONG = "Menos de 2 minutos.";

const STEPS = [
  {
    n: "1",
    title: "Conte-nos do seu restaurante",
    body: "Menos de 2 minutos. Nome, tipo de cozinha, horário e 3 pratos.",
  },
  {
    n: "2",
    title: "Veja o site pronto",
    body: "Fotos, menu, contacto. Pode substituir pelas suas fotografias.",
  },
  {
    n: "3",
    title: "Publique quando quiser",
    body: "Um clique e o site fica online.",
  },
];

// Benefits, not features. Each line has to survive the owner asking "e eu com isso?" -
// which is why none of them names a technology. "SSL" and "clicável" were both in here and
// both failed that test: the first is a word he has never needed, the second describes the
// mechanism instead of what happens, which is that somebody calls him.
const BENEFITS = [
  "Os clientes encontram o menu, o horário e o telefone em segundos",
  "Tocam no número e ligam-lhe diretamente",
  "O take-away e entregas ficam em destaque",
  "Muda o menu, os preços e o horário quando quiser, sozinho",
  "Fica bem no telemóvel e no computador",
  "Fica online no momento em que carregar em Publicar",
  "Alojamento e segurança incluídos — não tem de contratar mais nada",
  "Troca as fotografias pelas suas sempre que quiser",
];

const INCLUDED = [
  "Site completo",
  "Alojamento e segurança",
  "Edições ilimitadas",
  "Suporte por email",
];

// The five questions someone actually asks before spending a minute on a form.
const FAQ = [
  {
    // "Programar" is not the word he uses or would type into Google. "Perceber de
    // computadores" is the actual worry, and the actual search.
    q: "Preciso de perceber de computadores?",
    a: "Não. Só precisa de preencher um formulário sobre o seu restaurante. Nós fazemos o resto.",
  },
  {
    q: "Posso usar as minhas fotografias?",
    a: "Sim. Pode fazer upload das suas fotos e substituir as nossas a qualquer momento.",
  },
  {
    q: "E se eu já tiver um website?",
    a: "Podemos utilizá-lo como ponto de partida ou criar um novo. Decide depois qual prefere manter.",
  },
  {
    q: "E se eu quiser mudar o menu ou o horário?",
    a: "Pode editar o texto e as fotos diretamente no site. Sem precisar de ninguém.",
  },
  {
    q: "Quanto tempo demora?",
    a: "A maioria dos restaurantes termina em menos de 2 minutos.",
  },
];

// The same offer, wherever the decision happens to land. Someone who has just read the price
// and thought "isso é barato" should not have to go looking for the button.

// The only action on the page, repeated once at the bottom. Same words both times, because
// a person who scrolled to the end should not have to work out that it is the same offer.
function PrimaryCta({ note, fullWidth = false }: { note: string; fullWidth?: boolean }) {
  return (
    <div>
      <Link
        href="/new/restaurant"
        // Full width on a phone either way: a thumb should not have to aim.
        className={`inline-block w-full rounded-xl px-8 py-4 text-center text-base font-semibold text-black transition hover:brightness-110 ${
          fullWidth ? "" : "sm:w-auto"
        }`}
        style={{ background: ACCENT }}
      >
        Criar o meu site gratuitamente
      </Link>
      <p className="mt-4 text-sm text-zinc-500">{note}</p>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <SuvkaSchema />
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-lg font-bold">Suvka</span>
        {/* "Entrar" sat top-right, where a first-time visitor looks for the way in - and it
            led to a sign-in form, which is the one thing this page exists to avoid. Saying
            who it is for stops him clicking it by mistake. */}
        <Link href="/entrar" className="text-sm text-zinc-400 transition hover:text-white">
          Já tenho conta
        </Link>
      </header>

      {/* The headline is the whole pitch: they already did the hard part. */}
      <section className="mx-auto max-w-3xl px-6 pb-20 pt-12 text-center sm:pb-28 sm:pt-24">
        <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
          O restaurante já existe.
          <br />
          <span style={{ color: ACCENT }}>Falta o website.</span>
        </h1>

        {/* "Sem código" answers a worry only someone who already knows websites involve code
            would have. His worry is simpler and he says it in these words. */}
        <p className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-zinc-400">
          Criamos o site do seu restaurante em minutos. Não precisa de saber nada de
          computadores. Só preenche, vê e publica.
        </p>

        <div className="mt-10">
          <PrimaryCta note={`${HOW_LONG} Não precisa de cartão.`} />
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-20 sm:pb-28">
        <div className="grid gap-6 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.n} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-7">
              <div className="text-sm font-semibold" style={{ color: ACCENT }}>
                {step.n}
              </div>
              <h2 className="mt-4 text-lg font-semibold leading-snug">{step.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Naming the kinds of places out loud, so the reader recognises their own. */}
      <section className="mx-auto max-w-2xl px-6 pb-20 text-center sm:pb-28">
        <p className="text-lg leading-relaxed text-zinc-300">
          Ideal para restaurantes independentes, cafés, tascas, pizzarias, hamburguerias e
          take-away.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-20 sm:pb-28">
        <h2 className="mb-10 text-center text-2xl font-bold tracking-tight sm:text-3xl">
          O que o site faz por si
        </h2>
        <ul className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
          {BENEFITS.map((line) => (
            <li key={line} className="flex gap-3 text-[15px] leading-relaxed text-zinc-300">
              <span aria-hidden="true" className="mt-px shrink-0 font-semibold" style={{ color: ACCENT }}>
                ✓
              </span>
              {line}
            </li>
          ))}
        </ul>
      </section>

      {/* The price, stated plainly and compared to something the reader already buys. */}
      <section className="mx-auto max-w-md px-6 pb-20 sm:pb-28">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center">
          <div className="text-5xl font-bold">
            19 €<span className="text-lg font-normal text-zinc-500">/mês</span>
          </div>
          <p className="mt-3 text-zinc-300">Menos do que um jantar para duas pessoas.</p>
          <p className="mt-2 text-sm text-zinc-500">Primeiro mês gratuito. Cancele quando quiser.</p>

          <ul className="mt-8 space-y-3 text-left text-sm text-zinc-400">
            {INCLUDED.map((line) => (
              <li key={line} className="flex gap-3">
                <span aria-hidden="true" style={{ color: ACCENT }}>
                  ✓
                </span>
                {line}
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <PrimaryCta note="Sem custos de instalação. Sem contrato." fullWidth />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-6 pb-20 sm:pb-28">
        <h2 className="mb-10 text-center text-2xl font-bold tracking-tight sm:text-3xl">
          Perguntas
        </h2>
        <dl className="space-y-7">
          {FAQ.map((item) => (
            <div key={item.q} className="border-b border-zinc-900 pb-7">
              <dt className="font-semibold leading-snug">{item.q}</dt>
              <dd className="mt-3 text-[15px] leading-relaxed text-zinc-400">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mx-auto max-w-2xl px-6 pb-24 text-center sm:pb-32">
        <PrimaryCta note={HOW_LONG} />
      </section>

      <footer className="border-t border-zinc-900 px-6 py-10">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 text-sm text-zinc-600 sm:flex-row sm:justify-between">
          <span>Suvka · Websites para restaurantes</span>
          <nav className="flex gap-6">
            <a href="mailto:ola@suvka.com" className="transition hover:text-zinc-300">
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
