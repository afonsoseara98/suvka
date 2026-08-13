import type { RestaurantInput } from "./input";
import { precoMedio } from "./positioning";
import { readSchedule } from "./openNow";

// O QUE NÃO BATE CERTO
//
// Todas as regras deste produto, até aqui, lêem o formulário como se ele fosse coerente. E
// muitas vezes não é - não porque o dono se engane, mas porque ninguém olha para o próprio
// negócio de fora. Ele escolhe "Elegante" porque gosta da palavra e cobra 9 € por prato
// porque é o que a rua paga, e as duas coisas nunca estiveram na mesma frase até nós as
// pormos lá.
//
// PORQUE É QUE ISTO CUSTA CLIENTES, E NÃO É UMA QUESTÃO DE GOSTO
//
// Uma página que promete uma coisa e uma casa que serve outra produz a pior primeira visita
// que existe: o cliente não fica desiludido com a comida, fica desiludido com a diferença. E
// não volta, nem diz porquê. É a única forma de insucesso que não deixa rasto nenhum - nem
// uma avaliação, nem uma chamada, nem um clique que se possa contar.
//
// Uma contradição é a coisa de maior valor que este produto pode dizer a um dono, porque é a
// única que ele não consegue ver sozinho. Que lhe falta o WhatsApp, ele sabe. Que o site que
// lhe fizemos parece caro e a casa dele é barata, não.
//
// O QUE ISTO NUNCA FAZ: RESOLVER SOZINHO
//
// Quando o estilo e o preço discordam, a geração já decide - e decide a favor do preço, que é
// o único dos dois que foi testado contra clientes a sério (ver positioning.ts). Isso resolve
// a PÁGINA. Não resolve o negócio.
//
// Porque há dois mundos em que aquele formulário faz sentido, e são opostos: ou ele escolheu
// mal a palavra, ou está a cobrar a menos pelo que faz. O primeiro corrige-se numa caixa; o
// segundo vale-lhe uns milhares de euros por ano. Nós não sabemos qual é - ele sabe.
//
// Por isso cada contradição acaba numa PERGUNTA e não numa instrução. Um produto que decide
// pelo dono em vez de lhe mostrar o que ele não viu está a trocar a única coisa que tem para
// oferecer - saber olhar de fora - por uma conveniência que ninguém lhe pediu.
//
// E PORQUE É QUE SÃO POUCAS
//
// Só entram as que são verdade no mercado português e que eu consigo defender uma a uma. Um
// motor de contradições que dispara sobre coisas plausíveis ensina o dono a fechar o aviso, e
// a partir daí o aviso que importava também é fechado. A lista é curta de propósito e cresce
// com restaurantes reais à frente, não com ideias.
//
// Três que considerei e deixei de fora, para quem vier a seguir não as reintroduzir por
// parecerem óbvias:
//
//   "japonês + rústico"          um izakaya é rústico e é japonês. Não é contradição nenhuma.
//   "hambúrguer a 25 €"          existe, chama-se hambúrguer gourmet, e paga-se em Lisboa.
//   "cara + boa para crianças"   é raro e por isso é um ARGUMENTO, não um defeito. Já é
//                                tratado como diferenciador em positioning.ts, e disparar
//                                aqui contradiria a nossa própria leitura.

export interface Contradicao {
  eixo: string;
  // Os dois lados, com os números dele. Um aviso que não mostra o que viu é um aviso em que
  // não se acredita.
  viu: string;
  // O que isto custa ao cliente que entra pela porta. Nunca uma percentagem: não temos
  // nenhuma medida, e um número inventado tem a autoridade de uma medição.
  custa: string;
  // A pergunta que só ele pode responder. Deliberadamente uma pergunta.
  decide: string;
  gravidade: number;
}

