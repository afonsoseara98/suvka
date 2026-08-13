import { prisma } from "@/app/lib/prisma";

// WHAT ACTUALLY HAPPENS, MEASURED
//
// Two questions, and neither of them needs to know who anybody is.
//
// Where does the funnel leak? A hundred people see a preview; how many press Publish, how
// many finish an account, how many end up online. Every guess about that question so far has
// been a guess, including mine.
//
// And does a restaurant's site bring it customers? "Este mês 43 pessoas carregaram em Como
// chegar e 28 ligaram" is the sentence that renews a subscription, and it cannot be said
// without counting.
//
// No cookie is set, no address is recorded, nothing is joined back to a person - see the
// Event model. Counting that a phone number was tapped is not the same as following the
// person who tapped it, and the difference is the whole reason this is defensible on a
// customer's own website.
export const EVENT_NAMES = [
  // The funnel, in order.
  "preview_created",
  "preview_viewed",
  "publish_clicked",
  "signup_started",
  "signup_completed",
  "publish_completed",
  // O ÚNICO MOMENTO EM QUE UM DONO PARTILHA UMA COISA NOSSA
  //
  // O ecrã de publicação dizia-lhe "envie o link aos clientes que já lhe pedem a ementa por
  // mensagem" e não lhe dava por onde. Isto conta as vezes em que ele o faz - e é a única
  // medida que temos do boca-a-boca, que é a forma como um produto para restaurantes cresce
  // sem orçamento de aquisição.
  "site_shared",
  // What visitors do on a published restaurant site. These are the ones the owner is paying
  // to see.
  "phone_clicked",
  "whatsapp_clicked",
  "maps_clicked",
  "reservation_clicked",
  "order_clicked",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

const KNOWN = new Set<string>(EVENT_NAMES);

export function isEventName(value: unknown): value is EventName {
  return typeof value === "string" && KNOWN.has(value);
}

export interface EventContext {
  draftId?: string | null;
  projectId?: string | null;
  userId?: string | null;
}

// Fire and forget, and never throws.
//
// Measurement must not be able to break the thing being measured: a failed write here would
// otherwise take down a publish. Not awaited by callers for the same reason - nobody waits
// on a counter while their restaurant goes online.
// The try/catch is not belt and braces - it is the guarantee.
//
// A .catch() alone only covers a promise that was created. `prisma.event` being undefined -
// which is exactly what a stale generated client looks like - throws synchronously, before
// there is a promise to attach anything to. That took down the creation of a restaurant's
// site the first time this shipped: a counter broke the thing it was counting, which is the
// one failure this function exists to make impossible.
export function track(name: EventName, context: EventContext = {}): void {
  try {
    void prisma.event
      .create({
        data: {
          name,
          draftId: context.draftId ?? null,
          projectId: context.projectId ?? null,
          userId: context.userId ?? null,
        },
      })
      .catch((error) => {
        // Logged rather than swallowed. A counter that silently stopped counting produces a
        // funnel that looks like a cliff, and the first instinct is to go looking for a
        // product problem that does not exist.
        console.error(`Could not record "${name}":`, error);
      });
  } catch (error) {
    console.error(`Could not record "${name}":`, error);
  }
}
