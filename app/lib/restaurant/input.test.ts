import { describe, it, expect } from "vitest";
import { validateRestaurantInput, isValid, normaliseRestaurantInput, type RestaurantInput } from "./input";
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
    existingWebsite: "",
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

  it("requires at least one dish with a name and a price", () => {
    expect(validateRestaurantInput(input({ dishes: [] })).dishes).toBeTruthy();
    expect(validateRestaurantInput(input({ dishes: [{ name: "Soup", price: "", description: "" }] })).dishes).toBeTruthy();
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

  it("puts the email on the page and keeps the existing website off it", () => {
    const built = buildRestaurantPage(input({ existingWebsite: "https://old-site.pt" }), { hero: null, gallery: [] });
    expect(built.footer.email).toBe("reservas@tabernadobairro.pt");
    expect(JSON.stringify(built)).not.toContain("old-site.pt");
  });

  it("treats the existing website as optional", () => {
    expect(validateRestaurantInput(input({ existingWebsite: "" })).existingWebsite).toBeUndefined();
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
    expect(built.hero.secondaryCTA).toBe("Ver a ementa");
    expect(built.hours?.labels).toEqual({ address: "Morada", hours: "Horário", phone: "Telefone" });
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

  it("sends the second button to the menu", () => {
    expect(buildRestaurantPage(input(), { hero: null, gallery: [] }).hero.secondaryHref).toBe("#menu");
  });

  it("sends it to the address instead when there is no menu", () => {
    const built = buildRestaurantPage(input({ dishes: [] }), { hero: null, gallery: [] });
    expect(built.hero.secondaryHref).toBe("#hours");
  });
});
