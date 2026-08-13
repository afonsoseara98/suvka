import type { RestaurantInput } from "./input";
import { readSchedule } from "./openNow";
import type { Contradicao } from "./contradictions";

// O QUE FAÇO HOJE PARA ENCHER MAIS MESAS?
//
// A pergunta que o dono tem quando abre o painel, e a que o painel não respondia. Ele via
// quantas pessoas ligaram - o que é bom e é o que renova a subscrição - e depois olhava para
// a lista dos seus sites sem saber o que fazer a seguir. "Onde clico?" não devia ser uma
// pergunta que ele tenha de fazer.
//
// UMA ACÇÃO, NÃO UMA LISTA
//
// Uma lista de dez melhorias é uma lista que não se faz. O dono está numa cozinha, tem quatro
// minutos, e um painel que lhe apresenta um plano de trabalho é um painel que ele fecha. Isto
// devolve UMA - a que mais lhe muda a vida naquele momento - e a seguinte só aparece quando
// a primeira estiver feita.
//
// PORQUE É QUE NÃO HÁ AQUI UM "IMPACTO ESTIMADO"
//
// O desenho pedido incluía "+18% reservas" ao lado de cada recomendação. Não há um número
// desses neste ficheiro, e a razão não é modéstia: é que não temos nenhum. Zero restaurantes
// publicados com tráfego medido significa que qualquer percentagem aqui seria inventada - e
// inventada com a autoridade de uma medição, que é a pior maneira de errar.
//
// Um dono que faz o que lhe dissemos por causa de um "+18%" e não vê +18% não volta a
// acreditar em mais nada que este painel lhe diga. A confiança dele é o activo, e gasta-se
// uma vez.
//
// O que fica no lugar é a razão. "Um cliente que hesita às 23h40 não telefona, mas manda uma
// mensagem" é verdade, é verificável por ele próprio, e não finge ser um número. Quando o
// carimbo de decisões (decisions.ts) tiver acumulado meses de publicações e de cliques, a
// percentagem passa a ser calculável - e nessa altura entra aqui, medida.

export interface SiteState {
  fotografias: number;
  temWhatsapp: boolean;
  temReservas: boolean;
  temGoogle: boolean;
  temDescricao: boolean;
  // O horário foi entendido pelo produto? Quando não é, o "Aberto agora" cala-se e o cliente
  // fica sem a resposta que foi lá buscar.
  horarioLegivel: boolean;
  // Alguma das perguntas que decidem entre dois restaurantes parecidos foi respondida:
  // esplanada, animais, crianças, estacionamento.
  temRazao: boolean;
  temEntregas: boolean;
  temLinksDeEntrega: boolean;
}

export interface NextAction {
  // Curto e no imperativo. É um botão, não um parágrafo.
  titulo: string;
  // Porque é que isto importa, em factos que ele próprio pode confirmar. Nunca uma
  // percentagem, ver acima.
  porque: string;
  // O campo do formulário onde se resolve, para o painel poder levá-lo lá directamente. Um
  // conselho sem destino é um conselho que ele lê e não faz.
  campo: string;
}

// A ORDEM É A DO QUE FAZ FALTA AO CLIENTE DELE, NÃO A DO QUE É FÁCIL DE PEDIR
//
// Primeiro o que deixa a página muda sobre uma pergunta que o visitante REALMENTE faz -
// "estão abertos?", "vale a pena?", "porquê esta e não a do lado?". Depois os canais, que só
// valem alguma coisa depois de ele já ter decidido ir. E as fotografias ficam no topo dessa
// segunda metade porque são a única coisa nesta lista que muda a página inteira.
//
// Nada aqui pede uma coisa que ele já tenha dado, e nada aqui é uma tarefa que exista para o
// painel ter o que dizer: a lista acaba, e quando acaba a resposta é null.
const ACCOES: Array<{ falta: (estado: SiteState) => boolean; accao: NextAction }> = [
  {
    // A pergunta "está aberto agora?" é a mais frequente numa página de restaurante, e o
    // produto sabe respondê-la - mas só quando consegue ler o horário que ele escreveu.
    falta: (e) => !e.horarioLegivel,
    accao: {
      titulo: "Escreva o horário de forma que possamos lê-lo",
      porque:
        "Não conseguimos perceber o horário que está lá, e por isso o site não mostra \"Aberto agora\" a quem entra. É a pergunta que mais gente faz antes de sair de casa.",
      campo: "schedule",
    },
  },
  {
    // Sem isto, o site é verdadeiro e podia ser o de qualquer casa da mesma rua.
    falta: (e) => !e.temRazao && !e.temDescricao,
    accao: {
      titulo: "Diga porque é que escolhem a sua casa",
      porque:
        "O site diz o que serve e onde fica — como o do lado. Falta o que faz alguém passar à sua porta e não à outra: a esplanada, o cão poder entrar, estar aberto à segunda, ou uma frase sua.",
      campo: "description",
    },
  },
  {
    // Três é o mínimo para uma galeria não parecer um acidente.
    falta: (e) => e.fotografias < 3,
    accao: {
      titulo: "Acrescente fotografias suas",
      porque:
        "As fotografias que estão no site são de banco de imagens. Três da sua sala e dos seus pratos mudam a página inteira — e são a única coisa que ninguém pode copiar-lhe.",
      campo: "photos",
    },
  },
  {
    falta: (e) => !e.temWhatsapp,
    accao: {
      titulo: "Acrescente o WhatsApp",
      porque:
        "Um cliente que hesita às 23h40 não telefona — manda uma mensagem. Sem WhatsApp, a única forma de o contactar é uma chamada que muita gente não faz.",
      campo: "whatsapp",
    },
  },
  {
    // "Vale a pena?" é a última pergunta antes de sair de casa, e o site do próprio
    // restaurante era o único sítio onde ela não tinha resposta.
    falta: (e) => !e.temGoogle,
    accao: {
      titulo: "Ligue a sua ficha do Google",
      porque:
        "As suas avaliações verdadeiras estão lá e o seu site é o único sítio onde não aparecem. Nós não copiamos a nota — pomos o link, e o cliente lê-a actual, na fonte.",
      campo: "googleUrl",
    },
  },
  {
    // Anunciar entregas sem dizer onde é pior do que não as anunciar.
    falta: (e) => e.temEntregas && !e.temLinksDeEntrega,
    accao: {
      titulo: "Ponha os links das plataformas de entrega",
      porque:
        "O site diz que faz entregas e não diz por onde. Quem quer encomendar tem de ir procurar a outro lado — e muitas vezes encontra outro restaurante pelo caminho.",
      campo: "uberEats",
    },
  },
  {
    falta: (e) => !e.temReservas,
    accao: {
      titulo: "Ligue o seu sistema de reservas",
      porque:
        "Se já usa o TheFork ou outro, o botão do site pode levar lá directamente em vez de obrigar a telefonar. Uma reserva que se conclui sem sair da página é uma reserva a mais.",
      campo: "bookingUrl",
    },
  },
];

