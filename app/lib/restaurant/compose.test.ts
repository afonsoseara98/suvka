import { describe, it, expect } from "vitest";
import { composeSections, seedOf } from "./compose";
import { directionFor } from "./direction";
import type { RestaurantInput } from "./input";

function casa(o: Partial<RestaurantInput> & { pratos?: number } = {}): RestaurantInput {
  const { pratos = 3, ...resto } = o;
  return {
    name: "Taberna do Bairro",
    cuisine: "Portuguese",
    address: "Rua das Flores 112, Porto",
    phone: "220145880",
    schedule: "Terça a domingo 12:00-15:00",
    dishes: Array.from({ length: pratos }, (_, i) => ({ name: `Prato ${i}`, price: "12,00", description: "" })),
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
    ...resto,
  } as RestaurantInput;
}

// A composicao ja nao le o formulario: le a direccao criativa, que e quem interpreta o
// formulario. Este atalho monta a camada de cima uma vez, como o buildPage faz.
const compor = (input: RestaurantInput, galleryCount = 0, orderCount = 0) =>
  composeSections({ input, direction: directionFor(input), galleryCount, orderCount });

const assinatura = (input: RestaurantInput, galleryCount = 0, orderCount = 0) =>
  compor(input, galleryCount, orderCount)
    .map((s) => `${s.type}:${s.variant}:${s.rhythm}`)
    .join(" ");

// A PROMESSA QUE ISTO CUMPRE
//
// SUVKA_NORTH_STAR.md: "Nenhum utilizador recebe a página de outro — diversidade estrutural
// por design, não por sorte." Medido antes de este ficheiro existir: dez restaurantes de
// cozinhas e estilos diferentes recebiam UMA estrutura, todos igual, com cores diferentes.
describe("dez restaurantes, dez páginas", () => {
  const dez = [
    casa({ name: "Taberna do Bairro", cuisine: "Portuguese", style: "Rustic", pratos: 3 }),
    casa({ name: "Casa do Bacalhau", cuisine: "Portuguese", style: "Classic", pratos: 10 }),
    casa({ name: "Marisqueira Céu", cuisine: "Portuguese", style: "Casual", pratos: 2 }),
    casa({ name: "Trattoria Nona", cuisine: "Italian", style: "Rustic", pratos: 5 }),
    casa({ name: "Sushi Kaito", cuisine: "Japanese", style: "Minimal", pratos: 4 }),
    casa({ name: "Café da Praça", cuisine: "Café", style: "Casual", pratos: 3 }),
    casa({ name: "Burger Lab", cuisine: "Burgers", style: "Modern", pratos: 6 }),
    casa({ name: "Pizzaria Forno", cuisine: "Pizza", style: "Casual", pratos: 9 }),
    casa({ name: "O Fogão", cuisine: "Fine dining", style: "Elegant", pratos: 4 }),
    casa({ name: "Adega Lamego", cuisine: "Portuguese", style: "Modern", pratos: 7 }),
  ];

  it("produz muito mais do que uma estrutura", () => {
    const assinaturas = new Set(dez.map((c, i) => assinatura(c, i % 5)));
    // Antes disto: 1. O limiar é baixo de propósito - o que se fixa aqui é que a composição
    // é uma DECISÃO e não uma constante, não um número exacto que travaria uma regra nova.
    expect(assinaturas.size).toBeGreaterThanOrEqual(7);
  });
});

// A MESMA PÁGINA DUAS VEZES É UM PRODUTO AVARIADO
//
// Regenerar o mesmo restaurante tem de dar exactamente o mesmo site. Uma página que se
// reorganiza sozinha entre visitas não é diversidade - é o dono a desconfiar do produto.
describe("estabilidade", () => {
  it("o mesmo restaurante dá sempre a mesma página", () => {
    const c = casa({ name: "Taberna do Bairro" });
    expect(assinatura(c, 4)).toBe(assinatura(c, 4));
    expect(assinatura(c, 4)).toBe(assinatura(casa({ name: "Taberna do Bairro" }), 4));
  });

  it("o desempate vem do nome e não do relógio", () => {
    expect(seedOf("Taberna do Bairro")).toBe(seedOf("Taberna do Bairro"));
    expect(seedOf("Taberna do Bairro")).not.toBe(seedOf("Adega do Manel"));
  });
});

// AS REGRAS SÃO JUÍZOS SOBRE RESTAURANTES, NÃO SOBRE LAYOUTS
describe("a composição segue o que a casa vende", () => {
  it("com muitas fotografias, a sala abre a página", () => {
    const seccoes = compor(casa({ pratos: 3 }), 6, 0);
    const tipos = seccoes.map((s) => s.type);
    expect(tipos.indexOf("gallery")).toBeLessThan(tipos.indexOf("menu"));
  });

  it("com muitos pratos e poucas fotografias, a comida abre a página", () => {
    const seccoes = compor(casa({ pratos: 12 }), 1, 0);
    const tipos = seccoes.map((s) => s.type);
    expect(tipos.indexOf("menu")).toBeLessThan(tipos.indexOf("gallery"));
  });

  // A pergunta de quem procura um café é "está aberto agora", e não "o que é que servem".
  it("num café o horário sobe para junto do topo", () => {
    const seccoes = compor(casa({ cuisine: "Café", style: "Casual" }), 2, 0);
    const tipos = seccoes.map((s) => s.type);
    expect(tipos.indexOf("hours")).toBe(1);
    expect(seccoes.find((s) => s.type === "hours")?.prominence).toBe("primary");
  });

  it("num restaurante de jantar o horário fica onde sempre esteve", () => {
    const seccoes = compor(casa({ cuisine: "Portuguese" }), 2, 0);
    const tipos = seccoes.map((s) => s.type);
    expect(tipos.indexOf("hours")).toBeGreaterThan(tipos.indexOf("menu"));
  });

  // A contenção é o produto que uma casa destas vende. Não é uma preferência do nome.
  it("na alta cozinha o hero é sempre contido, venha o nome que vier", () => {
    for (const nome of ["O Fogão", "Belcanto", "Ocean", "Alma", "Feitoria"]) {
      const seccoes = compor(casa({ name: nome, cuisine: "Fine dining", style: "Elegant" }), 5, 0);
      expect(seccoes[0].variant, nome).toBe("minimal");
    }
  });

  it("uma ementa longa lê-se em colunas, uma curta em lista", () => {
    const longa = compor(casa({ pratos: 12 }), 0, 0);
    const curta = compor(casa({ pratos: 3 }), 0, 0);

    expect(longa.find((s) => s.type === "menu")?.variant).toBe("columns");
    expect(curta.find((s) => s.type === "menu")?.variant).toBe("list");
  });

  // Nada é acolchoado para a página parecer comprida: uma secção existe porque o dono deu
  // conteúdo para ela.
  it("sem fotografias não há galeria, sem pratos não há ementa", () => {
    const tipos = compor(casa({ pratos: 0 }), 0, 0).map((s) => s.type);
    expect(tipos).not.toContain("gallery");
    expect(tipos).not.toContain("menu");
    expect(tipos).toEqual(["hero", "hours", "footer"]);
  });

  it("as encomendas vêm logo a seguir à ementa, que é quando dá vontade", () => {
    const tipos = compor(casa({ pratos: 5 }), 0, 2).map((s) => s.type);
    expect(tipos.indexOf("orders")).toBe(tipos.indexOf("menu") + 1);
  });
});
