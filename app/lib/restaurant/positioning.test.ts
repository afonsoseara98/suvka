import { describe, it, expect } from "vitest";
import { positioningFor } from "./positioning";
import { directionFor } from "./direction";
import { readSchedule } from "./openNow";
import type { RestaurantInput } from "./input";

function casa(o: Partial<RestaurantInput> = {}, precos: string[] = ["12,00"]): RestaurantInput {
  return {
    name: "Taberna do Bairro",
    cuisine: "Portuguese",
    address: "Rua das Flores 112, Porto",
    phone: "220145880",
    schedule: "Terça a domingo 12:00-15:00 e 19:00-23:00",
    dishes: precos.map((price, i) => ({ name: `Prato ${i}`, price, description: "" })),
    hasDelivery: false,
    style: "Rustic",
    email: "a@b.pt",
    whatsapp: "",
    bookingUrl: "",
    instagram: "",
    uberEats: "",
    glovo: "",
    boltFood: "",
    language: "pt",
    description: "",
    ...o,
  } as RestaurantInput;
}

// A PERGUNTA QUE SEPARA DUAS CASAS IGUAIS
//
// A direcção criativa responde "o que é que esta casa vende", que é uma pergunta sobre a casa
// - e por isso duas tascas portuguesas rústicas a 11 € dão a mesma resposta, porque são a
// mesma coisa. Isto responde à pergunta comparativa: um cliente com duas portas à frente
// escolhe UMA, e porquê.
describe("porque é que alguém escolhe esta casa e não a do lado", () => {
  it("o cão, a esplanada e as crianças são razões, e o MB Way não é", () => {
    const comCao = positioningFor(casa({ aceitaAnimais: true }));
    const soMbway = positioningFor(casa({ mbway: true }));

    expect(comCao.diferenciadores[0].eixo).toBe("animais");
    expect(comCao.diferenciadores[0].forca).toBeGreaterThan(soMbway.diferenciadores[0].forca);
  });

  // A frase do dono é a única coisa em todo o formulário escrita por um humano sobre esta casa
  // em concreto. Qualquer inferência nossa é uma generalização sobre uma categoria.
  it("a frase escrita pelo dono ganha a tudo o que nós deduzimos", () => {
    const p = positioningFor(
      casa({ description: "Somos a mesma família há trinta e dois anos, no mesmo balcão.", aceitaAnimais: true, esplanada: true })
    );
    expect(p.diferenciadores[0].eixo).toBe("palavrasDoDono");
  });

  // Em Portugal a esmagadora maioria dos restaurantes fecha à segunda. Quem abre está aberto
  // no dia em que a rua está fechada.
  it("abrir à segunda é uma razão, e sai do horário que ele escreveu", () => {
    const abre = positioningFor(casa({ schedule: "Segunda a sábado 12:00-15:00" }));
    const fecha = positioningFor(casa({ schedule: "Terça a sábado 12:00-15:00" }));

    expect(abre.diferenciadores.some((d) => d.eixo === "abreQuandoOsOutrosFecham")).toBe(true);
    expect(fecha.diferenciadores.some((d) => d.eixo === "abreQuandoOsOutrosFecham")).toBe(false);
  });

  // O MESMO FACTO VALE NÚMEROS DIFERENTES CONFORME A VIZINHANÇA
  //
  // É aqui que estão os juízos sobre restaurantes que não se copiam num dia: ter esplanada num
  // café não é notícia, numa casa de jantar decide a noite. Receber crianças numa hamburgueria
  // é o esperado; numa casa a 45 € é uma decisão declarada e rara.
  it("uma esplanada num café vale menos do que a mesma esplanada num jantar", () => {
    const cafe = positioningFor(casa({ cuisine: "Café", esplanada: true }));
    const jantar = positioningFor(casa({ cuisine: "Portuguese", esplanada: true }));

    const forca = (p: typeof cafe) => p.diferenciadores.find((d) => d.eixo === "esplanada")!.forca;
    expect(forca(jantar)).toBeGreaterThan(forca(cafe));
  });

  it("receber crianças numa casa cara é invulgar, numa hamburgueria é o esperado", () => {
    const cara = positioningFor(casa({ bomParaCriancas: true }, ["44,00", "46,00"]));
    const barata = positioningFor(casa({ cuisine: "Burgers", bomParaCriancas: true }, ["9,00"]));

    const forca = (p: typeof cara) => p.diferenciadores.find((d) => d.eixo === "criancas")!.forca;
    expect(forca(cara)).toBeGreaterThan(forca(barata));
  });
});

