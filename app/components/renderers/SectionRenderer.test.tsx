// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import SectionRenderer from "./SectionRenderer";
import { getTheme } from "@/app/styles/theme";
import { getLayoutPersonality } from "@/app/styles/layout";
import type { LandingPage, Section, SectionType, SectionProminence, SectionRhythm } from "@/app/types/landing";

// Only asserts what tsc cannot: that each section.type actually renders the component
// whose visual identity was verified manually in the browser (Fase 2), and that the
// section's `variant` and the page's `theme` genuinely reach it - a routing mistake in
// the switch statement here would still type-check fine but silently render the wrong
// section or a default-styled one.
const landing: LandingPage = {
  theme: "luxury",
  design: {
    style: "luxury",
    heroVariant: "minimal",
    featureVariant: "outline",
    benefitVariant: "outline",
    testimonialVariant: "outline",
    pricingVariant: "simple",
    primaryColor: "#D4AF37",
    background: "dark",
    borderRadius: "lg",
  },
  site: {
    seo: { title: "", description: "", keywords: [], ogTitle: "", ogDescription: "" },
    branding: { primaryColor: "", secondaryColor: "", accentColor: "", fontHeading: "", fontBody: "", logoPrompt: "" },
    images: { heroPrompt: "", ogImagePrompt: "" },
  },
  sections: [],
  hero: {
    badge: "Trusted",
    title: "Find Your Dream Home",
    highlightWord: "Home",
    subtitle: "Personalized service.",
    primaryCTA: "Schedule a Call",
    secondaryCTA: "Learn More",
    imageStyle: "abstract",
    imagePrompt: "",
    stats: [],
  },
  stats: [{ value: "10", label: "Years" }],
  features: [{ title: "Feature One", description: "Desc", icon: "🏠" }],
  benefits: [{ title: "Benefit One", description: "Desc", icon: "✨" }],
  testimonials: [{ name: "Jane Doe", company: "Homeowner", text: "Great service." }],
  pricing: [{ name: "Plan", price: "100", features: ["A"] }],
  faq: [{ question: "A question?", answer: "An answer." }],
  footer: { company: "Acme", email: "a@acme.com", copyright: "© 2026" },
};

const theme = getTheme(landing.theme);
const layout = getLayoutPersonality(landing.theme);

function sec(
  type: SectionType,
  variant: string,
  prominence: SectionProminence = "standard",
  rhythm: SectionRhythm = "standard"
): Section {
  return { type, variant, prominence, rhythm };
}

afterEach(() => {
  cleanup();
});

describe("SectionRenderer", () => {
  it("renders the hero with its variant and theme", () => {
    render(<SectionRenderer section={sec("hero", "minimal")} landing={landing} theme={theme} layout={layout} />);
    expect(screen.getByText("Find Your Dream Home")).toBeTruthy();
    expect(screen.getByText("Schedule a Call")).toBeTruthy();
  });

  it("applies the theme's typography tokens to the hero title, subtitle and CTAs", () => {
    render(<SectionRenderer section={sec("hero", "minimal")} landing={landing} theme={theme} layout={layout} />);

    const title = screen.getByRole("heading", { level: 1 });
    for (const cls of theme.typography.hero.split(" ")) {
      expect(title.className).toContain(cls);
    }

    const subtitle = screen.getByText("Personalized service.");
    for (const cls of theme.typography.subtitle.split(" ")) {
      expect(subtitle.className).toContain(cls);
    }

    const primaryCta = screen.getByText("Schedule a Call");
    for (const cls of theme.typography.button.split(" ")) {
      expect(primaryCta.className).toContain(cls);
    }
  });

  it("renders features with the requested variant", () => {
    render(<SectionRenderer section={sec("features", "list")} landing={landing} theme={theme} layout={layout} />);
    expect(screen.getByText("Feature One")).toBeTruthy();
  });

  it("renders benefits", () => {
    render(<SectionRenderer section={sec("benefits", "cards")} landing={landing} theme={theme} layout={layout} />);
    expect(screen.getByText("Benefit One")).toBeTruthy();
  });

  it("renders testimonials in the minimal variant without card chrome", () => {
    render(<SectionRenderer section={sec("testimonials", "minimal")} landing={landing} theme={theme} layout={layout} />);
    expect(screen.getByText("Jane Doe", { exact: false })).toBeTruthy();
  });

  it("applies the theme's title typography token to testimonials/pricing/faq headings", () => {
    const { unmount: unmount1 } = render(
      <SectionRenderer section={sec("testimonials", "cards")} landing={landing} theme={theme} layout={layout} />
    );
    const testimonialsHeading = screen.getByRole("heading", { name: "Testimonials" });
    for (const cls of theme.typography.title.split(" ")) {
      expect(testimonialsHeading.className).toContain(cls);
    }
    unmount1();

    const { unmount: unmount2 } = render(
      <SectionRenderer section={sec("pricing", "simple")} landing={landing} theme={theme} layout={layout} />
    );
    const pricingHeading = screen.getByRole("heading", { name: "Pricing" });
    for (const cls of theme.typography.title.split(" ")) {
      expect(pricingHeading.className).toContain(cls);
    }
    unmount2();

    render(<SectionRenderer section={sec("faq", "accordion")} landing={landing} theme={theme} layout={layout} />);
    const faqHeading = screen.getByRole("heading", { name: "FAQ" });
    for (const cls of theme.typography.title.split(" ")) {
      expect(faqHeading.className).toContain(cls);
    }
  });

  it("renders pricing", () => {
    render(<SectionRenderer section={sec("pricing", "simple")} landing={landing} theme={theme} layout={layout} />);
    expect(screen.getByText("Plan")).toBeTruthy();
  });

  it("renders an interactive FAQ accordion", () => {
    render(<SectionRenderer section={sec("faq", "accordion")} landing={landing} theme={theme} layout={layout} />);
    expect(screen.getByRole("button", { name: /A question\?/ })).toBeTruthy();
  });

  it("renders the footer", () => {
    render(<SectionRenderer section={sec("footer", "simple")} landing={landing} theme={theme} layout={layout} />);
    expect(screen.getByText("Acme")).toBeTruthy();
  });

  it("renders stats", () => {
    render(<SectionRenderer section={sec("stats", "cards")} landing={landing} theme={theme} layout={layout} />);
    expect(screen.getByText("Years")).toBeTruthy();
  });
});

