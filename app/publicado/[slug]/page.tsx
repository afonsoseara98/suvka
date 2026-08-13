"use client";

import { use, useState } from "react";
import Link from "next/link";
import RequireAuth from "@/app/components/RequireAuth";
import Button from "@/app/ui/Button";
import ShareSite from "./ShareSite";

// THE MOMENT SOMETHING BECAME REAL
//
// Publishing used to end by dropping the owner onto their own site with no comment. That
// reads as a page load, not as an event - and the thing that just happened is the single
// most important thing that will ever happen in this product: a restaurant that had no
// website has one, at an address, that a person can be sent.
//
// So it gets a screen. Not decoration: the address is the first thing on it, big enough to
// read out over the phone, with the two actions somebody actually takes in the next thirty
// seconds - look at it, and send it to someone. The third is the one that keeps them here.
//
// Never indexed. It is a private confirmation, not a page anybody should find.
function PublishedContent({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  // Built in the browser so it is the address the owner is actually on, rather than one
  // guessed from an env var that is wrong in exactly the situations that matter.
  const url = typeof window === "undefined" ? `/${slug}` : `${window.location.origin}/${slug}`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 py-16 text-white">
      <div className="w-full max-w-xl text-center">
        <p className="text-5xl">🎉</p>

        <h1 className="mt-6 text-3xl font-bold leading-tight sm:text-4xl">
          O seu restaurante já pode ser encontrado online.
        </h1>

        <div className="mt-10 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-5">
          <p className="text-xs uppercase tracking-widest text-emerald-400">O endereço do seu site</p>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block break-all text-lg font-semibold text-white underline underline-offset-4"
          >
            {url}
          </a>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <ShareSite url={url} />
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-xl border border-zinc-700 px-6 py-3 font-semibold text-zinc-200 transition-colors hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            Ver o meu site
          </a>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => {
              navigator.clipboard?.writeText(url);
              setCopied(true);
            }}
          >
            {copied ? "Link copiado" : "Copiar link"}
          </Button>
        </div>

        {/* A site nobody visits is not worth 19 € a month, and the owner is never more
            willing to do these three things than in the minute after publishing. They are
            also the three that actually bring a local restaurant its first visitors -
            none of which we can do for them. */}
        <div className="mt-12 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-left">
          <p className="font-semibold">Agora falta o mais importante: que alguém o veja.</p>
          <ul className="mt-4 space-y-3 text-sm text-zinc-400">
            <li>1. Ponha este link na biografia do Instagram e do Facebook.</li>
            <li>2. Adicione-o à sua ficha do Google (Google Business).</li>
            <li>3. Envie-o aos clientes que já lhe pedem a ementa por mensagem — é o botão aqui em cima.</li>
          </ul>
        </div>

        {/* The landing promised 19 €/month with the first free, and from the account onwards
            the product said nothing about money at all. Somebody who has just put their
            restaurant online should not be left wondering whether an invoice is coming
            tomorrow. No countdown: the trial dates will belong to Stripe when billing
            exists, and a second clock here would only be something to disagree with it. */}
        <p className="mt-8 text-sm text-zinc-500">
          O primeiro mês é gratuito e não pedimos cartão. Antes de cobrar seja o que for,
          falamos consigo.
        </p>

        <p className="mt-10 text-sm text-zinc-500">
          <Link href="/dashboard" className="underline underline-offset-4 transition hover:text-zinc-300">
            Continuar a editar
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function PublishedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return (
    <RequireAuth>
      <PublishedContent slug={slug} />
    </RequireAuth>
  );
}
