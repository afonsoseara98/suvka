import { NextResponse } from "next/server";
import { reportFailure } from "@/app/lib/alerts";
import { prisma } from "@/app/lib/prisma";
import { appUrl } from "@/app/lib/appUrl";
import { createMailer } from "@/app/lib/mailer";
import { getRateLimiter } from "@/app/lib/rateLimit";
import { issueResetToken, SAME_ANSWER_ALWAYS } from "@/app/lib/passwordReset";

// PEDIR UM LINK PARA VOLTAR A ENTRAR
//
// Sem isto, um dono de restaurante que se esqueça da password perde o acesso ao website do
// próprio negócio para sempre, e a única saída era telefonar-nos.
//
// A RESPOSTA É A MESMA, HAJA CONTA OU NÃO
//
// É a decisão que governa este ficheiro inteiro. "Não existe conta com esse email"
// transformava isto num verificador de contas: mil endereços, e fica-se a saber quais são
// clientes nossos. Num produto onde o cliente é um restaurante com nome e morada públicos,
// isso é o primeiro passo para o atacar por outro lado.
//
// Por isso não há aqui nenhum caminho que devolva coisa diferente - nem quando a conta não
// existe, nem quando existe mas nunca teve password (uma conta futura só de OAuth), nem
// quando o envio falha. Ver o comentário no fim sobre o que isso último custa.

// Cinco por hora por endereço. Não é para proteger o bcrypt - isto não corre nenhum - é para
// que ninguém use o nosso servidor de email como forma de encher a caixa de correio de outra
// pessoa a partir de um formulário público.
const RECOVER_LIMIT = 5;
const RECOVER_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  const address =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const { allowed } = await getRateLimiter("password-reset", RECOVER_LIMIT, RECOVER_WINDOW_MS).check(address);
  if (!allowed) {
    return NextResponse.json(
      { success: false, message: "Demasiados pedidos. Tente novamente daqui a uma hora." },
      { status: 429 }
    );
  }

  let email = "";
  try {
    const body = (await request.json()) as { email?: unknown };
    email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  } catch {
    email = "";
  }

  if (!email) {
    return NextResponse.json({ success: false, message: "Escreva o seu email." }, { status: 400 });
  }

  const mailer = createMailer();
  if (!mailer) {
    // Em produção sem email configurado, isto é a única coisa honesta a dizer. Responder
    // "enviámos" deixava o dono à espera de uma mensagem que nunca foi escrita, e a
    // desconfiar do produto em vez de nos telefonar.
    console.error("Pedido de recuperação sem envio de email configurado.");
    return NextResponse.json(
      { success: false, message: "O envio de emails ainda não está configurado. Contacte-nos em ola@suvka.com." },
      { status: 503 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });

  // A conta não existe, ou existe e não entra por password. Nos dois casos sai a mesma
  // resposta que sairia se tivesse corrido tudo bem.
  if (user?.passwordHash) {
    const { token, tokenHash, expiresAt } = issueResetToken();

    await prisma.passwordResetToken.create({ data: { tokenHash, userId: user.id, expiresAt } });

    const link = `${appUrl()}/recuperar/${token}`;

    try {
      await mailer.send({
        to: email,
        subject: "Voltar a entrar no Suvka",
        text: [
          "Recebemos um pedido para definir uma nova palavra-passe na sua conta Suvka.",
          "",
          link,
          "",
          "O link é válido durante uma hora e só pode ser usado uma vez.",
          "",
          "Se não foi você que pediu, não precisa de fazer nada — a sua palavra-passe atual continua a funcionar.",
        ].join("\n"),
      });
    } catch (error) {
      // Registamos que falhou, e para quem. Nunca o corpo, que leva o código lá dentro.
      // Nunca o corpo, que leva o código lá dentro - só o facto e para quem.
      reportFailure({
        kind: "email",
        summary: "Falha ao enviar email de recuperação de palavra-passe",
        error,
        context: { destinatario: email },
      });
      // E mesmo assim sai a mesma resposta. É o custo desta decisão, e é real: um dono cujo
      // email falhou fica a olhar para uma mensagem a dizer que está tudo bem. A alternativa
      // - dizer que falhou - responde de maneira diferente consoante a conta exista, que é
      // precisamente o que este ficheiro existe para não fazer.
    }
  }

  return NextResponse.json({ success: true, message: SAME_ANSWER_ALWAYS });
}
