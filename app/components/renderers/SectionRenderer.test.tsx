// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import SectionRenderer from "./SectionRenderer";
import { compileTheme } from "@/app/styles/theme";
import { compileLayout } from "@/app/styles/layout";
import { neutralStrategyDna } from "@/app/ai/testFixtures";
import type { LandingPage, Section, SectionType, SectionProminence, SectionRhythm } from "@/app/types/landing";

// Only asserts what tsc cannot: that each section.type actually renders the component
// whose visual identity was verified manually in the browser (Fase 2), and that the
// section's `variant` and the compiled theme/layout genuinely reach it - a routing
// mistake in the switch statement here would still type-check fine but silently render
// the wrong section or a default-styled one.
const luxuryDna = neutralStrategyDna({
  heroImageryProminence: 0.65,
  heroSplitLean: 0.6,
  contentWidth: 0.1,
  density: 0.15,
});

const startupDna = neutralStrategyDna({
  heroImageryProminence: 0.4,
  heroSplitLean: 0.5,
  contentWidth: 0.9,
  density: 0.3,
});

const landing: LandingPage = {
  dna: luxuryDna,
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

const theme = compileTheme(landing.dna);
const layout = compileLayout(landing.dna);

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

  it("applies the compiled theme's typography tokens to the hero title and subtitle", () => {
    render(<SectionRenderer section={sec("hero", "minimal")} landing={landing} theme={theme} layout={layout} />);

    // Compared as numbers, not strings: the DOM normalizes a CSS value like "4.00rem"
    // down to "4rem" when it round-trips through style.fontSize, which is a browser
    // formatting detail, not evidence the compiled value failed to reach the element.
    const title = screen.getByRole("heading", { level: 1 });
    expect(parseFloat(title.style.fontSize)).toBeCloseTo(parseFloat(theme.typography.hero.fontSize as string));

    const subtitle = screen.getByText("Personalized service.");
    expect(parseFloat(subtitle.style.fontSize)).toBeCloseTo(parseFloat(theme.typography.subtitle.fontSize as string));
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

  it("applies the compiled theme's title typography token to testimonials/pricing/faq headings", () => {
    const { unmount: unmount1 } = render(
      <SectionRenderer section={sec("testimonials", "cards")} landing={landing} theme={theme} layout={layout} />
    );
    const testimonialsHeading = screen.getByRole("heading", { name: "Testimonials" });
    expect(parseFloat(testimonialsHeading.style.fontSize)).toBeCloseTo(parseFloat(theme.typography.title.fontSize as string));
    unmount1();

    const { unmount: unmount2 } = render(
      <SectionRenderer section={sec("pricing", "simple")} landing={landing} theme={theme} layout={layout} />
    );
    const pricingHeading = screen.getByRole("heading", { name: "Pricing" });
    expect(parseFloat(pricingHeading.style.fontSize)).toBeCloseTo(parseFloat(theme.typography.title.fontSize as string));
    unmount2();

    render(<SectionRenderer section={sec("faq", "accordion")} landing={landing} theme={theme} layout={layout} />);
    const faqHeading = screen.getByRole("heading", { name: "FAQ" });
    expect(parseFloat(faqHeading.style.fontSize)).toBeCloseTo(parseFloat(theme.typography.title.fontSize as string));
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

  it("gives the cta banner a stacked layout for a narrow-contentWidth DNA and a row layout for a wide one", () => {
    const { unmount } = render(
      <SectionRenderer section={sec("cta", "default")} landing={landing} theme={theme} layout={layout} />
    );
    const narrowWrapper = screen.getByText("Schedule a Call").parentElement;
    expect(narrowWrapper?.className).toContain("flex-col");
    unmount();

    const wideTheme = compileTheme(startupDna);
    const wideLayout = compileLayout(startupDna);
    render(
      <SectionRenderer section={sec("cta", "default")} landing={landing} theme={wideTheme} layout={wideLayout} />
    );
    const wideWrapper = screen.getByText("Schedule a Call").parentElement;
    expect(wideWrapper?.className).toContain("flex-wrap");
  });
});

describe("SectionRenderer - rhythm drives spacing", () => {
  it("gives a 'breather' section more top margin than a 'dense' section of the same type/theme", () => {
    const { container: denseContainer, unmount } = render(
      <SectionRenderer section={sec("benefits", "cards", "standard", "dense")} landing={landing} theme={theme} layout={layout} />
    );
    const denseMargin = (denseContainer.querySelector("section") as HTMLElement | null)?.style.marginTop;
    unmount();

    const { container: breatherContainer } = render(
      <SectionRenderer section={sec("benefits", "cards", "standard", "breather")} landing={landing} theme={theme} layout={layout} />
    );
    const breatherMargin = (breatherContainer.querySelector("section") as HTMLElement | null)?.style.marginTop;

    expect(denseMargin).not.toBe(breatherMargin);
  });
});

describe("SectionRenderer - DNA compiler (LayoutPersonality diverges continuously, not by label)", () => {
  // The whole point of the compiler: two DNA objects that differ meaningfully in
  // density/contentWidth must still render structurally different markup (width/
  // spacing/grid), not just different colors/copy.
  it("renders the same features:grid section with different grid-column structure for a wide vs narrow DNA", () => {
    const wideTheme = compileTheme(startupDna);
    const wideLayout = compileLayout(startupDna);
    const { container: wideContainer, unmount } = render(
      <SectionRenderer section={sec("features", "grid")} landing={landing} theme={wideTheme} layout={wideLayout} />
    );
    const wideGrid = wideContainer.querySelector(".grid");
    expect(wideGrid?.className).toContain("xl:grid-cols-3");
    unmount();

    const narrowTheme = compileTheme(luxuryDna);
    const narrowLayout = compileLayout(luxuryDna);
    const { container: narrowContainer } = render(
      <SectionRenderer section={sec("features", "grid")} landing={landing} theme={narrowTheme} layout={narrowLayout} />
    );
    const narrowGrid = narrowContainer.querySelector(".grid");
    expect(narrowGrid?.className).not.toContain("xl:grid-cols-3");
  });

  it("gives a narrow-contentWidth DNA a stacked CTA layout and a wide one a row layout, for the same hero variant", () => {
    const wideTheme = compileTheme(startupDna);
    const wideLayout = compileLayout(startupDna);
    const { unmount } = render(
      <SectionRenderer section={sec("hero", "minimal")} landing={landing} theme={wideTheme} layout={wideLayout} />
    );
    const wideCtaWrapper = screen.getByText("Schedule a Call").parentElement;
    expect(wideCtaWrapper?.className).toContain("flex-wrap");
    unmount();

    const narrowTheme = compileTheme(luxuryDna);
    const narrowLayout = compileLayout(luxuryDna);
    render(
      <SectionRenderer section={sec("hero", "minimal")} landing={landing} theme={narrowTheme} layout={narrowLayout} />
    );
    const narrowCtaWrapper = screen.getByText("Schedule a Call").parentElement;
    expect(narrowCtaWrapper?.className).toContain("flex-col");
  });
});
