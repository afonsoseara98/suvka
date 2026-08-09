import type { OpeningHours } from "@/app/types/landing";
import type { ThemeConfig } from "@/app/styles/theme";
import type { LayoutPersonality } from "@/app/styles/layout";
import type { SectionHeading } from "./renderers/SectionRenderer";

import SectionShell from "./ui/SectionShell";
import SectionHeader from "./ui/SectionHeader";
import EditableText from "./editor/EditableText";
import { tidyPhoneHref } from "@/app/lib/restaurant/tidy";

type Props = {
  data: OpeningHours;
  theme: ThemeConfig;
  layout: LayoutPersonality;
  rhythm: "dense" | "standard" | "breather";
  variant?: string;
  heading?: SectionHeading;
  onUpdateContent?: (content: OpeningHours) => void;
};

// The single most-used part of a local business's website, and it did not exist.
//
// Someone looking up a restaurant, a barber or a clinic is overwhelmingly there for three
// facts: where, when, and what number to call. Everything else on the page is persuasion;
// this is the part people actually came for. A page that opens with a conversion-optimised
// hero and never states an address has optimised the wrong thing.
//
// The phone number is a `tel:` link because on a phone - which is where most of these
// visits happen - the whole interaction is one tap.
export default function Hours({ data, theme, layout, rhythm, heading, onUpdateContent }: Props) {
  const commit = (field: keyof OpeningHours) =>
    onUpdateContent && ((value: string) => onUpdateContent({ ...data, [field]: value }));

  const entries: Array<{ label: string; field: "address" | "schedule" | "phone"; value: string; href?: string }> = ([
    { label: data.labels?.address ?? "Address", field: "address", value: data.address, href: data.mapUrl },
    { label: data.labels?.hours ?? "Hours", field: "schedule", value: data.schedule },
    // The printed number stays exactly as the owner wrote it; only what gets dialled is
    // normalised, so a nine-digit Portuguese number also works from a foreign phone.
    { label: data.labels?.phone ?? "Phone", field: "phone", value: data.phone, href: data.phone ? `tel:${tidyPhoneHref(data.phone)}` : undefined },
  ] as Array<{ label: string; field: "address" | "schedule" | "phone"; value: string; href?: string }>).filter((entry) => entry.value && entry.value.trim().length > 0);

  if (entries.length === 0) return null;

  return (
    <SectionShell theme={theme} layout={layout} rhythm={rhythm}>
      {/* The hero CTA links here. Without a target the button scrolls nowhere. */}
      <div id="hours" style={{ scrollMarginTop: 24 }} />
      <SectionHeader
        theme={theme}
        layout={layout}
        eyebrow={heading?.eyebrow}
        title={heading?.title ?? "Find us"}
        description={heading?.description}
      />

      <div className="mx-auto mt-10 grid max-w-3xl gap-8 sm:grid-cols-3">
        {entries.map((entry) => (
          <div key={entry.field}>
            <div
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: theme.colors.secondary }}
            >
              {entry.label}
            </div>
            {/* Opening hours are the one field an owner deliberately writes across several
                lines - "Tue-Sun 12:00-15:00 and 19:00-22:30" then "Closed Mondays". HTML
                collapses those newlines, so the two facts ran together into one unreadable
                sentence. Honouring the line breaks means the page shows the hours the way
                the owner wrote them, which is also how a door sign shows them. */}
            <div
              className="mt-2 leading-relaxed"
              style={{ color: theme.colors.primary, whiteSpace: entry.field === "schedule" ? "pre-line" : "normal" }}
            >
              {entry.href && !onUpdateContent ? (
                <a href={entry.href} className="hover:underline" style={{ color: theme.colors.primary }}>
                  {entry.value}
                </a>
              ) : (
                <EditableText
                  as="div"
                  value={entry.value}
                  onCommit={commit(entry.field)}
                  multiline={entry.field === "schedule"}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
