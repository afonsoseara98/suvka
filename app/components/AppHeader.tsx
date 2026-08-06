"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";

// UX Audit v1 findings #1/#2/#3: no way back to the Dashboard from /new or /editor/[id],
// no sign-out anywhere, no visible account identity on any authenticated page. One
// shared header, rendered once by RequireAuth (the wrapper every authenticated page
// already uses), fixes all three at once instead of three separate patches.
export default function AppHeader() {
  const { data: session } = useSession();
  const [signingOut, setSigningOut] = useState(false);

  return (
    <header className="flex items-center justify-between border-b border-zinc-800 bg-black px-6 py-4">
      <Link href="/dashboard" className="text-lg font-bold text-white transition hover:text-zinc-300">
        Noctra
      </Link>

      <div className="flex items-center gap-4">
        {session?.user && (
          <span className="hidden text-sm text-zinc-400 sm:inline">{session.user.name || session.user.email}</span>
        )}
        <button
          onClick={() => {
            setSigningOut(true);
            signOut({ callbackUrl: "/" });
          }}
          disabled={signingOut}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-zinc-900 disabled:opacity-50"
        >
          {signingOut ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </header>
  );
}
