// WHEN DOES THIS RESTAURANT PAY?
//
// The landing promises 19 EUR a month with the first free, and from the account onwards the
// product said nothing about money at all. An owner who has just put his restaurant online
// is left waiting for an invoice without knowing when - which is the wrong feeling to give
// somebody two minutes after the best moment in the product.
//
// Stripe is the source of truth for a subscription that exists. This module answers the
// question before one does, and it answers it from a single fact: when the restaurant first
// went online. Deliberately no money, no card and no Stripe call - only a clock.

export const TRIAL_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface BillingSnapshot {
  stripeCustomerId?: string | null;
  subscriptionStatus?: string | null;
  subscriptionEndsAt?: Date | null;
  trialStartedAt?: Date | null;
}

export type BillingState =
  // Nothing published yet, so nothing has started.
  | { kind: "not_started" }
  | { kind: "trial"; daysLeft: number; endsAt: Date }
  | { kind: "trial_over"; endsAt: Date }
  | { kind: "active"; renewsAt: Date | null }
  | { kind: "past_due" }
  | { kind: "canceled"; endsAt: Date | null };

// Rounded UP, because "faltam 0 dias" while the site is still live for another nine hours is
// a sentence that makes somebody cancel something they did not need to cancel.
function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / DAY_MS);
}

export function billingStateFor(user: BillingSnapshot, now: Date = new Date()): BillingState {
  // Stripe's answer wins whenever there is one. These are Stripe's own status strings, so
  // there is no mapping to get wrong.
  switch (user.subscriptionStatus) {
    case "active":
    case "trialing":
      return { kind: "active", renewsAt: user.subscriptionEndsAt ?? null };
    case "past_due":
    case "unpaid":
      return { kind: "past_due" };
    case "canceled":
      return { kind: "canceled", endsAt: user.subscriptionEndsAt ?? null };
  }

  if (!user.trialStartedAt) return { kind: "not_started" };

  const endsAt = new Date(user.trialStartedAt.getTime() + TRIAL_DAYS * DAY_MS);
  const daysLeft = daysBetween(now, endsAt);

  return daysLeft > 0 ? { kind: "trial", daysLeft, endsAt } : { kind: "trial_over", endsAt };
}
