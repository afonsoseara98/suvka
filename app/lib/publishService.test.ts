import { describe, it, expect, beforeEach } from "vitest";
import { createInMemoryRepositories } from "./repositories/memory";
import type { RepositoryBundle } from "./repositories/types";
import { createProjectFromGeneration, dispatchAndPersist } from "./projectService";
import { publishProject, unpublishProject, loadPublishedSite, slugify, resolveAvailableSlug, RESERVED_SLUGS } from "./publishService";
import { neutralStrategyDna } from "@/app/ai/testFixtures";
import type { LandingPage } from "@/app/types/landing";
import type { BusinessProfile } from "@/app/ai/types";

const BUSINESS_PROFILE: BusinessProfile = {
  industry: "startup",
  businessModel: "saas",
  primaryGoal: "book_demo",
  audience: "Startup founders",
  tone: "modern",
  priceLevel: "medium",
};

function landingPage(): LandingPage {
  return {
    dna: neutralStrategyDna(),
    site: {
      seo: { title: "Acme SEO Title", description: "Acme description", keywords: ["a", "b"], ogTitle: "OG", ogDescription: "OGD" },
      branding: {
        primaryColor: "#111",
        secondaryColor: "#222",
        accentColor: "#333",
        fontHeading: "Inter",
        fontBody: "Inter",
        logoPrompt: "a logo",
      },
      images: { heroPrompt: "", ogImagePrompt: "" },
    },
    sections: [
      { type: "hero", variant: "centered", prominence: "primary", rhythm: "standard" },
      { type: "stats", variant: "cards", prominence: "standard", rhythm: "standard" },
      { type: "footer", variant: "simple", prominence: "compact", rhythm: "standard" },
    ],
    hero: {
      badge: "B",
      title: "Original Title",
      highlightWord: "Original",
      subtitle: "S",
      primaryCTA: "Go",
      secondaryCTA: "Learn",
      imageStyle: "abstract",
      imagePrompt: "",
      stats: [],
    },
    stats: [{ value: "10", label: "Years" }],
    features: [],
    benefits: [],
    testimonials: [],
    pricing: [],
    faq: [],
    footer: { company: "Acme", email: "a@acme.com", copyright: "(c)" },
  };
}

let repos: RepositoryBundle;

beforeEach(() => {
  repos = createInMemoryRepositories();
});

