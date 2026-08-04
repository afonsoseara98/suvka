"use client";

import { useState } from "react";
import Landing from "@/app/components/Landing";
import { projectFromLandingPage, currentPageState, type Project } from "@/app/editor/project";
import type { LandingPage } from "@/app/types/landing";
import type { BusinessProfile } from "@/app/ai/types";


export default function Home() {
  const [prompt, setPrompt] = useState("");
  // Project (app/editor/project.ts), not the raw LandingPage - projectFromLandingPage()
  // converts the generation pipeline's output into the canonical, editable model
  // exactly once, here, at the one seam between "generated" and "editable." Nothing
  // about app/ai/* or /api/generate's actual generation behavior needed to change for
  // this (the route now additionally returns the already-computed businessProfile
  // alongside the page, no new OpenAI call). A Project always holds at least one page
  // ("landing") - today's flow only ever produces that one, but the shape is already
  // ready for more.
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateLandingPage() {
    if (!prompt.trim()) return;

    setProject(null);
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Something went wrong.");
        return;
      }

      const businessProfile = data.businessProfile as BusinessProfile;
      setProject(
        projectFromLandingPage(data as LandingPage, businessProfile, { id: `project-${Date.now()}`, name: "Untitled Project" })
      );
    } catch (err) {
      console.error(err);
      setError("Unable to contact the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
<section className="relative overflow-hidden px-6 py-32">

  <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-[180px]" />

  <div className="relative mx-auto max-w-6xl text-center">

    <div className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-400">
      🚀 AI Landing Page Generator
    </div>

    <h1 className="mt-8 text-7xl font-black tracking-tight leading-none">
      Landing Pages
      <br />
      that actually convert.
    </h1>

    <p className="mx-auto mt-8 max-w-3xl text-2xl text-zinc-400">
      Generate beautiful, conversion-focused landing pages
      powered by AI in less than 30 seconds.
    </p>

    <div className="mx-auto mt-14 flex max-w-4xl rounded-2xl border border-zinc-800 bg-zinc-900 p-2 shadow-2xl">

      <input
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        aria-label="Describe your business"
        placeholder="Describe your business..."
        className="flex-1 bg-transparent px-6 py-5 text-lg outline-none placeholder:text-zinc-500"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            generateLandingPage();
          }
        }}
      />

      <button
        onClick={generateLandingPage}
        disabled={loading}
        className="rounded-xl bg-white px-10 font-semibold text-black transition hover:scale-105 hover:bg-zinc-200"
      >
        {loading ? "Generating..." : "Generate"}
      </button>

    </div>

    {error && (
      <p
        role="alert"
        className="mx-auto mt-4 max-w-4xl rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-3 text-sm text-red-400"
      >
        {error}
      </p>
    )}

    <div className="mt-10 flex justify-center gap-8 text-sm text-zinc-500">

      <span>⚡ AI Copywriting</span>

      <span>🎨 Modern Design</span>

      <span>📱 Responsive</span>

      <span>🚀 SEO Ready</span>

      <span>💳 Pricing Included</span>

    </div>

  </div>

</section>
{loading && (
  <section className="mx-auto mb-40 mt-16 max-w-7xl px-6">

    <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">

      <div className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900 px-6 py-4">

        <div className="h-3 w-3 animate-pulse rounded-full bg-red-500"></div>
        <div className="h-3 w-3 animate-pulse rounded-full bg-yellow-500"></div>
        <div className="h-3 w-3 animate-pulse rounded-full bg-green-500"></div>

        <div className="ml-6 rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-400">
          Generating preview...
        </div>

      </div>

      <div className="space-y-6 p-12">

        <div className="h-14 w-2/3 animate-pulse rounded-xl bg-zinc-800"></div>

        <div className="h-8 w-1/2 animate-pulse rounded-xl bg-zinc-800"></div>

        <div className="mt-10 h-16 animate-pulse rounded-2xl bg-zinc-800"></div>

        <div className="grid grid-cols-3 gap-6">

          <div className="h-44 animate-pulse rounded-2xl bg-zinc-800"></div>

          <div className="h-44 animate-pulse rounded-2xl bg-zinc-800"></div>

          <div className="h-44 animate-pulse rounded-2xl bg-zinc-800"></div>

        </div>

      </div>

    </div>

  </section>
)}
      {project && (
  <section className="mx-auto mb-40 max-w-7xl px-6">

    <div className="mb-6 flex items-center justify-between">

      <div>
        <h2 className="text-3xl font-bold">
          ✨ Live Preview
        </h2>

        <p className="mt-2 text-zinc-400">
          Your AI generated landing page
        </p>
      </div>

      <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">
        Ready
      </div>

    </div>

    <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl">

      <div className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900 px-6 py-4">

        <div className="h-3 w-3 rounded-full bg-red-500"></div>
        <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
        <div className="h-3 w-3 rounded-full bg-green-500"></div>

        <div className="ml-6 rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-400">
          https://preview.noctra.ai
        </div>

      </div>

      <Landing state={currentPageState(project, "landing")} />


    </div>

  </section>
)}
    </main>
  );
}