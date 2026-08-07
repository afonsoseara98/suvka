// THE PAGE SPEAKS THE RESTAURANT'S LANGUAGE
//
// The generated site said "Find us", "Menu", "Call to book" - in English, on a site whose
// visitors are people in Porto looking for somewhere to eat tonight. The owner cannot
// publish that, and would not recognise it as theirs.
//
// This is not internationalising the product. It is a small fixed set of words that appear
// on the finished page because the page needs a word there, and they must be in the
// language of the people reading it. Everything else on the page is already the owner's own
// text, so this is the entire vocabulary the system puts into their mouth.
export type SiteLanguage = "pt" | "en";

export const LANGUAGES: ReadonlyArray<{ value: SiteLanguage; label: string }> = [
  { value: "pt", label: "Português" },
  { value: "en", label: "English" },
];

export interface SiteLabels {
  menu: string;
  findUs: string;
  address: string;
  hours: string;
  phone: string;
  callToBook: string;
  seeMenu: string;

  // The word for the business itself, used in the page title a customer sees in their
  // browser tab and in Google. "Taberna do Bairro — Portuguese restaurant" is not a title a
  // Portuguese restaurant would ever choose for itself.
  restaurant: string;

  // Shown when the owner ticked takeaway. Before this it changed nothing they could see:
  // it fed a fallback sentence that any owner who wrote a description never saw, so the
  // question was being asked and the answer discarded.
  takeaway: string;

  // Only used when the owner leaves the description blank.
  fallbackSubtitle: (cuisine: string) => string;
}

// Cuisines are stored in English because that is the stable key the image queries and the
// warmth table are written against. What the owner and their customers SEE has to be their
// own language - a Portuguese restaurant badged "✨ Portuguese" reads as a translation of
// itself.
const CUISINE_NAMES: Record<SiteLanguage, Record<string, string>> = {
  pt: {
    Portuguese: "Cozinha portuguesa",
    Italian: "Cozinha italiana",
    Japanese: "Cozinha japonesa",
    "Fast-casual": "Refeições rápidas",
    Café: "Café",
    "Fine dining": "Alta cozinha",
    Burgers: "Hambúrgueres",
    Pizza: "Pizzaria",
  },
  en: {
    Portuguese: "Portuguese",
    Italian: "Italian",
    Japanese: "Japanese",
    "Fast-casual": "Fast-casual",
    Café: "Café",
    "Fine dining": "Fine dining",
    Burgers: "Burgers",
    Pizza: "Pizza",
  },
};

export function cuisineName(cuisine: string, language: SiteLanguage): string {
  return CUISINE_NAMES[language]?.[cuisine] ?? cuisine;
}

// Only ever shown in the form. The site never prints the style - it is expressed as the
// design - so this exists purely so the owner is choosing between words they recognise.
const STYLE_NAMES_PT: Record<string, string> = {
  Modern: "Moderno",
  Classic: "Clássico",
  Minimal: "Minimalista",
  Rustic: "Rústico",
  Elegant: "Elegante",
  Casual: "Descontraído",
};

export function styleName(style: string): string {
  return STYLE_NAMES_PT[style] ?? style;
}

const LABELS: Record<SiteLanguage, SiteLabels> = {
  pt: {
    menu: "Ementa",
    findUs: "Onde estamos",
    address: "Morada",
    hours: "Horário",
    phone: "Telefone",
    callToBook: "Ligar para reservar",
    seeMenu: "Ver a ementa",
    restaurant: "Restaurante",
    takeaway: "Take-away e entregas",
    fallbackSubtitle: (cuisine) => `${cuisine}.`,
  },
  en: {
    menu: "Menu",
    findUs: "Find us",
    address: "Address",
    hours: "Hours",
    phone: "Phone",
    callToBook: "Call to book",
    seeMenu: "See the menu",
    restaurant: "Restaurant",
    takeaway: "Takeaway and delivery",
    fallbackSubtitle: (cuisine) => `${cuisine} cooking.`,
  },
};

export function labelsFor(language: SiteLanguage): SiteLabels {
  return LABELS[language] ?? LABELS.pt;
}

// Portugal is the market. An owner who wants English can switch, but the default should be
// right for the overwhelming majority rather than for whoever wrote the code.
export const DEFAULT_LANGUAGE: SiteLanguage = "pt";
