import type { RestaurantInput } from "./input";
import { positioningFor, precoMedio, luxoDoPreco, type Positioning } from "./positioning";

// DIRECÇÃO CRIATIVA
//
// A camada que faltava, e que muda a ordem das perguntas.
//
// Antes: cozinha e estilo → layout. Uma tabela de consulta com o formulário de um lado e
// componentes do outro, e o resultado eram dez restaurantes com a mesma página e cores
// diferentes.
//
// Agora: cozinha, estilo, preços, fotografias e canais → **o que esta casa vende** → e só
// depois o layout, as fotografias, o ritmo e o DNA visual.
//
// UM RESTAURANTE ITALIANO NÃO VENDE COMIDA ITALIANA
//
// Vende domingo, família, forno, vinho, a avó. Uma churrascaria vende fogo, carvão, faca,
// peso. Um sushi de qualidade vende silêncio, precisão e confiança. Uma pastelaria vende a
// manhã, o cheiro e a rotina do bairro.
//
// É por isso que dez restaurantes com layouts diferentes continuavam a parecer o mesmo
// produto: as fotografias vinham todas da mesma pergunta - `${cuisine} restaurant plated
// dish` - e uma fotografia de um prato bem apresentado é a coisa mais intercambiável que
// existe. A direcção criativa é o que faz uma tasca pedir mãos e vapor, e uma casa de alta
// cozinha pedir espaço vazio e uma mesa posta.
//
// O SINAL QUE NINGUÉM USAVA: O PREÇO
//
// O dono escreve o preço de três pratos e o produto usava-o para uma coisa só - imprimi-lo.
// Mas uma casa com pratos a 8 € e uma com pratos a 45 € não são a mesma casa, e a diferença
// entre elas é maior do que a diferença entre "rústico" e "clássico" que ele escolheu numa
// caixa. É o dado mais honesto que temos sobre o posicionamento, porque não é uma opinião
// dele sobre si próprio - é o que ele cobra.
//
// NADA AQUI É INVENTADO
//
// Cada eixo abaixo é uma leitura de factos que o dono deu. A direcção nunca aparece no site
// nem é mostrada a ninguém: é um documento invisível que decide, e o que o cliente lê
// continua a ser só o que o dono escreveu.

export type Energy = "baixa" | "media" | "alta";
export type Voice = "calma" | "quente" | "directa";
export type Conversion = "reserva" | "encomenda" | "chamada";

// A PRIMEIRA PERGUNTA DE QUEM ABRE A PÁGINA
//
// Não é a mesma para toda a gente, e é ela que decide o que fica no topo.
//
//   aberto   "está aberto agora?" - o café e o sítio de refeições rápidas. A pessoa está na
//            rua, decide em dez segundos, e o horário é a resposta.
//   ementa   "o que é que servem?" - o almoço e o jantar comuns.
//   vale     "vale a pena?" - a casa cara. Ninguém gasta 45 € numa lista de pratos; gasta
//            numa sala e numa ideia, e por isso aqui a página abre com espaço e não com
//            informação.
//
// Existe aqui em cima, e não no compose, precisamente porque é uma pergunta sobre o
// restaurante e não sobre a página. O layout limita-se a obedecer-lhe.
export type Duvida = "aberto" | "ementa" | "vale";

export interface CreativeDirection {
  // O que a casa vende, por palavras. Alimenta as fotografias e mais nada — nunca é texto
  // que alguém leia.
  vende: string[];

  // Contínuos, como o StrategyDNA que isto alimenta. Nada de rótulos onde um número serve:
  // um restaurante não é "de luxo" ou "popular", está algures entre os dois.
  luxo: number;
  rusticidade: number;
  intimidade: number;

  energia: Energy;
  voz: Voice;
  primeiraPergunta: Duvida;

  // O que a página tem de conseguir que aconteça. Decidido pelo canal que o dono tem, e não
  // pelo que gostaríamos que ele tivesse.
  conversao: Conversion;

