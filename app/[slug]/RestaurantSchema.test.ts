import { describe, it, expect } from "vitest";
import { absolute } from "./RestaurantSchema";

// O schema.org exige URLs completas e descarta em silêncio o que não seja. O que se perde
// quando isto falha é a fotografia do cartão do restaurante nos resultados do Google - sem
// erro nenhum, em lado nenhum.
describe("absolute", () => {
  it("completa um caminho de upload com o domínio do próprio site", () => {
    expect(absolute("/uploads/sala.jpg", "https://suvka.com/taberna-do-goncalo")).toBe(
      "https://suvka.com/uploads/sala.jpg"
    );
  });

  it("não mexe numa URL que já é absoluta", () => {
    const pexels = "https://images.pexels.com/photos/1/sala.jpg";
    expect(absolute(pexels, "https://suvka.com/taberna")).toBe(pexels);
  });

  // Melhor um campo em falta do que um campo com um domínio inventado.
  it("devolve o que recebeu quando não há por onde completar", () => {
    expect(absolute("/uploads/sala.jpg", undefined)).toBe("/uploads/sala.jpg");
    expect(absolute("/uploads/sala.jpg", "/taberna-do-goncalo")).toBe("/uploads/sala.jpg");
  });
});
