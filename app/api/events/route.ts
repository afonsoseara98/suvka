import { NextResponse } from "next/server";
import { track, isEventName } from "@/app/lib/events";
import { getRateLimiter } from "@/app/lib/rateLimit";

// Public, and it has to be: the events that matter most happen on a restaurant's published
// site, where the person clicking has no account and never will.
//
// Public and writable means it can be filled with nonsense, so the only defences that make
// sense here are cheap ones: an exact whitelist of event names, a length cap on the ids, and
// a ceiling per address. None of them make the numbers trustworthy against somebody
// deliberately attacking them - nothing would, short of identifying visitors, which is the
// one thing this must not do. They make the numbers trustworthy against accident, which is
// what actually threatens them.
const EVENT_LIMIT = 60;
const EVENT_WINDOW_MS = 60_000;

// Long enough for a cuid, short enough that nobody stores an essay in the column.
const MAX_ID = 64;

function cleanId(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_ID ? value : null;
}

export async function POST(request: Request) {
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limited = await getRateLimiter("events", EVENT_LIMIT, EVENT_WINDOW_MS).check(address);
  if (!limited.allowed) {
    // 204 rather than 429 on purpose. Nothing is waiting on this answer, and a visitor on a
    // restaurant's website must never see an error because a counter was busy.
    return new NextResponse(null, { status: 204 });
  }

  try {
    const body = (await request.json()) as { name?: unknown; projectId?: unknown; draftId?: unknown };
    if (!isEventName(body.name)) return new NextResponse(null, { status: 204 });

    track(body.name, {
      projectId: cleanId(body.projectId),
      draftId: cleanId(body.draftId),
    });
  } catch {
    // Malformed body. Same answer as everything else here: say nothing, break nothing.
  }

  return new NextResponse(null, { status: 204 });
}
