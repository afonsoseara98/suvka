import type { StrategyDNA } from "../ai/types/dna";
import type { ResolvedImage, VisualIntent } from "../ai/types/visual";

// "logoCloud" and "cta" are rendered entirely from data the pipeline already produces
// (LogoCloud's content is static placeholder logos; CTABanner reuses hero.primaryCTA/
// secondaryCTA) - deliberately so LandingComposition can place them without any change
// to schema.ts or the copy the LLM generates. New roles that DO need their own
// generated copy (gallery, story, doctors, ...) are a schema change and out of scope
// until that's explicitly decided - this union is where they'd be added.
export type SectionType =
  | "hero"
  // RESTAURANT AND LOCAL-BUSINESS SECTIONS
  //
  // Everything below "hero" in the original list is SaaS-native: features, benefits,
  // pricing tiers, stats, FAQ. Rendered for a restaurant that produces a software product
  // page with food words in it, and no amount of reordering fixes it - a restaurant needs
  // a menu, and a menu was not expressible at all.
  //
  // Measured across the 20-business corpus after removing fabricated content, 12 of 20
  // collapsed to the identical hero > features > benefits > pricing > footer, including a
  // restaurant, a plumber and a barber. The problem was never the order. It was that the
  // vocabulary had no word for what those businesses actually show people.
  //
  // These are not a template keyed by industry: a section appears when the owner supplied
  // content for it and not otherwise, so a cafe that lists no dishes simply has no menu.
  | "menu"
  | "gallery"
  | "hours"
  // Ordering platforms the restaurant is already on. Not a feature - a row of links to
  // where the customer can already pay them. Appears only when at least one is filled in,
  // so a restaurant with no delivery has no empty section.
  | "orders"
  | "logoCloud"
  | "stats"
  | "features"
  | "benefits"
  | "testimonials"
  | "pricing"
  | "faq"
  | "cta"
  | "footer";

// How much visual weight LandingComposition gives this section - drives both variant
// selection (SectionPlanner.ts) and spacing (resolveSectionSpacing in styles/layout.ts).
export type SectionProminence = "primary" | "standard" | "compact";

// The vertical pacing around this section - "dense" sections sit close to their
// neighbors, "breather" sections get extra room, "standard" uses the theme's default.
export type SectionRhythm = "dense" | "standard" | "breather";

export interface Section {
  type: SectionType;
  variant: string;
  prominence: SectionProminence;
  rhythm: SectionRhythm;
}

export type HeroVariant =
  | "centered"
  | "split"
  | "minimal";

export type HeroImageStyle =
  | "dashboard"
  | "analytics"
  | "product"
  | "phone"
  | "website"
  | "abstract";

// One dish, as the owner wrote it. `price` is a free string on purpose: "12", "12,00 EUR"
// and "Market price" are all things a real menu says, and normalising it would mean
// inventing a currency or a figure the owner never gave.
export interface MenuItem {
  name: string;
  price: string;
  description: string;
}

export interface GalleryImage {
  url: string;
  alt: string;
  credit?: { name: string; url: string; source: string } | null;
}

// WHERE THE CUSTOMER CAN ALREADY PAY THEM
//
// The restaurant is on Uber Eats, Glovo or Bolt Food, or it is on none of them. This is not
// an integration and stores nothing: it is the set of links the owner pasted, rendered as
// buttons. `links` is built already filtered, so an empty array means the section does not
// exist rather than rendering a heading over nothing.
export interface OrderLinks {
  title: string;
  links: Array<{ label: string; url: string }>;
}

export interface OpeningHours {
  // Free text - one line per day, or a summary. Whatever the owner actually typed.
  schedule: string;
  address: string;
  phone: string;
  // Rendered as a plain link, never as an embedded map. A third-party map iframe on a
  // customer's published page loads that provider's trackers under the customer's own
  // domain, which is a consent problem the customer never agreed to and would be
  // answerable for.
  mapUrl?: string;

