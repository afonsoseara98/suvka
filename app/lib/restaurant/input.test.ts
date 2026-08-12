import { describe, it, expect } from "vitest";
import { validateRestaurantInput, isValid, normaliseRestaurantInput, firstErrorField, type RestaurantInput } from "./input";
import { buildRestaurantPage, dnaForRestaurant } from "./buildPage";

function input(overrides: Partial<RestaurantInput> = {}): RestaurantInput {
  return {
    name: "Taberna do Bairro",
    cuisine: "Portuguese",
    address: "Rua das Flores 112, Porto",
    phone: "+351 220 145 880",
    schedule: "Tue-Sun 12:00-22:30",
    dishes: [{ name: "Bacalhau", price: "18,50 €", description: "Salt cod." }],
    hasDelivery: false,
    style: "Rustic",
    email: "reservas@tabernadobairro.pt",
    whatsapp: "",
    bookingUrl: "",
    instagram: "",
    uberEats: "",
    glovo: "",
    boltFood: "",
    language: "pt",
    description: "A small dining room.",
    ...overrides,
  };
}

describe("restaurant input validation", () => {
  it("accepts a complete form", () => {
    expect(isValid(validateRestaurantInput(input()))).toBe(true);
  });

  it("requires the facts the page cannot be truthful without", () => {
    for (const missing of ["name", "address", "phone", "schedule"] as const) {
      const errors = validateRestaurantInput(input({ [missing]: "  " } as Partial<RestaurantInput>));
      expect(errors[missing], missing).toBeTruthy();
    }
  });

  it("requires at least one dish, by name", () => {
    expect(validateRestaurantInput(input({ dishes: [] })).dishes).toBeTruthy();
    expect(validateRestaurantInput(input({ dishes: [{ name: "", price: "12,00", description: "" }] })).dishes).toBeTruthy();
  });

  // O PREÇO NÃO É OBRIGATÓRIO
  //
  // Descoberto a replicar um restaurante verdadeiro: o Mariscar, na Rua das Flores, não
  // publica preço nenhum no site dele. Marisqueiras vendem a peso. Exigir o preço não era
  // fricção para essas casas - era uma porta fechada, e nem chegavam a ver o produto.
  it("aceita um prato sem preço, porque há casas que vendem a peso", () => {
    expect(validateRestaurantInput(input({ dishes: [{ name: "Sapateira recheada", price: "", description: "" }] })).dishes).toBeUndefined();
  });

  it("aceita um prato a que falte a chave do preço de todo", () => {
    // O corpo do pedido é JSON de fora. Sem isto, um prato sem a chave `price` rebentava
    // num endpoint público.
    const semPreco = [{ name: "Sapateira recheada", description: "" } as never];
    expect(() => validateRestaurantInput(input({ dishes: semPreco }))).not.toThrow();
    expect(validateRestaurantInput(input({ dishes: semPreco })).dishes).toBeUndefined();
  });

  it("o prato sem preço sobrevive à normalização, com o preço vazio", () => {
    const normalizado = normaliseRestaurantInput(input({ dishes: [{ name: "Sapateira", price: "", description: "" }] }));
    expect(normalizado.dishes).toEqual([{ name: "Sapateira", price: "", description: "" }]);
  });

  it("does not police the shape of a phone number", () => {
    // Restaurants write numbers a dozen ways. Rejecting a real number for having a space
    // in it is a worse failure than accepting an odd one.
    for (const phone of ["220145880", "+351 220 145 880", "(+351) 220-145-880"]) {
      expect(validateRestaurantInput(input({ phone })).phone).toBeUndefined();
    }
  });

  it("drops half-filled dish rows instead of rendering blank menu lines", () => {
    const normalised = normaliseRestaurantInput(
      input({
        dishes: [
          { name: "Bacalhau", price: "18", description: "" },
          { name: "", price: "", description: "" },
          { name: "Arroz", price: "16", description: "" },
        ],
      })
    );
    expect(normalised.dishes.map((d) => d.name)).toEqual(["Bacalhau", "Arroz"]);
  });
});

