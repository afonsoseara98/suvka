import type { LandingPage, Section } from "@/app/types/landing";
import type { StrategyDNA } from "@/app/ai/types/dna";
import type { ResolvedImage } from "@/app/ai/types/visual";
import { DEFAULT_DNA } from "@/app/ai/types/dna";
import { clamp01 } from "@/app/ai/utils/math";
import type { RestaurantInput } from "./input";
import { labelsFor, cuisineName } from "./labels";
import { tidyPrice, tidyPhoneHref, mapsHref, whatsappHref } from "./tidy";

// BUILDING THE PAGE FROM THE FORM
//
// Zero model calls. Every string on the finished page is one the owner typed, or a label
// ("Menu", "Find us") that states what the reader is looking at. Nothing is generated,
// therefore nothing can be invented, therefore the page cannot make a claim the restaurant
// did not make. It is also instant and free, against a previous 28 seconds and a paid call.
//
// A copy-polish pass can be added later as one optional call. It is not needed to ship,
// and adding it first would reintroduce exactly the failure mode this replaces.

// The two dropdowns move the visual dial. This is not a template lookup returning a
// pre-authored theme - it is the same continuous StrategyDNA the rest of the system
// compiles, with two of its axes set from what the owner chose rather than inferred from
// prose. Every other axis keeps its neutral value.
const CUISINE_WARMTH: Record<string, number> = {
  Portuguese: 0.72,
  Italian: 0.86,
  Japanese: 0.18,
  "Fast-casual": 0.62,
  Café: 0.68,
  "Fine dining": 0.34,
  Burgers: 0.8,
  Pizza: 0.84,
};

const STYLE_DNA: Record<string, Partial<StrategyDNA>> = {
  Modern: { density: 0.45, roundedness: 0.5, typeScale: 0.68, decorationDensity: 0.2, elevation: 0.4 },
  Classic: { density: 0.4, roundedness: 0.2, typeScale: 0.55, decorationDensity: 0.15, elevation: 0.25 },
  Minimal: { density: 0.25, roundedness: 0.15, typeScale: 0.6, decorationDensity: 0.04, elevation: 0.12 },
  Rustic: { density: 0.5, roundedness: 0.35, typeScale: 0.62, decorationDensity: 0.3, elevation: 0.3 },
  Elegant: { density: 0.3, roundedness: 0.25, typeScale: 0.72, decorationDensity: 0.12, elevation: 0.35 },
  Casual: { density: 0.55, roundedness: 0.7, typeScale: 0.58, decorationDensity: 0.25, elevation: 0.3 },
};

export function dnaForRestaurant(input: RestaurantInput): StrategyDNA {
  const style = STYLE_DNA[input.style] ?? {};
  return {
    ...DEFAULT_DNA,
    ...style,
    colorTemperature: clamp01(CUISINE_WARMTH[input.cuisine] ?? 0.5),
    // Restaurants read well dark - a warm near-black behaves like a dining room at
    // night - but a café or a fast-casual place is a daytime business and should not.
    brightness: input.cuisine === "Café" || input.cuisine === "Fast-casual" ? 0.86 : 0.2,
    contentWidth: 0.3,
    emotionalIntensity: 0.7,
    heroSplitLean: 0.2,
    heroImageryProminence: 0.85,
  };
}

// The architecture. A section is here because the owner gave content for it: no dishes
// means no menu, no photos means no gallery. Nothing is padded to make the page look long.
function sectionsFor(input: RestaurantInput, galleryCount: number, orderCount: number): Section[] {
  const sections: Section[] = [{ type: "hero", variant: "centered", prominence: "primary", rhythm: "standard" }];

  if (galleryCount > 0) {
    sections.push({ type: "gallery", variant: "masonry", prominence: "primary", rhythm: "standard" });
  }
  if (input.dishes.length > 0) {
    sections.push({ type: "menu", variant: "list", prominence: "primary", rhythm: "breather" });
  }

  // Right after the menu: the customer has just read the dishes and wants to order.
  if (orderCount > 0) {
    sections.push({ type: "orders", variant: "buttons", prominence: "primary", rhythm: "standard" });
  }

  sections.push({ type: "hours", variant: "columns", prominence: "standard", rhythm: "standard" });
  sections.push({ type: "footer", variant: "simple", prominence: "compact", rhythm: "standard" });

  return sections;
}

