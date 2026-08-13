import type { RestaurantInput } from "./input";
import { readSchedule } from "./openNow";

// PORQUE É QUE ALGUÉM ESCOLHERIA ESTA CASA EM VEZ DA DA PORTA AO LADO?
//
// A camada acima da direcção criativa, e a pergunta que faltava fazer.
//
// A direcção criativa responde "o que é que esta casa vende". É uma pergunta sobre a casa
// em si, e por isso duas tascas portuguesas rústicas com pratos a 11 € dão exactamente a
// mesma resposta - porque são, de facto, a mesma coisa. Isso não é um defeito da direcção
// criativa: é o limite dela.
//
// A pergunta que separa as duas é outra, e é comparativa: um cliente já escolheu a zona e o
// tipo de comida, tem duas portas à frente, e escolhe UMA. Porquê?
//
// A resposta quase nunca é "porque a comida é melhor" - ele ainda não a provou. É porque
// pode levar o cão. Porque tem esplanada. Porque abre à segunda, quando a outra fecha.
// Porque estaciona. Porque leva os miúdos. São razões pequenas, verdadeiras, e é o produto
// que as tem de encontrar, porque o dono não as vê: para ele, ter esplanada não é uma
// vantagem, é só uma coisa que tem.
//
// O QUE ISTO NUNCA FAZ: INVENTAR UM NÚMERO
//
// A tentação óbvia era um painel de eixos - "Turistas: 0,78", "Romântico: 0,71" - e ficava
// muito bem num ecrã. Mas não temos como saber se uma casa serve turistas. Escrever 0,78
// não torna a coisa mais verdadeira; torna-a mais convincente, que é pior, porque toda a
// gente a jusante passa a tratar um palpite como uma medição.
//
// Por isso cada sinal aqui carrega COMO foi obtido, e a ausência é um valor legítimo:
//
//   afirmado      o dono disse que sim. É facto.
//   inferido      deduzido de factos dele, e pode estar errado.
//   desconhecido  não sabemos, e não vamos fingir que sabemos.
//
// Um sinal `desconhecido` não é 0. Um restaurante sem horário legível não é um restaurante
// mau para almoços de trabalho - é um restaurante sobre o qual não temos opinião. Tratar as
// duas coisas como iguais é o erro que mais sites errados produz.
//
// E O RACIOCÍNIO VIVE AO LADO DA DECISÃO
//
// Cada sinal traz o `porque` que o produziu. Não num registo à parte que se escreve depois
// - esse tipo de registo diverge do código na primeira alteração e passa a mentir sobre o
// que o sistema realmente fez. Aqui não pode divergir, porque é o mesmo objecto.
//
// É isso que torna possível, daqui a um ano, perguntar: as casas onde escolhemos abrir com
// a esplanada convertem mais? Sem o porquê guardado, essa pergunta não tem resposta.

export type Base = "afirmado" | "inferido" | "desconhecido";

export interface Sinal {
  // null quando `base` é "desconhecido". Deliberadamente nulo e não zero: quem consome tem
  // de decidir o que fazer com a ausência, em vez de a somar como se fosse um "não".
  valor: number | null;
  base: Base;
  porque: string;
}

const DESCONHECIDO = (porque: string): Sinal => ({ valor: null, base: "desconhecido", porque });

// PARA QUEM É ESTA CASA
//
// Sete eixos, e todos derivam de coisas que o dono escreveu. Não há aqui um eixo "turistas":
// a morada dá-nos uma rua, não dá-nos quem entra pela porta, e a única pista honesta sobre
// estrangeiros é ele ter escolhido publicar o site em inglês - o que é uma afirmação dele e
// não uma dedução nossa. É esse o eixo `estrangeiros`, e mais nenhum.
export interface Publico {
  casal: Sinal;
  familia: Sinal;
  almocoDeTrabalho: Sinal;
  celebracao: Sinal;
  bairro: Sinal;
  pressa: Sinal;
  estrangeiros: Sinal;
}

