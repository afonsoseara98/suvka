import type { DesignSystem } from "./design";

export type Theme =
  | "startup"
  | "luxury"
  | "agency"
  | "medical"
  | "restaurant"
  | "fitness";

export type SectionType =
  | "hero"
  | "stats"
  | "features"
  | "benefits"
  | "testimonials"
  | "pricing"
  | "faq"
  | "footer";

export interface Section {
  type: SectionType;
  variant: string;
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
  theme: Theme;

  design: DesignSystem;

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