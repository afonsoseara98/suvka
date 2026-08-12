import { describe, it, expect } from "vitest";
import { buildSitemap, PUBLIC_PAGES, MAX_SITEMAP_URLS } from "./sitemapEntries";
import { RESERVED_SLUGS } from "./publishService";
import type { PublishedSiteRef } from "./repositories/types";

const BASE = "https://suvka.com";

function site(slug: string, publishedAt = new Date("2026-08-01T10:00:00Z")): PublishedSiteRef {
  return { slug, publishedAt };
}

describe("buildSitemap", () => {
  it("a raiz não leva barra final", () => {
    const urls = buildSitemap(BASE, []).map((e) => e.url);
    expect(urls).toContain("https://suvka.com");
    expect(urls).not.toContain("https://suvka.com/");
  });

  it("inclui as páginas públicas do produto", () => {
    const urls = buildSitemap(BASE, []).map((e) => e.url);
    expect(urls).toContain("https://suvka.com/termos");
    expect(urls).toContain("https://suvka.com/privacidade");
  });

  it("um site publicado entra com o endereço da raiz", () => {
    const urls = buildSitemap(BASE, [site("taberna-do-goncalo")]).map((e) => e.url);
    expect(urls).toContain("https://suvka.com/taberna-do-goncalo");
  });

  // O endereço antigo continua a funcionar (308), mas anunciá-lo era pedir ao Google para
  // indexar o redireccionamento em vez do destino - que é o problema que a mudança para a
  // raiz existia para resolver.
  it("nunca anuncia o endereço antigo /s/<slug>", () => {
    const urls = buildSitemap(BASE, [site("taberna-do-goncalo")]).map((e) => e.url);
    expect(urls.some((u) => u.includes("/s/"))).toBe(false);
  });

  it("nenhuma rota privada aparece", () => {
    const urls = buildSitemap(BASE, [site("taberna-do-goncalo")]).map((e) => e.url);
    for (const privada of ["/dashboard", "/editor", "/new", "/entrar", "/publicar", "/publicado", "/preview", "/api"]) {
      expect(urls.some((u) => u.includes(privada)), `${privada} não devia estar no sitemap`).toBe(false);
    }
  });

  // Um lastmod que muda sozinho todos os dias ensina o crawler a ignorá-lo.
  it("o lastModified de um site é a data em que foi publicado", () => {
    const publishedAt = new Date("2026-07-04T09:30:00Z");
    const entrada = buildSitemap(BASE, [site("taberna", publishedAt)]).find((e) => e.url.endsWith("/taberna"));
    expect(entrada?.lastModified).toEqual(publishedAt);
  });

  // A rota é dinâmica: corre outra vez a cada pedido. Se alguma data fosse `new Date()`,
  // o ficheiro dizia-se alterado de segundo a segundo e o crawler deixava de acreditar
  // no <lastmod> - inclusive no dos restaurantes, que é verdadeiro.
  it("dois pedidos seguidos dão exactamente o mesmo ficheiro", () => {
    const primeiro = buildSitemap(BASE, [site("taberna")]);
    const segundo = buildSitemap(BASE, [site("taberna")]);
    expect(segundo).toEqual(primeiro);
  });

  it("as páginas do produto não inventam uma data de alteração", () => {
    for (const entrada of buildSitemap(BASE, [])) {
      expect(entrada.lastModified, `${entrada.url} não devia ter lastmod`).toBeUndefined();
    }
  });

  it("todas as URLs são absolutas e do domínio configurado", () => {
    const entries = buildSitemap(BASE, [site("a"), site("b")]);
    for (const entry of entries) {
      expect(entry.url.startsWith("https://suvka.com")).toBe(true);
      expect(() => new URL(entry.url)).not.toThrow();
    }
  });

  it("não há URLs repetidas", () => {
    const urls = buildSitemap(BASE, [site("a"), site("b")]).map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("acompanha o endereço base, seja ele qual for", () => {
    const urls = buildSitemap("http://localhost:3000", [site("taberna")]).map((e) => e.url);
    expect(urls).toContain("http://localhost:3000/taberna");
  });

  // O Google descarta o ficheiro INTEIRO acima de 50 000 URLs. Cortar é pior do que
  // partir? Não: cortado, indexa 50 000; descartado, indexa zero.
  it("nunca passa o limite do protocolo", () => {
    const muitos = Array.from({ length: MAX_SITEMAP_URLS + 10 }, (_, i) => site(`restaurante-${i}`));
    expect(buildSitemap(BASE, muitos).length).toBe(MAX_SITEMAP_URLS);
  });
});

// Um sitemap que anuncia uma página que não existe é um erro no Search Console, e é a
// classe de erro que só se descobre lá - nunca a usar o produto. Estes dois testes lêem o
// disco e a lista de reservados para que a divergência apareça antes do commit.
describe("as páginas públicas anunciadas existem mesmo", () => {
  it("cada uma tem um page.tsx no sítio correspondente", async () => {
    const { existsSync } = await import("fs");
    const path = await import("path");

    const appDir = path.join(process.cwd(), "app");
    const emFalta = PUBLIC_PAGES.filter((page) => {
      const segmento = page.path === "/" ? "" : page.path.replace(/^\//, "");
      return !existsSync(path.join(appDir, segmento, "page.tsx"));
    });

    expect(emFalta.map((p) => p.path), "páginas no sitemap sem rota em app/").toEqual([]);
  });

  it("nenhuma pode ser ocupada por um restaurante", () => {
    const desprotegidas = PUBLIC_PAGES.filter((page) => page.path !== "/").filter(
      (page) => !RESERVED_SLUGS.has(page.path.replace(/^\//, ""))
    );

    expect(desprotegidas.map((p) => p.path), "rotas do sitemap por reservar").toEqual([]);
  });
});
