import type { RestaurantInput } from "./input";
import { directionFor } from "./direction";
import { heroVariant, leadsWithGallery } from "./compose";

// O QUE FOI DECIDIDO, GUARDADO NO MOMENTO EM QUE FOI DECIDIDO
//
// Já contamos o que os visitantes fazem: `phone_clicked`, `reservation_clicked`,
// `order_clicked`, tudo ligado a um `projectId`. Metade do ciclo está feita há meses.
//
// O que nunca foi guardado é a outra metade: QUE PÁGINA era aquela quando aconteceu. Sabemos
// que doze pessoas foram reservar no projecto X e não sabemos se o X tinha o hero contido ou
// dividido, se abria com a galeria, qual era a razão que a distinguia, nem sequer que versão
// das regras a construiu.
//
// A consequência não é uma funcionalidade em falta. É que TODOS OS DIAS DE TRÁFEGO QUE
// PASSAM SÃO DADOS PERDIDOS PARA SEMPRE. Um clique de hoje, sem isto, nunca vai poder
// responder a "os heros contidos convertem melhor?" - nem daqui a um ano, nem com o melhor
// modelo do mundo. Não é uma questão de ainda não termos volume: é que o volume que estamos
// a acumular não tem com o que ser cruzado.
//
// Por isso isto vem antes de qualquer modelo, e é a única parte deste problema que é urgente.
//
// O QUE SE GUARDA, E O QUE DELIBERADAMENTE NÃO SE GUARDA
//
// Guarda-se a DECISÃO, não o objecto que a produziu. O `Positioning` completo tem sinais,
// porquês e uma dúzia de números - e todos eles são recalculáveis a partir do formulário, que
// já está guardado. Guardar coisas deriváveis é como envelhecem em silêncio: mudam-se as
// regras, e as cópias antigas passam a descrever um mundo que já não existe sem que ninguém
// note.
//
// O que NÃO é recalculável é a versão das regras. Uma página gerada em Agosto foi construída
// por juízos diferentes dos de Novembro, e sem esse carimbo nenhuma comparação entre as duas
// significa nada. É o único campo aqui que não se pode reconstruir depois, e é por isso que
// existe.
//
// Nada disto é sobre pessoas. É sobre a página - que hero, que ordem, que razão. O modelo
// Event continua sem cookie, sem endereço e sem nada que se ligue a um visitante.

// A VERSÃO DOS JUÍZOS, NÃO A DO CÓDIGO
//
// Sobe quando muda uma REGRA sobre restaurantes - a escala de preços, a força de um
// diferenciador, o que faz uma casa contida. Não sobe por um `refactor`, por um teste novo
// nem por uma correcção de tipos: uma página gerada antes e depois de um refactor é a mesma
// página, e fingir que não é polui a comparação com ruído que não existe.
//
// Quem alterar uma tabela de juízos e não subir isto está a misturar duas coortes que não são
// comparáveis - e a descobri-lo daqui a seis meses, quando os números não fizerem sentido.
export const REGRAS_VERSAO = 3;

// `type` e nao `interface` de proposito: so um type alias e estruturalmente compativel com
// o Record<string, unknown> que o registo de eventos aceita. Uma interface obrigaria a um
// cast no sitio onde isto e gravado, e um cast e onde os campos novos deixam de ser
// verificados.
export type PageDecisions = {
  regras: number;

  // O que a página é. Cada um destes é uma escolha que podia ter sido outra, e é isso que os
  // torna dignos de guardar: um campo que nunca varia não ensina nada.
  hero: string;
  abreComGaleria: boolean;
  primeiraPergunta: string;
  conversao: string;

  // Porque é que alguém escolhe esta casa - o eixo, não a frase. null quando não encontrámos
  // razão nenhuma, que é um resultado e não uma falha de registo: é precisamente a coorte
  // sobre a qual mais vale a pena aprender.
  razao: string | null;
  razaoNaGaleria: boolean;

  // Em faixas e não em decimais. Uma confiança de 0,8123 dá a ilusão de precisão que a
  // positioning.ts existe para recusar, e para agrupar coortes três faixas chegam.
  confianca: "alta" | "media" | "baixa";
  luxo: "alto" | "medio" | "baixo";

  // Quanto o dono deu. É a variável de confusão mais óbvia de todas: um restaurante com nove
  // fotografias converte melhor do que um com zero por razões que não têm nada a ver com o
  // hero que lhe escolhemos, e sem isto registado toda a leitura futura vai atribuir ao
  // layout aquilo que foi o esforço do dono.
  fotografias: number;
  pratos: number;
  temDescricao: boolean;
};

function faixa(valor: number, alto: number, baixo: number): "alta" | "media" | "baixa" {
  return valor >= alto ? "alta" : valor <= baixo ? "baixa" : "media";
}

export function decisionsFor(input: RestaurantInput, galleryCount: number): PageDecisions {
  const direction = directionFor(input);
  const { posicionamento } = direction;
  const razao = posicionamento.diferenciadores[0] ?? null;

  // AS MESMAS FUNÇÕES QUE CONSTROEM A PÁGINA, E NÃO UMA CÓPIA DELAS
  //
  // A primeira versão disto reescrevia aqui a regra do hero e a da galeria, com um comentário
  // a admitir a duplicação - que é o mesmo defeito que este ficheiro existe para tornar
  // detectável, cometido no ficheiro que o deteta. Duas cópias divergem, e um registo que
  // diverge da realidade é pior do que não registar nada: leva a conclusões erradas com a
  // autoridade de dados.
  //
  // A alternativa que também recusei foi ler as variantes das secções já montadas. Obrigaria
  // a adivinhar de que regra saiu cada uma - e adivinhar a partir do resultado é como se
  // registam decisões que nunca foram tomadas.
  const argumentos = { input, direction, galleryCount, orderCount: 0 };
  const confianca = faixa(posicionamento.confianca, 0.8, 0.5);
  const luxoFaixa = faixa(direction.luxo, 0.65, 0.35);

  return {
    regras: REGRAS_VERSAO,
    hero: heroVariant(argumentos),
    abreComGaleria: galleryCount > 0 && leadsWithGallery(argumentos),
    primeiraPergunta: direction.primeiraPergunta,
    conversao: direction.conversao,
    razao: razao?.eixo ?? null,
    razaoNaGaleria: direction.fotografia.razao !== null,
    confianca,
    luxo: luxoFaixa === "alta" ? "alto" : luxoFaixa === "baixa" ? "baixo" : "medio",
    fotografias: galleryCount,
    pratos: input.dishes.length,
    temDescricao: input.description.trim().length >= 20,
  };
}
