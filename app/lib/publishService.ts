import type { RepositoryBundle, OperationRecordRow, PublishedSiteRef } from "./repositories/types";
import type { PageState } from "@/app/editor/pageState";
import { applyOperation } from "@/app/editor/operations";

// PUBLISH SERVICE
//
// The seam between "what I am editing" and "what the world sees". Everything here
// follows from one decision (prisma/schema.prisma's Page.publishedState): publishing
// MATERIALIZES the page as it looks at the current cursor and stores that copy, rather
// than storing a pointer into the operation log.
//
// Consequences worth being explicit about, because they are the whole feature:
//   - Editing after publishing changes nothing for visitors until Publish is pressed
//     again. That is the safety property a builder has to have; without it every
//     keystroke is live, which is unusable.
//   - Serving a published page is a single row read - no replay, no cost that grows
//     with how long the owner has been editing. The public surface is the one that has
//     to stay fast, and it is the one being hit by people who are not paying us.

const MAX_SLUG_LENGTH = 60;
const MAX_SLUG_ATTEMPTS = 50;

// A FORMA DE UM SLUG, NUM SÍTIO SÓ
//
// Definida aqui, ao lado do `slugify` que a produz, para nunca poder divergir dele. Quem
// valida noutro sítio acaba, mais tarde ou mais cedo, a validar outra coisa.
//
// O TETO NÃO É 60, E ISSO IMPORTA
//
// O `slugify` corta a 60, mas o `resolveAvailableSlug` pode acrescentar por cima: `-2` até
// `-50` quando o nome está ocupado, e `-<6 hex>` quando as cinquenta tentativas se esgotam.
// O comprimento máximo REAL é 60 + 1 + 6 = 67. Um limite de 60 aqui rejeitaria o site de um
// restaurante com nome comprido cujo endereço já estava ocupado - e rejeitá-lo-ia com um
// 404, ou seja, o site dele desaparecia do mapa.
const MAX_STORED_SLUG_LENGTH = MAX_SLUG_LENGTH + 1 + 6;
const SLUG_PATTERN = new RegExp(`^[a-z0-9-]{1,${MAX_STORED_SLUG_LENGTH}}$`);

// UM SLUG QUE NÃO TEM ESTA FORMA NÃO PODE EXISTIR NA TABELA
//
// Portanto perguntá-lo à base de dados é sempre uma consulta inútil - e foi essa consulta
// inútil que produziu o erro 22021 em produção: um varrimento pediu um caminho com um byte
// nulo, o Next entregou-o como `params.slug` já descodificado, e o Postgres recusou o
// parâmetro antes sequer de o comparar com alguma coisa.
//
// Desde que os sites passaram para a raiz do domínio, `app/[slug]` apanha TUDO o que não
// corresponde a uma rota estática. Sem isto, cada 404 da internet inteira custava uma ida
// ao Postgres, num endpoint público, sem sessão e sem limite de pedidos. O byte nulo era o
// único sintoma que dava erro; a carga não dava nenhum.
export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}

// Lowercase, ASCII-ish, hyphen-separated. Accents are stripped rather than dropped
// ("Padaria Céu" -> "padaria-ceu") so a Portuguese business name still produces a
// readable URL instead of losing characters.
export function slugify(input: string): string {
  const base = input
    .normalize("NFD")
    // Combining diacritical marks, stripped after NFD has split "é" into "e" + accent.
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");

  return base;
}

// AGORA ISTO É A ÚNICA COISA QUE SEPARA UM CLIENTE DO PRODUTO
//
// Enquanto os sites viveram em /s/<slug>, esta lista era uma precaução: /s/entrar e /entrar
// são endereços diferentes e nunca se tocavam. Desde que o site passou para a raiz
// (suvka.com/taberna-do-goncalo), o slug de um restaurante e as rotas da aplicação
// partilham o mesmo espaço de nomes - e o Next dá sempre precedência à rota estática.
//
// A falha, se faltar um nome aqui, é silenciosa e é a pior possível: o restaurante publica,
// recebe o endereço, manda-o aos clientes, e quem lá vai encontra a nossa página de login.
// Nada estoira, nada aparece nos registos. O dono só descobre quando alguém lhe telefona.
//
// Por isso a lista inclui rotas que ainda não existem. Reservar "precos" hoje custa nada;
// descobrir daqui a um ano que não se pode criar /precos porque um restaurante o ocupou -
// ou, pior, criá-la e apagar o site dele do mapa - custa um cliente.
export const RESERVED_SLUGS = new Set([
  // Rotas que existem hoje.
  "api", "dashboard", "editor", "new", "benchmark", "s",
  "entrar", "preview", "publicar", "publicado", "privacidade", "termos",

  // Ficheiros servidos da raiz.
  "_next", "static", "public", "assets", "favicon", "favicon.ico", "robots",
  "robots.txt", "sitemap", "sitemap.xml", "manifest", "opensearch",

  // Rotas que qualquer versão futura vai querer, em português e em inglês.
  "conta", "contas", "perfil", "definicoes", "faturas", "faturacao", "pagamento",
  "pagamentos", "subscricao", "planos", "precos", "ajuda", "sobre", "contacto",
  "contactos", "suporte", "sair", "registar", "recuperar", "painel", "admin",
  "login", "logout", "signup", "signin", "settings", "account", "billing",
  "pricing", "plans", "about", "contact", "support", "help", "docs", "blog",
  "terms", "privacy", "legal", "status", "app", "www", "mail", "email",
]);

