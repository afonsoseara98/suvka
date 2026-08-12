import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { PageState } from "@/app/editor/pageState";

const mockLoad = vi.fn();

// O repositório real importa o PrismaClient no momento do import, que precisa de uma
// DATABASE_URL. O que este ficheiro testa é o que sai em <head>, não de onde vieram os dados.
vi.mock("@/app/lib/repos", () => ({ repos: {} }));
vi.mock("@/app/lib/publishService", () => ({ loadPublishedSite: () => mockLoad() }));

const { generateMetadata } = await import("./page");

const APP_URL_ORIGINAL = process.env.APP_URL;

function siteComFotografia(url: string | null): unknown {
  const hero = {
    type: "hero",
    content: {
      title: "Taberna do Gonçalo",
      image: url ? { url, width: 1600, height: 900, alt: "Sala da taberna" } : null,
    },
  };

  return {
    projectId: "p1",
    projectName: "Taberna do Gonçalo",
    slug: "taberna-do-goncalo",
    publishedAt: new Date("2026-08-01T10:00:00Z"),
    state: {
      sections: [hero],
      site: { seo: { title: "Taberna do Gonçalo — Braga", description: "Cozinha do Minho." } },
    } as unknown as PageState,
  };
}

const params = Promise.resolve({ slug: "taberna-do-goncalo" });

beforeEach(() => {
  vi.clearAllMocks();
  process.env.APP_URL = "https://suvka.com";
  mockLoad.mockResolvedValue(siteComFotografia("/uploads/sala.jpg"));
});

afterEach(() => {
  if (APP_URL_ORIGINAL === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = APP_URL_ORIGINAL;
});

describe("generateMetadata do site publicado", () => {
  // Um anúncio no Facebook devolve as pessoas a /taberna-do-goncalo?fbclid=..., e cada
  // visitante traz um valor diferente. Sem canonical, o Google via uma página nova de cada
  // vez e repartia por todas a autoridade que devia ser de uma só.
  it("aponta o canonical para o endereço limpo", async () => {
    const metadata = await generateMetadata({ params });
    expect(metadata.alternates?.canonical).toBe("/taberna-do-goncalo");
  });

  it("declara a fotografia do restaurante como imagem de partilha", async () => {
    const metadata = await generateMetadata({ params });

    expect(metadata.openGraph?.images).toEqual([
      { url: "/uploads/sala.jpg", width: 1600, height: 900, alt: "Sala da taberna" },
    ]);
    expect(metadata.twitter?.images).toEqual(metadata.openGraph?.images);
  });

  // Um cartão sem fotografia é pior do que um com fotografia. Um cartão com a fotografia
  // errada - a de outro restaurante, ou um logótipo nosso - é pior do que os dois.
  it("um restaurante sem fotografia não recebe uma emprestada", async () => {
    mockLoad.mockResolvedValue(siteComFotografia(null));

    const metadata = await generateMetadata({ params });

    expect(metadata.openGraph?.images).toBeUndefined();
    expect(metadata.twitter?.images).toBeUndefined();
  });

  it("continua a dizer o essencial de um site que não existe", async () => {
    mockLoad.mockResolvedValue(null);
    expect((await generateMetadata({ params })).title).toBe("Not found");
  });
});