  // As perguntas que vão às fotografias. É aqui que dois restaurantes portugueses deixam de
  // receber a mesma imagem.
  //
  // `razao` é o eixo do diferenciador que ESTÁ na galeria, ou null quando a razão desta casa
  // não se fotografa. Fica exposto para o layout não ter de calcular a mesma coisa outra vez:
  // duas listas dos mesmos três eixos discordariam à primeira alteração, e o resultado seria
  // uma página que abre com a galeria sem ter lá a fotografia que justificava abri-la.
  fotografia: { hero: string; galeria: string[]; razao: string | null };

  // A camada de cima: para quem é esta casa, e porque é que alguém a escolhe em vez da do
  // lado. Fica exposta em vez de consumida em silêncio, porque é o que o resto do sistema -
  // emails, SEO, anúncios - vai precisar de ler, e porque sem isto guardado não há como
  // perguntar daqui a um ano se as decisões que tomámos estavam certas.
  posicionamento: Positioning;
}

// O QUE CADA COZINHA VENDE
//
// Não é o que serve. Um director criativo não escreve "comida italiana" num moodboard —
// escreve domingo, forno, vinho, avó.
const VENDE: Record<string, string[]> = {
  Portuguese: ["tasca", "mãos", "vapor", "peixe", "azulejo", "mesa cheia"],
  Italian: ["família", "forno", "massa fresca", "vinho", "domingo", "mesa comprida"],
  Japanese: ["silêncio", "precisão", "balcão", "faca", "detalhe", "espaço vazio"],
  "Fine dining": ["contenção", "mesa posta", "luz baixa", "detalhe", "serviço", "espaço"],
  Burgers: ["fogo", "grelha", "carvão", "textura", "mãos", "excesso"],
  Pizza: ["forno a lenha", "chama", "massa", "partilha", "farinha", "calor"],
  Café: ["manhã", "vapor", "balcão", "bairro", "rotina", "luz natural"],
  "Fast-casual": ["rapidez", "balcão", "cores", "movimento", "dia", "simples"],
};

// O preço e a escala que o lê vivem em positioning.ts, que é a camada de cima: são uma
// afirmação sobre onde esta casa está no mercado, e não sobre o aspecto que deve ter.

const LUXO_ESTILO: Record<string, number> = {
  Elegant: 0.8,
  Minimal: 0.6,
  Classic: 0.5,
  Modern: 0.45,
  Casual: 0.25,
  Rustic: 0.2,
};

const RUSTICIDADE_ESTILO: Record<string, number> = {
  Rustic: 0.9,
  Classic: 0.6,
  Casual: 0.5,
  Modern: 0.2,
  Elegant: 0.15,
  Minimal: 0.1,
};

