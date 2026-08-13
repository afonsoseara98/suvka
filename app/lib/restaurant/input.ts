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
import { instagramUrl, isGoogleLink, googleUrl as tidyGoogleUrl } from "./tidy";

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

  // AS PERGUNTAS QUE DECIDEM ENTRE DOIS RESTAURANTES PARECIDOS
  //
  // Um cliente que já escolheu a zona e o tipo de comida decide o resto com cinco perguntas
  // que o produto não tinha onde responder: o casal com um cão, a família com carrinho, quem
  // chega de carro a uma zona sem lugar, quem quer jantar na rua, quem só anda com o
  // telemóvel. Cada uma delas manda a pessoa ao restaurante do lado se a nossa página se
  // calar - e o dono nunca sabe que foi por isto.
  //
  // Sim/não e não texto livre, de propósito: o cliente lê isto de relance, e uma frase
  // obriga-o a interpretar. Só aparece o que for verdade - um "sim" é uma afirmação sobre o
  // negócio de outra pessoa, e a ausência não afirma nada.
  //
  // Opcionais no tipo porque tudo o que foi gerado antes disto existir não as tem.
  esplanada?: boolean;
  estacionamento?: boolean;
  aceitaAnimais?: boolean;
  bomParaCriancas?: boolean;
  // MB Way e não "aceita cartão": o terminal de cartões é quase universal e ninguém
  // pergunta por ele. O que se pergunta à porta é se dá para pagar pelo telemóvel.
  mbway?: boolean;

  // "VALE A PENA?" — A ÚNICA PERGUNTA A QUE ISTO NÃO SABIA RESPONDER
  //
  // O produto não inventa avaliações, e essa regra não se toca. Mas "não inventar" e "não
  // ter" são coisas diferentes: o restaurante TEM avaliações verdadeiras, na ficha do Google
  // dele, e o site que lhe fizemos era o único sítio onde elas não apareciam.
  //
  // O que se guarda é a ligação, e mais nada. Nunca uma nota, nunca um número de opiniões,
  // nem sequer copiados de lá: uma nota copiada hoje é uma nota errada daqui a um mês, e
  // uma nota errada no site do próprio restaurante é pior do que nenhuma. O cliente toca e
  // lê o número na fonte, actual, escrito por quem lá esteve.
  googleUrl?: string;

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

  // A ligação tem de ser mesmo do Google, e é a única que verificamos assim.
  //
  // Um botão que diz "Ver as avaliações no Google" e leva a outro sítio é uma mentira ao
  // cliente do restaurante, escrita por nós. Em todos os outros campos aceitamos o que o
  // dono escreveu porque o rótulo é neutro; aqui o rótulo faz uma afirmação, e ou ela é
  // verdadeira ou o campo não pode ser aceite.
  //
  // A causa provável de um erro aqui não é má-fé, é ter copiado o link errado - e é
  // exactamente aí que a mensagem tem de ajudar em vez de acusar.
  if (!isBlank(input.googleUrl) && !isGoogleLink(String(input.googleUrl))) {
    errors.googleUrl = "Essa ligação não parece ser do Google. Copie o endereço da sua ficha no Google Maps.";
  }

  // O PREÇO DEIXOU DE SER OBRIGATÓRIO
  //
  // Era: nome E preço, senão o site não se gerava. Descoberto a replicar um restaurante
  // verdadeiro - o Mariscar, na Rua das Flores - que no site dele não publica preço nenhum.
  // Marisqueiras vendem a peso, e há casas que não querem o preço na internet. Para essas,
  // isto não era fricção: era uma porta fechada, e nem chegavam a ver o produto.
  //
  // O nome do prato sozinho já constrói uma ementa - "Arroz de marisco" numa lista diz ao
  // cliente o que aquela casa é. O preço acrescenta e não sustenta.
  //
  // O tidyPrice já deixava passar intacto o que não é um número ("sob consulta", "ao peso"),
  // portanto a página sempre soube desenhar isto. Só a validação é que não deixava lá chegar.
  const dishes = Array.isArray(input.dishes) ? input.dishes : [];
  const complete = dishes.filter((dish) => !isBlank(dish?.name));
  if (complete.length === 0) {
    // A menu with no dishes is not a menu, and the page would fall back to being a poster.
    errors.dishes = "Adicione pelo menos um prato.";
  } else if (
    complete.some(
      (dish) =>
        dish.name.trim().length > LIMITS.dishName ||
        // `?? ""` agora que o preço pode não vir de todo: o corpo do pedido é JSON de fora,
        // e um prato sem a chave `price` fazia isto rebentar num endpoint público.
        (dish.price ?? "").trim().length > LIMITS.dishPrice ||
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
    // `=== true` e não `Boolean(...)`: o corpo do pedido é JSON de fora, e um "sim" que
    // chegue como a string "false" ou como 0 tem de continuar a ser um não. Um sim inventado
    // aqui é uma afirmação falsa sobre o negócio de outra pessoa.
    esplanada: input.esplanada === true,
    estacionamento: input.estacionamento === true,
    aceitaAnimais: input.aceitaAnimais === true,
    bomParaCriancas: input.bomParaCriancas === true,
    mbway: input.mbway === true,
    googleUrl: tidyGoogleUrl(input.googleUrl ?? ""),
    language: input.language ?? "pt",
    dishes: input.dishes
      // O nome é o que faz um prato existir. Sem preço a linha sai sem preço - ver a
      // validação acima, e o Menu, que deixa de desenhar a coluna quando não há nada nela.
      .filter((dish) => !isBlank(dish.name))
      .map((dish) => ({
        name: dish.name.trim(),
        price: (dish.price ?? "").trim(),
        description: (dish.description ?? "").trim(),
      })),
  };
}
