// O QUE TEM DE ESTAR CERTO ANTES DE ISTO ACEITAR O PRIMEIRO PEDIDO
//
// Sem isto, um `.env.production` com uma variável mal escrita produzia um serviço `active`,
// um healthcheck a passar, e a falha entregue ao cliente no segundo em que ele carregava em
// "Ativar subscrição". O erro mais provável do primeiro deploy era também o mais silencioso.
//
// Função pura de propósito: recebe o ambiente e devolve o que está mal. Quem decide morrer é
// o instrumentation.ts, e é lá que essa decisão se lê. Aqui só há regras, e testam-se todas
// sem levantar um servidor.
//
// Nada de Zod. São doze verificações de strings, e o Zod só existe neste projecto como
// dependência transitiva do `openai` e do `next-auth` - promovê-la a directa para isto seria
// passar a depender a sério de uma biblioteca que hoje pode desaparecer num `npm update` sem
// ninguém dar por nada. As mensagens também têm de ser nossas: quem as vai ler está a fazer
// um deploy às onze da noite.

export interface EnvProblem {
  name: string;
  detail: string;
}

export interface EnvReport {
  fatal: EnvProblem[];
  warnings: EnvProblem[];
}

function value(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const raw = env[name]?.trim();
  return raw ? raw : undefined;
}

export function checkEnvironment(env: NodeJS.ProcessEnv): EnvReport {
  const fatal: EnvProblem[] = [];
  const warnings: EnvProblem[] = [];
  const production = env.NODE_ENV === "production";

  const fail = (name: string, detail: string) => fatal.push({ name, detail });
  const warn = (name: string, detail: string) => warnings.push({ name, detail });

  // --- Base de dados ---------------------------------------------------------------
  // Sem isto não há contas, não há projectos e não há sites publicados. É a única que é
  // fatal em qualquer ambiente.
  const database = value(env, "DATABASE_URL");
  if (!database) {
    fail("DATABASE_URL", "em falta - sem base de dados não há contas nem sites publicados");
  } else if (!/^postgres(ql)?:\/\//.test(database)) {
    fail("DATABASE_URL", "tem de começar por postgres:// ou postgresql://");
  }

  // --- Sessões ---------------------------------------------------------------------
  const secret = value(env, "AUTH_SECRET");
  if (!secret) {
    if (production) {
      fail("AUTH_SECRET", "em falta - sem isto ninguém consegue iniciar sessão em produção");
    }
  } else if (secret.length < 32) {
    // `openssl rand -base64 32` dá 44 caracteres. Menos de 32 é quase sempre alguém a ter
    // escrito uma palavra à mão, e quem adivinhar essa palavra assina uma sessão para
    // qualquer conta.
    fail("AUTH_SECRET", `tem ${secret.length} caracteres - use pelo menos 32 (openssl rand -base64 32)`);
  }

  const authUrl = value(env, "AUTH_URL");
  if (authUrl) {
    try {
      const parsed = new URL(authUrl);
      if (production && parsed.protocol !== "https:") {
        fail("AUTH_URL", "tem de ser https:// em produção");
      }
    } catch {
      fail("AUTH_URL", `não é um endereço válido: ${authUrl}`);
    }
  }

  // --- Fotografias -------------------------------------------------------------------
  const uploads = value(env, "NOCTRA_UPLOADS_DIR");
  if (uploads && !uploads.startsWith("/") && !/^[A-Za-z]:[\\/]/.test(uploads)) {
    // Um caminho relativo resolve-se contra o directório de trabalho do processo, que é o
    // repositório - exactamente o sítio de onde as fotografias foram tiradas.
    fail("NOCTRA_UPLOADS_DIR", `tem de ser um caminho absoluto, não "${uploads}"`);
  }

  // --- Pagamentos --------------------------------------------------------------------
  //
  // Grupo, não variáveis soltas. Metade da configuração de pagamentos é pior do que nenhuma:
  // sem chave o produto assume-se sem pagamentos e diz isso ao dono, mas com chave e sem
  // price o botão existe, é carregado, e dá 500 na cara de quem estava a pagar.
  const stripeKey = value(env, "STRIPE_SECRET_KEY");
  const stripePrice = value(env, "STRIPE_PRICE_ID");
  const stripeHook = value(env, "STRIPE_WEBHOOK_SECRET");
  const stripePublishable = value(env, "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");

  if (stripeKey || stripePrice || stripeHook) {
    if (!stripeKey) fail("STRIPE_SECRET_KEY", "em falta, mas o resto do Stripe está configurado");
    if (!stripePrice) fail("STRIPE_PRICE_ID", "em falta - o botão de subscrição existe e falha sem isto");
    if (!stripeHook) {
      fail(
        "STRIPE_WEBHOOK_SECRET",
        "em falta - sem isto o webhook recusa tudo e um pagamento real nunca chega a ser reconhecido"
      );
    }

    if (stripeKey && !stripeKey.startsWith("sk_")) fail("STRIPE_SECRET_KEY", "não parece uma chave Stripe (sk_...)");
    if (stripePrice && !stripePrice.startsWith("price_")) {
      fail("STRIPE_PRICE_ID", `tem de ser um price_..., não "${stripePrice}" (um prod_... não serve)`);
    }
    if (stripeHook && !stripeHook.startsWith("whsec_")) fail("STRIPE_WEBHOOK_SECRET", "tem de começar por whsec_");

    // Chaves de teste em produção: o checkout abre, o cartão é aceite, e não entrou
    // dinheiro nenhum. Falha de propósito, porque o sintoma é indistinguível de sucesso.
    if (production && stripeKey?.startsWith("sk_test_")) {
      fail("STRIPE_SECRET_KEY", "é uma chave de TESTE num ambiente de produção - ninguém seria cobrado a sério");
    }
    if (production && stripePublishable?.startsWith("pk_test_")) {
      fail("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "é uma chave de TESTE num ambiente de produção");
    }
  } else if (production) {
    warn("STRIPE_SECRET_KEY", "sem pagamentos configurados - ninguém consegue subscrever");
  }

  // --- Fotografias de banco ------------------------------------------------------------
  // Ausência é uma configuração suportada (ver createImageProvider: o herói passa a
  // editorial em vez de falso), por isso avisa e não mata. Mas em produção um site de
  // restaurante sem uma única fotografia é meio produto, e ninguém repara sozinho.
  if (production && !value(env, "PEXELS_API_KEY")) {
    warn("PEXELS_API_KEY", "em falta - os sites saem sem fotografias nenhumas");
  }

  return { fatal, warnings };
}

export function formatEnvReport(report: EnvReport): string {
  const lines: string[] = [];

  if (report.fatal.length > 0) {
    lines.push("");
    lines.push("  A configuração está incompleta e o Noctra não vai arrancar:");
    lines.push("");
    for (const problem of report.fatal) lines.push(`    ${problem.name}: ${problem.detail}`);
    lines.push("");
    lines.push("  Corrija o .env.production e reinicie. O exemplo comentado está em");
    lines.push("  deploy/.env.production.example.");
    lines.push("");
  }

  if (report.warnings.length > 0) {
    lines.push("  Avisos (arranca na mesma):");
    for (const problem of report.warnings) lines.push(`    ${problem.name}: ${problem.detail}`);
    lines.push("");
  }

  return lines.join("\n");
}
