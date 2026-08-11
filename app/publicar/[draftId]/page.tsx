import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { draftStore } from "@/app/lib/restaurant/draftStore";
import { slugify } from "@/app/lib/publishService";
import AddressStep from "./AddressStep";

export const dynamic = "force-dynamic";

// A private step between "I want this" and "it is online".
export const metadata: Metadata = {
  title: "O endereço do seu site — Suvka",
  robots: { index: false, follow: false, nocache: true },
};

// THE ADDRESS STEP
//
// Publishing used to derive the URL silently from the restaurant's name and hand it over
// after the fact. That address is the thing the owner reads out over the phone and prints
// on a card - and if the name was taken they were quietly given "tasca-do-sameiro-2"
// without ever being asked.
//
// So it is a step, with the name they would have got already filled in, because most people
// should be able to press the button without typing anything.
//
// Today it produces /s/<slug> on this origin. The plan is <slug>.suvka.com, which needs a
// domain, wildcard DNS and a server that exists - none of which do yet. Deliberately the
// same slug either way, so that day is a DNS change and not a migration of everybody's URL.
export default async function PublishStep({ params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  const draft = await draftStore.get(draftId);

  // Expired and never-existed answer the same way, as everywhere a draft id is read.
  if (!draft) notFound();

  // Deliberately NOT behind RequireAuth: this is where the account is created. Sending an
  // anonymous visitor to a sign-in page first is the detour this step exists to remove.
  // Authorisation is the draft id, exactly as on the preview and the photo endpoints, and
  // /api/restaurant/publish still refuses without a session.
  return <AddressStep draftId={draft.id} name={draft.input.name} suggested={slugify(draft.input.name) || "site"} />;
}
