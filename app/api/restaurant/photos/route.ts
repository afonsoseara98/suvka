import { NextResponse } from "next/server";
import { getGenerateRateLimiter } from "@/app/lib/rateLimit";
import { draftStore } from "@/app/lib/restaurant/draftStore";
import { photoStore } from "@/app/lib/restaurant/photoStore";
import { rejectPhoto, MAX_PHOTOS, isOwnPhoto, UPLOAD_PREFIX } from "@/app/lib/restaurant/photoLimits";
import type { GalleryImage } from "@/app/types/landing";

// PUBLIC, like the rest of the pre-account flow. Someone who has not signed up yet must be
// able to see their own food on their own page - that is the moment the preview stops being
// a demo, and putting it behind an account would move it to after the decision it is meant
// to inform.
//
// Holding the draft id is the authorisation. It is unguessable (see draftStore) and nobody
// else has it, so nobody else can add photographs to a stranger's site.
function clientKey(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: Request) {
  const { allowed, retryAfterSeconds } = await getGenerateRateLimiter().check(`photo:${clientKey(request)}`);
  if (!allowed) {
    return NextResponse.json(
      { success: false, message: `Demasiados envios. Tente novamente em ${retryAfterSeconds} segundos.` },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }

  try {
    const form = await request.formData();
    const draftId = String(form.get("draftId") ?? "");
    const file = form.get("photo");

    const draft = await draftStore.get(draftId);
    if (!draft) {
      return NextResponse.json(
        { success: false, message: "Esta pré-visualização expirou. Preencha o formulário outra vez." },
        { status: 404 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, message: "Nenhuma fotografia recebida." }, { status: 400 });
    }

    const existing = (draft.landing.gallery ?? []) as GalleryImage[];
    // Only the owner's own photographs count towards the limit. The stock ones are being
    // replaced, not added to.
    const owned = existing.filter((image) => isOwnPhoto(image.url));

    const rejection = rejectPhoto(file.size, file.type, owned.length);
    if (rejection) {
      return NextResponse.json({ success: false, message: rejection }, { status: 400 });
    }

    const stored = await photoStore.save(Buffer.from(await file.arrayBuffer()), file.type);

    // The owner's photographs come first and push the stock ones out, so the gallery shows
    // theirs the moment they upload one rather than burying it below four stock plates.
    const uploaded: GalleryImage = { url: stored.url, alt: draft.input.name, credit: null };
    const stock = existing.filter((image) => !isOwnPhoto(image.url));
    const gallery = [...owned, uploaded, ...stock].slice(0, MAX_PHOTOS);

    draft.landing.gallery = gallery;

    return NextResponse.json({ gallery, uploaded: owned.length + 1 }, { status: 201 });
  } catch (error) {
    console.error("Photo upload failed:", error);
    return NextResponse.json({ success: false, message: "Não foi possível guardar a fotografia." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { draftId, url } = (await request.json()) as { draftId?: string; url?: string };

    const draft = draftId ? await draftStore.get(draftId) : null;
    if (!draft || !url) {
      return NextResponse.json({ success: false, message: "Pedido inválido." }, { status: 400 });
    }

    const existing = (draft.landing.gallery ?? []) as GalleryImage[];
    draft.landing.gallery = existing.filter((image) => image.url !== url);

    // Only ever removes files this store created. A URL pointing anywhere else is left
    // alone rather than being turned into a filesystem path.
    if (isOwnPhoto(url)) {
      await photoStore.remove(url.slice(UPLOAD_PREFIX.length));
    }

    return NextResponse.json({ gallery: draft.landing.gallery }, { status: 200 });
  } catch (error) {
    console.error("Photo delete failed:", error);
    return NextResponse.json({ success: false, message: "Não foi possível apagar a fotografia." }, { status: 500 });
  }
}
