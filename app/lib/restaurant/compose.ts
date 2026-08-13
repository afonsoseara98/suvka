import type { Section } from "@/app/types/landing";
import type { RestaurantInput } from "./input";

// O QUE ISTO CORRIGE, E É UMA PROMESSA POR CUMPRIR
//
// O SUVKA_NORTH_STAR.md diz, em letra: "Nenhum utilizador recebe a página de outro —
// diversidade estrutural por design, não por sorte." E: "A minha página não parece a de mais
// ninguém."
//
// Medido antes disto existir, com dez restaurantes de cozinhas e estilos diferentes:
//
//   assinaturas de cor distintas      9 de 10
//   ESTRUTURAS distintas              1 de 10
//
// Todos recebiam exactamente a mesma página — `hero:centered menu:list hours:columns
// footer:simple` — com cores diferentes. E dois restaurantes portugueses rústicos recebiam
// sites indistinguíveis até na cor.
//
// Cor não é estrutura. Dez sites com a mesma arquitectura e paletas diferentes são um
// template com dez skins, e é exactamente isso que um dono reconhece quando diz "isto parece
// gerado".
//
// O QUE UMA AGÊNCIA FAZ E UM TEMPLATE NÃO FAZ
//
// Uma agência não escolhe um modelo. Decide qual é a história daquele restaurante e constrói
// a página à volta disso. Uma marisqueira com a sala cheia de fotografias vende o ambiente e
// abre com as fotografias. Uma tasca com catorze pratos vende a comida e abre com a ementa.
// Um restaurante de alta cozinha vende contenção, e a contenção faz-se com menos secções e
// mais espaço — não com mais coisas na página.
//
// Isto é essa decisão, tomada a partir do que o dono JÁ nos deu. Nada é inventado: as regras
// só lêem factos dele — quantas fotografias, quantos pratos, que tipo de casa, se faz
// entregas.
//
// PORQUE É QUE ISTO NÃO SE COPIA NUM DIA
//
// O mecanismo copia-se numa tarde. O que não se copia é o conjunto de juízos sobre
// restaurantes: que quem tem seis fotografias vende a sala e não a lista, que um café precisa
// do horário acima porque a pergunta é "está aberto agora", que numa casa de alta cozinha o
// espaço vazio é o argumento. Cada regra nova que aprendermos de um restaurante real melhora
// todos os seguintes, e é isso que acumula.

// O DESEMPATE ENTRE DUAS CASAS IGUAIS
//
// Dois restaurantes portugueses rústicos são, para as regras abaixo, o mesmo caso — e
// recebiam a mesma página. Quando há várias composições igualmente boas, a escolha vem do
// NOME do restaurante, que é dele e não muda.
//
// Determinístico de propósito, e não aleatório: regenerar o mesmo restaurante tem de dar
// exactamente a mesma página. Uma página que se reorganiza sozinha entre visitas não é
// diversidade — é o produto a parecer avariado.
export function seedOf(name: string): number {
  return Math.abs([...name].reduce((total, char) => total * 31 + char.charCodeAt(0), 7));
}

function pick<T>(options: readonly T[], seed: number): T {
  return options[seed % options.length];
}

export interface ComposeInput {
  input: RestaurantInput;
  galleryCount: number;
  orderCount: number;
}

// O hero é a primeira decisão e a que mais muda a leitura da página inteira.
//
//   minimal   espaço a sério à volta do nome. É o que uma casa de alta cozinha compra.
//   split     a fotografia ao lado das palavras, como um cartão de ementa.
//   centered  o nome ao centro, quente e directo. É a tasca e o café.
//
// Os três já existiam construídos em app/components/hero/ e nenhum era usado: o `variant`
// estava fixo em "centered" desde sempre.
// A REGRA DECIDE O QUE É DEFENSÁVEL; O NOME DECIDE ENTRE OS DEFENSÁVEIS
//
// Esta distinção é o que separa "dez sites diferentes" de "dez sites certos e diferentes".
//
// Há casos em que só uma leitura é defensável: uma casa de alta cozinha com o nome ao centro
// e uma fotografia gigante ao lado deixa de ser contida, e a contenção era o argumento. Aí a
// regra fixa, e o nome não vota.
//
// Nos outros, duas ou três leituras são todas boas — e é aí que o nome escolhe. Sem isto,
// duas tascas portuguesas rústicas com quatro fotografias cada recebiam a MESMA página, que
// é precisamente o que o SUVKA_NORTH_STAR.md promete que não acontece.
function heroVariant({ input, galleryCount }: ComposeInput): string {
  // Contenção não é uma preferência: é o produto que a casa vende. Fixo.
  if (input.style === "Minimal" || input.cuisine === "Fine dining" || input.style === "Elegant") {
    return "minimal";
  }

  const seed = seedOf(input.name);

  // Com fotografias a sério, "split" é a leitura mais forte — mas "centered" continua a ser
  // boa, e uma rua com duas tascas não pode ter duas páginas iguais.
  if (galleryCount >= 2 && (input.style === "Rustic" || input.style === "Classic")) {
    return pick(["split", "split", "centered"] as const, seed);
  }

  return pick(["centered", "split"] as const, seed);
}

