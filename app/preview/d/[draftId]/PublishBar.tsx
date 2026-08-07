"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

type Props = {
  draftId: string;
  name: string;
  children: React.ReactNode;
};

// PUBLISHING IS WHERE THE ACCOUNT IS ASKED FOR
//
// Not at the form. A visitor who has just watched their own restaurant appear on screen has
// a reason to sign up; a visitor staring at an empty form has only a cost. The draft id
// travels through sign-in in the return URL, so coming back lands here with ?publish=1 and
// the publish happens without them pressing anything twice.
export default function PublishBar({ draftId, name, children }: Props) {
  const { status } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const [publishing, setPublishing] = useState(false);
  // Mobile first, and not as a preference: a person looking up a restaurant is almost
  // always on a phone, and an owner who has only seen their site at 1440px has not seen
  // what their customers see.
  const [viewport, setViewport] = useState<"mobile" | "desktop">("mobile");
  const [error, setError] = useState<string | null>(null);

  const wantsToPublish = params.get("publish") === "1";

  async function publish() {
    setPublishing(true);
    setError(null);
    try {
      const response = await fetch("/api/restaurant/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Não foi possível publicar. Tente novamente.");
        return;
      }

      router.push(`/s/${data.slug}`);
    } catch (err) {
      console.error(err);
      setError("Não foi possível contactar o servidor.");
    } finally {
      setPublishing(false);
    }
  }

  function start() {
    if (status === "authenticated") {
      publish();
      return;
    }
    // Carry the draft through sign-in. Without the return URL the person lands on a
    // dashboard and their site is gone as far as they can tell.
    router.push(`/entrar?next=${encodeURIComponent(`/preview/d/${draftId}?publish=1`)}`);
  }

  // Coming back from sign-in: finish what they already asked for, rather than making them
  // find and press the button a second time.
  //
  // The ref guards against the effect running twice (React's development double-invoke, and
  // any re-render before `publishing` has settled) - publishing twice would create two
  // projects from one draft. The work is deferred off the effect's synchronous body because
  // publish() sets state immediately, and setting state during an effect is the pattern
  // that produces cascading renders.
  const started = useRef(false);
  useEffect(() => {
    if (!wantsToPublish || status !== "authenticated" || started.current) return;
    started.current = true;
    void Promise.resolve().then(publish);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsToPublish, status]);

  return (
    <div className="sticky top-0 z-50 border-b border-zinc-800 bg-black/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-5 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{name}</p>
          <p className="text-xs text-zinc-500">
            Pré-visualização. Só fica online quando publicar.
          </p>
        </div>

        {error && <p className="w-full text-sm text-red-400 sm:w-auto">{error}</p>}

        <div className="flex overflow-hidden rounded-lg border border-zinc-700">
          {(["mobile", "desktop"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setViewport(option)}
              className={`px-3 py-1.5 text-xs transition ${
                viewport === option ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              {option === "mobile" ? "Telemóvel" : "Computador"}
            </button>
          ))}
        </div>

        <button
          onClick={start}
          disabled={publishing}
          className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
        >
          {publishing ? "A publicar…" : "Publicar este site"}
        </button>
      </div>

      {/* A real 375px viewport, not a scaled screenshot, so the clamp()-based type and
          spacing resolve exactly as they will on a phone. */}
      <div className={viewport === "mobile" ? "flex justify-center bg-zinc-900 py-6" : ""}>
        <div
          className={viewport === "mobile" ? "w-[375px] overflow-hidden rounded-2xl border border-zinc-700 bg-black" : ""}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
