import { notFound } from "next/navigation";

import Landing from "@/app/components/Landing";
import { fromLandingPage } from "@/app/editor/pageState";
import { buildPipeline } from "@/app/ai/builders/PipelineBuilder";
import { deriveVisualIntent } from "@/app/ai/builders/VisualIntelligence";
import { createImageProvider, resolveImageSafely } from "@/app/lib/images";
import type { LandingPage } from "@/app/types/landing";

// The restaurant architecture, rendered from structured input - development only.
//
// Everything here comes from fields an owner would fill in, and nothing is invented: no
// statistics, no reviews from people who do not exist, no FAQ nobody asked. The page is
// hero > gallery > menu > hours > footer, which is what a restaurant site is, instead of
// hero > features > benefits > pricing > footer, which is what a software product is.
export const dynamic = "force-dynamic";

// What the 9-field form collects. Free text remains supported in parallel; this is the
// second entry point into the same internal representation, not a replacement for it.
const INPUT = {
  name: "Taberna do Bairro",
  cuisine: "Portuguese",
  address: "Rua das Flores 112, 4050-262 Porto",
  phone: "+351 220 145 880",
  schedule: "Tuesday to Sunday, 12:00–15:00 and 19:00–22:30\nClosed Mondays",
  dishes: [
    { name: "Bacalhau à Braga", price: "18,50 €", description: "Salt cod confit in olive oil, sweet onion, crisp potato." },
    { name: "Arroz de Pato", price: "16,00 €", description: "Duck rice baked with chouriço and orange zest." },
    { name: "Leite Creme Queimado", price: "5,50 €", description: "Burnt custard, torched to order." },
  ],
  description: "A small dining room off Rua das Flores, cooking what the market gives us that week.",
};

const GALLERY_QUERIES = [
  "portuguese seafood dish restaurant",
  "restaurant dining room warm evening",
  "chef plating food kitchen",
  "dessert plated close up",
];

export default async function RestaurantPreview() {
  if (process.env.NODE_ENV === "production") notFound();

  const pipeline = buildPipeline(
    `${INPUT.name}, a ${INPUT.cuisine} restaurant in Porto. ${INPUT.description}`
  );
  const visual = deriveVisualIntent(pipeline.businessProfile, pipeline.businessIntelligence, pipeline.dna);
  const provider = createImageProvider();

  const hero = await resolveImageSafely(provider, visual);
  const gallery = (
    await Promise.all(
      GALLERY_QUERIES.map((subject, index) =>
        resolveImageSafely(provider, {
          ...visual,
          subject,
          alternateSubjects: ["restaurant food"],
          alt: subject,
          orientation: "landscape",
          variantSeed: visual.variantSeed + index * 97,
        })
      )
    )
  ).filter((image): image is NonNullable<typeof image> => image !== null);

  const landing = {
    dna: pipeline.dna,
    site: {
      seo: {
        title: `${INPUT.name} — ${INPUT.cuisine} in Porto`,
        description: INPUT.description,
        keywords: [],
        ogTitle: INPUT.name,
        ogDescription: INPUT.description,
      },
      branding: { primaryColor: "", secondaryColor: "", accentColor: "", fontHeading: "", fontBody: "", logoPrompt: "" },
      images: { heroPrompt: "", ogImagePrompt: "" },
    },
    // The architecture. No features, no benefits, no pricing tiers, no stats, no
    // testimonials, no FAQ - none of which a restaurant has.
    sections: [
      { type: "hero", variant: "centered", prominence: "primary", rhythm: "standard" },
      { type: "gallery", variant: "masonry", prominence: "primary", rhythm: "standard" },
      { type: "menu", variant: "list", prominence: "primary", rhythm: "breather" },
      { type: "hours", variant: "columns", prominence: "standard", rhythm: "standard" },
      { type: "footer", variant: "simple", prominence: "compact", rhythm: "standard" },
    ],
    hero: {
      badge: INPUT.cuisine,
      title: `${INPUT.name}`,
      highlightWord: "Bairro",
      subtitle: INPUT.description,
      primaryCTA: "Reservar mesa",
      secondaryCTA: "Ver ementa",
      imageStyle: visual.scene,
      imagePrompt: "",
      visual,
      image: hero,
      stats: [],
    },
    stats: [],
    features: [],
    benefits: [],
    testimonials: [],
    pricing: [],
    faq: [],
    menu: INPUT.dishes,
    gallery: gallery.map((image) => ({ url: image.url, alt: image.alt, credit: image.credit })),
    hours: { schedule: INPUT.schedule, address: INPUT.address, phone: INPUT.phone },
    footer: { company: INPUT.name, email: "reservas@tabernadobairro.pt", copyright: "© 2026" },
  } as unknown as LandingPage;

  return <Landing state={fromLandingPage(landing)} />;
}
