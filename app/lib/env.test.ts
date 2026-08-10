import { describe, it, expect } from "vitest";
import { checkEnvironment, formatEnvReport } from "./env";

const SECRET = "x".repeat(44);

function production(extra: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://noctra:pw@localhost:5432/noctra",
    AUTH_SECRET: SECRET,
    PEXELS_API_KEY: "pexels-abc",
    ...extra,
  } as NodeJS.ProcessEnv;
}

const names = (problems: { name: string }[]) => problems.map((p) => p.name);

describe("checkEnvironment", () => {
  it("aceita uma produção completa sem pagamentos, avisando que ninguém pode subscrever", () => {
    const report = checkEnvironment(production());

    expect(report.fatal).toEqual([]);
    expect(names(report.warnings)).toEqual(["STRIPE_SECRET_KEY"]);
  });

  it("aceita uma produção completa com pagamentos", () => {
    const report = checkEnvironment(
      production({
        STRIPE_SECRET_KEY: "sk_live_abc",
        STRIPE_PRICE_ID: "price_abc",
        STRIPE_WEBHOOK_SECRET: "whsec_abc",
      })
    );

    expect(report.fatal).toEqual([]);
    expect(report.warnings).toEqual([]);
  });

  describe("base de dados", () => {
    it("recusa arrancar sem DATABASE_URL", () => {
      const report = checkEnvironment(production({ DATABASE_URL: undefined }));
      expect(names(report.fatal)).toContain("DATABASE_URL");
    });

    it("recusa uma DATABASE_URL que não é Postgres", () => {
      const report = checkEnvironment(production({ DATABASE_URL: "mysql://x" }));
      expect(names(report.fatal)).toContain("DATABASE_URL");
    });

    it("trata uma variável só com espaços como ausente", () => {
      const report = checkEnvironment(production({ DATABASE_URL: "   " }));
      expect(names(report.fatal)).toContain("DATABASE_URL");
    });
  });

  describe("sessões", () => {
    it("recusa produção sem AUTH_SECRET", () => {
      const report = checkEnvironment(production({ AUTH_SECRET: undefined }));
      expect(names(report.fatal)).toContain("AUTH_SECRET");
    });

    it("recusa um AUTH_SECRET curto, que é quase sempre uma palavra escrita à mão", () => {
      const report = checkEnvironment(production({ AUTH_SECRET: "segredo" }));
      expect(names(report.fatal)).toContain("AUTH_SECRET");
    });

    it("recusa AUTH_URL em http em produção", () => {
      const report = checkEnvironment(production({ AUTH_URL: "http://noctra.pt" }));
      expect(names(report.fatal)).toContain("AUTH_URL");
    });

    it("aceita AUTH_URL em https", () => {
      const report = checkEnvironment(production({ AUTH_URL: "https://noctra.pt" }));
      expect(names(report.fatal)).not.toContain("AUTH_URL");
    });

    it("recusa um AUTH_URL que não é sequer um endereço", () => {
      const report = checkEnvironment(production({ AUTH_URL: "noctra.pt" }));
      expect(names(report.fatal)).toContain("AUTH_URL");
    });
  });

  describe("pagamentos", () => {
    // O caso do BLOCKER #2: metade da configuração é pior do que nenhuma, porque o botão
    // aparece e falha em vez de não aparecer.
    it("recusa uma chave Stripe sem price nem webhook", () => {
      const report = checkEnvironment(production({ STRIPE_SECRET_KEY: "sk_live_abc" }));

      expect(names(report.fatal)).toContain("STRIPE_PRICE_ID");
      expect(names(report.fatal)).toContain("STRIPE_WEBHOOK_SECRET");
    });

    it("apanha o STRIPE_SECRETKEY mal escrito pela ausência do certo", () => {
      const report = checkEnvironment(
        production({ STRIPE_SECRETKEY: "sk_live_abc", STRIPE_PRICE_ID: "price_abc", STRIPE_WEBHOOK_SECRET: "whsec_abc" })
      );

      expect(names(report.fatal)).toContain("STRIPE_SECRET_KEY");
    });

    it("recusa um prod_ onde tem de estar um price_", () => {
      const report = checkEnvironment(
        production({ STRIPE_SECRET_KEY: "sk_live_abc", STRIPE_PRICE_ID: "prod_abc", STRIPE_WEBHOOK_SECRET: "whsec_abc" })
      );

      expect(names(report.fatal)).toContain("STRIPE_PRICE_ID");
    });

    it("recusa chaves de TESTE em produção - o checkout abriria e não entrava dinheiro", () => {
      const report = checkEnvironment(
        production({ STRIPE_SECRET_KEY: "sk_test_abc", STRIPE_PRICE_ID: "price_abc", STRIPE_WEBHOOK_SECRET: "whsec_abc" })
      );

      expect(names(report.fatal)).toContain("STRIPE_SECRET_KEY");
    });

    it("recusa uma chave publicável de teste em produção", () => {
      const report = checkEnvironment(
        production({
          STRIPE_SECRET_KEY: "sk_live_abc",
          NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_abc",
          STRIPE_PRICE_ID: "price_abc",
          STRIPE_WEBHOOK_SECRET: "whsec_abc",
        })
      );

      expect(names(report.fatal)).toContain("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
    });

    it("aceita chaves de teste fora de produção", () => {
      const report = checkEnvironment({
        NODE_ENV: "development",
        DATABASE_URL: "postgresql://localhost/noctra",
        STRIPE_SECRET_KEY: "sk_test_abc",
        STRIPE_PRICE_ID: "price_abc",
        STRIPE_WEBHOOK_SECRET: "whsec_abc",
      } as NodeJS.ProcessEnv);

      expect(report.fatal).toEqual([]);
    });
  });

  describe("fotografias", () => {
    it("recusa um NOCTRA_UPLOADS_DIR relativo, que resolveria dentro do repositório", () => {
      const report = checkEnvironment(production({ NOCTRA_UPLOADS_DIR: "public/uploads" }));
      expect(names(report.fatal)).toContain("NOCTRA_UPLOADS_DIR");
    });

    it("aceita um caminho absoluto", () => {
      const report = checkEnvironment(production({ NOCTRA_UPLOADS_DIR: "/srv/noctra-uploads" }));
      expect(names(report.fatal)).not.toContain("NOCTRA_UPLOADS_DIR");
    });

    it("avisa, sem matar, quando não há chave de fotografias", () => {
      const report = checkEnvironment(production({ PEXELS_API_KEY: undefined }));

      expect(names(report.fatal)).not.toContain("PEXELS_API_KEY");
      expect(names(report.warnings)).toContain("PEXELS_API_KEY");
    });
  });

  it("junta vários problemas em vez de parar no primeiro", () => {
    const report = checkEnvironment({ NODE_ENV: "production", STRIPE_SECRET_KEY: "sk_test_abc" } as NodeJS.ProcessEnv);

    expect(names(report.fatal)).toEqual(
      expect.arrayContaining(["DATABASE_URL", "AUTH_SECRET", "STRIPE_PRICE_ID", "STRIPE_WEBHOOK_SECRET"])
    );
  });
});

describe("formatEnvReport", () => {
  it("nomeia cada variável e diz onde está o exemplo", () => {
    const text = formatEnvReport(checkEnvironment(production({ DATABASE_URL: undefined })));

    expect(text).toContain("DATABASE_URL");
    expect(text).toContain("deploy/.env.production.example");
  });

  it("é vazio quando não há nada a dizer", () => {
    const text = formatEnvReport({ fatal: [], warnings: [] });
    expect(text).toBe("");
  });
});
