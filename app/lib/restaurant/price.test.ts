import { describe, it, expect } from "vitest";
import { normalisePrice } from "./price";

describe("normalisePrice", () => {
  // As formas que um dono de restaurante escreve mesmo. Todas significam o mesmo número.
  it.each([
    ["3,00 €", "3.00"],
    ["3,00€", "3.00"],
    ["3 €", "3.00"],
    ["3€", "3.00"],
    ["€3", "3.00"],
    ["3", "3.00"],
    ["3.00", "3.00"],
    ["3,00", "3.00"],
    ["18,50 €", "18.50"],
    ["18.5", "18.50"],
    ["  12,90  ", "12.90"],
    ["7,5 euros", "7.50"],
  ])("converte %s em %s EUR", (bruto, esperado) => {
    expect(normalisePrice(bruto)).toEqual({ price: esperado, priceCurrency: "EUR" });
  });

  // Espaço fino e inquebrável: aparecem quando alguém cola de um Word ou de um PDF, e são
  // indistinguíveis de um espaço normal a olho.
  it("aceita espaços não normais entre o número e o símbolo", () => {
    expect(normalisePrice("9,90 €")).toEqual({ price: "9.90", priceCurrency: "EUR" });
    expect(normalisePrice("9,90 €")).toEqual({ price: "9.90", priceCurrency: "EUR" });
  });

  // Com três casas depois do separador é milhares, não decimais. Um menu não tem preços
  // assim, mas um vinho de garrafeira tem.
  it("lê 1.250 como mil duzentos e cinquenta, não como 1,25", () => {
    expect(normalisePrice("1.250")).toEqual({ price: "1250.00", priceCurrency: "EUR" });
    expect(normalisePrice("1.250,50")).toEqual({ price: "1250.50", priceCurrency: "EUR" });
  });

  // FALHA FECHADO
  //
  // Cada um destes é uma coisa que não sabemos converter. Devolver um palpite punha um preço
  // errado num campo que o Google mostra a quem está a decidir onde almoçar.
  it.each([
    ["", "vazio"],
    ["   ", "só espaços"],
    ["a partir de 8€", "texto à volta"],
    ["8-12 €", "intervalo"],
    ["s/ preço", "sem preço"],
    ["preço sob consulta", "frase"],
    ["ver ementa", "remissão"],
    ["--", "traços"],
  ])("recusa %s (%s)", (bruto) => {
    expect(normalisePrice(bruto)).toBeNull();
  });

  it("recusa undefined e null", () => {
    expect(normalisePrice(undefined)).toBeNull();
    expect(normalisePrice(null)).toBeNull();
  });

  // Nunca afirmamos EUR sobre um valor marcado noutra moeda. Um restaurante português com a
  // ementa em dólares para turistas existe, e dizer ao Google que 12 dólares são 12 euros é
  // publicar um preço errado sobre o negócio de outra pessoa.
  it.each(["$12", "12 USD", "£10", "10 GBP", "R$ 30"])("recusa moeda que não é euro: %s", (bruto) => {
    expect(normalisePrice(bruto)).toBeNull();
  });
});
