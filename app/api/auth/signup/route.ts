import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { validateSignup } from "@/app/lib/validateSignup";
import { track } from "@/app/lib/events";
import { getRateLimiter, clientAddress, SIGNUP_IP_LIMIT, SIGNUP_IP_WINDOW_MS } from "@/app/lib/rateLimit";

// Auth.js's Credentials provider only handles sign-*in* - creating the User row is
// conventionally a small hand-written route, not something the provider does for you.
const SALT_ROUNDS = 12;

export async function POST(request: Request) {
  // Antes de tudo, e sobretudo antes do hash. Doze rondas de bcrypt custam perto de meio
  // segundo de CPU cada, no mesmo processo que serve os sites dos restaurantes - criar
  // contas à velocidade da rede era, na prática, um botão para desligar o servidor.
  const limited = await getRateLimiter("signup-ip", SIGNUP_IP_LIMIT, SIGNUP_IP_WINDOW_MS).check(clientAddress(request));
  if (!limited.allowed) {
    return NextResponse.json(
      { success: false, message: "Demasiadas contas criadas a partir daqui. Tente novamente dentro de uma hora." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } }
    );
  }

  try {
    const body = await request.json();
    const validation = validateSignup(body);

    if (!validation.valid) {
      return NextResponse.json({ success: false, message: validation.error }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: validation.email } });
    if (existing) {
      return NextResponse.json({ success: false, message: "Já existe uma conta com este email." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(validation.password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: { email: validation.email, passwordHash, name: validation.name },
    });

    track("signup_completed", { userId: user.id });

    return NextResponse.json({ id: user.id, email: user.email, name: user.name });
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json({ success: false, message: "Não foi possível criar a conta. Tente novamente." }, { status: 500 });
  }
}
