// O PREÇO QUE O GOOGLE LÊ NÃO É O PREÇO QUE O DONO ESCREVE
//
// O schema.org define `Offer.price` como um número, e `priceCurrency` como um código ISO
// à parte. "3,00 €" não é nenhuma das duas coisas: é um número formatado para um humano
// português, com vírgula decimal e o símbolo colado.
//
// O que acontecia com isso: o Google descartava a Offer inteira, em silêncio. É a mesma
// armadilha que o RestaurantSchema.tsx já evita nas imagens - lá está escrito que "o
// schema.org exige URLs completas e descarta em silêncio o que não seja" - e que aqui
// tinha escapado.
//
// FALHA FECHADO, DE PROPÓSITO
//
// Devolve null a tudo o que não consiga converter com certeza. Uma Offer ausente é uma
// informação a menos; uma Offer com o preço errado é uma afirmação falsa sobre o negócio de
// outra pessoa, publicada por nós, num campo que o Google mostra a quem está a decidir onde
// almoçar. Entre as duas não há dúvida.

export interface PrecoNormalizado {
  price: string;
  priceCurrency: string;
}

// Só euro. O produto é português e cobra em euros, e um símbolo diferente no meio de um
// preço é sinal de que não percebemos o que ali está - e não de que devemos assumir EUR.
const OUTRAS_MOEDAS = /[$£¥₹]|USD|GBP|BRL/i;

export function normalisePrice(bruto: string | undefined | null): PrecoNormalizado | null {
  if (!bruto) return null;

  const texto = bruto.trim();
  if (!texto || OUTRAS_MOEDAS.test(texto)) return null;

  // Fora o símbolo do euro, os espaços (incluindo o fino e o inquebrável, que aparecem
  // quando alguém cola de um documento) e a palavra escrita por extenso.
  const limpo = texto
    .replace(/€/g, "")
    .replace(/\beuros?\b/gi, "")
    .replace(/[\s  ]/g, "");

  // Um número com, quando muito, um separador decimal. Qualquer outra coisa - intervalos
  // ("8-12"), "a partir de", "s/ preço", texto - não é um preço que se possa afirmar.
  if (!/^\d+([.,]\d+)*$/.test(limpo)) return null;

  const separadores = [...limpo.matchAll(/[.,]/g)];
  let inteiro = limpo;
  let decimais = "";

  if (separadores.length > 0) {
    const ultimo = separadores[separadores.length - 1].index!;
    const depois = limpo.slice(ultimo + 1);

    // O ÚLTIMO separador é decimal quando o que vem depois são uma ou duas casas. Com três,
    // é milhares ("1.250"), e um preço de menu com milhares não tem casas decimais.
    if (depois.length <= 2) {
      inteiro = limpo.slice(0, ultimo).replace(/[.,]/g, "");
      decimais = depois;
    } else {
      inteiro = limpo.replace(/[.,]/g, "");
    }
  }

  if (!/^\d+$/.test(inteiro)) return null;

  const valor = Number(`${inteiro}.${decimais || "0"}`);
  if (!Number.isFinite(valor)) return null;

  // Duas casas sempre: é o que o schema.org espera de um valor monetário, e "3" e "3.00"
  // são o mesmo número escrito com confiança diferente.
  return { price: valor.toFixed(2), priceCurrency: "EUR" };
}
