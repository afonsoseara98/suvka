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

  // Optional, and never rendered. Asked because knowing whether a restaurant already has a
  // site is the difference between replacing something and being someone's first website,
  // and those are different products.
  existingWebsite: string;

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
  existingWebsite: 200,
  dishName: 80,
  dishPrice: 20,
  dishDescription: 200,
} as const;

// Every message is in Portuguese because the person reading it runs a restaurant in
// Portugal, and a form that asks in one language and complains in another is a form that
// looks broken. Each says what to do rather than what went wrong.
export function validateRestaurantInput(input: Partial<RestaurantInput>): FieldErrors {
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
  if (isBlank(input.email)) errors.email = "Precisamos de um email para o contactar.";
  else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(input.email).trim())) errors.email = "Isso não parece um endereço de email.";
  else if (String(input.email).trim().length > LIMITS.email) errors.email = "Esse email parece demasiado longo.";

  if (typeof input.existingWebsite === "string" && input.existingWebsite.trim().length > LIMITS.existingWebsite) {
    errors.existingWebsite = "Esse endereço parece demasiado longo.";
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
  "dishes",
  "email",
  "existingWebsite",
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
    existingWebsite: (input.existingWebsite ?? "").trim(),
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
