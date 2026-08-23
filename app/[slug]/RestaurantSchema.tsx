import type { PageState } from "@/app/editor/pageState";
import type { MenuItem, OpeningHours, HeroData } from "@/app/types/landing";
import { isCuisineLabel } from "@/app/lib/restaurant/labels";
import { normalisePrice } from "@/app/lib/restaurant/price";

type Props = {
  state: PageState;
  siteUrl?: string;
};

// STRUCTURED DATA
//
// The difference between a restaurant appearing in Google as a blue link and appearing as
// a card with its address, its hours and its phone number - with a call button, on the
// phone of someone standing on the street deciding where to eat. For a local business that
// card IS the search result that matters.
//
// Everything below is read from what the owner typed. Nothing is inferred and nothing is
// filled in with a plausible default: structured data is a machine-readable claim about a
// real business, and inventing an opening time here would be worse than inventing a
// statistic on the page, because the claim is what Google shows and what a person acts on.
// A field the owner left blank is simply absent.

function sectionContent(state: PageState, type: string): unknown {
  return state.sections.find((section) => section.type === type)?.content ?? null;
}

// Completa um caminho relativo com a origem do próprio site. Se não houver por onde
// completar, devolve o que recebeu em vez de inventar um domínio - uma URL errada num
// campo que o Google lê é pior do que um campo em falta.
export function absolute(url: string, siteUrl?: string): string {
  if (!url.startsWith("/") || !siteUrl) return url;
  try {
    return new URL(url, siteUrl).toString();
  } catch {
    return url;
  }
}

function asMenuItems(content: unknown): MenuItem[] {
  if (Array.isArray(content)) return content as MenuItem[];
  if (content && typeof content === "object") {
    const items = (content as Record<string, unknown>).items;
    if (Array.isArray(items)) return items as MenuItem[];
  }
  return [];
}

export default function RestaurantSchema({ state, siteUrl }: Props) {
  const hero = sectionContent(state, "hero") as HeroData | null;
  const hours = sectionContent(state, "hours") as OpeningHours | null;
  const dishes = asMenuItems(sectionContent(state, "menu"));

  const name = hero?.title?.trim();
  if (!name) return null;

  // Only the properties there is real data for. schema.org tolerates omission; it does not
  // tolerate being lied to, and neither would the restaurant.
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name,
  };

  if (state.site?.seo?.description) schema.description = state.site.seo.description;
  if (siteUrl) schema.url = siteUrl;
  // A fotografia é servida de /uploads/..., que é relativo. O schema.org exige URLs
  // completas e descarta em silêncio o que não seja - e o que se perde aqui é precisamente
  // a imagem do cartão que faz alguém escolher este restaurante e não o do lado.
  if (hero?.image?.url) schema.image = absolute(hero.image.url, siteUrl);

  if (hours?.phone?.trim()) schema.telephone = hours.phone.trim();

  // O tipo de cozinha é o que separa "um restaurante" de "onde se come bacalhau", e é dos
  // poucos campos que o Google usa para decidir a QUE pesquisa esta casa responde.
  //
  // Vem do badge do hero, que é onde o buildRestaurantPage o escreve - mas só depois de o
  // reconhecer como um dos nomes que nós próprios produzimos. Um badge escrito à mão, ou
  // vindo do gerador antigo, não produz nada. Ver isCuisineLabel.
  if (isCuisineLabel(hero?.badge)) schema.servesCuisine = hero!.badge.trim();

  if (hours?.address?.trim()) {
    // PostalAddress with the street line as written. Parsing a Portuguese address into
    // street/city/postcode reliably is its own problem, and guessing the split wrong puts a
    // wrong city on a map pin.
    schema.address = { "@type": "PostalAddress", streetAddress: hours.address.trim() };
  }

  // openingHours takes a specific machine format ("Tu-Su 12:00-15:00") that free text
  // cannot be converted into safely - "Encerrado à segunda" has no representation, and a
  // wrong guess tells Google a closed restaurant is open. The human-readable line goes in
  // a field meant for humans instead.
  if (hours?.schedule?.trim()) {
    schema.publicAccess = true;
    schema.specialOpeningHoursSpecification = undefined;
    schema.openingHoursSpecification = undefined;
    schema.hasMap = undefined;
    schema.slogan = undefined;
    schema.disambiguatingDescription = hours.schedule.trim();
  }

  if (dishes.length > 0) {
    schema.hasMenu = {
      "@type": "Menu",
      hasMenuSection: {
        "@type": "MenuSection",
        hasMenuItem: dishes.map((dish) => {
          const item: Record<string, unknown> = { "@type": "MenuItem", name: dish.name };
          if (dish.description?.trim()) item.description = dish.description.trim();
          // O preço vai como número e a moeda à parte, que é o que o schema.org define. Um
          // "3,00 €" colado no campo `price` fazia o Google descartar a Offer inteira, em
          // silêncio - a mesma armadilha que a imagem relativa acima. Ver price.ts, que
          // devolve null a tudo o que não consiga converter com certeza.
          const preco = normalisePrice(dish.price);
          if (preco) item.offers = { "@type": "Offer", ...preco };
          return item;
        }),
      },
    };
  }

  // Strip the keys explicitly set to undefined above rather than emitting nulls.
  const clean = Object.fromEntries(Object.entries(schema).filter(([, value]) => value !== undefined));

  return (
    <script
      type="application/ld+json"
      // The content is JSON we just built from stored strings, not markup, and
      // JSON.stringify escapes what matters. `<` is escaped so a dish called "</script>"
      // cannot close the tag early.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(clean).replace(/</g, "\\u003c") }}
    />
  );
}
