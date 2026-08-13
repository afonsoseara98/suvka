// O QUE O SITE FEZ PELO RESTAURANTE, DITO AO DONO
//
// O `app/[slug]/SiteEvents.tsx` conta isto desde sempre, e o comentário dele já dizia porquê:
// "o dono paga 19 EUR por mês e a única resposta honesta a 'isto funcionou?' é encolher os
// ombros". O `@@index([projectId, name])` está no schema desde então. Faltava alguém ler.
//
// Esta é a parte pura: recebe contagens, devolve frases. Sem base de dados, para se poder
// testar - o que interessa aqui não é a consulta, é o que se diz e o que não se diz.
//
// TRÊS REGRAS SOBRE O QUE SE DIZ
//
// 1. São TOQUES, não visitas. Ninguém conta quem passou pela página, e é melhor assim: um
//    número de visitas é uma métrica de vaidade que não paga a subscrição, e um toque no
//    número de telefone é um cliente que ligou.
// 2. Nada se extrapola. "12 pessoas ligaram" quando foram 12 toques. Não se diz "cerca de",
//    não se estima, não se projecta o mês a partir de uma semana.
// 3. Zero não é uma acusação. Um site com uma semana e sem toques nenhuns não recebe um
//    "0 pessoas ligaram" - recebe uma frase que explica quando é que aquilo começa a
//    aparecer. O objectivo é ele voltar cá, não desistir na primeira vez.

export interface ActivityCounts {
  phone_clicked: number;
  whatsapp_clicked: number;
  maps_clicked: number;
  reservation_clicked: number;
  order_clicked: number;
}

export const ACTIVITY_EVENTS = [
  "phone_clicked",
  "whatsapp_clicked",
  "maps_clicked",
  "reservation_clicked",
  "order_clicked",
] as const satisfies ReadonlyArray<keyof ActivityCounts>;

export interface ActivityLine {
  event: keyof ActivityCounts;
  count: number;
  // Já concordado em número e em género. "1 pessoa ligou" e "12 pessoas ligaram" - a versão
  // com o número entre parênteses ("1 pessoa(s)") é a marca de um formulário, não de uma
  // frase que alguém escreveu para ser lida.
  text: string;
}

// A ordem é a do valor para o restaurante, não a do volume. Uma reserva vale mais do que um
// toque no mapa mesmo quando é dez vezes mais rara, e o dono deve ler primeiro o que lhe
// paga o mês.
const PHRASES: Record<keyof ActivityCounts, { one: string; many: string }> = {
  reservation_clicked: { one: "1 pessoa foi reservar", many: "%n pessoas foram reservar" },
  phone_clicked: { one: "1 pessoa ligou-lhe", many: "%n pessoas ligaram-lhe" },
  whatsapp_clicked: { one: "1 pessoa abriu o WhatsApp", many: "%n pessoas abriram o WhatsApp" },
  order_clicked: { one: "1 pessoa foi encomendar", many: "%n pessoas foram encomendar" },
  maps_clicked: { one: "1 pessoa abriu o mapa", many: "%n pessoas abriram o mapa" },
};

const ORDER: ReadonlyArray<keyof ActivityCounts> = [
  "reservation_clicked",
  "phone_clicked",
  "whatsapp_clicked",
  "order_clicked",
  "maps_clicked",
];

// Só o que aconteceu. Uma linha a zero não é informação - é uma acusação sobre um canal que
// o restaurante pode nem sequer ter.
export function activityLines(counts: Partial<ActivityCounts>): ActivityLine[] {
  return ORDER.flatMap((event) => {
    const count = counts[event] ?? 0;
    if (count <= 0) return [];

    const phrase = PHRASES[event];
    return [{ event, count, text: count === 1 ? phrase.one : phrase.many.replace("%n", String(count)) }];
  });
}

export function totalActivity(counts: Partial<ActivityCounts>): number {
  return ACTIVITY_EVENTS.reduce((total, event) => total + (counts[event] ?? 0), 0);
}
