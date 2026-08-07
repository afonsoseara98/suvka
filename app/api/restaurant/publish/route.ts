import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { repos } from "@/app/lib/repos";
import { createProjectFromGeneration } from "@/app/lib/projectService";
import { publishProject } from "@/app/lib/publishService";
import { draftStore } from "@/app/lib/restaurant/draftStore";
import type { BusinessProfile } from "@/app/ai/types";

// The moment a draft becomes someone's site.
//
// This is the first point in the flow that needs an account, and the only one - everything
// before it works for an anonymous visitor. Migrating the draft here is what makes the
// earlier steps free of the database entirely.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, message: "Inicie sessão para publicar." }, { status: 401 });
  }

  try {
    const { draftId } = (await request.json()) as { draftId?: string };
    if (!draftId) {
      return NextResponse.json({ success: false, message: "Pedido inválido." }, { status: 400 });
    }

    const draft = await draftStore.get(draftId);
    if (!draft) {
      // Expired, or already claimed. Says what to do rather than what went wrong.
      return NextResponse.json(
        { success: false, message: "Esta pré-visualização expirou. Preencha o formulário outra vez." },
        { status: 404 }
      );
    }

    // The contact address on the finished site is the account's, because the public form
    // deliberately never asked for one.
    const landing = {
      ...draft.landing,
      footer: { ...draft.landing.footer, email: session.user.email ?? "" },
    };

    const businessProfile = {
      industry: "restaurant",
      businessModel: "local_business",
      primaryGoal: "generate_leads",
      audience: "Local customers",
      tone: "friendly",
      priceLevel: "medium",
    } as BusinessProfile;

    const project = await createProjectFromGeneration(repos, session.user.id, landing, businessProfile, {
      name: draft.input.name,
    });

    const published = await publishProject(repos, project.id);

    // The draft has done its job. Keeping it would leave a second, unowned copy of a site
    // that now has an owner.
    await draftStore.delete(draftId);

    return NextResponse.json({ id: project.id, slug: published.slug }, { status: 201 });
  } catch (error) {
    console.error("Publishing a draft failed:", error);
    return NextResponse.json({ success: false, message: "Algo correu mal ao publicar. Tente novamente." }, { status: 500 });
  }
}
