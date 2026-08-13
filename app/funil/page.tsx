"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/app/components/RequireAuth";
import Notice from "@/app/ui/Notice";

// O ECRÃ QUE FALTAVA
//
// A rota /api/events/funnel existia com um comentário a dizer "counting is worthless until
// somebody can read it" — e nenhum ficheiro no produto a chamava. Contava-se desde sempre e
// ninguém tinha olhado uma vez.
//
// É a mesma falha que o carimbo de decisões e a atribuição têm em comum: gravar é metade, e a
// metade que não estava feita é a que produz uma decisão.
//
// Isto não é um painel de vaidade. Só existem aqui os números que mudam o que se faz a
// seguir: quantos entraram por cada canal, e quantos desses acabaram com o site no ar.

interface Linha {
  origem: string;
  passos: Record<string, number>;
  conversao: number;
}

interface Relatorio {
  days: number;
  truncado: boolean;
  totais: Record<string, number>;
  origens: Linha[];
}

// A ordem é a do funil e não a do ficheiro de eventos. Uma tabela de conversão lê-se da
// esquerda para a direita e cada coluna tem de ser um passo depois da anterior.
const PASSOS = [
  { chave: "preview_created", curto: "Criou" },
  { chave: "preview_viewed", curto: "Viu" },
  { chave: "publish_clicked", curto: "Publicar" },
  { chave: "publish_completed", curto: "No ar" },
] as const;

const JANELAS = [7, 30, 90] as const;

function percentagem(valor: number): string {
  return `${Math.round(valor * 100)}%`;
}

function FunilContent() {
  const [dias, setDias] = useState<number>(30);
  const [dados, setDados] = useState<Relatorio | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // A reposição do estado NÃO acontece aqui. Escrever estado de forma síncrona dentro de um
  // efeito encadeia renderizações — o React avisa, e com razão: a limpeza é consequência do
  // gesto de trocar de janela, não da sincronização com o servidor. Vive no onClick.
  //
  // O `cancelado` trata da corrida: quem carrega em 7, 30 e 90 depressa tem três pedidos no
  // ar, e sem isto ganha o que responder por último e não o que foi pedido por último.
  useEffect(() => {
    let cancelado = false;

    fetch(`/api/events/funnel?days=${dias}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (cancelado) return;
        if (ok) setDados(d);
        else setErro(d.message ?? "Não foi possível carregar.");
      })
      .catch(() => {
        if (!cancelado) setErro("Não foi possível contactar o servidor.");
      });

    return () => {
      cancelado = true;
    };
  }, [dias]);

  const semDados = dados && dados.origens.length === 0;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold text-white">De onde vêm, e quantos ficam</h1>
        <div className="flex gap-1">
          {JANELAS.map((n) => (
            <button
              key={n}
              onClick={() => {
                setDados(null);
                setErro(null);
                setDias(n);
              }}
              aria-pressed={dias === n}
              className={`rounded-md px-3 py-1.5 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
                dias === n ? "bg-zinc-100 text-zinc-900" : "text-zinc-400 hover:text-white"
              }`}
            >
              {n} dias
            </button>
          ))}
        </div>
      </div>

      {erro && (
        <div className="mt-6">
          <Notice tone="error">{erro}</Notice>
        </div>
      )}

      {!dados && !erro && <p className="mt-8 text-sm text-zinc-500">A carregar…</p>}

      {/* ZERO NÃO É UM ERRO, E NÃO SE DISFARÇA COM UMA TABELA VAZIA.
          Um produto sem visitas nesta janela tem de o dizer por palavras, senão quem abre isto
          fica a pensar que a medição está partida. */}
      {semDados && (
        <p className="mt-8 max-w-prose text-sm leading-relaxed text-zinc-400">
          Ninguém criou um site nestes {dias} dias. Quando alguém criar, aparece aqui a origem —
          uma pesquisa, um anúncio, uma partilha por WhatsApp — e quantos desses chegaram a ter
          o site no ar.
        </p>
      )}

      {dados && dados.origens.length > 0 && (
        <>
          <div className="mt-8 overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/60 text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th scope="col" className="px-4 py-3 font-medium">Origem</th>
                  {PASSOS.map((p) => (
                    <th key={p.chave} scope="col" className="px-4 py-3 text-right font-medium">{p.curto}</th>
                  ))}
                  <th scope="col" className="px-4 py-3 text-right font-medium">Conversão</th>
                </tr>
              </thead>
              <tbody>
                {dados.origens.map((linha) => (
                  <tr key={linha.origem} className="border-b border-zinc-800/60 last:border-0">
                    <td className="px-4 py-3 text-zinc-200">{linha.origem}</td>
                    {PASSOS.map((p) => (
                      <td key={p.chave} className="px-4 py-3 text-right tabular-nums text-zinc-400">
                        {linha.passos[p.chave] ?? 0}
                      </td>
                    ))}
                    {/* A única coluna que responde a "este canal vale a pena". Destacada
                        porque é a que se lê primeiro e a que decide onde vai o dinheiro. */}
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-white">
                      {linha.passos.preview_created > 0 ? percentagem(linha.conversao) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 max-w-prose text-xs leading-relaxed text-zinc-500">
            <strong className="text-zinc-400">por-identificar</strong> são passos que não se
            ligam a nenhuma origem — a criação de conta é o caso conhecido, porque o formulário
            de registo não sabe de que rascunho veio. Fica à vista em vez de ser somado ao
            tráfego directo: atribuí-lo inventaria conversões que ninguém pode verificar.
          </p>

          {dados.truncado && (
            <p className="mt-3 text-xs text-amber-400">
              Mais eventos do que o relatório lê de uma vez. Os números estão truncados.
            </p>
          )}
        </>
      )}
    </main>
  );
}

export default function FunilPage() {
  return (
    <RequireAuth>
      <FunilContent />
    </RequireAuth>
  );
}
