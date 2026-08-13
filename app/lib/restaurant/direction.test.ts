import { describe, it, expect } from "vitest";
import { directionFor } from "./direction";
import type { RestaurantInput } from "./input";

function casa(o: Partial<RestaurantInput> = {}, precos: string[] = ["12,00"]): RestaurantInput {
  return {
    name: "Taberna do Bairro",
    cuisine: "Portuguese",
    address: "Rua das Flores 112, Porto",
    phone: "220145880",
    schedule: "Terça a domingo 12:00-15:00",
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

// O SINAL QUE NINGUÉM USAVA
//
// O dono escreve o preço de três pratos e o produto usava-o para uma coisa só: imprimi-lo.
// Mas uma casa a 8 € e uma a 45 € não são a mesma casa, e a diferença entre elas é maior do
// que a diferença entre "rústico" e "clássico" que ele escolheu numa caixa.
describe("o preço é o sinal mais honesto que temos", () => {
  it("o mesmo estilo com preços diferentes dá casas diferentes", () => {
    const barata = directionFor(casa({ style: "Rustic" }, ["7,50", "8,00", "9,00"]));
    const cara = directionFor(casa({ style: "Rustic" }, ["42,00", "45,00", "48,00"]));

    expect(cara.luxo).toBeGreaterThan(barata.luxo + 0.4);
  });

  // O estilo é uma escolha numa caixa; o preço é o que ele pratica todos os dias. Quando os
  // dois discordam, pesa mais o que já foi testado contra clientes a sério.
  it("o que ele cobra ganha ao que ele diz que é", () => {
    const rusticoCaro = directionFor(casa({ style: "Rustic" }, ["44,00", "46,00"]));
    const eleganteBarato = directionFor(casa({ style: "Elegant" }, ["7,00", "8,00"]));

    expect(rusticoCaro.luxo).toBeGreaterThan(eleganteBarato.luxo);
  });

  // Uma marisqueira que vende a peso não publica preços — e a ausência não é sinal de casa
  // barata. É ausência, e aí decide o estilo.
  it("sem preços, a ausência não conta como casa barata", () => {
    const semPrecos = directionFor(casa({ style: "Elegant" }, [""]));
    const comPrecosBaixos = directionFor(casa({ style: "Elegant" }, ["6,00", "7,00"]));

    expect(semPrecos.luxo).toBeGreaterThan(comPrecosBaixos.luxo);
  });

  it("aguenta o preço escrito de todas as maneiras que uma pessoa escreve", () => {
    const a = directionFor(casa({}, ["18,50 €", "18€", "18"]));
    const b = directionFor(casa({}, ["18,50", "18,00", "18,00"]));
    expect(a.luxo).toBeCloseTo(b.luxo, 1);
  });

  it("ignora o que não é um preço em vez de rebentar", () => {
    expect(() => directionFor(casa({}, ["sob consulta", "ao peso", "PVP"]))).not.toThrow();
    // Nenhum número: cai no estilo, como se não houvesse preços nenhuns.
    expect(directionFor(casa({ style: "Rustic" }, ["sob consulta"])).luxo).toBeCloseTo(0.2, 1);
  });
});

// AS FOTOGRAFIAS SÃO O QUE MAIS DENUNCIA UM SITE GERADO
//
// Antes, toda a gente pedia `${cuisine} restaurant plated dish` — e uma fotografia de um
// prato bem empratado é a imagem mais intercambiável que existe.
describe("as fotografias saem da direcção, não da cozinha", () => {
  it("cozinhas diferentes pedem imagens diferentes", () => {
    const pedidos = ["Portuguese", "Japanese", "Burgers", "Café", "Italian"].map(
      (cuisine) => directionFor(casa({ cuisine: cuisine as never })).fotografia.hero
    );
    expect(new Set(pedidos).size).toBe(5);
  });

  // O luxo muda a LUZ e o enquadramento, não o assunto. Uma marisqueira cara e uma tasca
  // fotografam a mesma coisa - peixe, mãos, mesa - e a diferença está em como.
  it("o luxo muda o tratamento e não o tema", () => {
    const cara = directionFor(casa({ style: "Rustic" }, ["45,00"])).fotografia.hero;
    const barata = directionFor(casa({ style: "Rustic" }, ["7,00"])).fotografia.hero;

    expect(cara).toContain("portuguese tavern");
    expect(barata).toContain("portuguese tavern");
    expect(cara).not.toBe(barata);
  });

  // Apanhado a MEDIR e não a rever: as primeiras consultas saíam com palavras portuguesas
  // no meio de inglês ("japanese silêncio rustic authentic"), e uma dizia "fine dining fine
  // dining plated dish" porque a cozinha já se chamava assim. Um banco de imagens devolvia
  // fotografias erradas e ninguém saberia porquê.
  it("nenhuma consulta leva palavras portuguesas nem repete a cozinha", () => {
    for (const cuisine of ["Portuguese", "Italian", "Japanese", "Fine dining", "Burgers", "Pizza", "Café", "Fast-casual"]) {
      const { hero, galeria } = directionFor(casa({ cuisine: cuisine as never })).fotografia;

      for (const consulta of [hero, ...galeria]) {
        expect(consulta, consulta).not.toMatch(/[áàâãéêíóôõúç]/i);
        expect(consulta.match(/fine dining/g)?.length ?? 0, consulta).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("o que a página tem de conseguir", () => {
  // Uma página desenhada à volta de reservas, num sítio que só faz take-away, está a pedir
  // uma coisa que a casa não faz.
  it("segue o canal que a casa TEM", () => {
    expect(directionFor(casa({ bookingUrl: "https://thefork.pt/x" })).conversao).toBe("reserva");
    expect(directionFor(casa({ uberEats: "https://x" })).conversao).toBe("encomenda");
    expect(directionFor(casa({ whatsapp: "912345678" })).conversao).toBe("reserva");
    expect(directionFor(casa()).conversao).toBe("chamada");
  });

  it("uma casa com entregas e três plataformas não é íntima", () => {
    const movimentada = directionFor(casa({ hasDelivery: true, uberEats: "https://x" }));
    const quieta = directionFor(casa({ style: "Elegant" }, ["40,00"]));

    expect(movimentada.intimidade).toBeLessThan(quieta.intimidade);
  });

  it("a energia segue o que a casa é, não o que gostaríamos", () => {
    expect(directionFor(casa({ cuisine: "Fine dining", style: "Elegant" })).energia).toBe("baixa");
    expect(directionFor(casa({ cuisine: "Burgers", style: "Modern" })).energia).toBe("alta");
  });
});

describe("estabilidade", () => {
  it("a mesma casa dá sempre a mesma direcção", () => {
    expect(directionFor(casa())).toEqual(directionFor(casa()));
  });
});
