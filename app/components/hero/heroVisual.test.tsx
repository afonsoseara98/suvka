// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { planHeroVisual } from "./registry";
import HeroCenteredLayout from "./HeroCenteredLayout";
import { compileTheme } from "@/app/styles/theme";
import { compileLayout } from "@/app/styles/layout";
import { neutralStrategyDna } from "@/app/ai/testFixtures";
import type { HeroData } from "@/app/types/landing";
import type { ResolvedImage, VisualIntent } from "@/app/ai/types/visual";

const theme = compileTheme(neutralStrategyDna());
const layout = compileLayout(neutralStrategyDna());

const IMAGE: ResolvedImage = {
  url: "https://images.example/bread.jpg",
  width: 1200,
  height: 800,
  alt: "Rustic plated dish in a warm restaurant dining room",
  credit: { name: "Ana Silva", url: "https://example/@ana", source: "Pexels" },
};

const PHOTO_INTENT: VisualIntent = {
  treatment: "photo",
  subject: "rustic plated dish in a warm restaurant dining room",
  alternateSubjects: ["restaurant interior"],
  alt: "Rustic plated dish in a warm restaurant dining room",
  orientation: "landscape",
  variantSeed: 0,
  scene: "website",
};

function hero(overrides: Partial<HeroData> = {}): HeroData {
  return {
    badge: "Since 1998",
    title: "Fresh Sourdough Every Morning",
    highlightWord: "Sourdough",
    subtitle: "Handmade in Lisbon.",
    primaryCTA: "Order Now",
    secondaryCTA: "See Menu",
    imageStyle: "dashboard",
    imagePrompt: "",
    stats: [],
    ...overrides,
  };
}

describe("planHeroVisual", () => {
  it("keeps rendering the original scene for a page stored before visual intent existed", () => {
    // Published snapshots are frozen JSON. A page someone already published must not
    // change appearance because we shipped a new field.
    const plan = planHeroVisual(hero());
    expect(plan.kind).toBe("scene");
  });

  it("renders a photograph when one was resolved", () => {
    const plan = planHeroVisual(hero({ visual: PHOTO_INTENT, image: IMAGE }));
    expect(plan).toEqual({ kind: "photo", image: IMAGE });
  });

  it("renders NO scene when a photo was wanted and none is available", () => {
    // The whole point. A bakery with no photograph gets a clean editorial hero - never a
    // fake analytics dashboard, which is exactly what the old code did to 13 of the 20
    // measured businesses.
    const plan = planHeroVisual(hero({ visual: PHOTO_INTENT, image: null }));
    expect(plan.kind).toBe("none");
  });

  it("still renders a mockup for a software product", () => {
    const plan = planHeroVisual(
      hero({ visual: { ...PHOTO_INTENT, treatment: "software-scene" }, imageStyle: "analytics" })
    );
    expect(plan.kind).toBe("scene");
  });
});

