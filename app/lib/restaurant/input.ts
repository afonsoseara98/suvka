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

  // Reaching the owner. Shown on the published page as a contact address, which is what a
  // restaurant site is expected to carry - and how we reach them back during the pilot.
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
export function validateRestaurantInput(input: Partial<RestaurantInput>): FieldErrors {
  const errors: FieldErrors = {};

  if (isBlank(input.name)) errors.name = "The restaurant needs a name.";
  if (!input.cuisine || !CUISINES.includes(input.cuisine)) errors.cuisine = "Choose a cuisine.";
  if (!input.style || !STYLES.includes(input.style)) errors.style = "Choose a style.";
  if (isBlank(input.address)) errors.address = "An address is the most looked-up thing on the page.";
  if (isBlank(input.phone)) errors.phone = "A phone number is how most people will book.";
  if (isBlank(input.schedule)) errors.schedule = "Opening hours are why people visit the site.";

  // Deliberately the loosest possible check. An address with an @ and a dot is almost
  // certainly a real attempt; a stricter pattern rejects valid addresses and teaches the
  // owner that the form is fighting them.
  if (isBlank(input.email)) errors.email = "We need an email to reach you.";
  else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(input.email).trim())) errors.email = "That does not look like an email address.";

  const dishes = Array.isArray(input.dishes) ? input.dishes : [];
  const complete = dishes.filter((dish) => !isBlank(dish?.name) && !isBlank(dish?.price));
  if (complete.length === 0) {
    // A menu with no dishes is not a menu, and the page would fall back to being a poster.
    errors.dishes = "Add at least one dish, with a name and a price.";
  }

  if (typeof input.description === "string" && input.description.length > DESCRIPTION_MAX) {
    errors.description = `Keep it under ${DESCRIPTION_MAX} characters.`;
  }

  return errors;
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
