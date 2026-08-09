"use client";

import { useEffect, useState } from "react";
import type { BillingState } from "@/app/lib/billing";

// WHEN AM I GOING TO BE CHARGED?
//
// The landing promises 19 EUR a month with the first free, and after signing up the product
// said nothing about money ever again. An owner who has just put his restaurant online was
// left waiting for an invoice without knowing when it comes - which is the wrong feeling to
// hand somebody two minutes after the best moment in the product.
//
// No button yet, and deliberately so: there is nothing to press until Stripe exists, and a
// dead "Ativar" is worse than a plain sentence. What this does today is answer the question.
export default function BillingPanel() {
  const [state, setState] = useState<BillingState | null>(null);

  useEffect(() => {
    fetch("/api/billing")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setState(data?.billing ?? null))
      // Silence is right here. Billing status is not why this page was opened, and an error
      // banner about it would sit above the thing the owner actually came for.
      .catch(() => undefined);
  }, []);

  if (!state || state.kind === "not_started") return null;

  const { tone, title, detail } = describe(state);

  return (
    <div
      className={`mt-8 rounded-2xl border px-6 py-4 ${
        tone === "warn"
          ? "border-amber-500/30 bg-amber-500/10"
          : tone === "bad"
            ? "border-red-500/30 bg-red-500/10"
            : "border-zinc-800 bg-zinc-950"
      }`}
    >
      <p className={`text-sm font-medium ${tone === "warn" ? "text-amber-300" : tone === "bad" ? "text-red-300" : "text-zinc-300"}`}>
        {title}
      </p>
      <p className="mt-1 text-sm text-zinc-500">{detail}</p>
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