// O QUE CONTA AQUI É O PREÇO, E NÃO O "LUXO"
//
// Apanhado por um teste, e era um erro de desenho meu. A primeira versão destas duas regras
// disparava com `luxo > 0.7` - e o luxo mistura o preço com o estilo que ele escolheu na
// caixa. Uma tasca rústica com pratos a 45 € dava luxo 0,69 e ficava de fora: a palavra
// "rústico" silenciava um aviso sobre um preço de 45 €.
//
// E o preço é precisamente o que importa nestas duas. A 45 € ninguém aparece à sorte, tenha a
// sala azulejos ou toalhas de linho; e uma mota leva a mesma comida sem a sala, custe a sala o
// que custar. Misturar o estilo aqui era deixar uma escolha de gosto abafar um facto.
const CARO = 32;

// A gravidade é quanto isto estraga a primeira visita, não quão errado está no papel.
const GRAVE = 0.9;
const SERIA = 0.7;
const VALE_A_PENA_DIZER = 0.5;

export function contradicoesDe(input: RestaurantInput, fotografiasProprias: number): Contradicao[] {
  const encontradas: Contradicao[] = [];
  const medio = precoMedio(input);

  // O ESTILO QUE ELE ESCOLHEU CONTRA O PREÇO QUE ELE PRATICA
  //
  // Os dois sentidos custam coisas diferentes, e por isso são duas contradições e não uma.
  //
  // Vender-se acima do que é defrauda quem chega: a página promete uma noite e a casa serve
  // outra. Vender-se abaixo do que é é o contrário - e é o mais caro dos dois, porque não se
  // vê. Ninguém se queixa de um restaurante que parecia mais barato do que era; simplesmente
  // aparece menos gente disposta a pagar aquilo.
  if (medio !== null && (input.style === "Elegant" || input.style === "Minimal") && medio <= 12) {
    encontradas.push({
      eixo: "estiloAcimaDoPreco",
      viu: `Escolheu o estilo "${input.style === "Elegant" ? "Elegante" : "Minimal"}" e os pratos estão a ${medio.toFixed(0)} €.`,
      custa:
        "O site vai parecer mais caro do que a casa é. Quem chega à porta à espera de uma coisa e encontra outra não fica desiludido com a comida — fica com a diferença, e é a visita que não se repete.",
      decide: "O estilo está mal escolhido, ou os preços estão desactualizados?",
      gravidade: GRAVE,
    });
  }

  if (medio !== null && (input.style === "Rustic" || input.style === "Casual") && medio >= 32) {
    encontradas.push({
      eixo: "precoAcimaDoEstilo",
      viu: `Escolheu o estilo "${input.style === "Rustic" ? "Rústico" : "Casual"}" e os pratos estão a ${medio.toFixed(0)} €.`,
      custa:
        "É o erro mais caro dos dois, e o que não se vê: ninguém se queixa de um site que parecia mais barato do que a casa é — aparece só menos gente disposta a pagar aquele valor.",
      decide: "A casa é mesmo simples a esse preço, ou o site está a vendê-la abaixo do que ela é?",
      gravidade: GRAVE,
    });
  }

  // UM ESTILO CONTIDO COM A SALA TODA NAS PAREDES
  //
  // A contenção faz-se com menos coisas a competir. Doze fotografias não são um estilo
  // minimal com muitas fotografias - são outra casa.
  if (input.style === "Minimal" && fotografiasProprias >= 8) {
    encontradas.push({
      eixo: "minimalComMuitaCoisa",
      viu: `Escolheu o estilo "Minimal" e carregou ${fotografiasProprias} fotografias.`,
      custa:
        "A contenção faz-se com menos coisas a competir, não com mais. Com esta quantidade de imagens, o que sai é uma página cheia — que pode ser exactamente o que quer, mas não é minimal.",
      decide: "Quer a página contida, ou quer mostrar a sala toda?",
      gravidade: VALE_A_PENA_DIZER,
    });
  }

  // ALTA COZINHA NAS PLATAFORMAS DE ENTREGA
  //
  // Não é esnobismo: a promessa de uma casa cara é a sala, o serviço e o tempo. Uma mota a
  // levar aquilo numa caixa é a mesma comida sem nada do que a justificava, e o cliente que
  // a experimenta assim fica com a ideia de que aquilo não valia o preço.
  const plataformas = [input.uberEats, input.glovo, input.boltFood].filter(Boolean).length;
  if (medio !== null && medio >= CARO && plataformas > 0) {
    encontradas.push({
      eixo: "casaCaraEmPlataformas",
      viu: `Os pratos estão a ${medio.toFixed(0)} € e a casa tem ${plataformas === 1 ? "uma plataforma de entregas" : `${plataformas} plataformas de entregas`}.`,
      custa:
        "O que uma casa destas vende é a sala, o serviço e o tempo. Numa caixa em cima de uma mota chega a comida sem nada do que justifica o preço — e o cliente conclui que não valia.",
      decide: "As entregas são uma parte a sério do negócio, ou sobraram de uma altura em que eram?",
      gravidade: SERIA,
    });
  }

  // UMA CASA CARA SEM ONDE RESERVAR
  //
  // A 40 € por prato ninguém aparece à sorte. E às 20h30, em serviço, o telefone não é
  // atendido - a mesa perde-se e não fica registo de que existiu.
  if (medio !== null && medio >= CARO && !input.bookingUrl && !input.whatsapp) {
    encontradas.push({
      eixo: "casaCaraSemReservas",
      viu: `Os pratos estão a ${medio.toFixed(0)} € e a única forma de reservar é telefonar.`,
      custa:
        "A este preço quase ninguém aparece sem reservar. E às 20h30, em pleno serviço, o telefone não é atendido: a mesa perde-se sem deixar rasto de que alguém a quis.",
      decide: "Tem sistema de reservas para ligar, ou pelo menos um WhatsApp que alguém veja?",
      gravidade: SERIA,
    });
  }

  // UMA CARTA LONGA NUMA CASA QUE VENDE CONTENÇÃO
  //
  // Vinte pratos é uma cozinha que faz muita coisa. Pode ser óptimo e é o oposto do que uma
  // casa de alta cozinha diz que é.
  if (input.cuisine === "Fine dining" && input.dishes.length >= 20) {
    encontradas.push({
      eixo: "altaCozinhaComCartaLonga",
      viu: `Está marcado como alta cozinha e tem ${input.dishes.length} pratos na ementa.`,
      custa:
        "Uma carta desta dimensão diz ao cliente que a cozinha faz muita coisa — que pode ser verdade e ser bom, mas é o contrário do que uma casa de alta cozinha promete.",
      decide: "É mesmo alta cozinha, ou é um restaurante bom com uma carta grande?",
      gravidade: VALE_A_PENA_DIZER,
    });
  }

  // UM CAFÉ QUE SÓ ABRE À NOITE
  //
  // Quase de certeza é o horário que está mal escrito e não a casa que é estranha - mas
  // qualquer das duas hipóteses vale a pergunta, porque o site está neste momento a dizer
  // uma delas a toda a gente.
  const horario = readSchedule(input.schedule);
  if ((input.cuisine === "Café" || input.cuisine === "Fast-casual") && horario.readable) {
    const abreDeManha = horario.ranges.some((intervalo) => Number.parseInt(intervalo.slice(0, 2), 10) < 12);
    if (!abreDeManha) {
      encontradas.push({
        eixo: "cafeSemManha",
        viu: `Está marcado como ${input.cuisine === "Café" ? "café" : "refeições rápidas"} e o horário só começa depois do meio-dia.`,
        custa:
          "Quem procura um café procura-o de manhã. O site está a dizer a essas pessoas que está fechado exactamente à hora em que elas o queriam.",
        decide: "O horário está completo, ou faltou lá a parte da manhã?",
        gravidade: SERIA,
      });
    }
  }

  return encontradas.sort((a, b) => b.gravidade - a.gravidade);
}
