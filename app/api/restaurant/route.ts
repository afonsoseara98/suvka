import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { repos } from "@/app/lib/repos";
import { createProjectFromGeneration } from "@/app/lib/projectService";
import { createImageProvider, resolveImageSafely } from "@/app/lib/images";
import { validateRestaurantInput, isValid, normaliseRestaurantInput, type RestaurantInput } from "@/app/lib/restaurant/input";
import { buildRestaurantPage, imageQueriesFor } from "@/app/lib/restaurant/buildPage";
import type { ResolvedImage, VisualIntent } from "@/app/ai/types/visual";
import type { BusinessProfile } from "@/app/ai/types";

// Creates a restaurant site from the nine-field form. No model call: the fields ARE the
// content, so generation is instant, free, and structurally incapable of inventing a fact
// the owner did not give.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, message: "Inicie sessão para continuar." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Partial<RestaurantInput>;

    const errors = validateRestaurantInput(body);
    if (!isValid(errors)) {
      return NextResponse.json({ success: false, errors }, { status: 400 });
    }

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

    // Photographs are best-effort by contract: a slow or missing image service must never
    // be what stops someone getting their site (see app/lib/images).
    const seed = Math.abs([...input.name].reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) % 100000;
    const [hero, ...gallery] = await Promise.all([
      resolveImageSafely(provider, intentFor(queries.hero, seed)),
      ...queries.gallery.map((subject, index) => resolveImageSafely(provider, intentFor(subject, seed + index * 131))),
    ]);

    const landing = buildRestaurantPage(input, {
      hero,
      gallery: gallery.filter((image): image is ResolvedImage => image !== null),
    });

    // The stored BusinessProfile is what the owner selected, not what a classifier guessed
    // from prose - which is the whole point of asking.
    const businessProfile = {
      industry: "restaurant",
      businessModel: "local_business",
      primaryGoal: "generate_leads",
      audience: "Local customers",
      tone: "friendly",
      priceLevel: "medium",
    } as BusinessProfile;

    const project = await createProjectFromGeneration(repos, session.user.id, landing, businessProfile, {
      name: input.name,
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Restaurant site creation failed:", error);
    return NextResponse.json({ success: false, message: "Algo correu mal ao criar o site. Tente novamente." }, { status: 500 });
  }
}
