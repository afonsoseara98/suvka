// THE NINE FIELDS
//
// Replaces "describe your business" as the way a restaurant gets a site. A free-text box
// forces the pipeline to guess at facts it cannot know - and when it guesses, it invents:
// the previous version produced "98% Success Rate" and named reviews from people who do
// not exist, because it was asked to fill a page from a sentence.
//
// A form cannot invent. Every value below is something the owner typed, so every value on
// the finished page is something the owner said. Free text remains supported for other
// businesses; this is a second entry point, not a replacement.

import type { SiteLanguage } from "./labels";
import { instagramUrl } from "./tidy";

export interface RestaurantDish {
  name: string;
  price: string;
  description: string;
}

export const CUISINES = [
  "Portuguese",
  "Italian",
  "Japanese",
  "Fast-casual",
  "Café",
  "Fine dining",
  "Burgers",
  "Pizza",
] as const;

export const STYLES = ["Modern", "Classic", "Minimal", "Rustic", "Elegant", "Casual"] as const;

export type Cuisine = (typeof CUISINES)[number];
export type RestaurantStyle = (typeof STYLES)[number];

export interface RestaurantInput {
  name: string;
  cuisine: Cuisine;
  address: string;
  phone: string;
  schedule: string;
  dishes: RestaurantDish[];
  hasDelivery: boolean;
  style: RestaurantStyle;
  description: string;

  // Filled from the account at publish time, never asked for in the public form: a visitor
  // who has not decided to sign up should not be handing over contact details.
  email: string;

  // EVERY OPTIONAL FIELD IS A BUTTON THAT DOES SOMETHING
  //
  // "Site atual" used to live here. It was never rendered - it existed so we would know
  // whether a restaurant already had a website - and it cost the owner a field. A form that
  // charges the owner attention for our research is a form with a lower completion rate,
  // and completion is the only number that matters on this screen.
  //
  // What replaced it all converts: each one becomes a link the visitor can act on, and each
  // appears only if it was filled in. A button that goes nowhere is worse than no button.
  //
  // The only way to reach a restaurant used to be its phone number, which is the one channel
  // a person will not use at 23:40 to ask about a table on Saturday.
  whatsapp: string;
  // TheFork, CoverManager, their own system. Whatever they already use; we integrate with
  // nothing and store nothing.
  bookingUrl: string;
  instagram: string;
  // The three platforms a Portuguese restaurant is actually on. Deliberately three named
  // fields rather than a generic list: the owner recognises the name of the app he already
  // gets orders from, and a "add a link" builder is a feature, not a conversion.
  uberEats: string;
  glovo: string;
  boltFood: string;

  // Which language the finished SITE speaks. Portugal is the market, so the default is
  // Portuguese - an owner who wants English can switch.
  language: SiteLanguage;
}

export const DESCRIPTION_MAX = 200;

export type FieldErrors = Partial<Record<keyof RestaurantInput, string>> & {
  dishes?: string;
};

function isBlank(value: unknown): boolean {
  return typeof value !== "string" || value.trim().length === 0;
}

// Validation is deliberately about what is REQUIRED to make an honest page, not about
// format policing. A phone number is not regex-checked: restaurants write them a dozen
// ways, and rejecting a real number because it has a space in it is a worse failure than
// accepting an odd one. The only hard requirements are the facts the page cannot be
// truthful without.
// Field ceilings. Not arbitrary: each is roughly twice the longest real value, so a
// genuine restaurant never meets one, while a paste of an entire menu into the name box -
// which is exactly what happens when someone is filling a form on a phone in a busy
// kitchen - is caught here instead of arriving as a 4000-character headline that breaks
// the page layout and the slug.
export const LIMITS = {
  name: 80,
  address: 160,
  phone: 40,
  schedule: 400,
  email: 120,
  whatsapp: 40,
  link: 300,
  instagram: 120,
  dishName: 80,
  dishPrice: 20,
  dishDescription: 200,
} as const;

// Every message is in Portuguese because the person reading it runs a restaurant in
// Portugal, and a form that asks in one language and complains in another is a form that
// looks broken. Each says what to do rather than what went wrong.
export interface ValidationOptions {
  // The public form never asks for an email - it comes from the account at publish time -
  // so requiring one there produced an error for a field that does not exist on screen.
  // The message had nowhere to render and the submit returned silently: the button looked
  // broken. Making the caller state which form it is stops that recurring.
  requireEmail?: boolean;
}