describe("building the page from the form", () => {
  const built = buildRestaurantPage(input(), { hero: null, gallery: [] });

  it("puts the restaurant's own name in the headline", () => {
    // A person searching by name wants to see that name. A generated slogan in its place
    // is how a real business stops recognising its own website.
    expect(built.hero.title).toBe("Taberna do Bairro");
  });

  it("uses the owner's own sentence, not invented copy", () => {
    expect(built.hero.subtitle).toBe("A small dining room.");
  });

  it("invents no statistics", () => {
    expect(built.hero.stats).toEqual([]);
    expect(built.stats).toEqual([]);
  });

  it("invents no reviews and no FAQ", () => {
    expect(built.testimonials).toEqual([]);
    expect(built.faq).toEqual([]);
  });

  it("has none of the SaaS sections", () => {
    const types = built.sections.map((s) => s.type);
    for (const saas of ["features", "benefits", "pricing", "stats", "testimonials", "faq"]) {
      expect(types, saas).not.toContain(saas);
    }
  });

  it("is a menu, an address and a picture", () => {
    expect(built.sections.map((s) => s.type)).toEqual(["hero", "menu", "hours", "footer"]);
  });

  it("omits the menu when the owner listed no dishes", () => {
    const empty = buildRestaurantPage(input({ dishes: [] }), { hero: null, gallery: [] });
    expect(empty.sections.map((s) => s.type)).not.toContain("menu");
  });

  it("carries every dish through untouched", () => {
    expect(built.menu).toEqual([{ name: "Bacalhau", price: "18,50 €", description: "Salt cod." }]);
  });

  it("puts the address, hours and phone on the page", () => {
    expect(built.hours).toMatchObject({
      schedule: "Tue-Sun 12:00-22:30",
      address: "Rua das Flores 112, Porto",
      phone: "+351 220 145 880",
    });
  });
});

describe("contact details", () => {
  it("requires an email so a real restaurant can be reached", () => {
    expect(validateRestaurantInput(input({ email: " " })).email).toBeTruthy();
  });

  it("rejects something that is plainly not an address", () => {
    expect(validateRestaurantInput(input({ email: "taberna.pt" })).email).toBeTruthy();
  });

  it("accepts ordinary addresses without fighting the owner", () => {
    for (const email of ["a@b.pt", "reservas+geral@taberna-do-bairro.com", "INFO@Taberna.PT"]) {
      expect(validateRestaurantInput(input({ email })).email, email).toBeUndefined();
    }
  });

  it("puts the email on the page", () => {
    expect(buildRestaurantPage(input(), { hero: null, gallery: [] }).footer.email).toBe(
      "reservas@tabernadobairro.pt"
    );
  });
});

describe("the two dropdowns actually change the design", () => {
  it("gives a Japanese restaurant a cooler palette than an Italian one", () => {
    expect(dnaForRestaurant(input({ cuisine: "Japanese" })).colorTemperature).toBeLessThan(
      dnaForRestaurant(input({ cuisine: "Italian" })).colorTemperature
    );
  });

  it("gives a minimal restaurant less decoration than a rustic one", () => {
    expect(dnaForRestaurant(input({ style: "Minimal" })).decorationDensity).toBeLessThan(
      dnaForRestaurant(input({ style: "Rustic" })).decorationDensity
    );
  });

  it("keeps a cafe light and a dinner restaurant dark", () => {
    // A cafe is a daytime business; a dining room at night is not.
    expect(dnaForRestaurant(input({ cuisine: "Café" })).brightness).toBeGreaterThan(0.5);
    expect(dnaForRestaurant(input({ cuisine: "Fine dining" })).brightness).toBeLessThan(0.5);
  });
});

// A restaurant page rendered a fake browser window containing the placeholder domain
// "yourbusiness.com", because planHeroVisual falls back to a software mockup unless the
// hero declares a photo treatment. Found in a mobile screenshot, after the whole visual
// layer had been built specifically to remove that mockup from non-software businesses.
describe("the hero never falls back to a software mockup", () => {
  it("declares a photo treatment so a restaurant is never shown a fake browser window", () => {
    const built = buildRestaurantPage(input(), { hero: null, gallery: [] });
    expect(built.hero.visual?.treatment).toBe("photo");
  });

  it("asks for the cuisine the owner chose", () => {
    const japanese = buildRestaurantPage(input({ cuisine: "Japanese" }), { hero: null, gallery: [] });
    expect(japanese.hero.visual?.subject).toContain("japanese");
  });
});

