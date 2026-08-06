// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
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
    // Matched on the heading's full textContent: `highlightWord` ("Home") is now
    // emphasised inside the title rather than repeated under it, so this also asserts the
    // headline is not printed twice.
    expect(
      screen.getByText((_content, el) => el?.tagName === "H1" && el.textContent === "Find Your Dream Home")
    ).toBeTruthy();
    expect(screen.getByText("Schedule a Call")).toBeTruthy();
  });

  // These used to read the value back off the element via style.fontSize. That stopped
  // being possible when typography became responsive: theme.ts now emits clamp(), and
  // happy-dom drops any inline style containing clamp() outright - it doesn't normalize
  // it, it discards the whole style attribute (verified directly, not assumed). Real
  // browsers apply it fine, so this is a test-environment limit, not a regression.
  //
  // The assertion is therefore split: the shape and ordering of the compiled tokens is
  // covered properly in app/styles/theme.test.ts, and what stays here is what this file
  // is actually for - that the right component renders the right content for a variant.
  // The one thing no unit test can prove is that the clamp visibly works on a phone;
  // that is verified in a real browser at a real viewport.
  it("renders the hero title and subtitle content for the chosen variant", () => {
    render(<SectionRenderer instance={sec("hero", "minimal")} page={page} theme={theme} layout={layout} />);

    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    expect(screen.getByText("Personalized service.")).toBeTruthy();
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

  // Same happy-dom clamp() limitation as the hero typography test above - what remains
  // checkable here is that each section type renders its own section heading at the
  // right level, which is the routing behaviour this file exists to guard.
  it("renders a section heading for testimonials/pricing/faq", () => {
    const { unmount: unmount1 } = render(
      <SectionRenderer instance={sec("testimonials", "cards")} page={page} theme={theme} layout={layout} />
    );
    expect(screen.getByRole("heading", { name: "Testimonials" })).toBeTruthy();
    unmount1();

    const { unmount: unmount2 } = render(
      <SectionRenderer instance={sec("pricing", "simple")} page={page} theme={theme} layout={layout} />
    );
    expect(screen.getByRole("heading", { name: "Pricing" })).toBeTruthy();
    unmount2();

    render(<SectionRenderer instance={sec("faq", "accordion")} page={page} theme={theme} layout={layout} />);
    expect(screen.getByRole("heading", { name: "FAQ" })).toBeTruthy();
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
  // The DOM-level version of this assertion died with the move to clamp() spacing (see
  // the typography tests above for why happy-dom can't hold those values). The rhythm ->
  // spacing relationship it was protecting is asserted directly against the compiler in
  // app/styles/layout.test.ts, where the values are plain strings and the comparison is
  // exact rather than inferred from a style attribute.
  it("renders a section element for every rhythm, so spacing has something to apply to", () => {
    for (const rhythm of ["dense", "standard", "breather"] as const) {
      const { container, unmount } = render(
        <SectionRenderer instance={sec("benefits", "cards", { rhythm })} page={page} theme={theme} layout={layout} />
      );
      expect(container.querySelector("section")).toBeTruthy();
      unmount();
    }
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
    // Two levels up now: text -> EditableText's span -> SecondaryButton's <button> -> the flex wrapper.
    const wideCtaWrapper = screen.getByText("Schedule a Call").parentElement?.parentElement;
    expect(wideCtaWrapper?.className).toContain("flex-wrap");
    unmount();

    const narrowPage = pageOf(luxuryDna);
    const narrowTheme = compileTheme(luxuryDna);
    const narrowLayout = compileLayout(luxuryDna);
    render(<SectionRenderer instance={sec("hero", "minimal")} page={narrowPage} theme={narrowTheme} layout={narrowLayout} />);
    const narrowCtaWrapper = screen.getByText("Schedule a Call").parentElement?.parentElement;
    expect(narrowCtaWrapper?.className).toContain("flex-col");
  });
});

// Regression guard for every caller that never passes onEditContent (today: none pass
// it directly to SectionRenderer at all - Landing.tsx is the only caller, and its own
// test covers the top-level case; this covers a non-hero section too, since the
// per-instance onUpdateContent binding happens once here for every section type).
describe("SectionRenderer - no onEditContent", () => {
  it("renders testimonials as plain, non-interactive text", () => {
    render(<SectionRenderer instance={sec("testimonials", "cards")} page={page} theme={theme} layout={layout} />);
    fireEvent.click(screen.getByText("Jane Doe"));
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByText("Jane Doe")).toBeTruthy();
  });
});

// A published page is served from a frozen JSON snapshot written by a language model.
// When one list-shaped section held an object instead of an array, the component
// destructured it (`const [lead, ...rest] = items`) and threw during server render - a
// 500 on a paying customer's live site, caused by one malformed field in one section.
// These lock in that a bad section degrades to empty instead of taking the page down.
describe("SectionRenderer - malformed stored content never takes the page down", () => {
  afterEach(cleanup);

  const MALFORMED = [
    ["an object where an array belongs", { unexpected: true }],
    ["null", null],
    ["a string", "not a list"],
    ["a number", 42],
  ] as const;

  const LIST_SECTIONS: SectionType[] = ["stats", "features", "benefits", "testimonials", "pricing", "faq"];

  for (const type of LIST_SECTIONS) {
    for (const [label, content] of MALFORMED) {
      it("renders an empty " + type + " section for " + label, () => {
        expect(() =>
          render(
            <SectionRenderer
              instance={sec(type, "default", { content: content as never })}
              page={page}
              theme={theme}
              layout={layout}
            />
          )
        ).not.toThrow();
      });
    }
  }

  it("still accepts the wrapped { items: [...] } shape", () => {
    render(
      <SectionRenderer
        instance={sec("stats", "cards", { content: { items: [{ value: "500+", label: "Loaves a week" }] } as never })}
        page={page}
        theme={theme}
        layout={layout}
      />
    );
    expect(screen.getByText("Loaves a week")).toBeTruthy();
  });
});