  // HOW A CUSTOMER ACTUALLY REACHES THIS RESTAURANT
  //
  // The only route used to be the phone, which is one channel and the one a person will not
  // use at 23:40 to ask whether there is a table on Saturday. Both of these are plain links
  // that work today with nothing configured - no mail server, no booking vendor, no keys.
  //
  // WhatsApp because that is where Portuguese restaurants already answer, and a message
  // costs the customer far less than a call. Kept separate from `phone` on purpose: the
  // landline in the dining room does not have WhatsApp, the owner's mobile does.
  whatsapp?: string;
  email?: string;
  // Where a restaurant already posts its food. A link, never an embed: an Instagram embed
  // loads Meta's trackers onto the customer's site, which app/privacidade promises it does
  // not do.
  instagram?: string;

  // The column headings. Carried on the content rather than hardcoded in the component,
  // because a restaurant in Porto shows its customers Portuguese words.
  labels?: {
    address: string;
    hours: string;
    phone: string;
    whatsapp: string;
    email: string;
    instagram: string;
    openInMaps: string;
    contactSubject: string;
    // A mensagem já escrita para o cliente, como a do botão do hero. Opcional porque os
    // sites publicados ANTES disto existir têm o snapshot congelado sem ela - e nesses o
    // link continua a abrir o WhatsApp sem texto, que é exactamente o que fazia ontem.
    // Passam a tê-la quando o dono voltar a publicar.
    whatsappMessage?: string;
  };

  // AS RESPOSTAS QUE DECIDEM ENTRE DOIS RESTAURANTES PARECIDOS
  //
  // Esplanada, estacionamento, cães, crianças, MB Way. Guardadas já escritas, na língua do
  // site, pela mesma razão que os `labels` acima: um retrato publicado tem de continuar a
  // desenhar-se sem depender de nada que o código faça a seguir.
  //
  // Só entra o que for verdade. A ausência não afirma nada - um restaurante sem esta lista
  // não está a dizer que não tem esplanada, está a não dizer nada, que é o que os sites
  // publicados antes disto existir continuam a fazer.
  amenities?: string[];
}

export interface HeroStat {
  value: string;
  label: string;
}

export interface StatsItem {
  value: string;
  label: string;
}

export interface HeroData {
  badge: string;

  title: string;

  highlightWord: string;

  subtitle: string;

  primaryCTA: string;

  secondaryCTA: string;

  imageStyle: HeroImageStyle;

  imagePrompt: string;

  // What this hero should SHOW, derived from the business itself - see
  // app/ai/builders/VisualIntelligence.ts. Optional because it postdates every page
  // already stored in the database and every published snapshot already frozen: a page
  // without it renders exactly as it did before this existed.
  visual?: VisualIntent;

  // The concrete picture resolved from `visual` at generation time. Stored on the page
  // (rather than resolved at render time) so a published site is self-contained and never
  // depends on a third-party API still answering - the same reason publishing
  // materializes a snapshot instead of replaying a log.
  image?: ResolvedImage | null;

  // Where the two calls to action actually go. Without these they render as dead controls -
  // see PrimaryButton. For a restaurant the primary is a tel: link, which on a phone turns
  // the booking into a single tap.
  primaryHref?: string;
  secondaryHref?: string;

  stats: HeroStat[];
}

export interface FeatureItem {
  title: string;
  description: string;
  icon: string;
}

export interface Testimonial {
  name: string;
  company: string;
  text: string;
}

export interface PricingPlan {
  name: string;
  price: string;
  features: string[];
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FooterData {
  company: string;
  email: string;
  copyright: string;
}

export interface SEOData {
  title: string;
  description: string;
  keywords: string[];
  ogTitle: string;
  ogDescription: string;
}

export interface BrandingData {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontHeading: string;
  fontBody: string;
  logoPrompt: string;
}

export interface ImageData {
  heroPrompt: string;
  ogImagePrompt: string;
}

export interface SiteData {
  seo: SEOData;
  branding: BrandingData;
  images: ImageData;
}

export interface LandingPage {
  dna: StrategyDNA;

  site: SiteData;

  sections: Section[];

  hero: HeroData;

  stats: StatsItem[];

  features: FeatureItem[];

  benefits: FeatureItem[];

  testimonials: Testimonial[];

  pricing: PricingPlan[];

  faq: FAQItem[];

  // Present only when the owner supplied them. Absent means the section is absent.
  menu?: MenuItem[];
  // The heading above the menu, in the site language. Without it the component falls back
  // to the English noun.
  menuTitle?: string;
  hoursTitle?: string;
  orders?: OrderLinks;
  gallery?: GalleryImage[];
  hours?: OpeningHours;

  footer: FooterData;
}