// The finished site is read by the restaurant's customers, not by us. A restaurant in Porto
// showing "Find us" and "Call to book" to people looking for dinner is a site its owner
// cannot publish and would not recognise as theirs.
describe("the page speaks the restaurant's language", () => {
  it("labels a Portuguese restaurant in Portuguese", () => {
    const built = buildRestaurantPage(input({ language: "pt" }), { hero: null, gallery: [] });
    expect(built.hero.primaryCTA).toBe("Ligar para reservar");
    expect(built.hero.secondaryCTA).toBe("Como chegar");
    // Asserted loosely rather than exhaustively: this used to be a full deep-equal, so
    // every new contact channel broke a test about language for no reason.
    expect(built.hours?.labels).toMatchObject({
      address: "Morada",
      hours: "Horário",
      phone: "Telefone",
      openInMaps: "Abrir no mapa",
    });
  });

  it("switches to English when the owner asks for it", () => {
    const built = buildRestaurantPage(input({ language: "en" }), { hero: null, gallery: [] });
    expect(built.hero.primaryCTA).toBe("Call to book");
    expect(built.hours?.labels?.address).toBe("Address");
  });

  it("defaults to Portuguese, because Portugal is the market", () => {
    expect(normaliseRestaurantInput({ ...input(), language: undefined as never }).language).toBe("pt");
  });
});

// Both hero buttons were <button> elements with no handler and no destination - dead
// controls on the one action a restaurant page exists to produce.
describe("the calls to action actually do something", () => {
  it("dials the restaurant, which on a phone is a single tap", () => {
    const built = buildRestaurantPage(input({ phone: "+351 220 145 880" }), { hero: null, gallery: [] });
    expect(built.hero.primaryHref).toBe("tel:+351220145880");
  });

  it("strips the formatting a person types into a dialable number", () => {
    const built = buildRestaurantPage(input({ phone: "(+351) 220-145 880" }), { hero: null, gallery: [] });
    expect(built.hero.primaryHref).toBe("tel:+351220145880");
  });

  // The hero is not a toolbar. It used to offer "Ver a ementa", which scrolls - something
  // the customer does on the way to an action, not an action. Both slots now go to the only
  // two things somebody wants from a restaurant's front page: book, and get there.
  it("sends the second button to the map, not further down the page", () => {
    const built = buildRestaurantPage(input(), { hero: null, gallery: [] });
    expect(built.hero.secondaryCTA).toBe("Como chegar");
    expect(built.hero.secondaryHref).toContain("google.com/maps");
    expect(built.hero.secondaryHref).toContain(encodeURIComponent("Rua das Flores 112, Porto"));
  });

  it("prefers the restaurant's own booking page over everything else", () => {
    const built = buildRestaurantPage(
      input({ bookingUrl: "https://thefork.pt/taberna", whatsapp: "912345678" }),
      { hero: null, gallery: [] }
    );
    expect(built.hero.primaryCTA).toBe("Reservar mesa");
    expect(built.hero.primaryHref).toBe("https://thefork.pt/taberna");
  });

  it("falls to WhatsApp with the message already written, e diz que é por WhatsApp", () => {
    // Second best, and well ahead of a phone call: it works at 23:40 and costs the customer
    // nothing to send.
    //
    // O rótulo diz o canal. "Reservar mesa" descrevia o que o cliente quer, não o que ia
    // acontecer - carregava à espera de um calendário e abria-se-lhe uma conversa.
    const built = buildRestaurantPage(input({ whatsapp: "912345678" }), { hero: null, gallery: [] });
    expect(built.hero.primaryCTA).toBe("Reservar por WhatsApp");
    expect(built.hero.primaryHref).toContain("wa.me/351912345678");
    expect(built.hero.primaryHref).toContain(encodeURIComponent("reservar uma mesa no Taberna do Bairro"));
  });

  // Só quando existe mesmo um sistema de reservas é que o botão promete um.
  it("só diz 'Reservar mesa' quando há uma página de reservas a sério", () => {
    const comSistema = buildRestaurantPage(
      input({ bookingUrl: "https://thefork.pt/taberna", whatsapp: "912345678" }),
      { hero: null, gallery: [] }
    );
    expect(comSistema.hero.primaryCTA).toBe("Reservar mesa");

    const semSistema = buildRestaurantPage(input({ whatsapp: "912345678" }), { hero: null, gallery: [] });
    expect(semSistema.hero.primaryCTA).not.toBe("Reservar mesa");
  });

  it("a linha do WhatsApp nos contactos leva a mesma mensagem que o botão", () => {
    // Era o botão do hero a abrir uma conversa já escrita e a linha da secção de contactos
    // a abrir uma caixa em branco - o mesmo número, duas experiências diferentes.
    const built = buildRestaurantPage(input({ whatsapp: "912345678" }), { hero: null, gallery: [] });
    expect(built.hours?.labels?.whatsappMessage).toContain("reservar uma mesa no Taberna do Bairro");
  });

  it("says 'Ligar para reservar' when the phone is all there is", () => {
    // The words follow the destination. Promising a booking system a tasca does not have is
    // the one thing this button must never do.
    const built = buildRestaurantPage(input(), { hero: null, gallery: [] });
    expect(built.hero.primaryCTA).toBe("Ligar para reservar");
    expect(built.hero.primaryHref).toBe("tel:+351220145880");
  });
});

