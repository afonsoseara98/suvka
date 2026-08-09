import type { SectionInstance, PageState, SectionContent } from "@/app/editor/pageState";
import type { OrderLinks } from "@/app/types/landing";
import { mergeDna, EMPTY_HERO } from "@/app/editor/pageState";
import type { Operation } from "@/app/editor/operations";
import type { ThemeConfig } from "@/app/styles/theme";
import { compileTheme } from "@/app/styles/theme";
import type { LayoutPersonality } from "@/app/styles/layout";
import { compileLayout } from "@/app/styles/layout";
import type { HeroData, StatsItem, FeatureItem, Testimonial, PricingPlan, FAQItem, FooterData, MenuItem, GalleryImage, OpeningHours } from "@/app/types/landing";

import Hero from "../Hero";
import Stats from "../Stats";
import Features from "../Features";
import Benefits from "../Benefits";
import Testimonials from "../Testimonials";
import Pricing from "../Pricing";
import FAQ from "../FAQ";
import Footer from "../Footer";
import CTABanner from "../CTABanner";
import LogoCloudSection from "../LogoCloudSection";
import Menu from "../Menu";
import Gallery from "../Gallery";
import Hours from "../Hours";
import Orders from "../Orders";

type Props = {
  instance: SectionInstance;
  page: PageState;
  theme: ThemeConfig;
  layout: LayoutPersonality;
  onDispatchOperation?: (operation: Operation) => void;
};

// Renders exactly one SectionInstance. `theme`/`layout` are the page-level compiled
// defaults (Landing.tsx computes them once); if this instance carries its own
// themeOverrides, they're recompiled here from the merged DNA instead - the one place
// per-section theming actually takes effect, everything below stays unaware DNA exists
// at all, same as before.
//
// `instance.variant` is now forwarded uniformly to every case that accepts one - "stats"
// and "faq" previously dropped it silently (both always rendered their default variant
// regardless of what SectionPlanner.ts chose), which meant the "inline"/"twoColumn"
// variants added by the Diversity Engine work never actually reached the page. Fixed as
// part of this rewrite, not carried forward.
export default function SectionRenderer({ instance, page, theme: pageTheme, layout: pageLayout, onDispatchOperation }: Props) {
  const hasOverride = Object.keys(instance.themeOverrides).length > 0;
  const effectiveDna = hasOverride ? mergeDna(page.dna, instance.themeOverrides) : page.dna;
  const theme = hasOverride ? compileTheme(effectiveDna) : pageTheme;
  const layout = hasOverride ? compileLayout(effectiveDna) : pageLayout;
  const { rhythm } = instance.layout;

  // Bound once per instance, here - the one place instance.id is in scope. Every
  // section component below receives this same bound closure as `onUpdateContent`,
  // never `instance.id` or `onDispatchOperation` directly.
  const onUpdateContent = onDispatchOperation
    ? (content: SectionContent) => onDispatchOperation({ kind: "UpdateContent", sectionId: instance.id, content })
    : undefined;

  const rendered = renderSection(instance, page, theme, layout, rhythm, onUpdateContent);

  // Read-only callers (app/benchmark/page.tsx, Landing.test.tsx) never pass
  // onDispatchOperation - no wrapper at all, so their DOM is byte-identical to before
  // this reordering toolbar existed.
  if (!onDispatchOperation) return rendered;

  const index = page.sections.findIndex((s) => s.id === instance.id);

  return (
    <div className="group relative">
      <div className="pointer-events-none absolute -top-3 right-4 z-10 flex gap-1 opacity-0 transition group-hover:opacity-100">
        <button
          type="button"
          disabled={index <= 0}
          onClick={() => onDispatchOperation({ kind: "MoveSection", sectionId: instance.id, toIndex: index - 1 })}
          className="pointer-events-auto rounded-full border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-300 shadow-lg transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Move section up"
        >
          ↑
        </button>
        <button
          type="button"
          disabled={index === -1 || index >= page.sections.length - 1}
          onClick={() => onDispatchOperation({ kind: "MoveSection", sectionId: instance.id, toIndex: index + 1 })}
          className="pointer-events-auto rounded-full border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-300 shadow-lg transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Move section down"
        >
          ↓
        </button>
      </div>
      {rendered}
    </div>
  );
}