export function directionFor(input: RestaurantInput): CreativeDirection {
  const vende = VENDE[input.cuisine] ?? ["mesa", "comida", "sala"];
  const posicionamento = positioningFor(input);

  // O QUE ELE COBRA GANHA AO QUE ELE DIZ QUE É
  //
  // O estilo é uma escolha numa caixa; o preço é o que ele pratica todos os dias. Quando os
  // dois discordam — "rústico" com pratos a 42 € — o preço pesa mais, porque é o único dos
  // dois que já foi testado contra clientes a sério.
  const doPreco = luxoDoPreco(precoMedio(input));
  const doEstilo = LUXO_ESTILO[input.style] ?? 0.4;
  const luxo = doPreco === null ? doEstilo : doPreco * 0.65 + doEstilo * 0.35;

  const rusticidade = RUSTICIDADE_ESTILO[input.style] ?? 0.4;

  // Intimidade é o oposto de movimento. Uma casa de jantar com poucos pratos e sem entregas
  // é íntima; um sítio com take-away e três plataformas de encomenda não é, nem quer ser.
  const movimento = (input.hasDelivery ? 0.3 : 0) + (input.uberEats || input.glovo || input.boltFood ? 0.3 : 0);
  // UMA CASA QUE RECEBE FAMÍLIAS NÃO É UMA CASA ÍNTIMA, POR MAIS CARA QUE SEJA
  //
  // O preço sozinho dizia que sim, e estava errado: uma sala com mesas de oito e carrinhos de
  // bebé é uma sala com barulho. Quando o dono declara que é bom para crianças, isso é um
  // facto sobre a sala que o preço não sabe - e o público entra aqui como correcção.
  const familia = posicionamento.publico.familia;
  const correccaoDePublico = familia.base === "afirmado" ? -0.25 : 0;
  const intimidade = Math.max(0, Math.min(1, 0.4 + luxo * 0.5 - movimento + correccaoDePublico));

  const energia: Energy =
    input.cuisine === "Fine dining" || input.style === "Minimal" || luxo > 0.7
      ? "baixa"
      : input.cuisine === "Burgers" || input.cuisine === "Fast-casual" || input.cuisine === "Pizza"
        ? "alta"
        : "media";

  const voz: Voice = luxo > 0.7 ? "calma" : rusticidade > 0.55 ? "quente" : "directa";

  // O café e o sítio de refeições rápidas ganham à casa cara nesta ordem de propósito: quem
  // está na rua a decidir em dez segundos precisa do horário mesmo que a casa seja boa.
  const primeiraPergunta: Duvida =
    input.cuisine === "Café" || input.cuisine === "Fast-casual" ? "aberto" : luxo > 0.65 ? "vale" : "ementa";

  // O QUE A PÁGINA TEM DE CONSEGUIR
  //
  // Decidido pelo canal que ele TEM. Uma página desenhada à volta de reservas num sítio que
  // só faz take-away está a pedir uma coisa que a casa não faz.
  const conversao: Conversion = input.bookingUrl
    ? "reserva"
    : input.uberEats || input.glovo || input.boltFood
      ? "encomenda"
      : input.whatsapp
        ? "reserva"
        : "chamada";

  return {
    vende,
    luxo,
    rusticidade,
    intimidade,
    energia,
    voz,
    primeiraPergunta,
    conversao,
    fotografia: fotografiaPara(input, luxo, posicionamento),
    posicionamento,
  };
}

// AS FOTOGRAFIAS SÃO O QUE MAIS DENUNCIA UM SITE GERADO
//
// Antes, todas as casas pediam a mesma coisa: `${cozinha} restaurant plated dish`, e depois
// "food close up", "dining room warm interior", "chef plating in kitchen". Quatro perguntas
// iguais para toda a gente — e uma fotografia de um prato bem empratado é a imagem mais
// intercambiável que existe. Dois restaurantes ao lado um do outro ficavam com irmãs gémeas.
//
// Agora a pergunta sai da direcção criativa. Uma tasca pede mãos e vapor; uma casa de alta
// cozinha pede uma mesa posta e espaço vazio; uma pastelaria pede a luz da manhã ao balcão.
// O `vende` acima é vocabulário criativo, em português, para raciocinar e para o resto do
// sistema um dia consumir. NÃO serve para perguntar a um banco de imagens: uma consulta como
// "japanese silêncio rustic authentic" devolve fotografias erradas, e "rustic" numa casa de
// sushi devolve exactamente o oposto do que ela é.
//
// Apanhado a medir, não a rever: as primeiras consultas geradas saíam com palavras
// portuguesas no meio de inglês, e uma delas dizia "fine dining fine dining plated dish"
// porque a cozinha já se chamava assim.
//
// Por isso os temas fotográficos são uma lista própria, em inglês, e por cozinha.
const TEMAS: Record<string, { hero: string; galeria: string[] }> = {
  Portuguese: {
    hero: "portuguese tavern grilled fish rustic table",
    galeria: [
      "hands serving portuguese food steam",
      "small tavern interior azulejo tiles",
      "grilled sardines close up",
      "portuguese seafood rice pot",
    ],
  },
  Italian: {
    hero: "italian trattoria long table family meal",
    galeria: [
      "fresh pasta being made by hands flour",
      "wood fired oven flame pizza",
      "red wine poured at rustic table",
      "trattoria interior warm evening",
    ],
  },
  Japanese: {
    hero: "sushi counter minimal wood dark",
    galeria: [
      "chef hands slicing fish precision",
      "nigiri on dark stone close up",
      "empty sushi counter clean minimal",
      "japanese ceramic tea cup detail",
    ],
  },
  "Fine dining": {
    hero: "fine dining plated course dark elegant",
    galeria: [
      "elegant table setting candlelight",
      "chef hands plating detail tweezers",
      "tasting menu course close up",
      "empty elegant dining room low light",
    ],
  },
  Burgers: {
    hero: "burger on grill flame charcoal",
    galeria: [
      "hands holding burger close up",
      "grill flames char smoke",
      "fries in basket overhead",
      "casual burger restaurant interior",
    ],
  },
  Pizza: {
    hero: "wood fired pizza oven flame",
    galeria: [
      "pizza dough being stretched flour hands",
      "pizza sliced sharing table",
      "wood fire embers close up",
      "pizzeria interior warm light",
    ],
  },
  Café: {
    hero: "cafe counter morning light pastries",
    galeria: [
      "espresso being poured close up",
      "bakery pastries on counter warm light",
      "cafe interior morning natural light",
      "hands holding coffee cup",
    ],
  },
  "Fast-casual": {
    hero: "casual food counter bright daytime",
    galeria: [
      "food bowl overhead colourful",
      "counter service bright interior",
      "hands assembling food quickly",
      "takeaway packaging on counter",
    ],
  },
};

