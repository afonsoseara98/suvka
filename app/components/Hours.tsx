import type { OpeningHours } from "@/app/types/landing";
import type { ThemeConfig } from "@/app/styles/theme";
import type { LayoutPersonality } from "@/app/styles/layout";
import type { SectionHeading } from "./renderers/SectionRenderer";

import SectionShell from "./ui/SectionShell";
import SectionHeader from "./ui/SectionHeader";
import EditableText from "./editor/EditableText";
import OpenNow from "./hours/OpenNow";
import { tidyPhoneHref, whatsappHref, instagramHandle } from "@/app/lib/restaurant/tidy";

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

  type Entry = {
    label: string;
    field: "address" | "schedule" | "phone" | "whatsapp" | "email" | "instagram";
    value: string;
    href?: string;
    // What tapping it does, said out loud. An underlined address is not obviously a button
    // to somebody who does not expect one, and this is the section where every line is
    // something the customer wants to ACT on rather than read.
    action?: string;
    // Leaves the site. tel:, mailto: and a maps handoff should not, so they are marked.
    external?: boolean;
  };

  const entries: Entry[] = ([
    {
      label: data.labels?.address ?? "Address",
      field: "address",
      value: data.address,
      href: data.mapUrl,
      action: data.mapUrl ? (data.labels?.openInMaps ?? "Open in maps") : undefined,
      external: true,
    },
    { label: data.labels?.hours ?? "Hours", field: "schedule", value: data.schedule },
    // The printed number stays exactly as the owner wrote it; only what gets dialled is
    // normalised, so a nine-digit Portuguese number also works from a foreign phone.
    { label: data.labels?.phone ?? "Phone", field: "phone", value: data.phone, href: data.phone ? `tel:${tidyPhoneHref(data.phone)}` : undefined },
    {
      label: data.labels?.whatsapp ?? "WhatsApp",
      field: "whatsapp",
      value: data.whatsapp ?? "",
      href: data.whatsapp ? whatsappHref(data.whatsapp) : undefined,
      external: true,
    },
    {
      label: data.labels?.email ?? "Email",
      field: "email",
      value: data.email ?? "",
      // The subject is pre-filled so the message arrives already sorted from the rest of
      // the owner inbox, and the customer starts from a blank body rather than a blank page.
      href: data.email ? `mailto:${data.email}?subject=${encodeURIComponent(data.labels?.contactSubject ?? "Website")}` : undefined,
    },
    {
      label: data.labels?.instagram ?? "Instagram",
      field: "instagram",
      // The handle, not the URL: nobody reads a full instagram.com address out loud.
      value: data.instagram ? instagramHandle(data.instagram) : "",
      href: data.instagram || undefined,
      external: true,
    },
  ] as Entry[]).filter((entry) => entry.value && entry.value.trim().length > 0);

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

      {/* Two columns rather than three: with WhatsApp and email the section can carry five
          entries, and three columns left an orphan on its own row. */}
      <div className="mx-auto mt-10 grid max-w-3xl gap-8 sm:grid-cols-2">
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
            {/* Above the hours, never instead of them. Renders nothing at all unless the
                schedule could be read with certainty - see openNow.ts. */}
            {entry.field === "schedule" && !onUpdateContent && (
              <div className="mt-2">
                <OpenNow schedule={entry.value} theme={theme} />
              </div>
            )}

            <div
              className={entry.field === "schedule" ? "leading-relaxed" : "mt-2 leading-relaxed"}
              style={{ color: theme.colors.primary, whiteSpace: entry.field === "schedule" ? "pre-line" : "normal" }}
            >
              {entry.href && !onUpdateContent ? (
                <a
                  href={entry.href}
                  className="hover:underline"
                  style={{ color: theme.colors.primary }}
                  {...(entry.external ? { target: "_blank", rel: "noreferrer" } : {})}
                >
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

            {/* Says what the tap does. Without it the address is an underlined string, and
                a customer standing on the street does not discover that it opens their map
                by guessing. */}
            {entry.action && entry.href && !onUpdateContent && (
              <a
                href={entry.href}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm hover:underline"
                style={{ color: theme.colors.accent }}
              >
                {entry.action} →
              </a>
            )}
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