// Finds a free slug near the requested one. Appends -2, -3, ... rather than random
// noise so the URL a user gets is still guessable and speakable.
export async function resolveAvailableSlug(
  repos: RepositoryBundle,
  desired: string,
  forProjectId: string
): Promise<string> {
  const base = slugify(desired) || "site";

  for (let attempt = 1; attempt <= MAX_SLUG_ATTEMPTS; attempt++) {
    const candidate = attempt === 1 ? base : `${base}-${attempt}`;

    if (RESERVED_SLUGS.has(candidate)) continue;

    const existing = await repos.projects.findBySlug(candidate);
    if (!existing || existing.id === forProjectId) {
      return candidate;
    }
  }

  // Deterministic attempts exhausted (50 businesses genuinely called the same thing).
  // A short suffix off the project id keeps this collision-free without a random walk.
  return `${base}-${forProjectId.slice(-6)}`;
}

function stateAtCursor(baseState: PageState, log: readonly OperationRecordRow[], cursor: number): PageState {
  let current = baseState;
  for (const row of log.slice(0, cursor)) {
    for (const operation of row.operations) {
      current = applyOperation(current, operation);
    }
  }
  return current;
}

export interface PublishResult {
  slug: string;
  publishedAt: Date;
}

// Publishes every page of a project at its current cursor. One transaction: a project
// must never end up with a slug but no published page, or half its pages live.
export async function publishProject(
  repos: RepositoryBundle,
  projectId: string,
  now: Date = new Date(),
  // What the owner typed on the address step, when there is one. Only consulted on first
  // publish - see the slug rule below. Falls back to the restaurant's name, which is what
  // every project published before this step existed was slugged from.
  desiredSlug?: string
): Promise<PublishResult> {
  return repos.transaction(async (tx) => {
    const project = await tx.projects.findById(projectId);
    if (!project) {
      throw new Error(`Project "${projectId}" not found`);
    }

    // A slug is claimed once, on first publish, and then kept forever - re-publishing
    // must never change a URL someone may already have shared.
    const slug = project.slug ?? (await resolveAvailableSlug(tx, desiredSlug || project.name, projectId));
    if (project.slug !== slug) {
      await tx.projects.update(projectId, { slug });
    }

    const pages = await tx.pages.listPages(projectId);
    if (pages.length === 0) {
      throw new Error(`Project "${projectId}" has no pages to publish`);
    }

    for (const page of pages) {
      const [baseState, log] = await Promise.all([
        tx.pages.getBaseState(page.id),
        tx.operationLog.list(page.id),
      ]);
      if (!baseState) {
        throw new Error(`Page "${page.id}" is missing its base state`);
      }

      const state = stateAtCursor(baseState, log, page.cursor);
      await tx.pages.setPublishedSnapshot(page.id, { state, index: page.cursor, publishedAt: now });
    }

    await tx.projects.update(projectId, {
      settings: { ...project.settings, publishing: { ...project.settings.publishing, published: true } },
    });

    return { slug, publishedAt: now };
  });
}

// Takes the site offline without discarding the slug: the URL stays reserved for this
// project, so re-publishing later restores the same address rather than handing it to
// whoever asked next.
export async function unpublishProject(repos: RepositoryBundle, projectId: string): Promise<void> {
  await repos.transaction(async (tx) => {
    const project = await tx.projects.findById(projectId);
    if (!project) {
      throw new Error(`Project "${projectId}" not found`);
    }

    const pages = await tx.pages.listPages(projectId);
    for (const page of pages) {
      await tx.pages.setPublishedSnapshot(page.id, null);
    }

    await tx.projects.update(projectId, {
      settings: { ...project.settings, publishing: { ...project.settings.publishing, published: false } },
    });
  });
}

export interface PublishedSite {
  // Needed by the published page to attribute an action to a restaurant. Never rendered.
  projectId: string;
  projectName: string;
  slug: string;
  state: PageState;
  publishedAt: Date;
}

// Every published address, for the sitemap. The counterpart to loadPublishedSite: that
// one answers "is THIS slug live", this one answers "which slugs are live" - and the two
// must never disagree, or we hand the Google a URL that 404s.
//
// Sorted by slug so the sitemap is stable between requests: a file that reshuffles on
// every fetch looks changed to a crawler even when nothing was published.
export async function listPublishedSites(repos: RepositoryBundle): Promise<PublishedSiteRef[]> {
  const sites = await repos.projects.listPublished();
  return sites.sort((a, b) => a.slug.localeCompare(b.slug));
}

// The only read path a public visitor takes. Returns null - never throws, never leaks
// which projects exist - for an unknown slug, an unpublished project, or a project
// whose landing page has no snapshot.
export async function loadPublishedSite(repos: RepositoryBundle, slug: string): Promise<PublishedSite | null> {
  // Antes da base de dados, e não depois. Ver isValidSlug: um slug com outra forma não pode
  // estar guardado, portanto a consulta seria sempre inútil - e é aqui, e não na página,
  // porque assim protege todos os chamadores, incluindo os que ainda não existem.
  if (!isValidSlug(slug)) return null;

  const project = await repos.projects.findBySlug(slug);
  if (!project || !project.settings.publishing.published) {
    return null;
  }

  const pages = await repos.pages.listPages(project.id);
  const landing = pages[0];
  if (!landing) return null;

  const snapshot = await repos.pages.getPublishedSnapshot(landing.id);
  if (!snapshot) return null;

  return {
    projectId: project.id,
    projectName: project.name,
    slug: project.slug ?? slug,
    state: snapshot.state,
    publishedAt: snapshot.publishedAt,
  };
}
