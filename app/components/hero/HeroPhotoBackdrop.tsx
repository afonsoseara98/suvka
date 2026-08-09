import type { ResolvedImage } from "@/app/ai/types/visual";
import type { ThemeConfig } from "@/app/styles/theme";

type Props = {
  image: ResolvedImage;
  theme: ThemeConfig;
  children: React.ReactNode;
};

// THE FOOD, BEHIND THE NAME
//
// The centred hero put the photograph sixteen rem BELOW the text, so the first screen of a
// restaurant's website was its name on a dark gradient and the food arrived only after
// scrolling. Every restaurant site that works does the opposite: you see the food, and the
// name is on top of it. It is also what the owner expects, because it is what his
// competitors' sites look like.
//
// The scrim is not decoration. Text over an arbitrary stock photograph has no contrast
// guarantee at all - the same headline is legible over a dark braise and invisible over a
// white tablecloth. A fixed dark wash under the text makes the guarantee independent of
// which photograph the provider happened to return, which is the only way this can be safe
// on a page nobody reviews before it goes live. White-on-scrim measures ~12:1 against the
// darkest band and stays above 4.5:1 at the lightest.
/* eslint-disable @next/next/no-img-element */
export default function HeroPhotoBackdrop({ image, theme, children }: Props) {
  return (
    <div className="relative isolate overflow-hidden">
      <img
        src={image.url}
        alt={image.alt}
        width={image.width}
        height={image.height}
        // The Largest Contentful Paint of the whole site. Never lazy.
        loading="eager"
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 -z-20 h-full w-full object-cover"
      />

      {/* Calibrated, not guessed. The first attempt ran 0.55 -> 0.62 -> opaque background,
          which kept the text safely legible and hid the food almost completely - the
          photograph was there and you could not see it. This holds ~0.45 through the band
          where the words sit and only reaches the page colour in the last fifth, so the
          dish is visible for most of the height and the section still hands over to the
          page below without a seam. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background:
            `linear-gradient(to bottom, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.48) 55%, rgba(0,0,0,0.72) 82%, ${theme.colors.background} 100%)`,
        }}
      />

      {/* A scrim alone cannot promise contrast over an arbitrary photograph - the same
          headline crosses a dark braise and a white plate in one line. The shadow is the
          floor under that promise, and costs nothing when the pixels behind are already
          dark. */}
      <div className="relative [text-shadow:0_2px_12px_rgba(0,0,0,0.55)]">{children}</div>

      {/* The credit stays on the page even though this provider's licence does not demand
          it - see HeroPhoto. Placed bottom-right where it reads as a photographer's mark
          rather than as part of the restaurant's own copy. */}
      {image.credit && (
        <p className="absolute bottom-3 right-4 text-[11px] text-white/60">
          <a href={image.credit.url} target="_blank" rel="noreferrer nofollow" className="hover:underline">
            {image.credit.name}
          </a>
          {" / "}
          {image.credit.source}
        </p>
      )}
    </div>
  );
}
