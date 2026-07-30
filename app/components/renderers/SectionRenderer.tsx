import type {
  LandingPage,
  Section,
} from "@/app/types/landing";

import Hero from "../Hero";
import Stats from "../Stats";
import Features from "../Features";
import Benefits from "../Benefits";
import Testimonials from "../Testimonials";
import Pricing from "../Pricing";
import FAQ from "../FAQ";
import Footer from "../Footer";

type Props = {
  section: Section;
  landing: LandingPage;
};

export default function SectionRenderer({
  section,
  landing,
}: Props) {
  switch (section.type) {
    case "hero":
      return (
        <Hero
          data={landing.hero}
        />
      );

    case "stats":
      return <Stats items={landing.stats} />;

    case "features":
      return <Features items={landing.features} />;

    case "benefits":
      return <Benefits items={landing.benefits} />;

    case "testimonials":
      return <Testimonials items={landing.testimonials} />;

    case "pricing":
      return <Pricing plans={landing.pricing} />;

    case "faq":
      return <FAQ items={landing.faq} />;

    case "footer":
      return (
        <Footer
          company={landing.footer.company}
          email={landing.footer.email}
          copyright={landing.footer.copyright}
        />
      );

    default:
      return null;
  }
}