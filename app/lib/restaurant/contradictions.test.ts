import { describe, it, expect } from "vitest";
import { contradicoesDe } from "./contradictions";
import type { RestaurantInput } from "./input";

function casa(o: Partial<RestaurantInput> = {}, precos: string[] = ["14,00"]): RestaurantInput {
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

const eixos = (input: RestaurantInput, fotos = 0) => contradicoesDe(input, fotos).map((c) => c.eixo);

// A CONTRADIÇÃO É A COISA DE MAIOR VALOR QUE PODEMOS DIZER A UM DONO
//
// Porque é a única que ele não consegue ver sozinho. Que lhe falta o WhatsApp, ele sabe. Que o
// site que lhe fizemos parece caro e a casa dele é barata, não - ninguém olha para o próprio
// negócio de fora.
describe("o estilo que ele escolheu contra o preço que ele pratica", () => {
  it("vender-se acima do que é defrauda quem chega", () => {
    expect(eixos(casa({ style: "Elegant" }, ["9,00", "10,00"]))).toContain("estiloAcimaDoPreco");
  });

  // O mais caro dos dois, e o que não se vê: ninguém se queixa de um site que parecia mais
  // barato do que a casa é. Aparece só menos gente disposta a pagar aquilo.
  it("vender-se abaixo do que é não se queixa, e é o que custa mais", () => {
    expect(eixos(casa({ style: "Rustic" }, ["36,00", "40,00"]))).toContain("precoAcimaDoEstilo");
  });

  it("uma casa coerente não recebe aviso nenhum", () => {
    expect(eixos(casa({ style: "Rustic" }, ["11,00", "13,00"]))).toEqual([]);
    expect(eixos(casa({ style: "Elegant", cuisine: "Fine dining", bookingUrl: "https://x" }, ["42,00"]))).toEqual([]);
  });

  it("sem preços não se inventa uma contradição", () => {
    expect(eixos(casa({ style: "Elegant" }, ["sob consulta"]))).not.toContain("estiloAcimaDoPreco");
  });
});

describe("o que a casa diz que é contra o que a casa faz", () => {
  // A promessa de uma casa cara é a sala, o serviço e o tempo. Numa caixa em cima de uma mota
  // chega a comida sem nada do que justificava o preço.
  it("uma casa no topo da escala em plataformas de entrega", () => {
    expect(eixos(casa({ uberEats: "https://x" }, ["45,00"]))).toContain("casaCaraEmPlataformas");
    expect(eixos(casa({ uberEats: "https://x" }, ["11,00"]))).not.toContain("casaCaraEmPlataformas");
  });

  // Às 20h30, em pleno serviço, o telefone não é atendido: a mesa perde-se sem deixar rasto.
  it("uma casa cara onde só se reserva a telefonar", () => {
    expect(eixos(casa({}, ["45,00"]))).toContain("casaCaraSemReservas");
    expect(eixos(casa({ whatsapp: "912345678" }, ["45,00"]))).not.toContain("casaCaraSemReservas");
  });

  it("contenção declarada com a sala toda nas paredes", () => {
    expect(eixos(casa({ style: "Minimal" }, ["22,00"]), 10)).toContain("minimalComMuitaCoisa");
    expect(eixos(casa({ style: "Minimal" }, ["22,00"]), 3)).not.toContain("minimalComMuitaCoisa");
  });

  it("alta cozinha com uma carta de vinte pratos", () => {
    const longa = casa({ cuisine: "Fine dining", style: "Elegant", bookingUrl: "https://x" }, Array(22).fill("42,00"));
    expect(eixos(longa)).toContain("altaCozinhaComCartaLonga");
  });

  // Quem procura um café procura-o de manhã. O site está a dizer a essas pessoas que está
  // fechado exactamente à hora em que elas o queriam.
  it("um café que só abre depois do meio-dia", () => {
    expect(eixos(casa({ cuisine: "Café", schedule: "Todos os dias 19:00-23:00" }, ["3,00"]))).toContain("cafeSemManha");
    expect(eixos(casa({ cuisine: "Café", schedule: "Todos os dias 07:30-19:00" }, ["3,00"]))).not.toContain("cafeSemManha");
  });

  // O readSchedule recusa-se a ler horários de que não tem a certeza, e um horário que não
  // percebemos não é um café estranho — é um horário que não percebemos.
  it("um horário ilegível não gera uma acusação", () => {
    expect(eixos(casa({ cuisine: "Café", schedule: "quando calha" }, ["3,00"]))).not.toContain("cafeSemManha");
  });
});

// UM MOTOR QUE DISPARA SOBRE COISAS PLAUSÍVEIS ENSINA O DONO A FECHAR O AVISO
//
// E a partir daí o aviso que importava também é fechado. Estas três foram consideradas e
// deixadas de fora; o teste existe para que não voltem a entrar por parecerem óbvias.
describe("o que deliberadamente NÃO é contradição", () => {
  it("um izakaya é rústico e é japonês", () => {
    expect(eixos(casa({ cuisine: "Japanese", style: "Rustic" }, ["18,00"]))).toEqual([]);
  });

  it("o hambúrguer gourmet existe e paga-se", () => {
    expect(eixos(casa({ cuisine: "Burgers", style: "Modern" }, ["24,00"]))).toEqual([]);
  });

  // É raro e por isso é um ARGUMENTO, não um defeito — já é tratado como diferenciador em
  // positioning.ts, e disparar aqui contradiria a nossa própria leitura da mesma casa.
  it("uma casa cara que recebe crianças é um argumento, não um erro", () => {
    const cara = casa({ cuisine: "Fine dining", style: "Elegant", bomParaCriancas: true, bookingUrl: "https://x" }, ["42,00"]);
    expect(eixos(cara)).toEqual([]);
  });
});

// NÓS NÃO SABEMOS QUAL DOS DOIS LADOS ESTÁ ERRADO. ELE SABE.
//
// Há dois mundos em que aquele formulário faz sentido, e são opostos: ou escolheu mal a
// palavra, ou está a cobrar a menos pelo que faz. O primeiro corrige-se numa caixa; o segundo
// vale-lhe uns milhares de euros por ano.
describe("cada contradição acaba numa pergunta, não numa instrução", () => {
  const todas = [
    casa({ style: "Elegant" }, ["9,00"]),
    casa({ style: "Rustic" }, ["38,00"]),
    casa({ uberEats: "https://x" }, ["45,00"]),
    casa({}, ["45,00"]),
    casa({ style: "Minimal" }, ["22,00"]),
    casa({ cuisine: "Café", schedule: "Todos os dias 19:00-23:00" }, ["3,00"]),
  ];

  it("todas perguntam", () => {
    for (const input of todas) {
      for (const c of contradicoesDe(input, 10)) {
        expect(c.decide, c.eixo).toMatch(/\?$/);
      }
    }
  });

  // Um aviso que não mostra o que viu é um aviso em que não se acredita.
  it("todas mostram os dois lados com os números dele", () => {
    for (const input of todas) {
      for (const c of contradicoesDe(input, 10)) {
        expect(c.viu.length, c.eixo).toBeGreaterThan(20);
        expect(c.custa.length, c.eixo).toBeGreaterThan(20);
      }
    }
  });

  // Não temos nenhuma medida de impacto, e um número inventado tem a autoridade de uma
  // medição — ver nextAction.ts.
  it("nenhuma promete uma percentagem", () => {
    for (const input of todas) {
      for (const c of contradicoesDe(input, 10)) {
        expect(`${c.custa} ${c.decide}`, c.eixo).not.toMatch(/\d+\s*%|\+\d/);
      }
    }
  });
});