export interface Diferenciador {
  eixo: string;
  // Frase interna. Nunca é mostrada a ninguém, nunca vai para a página: é o argumento pelo
  // qual o sistema tomou as decisões seguintes.
  motivo: string;
  // Quão decisivo isto é NA CLASSE DELE. Ter esplanada num café é quase obrigatório; ter
  // esplanada numa casa de alta cozinha é uma razão para escolher aquela. O mesmo facto vale
  // números diferentes conforme a vizinhança contra a qual está a competir.
  forca: number;
  base: Base;
}

export interface Positioning {
  publico: Publico;

  // Ordenados. O primeiro é O argumento da casa - o que decide entre ela e a do lado.
  diferenciadores: Diferenciador[];

  // CONFIANÇA CRIATIVA
  //
  // Quanto do que dissemos acima assenta em factos, e não em preenchimento de lacunas. Um
  // formulário completo com preços, horário legível e uma frase escrita pelo dono dá uma
  // leitura em que se pode confiar. Três campos obrigatórios e mais nada dá uma casa sobre a
  // qual não sabemos nada - e o sistema tem de SABER que não sabe.
  confianca: number;

  // A única pergunta que valeria a pena fazer-lhe a seguir, quando a confiança é baixa.
  // null quando já sabemos o suficiente: um formulário que faz perguntas de que não precisa
  // é um formulário que perde gente ao campo seis.
  perguntaEmFalta: string | null;
}

// O PREÇO É O DADO MAIS HONESTO QUE TEMOS SOBRE POSICIONAMENTO
//
// Vive aqui, e não na direcção criativa, porque é uma afirmação sobre onde esta casa está no
// mercado - e não sobre o aspecto que deve ter. A direcção lê-o daqui.
//
// O preço é texto livre - "18,50 €", "18€", "22", "sob consulta". Só conta o que é mesmo um
// número, e o resto ignora-se em vez de rebentar.
export function precoMedio(input: RestaurantInput): number | null {
  const valores = input.dishes
    .map((prato) => {
      const limpo = (prato.price ?? "").replace(/[^\d,.]/g, "").replace(",", ".");
      const numero = Number.parseFloat(limpo);
      return Number.isFinite(numero) && numero > 0 && numero < 500 ? numero : null;
    })
    .filter((valor): valor is number => valor !== null);

  if (valores.length === 0) return null;
  return valores.reduce((total, valor) => total + valor, 0) / valores.length;
}

// AS HORAS A QUE ESTA CASA TRABALHA
//
// `readSchedule` recusa-se a ler horários de que não tem a certeza, e devolve `readable:
// false` com frequência - é o desenho dele, não uma falha. Aqui isso propaga-se como
// `desconhecido`, que é exactamente o que deve acontecer: um horário que não percebemos não
// é um horário sem almoços.
interface Servico {
  legivel: boolean;
  almoco: boolean;
  jantar: boolean;
  diasUteis: boolean;
  // Em Portugal a esmagadora maioria dos restaurantes fecha à segunda. Quem abre está aberto
  // no dia em que a rua inteira está fechada, e isso é a definição de uma razão para escolher
  // aquela porta.
  abreSegunda: boolean;
}

const DIAS_UTEIS = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira"];

// SERVE ALMOÇOS QUEM ESTÁ ABERTO À HORA DE ALMOÇO, E NÃO QUEM ABRE À HORA DE ALMOÇO
//
// Apanhado a medir. A primeira versão olhava para a hora a que cada intervalo COMEÇA, e um
// café aberto "todos os dias 07:30-19:00" ficava com "sem almoço a dias úteis" - porque abre
// às sete e meia. Estava aberto à hora de almoço o tempo todo.
//
// O erro atingia exactamente as casas de serviço contínuo, que são as que mais almoços
// servem, e a consequência não era um número feio num painel: era o horário a descer na
// página de quem vive de quem entra ao meio-dia.
// `readSchedule` nunca devolve um intervalo invertido: um horário que fecha depois da
// meia-noite - "19:00-02:00" - é recusado por inteiro, e chega aqui como ilegível. Por isso
// não há aqui um ramo para esse caso: seria código nunca executado a fingir que trata uma
// coisa. Há, em vez disso, um teste que fixa essa garantia - se o openNow um dia aprender a
// ler horários nocturnos, esse teste falha e aponta para esta linha.
function cobre(intervalo: string, hora: number): boolean {
  const [inicio, fim] = intervalo.split("–").map((parte) => Number.parseInt(parte.slice(0, 2), 10));
  if (!Number.isFinite(inicio) || !Number.isFinite(fim)) return false;
  return hora >= inicio && hora < fim;
}

