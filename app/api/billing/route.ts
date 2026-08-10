import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/app/lib/prisma";
import { billingStateFor } from "@/app/lib/billing";
import { billingIsConfigured } from "@/app/lib/stripe";

// Where the owner stands on paying, in one call.
//
// Its own route rather than a field on /api/projects: what follows here is the Stripe
// checkout and the customer portal, and they belong beside this rather than inside a
// projects listing.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, message: "Inicie sessão." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      stripeCustomerId: true,
      subscriptionStatus: true,
      subscriptionEndsAt: true,
      trialStartedAt: true,
    },
  });

  if (!user) {
    // A session whose user row is gone. Publishing already fails with a 500 in this state;
    // answering honestly here is better than pretending they are on a trial.
    return NextResponse.json({ success: false, message: "Conta não encontrada." }, { status: 404 });
  }

  // The dashboard asks before offering a button: a checkout that 500s because no keys are
  // set is worse than no button at all.
  return NextResponse.json({ billing: billingStateFor(user), canSubscribe: billingIsConfigured() });
}
