import type {
  LandingPage,
  Section,
} from "@/app/types/landing";
import type { ThemeConfig } from "@/app/styles/theme";
import type { LayoutPersonality } from "@/app/styles/layout";

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
  section: Section;
  landing: LandingPage;
  theme: ThemeConfig;
  layout: LayoutPersonality;
};

export default function SectionRenderer({
  section,
  landing,
  theme,
  layout,
}: Props) {
  switch (section.type) {
    case "hero":
      return (
        <Hero
          data={landing.hero}
          theme={theme}
          layout={layout}
          variant={section.variant}
        />
      );

    case "logoCloud":
      return <LogoCloudSection theme={theme} layout={layout} rhythm={section.rhythm} />;

    case "stats":
      return <Stats items={landing.stats} theme={theme} layout={layout} rhythm={section.rhythm} />;

    case "features":
      return (
        <Features
          items={landing.features}
          theme={theme}
          layout={layout}
          rhythm={section.rhythm}
          variant={section.variant}
        />
      );

    case "benefits":
      return (
        <Benefits
          items={landing.benefits}
          theme={theme}
          layout={layout}
          rhythm={section.rhythm}
          variant={section.variant}
        />
      );

    case "testimonials":
      return (
        <Testimonials
          items={landing.testimonials}
          theme={theme}
          layout={layout}
          rhythm={section.rhythm}
          variant={section.variant}
        />
      );

    case "pricing":
      return (
        <Pricing
          plans={landing.pricing}
          theme={theme}
          layout={layout}
          rhythm={section.rhythm}
          variant={section.variant}
        />
      );

    case "faq":
      return <FAQ items={landing.faq} theme={theme} layout={layout} rhythm={section.rhythm} />;

    case "cta":
      return <CTABanner hero={landing.hero} theme={theme} layout={layout} rhythm={section.rhythm} />;

    case "footer":
      return (
        <Footer
          company={landing.footer.company}
          email={landing.footer.email}
          copyright={landing.footer.copyright}
          theme={theme}
          layout={layout}
          rhythm={section.rhythm}
        />
      );

    default:
      return null;
  }
}
