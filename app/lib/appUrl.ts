// O ENDEREÇO CANÓNICO DO PRODUTO
//
// Um sitemap tem de levar URLs absolutas - a especificação não aceita caminhos relativos,
// e o Google recusa o ficheiro inteiro se as URLs não forem do domínio onde o encontrou.
//
// Atrás do Caddy, o Node é contactado em http://127.0.0.1:3000. Reconstruir o endereço a
// partir do pedido (`new URL(request.url).origin`, que era o que o checkout do Stripe fazia
// até ao BLOCKER #3 fechar) dá exactamente isso: um sitemap com
// `<loc>http://127.0.0.1:3000/taberna-do-goncalo</loc>`, que não aponta para lado nenhum
// e que ninguém repara que está errado, porque o ficheiro existe e abre.
//
// Por isso o endereço vem da configuração e nunca do pedido. Em produção é obrigatório e
// verificado no arranque (app/lib/env.ts) - a alternativa era descobrir o erro no Search
// Console três semanas depois.

const DEV_FALLBACK = "http://localhost:3000";

// Sem barra final, sempre: quem chama concatena `${appUrl()}/${slug}` e uma barra a mais
// dá uma URL diferente da que o site serve, que é conteúdo duplicado aos olhos do Google.
export function normalizeAppUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

export function appUrl(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.APP_URL?.trim() || env.AUTH_URL?.trim();
  return configured ? normalizeAppUrl(configured) : DEV_FALLBACK;
}
