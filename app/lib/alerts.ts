import { createMailer } from "./mailer";

// QUANDO ALGUMA COISA FALHA, ALGUÉM TEM DE SABER
//
// Vinte `console.error` espalhados pelas rotas, a escrever para o journal da máquina. Um
// journal não é lido por iniciativa própria: um restaurante que não consegue publicar às
// nove da noite fecha o separador e não volta, e nós só damos por isso se ele nos disser —
// e a maior parte não diz.
//
// Numa beta de dez restaurantes, três desistências silenciosas são trinta por cento do
// produto a falhar sem deixar rasto.
//
// PORQUE NÃO SENTRY, POR AGORA
//
// O Sentry dá agrupamento, stack traces e versões, e um dia vale a pena. Hoje custava uma
// dependência nova, uma conta, um DSN e um script de terceiros no browser — para responder
// a uma pergunta que são seis sítios no servidor e um email. E o email já existe, porque a
// recuperação de password o obrigou a existir.
//
// Este ficheiro é a costura. No dia em que houver um DSN, muda-se `deliver` e mais nada.
//
// AS DUAS COISAS QUE TORNAM ISTO SEGURO DE LIGAR
//
// 1. NUNCA REBENTA O PEDIDO. Um alerta é observação; se falhar, falha calado. Um produto
//    que deixa de servir um cliente porque não conseguiu queixar-se de outra coisa é pior
//    do que um produto sem alertas.
//
// 2. NUNCA ENTRA EM CICLO. Se o que falhou foi o próprio envio de email, o alerta não pode
//    ser enviado por email. Ver `EMAIL_FAILURE` abaixo.

// Uma falha repetida é a mesma notícia. Um erro de base de dados num pico de tráfego são
// duzentos pedidos a falhar no mesmo minuto, e duzentos emails não dizem mais do que um —
// dizem menos, porque ninguém os lê e a caixa passa a ser ignorada.
const REPEAT_WINDOW_MS = 15 * 60 * 1000;

// Memória do processo, e é honesto dizê-lo: com dois servidores, cada um manda o seu. Isto
// corre num, e passar a contagem para a base de dados era pôr uma escrita no caminho de um
// erro — que é exactamente o momento em que a base de dados pode ser o que está mal.
const lastSent = new Map<string, number>();

export type FailureKind =
  // O pior de todos: o cliente pagou e o produto pode não ficar a saber.
  | "stripe_webhook"
  | "stripe_checkout"
  | "publish"
  | "generation"
  | "upload"
  | "email"
  | "database";

// O envio de email é a única falha que NÃO se anuncia por email. Sem isto, um servidor de
// email em baixo produz um alerta por cada tentativa de alerta, para sempre.
const EMAIL_FAILURE: FailureKind = "email";

export interface FailureReport {
  kind: FailureKind;
  // Uma frase que se lê num telemóvel, às nove da noite, sem abrir o computador.
  summary: string;
  error?: unknown;
  // Só o que ajuda a encontrar a coisa. Nunca uma password, nunca um código de recuperação,
  // nunca o corpo de um email.
  context?: Record<string, string | number | undefined>;
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return String(error);
}

// Exportada para teste: a decisão de repetir ou não é a única lógica aqui que se engana
// sozinha com o tempo.
export function shouldSend(key: string, now: number, window = REPEAT_WINDOW_MS): boolean {
  const last = lastSent.get(key);
  if (last !== undefined && now - last < window) return false;
  lastSent.set(key, now);
  return true;
}

export function resetAlertMemory(): void {
  lastSent.clear();
}

// Fire-and-forget de propósito: quem chama isto está a meio de tratar um erro e não pode
// ficar à espera do nosso email para responder ao cliente.
export function reportFailure(report: FailureReport): void {
  const detail = report.error === undefined ? "" : ` — ${messageOf(report.error)}`;
  const contexto = report.context
    ? Object.entries(report.context)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}=${value}`)
        .join(" ")
    : "";

  // O journal continua a receber tudo, sempre, mesmo o que não é enviado. É lá que se vai
  // ver o que aconteceu à volta depois de o alerta chegar.
  console.error(`[${report.kind}] ${report.summary}${detail}${contexto ? ` (${contexto})` : ""}`);

  if (report.kind === EMAIL_FAILURE) return;

  const to = process.env.ALERT_EMAIL?.trim();
  if (!to) return;

  if (!shouldSend(`${report.kind}:${report.summary}`, Date.now())) return;

  const mailer = createMailer();
  if (!mailer) return;

  void mailer
    .send({
      to,
      subject: `Suvka: ${report.summary}`,
      text: [
        report.summary,
        detail ? `\nErro: ${messageOf(report.error)}` : "",
        contexto ? `\n${contexto}` : "",
        `\nTipo: ${report.kind}`,
        `Hora: ${new Date().toISOString()}`,
        "",
        "Repetições dos próximos 15 minutos não são enviadas. Ver o journal para o resto:",
        "  journalctl -u suvka -n 100 --no-pager",
      ]
        .filter(Boolean)
        .join("\n"),
    })
    .catch((error) => {
      // Sem reportFailure aqui. É o ciclo que este ficheiro existe para não ter.
      console.error(`[email] Falha ao enviar alerta de ${report.kind}: ${messageOf(error)}`);
    });
}
