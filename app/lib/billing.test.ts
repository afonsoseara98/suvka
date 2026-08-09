import { describe, it, expect } from "vitest";
import { billingStateFor, TRIAL_DAYS } from "./billing";

const now = new Date("2026-08-09T12:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

describe("before anything is published", () => {
  it("has not started the clock", () => {
    expect(billingStateFor({}, now)).toEqual({ kind: "not_started" });
  });
});

describe("the free month", () => {
  it("counts from the day the restaurant went online", () => {
    const state = billingStateFor({ trialStartedAt: daysAgo(0) }, now);
    expect(state).toMatchObject({ kind: "trial", daysLeft: TRIAL_DAYS });
  });

  it("counts down", () => {
    expect(billingStateFor({ trialStartedAt: daysAgo(22) }, now)).toMatchObject({
      kind: "trial",
      daysLeft: 8,
    });
  });

  it("rounds up, so a site live for another nine hours is not shown as zero days", () => {
    // Somebody who reads "faltam 0 dias" cancels something they did not need to cancel.
    const nearlyOver = new Date(now.getTime() - (TRIAL_DAYS * 24 - 9) * 60 * 60 * 1000);
    expect(billingStateFor({ trialStartedAt: nearlyOver }, now)).toMatchObject({
      kind: "trial",
      daysLeft: 1,
    });
  });

  it("ends", () => {
    expect(billingStateFor({ trialStartedAt: daysAgo(31) }, now).kind).toBe("trial_over");
  });
});

// Stripe owns the answer whenever there is one, and these are Stripe's own status strings -
// there is no mapping here to get wrong.
describe("once Stripe has an opinion", () => {
  it("ignores the local clock entirely", () => {
    const state = billingStateFor(
      { trialStartedAt: daysAgo(99), subscriptionStatus: "active", subscriptionEndsAt: new Date("2026-09-09") },
      now
    );
    expect(state).toEqual({ kind: "active", renewsAt: new Date("2026-09-09") });
  });

  it("treats a Stripe trial as a live subscription", () => {
    expect(billingStateFor({ subscriptionStatus: "trialing" }, now).kind).toBe("active");
  });

  it.each(["past_due", "unpaid"])("flags %s", (subscriptionStatus) => {
    expect(billingStateFor({ subscriptionStatus }, now).kind).toBe("past_due");
  });

  it("keeps the end date on a cancellation, because the site stays up until then", () => {
    const endsAt = new Date("2026-08-20");
    expect(billingStateFor({ subscriptionStatus: "canceled", subscriptionEndsAt: endsAt }, now)).toEqual({
      kind: "canceled",
      endsAt,
    });
  });

  it("falls back to the trial for a status it does not recognise", () => {
    // A future Stripe status we have not handled must not silently read as "paying".
    expect(billingStateFor({ subscriptionStatus: "incomplete", trialStartedAt: daysAgo(2) }, now).kind).toBe("trial");
  });
});
