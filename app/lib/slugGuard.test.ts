import { describe, it, expect } from "vitest";
import { isValidSlug, loadPublishedSite } from "./publishService";
import { createInMemoryRepositories } from "./repositories/memory";
import type { RepositoryBundle } from "./repositories/types";

// O QUE CAUSOU O SQLSTATE 22021 EM PRODUÇÃO
//
// Desde que os sites passaram para a raiz do domínio, `app/[slug]` apanha TUDO o que não
// corresponde a uma rota estática. Um varrimento pediu um caminho com um byte nulo, o Next
// entregou-o como `params.slug` já descodificado, e o Postgres recusou o parâmetro antes
// sequer de o comparar com alguma coisa.
//
// Daí o stacktrace apontar para `prisma.project.findUnique()` num problema de input: um
// SELECT dá 22021 exactamente como um INSERT, porque a validação da codificação acontece no
// parâmetro e não na escrita. Nada foi guardado, nada ficou corrompido.
//
// O byte nulo era o único sintoma que dava erro. O que não dava erro nenhum era cada 404 da
// internet inteira a custar duas idas ao Postgres, num endpoint público, sem sessão e sem
// limite de pedidos.

// Construído em código e nunca escrito à mão: um byte nulo dentro de um ficheiro fonte é
// invisível em todos os editores e sobrevive a copiar-colar sem ninguém dar por ele.
const NUL = String.fromCharCode(0);

describe("isValidSlug", () => {
  it("recusa o caminho exacto que produziu o erro em produção", () => {
    expect(isValidSlug(`taberna${NUL}`)).toBe(false);
    expect(isValidSlug(NUL)).toBe(false);
    expect(isValidSlug(`${NUL}wp-config`)).toBe(false);
  });

  it("recusa tudo o que o slugify nunca produziria", () => {
    for (const impossivel of [
      "",
      "Taberna",
      "taberna do bairro",
      "taberna/../etc/passwd",
      "taberna%00",
      "wp-login.php",
      "café",
      ".env",
      "a".repeat(200),
    ]) {
      expect(isValidSlug(impossivel), impossivel).toBe(false);
    }
  });

  it("aceita o que o slugify produz", () => {
    for (const real of ["taberna-do-goncalo", "a", "adega-2", "padaria-ceu-azul"]) {
      expect(isValidSlug(real), real).toBe(true);
    }
  });

  // O TETO NÃO É 60, E ERRAR ISTO APAGAVA UM SITE DO MAPA
  //
  // O slugify corta a 60, mas o resolveAvailableSlug acrescenta por cima quando o endereço
  // está ocupado: `-2` até `-50`, e `-<6 hex>` quando as cinquenta se esgotam. Um limite de
  // 60 aqui rejeitava o site de um restaurante de nome comprido cujo endereço já estava
  // tomado - com um 404, e sem erro em lado nenhum.
  it("aceita um slug com o sufixo de desempate, que passa dos 60", () => {
    const base = "a".repeat(60);

    expect(isValidSlug(base)).toBe(true);
    expect(isValidSlug(`${base}-2`)).toBe(true);
    expect(isValidSlug(`${base}-a1b2c3`)).toBe(true);
    expect(isValidSlug(`${base}-a1b2c3x`)).toBe(false);
  });
});

// A guarda tem de evitar a CONSULTA, não só o erro. Um slug impossível que ainda fosse
// perguntado à base de dados continuava a pôr o tráfego de bots em cima do Postgres.
describe("a guarda evita a ida à base de dados", () => {
  function espiar(repos: RepositoryBundle) {
    let consultas = 0;
    const espiado: RepositoryBundle = {
      ...repos,
      projects: {
        ...repos.projects,
        findBySlug: async (slug: string) => {
          consultas += 1;
          return repos.projects.findBySlug(slug);
        },
      },
    };
    return { espiado, contagem: () => consultas };
  }

  it("não pergunta nada por um slug impossível", async () => {
    const { espiado, contagem } = espiar(createInMemoryRepositories());

    expect(await loadPublishedSite(espiado, `taberna${NUL}`)).toBeNull();
    expect(await loadPublishedSite(espiado, "wp-login.php")).toBeNull();
    expect(await loadPublishedSite(espiado, "../../etc/passwd")).toBeNull();

    expect(contagem()).toBe(0);
  });

  it("continua a perguntar por um slug possível que não existe", async () => {
    const { espiado, contagem } = espiar(createInMemoryRepositories());

    expect(await loadPublishedSite(espiado, "nao-existe-mas-e-valido")).toBeNull();

    expect(contagem()).toBe(1);
  });
});