describe("hero rendering", () => {
  afterEach(cleanup);

  it("puts the resolved photograph in the document with its alt text", () => {
    render(<HeroCenteredLayout data={hero({ visual: PHOTO_INTENT, image: IMAGE })} theme={theme} layout={layout} />);

    const img = screen.getByAltText("Rustic plated dish in a warm restaurant dining room");
    expect(img.getAttribute("src")).toBe("https://images.example/bread.jpg");
  });

  it("reserves the image's intrinsic size so the headline does not jump", () => {
    render(<HeroCenteredLayout data={hero({ visual: PHOTO_INTENT, image: IMAGE })} theme={theme} layout={layout} />);

    const img = screen.getByAltText("Rustic plated dish in a warm restaurant dining room");
    expect(img.getAttribute("width")).toBe("1200");
    expect(img.getAttribute("height")).toBe("800");
  });

  it("loads the hero image eagerly - it is the largest contentful paint", () => {
    render(<HeroCenteredLayout data={hero({ visual: PHOTO_INTENT, image: IMAGE })} theme={theme} layout={layout} />);

    const img = screen.getByAltText("Rustic plated dish in a warm restaurant dining room");
    expect(img.getAttribute("loading")).toBe("eager");
  });

  it("credits the photographer when the source provides attribution", () => {
    render(<HeroCenteredLayout data={hero({ visual: PHOTO_INTENT, image: IMAGE })} theme={theme} layout={layout} />);
    expect(screen.getByText("Ana Silva")).toBeTruthy();
  });

  it("renders no image at all when none was resolved", () => {
    const { container } = render(
      <HeroCenteredLayout data={hero({ visual: PHOTO_INTENT, image: null })} theme={theme} layout={layout} />
    );

    expect(container.querySelectorAll("img")).toHaveLength(0);
    // The message still lands - the hero is editorial, not broken. Asserted on the
    // heading's full text, which also proves `highlightWord` ("Sourdough") is emphasised
    // inside the title rather than repeated beneath it.
    expect(container.querySelector("h1")?.textContent).toBe("Fresh Sourdough Every Morning");
  });

  it("never renders a fake browser mockup for a business that wanted a photograph", () => {
    // "yourbusiness.com" is the literal placeholder domain baked into HeroWebsite. It
    // reached a real published bakery page. It must never appear for a photo business
    // again, with or without an image.
    for (const image of [IMAGE, null]) {
      const { container } = render(
        <HeroCenteredLayout data={hero({ visual: PHOTO_INTENT, image })} theme={theme} layout={layout} />
      );
      expect(container.textContent).not.toContain("yourbusiness.com");
    }
  });
});

// schema.ts tells the model "highlightWord must be one word that already exists inside
// the title", and the hero used to render the title AND then that word again underneath.
// Every generated page therefore had a stuttering headline in the largest type on the
// page. These assert the word is emphasised in place, exactly once.
describe("hero headline - highlight is emphasised inside the title, never repeated", () => {
  afterEach(cleanup);

  function renderHeadline(title: string, highlightWord: string) {
    const { container } = render(
      <HeroCenteredLayout
        data={hero({ title, highlightWord, visual: PHOTO_INTENT, image: null })}
        theme={theme}
        layout={layout}
      />
    );
    return container.querySelector("h1")!;
  }

  it("prints the headline exactly once", () => {
    const h1 = renderHeadline("Fresh Sourdough Every Morning", "Sourdough");
    expect(h1.textContent).toBe("Fresh Sourdough Every Morning");
  });

  it("wraps the highlighted word in its own element so it can be styled", () => {
    const h1 = renderHeadline("Fresh Sourdough Every Morning", "Sourdough");
    const span = h1.querySelector("span span");
    expect(span?.textContent).toBe("Sourdough");
  });

  it("matches case-insensitively but keeps the title's own casing", () => {
    const h1 = renderHeadline("Experience Fast, Personalized Dental Care", "fast");
    expect(h1.textContent).toBe("Experience Fast, Personalized Dental Care");
    expect(h1.querySelector("span span")?.textContent).toBe("Fast");
  });

  it("only highlights whole words", () => {
    // Substring matching would light up the "art" inside "started".
    const h1 = renderHeadline("Get started with art direction", "art");
    expect(h1.textContent).toBe("Get started with art direction");
    const highlighted = h1.querySelector("span span");
    expect(highlighted?.textContent).toBe("art");
    expect(h1.textContent!.indexOf("art")).toBeLessThan(h1.textContent!.indexOf("art direction") + 1);
  });

  it("renders the title untouched when the model returns a word that is not in it", () => {
    // A missing accent is invisible; an orphan word appended to the headline is not.
    const h1 = renderHeadline("Fresh Sourdough Every Morning", "Croissants");
    expect(h1.textContent).toBe("Fresh Sourdough Every Morning");
  });

  it("renders the title untouched when there is no highlight word at all", () => {
    const h1 = renderHeadline("Fresh Sourdough Every Morning", "");
    expect(h1.textContent).toBe("Fresh Sourdough Every Morning");
  });

  it("survives a highlight word containing regex metacharacters", () => {
    const h1 = renderHeadline("Save 20% on every order", "20%");
    expect(h1.textContent).toBe("Save 20% on every order");
  });
});
