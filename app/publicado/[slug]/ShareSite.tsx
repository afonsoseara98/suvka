"use client";

import { useState } from "react";

// O ÚNICO MOMENTO EM QUE UM DONO PARTILHA UMA COISA NOSSA
//
// O ecrã de publicação já dizia o que fazer a seguir, e o terceiro passo era o que traz os
// primeiros visitantes de um restaurante local: "envie o link aos clientes que já lhe pedem
// a ementa por mensagem". Dizia-o e não dava por onde — deixava o dono a copiar um endereço,
// a sair do produto, a abrir o WhatsApp, a escolher um contacto e a escrever a frase.
//
// Cinco passos entre a intenção e o envio, no minuto em que ele está mais disposto a
// enviá-lo do que alguma vez voltará a estar.
//
// PORQUE ISTO É FLYWHEEL E NÃO UM BOTÃO
//
//   ele partilha  →  alguém abre o site  →  toca no telefone ou no mapa
//                 →  o painel mostra-lhe que resultou  →  ele volta a partilhar
//
// E o site que ele manda leva o cartão com a fotografia do prato dele. Quem o recebe vê um
// restaurante com um site, não um link. Alguns desses são donos de restaurantes.
//
// A partilha nativa primeiro, WhatsApp como recurso: no telemóvel — que é onde isto
// acontece — o menu do sistema oferece o WhatsApp, o Instagram, as mensagens e o email, e
// escolher por ele era escolher pior. No computador esse menu não existe na maior parte dos
// browsers, e aí o WhatsApp Web é o destino certo, porque é onde os restaurantes respondem.
export default function ShareSite({ url }: { url: string }) {
  const [enviado, setEnviado] = useState(false);

  // SEM O NOME DO RESTAURANTE NO TEXTO, DE PROPÓSITO
  //
  // Esta página só conhece o slug, e "taberna-do-bairro já tem site" era a mensagem que ele
  // ia mandar aos clientes dele. Ir buscar o nome custava um pedido a meio de um ecrã de
  // celebração - e não é preciso: o cartão de partilha já leva o nome e a fotografia do
  // prato, porque o og:image existe. O texto só tem de dizer o que a pessoa ganha em tocar.
  //
  // E é escrito na voz DELE para os clientes DELE: quem manda isto é o dono, não nós.
  const mensagem = `Já pode ver a nossa ementa, o horário e os contactos aqui: ${url}`;

  function contar() {
    setEnviado(true);
    // Fire-and-forget. Uma medição não pode atrasar nem impedir uma partilha.
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "site_shared" }),
      keepalive: true,
    }).catch(() => undefined);
  }

  async function partilhar() {
    contar();

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text: mensagem, url });
        return;
      } catch {
        // Cancelar a partilha do sistema atira aqui. Não é um erro e não abre nada por cima -
        // quem desistiu não quer ver o WhatsApp a seguir.
        return;
      }
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(mensagem)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <button
      onClick={partilhar}
      className="rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-zinc-200"
    >
      {enviado ? "Enviar a mais alguém" : "Enviar por mensagem"}
    </button>
  );
}
