import type { ResolvedImage } from "@/app/ai/types/visual";
import type { ThemeConfig } from "@/app/styles/theme";

type Props = {
  image: ResolvedImage;
  theme: ThemeConfig;
  // The hero image is the largest thing above the fold on a published page, so it is the
  // one image that must never be lazy - it IS the Largest Contentful Paint. Any other
  // placement should pass priority={false}.
  priority?: boolean;
};

// Deliberately a plain <img> rather than next/image.
//
// next/image requires every image host to be declared in next.config's remotePatterns,
// which would hard-code the current stock provider into build configuration and defeat
// the point of app/lib/images' provider interface - swapping vendor would become a config
// migration instead of an env change. The alternative, a wildcard remote pattern, turns
// the deployment into an open image proxy for any URL that reaches the page state.
// Stock CDNs already serve pre-resized, cache-friendly derivatives, so the optimizer buys
// little here and costs vendor neutrality.
/* eslint-disable @next/next/no-img-element */
export default function HeroPhoto({ image, theme, priority = true }: Props) {
  return (
    <figure className="relative m-0">
      <div
        className="relative overflow-hidden"
        style={{
          // Reserving the exact intrinsic ratio is what stops the headline from jumping
          // when the photo arrives - cumulative layout shift is a ranking signal on the
          // published pages this renders, not just a polish detail.
          aspectRatio: `${image.width} / ${image.height}`,
          borderRadius: theme.radius.lg,
          border: `1px solid ${theme.colors.border}`,
          boxShadow: theme.shadow.lg,
          background: theme.colors.card,
        }}
      >
        <img
          src={image.url}
          alt={image.alt}
          width={image.width}
          height={image.height}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          className="h-full w-full object-cover"
        />
      </div>

      {/* Rendered whenever the source asks for it. The current provider's license does not
          require attribution, but the product must not depend on that staying true for
          whatever provider is configured next - a customer's commercial site is not the
          place to discover a licensing obligation. */}
      {image.credit && (
        <figcaption className="mt-2 text-right text-[11px]" style={{ color: theme.colors.secondary }}>
          <a href={image.credit.url} target="_blank" rel="noreferrer nofollow" className="hover:underline">
            {image.credit.name}
          </a>
          {" / "}
          {image.credit.source}
        </figcaption>
      )}
    </figure>
  );
}
