import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { repos } from "@/app/lib/repos";
import { slugify, resolveAvailableSlug, RESERVED_SLUGS } from "@/app/lib/publishService";

// IS THIS ADDRESS FREE?
//
// The owner is about to choose the address of their restaurant's website - the thing they
// will read out over the phone and print on a card. Finding out it was taken after pressing
// the button, and being silently given "tasca-do-sameiro-2" instead, is the kind of small
// betrayal that is very hard to undo.
//
// Behind sign-in because the address step happens after the account exists, and there is no
// reason to hand an open endpoint for walking the list of published sites - even though
// each one is public on its own.
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, message: "Inicie sessão." }, { status: 401 });
  }

  const raw = new URL(request.url).searchParams.get("value") ?? "";
  const slug = slugify(raw);

  if (!slug) {
    return NextResponse.json({
      slug: "",
      available: false,
      message: "Escreva um endereço. Só letras, números e hífenes.",
    });
  }

  if (RESERVED_SLUGS.has(slug)) {
    // Reserved because it is (or will be) a real route on this origin.
    return NextResponse.json({
      slug,
      available: false,
      message: "Este endereço está reservado. Escolha outro.",
      suggestion: await resolveAvailableSlug(repos, slug, ""),
    });
  }

  const existing = await repos.projects.findBySlug(slug);
  if (existing) {
    return NextResponse.json({
      slug,
      available: false,
      message: "Já está ocupado.",
      // Offered rather than imposed: the owner decides whether -2 is acceptable on
      // something they are going to say out loud.
      suggestion: await resolveAvailableSlug(repos, slug, ""),
    });
  }

  return NextResponse.json({ slug, available: true, message: "Disponível." });
}