// A AUSÊNCIA NÃO É UM ZERO
//
// A tentação óbvia era um painel de eixos com uma casa decimal cada um. Mas escrever "0,78"
// onde não sabemos não torna a coisa verdadeira: torna-a convincente, e toda a gente a jusante
// passa a tratar um palpite como uma medição.
describe("o que não sabemos fica marcado como não sabido", () => {
  it("um horário ilegível não é uma casa sem almoços — é uma casa sobre a qual não temos opinião", () => {
    const p = positioningFor(casa({ schedule: "sempre que a porta estiver aberta" }));

    expect(p.publico.almocoDeTrabalho.base).toBe("desconhecido");
    expect(p.publico.almocoDeTrabalho.valor).toBeNull();
  });

  it("sem preços não há leitura de bairro, e isso não é o mesmo que não ser de bairro", () => {
    expect(positioningFor(casa({}, ["sob consulta"])).publico.bairro.valor).toBeNull();
    expect(positioningFor(casa({}, ["9,00"])).publico.bairro.valor).toBeGreaterThan(0.5);
  });

  // A morada dá uma rua, não dá quem entra pela porta. A única afirmação honesta sobre
  // estrangeiros é ele ter escolhido publicar o site em inglês, que é uma decisão dele.
  it("não inventamos turistas a partir da morada", () => {
    expect(positioningFor(casa({ address: "Rua Augusta 200, Lisboa" })).publico.estrangeiros.base).toBe("desconhecido");
    expect(positioningFor(casa({ language: "en" })).publico.estrangeiros.base).toBe("afirmado");
  });

  it("o que o dono declarou é facto, o que nós deduzimos não é", () => {
    expect(positioningFor(casa({ bomParaCriancas: true })).publico.familia.base).toBe("afirmado");
    expect(positioningFor(casa()).publico.familia.base).toBe("inferido");
  });

  // Cada sinal traz o porquê que o produziu, no mesmo objecto. Um registo à parte diverge do
  // código na primeira alteração e passa a mentir sobre o que o sistema fez.
  it("todo o sinal explica-se, incluindo os que não sabemos", () => {
    const publico = positioningFor(casa({ schedule: "quando calha" }, ["sob consulta"])).publico;
    for (const [eixo, sinal] of Object.entries(publico)) {
      expect(sinal.porque.length, eixo).toBeGreaterThan(0);
    }
  });
});

// A CONFIANÇA MEDE O QUE NOS FALTA
describe("o sistema tem de saber quando não sabe", () => {
  it("um formulário cheio confia, um formulário mínimo não", () => {
    const cheio = positioningFor(
      casa({
        description: "Cozinha de forno a lenha desde 1994, com a horta do lado.",
        schedule: "Segunda a sábado 12:00-15:00 e 19:00-23:00",
        esplanada: true,
      })
    );
    const minimo = positioningFor(casa({ schedule: "quando calha" }, ["sob consulta"]));

    expect(cheio.confianca).toBeGreaterThan(0.9);
    expect(minimo.confianca).toBeLessThan(0.4);
  });

  // Um formulário que faz perguntas de que não precisa é um formulário que perde gente ao
  // campo seis. A pergunta só aparece quando a casa é indistinta.
  it("só pergunta quando não encontrou razão nenhuma", () => {
    expect(positioningFor(casa({ aceitaAnimais: true })).perguntaEmFalta).toBeNull();
    expect(positioningFor(casa({ mbway: true })).perguntaEmFalta).toContain("em vez da do lado");
  });

  it("uma casa sem nada que a distinga é sinalizada, não disfarçada", () => {
    const anonima = positioningFor(casa());
    expect(anonima.diferenciadores).toHaveLength(0);
    expect(anonima.confianca).toBeLessThan(0.6);
  });
});

