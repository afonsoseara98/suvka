// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import SectionRenderer from "./SectionRenderer";
import { compileTheme } from "@/app/styles/theme";
import { compileLayout } from "@/app/styles/layout";
import { neutralStrategyDna } from "@/app/ai/testFixtures";
import type { PageState, SectionInstance, SectionContent } from "@/app/editor/pageState";
import type { StrategyDNA } from "@/app/ai/types/dna";
import type { SectionType, SectionProminence, SectionRhythm } from "@/app/types/landing";

// Only asserts what tsc cannot: that each instance.type actually renders the component
// whose visual identity was verified manually in the browser (Fase 2), that
// instance.variant genuinely reaches it (a routing mistake here would still type-check
// fine but silently render the wrong section or a default-styled one - see the
// stats/faq dropped-variant bug this rewrite fixed), and that per-instance
// themeOverrides genuinely recompile theme/layout for just that section.
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

const HERO_CONTENT = {
  badge: "Trusted",
  title: "Find Your Dream Home",
  highlightWord: "Home",
  subtitle: "Personalized service.",
  primaryCTA: "Schedule a Call",
  secondaryCTA: "Learn More",
  imageStyle: "abstract" as const,
  imagePrompt: "",
  stats: [],
};

const CONTENT_BY_TYPE: Record<SectionType, SectionContent> = {
  hero: HERO_CONTENT,
  logoCloud: null,
  stats: [{ value: "10", label: "Years" }],
  features: [{ title: "Feature One", description: "Desc", icon: "🏠" }],
  benefits: [{ title: "Benefit One", description: "Desc", icon: "✨" }],
  testimonials: [{ name: "Jane Doe", company: "Homeowner", text: "Great service." }],
  pricing: [{ name: "Plan", price: "100", features: ["A"] }],
  faq: [{ question: "A question?", answer: "An answer." }],
  cta: null,
  footer: { company: "Acme", email: "a@acme.com", copyright: "© 2026" },
};

function pageOf(dna: StrategyDNA): PageState {
  const sections: SectionInstance[] = (Object.keys(CONTENT_BY_TYPE) as SectionType[]).map((type) => ({
    id: `${type}-fixture`,
    type,
    variant: "default",
    content: CONTENT_BY_TYPE[type],
    layout: { prominence: "standard", rhythm: "standard" },
    themeOverrides: {},
    visibility: "visible",
    locked: false,
    metadata: { createdBy: "template", createdAt: 0, updatedAt: 0 },
    version: 0,
  }));

  return {
    id: "page-fixture",
    dna,
    site: {
      seo: { title: "", description: "", keywords: [], ogTitle: "", ogDescription: "" },
      branding: { primaryColor: "", secondaryColor: "", accentColor: "", fontHeading: "", fontBody: "", logoPrompt: "" },
      images: { heroPrompt: "", ogImagePrompt: "" },
    },
    sections,
  };
}

const page = pageOf(luxuryDna);
const theme = compileTheme(page.dna);
const layout = compileLayout(page.dna);

function sec(
  type: SectionType,
  variant: string,
  opts: {
    prominence?: SectionProminence;
    rhythm?: SectionRhythm;
    themeOverrides?: Partial<StrategyDNA>;
    content?: SectionContent;
  } = {}
): SectionInstance {
  return {
    id: `${type}-test`,
    type,
    variant,
    content: opts.content ?? CONTENT_BY_TYPE[type],
    layout: { prominence: opts.prominence ?? "standard", rhythm: opts.rhythm ?? "standard" },
    themeOverrides: opts.themeOverrides ?? {},
    visibility: "visible",
    locked: false,
    metadata: { createdBy: "template", createdAt: 0, updatedAt: 0 },
    version: 0,
  };
}

afterEach(() => {
  cleanup();
});

