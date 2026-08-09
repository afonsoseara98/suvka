// WHAT THE OWNER MEANT, WRITTEN THE WAY A MENU WRITES IT
//
// The product's promise is that nothing appears on the site that the owner did not supply.
// That is about facts - reviews, ratings, customer counts - not about formatting. A
// restaurant filling in three dishes types the prices three different ways, because that is
// what people do:
//
//     Arroz de marisco     24,00
//     Sapateira recheada   18€
//     Ovos moles           4,50 euros
//
// Every one of those is what he meant, and printed side by side they make his own menu look
// careless. He would never let that go out on a printed card, and he did not choose it here
// either - he just filled in a form three times.
//
// So these tidy the presentation and change no fact. 18€ is still eighteen euros. A price
// that is not a number at all ("sob consulta", "PVP") is left exactly as written, because
// there the text IS the fact.

// Portuguese convention: comma for decimals, space before the symbol.
const PRICE_PATTERN = /^\s*(?:€\s*)?(\d{1,4})(?:[.,](\d{1,2}))?\s*(?:€|eur|euro|euros)?\s*$/i;

export function tidyPrice(raw: string): string {
  const match = raw.match(PRICE_PATTERN);
  // Anything that is not plainly a number of euros - "sob consulta", "20/30", "a partir de
  // 15" - is the owner saying something, not formatting a number. Left untouched.
  if (!match) return raw.trim();

  const [, whole, decimals] = match;
  const cents = (decimals ?? "").padEnd(2, "0");
  return `${whole},${cents} €`;
}

// TAP THE ADDRESS, THE MAP OPENS
//
// The address was plain text. Somebody standing on a street in Aveiro with the restaurant's
// site open had to select it, copy it, leave, open Maps and paste - which nobody does. They
// close the page and search the name in Google instead, which is the competitor.
//
// A universal Google Maps link rather than a `geo:` URI: geo: opens the default map app on
// Android and does nothing at all on a desktop, where roughly half of these pages are read.
// This form opens the Google Maps app when it is installed - on iOS too - and falls back to
// the browser, where the phone still offers to hand off to Apple Maps. One link that works
// everywhere beats three that each work in one place.
//
// Deliberately NOT an embedded map. An iframe from Google would load Google's cookies onto
// a customer's website, and app/privacidade promises the opposite in writing: "Não colocamos
// cookies de seguimento nem ferramentas de análise nos sites publicados dos nossos
// clientes." A link costs the visitor nothing until they choose to tap it.
export function mapsHref(address: string): string | undefined {
  const query = address.trim();
  if (!query) return undefined;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

// A WhatsApp link needs the country code and nothing else - no plus, no spaces. Reuses the
// phone normalisation so a number typed as "912 345 678" reaches the same place as one typed
// as "+351 912345678", and refuses rather than guesses when it cannot tell what the number
// is: a wa.me link built from a wrong number opens a chat with a stranger.
export function whatsappHref(raw: string, message?: string): string | undefined {
  const dialable = tidyPhoneHref(raw);
  if (!dialable.startsWith("+")) return undefined;

  const digits = dialable.slice(1);
  const text = message?.trim() ? `?text=${encodeURIComponent(message.trim())}` : "";
  return `https://wa.me/${digits}${text}`;
}

// Asked "qual é o seu Instagram?", a person answers "@tabernadosal", or "tabernadosal", or
// pastes the whole URL. All three mean the same account, and rejecting two of them teaches
// the owner that the form is fighting him. Turned into a link once, here, so nothing
// downstream has to know which of the three arrived.
export function instagramUrl(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;

  const handle = value.replace(/^@/, "").replace(/^instagram\.com\//i, "").replace(/\/+$/, "");
  return handle ? `https://instagram.com/${handle}` : "";
}

// What the page shows for an Instagram account. The link has to be a full URL; printing one
// is not what anybody says out loud, and "https://instagram.com/tabernadosal" sitting in a
// column next to a phone number reads as a mistake.
export function instagramHandle(url: string): string {
  const handle = url.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/+$/, "");
  return handle ? `@${handle.replace(/^@/, "")}` : "";
}

// A Portuguese landline or mobile is nine digits. Written without the country code it dials
// perfectly from inside Portugal and not at all from the German tourist's phone standing
// outside the door in August - which for a restaurant in Aveiro is the call that matters.
//
// Only the number in the tel: link changes. What is printed on the page stays exactly as the
// owner wrote it, because that is how he says it out loud.
export function tidyPhoneHref(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (/^00\d+$/.test(digits)) return `+${digits.slice(2)}`;
  if (/^\d{9}$/.test(digits)) return `+351${digits}`;
  // Anything else - a short internal number, something mistyped - is dialled as given
  // rather than guessed at.
  return digits;
}
