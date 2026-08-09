"use client";

import { useEffect, useState } from "react";
import { openStateFor, type OpenState } from "@/app/lib/restaurant/openNow";
import type { ThemeConfig } from "@/app/styles/theme";

type Props = {
  schedule: string;
  theme: ThemeConfig;
};

// "ABERTO AGORA" OR NOTHING AT ALL
//
// Computed in the browser rather than on the server, for one reason: a published page is
// cached, and a cached "Aberto agora" is a page that says the restaurant is open at four in
// the morning. Rendering nothing until mount also removes any chance of a hydration
// mismatch between the server's clock and the visitor's.
//
// openStateFor returns null for anything it cannot read with certainty, and null renders
// nothing - the hours stay printed underneath exactly as the owner typed them. A wrong
// "Fechado" is a customer who never calls and nobody ever hears about it.
export default function OpenNow({ schedule, theme }: Props) {
  const [state, setState] = useState<OpenState | null>(null);

  useEffect(() => {
    const read = () => setState(openStateFor(schedule));
    read();

    // Somebody who leaves the page open through 15:00 should see it change. A minute is
    // frequent enough to be right and cheap enough to be free.
    const timer = setInterval(read, 60_000);
    return () => clearInterval(timer);
  }, [schedule]);

  if (!state) return null;

  return (
    <p className="mb-3 flex flex-wrap items-baseline gap-x-2 text-sm">
      <span className="font-semibold" style={{ color: state.open ? "#4ade80" : "#f87171" }}>
        {state.open ? "🟢 Aberto agora" : "🔴 Fechado"}
      </span>
      <span style={{ color: theme.colors.secondary }}>
        {state.open
          ? `Fecha às ${state.closesAt}`
          : state.opensDay === "today"
            ? `Abre às ${state.opensAt}`
            : state.opensDay === "tomorrow"
              ? `Abre amanhã às ${state.opensAt}`
              : `Abre ${state.opensDay} às ${state.opensAt}`}
      </span>
    </p>
  );
}
