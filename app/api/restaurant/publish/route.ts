import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { repos } from "@/app/lib/repos";
import { prisma } from "@/app/lib/prisma";
import { createProjectFromGeneration } from "@/app/lib/projectService";
import { publishProject } from "@/app/lib/publishService";
import { draftStore } from "@/app/lib/restaurant/draftStore";
import { track } from "@/app/lib/events";
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
    const { draftId, slug: desiredSlug } = (await request.json()) as { draftId?: string; slug?: string };
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

    // The address the owner chose, if they came through the address step. Still resolved
    // against what is actually free - the check on that screen is a moment old, and two
    // people can be choosing the same name at once.
    const published = await publishProject(repos, project.id, new Date(), desiredSlug);

    // The free month starts here, at the moment the restaurant is actually online - not at
    // sign-up, which can happen minutes earlier and for nothing. `updateMany` with the null
    // guard makes this first-publish-only without a read first: publishing a second
    // restaurant must not restart the clock.
    //
    // Swallowed rather than thrown, because a site going online matters more than a clock -
    // but logged, because swallowed silently is how a whole cohort of owners ends up with no
    // trial start and nobody notices. This exact failure happened once already, against a
    // stale Prisma client, and left no trace at all.
    await prisma.user
      .updateMany({
        where: { id: session.user.id, trialStartedAt: null },
        data: { trialStartedAt: new Date() },
      })
      .catch((error) => console.error("Could not start the trial clock:", error));

    // The draft has done its job. Keeping it would leave a second, unowned copy of a site
    // that now has an owner.
    await draftStore.delete(draftId);

    track("publish_completed", { draftId, projectId: project.id, userId: session.user.id });

    return NextResponse.json({ id: project.id, slug: published.slug }, { status: 201 });
  } catch (error) {
    console.error("Publishing a draft failed:", error);
    return NextResponse.json({ success: false, message: "Algo correu mal ao publicar. Tente novamente." }, { status: 500 });
  }
}
