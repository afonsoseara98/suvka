import { describe, it, expect } from "vitest";
import { trialEndFor } from "./stripe";

const now = new Date("2026-08-10T12:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

// WHOSE THIRTY DAYS ARE THESE?
//
// The free month starts when the restaurant goes online, usually weeks before anybody
// reaches a checkout. Passing Stripe `trial_period_days: 30` would start a SECOND thirty
// days at that moment, and the dashboard would have been lying about the charge date the
// whole time.
describe("carrying our trial over to Stripe", () => {
  it("ends the Stripe trial when ours ends, not thirty days from checkout", () => {
    const end = trialEndFor(daysAgo(10), now);
    const expected = Math.floor((daysAgo(10).getTime() + 30 * 24 * 60 * 60 * 1000) / 1000);
    expect(end).toBe(expected);

    // Twenty days left, not thirty.
    const daysLeft = Math.round((end! * 1000 - now.getTime()) / (24 * 60 * 60 * 1000));
    expect(daysLeft).toBe(20);
  });

  it("charges immediately when the free month is already spent", () => {
    // They had it. Handing them another one because they subscribed late is a month given
    // away by accident.
    expect(trialEndFor(daysAgo(45), now)).toBeUndefined();
  });

  it("charges immediately when fewer than two days remain", () => {
    // Stripe refuses a trial ending inside 48 hours, so the honest answer is to charge now
    // rather than send a request that fails.
    expect(trialEndFor(daysAgo(29), now)).toBeUndefined();
  });

  it("has no trial to carry over for somebody who never published", () => {
    expect(trialEndFor(null, now)).toBeUndefined();
    expect(trialEndFor(undefined, now)).toBeUndefined();
  });
});