function servicoDe(schedule: string): Servico {
  const leitura = readSchedule(schedule);
  if (!leitura.readable) {
    return { legivel: false, almoco: false, jantar: false, diasUteis: false, abreSegunda: false };
  }

  return {
    legivel: true,
    almoco: leitura.ranges.some((intervalo) => cobre(intervalo, 13)),
    jantar: leitura.ranges.some((intervalo) => cobre(intervalo, 20)),
    diasUteis: DIAS_UTEIS.some((dia) => leitura.days.includes(dia)),
    abreSegunda: leitura.days.includes("segunda-feira"),
  };
}

function publicoDe(input: RestaurantInput, servico: Servico, luxo: number, medio: number | null): Publico {
  const plataformas = Boolean(input.uberEats || input.glovo || input.boltFood);

  return {
    // Jantar, casa contida, e - decisivo - não anunciada como boa para crianças. Um sítio
    // pode ser as duas coisas; um sítio que se apresenta como as duas coisas não é nenhuma.
    casal: servico.legivel
      ? {
          valor: clamp(luxo * 0.7 + (servico.jantar ? 0.25 : -0.2) - (input.bomParaCriancas ? 0.25 : 0)),
          base: "inferido",
          porque: `luxo ${luxo.toFixed(2)}, ${servico.jantar ? "serve jantares" : "sem jantar"}${input.bomParaCriancas ? ", anunciado para crianças" : ""}`,
        }
      : DESCONHECIDO("horário não legível: não sabemos se serve jantares"),

    // O único eixo que pode ser FACTO, porque há uma caixa no formulário onde ele o diz.
    familia: input.bomParaCriancas
      ? { valor: 0.9, base: "afirmado", porque: "o dono declarou que é bom para crianças" }
      : {
          valor: clamp(0.45 - luxo * 0.4 + (plataformas ? 0.1 : 0)),
          base: "inferido",
          porque: "não declarado; estimado a partir do preço",
        },

    almocoDeTrabalho:
      servico.legivel && medio !== null
        ? {
            valor: clamp((servico.almoco && servico.diasUteis ? 0.6 : 0.05) + (medio >= 10 && medio <= 22 ? 0.3 : -0.15)),
            base: "inferido",
            porque: `${servico.almoco && servico.diasUteis ? "almoços a dias úteis" : "sem almoço a dias úteis"}, prato médio ${medio.toFixed(0)} €`,
          }
        : DESCONHECIDO(servico.legivel ? "sem preços: não sabemos se cabe num almoço de trabalho" : "horário não legível"),

    celebracao: {
      valor: clamp(luxo * 0.8 + (input.bookingUrl ? 0.2 : 0) - (plataformas ? 0.15 : 0)),
      base: "inferido",
      porque: `luxo ${luxo.toFixed(2)}${input.bookingUrl ? ", com reservas próprias" : ""}`,
    },

    // Gente do bairro, que volta. Preço baixo, horário largo, e sem a maquinaria de quem
    // vive de quem passa uma vez.
    bairro:
      medio !== null
        ? {
            valor: clamp(0.8 - luxo * 0.7 + (input.cuisine === "Café" ? 0.2 : 0)),
            base: "inferido",
            porque: `prato médio ${medio.toFixed(0)} €${input.cuisine === "Café" ? ", café" : ""}`,
          }
        : DESCONHECIDO("sem preços"),

    pressa: {
      valor: clamp((plataformas ? 0.4 : 0) + (input.hasDelivery ? 0.25 : 0) + (input.cuisine === "Fast-casual" ? 0.3 : 0)),
      base: "inferido",
      porque: plataformas || input.hasDelivery ? "faz entregas ou está em plataformas" : "sem entregas",
    },

    // NÃO INFERIMOS TURISTAS A PARTIR DA MORADA
    //
    // Uma rua no centro do Porto tem turistas e tem gente que lá vive, e o produto não sabe
    // distinguir. A única afirmação honesta sobre estrangeiros é ele ter escolhido publicar
    // o site em inglês, o que é uma decisão dele sobre quem quer receber.
    estrangeiros:
      input.language === "en"
        ? { valor: 0.85, base: "afirmado", porque: "o dono escolheu publicar o site em inglês" }
        : DESCONHECIDO("site em português: a morada não diz quem entra pela porta"),
  };
}

