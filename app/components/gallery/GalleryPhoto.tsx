"use client";

import { useEffect, useRef, useState } from "react";
import type { GalleryImage } from "@/app/types/landing";
import type { ThemeConfig } from "@/app/styles/theme";

type Props = {
  image: GalleryImage;
  theme: ThemeConfig;
  aspectRatio: string;
};

// One gallery photograph, with the two states a server component cannot express.
//
// Photographs arrive from a third-party CDN over a connection we do not control. Until one
// lands, the page showed a hole; if one never landed, the hole stayed. On a restaurant's
// site that reads as a broken page rather than a slow one - and the visitor's judgement is
// made in the seconds before the image arrives, not after.
//
// So the frame is always drawn, at the exact ratio the photograph will occupy, and it holds
// its own tone until the image fades in over it. A failure keeps that frame rather than
// collapsing: a considered empty panel is a design, a gap is a defect.
export default function GalleryPhoto({ image, theme, aspectRatio }: Props) {
  const [state, setState] = useState<"loading" | "loaded" | "failed">("loading");
  const imgRef = useRef<HTMLImageElement>(null);

  // The load event is not waited for - it is missed.
  //
  // The gallery is server-rendered, so the browser has the src in the HTML and starts
  // fetching immediately, while React only attaches onLoad when it hydrates. A photograph
  // that finishes first fires its load event into a listener that does not exist yet, and
  // the component sits at "loading" - meaning opacity 0 - over an image that is fully
  // decoded and sitting right there. The whole gallery renders as four empty frames.
  //
  // Asking the element what already happened is the only reliable answer, because there is
  // no event left to wait for. `complete` with no intrinsic width means it completed by
  // failing.
  useEffect(() => {
    const img = imgRef.current;
    if (!img || !img.complete) return;
    setState(img.naturalWidth > 0 ? "loaded" : "failed");
  }, []);

  return (
    <div
      className="relative overflow-hidden"
      style={{
        aspectRatio,
        borderRadius: theme.radius.lg,
        border: `1px solid ${theme.colors.border}`,
        // Drawn immediately, so the layout is complete before any network request
        // resolves. This is also the panel a failed image is left with.
        background: theme.colors.card,
      }}
    >
      {state !== "failed" && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          ref={imgRef}
          src={image.url}
          alt={image.alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setState("loaded")}
          onError={() => setState("failed")}
          className="h-full w-full object-cover transition-opacity duration-500"
          // Fading in rather than appearing avoids the flicker of four photographs
          // popping into place at slightly different moments.
          style={{ opacity: state === "loaded" ? 1 : 0 }}
        />
      )}

      {state === "loading" && (
        <div
          className="absolute inset-0 animate-pulse"
          style={{ background: theme.colors.surface }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
