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
  },
  en: {
    menu: "Menu",
    findUs: "Find us",
    address: "Address",
    hours: "Hours",
    phone: "Phone",
    callToBook: "Call to book",
    seeMenu: "See the menu",
  },
};

export function labelsFor(language: SiteLanguage): SiteLabels {
  return LABELS[language] ?? LABELS.pt;
}

// Portugal is the market. An owner who wants English can switch, but the default should be
// right for the overwhelming majority rather than for whoever wrote the code.
export const DEFAULT_LANGUAGE: SiteLanguage = "pt";