// THE BOOKING BUTTON, IN ORDER OF HOW WELL IT CONVERTS
//
// Their own booking page is best: the customer finishes without leaving the flow. WhatsApp
// is second and beats the phone by a distance - the message is already written, it works at
// 23:40, and it costs the customer nothing to send. The phone is the honest floor for a
// tasca that has neither.
//
// Never returns undefined for a restaurant that gave a phone number, which validation makes
// mandatory - so the hero's main button always goes somewhere.
export function bookingHref(input: RestaurantInput): string | undefined {
  if (input.bookingUrl) return input.bookingUrl;

  const viaWhatsapp = input.whatsapp
    ? whatsappHref(input.whatsapp, labelsFor(input.language).bookingMessage(input.name))
    : undefined;
  if (viaWhatsapp) return viaWhatsapp;

  return input.phone ? `tel:${tidyPhoneHref(input.phone)}` : undefined;
}

// The platforms, in the order a Portuguese restaurant is most likely to be on them. Built
// already filtered: an empty array is how buildPage knows there is no section to add, so a
// restaurant with no delivery never gets a heading over nothing.
function orderLinksFor(input: RestaurantInput, title: string): { title: string; links: Array<{ label: string; url: string }> } {
  const links = [
    { label: "Uber Eats", url: input.uberEats },
    { label: "Glovo", url: input.glovo },
    { label: "Bolt Food", url: input.boltFood },
  ].filter((link): link is { label: string; url: string } => Boolean(link.url));

  return { title, links };
}