export function validateRestaurantInput(input: Partial<RestaurantInput>, options: ValidationOptions = {}): FieldErrors {
  const { requireEmail = true } = options;
  const errors: FieldErrors = {};

  if (isBlank(input.name)) errors.name = "Escreva o nome do restaurante.";
  else if (String(input.name).trim().length > LIMITS.name) errors.name = `O nome é demasiado longo (máximo ${LIMITS.name} caracteres).`;

  if (!input.cuisine || !CUISINES.includes(input.cuisine)) errors.cuisine = "Escolha o tipo de cozinha.";
  if (!input.style || !STYLES.includes(input.style)) errors.style = "Escolha um estilo.";

  if (isBlank(input.address)) errors.address = "A morada é o que os clientes mais procuram no site.";
  else if (String(input.address).trim().length > LIMITS.address) errors.address = `A morada é demasiado longa (máximo ${LIMITS.address} caracteres).`;

  if (isBlank(input.phone)) errors.phone = "O telefone é como a maioria vai reservar.";
  else if (String(input.phone).trim().length > LIMITS.phone) errors.phone = "Esse número parece demasiado longo.";

  if (isBlank(input.schedule)) errors.schedule = "O horário é uma das razões pelas quais visitam o site.";
  else if (String(input.schedule).trim().length > LIMITS.schedule) errors.schedule = `O horário é demasiado longo (máximo ${LIMITS.schedule} caracteres).`;

  // Deliberately the loosest possible check. An address with an @ and a dot is almost
  // certainly a real attempt; a stricter pattern rejects valid addresses and teaches the
  // owner that the form is fighting them.
  if (requireEmail && isBlank(input.email)) errors.email = "Precisamos de um email para o contactar.";
  else if (isBlank(input.email)) { /* not asked for on this form */ }
  else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(input.email).trim())) errors.email = "Isso não parece um endereço de email.";
  else if (String(input.email).trim().length > LIMITS.email) errors.email = "Esse email parece demasiado longo.";

  if (typeof input.whatsapp === "string" && input.whatsapp.trim().length > LIMITS.whatsapp) {
    errors.whatsapp = "Esse número parece demasiado longo.";
  }

  // A link that goes to the wrong place is worse than none, and every one of these is
  // pasted from somewhere else. Checked here rather than left to fail silently under a
  // customer's thumb.
  for (const [field, what] of [
    ["bookingUrl", "O link de reservas"],
    ["uberEats", "O link do Uber Eats"],
    ["glovo", "O link do Glovo"],
    ["boltFood", "O link do Bolt Food"],
  ] as const) {
    const raw = input[field];
    if (isBlank(raw)) continue;

    const value = String(raw).trim();
    if (value.length > LIMITS.link) errors[field] = `${what} é demasiado longo.`;
    else if (!/^https?:\/\/[^\s.]+\.[^\s]{2,}$/i.test(value)) {
      errors[field] = `${what} tem de começar por https:// e ser um endereço completo.`;
    }
  }

  // Accepts "@tabernadosal", "tabernadosal" or the full URL, because all three are what a
  // person means when asked for their Instagram. normaliseRestaurantInput turns whichever
  // they typed into a link.
  if (!isBlank(input.instagram) && String(input.instagram).trim().length > LIMITS.instagram) {
    errors.instagram = "Esse Instagram parece demasiado longo.";
  }

  const dishes = Array.isArray(input.dishes) ? input.dishes : [];
  const complete = dishes.filter((dish) => !isBlank(dish?.name) && !isBlank(dish?.price));
  if (complete.length === 0) {
    // A menu with no dishes is not a menu, and the page would fall back to being a poster.
    errors.dishes = "Adicione pelo menos um prato, com nome e preço.";
  } else if (
    complete.some(
      (dish) =>
        dish.name.trim().length > LIMITS.dishName ||
        dish.price.trim().length > LIMITS.dishPrice ||
        (dish.description ?? "").trim().length > LIMITS.dishDescription
    )
  ) {
    errors.dishes = "Um dos pratos tem texto a mais. Use nomes e descrições curtas.";
  }

  if (typeof input.description === "string" && input.description.length > DESCRIPTION_MAX) {
    errors.description = `Use menos de ${DESCRIPTION_MAX} caracteres.`;
  }

  return errors;
}

// The order the form shows the fields in. Used to move the person to the FIRST thing that
// needs their attention after a failed submit - on a phone, an error four fields above the
// button is invisible, and a form that appears to do nothing when you press the button is
// a form people abandon.
export const FIELD_ORDER: ReadonlyArray<keyof FieldErrors> = [
  "name",
  "cuisine",
  "style",
  "language",
  "address",
  "phone",
  "schedule",
  "whatsapp",
  "bookingUrl",
  "instagram",
  "uberEats",
  "glovo",
  "boltFood",
  "dishes",
  "email",
  "description",
];

export function firstErrorField(errors: FieldErrors): keyof FieldErrors | null {
  return FIELD_ORDER.find((field) => errors[field]) ?? null;
}

export function isValid(errors: FieldErrors): boolean {
  return Object.keys(errors).length === 0;
}

// Drops half-filled dish rows rather than rendering an empty line on the menu. The form
// always shows three rows because that is a reasonable prompt; the owner is not obliged to
// use all of them.
export function normaliseRestaurantInput(input: RestaurantInput): RestaurantInput {
  return {
    ...input,
    name: input.name.trim(),
    address: input.address.trim(),
    phone: input.phone.trim(),
    schedule: input.schedule.trim(),
    description: (input.description ?? "").trim(),
    email: (input.email ?? "").trim(),
    whatsapp: (input.whatsapp ?? "").trim(),
    bookingUrl: (input.bookingUrl ?? "").trim(),
    instagram: instagramUrl(input.instagram ?? ""),
    uberEats: (input.uberEats ?? "").trim(),
    glovo: (input.glovo ?? "").trim(),
    boltFood: (input.boltFood ?? "").trim(),
    language: input.language ?? "pt",
    dishes: input.dishes
      .filter((dish) => !isBlank(dish.name) && !isBlank(dish.price))
      .map((dish) => ({
        name: dish.name.trim(),
        price: dish.price.trim(),
        description: (dish.description ?? "").trim(),
      })),
  };
}
