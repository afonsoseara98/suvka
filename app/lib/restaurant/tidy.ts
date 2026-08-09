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
