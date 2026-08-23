// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import RestaurantSchema from "./RestaurantSchema";
import type { PageState } from "@/app/editor/pageState";

afterEach(cleanup);

// O mínimo que o componente lê: o hero dá o nome e o badge, o menu dá os pratos. Montado à
// mão em vez de gerado, para que o que está a ser afirmado no teste se leia aqui.
function estado(hero: Record<string, unknown>, pratos: unknown[] = []): PageState {
  return {
    site: { seo: { description: "Uma sala pequena em Sintra" } },
    sections: [
      { type: "hero", content: hero },
      { type: "menu", content: pratos },
    ],
  } as unknown as PageState;
}

function jsonLd(container: HTMLElement): Record<string, unknown> {
  const script = container.querySelector('script[type="application/ld+json"]');
  if (!script) throw new Error("não foi emitido nenhum bloco JSON-LD");
  return JSON.parse(script.textContent ?? "{}");
}

describe("RestaurantSchema — servesCuisine", () => {
  // O tipo de cozinha decide a QUE pesquisa esta casa responde. Vinha a faltar apesar de o
  // dado existir no badge.
  it("emite o tipo de cozinha quando o badge é um nome que nós produzimos", () => {
    const { container } = render(
      <RestaurantSchema state={estado({ title: "Casa de Pena", badge: "Cozinha portuguesa" })} />
    );

    expect(jsonLd(container).servesCuisine).toBe("Cozinha portuguesa");
  });

  it("reconhece também os nomes em inglês", () => {
    const { container } = render(
      <RestaurantSchema state={estado({ title: "Casa de Pena", badge: "Fine dining" })} />
    );

    expect(jsonLd(container).servesCuisine).toBe("Fine dining");
  });

  // FALHA FECHADO, E É ESTE O TESTE QUE IMPORTA
  //
  // O badge é um campo genérico: nas páginas do gerador antigo pode conter qualquer frase.
  // Emitir isso como servesCuisine seria publicar uma afirmação inventada sobre o negócio
  // de outra pessoa. Se alguém trocar a verificação por uma leitura directa, isto parte.
  it("não inventa cozinha a partir de um badge que não é um tipo de cozinha", () => {
    const { container } = render(
      <RestaurantSchema state={estado({ title: "Qualquer Coisa", badge: "✨ Novo em Lisboa" })} />
    );

    expect(jsonLd(container).servesCuisine).toBeUndefined();
  });

  it("não emite nada quando não há badge", () => {
    const { container } = render(<RestaurantSchema state={estado({ title: "Sem Badge" })} />);

    expect(jsonLd(container).servesCuisine).toBeUndefined();
  });
});

describe("RestaurantSchema — Offer", () => {
  // O Google descartava a Offer inteira, em silêncio, por causa do "3,00 €".
  it("emite o preço como número e a moeda à parte", () => {
    const { container } = render(
      <RestaurantSchema
        state={estado({ title: "Casa de Pena", badge: "Cozinha portuguesa" }, [
          { name: "Pastel de bacalhau", price: "3,00 €" },
        ])}
      />
    );

    const menu = jsonLd(container).hasMenu as Record<string, never>;
    const item = (menu.hasMenuSection as Record<string, never>).hasMenuItem as unknown as Record<string, unknown>[];

    expect(item[0].offers).toEqual({ "@type": "Offer", price: "3.00", priceCurrency: "EUR" });
  });

  // Um preço que não se consegue converter não vira palpite: o prato fica sem Offer e
  // continua no menu.
  it("mantém o prato e omite a Offer quando o preço não é convertível", () => {
    const { container } = render(
      <RestaurantSchema
        state={estado({ title: "Casa de Pena", badge: "Cozinha portuguesa" }, [
          { name: "Peixe do dia", price: "preço sob consulta" },
        ])}
      />
    );

    const menu = jsonLd(container).hasMenu as Record<string, never>;
    const item = (menu.hasMenuSection as Record<string, never>).hasMenuItem as unknown as Record<string, unknown>[];

    expect(item[0].name).toBe("Peixe do dia");
    expect(item[0].offers).toBeUndefined();
  });

  // Nunca sai um preço com símbolo, vírgula decimal ou espaço no campo `price`.
  it("nunca deixa passar um preço formatado para humanos", () => {
    const { container } = render(
      <RestaurantSchema
        state={estado({ title: "Casa de Pena", badge: "Cozinha portuguesa" }, [
          { name: "Bacalhau", price: "18,50 €" },
          { name: "Arroz de polvo", price: "12€" },
        ])}
      />
    );

    const texto = JSON.stringify(jsonLd(container));

    expect(texto).not.toMatch(/"price":\s*"[^"]*[€,\s]/);
    expect(texto).toContain('"price":"18.50"');
    expect(texto).toContain('"price":"12.00"');
  });
});
