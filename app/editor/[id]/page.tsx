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

const SAVE_STATUS_LABEL: Record<SaveStatus, string> = { saved: "Guardado", saving: "A guardar…", error: "Não foi possível guardar" };
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
  // Edits made since the live site was last built from this project.
  const [pendingChanges, setPendingChanges] = useState(false);
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
          setError("Não foi possível abrir este site.");
          return;
        }
        const data = (await response.json()) as EditorProject;
        setProject(data);
        setHistory(data.pages[0]?.history ?? null);
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setError("Não foi possível contactar o servidor.");
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

      // Saved and published are two different things, and conflating them is what stranded
      // people's edits: the badge said "Guardado" while the live site still showed last
      // week's prices, and nothing on screen said so.
      setPendingChanges(true);

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
      setPendingChanges(false);
    } catch (err) {
      console.error(err);
      setPublishError("Não foi possível publicar. Tente novamente.");
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
      setPublishError("Não foi possível tirar o site de linha. Tente novamente.");
    } finally {
      setPublishing(false);
    }
  }

  if (notFound) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black text-white">
        <p className="text-zinc-400">Project not found.</p>
        <Link href="/dashboard" className="text-sm text-indigo-400 hover:underline">
          ← Voltar aos meus sites
        </Link>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black text-white">
        <p className="text-red-400">{error}</p>
        <Link href="/dashboard" className="text-sm text-indigo-400 hover:underline">
          ← Voltar aos meus sites
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
  const liveUrl = project.slug ? `${origin}/${project.slug}` : null;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-white">
              ← Voltar aos meus sites
            </Link>
            <h1 className="mt-2 text-2xl font-bold">{project.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className={`rounded-full border px-4 py-2 text-sm ${SAVE_STATUS_CLASS[saveStatus]}`}>
              {SAVE_STATUS_LABEL[saveStatus]}
            </div>
            {/* Two buttons once the site is live, not one that toggles.

                It used to be a single control that said "Tirar de linha" while published,
                so the only route to pushing an edit live was to take the restaurant's site
                offline and put it back - it 404'd for customers in between, and the banner
                cheerfully told the owner to "press Publish again" at a button that was not
                on the screen. Changing the opening hours is the most ordinary thing an
                owner does, and it had no path. */}
            {isPublished ? (
              <>
                <button
                  onClick={publish}
                  disabled={publishing || !pendingChanges}
                  className="rounded-xl bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-default disabled:bg-zinc-800 disabled:text-zinc-500"
                >
                  {publishing ? "Um momento…" : pendingChanges ? "Publicar alterações" : "Tudo publicado"}
                </button>
                <button
                  onClick={unpublish}
                  disabled={publishing}
                  className="rounded-xl border border-zinc-700 px-5 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-900 disabled:opacity-50"
                >
                  Tirar de linha
                </button>
              </>
            ) : (
              <button
                onClick={publish}
                disabled={publishing}
                className="rounded-xl bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
              >
                {publishing ? "Um momento…" : "Publicar"}
              </button>
            )}
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
            <span className="text-sm text-emerald-400">No ar em</span>
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
              {justCopied ? "Copiado" : "Copiar link"}
            </button>
            {/* Says which of the two states the owner is actually in, rather than stating
                a rule and leaving him to work out whether it applies to him right now. */}
            <span className="text-xs text-zinc-500">
              {pendingChanges
                ? "Tem alterações por publicar. Carregue em Publicar alterações para as pôr no site."
                : "O site está igual ao que vê aqui."}
            </span>
          </div>
        )}

        <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl">
          <div className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900 px-6 py-4">
            <div className="h-3 w-3 rounded-full bg-red-500"></div>
            <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
            <div className="h-3 w-3 rounded-full bg-green-500"></div>
            <div className="ml-6 flex-1 truncate rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-400">
              {liveUrl ?? "Ainda não publicado"}
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

          {/* EDIT AT DESKTOP, CHECK AT PHONE
              This claimed to be "a real 375px viewport". It was a 375px-wide div, which is
              not a viewport at all: `sm:` and every vw-based clamp() kept resolving against
              the desktop window, and the opening hours sat in three 70px columns inside a
              276px box - a layout no phone renders.

              Only an iframe has its own viewport, and an iframe cannot carry inline editing,
              which needs the React tree in this document. So the two views split roles:
              desktop is where you edit, phone is where you check - which is what the phone
              view was always for. Keyed on the save counter so it reloads once the edit it
              is meant to show has actually been persisted. */}
          {viewport === "mobile" ? (
            <div className="flex justify-center bg-zinc-900 py-8">
              <iframe
                key={`${project.id}-${saveStatus}`}
                src={`/editor/${project.id}/frame`}
                title={`${project.name} — como aparece num telemóvel`}
                className="h-[812px] w-[375px] rounded-2xl border border-zinc-700 bg-black"
              />
            </div>
          ) : (
            <Landing state={currentState(history)} onDispatchOperation={onDispatchOperation} />
          )}
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