// UMA CONTRADIÇÃO VALE MAIS DO QUE UM CAMPO EM FALTA
//
// Que lhe falta o WhatsApp, ele sabe — é um campo vazio que ele viu quando preencheu. Que o
// site que lhe fizemos parece caro e a casa dele é barata, não sabe, e é a única coisa aqui
// que ele não consegue ver sozinho.
//
// Fica logo a seguir ao horário ilegível, que é o único caso em que a página está neste
// momento a calar-se sobre uma coisa que sabe.
//
// E entra como pergunta, não como tarefa: nós não sabemos qual dos dois lados está errado —
// se escolheu mal a palavra ou se está a cobrar a menos pelo que faz. Ele sabe.
export function nextActionFor(estado: SiteState, contradicoes: Contradicao[] = []): NextAction | null {
  const primeira = ACCOES.find((candidata) => candidata.falta(estado));
  if (primeira?.accao.campo === "schedule") return primeira.accao;

  const grave = contradicoes.find((c) => c.gravidade >= 0.7);
  if (grave) {
    return {
      titulo: grave.decide,
      porque: `${grave.viu} ${grave.custa}`,
      campo: grave.eixo,
    };
  }

  return primeira?.accao ?? null;
}

// Quantas das acções já estão feitas. Não é uma nota nem uma percentagem de "qualidade do
// site" — é uma contagem do que está preenchido, e serve só para o painel poder dizer "faltam
// duas" em vez de deixar o dono sem saber se está perto do fim.
export function remainingActions(estado: SiteState, contradicoes: Contradicao[] = []): number {
  return ACCOES.filter((candidata) => candidata.falta(estado)).length + contradicoes.filter((c) => c.gravidade >= 0.7).length;
}

// O ESTADO DO SITE, LIDO DO FORMULÁRIO QUE ELE PREENCHEU
//
// Separado das regras acima de propósito: as regras são um juízo sobre o que importa a um
// restaurante, e isto é uma leitura de campos. Misturá-los obrigaria os testes das regras a
// montar um `RestaurantInput` inteiro para verificar uma frase.
//
// `fotografiasProprias` vem de fora e não do formulário porque as fotografias não são um
// campo: são ficheiros que ele carregou, e o que conta são as DELE. Um site com seis imagens
// de banco não tem seis fotografias - tem zero, e é essa a acção que falta.
export function siteStateFrom(input: RestaurantInput, fotografiasProprias: number): SiteState {
  return {
    fotografias: fotografiasProprias,
    temWhatsapp: Boolean(input.whatsapp),
    temReservas: Boolean(input.bookingUrl),
    temGoogle: Boolean(input.googleUrl),
    temDescricao: input.description.trim().length >= 20,
    horarioLegivel: readSchedule(input.schedule).readable,
    // Qualquer uma das perguntas que decidem entre dois restaurantes parecidos. Uma chega:
    // o que falta é ele ter dado ALGUMA razão, não todas.
    temRazao: Boolean(input.esplanada || input.aceitaAnimais || input.bomParaCriancas || input.estacionamento),
    temEntregas: input.hasDelivery,
    temLinksDeEntrega: Boolean(input.uberEats || input.glovo || input.boltFood),
  };
}
