import { redirect } from "next/navigation";

// THE OLD FRONT DOOR, CLOSED
//
// This used to be the free-text generator: a textarea headed "🚀 AI Landing Page Generator
// - Landing Pages that actually convert", which sent a prompt to a model and handed off to
// the editor. It was the whole product before the restaurant pivot.
//
// It stayed reachable long after that, and the dashboard still pointed at it: an owner who
// signed up through the restaurant flow pressed "+ New Project" and landed in a different
// product, in English, being asked to describe a business in prose.
//
// A redirect rather than a deletion, because the URL is in browser histories and in
// whatever we sent people before the pivot. Anyone who arrives lands where they meant to.
//
// The generator itself is not deleted - app/api/generate and the free-text pipeline behind
// it are what the benchmark still measures against. Nothing in the customer-facing flow
// reaches them any more.
export default function NewProject() {
  redirect("/new/restaurant");
}
