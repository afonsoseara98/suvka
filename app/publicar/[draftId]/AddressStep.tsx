"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";

type Props = {
  draftId: string;
  name: string;
  suggested: string;
};

type Availability = { slug: string; available: boolean; message: string; suggestion?: string };

// ONE SCREEN BETWEEN PRESSING PUBLISH AND THE SITE BEING LIVE
//
// The account and the address used to be two pages, which is two chances to close the tab
// on somebody who has already decided. They are asked for together because they are one
// decision - "put this online" - and the account is only a consequence of it.
//
// So an owner who has never been here fills in three boxes and presses one button. Someone
// already signed in sees only the address; the account half of this component never
// renders for them.
export default function AddressStep({ draftId, name, suggested }: Props) {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const needsAccount = sessionStatus === "unauthenticated";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [value, setValue] = useState(suggested);
  const [status, setStatus] = useState<Availability | null>(null);
  // True from the start: the suggested address is checked on mount, so the first thing on
  // screen should be "A verificar…" rather than a blank line that looks like a verdict.
  const [checking, setChecking] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Checked as they type, debounced, so the answer is on screen before they reach for the
  // button - rather than after pressing it, which is where a taken name used to surface.
  // Both branches settle inside the timeout rather than in the effect body, so nothing sets
  // state synchronously on every keystroke.
  useEffect(() => {
    const typed = value.trim();

    const timer = setTimeout(async () => {
      if (!typed) {
        setStatus(null);
        setChecking(false);
        return;
      }

      try {
        const response = await fetch(`/api/restaurant/slug?value=${encodeURIComponent(typed)}`);
        if (response.ok) setStatus((await response.json()) as Availability);
      } catch (err) {
        // A failed check is not a failed publish: the server resolves the address again on
        // publish anyway, so silence here costs nothing but the reassurance.
        console.error(err);
      } finally {
        setChecking(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [value]);

  // Creates the account when there isn't one, then publishes - one button, because from the
  // owner's side it is one action. Returns false if the account half failed, so the publish
  // is not attempted against a session that does not exist.
  async function ensureAccount(): Promise<boolean> {
    if (!needsAccount) return true;

    if (!email.trim() || !password) {
      setError("Escreva o email e a palavra-passe.");
      return false;
    }

    // Counted here rather than on the button, so signup_started means a real attempt with
    // credentials. Firing it on an empty press would inflate the denominator with people
    // who never typed anything, and signup_completed / signup_started is the ratio this
    // exists to make readable.
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "signup_started", draftId }),
      keepalive: true,
    }).catch(() => undefined);

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const data = await response.json();

    // An email that already exists is not a failure here - it is somebody publishing a
    // second restaurant, or coming back. Signing in covers both.
    if (!response.ok && response.status !== 409) {
      setError(data?.message ?? "Não foi possível criar a conta.");
      return false;
    }

    const signedIn = await signIn("credentials", { email: email.trim(), password, redirect: false });
    if (signedIn?.error) {
      setError(
        signedIn.code === "demasiadas_tentativas"
          ? "Demasiadas tentativas. Aguarde alguns minutos e tente novamente."
          : "Esse email já tem conta e a palavra-passe não coincide."
      );
      return false;
    }

    return true;
  }

  async function publish() {
    setPublishing(true);
    setError(null);
    try {
      if (!(await ensureAccount())) return;

      const response = await fetch("/api/restaurant/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId, slug: status?.slug || value.trim() }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Não foi possível publicar. Tente novamente.");
        return;
      }

      router.push(`/publicado/${data.slug}`);
    } catch (err) {
      console.error(err);
      setError("Não foi possível contactar o servidor.");
    } finally {
      setPublishing(false);
    }
  }

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const blocked = status !== null && !status.available;

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 py-16 text-white">
      <div className="w-full max-w-xl">
        <p className="text-sm uppercase tracking-widest text-zinc-500">Último passo</p>
        <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
          Vamos pôr {name} online
        </h1>
        <p className="mt-4 leading-relaxed text-zinc-400">
          {needsAccount
            ? "Falta só a sua conta e o endereço do site. Menos de um minuto."
            : "Falta só escolher o endereço do site. Pode deixar como está."}
        </p>

        {needsAccount && (
          <div className="mt-10 space-y-3">
            <label htmlFor="email" className="block text-sm font-medium">
              O seu email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-zinc-500"
            />

            <label htmlFor="password" className="block pt-2 text-sm font-medium">
              Palavra-passe
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              // Clearing the error as they correct it. It used to sit there unchanged while
              // somebody typed a longer password, so the screen still said they were wrong
              // after they had already fixed it.
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-zinc-500"
            />
            {/* Said up front rather than after failing. Finding out the rule by breaking it
                is the worst possible moment to learn it. */}
            <p className="text-sm text-zinc-500">
              Pelo menos 8 caracteres. É com isto que volta ao seu site depois.
            </p>
          </div>
        )}

        <label htmlFor="endereco" className="mt-10 block text-sm font-medium">
          Endereço
        </label>
        <div className="mt-2 flex items-center gap-1 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 focus-within:border-zinc-500">
          <span className="shrink-0 text-sm text-zinc-500">{origin}/s/</span>
          <input
            id="endereco"
            autoFocus
            value={value}
            // Set here rather than in the effect: typing is the event that makes the last
            // verdict stale, and an event handler is where that belongs.
            onChange={(e) => {
              setValue(e.target.value);
              setChecking(true);
            }}
            className="min-w-0 flex-1 bg-transparent text-white outline-none"
          />
        </div>

        <p className="mt-3 min-h-[1.25rem] text-sm">
          {checking && <span className="text-zinc-500">A verificar…</span>}
          {!checking && status?.available && <span className="text-emerald-400">✓ {status.message}</span>}
          {!checking && blocked && (
            <span className="text-red-400">
              {status.message}
              {status.suggestion && (
                <>
                  {" "}
                  <button
                    onClick={() => {
                      setValue(status.suggestion as string);
                      setChecking(true);
                    }}
                    className="underline underline-offset-4 transition hover:text-red-300"
                  >
                    Usar {status.suggestion}
                  </button>
                </>
              )}
            </span>
          )}
        </p>

        <button
          onClick={publish}
          disabled={publishing || checking || blocked || !value.trim()}
          className="mt-8 w-full rounded-xl bg-white px-6 py-4 font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-default disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          {publishing ? "A pôr online…" : "Pôr o meu site online"}
        </button>

        {/* Under the button, not above it. Above, the message pushed the button down by its
            own height the moment it appeared - so somebody clicking again to retry hit
            empty space where the button had been a second earlier. Here nothing moves, and
            the message lands exactly where they were already looking. */}
        {error ? (
          <p role="alert" className="mt-4 text-center text-sm text-red-400">
            {error}
          </p>
        ) : (
          <p className="mt-4 text-center text-sm text-zinc-500">
            Fica online já. Pode mudar o que quiser depois.
          </p>
        )}
      </div>
    </main>
  );
}
