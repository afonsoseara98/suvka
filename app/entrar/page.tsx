"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signIn } from "next-auth/react";

// Signing in is no longer the front door - see app/page.tsx. This page exists for the
// two moments an account genuinely buys something: coming back to a site you already
// made, and publishing one you just generated.
//
// The copy speaks to a restaurant owner, not to a developer. It used to read
// "Continue building AI-powered websites that convert", which is a sentence nobody who
// runs a restaurant has ever said. They think about bookings, or about looking good on
// a phone.
function SignInForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);

    try {
      if (mode === "signup") {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name: name || undefined }),
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data.message || "Não foi possível criar a conta.");
          return;
        }
      }

      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError("Email ou palavra-passe incorretos.");
      }
      // On success, useSession()'s status flips to "authenticated" and Home's own
      // effect below redirects to /dashboard - no navigation needed here.
    } catch (err) {
      console.error(err);
      setError("Não foi possível contactar o servidor.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
        <h1 className="text-2xl font-bold">{mode === "signin" ? "Entre na sua conta" : "Crie a sua conta"}</h1>
        <p className="mt-2 text-sm text-zinc-400">
          {mode === "signin" ? "Para gerir o website do seu restaurante." : "Para guardar e publicar o site que acabou de criar."}
        </p>

        <div className="mt-6 space-y-3">
          {mode === "signup" && (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (optional)"
              className="w-full rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm outline-none placeholder:text-zinc-500"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            aria-label="Email"
            className="w-full rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm outline-none placeholder:text-zinc-500"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            aria-label="Password"
            className="w-full rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm outline-none placeholder:text-zinc-500"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
          />
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting || !email || !password}
          className="mt-6 w-full rounded-lg bg-white px-4 py-3 font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
        >
          {submitting ? "Um momento…" : mode === "signin" ? "Entrar" : "Criar conta"}
        </button>

        <button
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
          }}
          className="mt-4 w-full text-center text-sm text-zinc-400 hover:text-white"
        >
          {mode === "signin" ? "Ainda não tem conta? Criar conta" : "Já tem conta? Entrar"}
        </button>
      </div>
    </main>
  );
}

export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  const params = useSearchParams();

  useEffect(() => {
    if (status !== "authenticated") return;

    // Someone who came here from a preview asked to publish, not to see a dashboard.
    // Sending them anywhere else loses the site they just made, as far as they can tell.
    // Only relative paths are honoured: an open redirect here would let a phishing link
    // borrow our sign-in page and bounce the person somewhere else afterwards.
    const next = params.get("next");
    const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
    router.replace(safe);
  }, [status, router, params]);

  if (status !== "authenticated") {
    return status === "unauthenticated" ? (
      <SignInForm />
    ) : (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-zinc-400">Loading...</p>
      </main>
    );
  }

  // Authenticated: the effect above is already redirecting to /dashboard - this is only
  // ever visible for the one frame between the redirect firing and the route changing.
  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <p className="text-zinc-400">Loading...</p>
    </main>
  );
}
