"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RequireAuth from "@/app/components/RequireAuth";
import BillingPanel from "./BillingPanel";
import SiteActivity from "./SiteActivity";

interface ProjectSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  published: boolean;
  slug: string | null;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days} dias`;
  return new Date(iso).toLocaleDateString("pt-PT");
}

function DashboardContent() {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Read at render rather than baked in: on the server there is no window, and the value
  // that matters is the origin the owner is actually on.
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  // Every site that is actually online, promoted out of the list into its own block above.
  const live = useMemo(
    () => (projects ?? []).filter((p) => p.published && p.slug),
    [projects]
  );

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setError(data.message || "Não foi possível carregar os seus sites.");
          return;
        }
        setProjects(data.projects);
      })
      .catch((err) => {
        console.error(err);
        setError("Não foi possível contactar o servidor.");
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
            <h1 className="text-3xl font-bold">Os seus sites</h1>
            <p className="mt-2 text-zinc-400">Guardados automaticamente. Abra um para o editar.</p>
          </div>
          {/* This pointed at /new - the free-text generator from the era before the
              restaurant pivot. An owner who signed up through the restaurant flow pressed
              "+ New Project" and landed in a different product. */}
          <Link
            href="/new/restaurant"
            className="rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:scale-105 hover:bg-zinc-200"
          >
            + Novo site
          </Link>
        </div>

        <BillingPanel />

        {projects && projects.length > 0 && (
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Procurar…"
            aria-label="Procurar sites"
            className="mt-8 w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm outline-none placeholder:text-zinc-500"
          />
        )}

        {error && (
          <p role="alert" className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-3 text-sm text-red-400">
            {error}
          </p>
        )}

        {projects === null && !error && <p className="mt-12 text-zinc-500">A carregar…</p>}

        {projects !== null && projects.length === 0 && (
          <div className="mt-16 rounded-2xl border border-zinc-800 bg-zinc-950 p-16 text-center">
            <p className="text-lg text-zinc-300">Ainda não tem nenhum site.</p>
            <Link
              href="/new/restaurant"
              className="mt-6 inline-block rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:scale-105 hover:bg-zinc-200"
            >
              Criar o site do meu restaurante
            </Link>
          </div>
        )}

        {projects !== null && projects.length > 0 && filtered.length === 0 && (
          <p className="mt-12 text-zinc-500">Nenhum site corresponde a &quot;{query}&quot;.</p>
        )}

        {/* THE ADDRESS, WHERE HE CANNOT MISS IT
            Nobody memorises "adega-lamego" on the day they publish, and a week later this
            is the page they open to find it again. It used to be a small link inside the
            project row, below the fold of attention - the single most valuable thing the
            customer owns, formatted like a detail. */}
        {live.map((project) => (
          <div
            key={project.id}
            className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6"
          >
            <p className="text-sm text-emerald-400">🟢 {project.name} está online em</p>
            <a
              href={`/${project.slug}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block break-all text-xl font-semibold text-white underline underline-offset-4 sm:text-2xl"
            >
              {/* O link já apontava para /<slug> e o botão já copiava /<slug>. Só o texto
                  que o dono LÊ é que continuava a dizer /s/ - e é o texto que ele escreve
                  na ementa e dita ao telefone. Lia um endereço e copiava outro. */}
              {origin}/{project.slug}
            </a>
            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(`${origin}/${project.slug}`);
                  setCopiedId(project.id);
                }}
                className="rounded-lg border border-emerald-500/40 px-4 py-2 text-emerald-300 transition hover:bg-emerald-500/20"
              >
                {copiedId === project.id ? "Link copiado" : "Copiar link"}
              </button>
              <a
                href={`/${project.slug}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-emerald-500/40 px-4 py-2 text-emerald-300 transition hover:bg-emerald-500/20"
              >
                Ver site
              </a>
            </div>

            {/* Por baixo do endereço e dos botões, não por cima: o que ele veio cá buscar é o
                endereço. Isto é o que o faz voltar no mês seguinte. */}
            <SiteActivity projectId={project.id} />
          </div>
        ))}

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
                    {/* Online or not is the question this page gets opened to answer. */}
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-500">
                      {project.published ? (
                        <span className="text-emerald-400">🟢 Publicado</span>
                      ) : (
                        <span className="text-zinc-500">⚪ Ainda não publicado</span>
                      )}
                      <span>·</span>
                      <span>Editado {relativeTime(project.updatedAt)}</span>
                    </p>
                  </div>
                )}

                <div className="flex shrink-0 items-center gap-2 text-sm">
                  <Link
                    href={`/editor/${project.id}`}
                    className="rounded-lg border border-zinc-700 px-3 py-2 text-zinc-300 transition hover:bg-zinc-900"
                  >
                    Editar
                  </Link>

                  {/* The address of his own website, on the page he lands on. It was only
                      reachable by opening the editor first. */}
                  {project.published && project.slug && (
                    <a
                      href={`/${project.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-zinc-700 px-3 py-2 text-zinc-300 transition hover:bg-zinc-900"
                    >
                      Ver site
                    </a>
                  )}

                  {confirmingDeleteId === project.id ? (
                    <>
                      <button
                        onClick={() => confirmDelete(project.id)}
                        className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-red-400 transition hover:bg-red-500/20"
                      >
                        Apagar mesmo?
                      </button>
                      <button
                        onClick={() => setConfirmingDeleteId(null)}
                        className="rounded-lg border border-zinc-700 px-3 py-2 text-zinc-300 transition hover:bg-zinc-900"
                      >
                        Cancelar
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
                        Mudar o nome
                      </button>
                      <button
                        onClick={() => setConfirmingDeleteId(project.id)}
                        className="rounded-lg border border-zinc-700 px-3 py-2 text-zinc-400 transition hover:bg-zinc-900"
                      >
                        Apagar
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
