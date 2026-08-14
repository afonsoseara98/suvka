import type { MetadataRoute } from "next";
import { appUrl } from "@/app/lib/appUrl";

// /robots.txt
//
// A linha que interessa é a do `Sitemap:`. É assim que um crawler que chega ao domínio
// sem passar pelo Search Console descobre a lista - e é o Bing, o DuckDuckGo e todos os
// outros, onde não há painel nenhum para submeter ficheiros à mão.

// O QUE NÃO SE FECHA, E PORQUÊ
//
// /s/ fica aberto. É um 308 para /<slug>, e um redireccionamento que o Google não pode
// visitar é um redireccionamento cujo sinal não transfere: os endereços /s/... que os
// restaurantes já partilharam ficariam a apontar para uma porta que o crawler tem ordem
// para não abrir.
//
// Os caminhos abaixo levam `$` e a forma com barra em vez do prefixo nu. `Disallow:
// /editor` fecharia tudo o que COMEÇA por /editor - e o /editor está na raiz, ao lado dos
// slugs dos clientes. Um restaurante chamado "editora-do-porto" desaparecia do Google sem
// nunca ninguém perceber porquê.
const PRIVATE_PATHS = [
  "/api/",
  "/dashboard$",
  "/dashboard/",
  "/editor$",
  "/editor/",
  "/new$",
  "/new/",
  "/publicar/",
  "/publicado/",
  "/preview$",
  "/preview/",
  "/entrar$",
  // O painel do funil e a recuperação de palavra-passe exigem sessão, mas o invólucro é
  // renderizado no servidor: um rastreador recebe HTML com "A carregar…" e indexa uma página
  // vazia com o nosso domínio. Nenhuma das duas tem nada a dizer a quem chega pela pesquisa.
  //
  // O /funil foi acrescentado por mim e ficou de fora desta lista - a mesma classe de erro que
  // o teste dos RESERVED_SLUGS apanha para os endereços dos clientes e que aqui não tem guarda.
  "/funil$",
  "/funil/",
  "/recuperar$",
  "/recuperar/",
  // O benchmark é ferramenta interna e faz chamadas pagas a modelos.
  "/benchmark$",
  "/benchmark/",
];

// Pela mesma razão que o app/sitemap.ts: por omissão isto corre durante o `next build`, e
// um build sem APP_URL (a CI, por exemplo) gravaria "Sitemap: http://localhost:3000/..."
// dentro do robots.txt que vai para produção. O ficheiro existiria, responderia 200, e
// mandaria todos os crawlers para uma máquina que não é esta.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const base = appUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: PRIVATE_PATHS,
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
