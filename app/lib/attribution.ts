// DE ONDE VEIO ESTA PESSOA
//
// A tabela Event conta o funil inteiro - pré-visualização criada, publicação carregada,
// conta feita, site no ar - e não sabe dizer de onde veio nenhuma dessas pessoas. Se
// amanhã correrem anúncios, aparece um registo e ninguém consegue dizer se veio do
// anúncio, de uma pesquisa, de um parceiro ou de um amigo.
//
// É a mesma falha do carimbo de decisões, uma camada acima: não se aprende de dados que
// não se gravaram. E aqui a consequência é imediata - comparar três canais de aquisição é
// impossível enquanto os três produzirem exactamente o mesmo dado, que é nenhum.
//
// SEM COOKIE, E ISSO NÃO É UM DETALHE
//
// O app/lib/events.ts promete, em letra, que nenhum cookie é posto e que nada se liga a uma
// pessoa. Essa promessa é o que torna esta medição defensável no site de um cliente, e não
// se troca por conveniência de marketing.
//
// Por isso a origem não segue uma PESSOA - segue um RASCUNHO. O identificador do rascunho
// já existe, já é servidor, e já atravessa o funil todo até à publicação. Basta gravar a
// origem no momento em que o rascunho nasce, e o resto do funil herda-a por junção.
//
// O que se guarda é de onde veio o CLIQUE, nunca quem clicou: sem endereço, sem
// identificador persistente, sem nada que atravesse sessões.
//
// SESSION STORAGE E NÃO LOCAL STORAGE
//
// A origem é lida na primeira página que a pessoa vê e tem de sobreviver à navegação até ao
// formulário - que é outra página. O `sessionStorage` faz isso e morre quando o separador
// fecha. O `localStorage` sobreviveria semanas e passaria a ser um identificador de longa
// duração, que é exactamente a coisa que este ficheiro existe para não criar.

export interface Attribution {
  // "google", "instagram", "parceiro-x", "directo". Minúsculas e curto: isto vai ser
  // agrupado numa consulta, e duas grafias do mesmo canal são dois canais.
  origem: string;
  // A campanha, quando vem marcada no endereço. Vazio na esmagadora maioria dos casos.
  campanha: string;
}

const CHAVE = "suvka:origem";
const MAX = 60;

// Um valor de origem tem de caber numa etiqueta de agrupamento e não pode trazer nada que
// não seja um nome de canal. Qualquer coisa fora disto é ruído ou é alguém a tentar
// escrever no nosso registo através de um endereço.
function limpar(valor: string): string {
  return valor
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, MAX);
}

// O DOMÍNIO CHEGA, O CAMINHO NÃO
//
// De um referenciador só interessa a casa de onde veio - "google.com", "instagram.com". O
// caminho completo traz termos de pesquisa e identificadores de sessão de outros sítios, e
// guardá-los seria recolher sobre a pessoa exactamente aquilo que dissemos que não fazemos.
//
// Um referenciador de aplicação - "android-app://com.whatsapp" - fica como está, e isso é
// deliberado. Num mercado português, um link partilhado por WhatsApp é o canal orgânico mais
// importante que existe; confundi-lo com trafego directo apagava o unico sinal de boca-a-boca
// que temos, que e a forma como um produto para restaurantes cresce sem orcamento.
function dominioDe(referenciador: string): string {
  try {
    const anfitriao = new URL(referenciador).hostname.replace(/^www\./, "");
    return limpar(anfitriao);
  } catch {
    return "";
  }
}

// Lê a origem do endereço actual e guarda-a — mas só na primeira vez.
//
// A PRIMEIRA VISITA GANHA À ÚLTIMA
//
// Alguém que chega por um anúncio, sai, e volta escrevendo o endereço à mão foi trazido
// pelo anúncio. Se o último toque ganhasse, o canal "directo" levava o crédito de todos os
// outros — que é a maneira mais comum de uma medição de aquisição mentir, e faz sempre
// parecer que a publicidade não funciona.
export function captureAttribution(
  endereco: string,
  referenciador: string,
  armazenamento: Pick<Storage, "getItem" | "setItem"> | null
): void {
  if (!armazenamento) return;
  if (armazenamento.getItem(CHAVE)) return;

  let parametros: URLSearchParams;
  try {
    parametros = new URL(endereco).searchParams;
  } catch {
    return;
  }

  const marcada = limpar(parametros.get("utm_source") ?? parametros.get("ref") ?? "");
  const doReferenciador = referenciador ? dominioDe(referenciador) : "";

  const atribuicao: Attribution = {
    // Uma origem marcada no endereço ganha ao referenciador: foi posta lá de propósito por
    // quem montou a campanha, e é mais específica do que "google.com" — distingue um
    // anúncio de um resultado orgânico, que é precisamente a comparação em causa.
    origem: marcada || doReferenciador || "directo",
    campanha: limpar(parametros.get("utm_campaign") ?? ""),
  };

  try {
    armazenamento.setItem(CHAVE, JSON.stringify(atribuicao));
  } catch {
    // Navegação privada, armazenamento cheio, permissões. Não saber de onde veio uma
    // visita é um dado em falta; rebentar o formulário por causa disso seria uma visita
    // perdida. A medição nunca pode partir aquilo que mede.
  }
}

export function readAttribution(armazenamento: Pick<Storage, "getItem"> | null): Attribution | null {
  if (!armazenamento) return null;
  try {
    const guardado = armazenamento.getItem(CHAVE);
    if (!guardado) return null;
    const lido = JSON.parse(guardado) as Partial<Attribution>;
    if (typeof lido.origem !== "string" || !lido.origem) return null;
    return { origem: limpar(lido.origem), campanha: limpar(lido.campanha ?? "") };
  } catch {
    return null;
  }
}

// O que vai no `details` do evento. Separado da leitura para o servidor poder validar o que
// recebe sem confiar no cliente: isto vem de um navegador, portanto vem de um estranho.
export function attributionDetails(recebido: unknown): Record<string, string> | null {
  if (typeof recebido !== "object" || recebido === null) return null;
  const { origem, campanha } = recebido as Partial<Attribution>;
  if (typeof origem !== "string" || !origem) return null;

  const limpa = limpar(origem);
  if (!limpa) return null;

  const detalhes: Record<string, string> = { origem: limpa };
  const campanhaLimpa = typeof campanha === "string" ? limpar(campanha) : "";
  if (campanhaLimpa) detalhes.campanha = campanhaLimpa;
  return detalhes;
}
