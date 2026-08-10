import Stripe from "stripe";

// ONE PLACE THAT KNOWS STRIPE EXISTS
//
// Same shape as app/lib/repos.ts and app/lib/images: constructed once, from the environment,
// so the rest of the product talks about BillingState (app/lib/billing.ts) and never about
// Stripe. Swapping provider means rewriting this file and the two routes beside it, not
// hunting for calls scattered through the app.
//
// Absent keys are a supported configuration rather than a crash: the whole product - create,
// edit, publish - runs with nothing configured, which is what keeps local development and
// the test suite free of a third-party account. It is also what stopped this from being a
// blocking dependency while the keys did not exist.
let cached: Stripe | null = null;

export function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;

  cached ??= new Stripe(key);
  return cached;
}

export function stripePriceId(): string | null {
  return process.env.STRIPE_PRICE_ID?.trim() || null;
}

// Whether billing can work at all right now. The dashboard asks before offering a button,
// because a checkout button that 500s is worse than no button - which is why there was no
// button until this file existed.
export function billingIsConfigured(): boolean {
  return Boolean(stripeClient() && stripePriceId());
}

const DAY_MS = 24 * 60 * 60 * 1000;
const TRIAL_DAYS = 30;

// WHOSE THIRTY DAYS ARE THESE?
//
// The free month starts when a restaurant goes online (see billing.ts), which is usually
// well before anybody reaches a checkout. Passing Stripe `trial_period_days: 30` would start
// a SECOND thirty days from the moment they subscribe - somebody who publishes, waits three
// weeks and then subscribes would get fifty-one free days, and the dashboard would have been
// lying to them the whole time about when they were charged.
//
// So the trial end is an absolute instant carried over from our clock. Already past means no
// trial at all, and Stripe charges immediately, which is correct: they already had it.
export function trialEndFor(trialStartedAt: Date | null | undefined, now: Date = new Date()): number | undefined {
  if (!trialStartedAt) return undefined;

  const endsAt = trialStartedAt.getTime() + TRIAL_DAYS * DAY_MS;
  if (endsAt <= now.getTime()) return undefined;

  // Stripe wants seconds, and refuses a trial ending less than 48 hours out. Below that,
  // charging now is both what Stripe allows and what is honest.
  const seconds = Math.floor(endsAt / 1000);
  return endsAt - now.getTime() > 2 * DAY_MS ? seconds : undefined;
}
