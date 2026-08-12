import type { MetadataRoute } from "next";
import { repos } from "@/app/lib/repos";
import { appUrl } from "@/app/lib/appUrl";
import { listPublishedSites } from "@/app/lib/publishService";
import { buildSitemap } from "@/app/lib/sitemapEntries";

// /sitemap.xml
//
// A casca de IO: vai buscar o endereço à configuração e os sites à base de dados, e
// entrega as duas coisas ao app/lib/sitemapEntries.ts, onde estão as decisões e os testes.
//
// `force-dynamic` por duas razões, e a primeira é a que parte a CI se faltar: o Next
// trata o sitemap como um Route Handler CACHED BY DEFAULT, ou seja, executa-o durante o
// `next build`. A CI faz build sem DATABASE_URL - e o build passaria a exigir uma base de
// dados a que nunca deveria ter de tocar. A segunda: mesmo com base de dados, um sitemap
// gerado no build congela a lista de restaurantes na hora do deploy, e quem publicar
// depois nunca lá aparecia.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Sem try/catch de propósito. Se a base de dados não responder, isto tem de dar 500 e o
  // Search Console tem de dizer "não consegui ler o sitemap". Devolver só as três páginas
  // do produto seria dizer ao Google, com toda a confiança, que não existe restaurante
  // nenhum - e ele acredita, e desindexa-os.
  const sites = await listPublishedSites(repos);
  return buildSitemap(appUrl(), sites);
}