describe("SectionRenderer", () => {
  it("renders the hero with its variant and theme", () => {
    render(<SectionRenderer instance={sec("hero", "minimal")} page={page} theme={theme} layout={layout} />);
    expect(screen.getByText("Find Your Dream Home")).toBeTruthy();
    expect(screen.getByText("Schedule a Call")).toBeTruthy();
  });

  it("applies the compiled theme's typography tokens to the hero title and subtitle", () => {
    render(<SectionRenderer instance={sec("hero", "minimal")} page={page} theme={theme} layout={layout} />);

    // Compared as numbers, not strings: the DOM normalizes a CSS value like "4.00rem"
    // down to "4rem" when it round-trips through style.fontSize, which is a browser
    // formatting detail, not evidence the compiled value failed to reach the element.
    const title = screen.getByRole("heading", { level: 1 });
    expect(parseFloat(title.style.fontSize)).toBeCloseTo(parseFloat(theme.typography.hero.fontSize as string));

    const subtitle = screen.getByText("Personalized service.");
    expect(parseFloat(subtitle.style.fontSize)).toBeCloseTo(parseFloat(theme.typography.subtitle.fontSize as string));
  });

  it("renders features with the requested variant", () => {
    render(<SectionRenderer instance={sec("features", "list")} page={page} theme={theme} layout={layout} />);
    expect(screen.getByText("Feature One")).toBeTruthy();
  });

  it("renders benefits", () => {
    render(<SectionRenderer instance={sec("benefits", "cards")} page={page} theme={theme} layout={layout} />);
    expect(screen.getByText("Benefit One")).toBeTruthy();
  });

  it("renders benefits in the minimal numbered variant without card chrome", () => {
    render(<SectionRenderer instance={sec("benefits", "minimal")} page={page} theme={theme} layout={layout} />);
    expect(screen.getByText("Benefit One")).toBeTruthy();
    expect(screen.getByText("01")).toBeTruthy();
  });

  it("renders testimonials in the minimal variant without card chrome", () => {
    render(<SectionRenderer instance={sec("testimonials", "minimal")} page={page} theme={theme} layout={layout} />);
    expect(screen.getByText("Jane Doe", { exact: false })).toBeTruthy();
  });

  it("applies the compiled theme's title typography token to testimonials/pricing/faq headings", () => {
    const { unmount: unmount1 } = render(
      <SectionRenderer instance={sec("testimonials", "cards")} page={page} theme={theme} layout={layout} />
    );
    const testimonialsHeading = screen.getByRole("heading", { name: "Testimonials" });
    expect(parseFloat(testimonialsHeading.style.fontSize)).toBeCloseTo(parseFloat(theme.typography.title.fontSize as string));
    unmount1();

    const { unmount: unmount2 } = render(
      <SectionRenderer instance={sec("pricing", "simple")} page={page} theme={theme} layout={layout} />
    );
    const pricingHeading = screen.getByRole("heading", { name: "Pricing" });
    expect(parseFloat(pricingHeading.style.fontSize)).toBeCloseTo(parseFloat(theme.typography.title.fontSize as string));
    unmount2();

    render(<SectionRenderer instance={sec("faq", "accordion")} page={page} theme={theme} layout={layout} />);
    const faqHeading = screen.getByRole("heading", { name: "FAQ" });
    expect(parseFloat(faqHeading.style.fontSize)).toBeCloseTo(parseFloat(theme.typography.title.fontSize as string));
  });

  it("renders pricing", () => {
    render(<SectionRenderer instance={sec("pricing", "simple")} page={page} theme={theme} layout={layout} />);
    expect(screen.getByText("Plan")).toBeTruthy();
  });

  it("renders an interactive FAQ accordion", () => {
    render(<SectionRenderer instance={sec("faq", "accordion")} page={page} theme={theme} layout={layout} />);
    expect(screen.getByRole("button", { name: /A question\?/ })).toBeTruthy();
  });

  it("renders the footer", () => {
    render(<SectionRenderer instance={sec("footer", "simple")} page={page} theme={theme} layout={layout} />);
    expect(screen.getByText("Acme")).toBeTruthy();
  });

  it("renders stats", () => {
    render(<SectionRenderer instance={sec("stats", "cards")} page={page} theme={theme} layout={layout} />);
    expect(screen.getByText("Years")).toBeTruthy();
  });

  // Regression test for the bug found while refactoring this component: the old
  // SectionRenderer never forwarded section.variant for "stats"/"faq", so these two
  // variants (added by the Diversity Engine work) never actually rendered in the app,
  // regardless of what SectionPlanner.ts chose.
  it("actually renders stats:inline (not silently falling back to cards)", () => {
    const { container } = render(<SectionRenderer instance={sec("stats", "inline")} page={page} theme={theme} layout={layout} />);
    expect(screen.getByText("Years")).toBeTruthy();
    expect(container.querySelector(".divide-x")).toBeTruthy(); // StatsInline's distinguishing marker
  });

  it("actually renders faq:twoColumn (not silently falling back to accordion)", () => {
    render(<SectionRenderer instance={sec("faq", "twoColumn")} page={page} theme={theme} layout={layout} />);
    expect(screen.getByText("A question?")).toBeTruthy();
    expect(screen.getByText("An answer.")).toBeTruthy();
    // twoColumn renders every answer inline, statically - no accordion toggle button exists.
    expect(screen.queryByRole("button", { name: /A question\?/ })).toBeNull();
  });
});

