// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import SuvkaSchema from "./SuvkaSchema";

vi.mock("@/app/lib/appUrl", () => ({ appUrl: () => "https://suvka.com" }));

afterEach(cleanup);

function grafo(container: HTMLElement): Record<string, unknown>[] {
  const script = container.querySelector('script[type="application/ld+json"]');
  if (!script) throw new Error("a homepage não emitiu JSON-LD");
  return JSON.parse(script.textContent ?? "{}")["@graph"];
}

const doTipo = (g: Record<string, unknown>[], tipo: string) => g.find((n) => n["@type"] === tipo);

describe("SuvkaSchema", () => {
  // A ASSIMETRIA QUE ISTO EXISTE PARA FECHAR
  //
  // Cada site de restaurante emitia um Restaurant completo e a página da Suvka não dizia à
  // máquina o que isto é. Se alguém remover o componente, isto parte.
  it("descreve a Suvka como organização, sítio e aplicação", () => {
    const { container } = render(<SuvkaSchema />);
    const g = grafo(container);

    expect(doTipo(g, "Organization")).toBeDefined();
    expect(doTipo(g, "WebSite")).toBeDefined();
    expect(doTipo(g, "SoftwareApplication")).toBeDefined();
  });

  it("liga o sítio e a aplicação à mesma organização", () => {
    const { container } = render(<SuvkaSchema />);
    const g = grafo(container);
    const id = doTipo(g, "Organization")!["@id"];

    expect((doTipo(g, "WebSite")!.publisher as Record<string, unknown>)["@id"]).toBe(id);
    expect((doTipo(g, "SoftwareApplication")!.publisher as Record<string, unknown>)["@id"]).toBe(id);
  });

  // O mesmo formato que exigimos aos pratos dos clientes: número e moeda à parte.
  it("declara o preço como número e a moeda à parte", () => {
    const { container } = render(<SuvkaSchema />);
    const offer = doTipo(grafo(container), "SoftwareApplication")!.offers as Record<string, unknown>;

    expect(offer.price).toBe("19.00");
    expect(offer.priceCurrency).toBe("EUR");
  });

  // A REGRA QUE APLICAMOS AOS CLIENTES VALE PARA NÓS
  //
  // O RestaurantSchema recusa-se a inventar campos. Se alguém acrescentar aqui uma
  // classificação ou uma crítica que não existem para dar ar de credibilidade ao cartão do
  // Google, isto parte - e é suposto partir.
  it("não inventa classificações nem críticas", () => {
    const { container } = render(<SuvkaSchema />);
    const texto = JSON.stringify(grafo(container));

    expect(texto).not.toContain("aggregateRating");
    expect(texto).not.toContain("ratingValue");
    expect(texto).not.toContain("review");
    expect(texto).not.toContain("sameAs");
  });

  it("usa o endereço público do próprio site, não um domínio escrito à mão", () => {
    const { container } = render(<SuvkaSchema />);
    const g = grafo(container);

    expect(doTipo(g, "WebSite")!.url).toBe("https://suvka.com");
    expect(doTipo(g, "Organization")!.url).toBe("https://suvka.com");
  });
});