function clamp(valor: number): number {
  return Math.max(0, Math.min(1, valor));
}

// O QUE DISTINGUE ESTA CASA DA DO LADO
//
// A força de cada facto depende da classe onde ele compete, e é aí que estão os juízos sobre
// restaurantes que um concorrente não copia num dia: são precisos restaurantes reais à frente
// para saber que ter esplanada num café não é notícia e numa casa de jantar é.
function diferenciadoresDe(input: RestaurantInput, servico: Servico, luxo: number, medio: number | null): Diferenciador[] {
  const encontrados: Diferenciador[] = [];

  // A FRASE DO DONO GANHA A TUDO O QUE NÓS DEDUZIMOS
  //
  // É a única coisa em todo o formulário escrita por um humano sobre esta casa em concreto.
  // Qualquer inferência nossa é uma generalização sobre uma categoria; aquela frase não é.
  if (input.description.trim().length >= 20) {
    encontrados.push({
      eixo: "palavrasDoDono",
      motivo: "o dono escreveu a razão dele, e é mais específica do que qualquer dedução nossa",
      forca: 0.9,
      base: "afirmado",
    });
  }

  // Aberto no dia em que a rua está fechada.
  if (servico.legivel && servico.abreSegunda) {
    encontrados.push({
      eixo: "abreQuandoOsOutrosFecham",
      motivo: "abre à segunda, o dia em que a maioria dos restaurantes portugueses fecha",
      forca: 0.8,
      base: "afirmado",
    });
  }

  // Quem anda com o cão anda com ele sempre, e o sítio que o aceita ganha o cliente todas as
  // vezes - não só uma. É a razão mais fiel que uma casa pode ter, e continua rara.
  if (input.aceitaAnimais) {
    encontrados.push({
      eixo: "animais",
      motivo: "aceita animais: quem tem cão escolhe sempre a mesma porta",
      forca: 0.75,
      base: "afirmado",
    });
  }

  // Numa casa cara é uma decisão declarada e rara; numa hamburgueria é o esperado.
  if (input.bomParaCriancas) {
    encontrados.push({
      eixo: "criancas",
      motivo: luxo > 0.55 ? "casa cara que recebe crianças, o que é invulgar" : "recebe crianças",
      forca: luxo > 0.55 ? 0.75 : 0.35,
      base: "afirmado",
    });
  }

  // Num café é quase a definição de café; num restaurante de jantar decide a noite inteira.
  if (input.esplanada) {
    encontrados.push({
      eixo: "esplanada",
      motivo: input.cuisine === "Café" ? "tem esplanada, como quase todos os cafés" : "tem esplanada, e num jantar isso decide",
      forca: input.cuisine === "Café" ? 0.3 : 0.65,
      base: "afirmado",
    });
  }

  if (input.estacionamento) {
    encontrados.push({
      eixo: "estacionamento",
      motivo: "tem estacionamento, que é o que faz alguém desistir de uma zona inteira",
      forca: 0.6,
      base: "afirmado",
    });
  }

  // Estar num extremo da escala É uma posição. O meio não é.
  if (medio !== null && medio >= 38) {
    encontrados.push({ eixo: "precoAlto", motivo: "está no topo da escala: a contenção é o argumento", forca: 0.7, base: "afirmado" });
  } else if (medio !== null && medio <= 9) {
    encontrados.push({ eixo: "precoBaixo", motivo: "está em baixo na escala: o preço é o argumento", forca: 0.6, base: "afirmado" });
  }

  // Verdadeiro, útil, e ninguém escolhe um restaurante por isto. Fica com a força que
  // merece em vez de ficar de fora: uma lista honesta tem de conter as coisas fracas.
  if (input.mbway) {
    encontrados.push({ eixo: "mbway", motivo: "aceita MB Way", forca: 0.2, base: "afirmado" });
  }

  return encontrados.sort((a, b) => b.forca - a.forca);
}