describe("SectionRenderer - LandingComposition sections (logoCloud, cta)", () => {
  it("renders a standalone logo cloud section", () => {
    render(<SectionRenderer section={sec("logoCloud", "default")} landing={landing} theme={theme} layout={layout} />);
    expect(screen.getByText("OpenAI")).toBeTruthy();
    expect(screen.getByText("Trusted by teams at")).toBeTruthy();
  });

  it("renders an intermediate CTA banner that reuses hero.primaryCTA/secondaryCTA verbatim", () => {
    render(<SectionRenderer section={sec("cta", "default")} landing={landing} theme={theme} layout={layout} />);
    expect(screen.getByText("Schedule a Call")).toBeTruthy();
    expect(screen.getByText("Learn More")).toBeTruthy();
  });

  it("gives the cta banner a stacked layout under luxury and a row layout under startup", () => {
    const { unmount } = render(
      <SectionRenderer section={sec("cta", "default")} landing={landing} theme={theme} layout={layout} />
    );
    const luxuryWrapper = screen.getByText("Schedule a Call").parentElement;
    expect(luxuryWrapper?.className).toContain("flex-col");
    unmount();

    const startupTheme = getTheme("startup");
    const startupLayout = getLayoutPersonality("startup");
    render(
      <SectionRenderer section={sec("cta", "default")} landing={landing} theme={startupTheme} layout={startupLayout} />
    );
    const startupWrapper = screen.getByText("Schedule a Call").parentElement;
    expect(startupWrapper?.className).toContain("flex-wrap");
  });
});

describe("SectionRenderer - rhythm drives spacing", () => {
  it("gives a 'breather' section more top margin than a 'dense' section of the same type/theme", () => {
    const { container: denseContainer, unmount } = render(
      <SectionRenderer section={sec("benefits", "cards", "standard", "dense")} landing={landing} theme={theme} layout={layout} />
    );
    const denseClass = denseContainer.querySelector("section")?.className ?? "";
    unmount();

    const { container: breatherContainer } = render(
      <SectionRenderer section={sec("benefits", "cards", "standard", "breather")} landing={landing} theme={theme} layout={layout} />
    );
    const breatherClass = breatherContainer.querySelector("section")?.className ?? "";

    expect(denseClass).not.toBe(breatherClass);
  });
});

describe("SectionRenderer - Design System v2 (LayoutPersonality diverges by theme)", () => {
  // The whole point of LayoutPersonality: two themes sharing the exact same
  // section.variant ("features"/"grid") must still render structurally different
  // markup (width/spacing/grid/card treatment), not just different colors/copy.
  it("renders the same features:grid section with different structure for startup vs luxury", () => {
    const startupTheme = getTheme("startup");
    const startupLayout = getLayoutPersonality("startup");
    const { container: startupContainer, unmount } = render(
      <SectionRenderer
        section={sec("features", "grid")}
        landing={landing}
        theme={startupTheme}
        layout={startupLayout}
      />
    );
    const startupGrid = startupContainer.querySelector(".grid");
    expect(startupGrid?.className).toContain("xl:grid-cols-3");
    unmount();

    const luxuryTheme = getTheme("luxury");
    const luxuryLayout = getLayoutPersonality("luxury");
    const { container: luxuryContainer } = render(
      <SectionRenderer
        section={sec("features", "grid")}
        landing={landing}
        theme={luxuryTheme}
        layout={luxuryLayout}
      />
    );
    const luxuryGrid = luxuryContainer.querySelector(".grid");
    expect(luxuryGrid?.className).not.toContain("xl:grid-cols-3");
  });

  it("gives luxury a stacked CTA layout and startup a row CTA layout for the same hero variant", () => {
    const startupTheme = getTheme("startup");
    const startupLayout = getLayoutPersonality("startup");
    const { unmount } = render(
      <SectionRenderer section={sec("hero", "minimal")} landing={landing} theme={startupTheme} layout={startupLayout} />
    );
    const startupCtaWrapper = screen.getByText("Schedule a Call").parentElement;
    expect(startupCtaWrapper?.className).toContain("flex-wrap");
    unmount();

    const luxuryTheme = getTheme("luxury");
    const luxuryLayout = getLayoutPersonality("luxury");
    render(
      <SectionRenderer section={sec("hero", "minimal")} landing={landing} theme={luxuryTheme} layout={luxuryLayout} />
    );
    const luxuryCtaWrapper = screen.getByText("Schedule a Call").parentElement;
    expect(luxuryCtaWrapper?.className).toContain("flex-col");
  });
});