const TEMA_NEUTRO = {
  hero: "restaurant table set warm light",
  galeria: [
    "plated food close up",
    "restaurant dining room interior",
    "hands serving at table",
    "chef in kitchen working",
  ],
};

// A FOTOGRAFIA DA RAZÃO
//
// Nem toda a razão para escolher uma casa se fotografa. "Abre à segunda" e "aceita MB Way"
// são verdadeiros e decisivos e não têm imagem - forçar uma seria inventar. Só estes três
// entram, e só quando o dono os afirmou.
const FOTO_DO_DIFERENCIADOR: Record<string, string> = {
  esplanada: "restaurant terrace outdoor seating",
  animais: "dog lying under restaurant table",
  criancas: "family with children eating at restaurant table",
};

function fotografiaPara(input: RestaurantInput, luxo: number, posicionamento: Positioning): CreativeDirection["fotografia"] {
  const base = TEMAS[input.cuisine] ?? TEMA_NEUTRO;

  // O LUXO MUDA O TRATAMENTO, NÃO O TEMA
  //
  // Uma marisqueira cara e uma tasca fotografam a mesma coisa - peixe, mãos, mesa - e a
  // diferença está na luz e no enquadramento, que é exactamente como um fotógrafo pensa.
  // Trocar o tema faria a casa cara deixar de parecer o que é.
  const tratamento = luxo > 0.7 ? " low light elegant" : luxo < 0.3 ? " natural daylight candid" : "";

  // A RAZÃO PELA QUAL ALGUÉM ESCOLHE ESTA CASA É A PRIMEIRA COISA DA GALERIA
  //
  // As oito listas acima distinguem cozinhas, e é o mais longe que se chega a olhar só para a
  // casa: duas tascas portuguesas continuavam a receber as mesmas quatro fotografias. Isto é
  // o que as separa, e não é um efeito - é a única imagem da galeria que existe por causa de
  // um facto daquele restaurante e de mais nenhum.
  //
  // Entra à frente e não no fim porque é a razão, e a razão não se põe em último. E empurra
  // a última para fora em vez de acrescentar: o número de fotografias que pedimos é o mesmo,
  // e a que sai é a mais genérica da lista.
  // A mais forte de entre as que se vêem — que não é necessariamente a mais forte de todas.
  // Uma casa cuja melhor razão é abrir à segunda e cuja segunda melhor é a esplanada mostra a
  // esplanada, porque é essa que tem imagem.
  const razao = posicionamento.diferenciadores.find((d) => d.base === "afirmado" && FOTO_DO_DIFERENCIADOR[d.eixo]);

  return {
    hero: `${base.hero}${tratamento}`,
    galeria: razao
      ? [FOTO_DO_DIFERENCIADOR[razao.eixo], ...base.galeria].slice(0, base.galeria.length)
      : base.galeria,
    razao: razao?.eixo ?? null,
  };
}