async function newProject(name = "Acme") {
  return createProjectFromGeneration(repos, "user-1", landingPage(), BUSINESS_PROFILE, { name });
}

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Joe's Bakery")).toBe("joe-s-bakery");
  });

  it("strips accents rather than dropping the characters", () => {
    expect(slugify("Padaria Céu Azul")).toBe("padaria-ceu-azul");
  });

  it("never leaves a leading or trailing hyphen", () => {
    expect(slugify("  --Hello--  ")).toBe("hello");
  });

  it("returns an empty string for input with nothing usable", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("resolveAvailableSlug", () => {
  it("falls back to a usable slug when the name yields nothing", async () => {
    const project = await newProject("!!!");
    expect(await resolveAvailableSlug(repos, project.name, project.id)).toBe("site");
  });

  it("appends a numeric suffix when the slug is taken by another project", async () => {
    const first = await newProject("Acme");
    await publishProject(repos, first.id);

    const second = await newProject("Acme");
    expect(await resolveAvailableSlug(repos, "Acme", second.id)).toBe("acme-2");
  });

  it("returns the same slug for the project that already owns it", async () => {
    const project = await newProject("Acme");
    await publishProject(repos, project.id);
    expect(await resolveAvailableSlug(repos, "Acme", project.id)).toBe("acme");
  });

  // Deixou de ser inofensivo. Enquanto os sites viveram em /s/<slug>, um projecto slugged
  // "dashboard" ficava em /s/dashboard e não tocava em /dashboard. Agora vive na raiz, e a
  // rota estática ganha sempre - o site do restaurante deixaria de existir sem um único erro
  // em lado nenhum.
  it("skips reserved names", async () => {
    const project = await newProject("Dashboard");
    expect(await resolveAvailableSlug(repos, "dashboard", project.id)).toBe("dashboard-2");
  });

  it("reserva também as rotas em português, que a raiz passou a tornar perigosas", async () => {
    for (const nome of ["entrar", "termos", "privacidade", "publicar", "preview"]) {
      const project = await newProject(nome);
      expect(await resolveAvailableSlug(repos, nome, project.id)).toBe(`${nome}-2`);
    }
  });
});

// O TESTE QUE SE MANTÉM SOZINHO
//
// Uma lista escrita à mão fica desactualizada no dia em que alguém acrescenta uma rota e não
// se lembra disto - e o sintoma é o pior que este produto tem: o site de um cliente pago
// desaparece em silêncio, substituído por uma página nossa, sem erro nenhum em lado nenhum.
//
// Por isso a lista não é verificada contra si própria: é verificada contra o disco. Quem
// criar app/precos/page.tsx sem reservar "precos" parte este teste antes de fazer commit.
describe("RESERVED_SLUGS cobre todas as rotas reais", () => {
  it("toda a rota de topo em app/ está reservada", async () => {
    const { readdirSync, existsSync } = await import("fs");
    const path = await import("path");

    const appDir = path.join(process.cwd(), "app");
    const rotas = readdirSync(appDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      // Segmentos dinâmicos ([slug]) e grupos ((grupo)) não ocupam nome nenhum na URL.
      .filter((n) => !n.startsWith("[") && !n.startsWith("(") && !n.startsWith("_"))
      // Só conta como rota se tiver um page.tsx ou um route.ts - o resto são pastas de
      // código (lib, components, styles, types) que nunca aparecem num endereço.
      .filter(
        (n) =>
          existsSync(path.join(appDir, n, "page.tsx")) ||
          existsSync(path.join(appDir, n, "route.ts")) ||
          n === "api"
      );

    expect(rotas.length).toBeGreaterThan(5);

    const emFalta = rotas.filter((r) => !RESERVED_SLUGS.has(r));
    expect(emFalta, `rotas por reservar em RESERVED_SLUGS: ${emFalta.join(", ")}`).toEqual([]);
  });
});

describe("publishProject", () => {
  it("claims a slug derived from the project name", async () => {
    const project = await newProject("Joe's Bakery");
    const { slug } = await publishProject(repos, project.id);
    expect(slug).toBe("joe-s-bakery");
  });

  it("marks the project published", async () => {
    const project = await newProject();
    await publishProject(repos, project.id);
    const record = await repos.projects.findById(project.id);
    expect(record?.settings.publishing.published).toBe(true);
  });

  it("stores a snapshot of the page at its current cursor", async () => {
    const project = await newProject();
    await publishProject(repos, project.id);

    const snapshot = await repos.pages.getPublishedSnapshot(project.pages[0].id);
    expect(snapshot).not.toBeNull();
    expect(snapshot!.index).toBe(0);
    const hero = snapshot!.state.sections.find((s) => s.type === "hero");
    expect((hero!.content as { title: string }).title).toBe("Original Title");
  });

  it("keeps the same slug when republished, so a shared link never breaks", async () => {
    const project = await newProject("Acme");
    const first = await publishProject(repos, project.id);
    const second = await publishProject(repos, project.id);
    expect(second.slug).toBe(first.slug);
  });

  it("gives two projects with the same name distinct slugs", async () => {
    const a = await newProject("Acme");
    const b = await newProject("Acme");
    const slugA = (await publishProject(repos, a.id)).slug;
    const slugB = (await publishProject(repos, b.id)).slug;
    expect(slugA).not.toBe(slugB);
  });

  it("throws for an unknown project", async () => {
    await expect(publishProject(repos, "nope")).rejects.toThrow();
  });
});

// This is the property that makes publishing meaningful at all: without it, every
// keystroke in the editor would be live to the public.
describe("edits after publishing stay private until republished", () => {
  it("does not change the published snapshot when the page is edited", async () => {
    const project = await newProject();
    const pageId = project.pages[0].id;
    const heroId = project.pages[0].history.states[0].sections.find((s) => s.type === "hero")!.id;
    await publishProject(repos, project.id);

    await dispatchAndPersist(
      repos,
      pageId,
      { kind: "UpdateContent", sectionId: heroId, content: { ...landingPage().hero, title: "Draft Title" } },
      "user"
    );

    const site = await loadPublishedSite(repos, "acme");
    const publishedHero = site!.state.sections.find((s) => s.type === "hero");
    expect((publishedHero!.content as { title: string }).title).toBe("Original Title");
  });

  it("picks up the edit once republished", async () => {
    const project = await newProject();
    const pageId = project.pages[0].id;
    const heroId = project.pages[0].history.states[0].sections.find((s) => s.type === "hero")!.id;
    await publishProject(repos, project.id);

    await dispatchAndPersist(
      repos,
      pageId,
      { kind: "UpdateContent", sectionId: heroId, content: { ...landingPage().hero, title: "Draft Title" } },
      "user"
    );
    await publishProject(repos, project.id);

    const site = await loadPublishedSite(repos, "acme");
    const publishedHero = site!.state.sections.find((s) => s.type === "hero");
    expect((publishedHero!.content as { title: string }).title).toBe("Draft Title");
  });

  it("advances the recorded publish index to the new cursor", async () => {
    const project = await newProject();
    const pageId = project.pages[0].id;
    // Not the hero: applyOperation refuses to hide the last anchor section, which is
    // the correct invariant and would make this test about the wrong thing.
    const statsId = project.pages[0].history.states[0].sections.find((s) => s.type === "stats")!.id;
    await publishProject(repos, project.id);

    await dispatchAndPersist(repos, pageId, { kind: "HideSection", sectionId: statsId }, "user");
    await publishProject(repos, project.id);

    expect((await repos.pages.getPublishedSnapshot(pageId))!.index).toBe(1);
  });
});

describe("loadPublishedSite", () => {
  it("returns the site for a published slug", async () => {
    const project = await newProject("Acme");
    await publishProject(repos, project.id);
    const site = await loadPublishedSite(repos, "acme");
    expect(site?.projectName).toBe("Acme");
    expect(site?.slug).toBe("acme");
  });

  it("carries the SEO data through to the caller", async () => {
    const project = await newProject("Acme");
    await publishProject(repos, project.id);
    const site = await loadPublishedSite(repos, "acme");
    expect(site!.state.site.seo.title).toBe("Acme SEO Title");
  });

  it("returns null for an unknown slug", async () => {
    expect(await loadPublishedSite(repos, "does-not-exist")).toBeNull();
  });

  // A visitor must not be able to tell "never existed" from "exists but is private" -
  // both are simply absent.
  it("returns null for a project that was never published", async () => {
    await newProject("Acme");
    expect(await loadPublishedSite(repos, "acme")).toBeNull();
  });
});

describe("unpublishProject", () => {
  it("takes the site offline", async () => {
    const project = await newProject("Acme");
    await publishProject(repos, project.id);
    await unpublishProject(repos, project.id);
    expect(await loadPublishedSite(repos, "acme")).toBeNull();
  });

  it("clears the stored snapshot", async () => {
    const project = await newProject("Acme");
    await publishProject(repos, project.id);
    await unpublishProject(repos, project.id);
    expect(await repos.pages.getPublishedSnapshot(project.pages[0].id)).toBeNull();
  });

  // The URL stays reserved: taking a site down must not hand its address to whoever
  // publishes next, or a re-publish would silently move someone's live link.
  it("keeps the slug reserved for the same project", async () => {
    const project = await newProject("Acme");
    await publishProject(repos, project.id);
    await unpublishProject(repos, project.id);

    const other = await newProject("Acme");
    expect(await resolveAvailableSlug(repos, "Acme", other.id)).toBe("acme-2");
  });

  it("restores the same URL when republished", async () => {
    const project = await newProject("Acme");
    await publishProject(repos, project.id);
    await unpublishProject(repos, project.id);
    expect((await publishProject(repos, project.id)).slug).toBe("acme");
  });
});

// The address is the thing the owner reads out over the phone. It used to be derived from
// the restaurant's name behind their back, and silently suffixed if that name was taken.
describe("the address the owner chose", () => {
  it("publishes at the requested address rather than at the restaurant's name", async () => {
    const project = await newProject("Tasca do Sameiro");
    const { slug } = await publishProject(repos, project.id, new Date(), "sameiro-braga");

    expect(slug).toBe("sameiro-braga");
    expect((await loadPublishedSite(repos, "sameiro-braga"))).not.toBeNull();
  });

  it("still slugs from the name when no address was chosen", async () => {
    // Every project published before the address step existed came through this path.
    const project = await newProject("Tasca do Sameiro");
    expect((await publishProject(repos, project.id)).slug).toBe("tasca-do-sameiro");
  });

  it("tidies up what was typed rather than rejecting it", async () => {
    const project = await newProject("Acme");
    expect((await publishProject(repos, project.id, new Date(), "  Café  Central!! ")).slug).toBe("cafe-central");
  });

  it("does not hand one restaurant an address another already owns", async () => {
    // The availability check on screen is a moment old, and two people can be choosing the
    // same name at once - so the claim has to be resolved again at publish time.
    const first = await newProject("Primeiro");
    await publishProject(repos, first.id, new Date(), "tasca");

    const second = await newProject("Segundo");
    const { slug } = await publishProject(repos, second.id, new Date(), "tasca");

    expect(slug).toBe("tasca-2");
    expect((await loadPublishedSite(repos, "tasca"))?.projectName).toBe("Primeiro");
  });

  it("keeps the address it already has when re-publishing", async () => {
    // Re-publishing happens every time an owner edits their hours. Changing the URL there
    // would break every link they had already given out.
    const project = await newProject("Acme");
    await publishProject(repos, project.id, new Date(), "acme-porto");
    const again = await publishProject(repos, project.id, new Date(), "outra-coisa");

    expect(again.slug).toBe("acme-porto");
  });
});