// O QUE ABRE A PÁGINA A SEGUIR AO NOME
//
// A pergunta é: o que é que esta casa vende primeiro? A resposta está no que o dono deu.
function leadsWithGallery({ input, galleryCount }: ComposeInput): boolean {
  // Quatro fotografias ou mais é uma casa que investiu em mostrar-se. A sala é o argumento.
  if (galleryCount >= 4) return true;
  // Poucos pratos e alguma fotografia: a lista não sustenta a página sozinha.
  if (galleryCount >= 2 && input.dishes.length <= 3) return true;
  return false;
}

export function composeSections(args: ComposeInput): Section[] {
  const { input, galleryCount, orderCount } = args;
  const seed = seedOf(input.name);

  const contido = input.cuisine === "Fine dining" || input.style === "Minimal" || input.style === "Elegant";
  // Uma casa que se vende pela contenção não leva a página cheia de ar entre tudo: leva
  // MENOS secções a competir e mais espaço em volta das que ficam.
  const respiro = contido ? "breather" : "standard";

  const sections: Section[] = [
    { type: "hero", variant: heroVariant(args), prominence: "primary", rhythm: respiro },
  ];

  const galeria: Section = {
    type: "gallery",
    // "masonry" quando há fotografias que cheguem para uma parede; senão uma grelha, que com
    // três fotografias fica melhor do que um mosaico desequilibrado. Com muitas, as duas
    // leituras servem — e aí o nome vota.
    variant: galleryCount >= 6 ? pick(["masonry", "grid"] as const, seed) : galleryCount >= 4 ? "masonry" : "grid",
    prominence: "primary",
    rhythm: respiro,
  };

  const ementa: Section = {
    type: "menu",
    // Uma ementa longa lê-se melhor em duas colunas; uma curta em lista, como um cartão.
    variant: input.dishes.length >= 8 ? "columns" : "list",
    prominence: "primary",
    // O RITMO É O EIXO QUE NÃO SE VÊ NA ESTRUTURA E SE VÊ NA PÁGINA
    //
    // Duas páginas com as mesmas secções pela mesma ordem continuam a ser páginas diferentes
    // se uma respirar e a outra for densa - é a diferença entre uma ementa de tasca e uma
    // carta de restaurante, e nenhuma das duas está errada.
    //
    // Numa casa contida o respiro é o argumento e fica fixo. Nas outras, vota o nome.
    rhythm: contido ? "breather" : pick(["breather", "standard"] as const, seed),
  };

  if (galleryCount > 0 && leadsWithGallery(args)) {
    sections.push(galeria);
    if (input.dishes.length > 0) sections.push(ementa);
  } else {
    if (input.dishes.length > 0) sections.push(ementa);
    if (galleryCount > 0) sections.push(galeria);
  }

  // Logo a seguir à ementa: o cliente acabou de ler os pratos e é aí que quer encomendar.
  if (orderCount > 0) {
    sections.push({ type: "orders", variant: "buttons", prominence: "primary", rhythm: "standard" });
  }

  // O HORÁRIO SOBE NUM CAFÉ E NUMA CASA DE REFEIÇÕES RÁPIDAS
  //
  // A pergunta de quem procura um café é "está aberto agora", e não "o que é que servem".
  // Num restaurante de jantar a pergunta é outra, e o horário pode ficar onde sempre esteve.
  const horarioPrimeiro = input.cuisine === "Café" || input.cuisine === "Fast-casual";
  const horario: Section = {
    type: "hours",
    variant: pick(["columns", "stacked"] as const, seed),
    prominence: horarioPrimeiro ? "primary" : "standard",
    rhythm: "standard",
  };

  if (horarioPrimeiro) sections.splice(1, 0, horario);
  else sections.push(horario);

  sections.push({ type: "footer", variant: "simple", prominence: "compact", rhythm: "standard" });

  return sections;
}
