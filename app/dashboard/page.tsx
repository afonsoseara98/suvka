"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RequireAuth from "@/app/components/RequireAuth";

interface ProjectSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function DashboardContent() {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setError(data.message || "Couldn't load your projects.");
          return;
        }
        setProjects(data.projects);
      })
      .catch((err) => {
        console.error(err);
        setError("Unable to contact the server.");
      });
  }, []);

  const filtered = useMemo(() => {
    if (!projects) return [];
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, query]);

  async function submitRename(id: string) {
    const name = renameValue.trim();
    if (!name) return;
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) return;
      setProjects((prev) => prev?.map((p) => (p.id === id ? { ...p, name } : p)) ?? null);
    } finally {
      setRenamingId(null);
    }
  }

  async function confirmDelete(id: string) {
    const response = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (response.ok) {
      setProjects((prev) => prev?.filter((p) => p.id !== id) ?? null);
    }
    setConfirmingDeleteId(null);
  }

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Your projects</h1>
            <p className="mt-2 text-zinc-400">Every landing page you&apos;ve generated with Noctra, saved automatically.</p>
          </div>
          <Link
            href="/new"
            className="rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:scale-105 hover:bg-zinc-200"
          >
            + New Project
          </Link>
        </div>

        {projects && projects.length > 0 && (
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects..."
            aria-label="Search projects"
            className="mt-8 w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm outline-none placeholder:text-zinc-500"
          />
        )}

        {error && (
          <p role="alert" className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-3 text-sm text-red-400">
            {error}
          </p>
        )}

        {projects === null && !error && <p className="mt-12 text-zinc-500">Loading...</p>}

        {projects !== null && projects.length === 0 && (
          <div className="mt-16 rounded-2xl border border-zinc-800 bg-zinc-950 p-16 text-center">
            <p className="text-lg text-zinc-300">You haven&apos;t created any projects yet.</p>
            <Link
              href="/new"
              className="mt-6 inline-block rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:scale-105 hover:bg-zinc-200"
            >
              Generate your first landing page
            </Link>
          </div>
        )}

        {projects !== null && projects.length > 0 && filtered.length === 0 && (
          <p className="mt-12 text-zinc-500">No projects match &quot;{query}&quot;.</p>
        )}

        {filtered.length > 0 && (
          <ul className="mt-8 divide-y divide-zinc-800 rounded-2xl border border-zinc-800 bg-zinc-950">
            {filtered.map((project) => (
              <li key={project.id} className="flex items-center justify-between gap-4 px-6 py-4">
                {renamingId === project.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitRename(project.id);
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    onBlur={() => submitRename(project.id)}
                    className="flex-1 rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm outline-none"
                  />
                ) : (
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{project.name}</p>
                    <p className="text-sm text-zinc-500">Last edited {relativeTime(project.updatedAt)}</p>
                  </div>
                )}

                <div className="flex shrink-0 items-center gap-2 text-sm">
                  <Link
                    href={`/editor/${project.id}`}
                    className="rounded-lg border border-zinc-700 px-3 py-2 text-zinc-300 transition hover:bg-zinc-900"
                  >
                    Open
                  </Link>

                  {confirmingDeleteId === project.id ? (
                    <>
                      <button
                        onClick={() => confirmDelete(project.id)}
                        className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-red-400 transition hover:bg-red-500/20"
                      >
                        Confirm delete?
                      </button>
                      <button
                        onClick={() => setConfirmingDeleteId(null)}
                        className="rounded-lg border border-zinc-700 px-3 py-2 text-zinc-300 transition hover:bg-zinc-900"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setRenamingId(project.id);
                          setRenameValue(project.name);
                        }}
                        className="rounded-lg border border-zinc-700 px-3 py-2 text-zinc-300 transition hover:bg-zinc-900"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => setConfirmingDeleteId(project.id)}
                        className="rounded-lg border border-zinc-700 px-3 py-2 text-zinc-400 transition hover:bg-zinc-900"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}
