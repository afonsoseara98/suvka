"use client";

import { useEffect } from "react";

type Props = { projectId: string };

// WHAT THE SITE ACTUALLY DID FOR THE RESTAURANT
//
// The owner pays 19 EUR a month and the only honest answer to "did it work?" today is a
// shrug. This turns that into "este mes 43 pessoas carregaram em Como chegar e 28 ligaram",
// which is the sentence that renews a subscription.
//
// One delegated listener rather than a handler on every link: the actions are spread across
// the hero, the contact block and the ordering buttons, and wiring each one individually
// means the next action somebody adds is silently uncounted.
//
// No cookie, no identifier, nothing stored about the person. The request says "a phone
// number was tapped on this project" and cannot say who tapped it, on this visit or any
// other - which is why this can sit on somebody else's website at all. app/privacidade says
// exactly this, in those words.
export default function SiteEvents({ projectId }: Props) {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const link = (event.target as HTMLElement | null)?.closest?.("a");
      const href = link?.getAttribute("href");
      if (!href) return;

      const name = classify(href);
      if (!name) return;

      // keepalive, because tel: and external links tear the page down immediately and a
      // normal fetch would be cancelled before it left - the taps that matter most are
      // exactly the ones that navigate away.
      void fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, projectId }),
        keepalive: true,
      }).catch(() => undefined);
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [projectId]);

  return null;
}

function classify(href: string): string | null {
  if (href.startsWith("tel:")) return "phone_clicked";
  if (href.includes("wa.me")) return "whatsapp_clicked";
  if (href.includes("google.com/maps")) return "maps_clicked";
  if (/ubereats|glovo|bolt/i.test(href)) return "order_clicked";

  // Anything else leaving for another site from a restaurant's page is a booking - the only
  // external destination the product ever puts there. Checked last so the named platforms
  // above win.
  if (/^https?:\/\//i.test(href) && !href.includes("instagram.com") && !href.includes("pexels.com")) {
    return "reservation_clicked";
  }

  return null;
}
