import type { MetadataRoute } from "next";
import type { PublishedSiteRef } from "./repositories/types";

// O QUE O GOOGLE VÊ QUANDO PERGUNTA O QUE EXISTE AQUI
//
// A parte pura do /sitemap.xml: recebe o endereço base e a lista de sites publicados,
// devolve as entradas. Sem base de dados e sem `process.env`, para se poder testar - o
// app/sitemap.ts é só a casca que vai buscar as duas coisas.
//
// NÃO CHAMAR A ESTE FICHEIRO sitemap.ts. Dentro de app/, `sitemap.(ts|js)` é uma convenção
// de metadata em QUALQUER segmento, não só na raiz: app/lib/sitemap.ts era interpretado
// como a rota /lib/sitemap.xml e o build parava em "Export default doesn't exist". Mesma
// regra para robots, manifest, opengraph-image e afins - nenhum desses nomes é livre aqui.
//
// A decisão que interessa: os sites dos restaurantes entram no MESMO sitemap que as
// páginas do produto. Vivem no mesmo domínio desde que passaram para a raiz
// (suvka.com/taberna-do-goncalo), e um restaurante indexado é a única prova pública de
// que isto funciona - e é metade do que o dono está a comprar.

export interface SitemapPage {
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
}

// As páginas do produto que valem uma indexação, e só essas.
//
// Fora daqui de propósito:
//   /entrar     - um formulário de login não responde a pergunta nenhuma de quem procura
//   /dashboard, /editor, /new, /publicar, /publicado  - exigem sessão
//   /preview    - 404 em produção
//   /s/<slug>   - 308 para /<slug>; anunciar o endereço antigo era pedir ao Google para
//                 indexar o redireccionamento em vez do destino
export const PUBLIC_PAGES: readonly SitemapPage[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/termos", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacidade", changeFrequency: "yearly", priority: 0.3 },
];

// Limite do protocolo: 50 000 URLs por ficheiro. Muito acima de qualquer número que este
// produto vá ter tão cedo, mas o dia em que passar é o dia em que o Google deixa de ler o
// ficheiro INTEIRO - e sem isto ninguém dava por nada. Quando aqui chegar, a correcção é
// o generateSitemaps do Next, não um número maior.
export const MAX_SITEMAP_URLS = 50_000;

export function buildSitemap(baseUrl: string, sites: readonly PublishedSiteRef[]): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = PUBLIC_PAGES.map((page) => ({
    // O `/` da raiz não leva barra: https://suvka.com/ e https://suvka.com são a mesma
    // página para um humano e duas URLs para um crawler.
    url: page.path === "/" ? baseUrl : `${baseUrl}${page.path}`,
    // SEM lastModified, de propósito. A rota é dinâmica, portanto um `new Date()` aqui
    // dava um <lastmod> diferente a CADA pedido - e três páginas que dizem ter mudado
    // há dois segundos, sempre, ensinam o crawler a ignorar o campo no ficheiro inteiro,
    // incluindo nas linhas dos restaurantes, onde a data é verdadeira e importa.
    // Não sabemos quando o /termos mudou; omitir é a resposta honesta, e o protocolo
    // trata a ausência como "não sei" em vez de como um erro.
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  const restaurants: MetadataRoute.Sitemap = sites.map((site) => ({
    url: `${baseUrl}/${site.slug}`,
    // A data em que foi publicado, não a de hoje: um `lastmod` que muda sozinho todos os
    // dias é a maneira mais rápida de o Google deixar de acreditar no ficheiro.
    lastModified: site.publishedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...pages, ...restaurants].slice(0, MAX_SITEMAP_URLS);
}
