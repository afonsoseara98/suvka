"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import RequireAuth from "@/app/components/RequireAuth";
import Landing from "@/app/components/Landing";
import type { Project } from "@/app/editor/project";
import type { Operation } from "@/app/editor/operations";
import { dispatch, currentState, type PageHistory } from "@/app/editor/history";

type SaveStatus = "saved" | "saving" | "error";

// `slug` is merged into the GET /api/projects/[id] response by the API layer - see the
// comment there for why it isn't a field on the domain Project type.
type EditorProject = Project & { slug: string | null };

const SAVE_STATUS_LABEL: Record<SaveStatus, string> = { saved: "Saved", saving: "Saving...", error: "Save failed" };
const SAVE_STATUS_CLASS: Record<SaveStatus, string> = {
  saved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  saving: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  error: "border-red-500/30 bg-red-500/10 text-red-400",
};

// Opens a single persisted project - the "Open" destination from /dashboard, and where
// /new redirects right after a fresh generation. Real inline editing: click any text
// field, edit it, Enter/blur commits; hover a section for reorder controls. Every
// interaction becomes one Operation (app/editor/operations.ts) - the client applies it
// optimistically via history.ts's pure dispatch() for instant feedback, then persists it
// through the already-existing, already-tested POST
// /api/projects/[id]/pages/[pageId]/operations route. Generic by construction: the next
// editor affordance (hide/show, delete, ...) is just one more Operation kind flowing
// through the same onDispatchOperation callback, no new plumbing needed.
function EditorContent() {
  const params = useParams<{ id: string }>();
  const [project, setProject] = useState<EditorProject | null>(null);
  const [history, setHistory] = useState<PageHistory | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [justCopied, setJustCopied] = useState(false);
  // Mobile first: this is what the owner should be judging by default.
  const [viewport, setViewport] = useState<"mobile" | "desktop">("mobile");
  // Lazy initializer rather than an effect: window doesn't exist during the server pass,
  // and there is nothing to synchronize afterwards - the origin never changes for the
  // life of the page. The published banner only renders once `project` has loaded over
  // the network, so this value is never part of the server-rendered markup.
  const [origin] = useState(() => (typeof window === "undefined" ? "" : window.location.origin));

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/projects/${params.id}`);
        if (cancelled) return;
        if (response.status === 404) {
          setNotFound(true);
          return;
        }
        if (!response.ok) {
          setError("Couldn't load this project.");
          return;
        }
        const data = (await response.json()) as EditorProject;
        setProject(data);
        setHistory(data.pages[0]?.history ?? null);
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setError("Unable to contact the server.");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  // Every operation POST is chained onto the previous one instead of racing it. The
  // server treats the page cursor as an optimistic lock (see projectService.ts's
  // ConflictError), so two in-flight writes would make one of them lose with a 409 and
  // cost the user an edit. Serialising here means the second request reads the cursor
  // the first one just advanced, which is the ordering the user actually expressed.
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const inFlightRef = useRef(0);

  const onDispatchOperation = useCallback(
    (operation: Operation) => {
      if (!project) return;
      const page = project.pages[0];
      if (!page) return;

      // Optimistic local apply, from whatever the latest state is at the moment this
      // runs - never from a value captured when the callback was created, which would
      // drop edits made between renders.
      setHistory((prev) => (prev ? dispatch(prev, operation, "user") : prev));

      inFlightRef.current += 1;
      setSaveStatus("saving");

      queueRef.current = queueRef.current
        .then(async () => {
          const response = await fetch(`/api/projects/${project.id}/pages/${page.id}/operations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ operations: [operation], actor: "user" }),
          });
          if (!response.ok) throw new Error(`Save failed with status ${response.status}`);
        })
        .then(() => {
          inFlightRef.current -= 1;
          if (inFlightRef.current === 0) setSaveStatus("saved");
        })
        .catch(async (err) => {
          inFlightRef.current -= 1;
          console.error(err);
          setSaveStatus("error");

          // The optimistic local state and the server have diverged and there's no
          // honest way to rebase one queued edit out of the middle of a chain. Re-read
          // the server's version and adopt it - the server's operation log is the source
          // of truth (ADR-9), so this is a resync, not a guess.
          try {
            const fresh = await fetch(`/api/projects/${project.id}`);
            if (fresh.ok) {
              const data = (await fresh.json()) as EditorProject;
              setHistory(data.pages[0]?.history ?? null);
            }
          } catch (resyncError) {
            console.error(resyncError);
          }
        });
    },
    [project]
  );

  async function publish() {
    if (!project) return;
    setPublishing(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/publish`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Publish failed");
      // Adopt the server's slug and published flag rather than assuming what they became -
      // the slug may have been de-duplicated against another project's.
      setProject((prev) =>
        prev
          ? { ...prev, slug: data.slug, settings: { ...prev.settings, publishing: { ...prev.settings.publishing, published: true } } }
          : prev
      );
      setJustCopied(false);
    } catch (err) {
      console.error(err);
      setPublishError("Couldn't publish. Please try again.");
    } finally {
      setPublishing(false);
    }
  }

  async function unpublish() {
    if (!project) return;
    setPublishing(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/publish`, { method: "DELETE" });
      if (!response.ok) throw new Error("Unpublish failed");
      setProject((prev) =>
        prev
          ? { ...prev, settings: { ...prev.settings, publishing: { ...prev.settings.publishing, published: false } } }
          : prev
      );
    } catch (err) {
      console.error(err);
      setPublishError("Couldn't take the site offline. Please try again.");
    } finally {
      setPublishing(false);
    }
  }

  if (notFound) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black text-white">
        <p className="text-zinc-400">Project not found.</p>
        <Link href="/dashboard" className="text-sm text-indigo-400 hover:underline">
          ← Back to Dashboard
        </Link>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black text-white">
        <p className="text-red-400">{error}</p>
        <Link href="/dashboard" className="text-sm text-indigo-400 hover:underline">
          ← Back to Dashboard
        </Link>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-zinc-400">Loading...</p>
      </main>
    );
  }

  if (!history) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-zinc-500">This project has no pages yet.</p>
      </main>
    );
  }

  const isPublished = project.settings.publishing.published;
  const liveUrl = project.slug ? `${origin}/s/${project.slug}` : null;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-white">
              ← Back to Dashboard
            </Link>
            <h1 className="mt-2 text-2xl font-bold">{project.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className={`rounded-full border px-4 py-2 text-sm ${SAVE_STATUS_CLASS[saveStatus]}`}>
              {SAVE_STATUS_LABEL[saveStatus]}
            </div>
            <button
              onClick={isPublished ? unpublish : publish}
              disabled={publishing}
              className={
                isPublished
                  ? "rounded-xl border border-zinc-700 px-5 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-900 disabled:opacity-50"
                  : "rounded-xl bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
              }
            >
              {publishing ? "Working..." : isPublished ? "Take offline" : "Publish"}
            </button>
          </div>
        </div>

        {publishError && (
          <p role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {publishError}
          </p>
        )}

        {/* The moment the whole product exists for: a real, copyable address the owner
            can send to someone. Shown the instant publishing succeeds, because the first
            instinct after publishing is to show it to a person. */}
        {isPublished && liveUrl && (
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4">
            <span className="text-sm text-emerald-400">Live at</span>
            <a
              href={liveUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-white underline underline-offset-4"
            >
              {liveUrl}
            </a>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(liveUrl);
                setJustCopied(true);
              }}
              className="rounded-lg border border-emerald-500/40 px-3 py-1.5 text-xs text-emerald-300 transition hover:bg-emerald-500/20"
            >
              {justCopied ? "Copied" : "Copy link"}
            </button>
            <span className="text-xs text-zinc-500">
              Edits stay private until you press Publish again.
            </span>
          </div>
        )}

        <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl">
          <div className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900 px-6 py-4">
            <div className="h-3 w-3 rounded-full bg-red-500"></div>
            <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
            <div className="h-3 w-3 rounded-full bg-green-500"></div>
            <div className="ml-6 flex-1 truncate rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-400">
              {liveUrl ?? "Not published yet"}
            </div>

            {/* Mobile is the default, not an afterthought. Someone looking up a restaurant
                is almost always on a phone - and a page reviewed only at 1440px is a page
                whose owner has never seen what their customers see. */}
            <div className="flex overflow-hidden rounded-lg border border-zinc-700">
              {(["mobile", "desktop"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setViewport(option)}
                  className={`px-3 py-1.5 text-xs capitalize transition ${
                    viewport === option ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* The phone frame is a real 375px viewport, not a scaled screenshot, so the
              clamp()-based typography and spacing resolve exactly as they will on a phone. */}
          <div className={viewport === "mobile" ? "flex justify-center bg-zinc-900 py-8" : ""}>
            <div
              className={viewport === "mobile" ? "overflow-hidden rounded-2xl border border-zinc-700 bg-black" : ""}
              style={viewport === "mobile" ? { width: 375 } : undefined}
            >
              <Landing state={currentState(history)} onDispatchOperation={onDispatchOperation} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function EditorPage() {
  return (
    <RequireAuth>
      <EditorContent />
    </RequireAuth>
  );
}
