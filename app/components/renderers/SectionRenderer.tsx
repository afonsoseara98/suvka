import type { SectionInstance, PageState } from "@/app/editor/pageState";
import { mergeDna, EMPTY_HERO } from "@/app/editor/pageState";
import type { ThemeConfig } from "@/app/styles/theme";
import { compileTheme } from "@/app/styles/theme";
import type { LayoutPersonality } from "@/app/styles/layout";
import { compileLayout } from "@/app/styles/layout";
import type { HeroData, StatsItem, FeatureItem, Testimonial, PricingPlan, FAQItem, FooterData } from "@/app/types/landing";

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

type Props = {
  instance: SectionInstance;
  page: PageState;
  theme: ThemeConfig;
  layout: LayoutPersonality;
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
export default function SectionRenderer({ instance, page, theme: pageTheme, layout: pageLayout }: Props) {
  const hasOverride = Object.keys(instance.themeOverrides).length > 0;
  const effectiveDna = hasOverride ? mergeDna(page.dna, instance.themeOverrides) : page.dna;
  const theme = hasOverride ? compileTheme(effectiveDna) : pageTheme;
  const layout = hasOverride ? compileLayout(effectiveDna) : pageLayout;
  const { rhythm } = instance.layout;

  switch (instance.type) {
    case "hero":
      return <Hero data={instance.content as HeroData} theme={theme} layout={layout} variant={instance.variant} />;

    case "logoCloud":
      return <LogoCloudSection theme={theme} layout={layout} rhythm={rhythm} />;

    case "stats":
      return (
        <Stats
          items={instance.content as StatsItem[]}
          theme={theme}
          layout={layout}
          rhythm={rhythm}
          variant={instance.variant}
        />
      );

    case "features":
      return (
        <Features
          items={instance.content as FeatureItem[]}
          theme={theme}
          layout={layout}
          rhythm={rhythm}
          variant={instance.variant}
        />
      );

    case "benefits":
      return (
        <Benefits
          items={instance.content as FeatureItem[]}
          theme={theme}
          layout={layout}
          rhythm={rhythm}
          variant={instance.variant}
        />
      );

    case "testimonials":
      return (
        <Testimonials
          items={instance.content as Testimonial[]}
          theme={theme}
          layout={layout}
          rhythm={rhythm}
          variant={instance.variant}
        />
      );

    case "pricing":
      return (
        <Pricing
          plans={instance.content as PricingPlan[]}
          theme={theme}
          layout={layout}
          rhythm={rhythm}
          variant={instance.variant}
        />
      );

    case "faq":
      return (
        <FAQ items={instance.content as FAQItem[]} theme={theme} layout={layout} rhythm={rhythm} variant={instance.variant} />
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
        />
      );
    }

    default:
      return null;
  }
}