describe("ordering platforms", () => {
  it("has no section at all when the restaurant is on none of them", () => {
    const built = buildRestaurantPage(input(), { hero: null, gallery: [] });
    expect(built.sections.map((s) => s.type)).not.toContain("orders");
    expect(built.orders).toBeUndefined();
  });

  it("shows only the ones the owner filled in", () => {
    const built = buildRestaurantPage(
      input({ glovo: "https://glovoapp.com/taberna", boltFood: "https://food.bolt.eu/taberna" }),
      { hero: null, gallery: [] }
    );
    expect(built.orders?.links.map((l) => l.label)).toEqual(["Glovo", "Bolt Food"]);
  });

  it("puts them straight after the menu, where the customer has just read the dishes", () => {
    const built = buildRestaurantPage(input({ uberEats: "https://ubereats.com/taberna" }), {
      hero: null,
      gallery: [],
    });
    const types = built.sections.map((s) => s.type);
    expect(types.indexOf("orders")).toBe(types.indexOf("menu") + 1);
  });
});

// The form asks in Portuguese. A form that complains in English looks broken, and the
// person filling it in runs a restaurant in Portugal.
describe("errors a real owner can act on", () => {
  it("speaks Portuguese", () => {
    const errors = validateRestaurantInput({ dishes: [] });
    for (const [field, message] of Object.entries(errors)) {
      expect(message, field).not.toMatch(/^(The|Choose|An|A phone|Opening|We need|That does|Add|Keep)\b/);
    }
    expect(errors.name).toBe("Escreva o nome do restaurante.");
    expect(errors.dishes).toBe("Adicione pelo menos um prato.");
  });

  it("catches a paste that would break the page", () => {
    // Someone filling this in on a phone in a busy kitchen pastes their whole menu into
    // the name box. Caught here, not as a 4000-character headline and a broken slug.
    expect(validateRestaurantInput(input({ name: "a".repeat(500) })).name).toBeTruthy();
    expect(validateRestaurantInput(input({ address: "a".repeat(500) })).address).toBeTruthy();
    expect(validateRestaurantInput(input({ schedule: "a".repeat(2000) })).schedule).toBeTruthy();
  });

  it("catches an over-long dish without rejecting a normal one", () => {
    expect(validateRestaurantInput(input({ dishes: [{ name: "a".repeat(200), price: "10", description: "" }] })).dishes).toBeTruthy();
    expect(validateRestaurantInput(input()).dishes).toBeUndefined();
  });

  it("points at the first field that needs attention, in form order", () => {
    // Not the first error found - the first one the person will SCROLL to. On a phone an
    // error four fields above the button is invisible.
    expect(firstErrorField(validateRestaurantInput({ dishes: [] }))).toBe("name");
    expect(firstErrorField(validateRestaurantInput(input({ email: "nope", name: "" })))).toBe("name");
    expect(firstErrorField(validateRestaurantInput(input({ email: "nope" })))).toBe("email");
    expect(firstErrorField(validateRestaurantInput(input()))).toBeNull();
  });
});

