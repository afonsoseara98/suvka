import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

const nextConfig: NextConfig = {
  // A METADATA NÃO PODE CHEGAR DEPOIS DO <head>
  //
  // Por omissão o Next transmite a metadata em streaming e deixa o React içá-la para o
  // <head> já no browser. Medido contra este build: no PRIMEIRO pedido a uma rota de
  // restaurante - o único em que a consulta à base de dados ainda é lenta - o og:image, o
  // og:title, a description e o canonical saem todos FORA do <head>. Do segundo pedido em
  // diante ficam lá dentro.
  //
  // O Next protege os agentes que conhece (WhatsApp, facebookexternalhit, Twitterbot,
  // Bingbot...) forçando-lhes uma resposta bloqueante, e isso funciona - foi verificado
  // agente a agente. Mas é uma lista, e o custo de não estar nela é o cartão de partilha de
  // um restaurante sair sem fotografia, uma vez, precisamente quando o servidor acabou de
  // reiniciar - que é o minuto a seguir a cada deploy.
  //
  // O streaming aqui não compra nada: a metadata e o conteúdo saem da MESMA consulta
  // (loadPublishedSite), não há loading.tsx, e portanto não há nada de útil para mostrar
  // mais cedo. Trocar uma vantagem que não existe por uma falha que existe não se justifica.
  htmlLimitedBots: /.*/,
};

// O CANONICAL É DECIDIDO NO BUILD, E NÃO HÁ SEGUNDA OPORTUNIDADE
//
// O app/lib/env.ts protege o ARRANQUE, e isso chega para tudo o que é lido a cada pedido.
// Mas as páginas do produto são estáticas: o `metadataBase` do app/layout.tsx é resolvido
// durante o `next build` e fica escrito no HTML.
//
// Um build sem APP_URL produz <link rel="canonical" href="http://localhost:3000"/> na
// homepage. Isso não é um endereço partido - é uma instrução ao Google a dizer que a versão
// oficial desta página está noutro sítio. O servidor arranca bem, o site abre bem, e o
// pedido de desindexação já foi entregue.
//
// Só na fase de build: o `next dev` e o `next start` continuam a arrancar sem nada
// configurado, que é o que faz sentido numa máquina de trabalho.
const configFor = (phase: string): NextConfig => {
  const configured = process.env.APP_URL?.trim() || process.env.AUTH_URL?.trim();

  if (phase === PHASE_PRODUCTION_BUILD && !configured) {
    throw new Error(
      "\n\n  APP_URL em falta.\n\n" +
        "  Este build ia gravar http://localhost:3000 no <link rel=\"canonical\"> das páginas\n" +
        "  estáticas, o que diz ao Google para não indexar nenhuma delas.\n\n" +
        "  Ponha APP_URL=\"https://o-seu-dominio\" no .env.production e volte a correr.\n"
    );
  }

  return nextConfig;
};

export default configFor;
