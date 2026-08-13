import { EVENT_NAMES, type EventName } from "./events";

// O FUNIL POR ORIGEM
//
// A rota antiga agrupava por nome do evento e mais nada: "100 pré-visualizações, 83 carregaram
// em publicar, 42 fizeram conta". Útil, e incapaz de responder à única pergunta que decide
// onde gastar dinheiro — QUAL DELES veio de onde.
//
// Sem esta divisão, um canal que traz cem visitas curiosas e um que traz dez restaurantes a
// sério dão exactamente o mesmo número no topo, e o segundo parece dez vezes pior.
//
// COMO SE LIGA A ORIGEM AO RESTO DO FUNIL
//
// A origem é gravada uma vez, no `preview_created`, junto ao `draftId` (ver attribution.ts —
// segue um rascunho e nunca uma pessoa, que é o que dispensa cookies). Os passos seguintes
// carregam o mesmo `draftId`, portanto a ligação faz-se por junção e não por um identificador
// que persiga alguém.
//
// ONDE A CADEIA PARTE, E PORQUE É QUE NÃO IMPORTA
//
// O `signup_completed` só traz `userId`: uma conta cria-se num formulário que não sabe de que
// rascunho veio. Esse degrau fica sem origem.
//
// Não vale a pena forçá-lo. O `publish_completed` — o passo A SEGUIR, e o único que importa,
// porque é quando o site fica no ar — traz o `draftId` outra vez. Mede-se a conversão de ponta
// a ponta na mesma, e o que se perde é a visibilidade de um degrau intermédio. Passar o
// rascunho pelo registo obrigaria a arrastá-lo pela autenticação inteira para ganhar uma
// linha num relatório.

export interface FunnelRow {
  origem: string;
  // Contagem por passo. Todos os nomes conhecidos aparecem, zeros incluídos: um funil com
  // chaves em falta lê-se como uma falha do produto e não como um passo onde ninguém chegou.
  passos: Record<EventName, number>;
  // Dos que começaram, quantos acabaram com o site no ar. É a única coluna que responde a
  // "este canal vale a pena".
  conversao: number;
}

export interface EventoBruto {
  name: string;
  draftId: string | null;
  details: unknown;
}

const SEM_ORIGEM = "por-identificar";

function origemDe(details: unknown): string | null {
  if (typeof details !== "object" || details === null) return null;
  const { origem } = details as { origem?: unknown };
  return typeof origem === "string" && origem ? origem : null;
}

function passosVazios(): Record<EventName, number> {
  return Object.fromEntries(EVENT_NAMES.map((nome) => [nome, 0])) as Record<EventName, number>;
}

// Puro de propósito: recebe linhas e devolve o relatório. A consulta à base de dados vive na
// rota, e o que decide o que os números significam vive aqui, onde se pode testar sem Postgres.
export function funnelByOrigin(eventos: EventoBruto[]): FunnelRow[] {
  // Primeiro passo: de que origem é cada rascunho. Só o `preview_created` sabe.
  const origemDoRascunho = new Map<string, string>();
  for (const evento of eventos) {
    if (evento.name !== "preview_created" || !evento.draftId) continue;
    origemDoRascunho.set(evento.draftId, origemDe(evento.details) ?? SEM_ORIGEM);
  }

  const porOrigem = new Map<string, Record<EventName, number>>();

  for (const evento of eventos) {
    if (!EVENT_NAMES.includes(evento.name as EventName)) continue;

    // UM EVENTO SEM RASCUNHO NÃO É ATRIBUÍVEL, E ISSO DIZ-SE
    //
    // O `signup_completed` é o caso conhecido. Fica numa linha própria em vez de ser
    // distribuído pelas origens ou deitado fora: somá-lo ao "directo" inventaria conversões
    // que ninguém pode verificar, e escondê-lo faria os totais não bater certo com a tabela —
    // que é como um relatório perde a confiança de quem o lê.
    const origem = (evento.draftId && origemDoRascunho.get(evento.draftId)) || SEM_ORIGEM;

    const linha = porOrigem.get(origem) ?? passosVazios();
    linha[evento.name as EventName] += 1;
    porOrigem.set(origem, linha);
  }

  return [...porOrigem.entries()]
    .map(([origem, passos]) => ({
      origem,
      passos,
      // Zero visitas dá zero e não uma divisão por zero. Uma origem sem
      // `preview_created` é o caso do `por-identificar`, que existe e não converte nada
      // por definição.
      conversao: passos.preview_created > 0 ? passos.publish_completed / passos.preview_created : 0,
    }))
    // Pela quantidade de gente que trouxe. Um relatório de canais lê-se de cima para baixo, e
    // em cima deve estar o que mais mexe.
    .sort((a, b) => b.passos.preview_created - a.passos.preview_created || a.origem.localeCompare(b.origem));
}
