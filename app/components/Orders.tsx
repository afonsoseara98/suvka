import type { OrderLinks } from "@/app/types/landing";
import type { ThemeConfig } from "@/app/styles/theme";
import type { LayoutPersonality } from "@/app/styles/layout";

import SectionShell from "./ui/SectionShell";

type Props = {
  data: OrderLinks;
  theme: ThemeConfig;
  layout: LayoutPersonality;
  rhythm: "dense" | "standard" | "breather";
};

// WHERE THE CUSTOMER CAN ALREADY PAY THEM
//
// "Take-away e entregas" used to be a sentence sitting in the opening-hours column. A
// visitor read it, wanted to order, and had nothing to press - so they left the site and
// opened Glovo themselves, where the restaurant competes with everything else in the city
// instead of being the thing already on screen.
//
// Not an integration and not a menu: three links the owner pasted, rendered big enough to
// hit with a thumb. Nothing here stores state.
//
// No heading-over-nothing case to handle - buildPage does not add the section unless at
// least one link exists - but the guard stays because this component is also reachable from
// a saved project whose links were later cleared in the editor.
export default function Orders({ data, theme, layout, rhythm }: Props) {
  if (!data?.links?.length) return null;

  return (
    <SectionShell theme={theme} layout={layout} rhythm={rhythm}>
      <div id="orders" style={{ scrollMarginTop: 24 }} />

      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-2xl font-bold sm:text-3xl" style={{ color: theme.colors.primary }}>
          {data.title}
        </h2>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {data.links.map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              // Leaves for a third party, so it opens beside the restaurant's page rather
              // than closing it.
              className="inline-block rounded-xl px-7 py-4 font-semibold transition hover:opacity-90"
              style={{
                background: theme.colors.card,
                border: `1px solid ${theme.colors.border}`,
                color: theme.colors.primary,
              }}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
