import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { reportFailure } from "@/app/lib/alerts";
import { prisma } from "@/app/lib/prisma";
import { stripeClient } from "@/app/lib/stripe";

// WHERE STRIPE TELLS US WHAT IT DECIDED
//
// Every subscription fact in this product comes from here. Nothing else writes
// subscriptionStatus, because anything else would be a guess about state that lives on
// Stripe's side - a card declining, a renewal succeeding, somebody cancelling from the
// portal. None of those pass through our app at all.
//
// The signature check is not optional. This endpoint is public by necessity, and without
// verification anyone who knows the URL can post "subscription active" for any customer
// they can name. Missing secret means every request is refused rather than trusted.
export async function POST(request: Request) {
  const stripe = stripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!stripe || !secret) {
    console.error("Stripe webhook received while unconfigured - refusing.");
    return NextResponse.json({ received: false }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ received: false }, { status: 400 });

  // The raw body, not the parsed one: the signature is computed over the exact bytes, and
  // JSON.parse followed by JSON.stringify does not reproduce them.
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, secret);
  } catch (error) {
    console.error("Stripe webhook signature rejected:", error);
    return NextResponse.json({ received: false }, { status: 400 });
  }

  try {
    await handle(stripe, event);
  } catch (error) {
    // A 500 makes Stripe retry, which is what we want for a transient database failure.
    //
    // E é o alerta que mais interessa deste produto inteiro: este é o único sítio que
    // escreve o estado da subscrição. Se isto falhar, o cliente foi cobrado pelo Stripe e o
    // produto não ficou a saber - cobrado e sem reconhecimento, que é a pior combinação
    // possível e a que acaba em chargeback. O Stripe repete, mas se as repetições também
    // falharem ninguém dá por nada durante dias.
    reportFailure({
      kind: "stripe_webhook",
      summary: `Webhook do Stripe falhou: ${event.type}`,
      error,
      context: { evento: event.id, tipo: event.type },
    });
    return NextResponse.json({ received: false }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handle(stripe: Stripe, event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (!session.subscription || !session.customer) return;

      const subscription = await stripe.subscriptions.retrieve(String(session.subscription));
      await save(String(session.customer), subscription);
      return;
    }

    // Renewals, cancellations, cards failing, trials converting - all of it arrives here.
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await save(String(subscription.customer), subscription);
      return;
    }
  }
}

async function save(customerId: string, subscription: Stripe.Subscription): Promise<void> {
  // The period end is what the dashboard shows as "renova a" and, after a cancellation, as
  // "o site fica online ate" - so a cancelled subscription keeps its date rather than
  // reading as though the site went down the moment they cancelled.
  const endsAtSeconds =
    (subscription as unknown as { current_period_end?: number }).current_period_end ??
    subscription.items.data[0]?.current_period_end;

  // updateMany rather than update: a webhook for a customer we do not recognise must be a
  // no-op, not a crash that makes Stripe retry it forever.
  await prisma.user.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      subscriptionStatus: subscription.status,
      subscriptionEndsAt: endsAtSeconds ? new Date(endsAtSeconds * 1000) : null,
    },
  });
}
