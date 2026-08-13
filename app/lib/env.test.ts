import { describe, it, expect } from "vitest";
import { checkEnvironment, formatEnvReport } from "./env";

const SECRET = "x".repeat(44);

function production(extra: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://suvka:pw@localhost:5432/suvka",
    AUTH_SECRET: SECRET,
    APP_URL: "https://suvka.com",
    PEXELS_API_KEY: "pexels-abc",
    RESEND_API_KEY: "re_abc",
    MAIL_FROM: "ola@suvka.com",
    ALERT_EMAIL: "operador@suvka.com",
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
      const report = checkEnvironment(production({ AUTH_URL: "http://suvka.com" }));
      expect(names(report.fatal)).toContain("AUTH_URL");
    });

    it("aceita AUTH_URL em https", () => {
      const report = checkEnvironment(production({ AUTH_URL: "https://suvka.com" }));
      expect(names(report.fatal)).not.toContain("AUTH_URL");
    });

    it("recusa um AUTH_URL que não é sequer um endereço", () => {
      const report = checkEnvironment(production({ AUTH_URL: "suvka.com" }));
      expect(names(report.fatal)).toContain("AUTH_URL");
    });
  });

  describe("endereço público", () => {
    // Sem isto o /sitemap.xml sai com URLs de localhost: responde 200, o ficheiro abre, e
    // nenhum restaurante é indexado. Falha silenciosa, que é o que este ficheiro existe
    // para não deixar acontecer.
    it("recusa arrancar em produção sem APP_URL nem AUTH_URL", () => {
      const report = checkEnvironment(production({ APP_URL: undefined }));
      expect(names(report.fatal)).toContain("APP_URL");
    });

    it("aceita só com AUTH_URL, que diz a mesma coisa", () => {
      const report = checkEnvironment(production({ APP_URL: undefined, AUTH_URL: "https://suvka.com" }));
      expect(names(report.fatal)).not.toContain("APP_URL");
    });

    it("recusa APP_URL em http em produção", () => {
      const report = checkEnvironment(production({ APP_URL: "http://suvka.com" }));
      expect(names(report.fatal)).toContain("APP_URL");
    });

    it("recusa um APP_URL que não é um endereço", () => {
      const report = checkEnvironment(production({ APP_URL: "suvka.com" }));
      expect(names(report.fatal)).toContain("APP_URL");
    });

    // Duas variáveis que têm de concordar e podem discordar: as sessões saíam para um
    // domínio e o Google indexava o outro, e o sintoma não aponta para a configuração.
    it("recusa APP_URL e AUTH_URL em domínios diferentes", () => {
      const report = checkEnvironment(production({ APP_URL: "https://suvka.com", AUTH_URL: "https://outro.com" }));
      expect(names(report.fatal)).toContain("APP_URL");
    });

    it("uma barra final não conta como discordância", () => {
      const report = checkEnvironment(production({ APP_URL: "https://suvka.com/", AUTH_URL: "https://suvka.com" }));
      expect(names(report.fatal)).not.toContain("APP_URL");
    });

    it("fora de produção não é preciso configurar nada", () => {
      const report = checkEnvironment({
        NODE_ENV: "development",
        DATABASE_URL: "postgresql://localhost:5432/suvka",
      } as NodeJS.ProcessEnv);
      expect(names(report.fatal)).not.toContain("APP_URL");
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
        DATABASE_URL: "postgresql://localhost/suvka",
        STRIPE_SECRET_KEY: "sk_test_abc",
        STRIPE_PRICE_ID: "price_abc",
        STRIPE_WEBHOOK_SECRET: "whsec_abc",
      } as NodeJS.ProcessEnv);

      expect(report.fatal).toEqual([]);
    });
  });

  describe("fotografias", () => {
    it("recusa um SUVKA_UPLOADS_DIR relativo, que resolveria dentro do repositório", () => {
      const report = checkEnvironment(production({ SUVKA_UPLOADS_DIR: "public/uploads" }));
      expect(names(report.fatal)).toContain("SUVKA_UPLOADS_DIR");
    });

    it("aceita um caminho absoluto", () => {
      const report = checkEnvironment(production({ SUVKA_UPLOADS_DIR: "/srv/suvka-uploads" }));
      expect(names(report.fatal)).not.toContain("SUVKA_UPLOADS_DIR");
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

describe("envio de email", () => {
  const producao = (extra: Record<string, string | undefined>) =>
    checkEnvironment({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://suvka:pw@localhost:5432/suvka",
      AUTH_SECRET: "x".repeat(44),
      APP_URL: "https://suvka.com",
      PEXELS_API_KEY: "pexels-abc",
      RESEND_API_KEY: "re_abc",
      MAIL_FROM: "ola@suvka.com",
      ...extra,
    } as NodeJS.ProcessEnv);

  // Metade da configuração de envio é o mesmo que nenhuma, e é pior porque parece feita.
  it("recusa uma chave sem remetente", () => {
    expect(producao({ MAIL_FROM: undefined }).fatal.map((p) => p.name)).toContain("MAIL_FROM");
  });

  it("recusa um remetente sem chave", () => {
    expect(producao({ RESEND_API_KEY: undefined }).fatal.map((p) => p.name)).toContain("RESEND_API_KEY");
  });

  // Sem nada configurado o site funciona todo - só quem estiver fechado fora da conta é que
  // fica sem saída. Por isso avisa e não mata.
  it("sem envio nenhum, avisa mas deixa arrancar", () => {
    const report = producao({ RESEND_API_KEY: undefined, MAIL_FROM: undefined });

    expect(report.fatal.map((p) => p.name)).not.toContain("RESEND_API_KEY");
    expect(report.warnings.map((p) => p.name)).toContain("RESEND_API_KEY");
  });
});

describe("alertas", () => {
  // O produto funciona todo sem alertas - por isso avisa e não mata. Mas numa beta de dez
  // restaurantes, três desistências silenciosas são trinta por cento do produto a falhar
  // sem deixar rasto.
  it("sem destinatário de alertas, avisa mas deixa arrancar", () => {
    const report = checkEnvironment({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://suvka:pw@localhost:5432/suvka",
      AUTH_SECRET: "x".repeat(44),
      APP_URL: "https://suvka.com",
      PEXELS_API_KEY: "pexels-abc",
      RESEND_API_KEY: "re_abc",
      MAIL_FROM: "ola@suvka.com",
    } as NodeJS.ProcessEnv);

    expect(names(report.fatal)).not.toContain("ALERT_EMAIL");
    expect(names(report.warnings)).toContain("ALERT_EMAIL");
  });

  it("fora de produção não avisa de nada disto", () => {
    const report = checkEnvironment({
      NODE_ENV: "development",
      DATABASE_URL: "postgresql://localhost/suvka",
    } as NodeJS.ProcessEnv);

    expect(names(report.warnings)).not.toContain("ALERT_EMAIL");
  });
});