// Every list-shaped section used to be handed to its component through a bare
// `instance.content as T[]` - a cast that asserts a shape rather than checking one. When
// the value underneath was not actually an array, the component destructured it
// (`const [lead, ...rest] = items`) and threw "items is not iterable" during server
// render, which on a PUBLISHED page is a 500 for every visitor to a paying customer's
// live site. The same class of defect already took down every save once, when the model
// omitted `site` and createProjectFromGeneration read `landing.site.branding`.
//
// The content of a stored page is not under this renderer's control: it is JSON written
// by a language model, possibly months ago, possibly by an older schema, and then frozen
// into a published snapshot. Treating it as untrusted input is the only honest option.
// A malformed section renders as empty; it never takes the page down with it.
function asList<T>(content: unknown, wrapperKey: string): T[] {
  if (Array.isArray(content)) return content as T[];

  // Tolerate the `{ items: [...] }` / `{ plans: [...] }` wrapper. It is the shape the
  // LandingPage type uses for these sections, so a page built from one without going
  // through fromLandingPage lands here rather than crashing.
  if (content && typeof content === "object") {
    const wrapped = (content as Record<string, unknown>)[wrapperKey];
    if (Array.isArray(wrapped)) return wrapped as T[];
  }

  return [];
}

// Section headings used to be hardcoded in the components: EVERY generated page, for
// every industry, carried the identical "Everything you need / Powerful features, built
// for conversions" and "Why choose us / Benefits that make the difference". Two pages for
// businesses with nothing in common - a family law firm and a dental clinic - shared their
// second- and third-largest headlines word for word. Found by putting all 20 outputs side
// by side, which is the only way it is visible; each page in isolation looks fine.
//
// One of those strings was also "Every landing page generated by Noctra is designed to
// maximize trust, engagement and conversion" - our own marketing copy, published on a
// paying customer's website.
//
// Headings are therefore content now, carried on the section like any other copy. Pages
// stored before this existed have none, and fall back to a plain noun ("Features") rather
// than to invented marketing language: a neutral heading is invisible, a confidently wrong
// one is the tell.
export interface SectionHeading {
  eyebrow?: string;
  title?: string;
  description?: string;
}

function readHeading(content: unknown): SectionHeading | undefined {
  if (!content || typeof content !== "object" || Array.isArray(content)) return undefined;

  const { eyebrow, title, description } = content as Record<string, unknown>;
  const heading: SectionHeading = {};
  if (typeof eyebrow === "string" && eyebrow.trim()) heading.eyebrow = eyebrow.trim();
  if (typeof title === "string" && title.trim()) heading.title = title.trim();
  if (typeof description === "string" && description.trim()) heading.description = description.trim();

  return Object.keys(heading).length > 0 ? heading : undefined;
}

