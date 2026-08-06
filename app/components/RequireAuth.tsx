"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AppHeader from "./AppHeader";

// Shared by every authenticated-only route (/dashboard, /new, /editor/[id]) - the same
// loading/unauthenticated/authenticated gate app/page.tsx's Home used to inline once for
// itself. An unauthenticated visit redirects to "/" (SignInForm) rather than rendering
// anything from the page underneath. Also the one place AppHeader is rendered - every
// authenticated page gets it for free, rather than each page importing it separately.
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
    }
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-zinc-400">Loading...</p>
      </main>
    );
  }

  return (
    <>
      <AppHeader />
      {children}
    </>
  );
}
