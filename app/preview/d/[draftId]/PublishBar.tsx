"use client";

import { buttonClasses } from "@/app/ui/Button";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  draftId: string;
  name: string;
  // Rendered above the device, at full width, because it is our tool rather than part of
  // the restaurant's site - and because squeezing it into 375px made it unusable.
  tools?: React.ReactNode;
  // Changes whenever the photographs do, which is what reloads the iframe: router.refresh()
  // re-renders this page but cannot reach inside a frame.
  contentKey?: string;
  children: React.ReactNode;
};

// PUBLISHING IS WHERE THE ACCOUNT IS ASKED FOR
//
// Not at the form. A visitor who has just watched their own restaurant appear on screen has
// a reason to sign up; a visitor staring at an empty form has only a cost.
export default function PublishBar({ draftId, name, tools, contentKey, children }: Props) {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);
  // Mobile first, and not as a preference: a person looking up a restaurant is almost
  // always on a phone, and an owner who has only seen their site at 1440px has not seen
  // what their customers see.
  const [viewport, setViewport] = useState<"mobile" | "desktop">("mobile");

  // ONE STEP FROM HERE TO ONLINE
  //
  // This button used to POST straight to /api/restaurant/publish, so the owner never saw
  // the address of their own website until it already existed - and if the name was taken
  // they were silently given a "-2". Then it sent anonymous visitors to /entrar for the
  // account and to a second page for the address: two more chances to close the tab on
  // somebody who had already decided.
  //
  // Now it walks to one screen that asks for whatever is still missing - the account only
  // when there isn't one - and publishes. Everything that used to live here, including the
  // auto-publish-on-return-from-sign-in effect and its double-run guard, went with it.
  function start() {
    // Where intent turns into a step. Everything after this is measured against it.
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "publish_clicked", draftId }),
      keepalive: true,
    }).catch(() => undefined);

    setPublishing(true);
    router.push(`/publicar/${draftId}`);
  }

  return (
    <div className="sticky top-0 z-50 border-b border-zinc-800 bg-black/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-5 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{name}</p>
          <p className="text-xs text-zinc-500">
            Pré-visualização. Só fica online quando publicar.
          </p>
        </div>

        {/* Publishing errors are shown on the address step now, which is where publishing
            happens - this bar can no longer fail at anything. */}
        <div className="flex overflow-hidden rounded-lg border border-zinc-700">
          {(["mobile", "desktop"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setViewport(option)}
              className={`px-3 py-1.5 text-xs transition ${
                viewport === option ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              {option === "mobile" ? "Telemóvel" : "Computador"}
            </button>
          ))}
        </div>

        <button
          onClick={start}
          disabled={publishing}
          className={buttonClasses("primary", "md")}
        >
          {publishing ? "A publicar…" : "Publicar este site"}
        </button>
      </div>

      {/* O SEGUNDO QUE DECIDE TUDO

          A ordem nesta página estava ao contrário. Debaixo da barra vinha o pedido de
          fotografias - uma zona de arrastar vazia, a pedir trabalho - e só depois o site.
          A primeira coisa que o dono via, no momento em que devia ficar espantado, era uma
          tarefa por fazer.

          Ninguém diz "foda-se, isto fez isto em dois minutos" a olhar para um pedido. Diz-o
          a olhar para o restaurante dele.

          Uma frase, e não um cabeçalho de produto: o nome DELE, e o que aconteceu. Sem
          exclamação e sem confetes - o que impressiona aqui é o facto, e o facto é que
          aquilo existe e tem o nome dele em cima. */}
      <div className="mx-auto max-w-5xl px-5 pt-8 text-center">
        <h1 className="text-2xl font-bold leading-tight text-white sm:text-3xl">
          {name} já tem site.
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Ainda não está online. Veja-o abaixo e publique quando quiser.
        </p>
      </div>

      {/* The phone is an iframe because only an iframe has its own viewport.

          A 375px-wide div does not make a media query believe it is on a phone: `sm:` and
          every vw-based clamp() keep resolving against the real window, so the "Telemóvel"
          view used to show a desktop layout crushed into 375px - three columns of opening
          hours at 70px each. It was showing owners a page no phone would ever render.

          Desktop stays inline. At a desktop window that view is already truthful, and an
          iframe there would need its height synced back out - a blank-page failure mode for
          no gain. */}
      {viewport === "mobile" ? (
        <div className="flex justify-center py-8">
          {/* A moldura é um telemóvel e não uma caixa. Custa duas classes - cantos maiores e
              uma sombra - e é a diferença entre "aqui está o teu HTML" e "aqui está o teu
              restaurante no telemóvel de um cliente". É a mesma coisa lá dentro; muda o que
              a pessoa acha que está a ver. */}
          <div className="rounded-[2.25rem] border-[6px] border-zinc-800 bg-zinc-800 shadow-2xl shadow-black/60">
            <iframe
              key={contentKey}
              src={`/preview/d/${draftId}/frame`}
              title={`${name} — como aparece num telemóvel`}
              // 375x812 is an iPhone. It scrolls inside the frame, the way a phone does.
              className="h-[812px] w-[375px] rounded-[1.75rem] bg-black"
            />
          </div>
        </div>
      ) : (
        children
      )}

      {/* AS FOTOGRAFIAS VÊM DEPOIS DE ELE VER O QUE JÁ TEM
          Antes do site, isto era uma portagem. Depois do site, é uma melhoria óbvia a uma
          coisa que já é dele - e a diferença entre as duas leituras é só a ordem. */}
      {tools}
    </div>
  );
}
