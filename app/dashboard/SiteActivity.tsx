"use client";

import { useEffect, useState } from "react";
import { activityLines, totalActivity, type ActivityCounts } from "@/app/lib/siteActivity";

// A FRASE QUE RENOVA UMA SUBSCRIÇÃO
//
// O dono paga 19 EUR por mês. Até aqui, a única resposta honesta a "isto está a servir para
// alguma coisa?" era encolher os ombros — e um mês depois ele cancela, não porque o produto
// falhou, mas porque nunca soube que funcionou.
//
// Os toques são contados desde sempre (app/[slug]/SiteEvents.tsx) e nunca foram mostrados a
// ninguém. Isto não é uma funcionalidade nova: é o caminho de leitura que faltava.
//
// O QUE ISTO NUNCA FAZ
//
// Não conta visitas. Ninguém sabe quem passou pela página, e é melhor assim — o número de
// visitas é vaidade, um toque no telefone é um cliente que ligou.
//
// Não estima, não projecta, não arredonda. Doze toques são doze.
//
// E não acusa. Um site com uma semana e sem toques nenhuns não leva um "0 pessoas ligaram" à
// cara: leva uma frase que explica quando é que aquilo começa a aparecer. O objectivo é ele
// voltar cá no mês que vem.
export default function SiteActivity({ projectId }: { projectId: string }) {
  const [counts, setCounts] = useState<ActivityCounts | null>(null);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    let cancelado = false;

    fetch(`/api/projects/${projectId}/activity?days=30`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { counts: ActivityCounts }) => {
        if (!cancelado) setCounts(data.counts);
      })
      .catch(() => {
        if (!cancelado) setFalhou(true);
      });

    return () => {
      cancelado = true;
    };
  }, [projectId]);

  // Em silêncio enquanto carrega, e em silêncio se falhar. Isto vive por baixo do endereço
  // do site, que é a coisa que ele veio cá buscar - um erro nosso sobre estatísticas não
  // pode pôr uma mancha vermelha por cima do que interessa.
  if (falhou || !counts) return null;

  const linhas = activityLines(counts);

  if (totalActivity(counts) === 0) {
    return (
      <p className="mt-5 text-sm text-emerald-300/70">
        Ainda sem toques registados. Assim que alguém ligar, abrir o mapa ou mandar mensagem a
        partir do site, aparece aqui.
      </p>
    );
  }

  return (
    <div className="mt-5">
      <p className="text-sm text-emerald-300/70">Nos últimos 30 dias, a partir do seu site:</p>
      <ul className="mt-2 space-y-1">
        {linhas.map((linha) => (
          <li key={linha.event} className="text-[15px] text-white">
            {linha.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
