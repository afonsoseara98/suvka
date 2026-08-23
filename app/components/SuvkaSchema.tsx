import { appUrl } from "@/app/lib/appUrl";
import { TRIAL_DAYS } from "@/app/lib/billing";

// O SUVKA DESCRITO AO GOOGLE
//
// O produto gerava para cada restaurante um Restaurant completo - menu, morada, telefone,
// imagem - e a nossa própria página não dizia à máquina o que isto é, quem o faz, nem quanto
// custa. Fazíamos melhor SEO para os clientes do que para nós.
//
// AS MESMAS REGRAS QUE APLICAMOS AOS CLIENTES
//
// O RestaurantSchema.tsx recusa-se a preencher um campo que o dono não escreveu, porque
// structured data é uma afirmação legível por máquinas sobre um negócio real. A regra não
// muda por o negócio ser o nosso: aqui não há aggregateRating, não há review, não há
// sameAs, e não há um único número que não esteja provado noutro sítio do código.
//
// O que está afirmado, e onde se verifica:
//   19 EUR/mês       - o STRIPE_PRICE_ID de produção, visível no Checkout
//   30 dias grátis   - TRIAL_DAYS, importado aqui em vez de escrito à mão para que uma
//                      mudança de política não deixe esta página a prometer o número antigo
export default function SuvkaSchema() {
  const base = appUrl();

  const grafo = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${base}/#organizacao`,
        name: "Suvka",
        url: base,
        email: "ola@suvka.com",
      },
      {
        "@type": "WebSite",
        "@id": `${base}/#site`,
        name: "Suvka",
        url: base,
        inLanguage: "pt-PT",
        publisher: { "@id": `${base}/#organizacao` },
      },
      {
        "@type": "SoftwareApplication",
        name: "Suvka",
        applicationCategory: "BusinessApplication",
        // Não há aplicação para instalar: corre no browser e é isso que o campo diz.
        operatingSystem: "Web",
        url: base,
        inLanguage: "pt-PT",
        publisher: { "@id": `${base}/#organizacao` },
        description:
          "Criamos o site do seu restaurante em minutos. Menu, fotos, horário e contacto, sem designer e sem código.",
        offers: {
          "@type": "Offer",
          price: "19.00",
          priceCurrency: "EUR",
          description: `Subscrição mensal. Os primeiros ${TRIAL_DAYS} dias são gratuitos e não exigem cartão.`,
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // O mesmo padrão do RestaurantSchema: o JSON é construído por nós, nunca vem do
      // utilizador, e o React escaparia as aspas se isto fosse texto normal.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(grafo) }}
    />
  );
}
