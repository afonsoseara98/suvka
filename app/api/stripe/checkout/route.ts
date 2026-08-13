import { NextResponse } from "next/server";
import { reportFailure } from "@/app/lib/alerts";
import { auth } from "@/auth";
import { prisma } from "@/app/lib/prisma";
import { stripeClient, stripePriceId, trialEndFor } from "@/app/lib/stripe";
import { appUrl } from "@/app/lib/appUrl";

// Starts a subscription. One plan, 19 EUR a month, and the free period already under way.
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, message: "Inicie sessão." }, { status: 401 });
  }

  const stripe = stripeClient();
  const price = stripePriceId();
  if (!stripe || !price) {
    return NextResponse.json({ success: false, message: "Os pagamentos ainda não estão configurados." }, { status: 503 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, stripeCustomerId: true, trialStartedAt: true },
    });
    if (!user) {
      return NextResponse.json({ success: false, message: "Conta não encontrada." }, { status: 404 });
    }

    // Reused across attempts. Without this, somebody who opens checkout and closes it three
    // times becomes three customers in Stripe, and the webhook then updates whichever one
    // paid while the other two sit there looking like churn.
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        // The link back. A webhook arrives with a customer and has to find the account.
        metadata: { userId: session.user.id },
      });
      customerId = customer.id;
      await prisma.user.update({ where: { id: session.user.id }, data: { stripeCustomerId: customerId } });
    }

    // Da configuração, não do pedido. Atrás do Caddy o Node é contactado em
    // http://127.0.0.1:3000, e um `origin` reconstruído daqui devolvia quem acabou de pagar
    // 19 EUR para um endereço http:// - resolve-se sozinho, porque o Caddy redirecciona,
    // mas o momento em que isso acontece é o segundo a seguir a alguém pagar, que é o pior
    // momento do produto para uma volta a mais pelo texto simples.
    const origin = appUrl();
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      // Carried over from our own clock rather than restarting - see trialEndFor.
      subscription_data: { trial_end: trialEndFor(user.trialStartedAt) },
      success_url: `${origin}/dashboard?subscricao=ativa`,
      cancel_url: `${origin}/dashboard`,
      // The invoice needs one, and asking here is the last moment it costs nothing.
      billing_address_collection: "auto",
      locale: "pt",
    });

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    // O cliente carregou em pagar e não chegou ao checkout. Não perdemos dinheiro dele -
    // perdemos a subscrição inteira, e ele não volta a tentar.
    reportFailure({ kind: "stripe_checkout", summary: "Não foi possível abrir o checkout do Stripe", error });
    return NextResponse.json({ success: false, message: "Não foi possível abrir o pagamento. Tente novamente." }, { status: 500 });
  }
}