// The headline is the restaurant's name and the subtitle is the owner's own sentence. This
// is deliberately not "compelling copy": a person searching for a restaurant by name wants
// to see that name, and a generated slogan in its place is how a real business stops
// recognising its own website.
export function buildRestaurantPage(
  input: RestaurantInput,
  images: { hero: ResolvedImage | null; gallery: ResolvedImage[] }
): LandingPage {
  const labels = labelsFor(input.language);
  // What the owner and their customers read. The stored value stays English because it is
  // the key the image queries and the warmth table are written against.
  const cuisine = cuisineName(input.cuisine, input.language);
  const gallery = images.gallery.map((image) => ({ url: image.url, alt: image.alt, credit: image.credit }));

  const subtitle = input.description || labels.fallbackSubtitle(cuisine);
  const orders = orderLinksFor(input, labels.orderNow);

  return {
    dna: dnaForRestaurant(input),
    site: {
      seo: {
        title: `${input.name} — ${cuisine}`,
        description: subtitle,
        keywords: [cuisine.toLowerCase(), labels.restaurant.toLowerCase(), input.cuisine.toLowerCase()],
        ogTitle: input.name,
        ogDescription: subtitle,
      },
      branding: { primaryColor: "", secondaryColor: "", accentColor: "", fontHeading: "", fontBody: "", logoPrompt: "" },
      images: { heroPrompt: "", ogImagePrompt: "" },
    },
    sections: sectionsFor(input, gallery.length, orders.links.length),
    hero: {
      badge: cuisine,
      title: input.name,
      // Emphasise the last word of the name, which is usually the distinctive one.
      highlightWord: input.name.trim().split(/\s+/).slice(-1)[0] ?? "",
      subtitle,
      // TWO BUTTONS, BOTH ACTIONS
      //
      // The hero is not a toolbar. "Ver a ementa" used to sit here, and scrolling down the
      // page is not something a customer came to do - it is something they do on the way to
      // booking or to finding the door. So the two slots go to the only two actions that
      // matter at the top: reserve, and get here.
      //
      // The booking button degrades through what the restaurant actually has, in order of
      // how well it converts: their own booking page, then a WhatsApp message already
      // written, then the phone. It never promises a booking system that does not exist -
      // the words change with the destination.
      //
      // Os três destinos dizem os três nomes. "Reservar mesa" com o WhatsApp por trás
      // descrevia o que o cliente quer, não o que ia acontecer: carregava à espera de um
      // calendário e abria-se-lhe uma conversa. Agora o botão diz o canal antes do toque.
      primaryCTA: input.bookingUrl
        ? labels.bookTable
        : input.whatsapp
          ? labels.bookViaWhatsapp
          : labels.callToBook,
      secondaryCTA: labels.howToGetThere,
      primaryHref: bookingHref(input),
      secondaryHref: mapsHref(input.address),
      imageStyle: "website",
      imagePrompt: "",
      // Load-bearing. planHeroVisual falls back to a rendered software mockup unless the
      // hero declares a photo treatment - so omitting this put the fake browser window with
      // "yourbusiness.com" in it back on a restaurant's page, which is the exact defect the
      // visual layer was built to remove. Caught in a mobile screenshot, not by a test.
      visual: {
        treatment: "photo",
        subject: `${input.cuisine.toLowerCase()} restaurant plated dish`,
        alternateSubjects: ["restaurant food", "restaurant interior"],
        alt: `${input.name} — ${cuisine}`,
        orientation: "landscape",
        variantSeed: 0,
        scene: "website",
      },
      image: images.hero,
      // No stats. A restaurant that has not told us a number does not get one.
      stats: [],
    },
    stats: [],
    features: [],
    benefits: [],
    testimonials: [],
    pricing: [],
    faq: [],
    // Formatting, not invention: the owner types "24,00", "18€" and "4,50 euros" into three
    // boxes in a row and gets a menu with three different price formats on it. Every amount
    // is his; only the way they line up changes. See tidy.ts.
    menu: input.dishes.map((dish) => ({ ...dish, price: tidyPrice(dish.price) })),
    menuTitle: labels.menu,
    orders: orders.links.length > 0 ? orders : undefined,
    hoursTitle: labels.findUs,
    gallery,
    hours: {
      // Takeaway used to change nothing the owner could see: it fed a fallback sentence
      // that anyone who wrote their own description never saw. The question was asked and
      // the answer thrown away. It belongs here, next to the address and the hours, because
      // "can I collect?" is the same kind of question as "when are you open?".
      schedule: input.hasDelivery ? `${input.schedule}\n\n${labels.takeaway}` : input.schedule,
      address: input.address,
      phone: input.phone,
      // Tapping the address opens the customer's own map app. It was plain text, so somebody
      // standing on a street had to copy it out by hand - which nobody does; they go back to
      // Google and search the name, which is where the competitor is.
      mapUrl: mapsHref(input.address),
      // Both only when the owner gave them. A WhatsApp button that opens a chat with nobody
      // is worse than no button.
      whatsapp: input.whatsapp || undefined,
      email: input.email || undefined,
      instagram: input.instagram || undefined,
      labels: {
        address: labels.address,
        hours: labels.hours,
        phone: labels.phone,
        whatsapp: labels.whatsapp,
        email: labels.email,
        instagram: labels.instagram,
        openInMaps: labels.openInMaps,
        contactSubject: labels.contactSubject,
        // A mesma mensagem que o botão do hero já levava. A linha do WhatsApp na secção de
        // contactos abria uma conversa em branco - e uma caixa vazia às 23:40 é onde a
        // pessoa desiste, porque tem de decidir como se apresenta a um restaurante.
        whatsappMessage: labels.bookingMessage(input.name),
      },
    },
    footer: {
      company: input.name,
      email: input.email,
      copyright: `© ${new Date().getFullYear()} ${input.name}`,
    },
  } as unknown as LandingPage;
}

// What the gallery and hero should show. Built from the cuisine the owner chose, so a
// Japanese restaurant asks for sushi and a pizzeria asks for pizza.
export function imageQueriesFor(input: RestaurantInput): { hero: string; gallery: string[] } {
  const cuisine = input.cuisine.toLowerCase();
  return {
    hero: `${cuisine} restaurant plated dish`,
    gallery: [
      `${cuisine} food close up`,
      "restaurant dining room warm interior",
      "chef plating in kitchen",
      `${cuisine} dessert plated`,
    ],
  };
}
