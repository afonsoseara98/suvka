import type { GalleryImage } from "@/app/types/landing";
import type { ThemeConfig } from "@/app/styles/theme";
import type { LayoutPersonality } from "@/app/styles/layout";
import type { SectionHeading } from "./renderers/SectionRenderer";

import SectionShell from "./ui/SectionShell";
import SectionHeader from "./ui/SectionHeader";

type Props = {
  items: GalleryImage[];
  theme: ThemeConfig;
  layout: LayoutPersonality;
  rhythm: "dense" | "standard" | "breather";
  variant?: string;
  heading?: SectionHeading;
};

// For a restaurant, a barber or a photographer the pictures ARE the argument. There was no
// way to say that: the only image on the whole page was one hero shot, and everything below
// it was cards of text with emoji icons.
//
// Deliberately not a carousel. A visitor deciding where to eat wants to see the food at a
// glance, and a carousel hides four of five photos behind an interaction most people on a
// phone never make.
/* eslint-disable @next/next/no-img-element */
export default function Gallery({ items, theme, layout, rhythm, variant, heading }: Props) {
  if (items.length === 0) return null;

  // With few images each one has to carry weight, so they run large; with many, a tighter
  // grid reads as a body of work rather than as three stock photos padding a page.
  const columns = items.length <= 2 ? "sm:grid-cols-2" : items.length <= 4 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";
  const isMasonry = variant === "masonry";

  return (
    <SectionShell theme={theme} layout={layout} rhythm={rhythm}>
      {(heading?.title || heading?.eyebrow) && (
        <SectionHeader
          theme={theme}
          layout={layout}
          eyebrow={heading?.eyebrow}
          title={heading?.title ?? ""}
          description={heading?.description}
        />
      )}

      <div className={`mt-10 grid grid-cols-1 gap-4 ${columns}`}>
        {items.map((image, index) => (
          <figure key={index} className="m-0">
            <div
              className="overflow-hidden"
              style={{
                // A staggered aspect ratio stops five photos reading as a contact sheet.
                aspectRatio: isMasonry && index % 3 === 0 ? "3 / 4" : "4 / 3",
                borderRadius: theme.radius.lg,
                border: `1px solid ${theme.colors.border}`,
                background: theme.colors.card,
              }}
            >
              <img
                src={image.url}
                alt={image.alt}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </div>
            {image.credit && (
              <figcaption className="mt-1 text-right text-[10px]" style={{ color: theme.colors.secondary }}>
                <a href={image.credit.url} target="_blank" rel="noreferrer nofollow" className="hover:underline">
                  {image.credit.name}
                </a>
                {" / "}
                {image.credit.source}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </SectionShell>
  );
}
