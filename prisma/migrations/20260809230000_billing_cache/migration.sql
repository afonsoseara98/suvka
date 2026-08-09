-- Billing state, cached from Stripe.
--
-- Stripe stays the source of truth; these columns exist so rendering a dashboard does not
-- require a call to Stripe. All nullable: every existing user predates billing and none of
-- them is subscribed.
--
-- "trialStartedAt" is the one column that is ours rather than Stripe's - the free month
-- begins when a restaurant first publishes, which happens before any Stripe object exists.
ALTER TABLE "User" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "User" ADD COLUMN "subscriptionStatus" TEXT;
ALTER TABLE "User" ADD COLUMN "subscriptionEndsAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "trialStartedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