// THE BUG THIS EXISTS FOR
//
// The public form asks for nine things and an email is not one of them - it comes from the
// account at publish time. Validating it as if it did produced an error for a field with no
// input on screen, so the message had nowhere to render, the submit returned early, and
// pressing "Criar o meu site" did nothing whatsoever. No request, no error, no loading
// state. 765 tests passed while the button was dead, because every one of them called the
// validator with an email present.
describe("the public form's own payload", () => {
  // Exactly what app/new/restaurant/page.tsx sends: every field it collects, and nothing
  // it does not.
  const publicFormPayload = {
    name: "Taberna do Bairro",
    cuisine: "Portuguese" as const,
    address: "Rua das Flores 112, Porto",
    phone: "+351 220 145 880",
    schedule: "Terça a domingo 12:00-22:30",
    dishes: [{ name: "Bacalhau", price: "18,50 €", description: "" }],
    hasDelivery: false,
    style: "Rustic" as const,
    description: "",
    language: "pt" as const,
    existingWebsite: "",
    email: "",
  };

  it("passes validation, so the button actually submits", () => {
    const errors = validateRestaurantInput(publicFormPayload, { requireEmail: false });
    expect(errors).toEqual({});
    expect(isValid(errors)).toBe(true);
  });

  it("never produces an error for a field the form does not show", () => {
    // The general form of the defect: an error the person cannot see and cannot fix.
    const errors = validateRestaurantInput(publicFormPayload, { requireEmail: false });
    expect(errors.email).toBeUndefined();
  });

  it("still requires an email where one is actually asked for", () => {
    expect(validateRestaurantInput(publicFormPayload).email).toBeTruthy();
  });

  it("keeps every other rule intact on the public form", () => {
    // Relaxing the email requirement must not relax anything else.
    expect(validateRestaurantInput({ ...publicFormPayload, name: "" }, { requireEmail: false }).name).toBeTruthy();
    expect(validateRestaurantInput({ ...publicFormPayload, dishes: [] }, { requireEmail: false }).dishes).toBeTruthy();
    expect(validateRestaurantInput({ ...publicFormPayload, address: "" }, { requireEmail: false }).address).toBeTruthy();
  });

  it("points at a field that exists on the public form", () => {
    // firstErrorField drives a getElementById. Naming a field the form does not render is
    // what turned a validation failure into total silence.
    const errors = validateRestaurantInput({ ...publicFormPayload, phone: "" }, { requireEmail: false });
    expect(firstErrorField(errors)).toBe("phone");
  });
});

// Every one of these was a decision of mine that only surfaces when a real Portuguese owner
// uses the product: an English word on a site whose readers are looking for dinner in Porto.
describe("nothing English reaches a Portuguese restaurant's site", () => {
  const pt = (overrides: Partial<RestaurantInput> = {}) =>
    buildRestaurantPage(input({ language: "pt", ...overrides }), { hero: null, gallery: [] });

  it("names the cuisine in Portuguese on the badge", () => {
    expect(pt({ cuisine: "Portuguese" }).hero.badge).toBe("Cozinha portuguesa");
    expect(pt({ cuisine: "Italian" }).hero.badge).toBe("Cozinha italiana");
    expect(pt({ cuisine: "Fine dining" }).hero.badge).toBe("Alta cozinha");
  });

  it("writes a page title the owner would recognise", () => {
    // This is what shows in a browser tab and in Google. "Taberna do Bairro — Portuguese
    // restaurant" is not a title a Portuguese restaurant would choose for itself.
    // Reads as Portuguese, and agrees in gender - "restaurante portuguesa" does not.
    expect(pt().site.seo.title).toBe("Taberna do Bairro — Cozinha portuguesa");
  });

  it("falls back to a Portuguese sentence when the owner writes no description", () => {
    expect(pt({ description: "" }).hero.subtitle).toBe("Cozinha portuguesa.");
  });

  it("still speaks English when the owner asked for English", () => {
    const en = buildRestaurantPage(input({ language: "en", description: "" }), { hero: null, gallery: [] });
    expect(en.hero.badge).toBe("Portuguese");
    expect(en.hero.subtitle).toBe("Portuguese cooking.");
  });

  it("leaves no English anywhere a customer reads", () => {
    // Only what a visitor reads - keywords are metadata and deliberately keep the English
    // cuisine key so search still matches it.
    const page = JSON.stringify({ hero: pt().hero, hours: pt().hours, title: pt().site.seo.title });
    for (const word of ["Find us", "Call to book", "Address", "Hours", "Phone", "cooking"]) {
      expect(page, word).not.toContain(word);
    }
    expect(page).not.toMatch(/restaurant/);
  });
});

// The owner ticked a box and nothing happened. It fed a fallback sentence that anyone who
// wrote their own description never saw, so the question was asked and the answer discarded.
describe("takeaway is answered on the page", () => {
  it("tells customers they can collect", () => {
    const built = buildRestaurantPage(input({ hasDelivery: true, language: "pt" }), { hero: null, gallery: [] });
    expect(built.hours?.schedule).toContain("Take-away e entregas");
  });

  it("says nothing when the restaurant does not do it", () => {
    const built = buildRestaurantPage(input({ hasDelivery: false, language: "pt" }), { hero: null, gallery: [] });
    expect(built.hours?.schedule).not.toContain("Take-away");
  });

  it("keeps the owner's own hours untouched either way", () => {
    const built = buildRestaurantPage(input({ hasDelivery: true }), { hero: null, gallery: [] });
    expect(built.hours?.schedule).toContain("Tue-Sun 12:00-22:30");
  });
});