// O POSICIONAMENTO TEM DE MUDAR O QUE SAI, SENÃO É UM OBJECTO BONITO E INERTE
describe("a razão chega à página", () => {
  // As oito listas de temas distinguem cozinhas, e é o mais longe que se chega a olhar só para
  // a casa: duas tascas portuguesas recebiam as mesmas quatro fotografias.
  it("duas tascas idênticas deixam de receber as mesmas fotografias", () => {
    const comCao = directionFor(casa({ aceitaAnimais: true })).fotografia.galeria;
    const semCao = directionFor(casa()).fotografia.galeria;

    expect(comCao).not.toEqual(semCao);
    expect(comCao[0]).toContain("dog");
    // Empurra a mais genérica para fora em vez de acrescentar: pedimos o mesmo número.
    expect(comCao).toHaveLength(semCao.length);
  });

  it("uma razão que não se fotografa não inventa uma fotografia", () => {
    const soAbreSegunda = directionFor(casa({ schedule: "Segunda a sábado 12:00-15:00" })).fotografia.galeria;
    expect(soAbreSegunda).toEqual(directionFor(casa()).fotografia.galeria);
  });

  it("as consultas novas continuam em inglês, como o banco de imagens precisa", () => {
    for (const extra of [{ esplanada: true }, { aceitaAnimais: true }, { bomParaCriancas: true }]) {
      for (const consulta of directionFor(casa(extra)).fotografia.galeria) {
        expect(consulta, consulta).not.toMatch(/[áàâãéêíóôõúç]/i);
      }
    }
  });

  // O preço sozinho dizia que uma casa cara é íntima, e estava errado: uma sala com mesas de
  // oito e carrinhos de bebé é uma sala com barulho.
  it("uma casa cara que recebe crianças deixa de ser lida como íntima", () => {
    const comCriancas = directionFor(casa({ bomParaCriancas: true }, ["42,00"]));
    const sem = directionFor(casa({}, ["42,00"]));

    expect(comCriancas.intimidade).toBeLessThan(sem.intimidade);
  });
});

describe("estabilidade", () => {
  it("a mesma casa dá sempre o mesmo posicionamento", () => {
    expect(positioningFor(casa({ esplanada: true }))).toEqual(positioningFor(casa({ esplanada: true })));
  });
});

// APANHADO A MEDIR, E TERIA DESCIDO O HORÁRIO A QUEM VIVE DO ALMOÇO
//
// A primeira versão olhava para a hora a que cada intervalo COMEÇA. Um café aberto "todos os
// dias 07:30-19:00" ficava com "sem almoço a dias úteis" - porque abre às sete e meia, e
// esteve aberto à hora de almoço o tempo todo. O erro atingia exactamente as casas de serviço
// contínuo, que são as que mais almoços servem.
describe("serve almoços quem está aberto à hora de almoço", () => {
  it("um horário contínuo cobre o almoço e o jantar", () => {
    const continuo = positioningFor(casa({ schedule: "Segunda a sábado 11:00-23:00" }, ["14,00"]));
    expect(continuo.publico.almocoDeTrabalho.valor).toBeGreaterThan(0.5);
  });

  it("um café aberto de manhã até à noite serve almoços", () => {
    const cafe = positioningFor(casa({ cuisine: "Café", schedule: "Todos os dias 07:30-19:00" }, ["8,00"]));
    expect(cafe.publico.almocoDeTrabalho.valor).toBeGreaterThan(0.4);
  });

  it("uma casa que só abre à noite não serve almoços", () => {
    const so = positioningFor(casa({ schedule: "Terça a sábado 19:00-23:00" }, ["14,00"]));
    expect(so.publico.almocoDeTrabalho.valor).toBeLessThan(0.4);
  });

  // A GARANTIA DE QUE O RAMO QUE FALTA NÃO É PRECISO
  //
  // `cobre` não trata intervalos invertidos - "19:00-02:00" - porque o `readSchedule` recusa
  // esse horário por inteiro e ele chega aqui como ilegível. Escrever esse ramo seria código
  // nunca executado a fingir que trata uma coisa. Isto fixa a garantia: se o openNow aprender
  // a ler horários nocturnos, este teste falha e manda alguém olhar para `cobre`.
  it("um horário que passa da meia-noite ainda não é legível, e por isso é desconhecido", () => {
    expect(readSchedule("Sexta e sábado 19:00-02:00").readable).toBe(false);

    const tarde = positioningFor(casa({ schedule: "Sexta e sábado 19:00-02:00" }, ["30,00"]));
    expect(tarde.publico.casal.base).toBe("desconhecido");
  });
});