// O LIMIAR DE "AINDA NÃO PERCEBEMOS ESTA CASA"
//
// Abaixo disto, o que temos são factos verdadeiros mas indistintos - aceita MB Way, tem
// esplanada como todos os cafés da rua. Nada que faça alguém atravessar a rua.
const FORCA_MINIMA = 0.5;

export function positioningFor(input: RestaurantInput): Positioning {
  const servico = servicoDe(input.schedule);
  const medio = precoMedio(input);
  // A mesma escala que a direcção criativa usa, e por isso vive aqui: é uma leitura de
  // mercado, não de estilo.
  const luxo = luxoDoPreco(medio) ?? 0.4;

  const publico = publicoDe(input, servico, luxo, medio);
  const diferenciadores = diferenciadoresDe(input, servico, luxo, medio);
  const melhor = diferenciadores[0] ?? null;

  // A CONFIANÇA MEDE O QUE NOS FALTA, NÃO O QUE ACERTÁMOS
  //
  // Começa cheia e cada lacuna real desconta. O maior desconto é não termos encontrado uma
  // razão para alguém escolher esta casa - porque é o único que diz que ainda não percebemos
  // o restaurante, e um site construído sem isso é um site bonito sobre ninguém.
  let confianca = 1;
  if (melhor === null || melhor.forca < FORCA_MINIMA) confianca -= 0.35;
  if (medio === null) confianca -= 0.2;
  if (!servico.legivel) confianca -= 0.15;
  if (input.description.trim().length < 20) confianca -= 0.15;

  return {
    publico,
    diferenciadores,
    confianca: clamp(confianca),
    // UMA PERGUNTA, E SÓ QUANDO PAGA A FRICÇÃO QUE CUSTA
    //
    // Cada campo novo no formulário custa gente ao campo seis. Por isso isto não devolve uma
    // lista de perguntas - devolve a que falta, uma, e só quando a casa é indistinta o
    // suficiente para valer a pena. Um formulário completo não vê pergunta nenhuma.
    perguntaEmFalta:
      melhor !== null && melhor.forca >= FORCA_MINIMA
        ? null
        : "O que é que faz um cliente escolher a sua casa em vez da do lado?",
  };
}

// A ESCALA DE PREÇOS DA RESTAURAÇÃO PORTUGUESA
//
// Não é arbitrária e não é global: um prato a 12 € em Lisboa é uma casa de bairro; a 30 € é
// uma casa de jantar; a 45 € é outra coisa. Estes limiares são para o mercado onde este
// produto vive, e mudam se o mercado mudar.
//
// null quando não há preços. A ausência não é sinal de casa barata, é ausência: uma
// marisqueira que vende a peso não publica preços e não deve ser lida como uma tasca.
export function luxoDoPreco(medio: number | null): number | null {
  if (medio === null) return null;
  if (medio >= 40) return 0.95;
  if (medio >= 28) return 0.75;
  if (medio >= 18) return 0.5;
  if (medio >= 12) return 0.3;
  return 0.15;
}
