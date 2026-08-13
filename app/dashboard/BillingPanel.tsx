"use client";

import { buttonClasses } from "@/app/ui/Button";
import { useEffect, useState } from "react";
import type { BillingState } from "@/app/lib/billing";

// WHEN AM I GOING TO BE CHARGED?
//
// The landing promises 19 EUR a month with the first free, and after signing up the product
// said nothing about money ever again. An owner who has just put his restaurant online was
// left waiting for an invoice without knowing when it comes - which is the wrong feeling to
// hand somebody two minutes after the best moment in the product.
//
// The button appears only when Stripe is actually configured. A checkout that 500s because
// no keys are set is worse than a plain sentence, which is why there was no button here at
// all until there were keys.
export default function BillingPanel() {
  const [state, setState] = useState<BillingState | null>(null);
  const [canSubscribe, setCanSubscribe] = useState(false);
  const [opening, setOpening] = useState(false);
  // Read off the URL at first render rather than through useSearchParams, which needs a
  // Suspense boundary and has broken this project's build before over exactly this - and
  // rather than in the effect, which would be setting state synchronously on mount.
  //
  // No hydration mismatch to worry about: this component renders null until the billing
  // state arrives, so the server and the client agree on the only thing they both produce.
  const [justPaid] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("subscricao") === "ativa"
  );

  useEffect(() => {
    const returned = justPaid;

    // Taken out of the address bar immediately, so refreshing an hour later does not
    // congratulate somebody again for something they did once. An effect is the right place
    // for this: it is a change to something outside React.
    if (returned) window.history.replaceState({}, "", window.location.pathname);

    let cancelled = false;

    const read = () =>
      fetch("/api/billing")
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          if (cancelled) return null;
          setState(data?.billing ?? null);
          setCanSubscribe(Boolean(data?.canSubscribe));
          return data?.billing as BillingState | null;
        })
        // Silence is right here. Billing status is not why this page was opened, and an
        // error banner about it would sit above the thing the owner actually came for.
        .catch(() => null);

    void (async () => {
      const first = await read();
      if (!returned || first?.kind === "active") return;

      // COMING BACK FROM A PAYMENT THAT THE APP HAS NOT HEARD ABOUT YET
      //
      // Stripe redirects the moment the card clears, but this account only becomes "active"
      // when the webhook lands - a different request, arriving a second or two later, and
      // sometimes more. Without this the owner returns from paying to a panel that still
      // says "Período gratuito", which reads as though the payment failed.
      //
      // Polled rather than trusted: the URL says where they came from, never what Stripe
      // decided. A parameter anybody can type must not be able to mark an account as paying.
      for (let attempt = 0; attempt < 5 && !cancelled; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const next = await read();
        if (next?.kind === "active") return;
      }
    })();

    return () => {
      cancelled = true;
    };
    // justPaid comes from a useState with no setter, so it never changes after mount - the
    // dependency is here to satisfy the rule honestly rather than to silence it.
  }, [justPaid]);

  if (!state || state.kind === "not_started") return null;

  const { tone, title, detail } = describe(state);

  // Somebody who has just come back from paying gets told so, whatever the account says
  // yet. Kept as a separate line rather than overwriting `title`, because the two facts are
  // genuinely different: Stripe took the payment, and this account has caught up with it.
  if (justPaid && state.kind !== "active") {
    return (
      <div className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-4">
        <p className="text-sm font-medium text-emerald-300">Obrigado — o pagamento foi aceite.</p>
        <p className="mt-1 text-sm text-zinc-400">
          A subscrição fica ativa dentro de instantes. O seu site não é afetado.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`mt-8 rounded-2xl border px-6 py-4 ${
        justPaid
          ? "border-emerald-500/30 bg-emerald-500/10"
          : tone === "warn"
            ? "border-amber-500/30 bg-amber-500/10"
            : tone === "bad"
              ? "border-red-500/30 bg-red-500/10"
              : "border-zinc-800 bg-zinc-950"
      }`}
    >
      {justPaid && (
        <p className="mb-2 text-sm font-medium text-emerald-300">Obrigado — a subscrição está ativa.</p>
      )}

      <p className={`text-sm font-medium ${tone === "warn" ? "text-amber-300" : tone === "bad" ? "text-red-300" : "text-zinc-300"}`}>
        {title}
      </p>
      <p className="mt-1 text-sm text-zinc-500">{detail}</p>

      {canSubscribe && state.kind !== "active" && (
        <button
          onClick={async () => {
            setOpening(true);
            try {
              const response = await fetch("/api/stripe/checkout", { method: "POST" });
              const data = await response.json();
              // Stripe hosts the page. Nothing about a card ever touches this application.
              if (data?.url) window.location.href = data.url;
              else setOpening(false);
            } catch {
              setOpening(false);
            }
          }}
          disabled={opening}
          className={`mt-4 ${buttonClasses()}`}
        >
          {opening ? "A abrir…" : state.kind === "past_due" ? "Atualizar pagamento" : "Ativar subscrição — 19 €/mês"}
        </button>
      )}
    </div>
  );
}

const dayMonth = (value: string | Date) =>
  new Date(value).toLocaleDateString("pt-PT", { day: "numeric", month: "long" });

function describe(state: BillingState): { tone: "calm" | "warn" | "bad"; title: string; detail: string } {
  switch (state.kind) {
    case "trial":
      return {
        // Only urgent near the end. A banner that shouts for thirty days is a banner nobody
        // reads on day twenty-nine, which is the one day it matters.
        tone: state.daysLeft <= 7 ? "warn" : "calm",
        title:
          state.daysLeft === 1
            ? "Último dia do período gratuito"
            : `Período gratuito — faltam ${state.daysLeft} dias`,
        detail: `O seu site fica online. Termina a ${dayMonth(state.endsAt)}, e falamos consigo antes de cobrar seja o que for.`,
      };
    case "trial_over":
      return {
        tone: "warn",
        title: "O período gratuito terminou",
        detail: "O seu site continua online. Entramos em contacto para tratar da subscrição.",
      };
    case "active":
      return {
        tone: "calm",
        title: "Subscrição ativa — 19 €/mês",
        detail: state.renewsAt ? `Renova a ${dayMonth(state.renewsAt)}.` : "Obrigado.",
      };
    case "past_due":
      return {
        tone: "bad",
        title: "Pagamento em falta",
        detail: "O site continua online. Verifique os dados de pagamento para não sair de linha.",
      };
    case "canceled":
      return {
        tone: "warn",
        title: "Subscrição cancelada",
        detail: state.endsAt
          ? `O site fica online até ${dayMonth(state.endsAt)}.`
          : "O site sai de linha no fim do período já pago.",
      };
    default:
      return { tone: "calm", title: "", detail: "" };
  }
}