function renderSection(
  instance: SectionInstance,
  page: PageState,
  theme: ThemeConfig,
  layout: LayoutPersonality,
  rhythm: SectionInstance["layout"]["rhythm"],
  onUpdateContent: ((content: SectionContent) => void) | undefined
) {
  switch (instance.type) {
    case "hero":
      return (
        <Hero
          data={instance.content as HeroData}
          theme={theme}
          layout={layout}
          variant={instance.variant}
          onUpdateContent={onUpdateContent}
        />
      );

    // The sections a local business actually has. Each returns null when the owner gave no
    // content for it, so an empty menu is an absent menu rather than a heading over a gap.
    case "menu":
      return (
        <Menu
          items={asList<MenuItem>(instance.content, "items")}
          heading={readHeading(instance.content)}
          theme={theme}
          layout={layout}
          rhythm={rhythm}
          variant={instance.variant}
          onUpdateContent={onUpdateContent as ((content: MenuItem[]) => void) | undefined}
        />
      );

    case "gallery":
      return (
        <Gallery
          items={asList<GalleryImage>(instance.content, "items")}
          heading={readHeading(instance.content)}
          theme={theme}
          layout={layout}
          rhythm={rhythm}
          variant={instance.variant}
        />
      );

    case "hours":
      return (
        <Hours
          data={(instance.content ?? { schedule: "", address: "", phone: "" }) as OpeningHours}
          heading={readHeading(instance.content)}
          theme={theme}
          layout={layout}
          rhythm={rhythm}
          variant={instance.variant}
          onUpdateContent={onUpdateContent as ((content: OpeningHours) => void) | undefined}
        />
      );

    case "orders":
      return (
        <Orders
          data={instance.content as unknown as OrderLinks}
          theme={theme}
          layout={layout}
          rhythm={rhythm}
        />
      );

    case "logoCloud":
      return <LogoCloudSection theme={theme} layout={layout} rhythm={rhythm} />;

    case "stats":
      return (
        <Stats
          items={asList<StatsItem>(instance.content, "items")}
          theme={theme}
          layout={layout}
          rhythm={rhythm}
          variant={instance.variant}
          onUpdateContent={onUpdateContent}
        />
      );

    case "features":
      return (
        <Features
          items={asList<FeatureItem>(instance.content, "items")}
          heading={readHeading(instance.content)}
          theme={theme}
          layout={layout}
          rhythm={rhythm}
          variant={instance.variant}
          onUpdateContent={onUpdateContent}
        />
      );

    case "benefits":
      return (
        <Benefits
          items={asList<FeatureItem>(instance.content, "items")}
          heading={readHeading(instance.content)}
          theme={theme}
          layout={layout}
          rhythm={rhythm}
          variant={instance.variant}
          onUpdateContent={onUpdateContent}
        />
      );

    case "testimonials":
      return (
        <Testimonials
          items={asList<Testimonial>(instance.content, "items")}
          heading={readHeading(instance.content)}
          theme={theme}
          layout={layout}
          rhythm={rhythm}
          variant={instance.variant}
          onUpdateContent={onUpdateContent}
        />
      );

    case "pricing":
      return (
        <Pricing
          plans={asList<PricingPlan>(instance.content, "plans")}
          heading={readHeading(instance.content)}
          theme={theme}
          layout={layout}
          rhythm={rhythm}
          variant={instance.variant}
          onUpdateContent={onUpdateContent}
        />
      );

    case "faq":
      return (
        <FAQ
          items={asList<FAQItem>(instance.content, "items")}
          heading={readHeading(instance.content)}
          theme={theme}
          layout={layout}
          rhythm={rhythm}
          variant={instance.variant}
          onUpdateContent={onUpdateContent}
        />
      );

    case "cta": {
      // The one documented exception to "every SectionInstance is fully self-contained":
      // CTABanner reuses the page's hero primaryCTA/secondaryCTA rather than asking for
      // its own copy, matching today's component exactly (see CTABanner.tsx).
      const heroInstance = page.sections.find((s) => s.type === "hero");
      const heroContent = (heroInstance?.content as HeroData | undefined) ?? EMPTY_HERO;
      return <CTABanner hero={heroContent} theme={theme} layout={layout} rhythm={rhythm} />;
    }

    case "footer": {
      const footer = instance.content as FooterData;
      return (
        <Footer
          company={footer.company}
          email={footer.email}
          copyright={footer.copyright}
          theme={theme}
          layout={layout}
          rhythm={rhythm}
          onUpdateContent={onUpdateContent}
        />
      );
    }

    default:
      return null;
  }
}
