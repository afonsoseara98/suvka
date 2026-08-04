import type { StrategyDNA } from "../ai/types/dna";

// "logoCloud" and "cta" are rendered entirely from data the pipeline already produces
// (LogoCloud's content is static placeholder logos; CTABanner reuses hero.primaryCTA/
// secondaryCTA) - deliberately so LandingComposition can place them without any change
// to schema.ts or the copy the LLM generates. New roles that DO need their own
// generated copy (gallery, story, doctors, ...) are a schema change and out of scope
// until that's explicitly decided - this union is where they'd be added.
export type SectionType =
  | "hero"
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

  footer: FooterData;
}