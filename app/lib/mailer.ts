// O PRIMEIRO EMAIL QUE ESTE PRODUTO ENVIA
//
// Não havia nenhum. Está escrito no LAUNCH_BLOCKERS.md, e era o que tornava a recuperação de
// password impossível: o produto não tinha como falar com um cliente fora do browser dele.
//
// SEM DEPENDÊNCIA NOVA, DE PROPÓSITO
//
// A escolha óbvia era o nodemailer. Mas o que isto faz é um POST com JSON, e o `fetch` já cá
// está — o mesmo raciocínio que manteve o Zod fora do projecto (ver app/lib/env.ts). Uma
// dependência que trata de SMTP, anexos, filas e cinco protocolos, para enviar um email de
// texto, é superfície que alguém tem de manter actualizada para sempre.
//
// A IMPLEMENTAÇÃO É DE UM FORNECEDOR, E ISSO ESTÁ ADMITIDO
//
// O corpo abaixo é o formato da Resend. Trocar de fornecedor é reescrever `send` — quinze
// linhas — e nada fora deste ficheiro sabe qual é. Escolhi um para o produto poder enviar
// emails hoje; a decisão comercial de qual usar continua por tomar e não fica presa por isto.
//
// SEM CHAVE CONFIGURADA, O PRODUTO NÃO FINGE
//
// `createMailer()` devolve null, quem chama sabe que não há como enviar, e diz isso a quem
// está à espera. A alternativa - engolir o erro e responder "enviámos" - deixava um dono de
// restaurante à espera de um email que nunca foi escrito. O mesmo desenho do
// createImageProvider, e pela mesma razão.

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

class ResendMailer implements Mailer {
  constructor(
    private readonly apiKey: string,
    private readonly from: string
  ) {}

  async send(mail: Mail): Promise<void> {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: this.from, to: [mail.to], subject: mail.subject, text: mail.text }),
    });

    if (!response.ok) {
      // O corpo do erro do fornecedor, mas nunca o corpo do email: um assunto e um destinatário
      // no journal são aceitáveis; o texto, que aqui leva um código de recuperação, não é.
      throw new Error(`Envio recusado (HTTP ${response.status})`);
    }
  }
}

// Em desenvolvimento, escreve na consola em vez de recusar. Quem está a trabalhar no fluxo
// precisa de ver o link; quem está em produção precisa que isto NUNCA aconteça - e não
// acontece, porque só existe fora de produção.
class ConsoleMailer implements Mailer {
  async send(mail: Mail): Promise<void> {
    console.log(`\n[email para ${mail.to}] ${mail.subject}\n${mail.text}\n`);
  }
}

export function createMailer(env: NodeJS.ProcessEnv = process.env): Mailer | null {
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.MAIL_FROM?.trim();

  if (apiKey && from) return new ResendMailer(apiKey, from);
  if (env.NODE_ENV !== "production") return new ConsoleMailer();

  return null;
}
