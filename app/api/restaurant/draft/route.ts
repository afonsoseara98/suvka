import { NextResponse } from "next/server";
import { reportFailure } from "@/app/lib/alerts";
import { createImageProvider, resolveImageSafely } from "@/app/lib/images";
import { getRateLimiter, DRAFT_LIMIT, DRAFT_WINDOW_MS } from "@/app/lib/rateLimit";
import { draftStore } from "@/app/lib/restaurant/draftStore";
import { validateRestaurantInput, isValid, normaliseRestaurantInput, type RestaurantInput } from "@/app/lib/restaurant/input";
import { track } from "@/app/lib/events";
import { buildRestaurantPage, imageQueriesFor } from "@/app/lib/restaurant/buildPage";
import type { ResolvedImage, VisualIntent } from "@/app/ai/types/visual";

// PUBLIC. No session required, on purpose.
//
// Anyone can generate a site and look at it. The account is asked for at the moment it
// starts to matter - when they want to publish - because that is when it buys them
// something rather than costing them something.
//
// Nothing is written to the database here. The result lives in the draft store until
// someone claims it (see draftStore.ts), so a visitor who never returns leaves nothing
// behind.
export async function POST(request: Request) {
  // Keyed on IP rather than user id, because there is no user. This is the one endpoint
  // that does real work for an anonymous caller, so it is the one that needs the ceiling.
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const { allowed, retryAfterSeconds } = await getRateLimiter("draft", DRAFT_LIMIT, DRAFT_WINDOW_MS).check(ip);
  if (!allowed) {
    return NextResponse.json(
      { success: false, message: `Já criou vários sites nesta hora. Tente novamente em ${Math.ceil(retryAfterSeconds / 60)} minutos.` },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }

  try {
    const body = (await request.json()) as Partial<RestaurantInput>;

    // The public form does not ask for an email; it comes from the account at publish time.
    const errors = validateRestaurantInput(body, { requireEmail: false });
    if (!isValid(errors)) {
      return NextResponse.json({ success: false, errors }, { status: 400 });
    }

    // The email used to be blanked here, because the public form never asked for one and an
    // anonymous visitor should not be handing over contact details before deciding to sign
    // up. That reasoning does not cover this field any more: what the form now asks for
    // optionally is the RESTAURANT's public contact address, typed to be printed on its own
    // website. Blanking it threw away something the owner deliberately filled in, and the
    // Email row silently never appeared.
    const input = normaliseRestaurantInput(body as RestaurantInput);
    const queries = imageQueriesFor(input);
    const provider = createImageProvider();

    const intentFor = (subject: string, seed: number): VisualIntent => ({
      treatment: "photo",
      subject,
      alternateSubjects: ["restaurant food", "restaurant interior"],
      alt: subject,
      orientation: "landscape",
      variantSeed: seed,
      scene: "website",
    });

    const seed = Math.abs([...input.name].reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) % 100000;
    const [hero, ...gallery] = await Promise.all([
      resolveImageSafely(provider, intentFor(queries.hero, seed)),
      ...queries.gallery.map((subject, index) => resolveImageSafely(provider, intentFor(subject, seed + index * 131))),
    ]);

    const landing = buildRestaurantPage(input, {
      hero,
      gallery: gallery.filter((image): image is ResolvedImage => image !== null),
    });

    const draft = await draftStore.create(input, landing);
    // The top of the funnel. Everything downstream is measured as a fraction of this.
    track("preview_created", { draftId: draft.id });

    return NextResponse.json({ id: draft.id }, { status: 201 });
  } catch (error) {
    // O primeiro contacto com o produto. Quem falha aqui nunca chega a ver um site.
    reportFailure({ kind: "generation", summary: "Geração de um site falhou", error });
    return NextResponse.json({ success: false, message: "Algo correu mal ao criar o site. Tente novamente." }, { status: 500 });
  }
}
