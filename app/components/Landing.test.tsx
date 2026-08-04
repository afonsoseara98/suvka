// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import Landing from "./Landing";
import { neutralStrategyDna } from "@/app/ai/testFixtures";
import type { PageState, SectionInstance } from "@/app/editor/pageState";

function instance(overrides: Partial<SectionInstance> & Pick<SectionInstance, "id" | "type" | "content">): SectionInstance {
  return {
    variant: "default",
    layout: { prominence: "standard", rhythm: "standard" },
    themeOverrides: {},
    visibility: "visible",
    locked: false,
    metadata: { createdBy: "template", createdAt: 0, updatedAt: 0 },
    version: 0,
    ...overrides,
  };
}

function pageWith(sections: SectionInstance[]): PageState {
  return {
    id: "page",
    dna: neutralStrategyDna(),
    site: {
      seo: { title: "", description: "", keywords: [], ogTitle: "", ogDescription: "" },
      branding: { primaryColor: "", secondaryColor: "", accentColor: "", fontHeading: "", fontBody: "", logoPrompt: "" },
      images: { heroPrompt: "", ogImagePrompt: "" },
    },
    sections,
  };
}

const heroContent = {
  badge: "B",
  title: "Hero Title",
  highlightWord: "Title",
  subtitle: "Sub",
  primaryCTA: "Go",
  secondaryCTA: "Learn",
  imageStyle: "abstract" as const,
  imagePrompt: "",
  stats: [],
};

afterEach(() => {
  cleanup();
});

describe("Landing - renders exclusively from PageState", () => {
  it("renders every visible section, in order", () => {
    const page = pageWith([
      instance({ id: "hero-1", type: "hero", variant: "centered", content: heroContent }),
      instance({ id: "stats-1", type: "stats", content: [{ value: "10", label: "Years" }] }),
      instance({ id: "footer-1", type: "footer", content: { company: "Acme", email: "a@acme.com", copyright: "(c)" } }),
    ]);
    render(<Landing state={page} />);
    expect(screen.getByText("Hero Title")).toBeTruthy();
    expect(screen.getByText("Years")).toBeTruthy();
    expect(screen.getByText("Acme")).toBeTruthy();
  });

  it("never renders a hidden section, while keeping it in state", () => {
    const page = pageWith([
      instance({ id: "hero-1", type: "hero", variant: "centered", content: heroContent }),
      instance({
        id: "stats-1",
        type: "stats",
        content: [{ value: "10", label: "Years" }],
        visibility: "hidden",
      }),
      instance({ id: "footer-1", type: "footer", content: { company: "Acme", email: "a@acme.com", copyright: "(c)" } }),
    ]);
    render(<Landing state={page} />);
    expect(screen.getByText("Hero Title")).toBeTruthy();
    expect(screen.queryByText("Years")).toBeNull();
    // Hidden is a render-time filter only - the instance is still part of PageState.
    expect(page.sections.some((s) => s.id === "stats-1")).toBe(true);
  });

  it("re-shows a section once its visibility flips back to visible", () => {
    const hidden = pageWith([
      instance({ id: "hero-1", type: "hero", variant: "centered", content: heroContent }),
      instance({ id: "stats-1", type: "stats", content: [{ value: "10", label: "Years" }], visibility: "hidden" }),
    ]);
    const { rerender } = render(<Landing state={hidden} />);
    expect(screen.queryByText("Years")).toBeNull();

    const shown = pageWith(hidden.sections.map((s) => (s.id === "stats-1" ? { ...s, visibility: "visible" as const } : s)));
    rerender(<Landing state={shown} />);
    expect(screen.getByText("Years")).toBeTruthy();
  });
});
