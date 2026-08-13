import { describe, it, expect } from "vitest";
import { decisionsFor, REGRAS_VERSAO } from "./decisions";
import { directionFor } from "./direction";
import { composeSections } from "./compose";
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

// O REGISTO TEM DE DESCREVER A PÁGINA QUE FOI MESMO CONSTRUÍDA
//
// Um registo que diverge da realidade é pior do que não registar nada: leva a conclusões
// erradas com a autoridade de dados. A primeira versão disto reescrevia a regra do hero num
// segundo sítio - o mesmo defeito que este ficheiro existe para tornar detectável.
describe("o que se guarda é o que aconteceu", () => {
  it("o hero registado é o hero que a página tem", () => {
    for (const input of [
      casa({ name: "Taberna do Bairro" }),
      casa({ name: "Adega do Manel", style: "Classic" }),
      casa({ name: "O Fogão", cuisine: "Fine dining", style: "Elegant" }, ["45,00"]),
      casa({ name: "Sushi Kaito", cuisine: "Japanese", style: "Minimal" }, ["32,00"]),
      casa({ name: "Café da Praça", cuisine: "Café", style: "Casual" }, ["3,00"]),
    ]) {
      for (const fotografias of [0, 2, 5]) {
        const direction = directionFor(input);
        const seccoes = composeSections({ input, direction, galleryCount: fotografias, orderCount: 0 });
        const registo = decisionsFor(input, fotografias);

        expect(registo.hero, `${input.name} com ${fotografias} fotografias`).toBe(seccoes[0].variant);
      }
    }
  });

  it("abrir com a galeria registado é a ordem que a página tem", () => {
    for (const [input, fotografias] of [
      [casa({}, ["12,00"]), 6],
      [casa({ aceitaAnimais: true }), 2],
      [casa({ dishes: [] } as Partial<RestaurantInput>), 0],
      [casa({}, ["12,00", "13,00", "14,00", "15,00", "16,00", "17,00", "18,00", "19,00"]), 1],
    ] as const) {
      const direction = directionFor(input);
      const tipos = composeSections({ input, direction, galleryCount: fotografias, orderCount: 0 }).map((s) => s.type);
      const registo = decisionsFor(input, fotografias);

      const abriu = tipos.indexOf("gallery") >= 0 && (tipos.indexOf("menu") < 0 || tipos.indexOf("gallery") < tipos.indexOf("menu"));
      expect(registo.abreComGaleria, `${input.name} com ${fotografias} fotografias`).toBe(abriu);
    }
  });
});

// O QUE NÃO É RECALCULÁVEL DEPOIS
//
// Tudo o resto sai do formulário, que já está guardado. A versão dos juízos não: uma página
// feita em Agosto foi construída por regras diferentes das de Novembro, e sem esse carimbo
// nenhuma comparação entre as duas significa alguma coisa.
describe("a versão dos juízos", () => {
  it("vai em todo o registo", () => {
    expect(decisionsFor(casa(), 3).regras).toBe(REGRAS_VERSAO);
  });
});

describe("o que se guarda cabe numa coluna e não descreve ninguém", () => {
  // A coluna aceita valores simples de propósito: é o que a impede de se tornar a gaveta onde
  // se despeja um objecto inteiro por precaução.
  it("é tudo texto, números e booleanos — nada aninhado", () => {
    for (const valor of Object.values(decisionsFor(casa({ esplanada: true }), 4))) {
      expect(["string", "number", "boolean"], String(valor)).toContain(valor === null ? "object" : typeof valor);
      if (valor !== null) expect(typeof valor).not.toBe("object");
    }
  });

  // As faixas existem porque uma confiança de 0,8123 dá a ilusão de precisão que a
  // positioning.ts existe para recusar. Para agrupar coortes, três faixas chegam.
  it("a confiança e o luxo vão em faixas, não em decimais", () => {
    expect(decisionsFor(casa({}, ["45,00"]), 3).luxo).toBe("alto");
    expect(decisionsFor(casa({}, ["8,00"]), 3).luxo).toBe("baixo");
    expect(["alta", "media", "baixa"]).toContain(decisionsFor(casa(), 3).confianca);
  });

  // Um restaurante com nove fotografias converte melhor do que um com zero por razões que não
  // têm nada a ver com o hero que lhe escolhemos. Sem isto registado, toda a leitura futura
  // atribui ao layout aquilo que foi o esforço do dono.
  it("guarda quanto o dono deu, que é a variável de confusão mais óbvia", () => {
    const registo = decisionsFor(casa({ description: "Trinta e dois anos no mesmo balcão." }, ["12,00", "14,00"]), 7);
    expect(registo.fotografias).toBe(7);
    expect(registo.pratos).toBe(2);
    expect(registo.temDescricao).toBe(true);
  });

  // Não encontrar razão nenhuma é um resultado, não uma falha de registo — e é precisamente a
  // coorte sobre a qual mais vale a pena aprender.
  it("uma casa sem razão nenhuma regista null e não um espaço em branco", () => {
    expect(decisionsFor(casa(), 3).razao).toBeNull();
    expect(decisionsFor(casa({ aceitaAnimais: true }), 3).razao).toBe("animais");
  });
});
