import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import { hashResetToken, verdictFor } from "@/app/lib/passwordReset";
import { MIN_PASSWORD_LENGTH } from "@/app/lib/validateSignup";

// DEFINIR A NOVA PALAVRA-PASSE
//
// O mesmo custo do signup - doze rondas, que é perto de meio segundo de CPU. Aqui não há
// travão de tentativas por endereço: para chegar a este ponto é preciso já ter um código de
// 256 bits válido, e quem o tem não precisa de tentar duas vezes.
const SALT_ROUNDS = 12;

export async function POST(request: Request) {
  let token = "";
  let password = "";

  try {
    const body = (await request.json()) as { token?: unknown; password?: unknown };
    token = typeof body.token === "string" ? body.token : "";
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ success: false, message: "Pedido inválido." }, { status: 400 });
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { success: false, message: `A palavra-passe tem de ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` },
      { status: 400 }
    );
  }

  // A procura é pelo RESUMO. O código nunca esteve na base de dados e não vai estar agora.
  const stored = token
    ? await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashResetToken(token) } })
    : null;

  // EXPIRADO, USADO E INEXISTENTE DIZEM A MESMA COISA
  //
  // A diferença interessa-nos a nós, nos registos, para percebermos se uma hora é pouco. Não
  // interessa a quem tem um código velho na mão: dizer-lhe "este já foi usado" confirma-lhe
  // que aquele código foi bom um dia, e para que conta.
  if (!stored || verdictFor(stored) !== "valid") {
    return NextResponse.json(
      { success: false, message: "Este link já não serve. Peça outro e use o mais recente." },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Tudo ou nada. Uma password nova sem o código ficar gasto deixava o link a funcionar
  // outra vez; um código gasto sem a password mudar deixava o dono de fora com o único
  // link que tinha.
  await prisma.$transaction([
    prisma.user.update({ where: { id: stored.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({
      where: { tokenHash: stored.tokenHash },
      data: { usedAt: new Date() },
    }),
    // Os outros pedidos da mesma conta morrem aqui. Quem pediu três links porque o primeiro
    // não chegava não fica com dois por aí a funcionar durante mais uma hora.
    prisma.passwordResetToken.deleteMany({
      where: { userId: stored.userId, usedAt: null },
    }),
  ]);

  return NextResponse.json({ success: true, message: "Palavra-passe alterada. Já pode entrar." });
}
