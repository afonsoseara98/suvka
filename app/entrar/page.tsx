"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signIn } from "next-auth/react";

// Signing in is no longer the front door - see app/page.tsx. This page exists for the two
// moments an account genuinely buys something: coming back to a site you already made, and
// publishing one you just generated.
//
// PUBLISHING IS A DIFFERENT VISIT FROM SIGNING IN
//
// Someone arriving here from a preview has just watched their restaurant appear on screen
// and pressed Publish. They have never used this before, so they have no account - and the
// page opened on "Entrar", which meant typing an email, being told the password was wrong,
// and leaving. The default was right for the returning owner and wrong for every new one.
function SignInForm({ publishing }: { publishing: boolean }) {
  const [mode, setMode] = useState<"signin" | "signup">(publishing ? "signup" : "signin");
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
        // Sem esta distinção, quem foi travado lê "palavra-passe incorreta" e tenta outra
        // vez, mais depressa, contra um limite que não sabe que existe.
        setError(
          result.code === "demasiadas_tentativas"
            ? "Demasiadas tentativas. Aguarde alguns minutos e tente novamente."
            : "Email ou palavra-passe incorretos."
        );
      }
      // On success useSession() flips to "authenticated" and SignInRoute's effect below
      // sends them where they were going - back to the preview, which publishes on arrival.
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
        {/* Says where they are in what they were already doing. Someone who pressed Publish
            is not "signing up for Noctra", they are finishing one action. */}
        <h1 className="text-2xl font-bold">
          {publishing ? "Quase lá." : mode === "signin" ? "Entre na sua conta" : "Crie a sua conta"}
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          {publishing
            ? mode === "signup"
              ? "Crie uma conta para publicar o seu site. Só precisamos de duas coisas."
              : "Entre para publicar o seu site."
            : mode === "signin"
              ? "Para gerir o website do seu restaurante."
              : "Para guardar e publicar o site que acabou de criar."}
        </p>

        <div className="mt-6 space-y-3">
          {/* Asked for only when someone is deliberately creating an account rather than
              finishing a publish. Every field between pressing Publish and the site being
              live is a field somebody abandons at. */}
          {mode === "signup" && !publishing && (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome (opcional)"
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
          {submitting
            ? "Um momento…"
            : publishing
              ? mode === "signup"
                ? "Criar conta e publicar"
                : "Entrar e publicar"
              : mode === "signin"
                ? "Entrar"
                : "Criar conta"}
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

function SignInRoute() {
  const { status } = useSession();
  const router = useRouter();

  const params = useSearchParams();

  // Someone sent here by the Publish button, rather than someone signing in to come back.
  // The two visits want different defaults and different words.
  const next = params.get("next") ?? "";
  const publishing = next.includes("publish=1");

  useEffect(() => {
    if (status !== "authenticated") return;

    // Someone who came here from a preview asked to publish, not to see a dashboard.
    // Sending them anywhere else loses the site they just made, as far as they can tell.
    // Only relative paths are honoured: an open redirect here would let a phishing link
    // borrow our sign-in page and bounce the person somewhere else afterwards.
    const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
    router.replace(safe);
  }, [status, router, next]);

  if (status !== "authenticated") {
    return status === "unauthenticated" ? (
      <SignInForm publishing={publishing} />
    ) : (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-zinc-400">Um momento…</p>
      </main>
    );
  }

  // Authenticated: the effect above is already redirecting - this is only ever visible for
  // the one frame between the redirect firing and the route changing.
  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <p className="text-zinc-400">Um momento…</p>
    </main>
  );
}

// useSearchParams needs a Suspense boundary or the page cannot be prerendered - it broke
// the build the moment ?next= was added. The fallback is what shows for the instant before
// the query string is readable, so it says the same thing the loading state says.
export default function Entrar() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-black text-white">
          <p className="text-zinc-400">Um momento…</p>
        </main>
      }
    >
      <SignInRoute />
    </Suspense>
  );
}