describe("SectionRenderer - per-section themeOverrides", () => {
  it("recompiles theme/layout from the merged DNA when themeOverrides is non-empty", () => {
    const overridden = sec("stats", "cards", { themeOverrides: { saturation: 1, roundedness: 1 } });
    const plain = sec("stats", "cards");

    const { container: overriddenContainer, unmount } = render(
      <SectionRenderer instance={overridden} page={page} theme={theme} layout={layout} />
    );
    const overriddenCard = overriddenContainer.querySelector(".border") as HTMLElement;
    unmount();

    const { container: plainContainer } = render(<SectionRenderer instance={plain} page={page} theme={theme} layout={layout} />);
    const plainCard = plainContainer.querySelector(".border") as HTMLElement;

    expect(overriddenCard.style.borderRadius).not.toBe(plainCard.style.borderRadius);
  });

  it("uses the page-level theme/layout unchanged when themeOverrides is empty", () => {
    const plain = sec("stats", "cards");
    const { container } = render(<SectionRenderer instance={plain} page={page} theme={theme} layout={layout} />);
    const card = container.querySelector(".border") as HTMLElement;
    expect(card.style.borderRadius).toBe(theme.radius.xl);
  });
});

describe("SectionRenderer - LandingComposition sections (logoCloud, cta)", () => {
  it("renders a standalone logo cloud section", () => {
    render(<SectionRenderer instance={sec("logoCloud", "default")} page={page} theme={theme} layout={layout} />);
    expect(screen.getByText("OpenAI")).toBeTruthy();
    expect(screen.getByText("Trusted by teams at")).toBeTruthy();
  });

  it("renders an intermediate CTA banner that reuses the page's hero primaryCTA/secondaryCTA verbatim", () => {
    render(<SectionRenderer instance={sec("cta", "default")} page={page} theme={theme} layout={layout} />);
    expect(screen.getByText("Schedule a Call")).toBeTruthy();
    expect(screen.getByText("Learn More")).toBeTruthy();
  });

  it("gives the cta banner a stacked layout for a narrow-contentWidth DNA and a row layout for a wide one", () => {
    const { unmount } = render(<SectionRenderer instance={sec("cta", "default")} page={page} theme={theme} layout={layout} />);
    const narrowWrapper = screen.getByText("Schedule a Call").parentElement;
    expect(narrowWrapper?.className).toContain("flex-col");
    unmount();

    const widePage = pageOf(startupDna);
    const wideTheme = compileTheme(startupDna);
    const wideLayout = compileLayout(startupDna);
    render(<SectionRenderer instance={sec("cta", "default")} page={widePage} theme={wideTheme} layout={wideLayout} />);
    const wideWrapper = screen.getByText("Schedule a Call").parentElement;
    expect(wideWrapper?.className).toContain("flex-wrap");
  });
});

describe("SectionRenderer - rhythm drives spacing", () => {
  it("gives a 'breather' section more top margin than a 'dense' section of the same type/theme", () => {
    const { container: denseContainer, unmount } = render(
      <SectionRenderer instance={sec("benefits", "cards", { rhythm: "dense" })} page={page} theme={theme} layout={layout} />
    );
    const denseMargin = (denseContainer.querySelector("section") as HTMLElement | null)?.style.marginTop;
    unmount();

    const { container: breatherContainer } = render(
      <SectionRenderer instance={sec("benefits", "cards", { rhythm: "breather" })} page={page} theme={theme} layout={layout} />
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
    const widePage = pageOf(startupDna);
    const wideTheme = compileTheme(startupDna);
    const wideLayout = compileLayout(startupDna);
    const { container: wideContainer, unmount } = render(
      <SectionRenderer instance={sec("features", "grid")} page={widePage} theme={wideTheme} layout={wideLayout} />
    );
    const wideGrid = wideContainer.querySelector(".grid");
    expect(wideGrid?.className).toContain("xl:grid-cols-3");
    unmount();

    const narrowPage = pageOf(luxuryDna);
    const narrowTheme = compileTheme(luxuryDna);
    const narrowLayout = compileLayout(luxuryDna);
    const { container: narrowContainer } = render(
      <SectionRenderer instance={sec("features", "grid")} page={narrowPage} theme={narrowTheme} layout={narrowLayout} />
    );
    const narrowGrid = narrowContainer.querySelector(".grid");
    expect(narrowGrid?.className).not.toContain("xl:grid-cols-3");
  });

  it("gives a narrow-contentWidth DNA a stacked CTA layout and a wide one a row layout, for the same hero variant", () => {
    const widePage = pageOf(startupDna);
    const wideTheme = compileTheme(startupDna);
    const wideLayout = compileLayout(startupDna);
    const { unmount } = render(
      <SectionRenderer instance={sec("hero", "minimal")} page={widePage} theme={wideTheme} layout={wideLayout} />
    );
    const wideCtaWrapper = screen.getByText("Schedule a Call").parentElement;
    expect(wideCtaWrapper?.className).toContain("flex-wrap");
    unmount();

    const narrowPage = pageOf(luxuryDna);
    const narrowTheme = compileTheme(luxuryDna);
    const narrowLayout = compileLayout(luxuryDna);
    render(<SectionRenderer instance={sec("hero", "minimal")} page={narrowPage} theme={narrowTheme} layout={narrowLayout} />);
    const narrowCtaWrapper = screen.getByText("Schedule a Call").parentElement;
    expect(narrowCtaWrapper?.className).toContain("flex-col");
  });
});
