import { describe, it, expect } from "vitest";
import { buildBusinessProfile } from "./BusinessProfileBuilder";

function industryOf(prompt: string) {
  return buildBusinessProfile(prompt).industry;
}

describe("BusinessProfileBuilder - positive classification (every supported industry, EN + PT)", () => {
  it("classifies medical (EN)", () => {
    expect(industryOf("We are a dental clinic offering checkups for the whole family.")).toBe("medical");
  });

  it("classifies medical (PT)", () => {
    expect(industryOf("Somos um consultório de um médico dentista em clínica particular.")).toBe("medical");
  });

  it("classifies law (EN)", () => {
    expect(industryOf("Our law firm provides expert legal advice for growing businesses.")).toBe("law");
  });

  it("classifies law (PT)", () => {
    expect(industryOf("Somos um escritório de advocacia especializado em direito jurídico.")).toBe("law");
  });

  it("classifies real_estate (EN)", () => {
    expect(
      industryOf("Our real estate agency helps you find your dream home in the local housing market.")
    ).toBe("real_estate");
  });

  it("classifies real_estate (PT)", () => {
    expect(industryOf("Somos uma imobiliária especializada em imóveis residenciais.")).toBe("real_estate");
  });

  it("classifies fitness (EN)", () => {
    expect(industryOf("Join our gym for personal training and group fitness classes.")).toBe("fitness");
  });

  it("classifies fitness (PT)", () => {
    expect(industryOf("Nossa academia oferece treino personalizado e musculação.")).toBe("fitness");
  });

  it("classifies restaurant (EN)", () => {
    expect(industryOf("Visit our restaurant, check our menu, and book a table.")).toBe("restaurant");
  });

  it("classifies restaurant (PT)", () => {
    expect(industryOf("Nosso restaurante serve pratos com um menu variado.")).toBe("restaurant");
  });

  it("classifies ecommerce (EN)", () => {
    expect(industryOf("We run an online store selling handmade candles, buy online today.")).toBe("ecommerce");
  });

  it("classifies ecommerce (PT)", () => {
    expect(
      industryOf("Nossa loja online vende produtos artesanais, permitindo comprar online com facilidade.")
    ).toBe("ecommerce");
  });

  it("classifies education (EN)", () => {
    expect(industryOf("We offer an online course and mentorship to help you learn to code.")).toBe("education");
  });

  it("classifies education (PT)", () => {
    expect(industryOf("Nossa plataforma de ensino oferece aulas para todos os níveis.")).toBe("education");
  });

  it("classifies agency (EN)", () => {
    expect(industryOf("Our digital marketing agency helps you grow with SEO and paid ads.")).toBe("agency");
  });

  it("classifies agency (PT)", () => {
    expect(industryOf("Nossa agência de marketing digital ajuda pequenas empresas a crescer.")).toBe("agency");
  });

  it("classifies startup (EN)", () => {
    expect(industryOf("We are a SaaS startup building a software platform for teams.")).toBe("startup");
  });

  it("classifies startup (PT/international - 'startup' and 'SaaS' are used as-is in PT business contexts)", () => {
    expect(industryOf("Somos uma startup que oferece uma plataforma SaaS para equipas.")).toBe("startup");
  });

  it("classifies beauty (EN)", () => {
    expect(industryOf("Book an appointment at our hair salon for a haircut and blowout.")).toBe("beauty");
  });

  it("classifies beauty (PT)", () => {
    expect(industryOf("Nosso salão de beleza oferece cabeleireiro e manicure.")).toBe("beauty");
  });

  it("classifies home_services (EN)", () => {
    expect(industryOf("Our licensed plumber offers 24/7 plumbing and electrical repair.")).toBe("home_services");
  });

  it("classifies home_services (PT)", () => {
    expect(industryOf("Somos um encanador profissional para reparos residenciais.")).toBe("home_services");
  });

  it("classifies consulting (EN)", () => {
    expect(industryOf("Our business consultant offers strategy consulting and executive coaching.")).toBe("consulting");
  });

  it("classifies consulting (PT)", () => {
    expect(industryOf("Oferecemos consultoria empresarial para pequenas empresas.")).toBe("consulting");
  });

  it("classifies automotive (EN)", () => {
    expect(industryOf("Visit our auto repair shop for brake repair and an oil change.")).toBe("automotive");
  });

  it("classifies automotive (PT)", () => {
    expect(industryOf("Nossa oficina mecânica oferece revisão e troca de óleo.")).toBe("automotive");
  });

  it("classifies events (EN)", () => {
    expect(industryOf("Our wedding planner handles event coordination and venue booking.")).toBe("events");
  });

  it("falls back to generic when no industry keywords are present", () => {
    expect(industryOf("We help people achieve their goals every day.")).toBe("generic");
  });
});

describe("BusinessProfileBuilder - negative keyword suppression", () => {
  it("suppresses fitness in favor of education when 'course' negates a weak fitness signal", () => {
    // fitness: "fitness" + "personal training" (2 primary, +10) but "course" and "online course"
    // both fire as negatives (2 x -4 = -8) -> net 2. education: "online course" (+5). Education wins.
    expect(
      industryOf("We offer an online course about fitness nutrition and personal training methodology.")
    ).toBe("education");
  });

  it("known limitation: a genuinely fitness-related prompt can be suppressed below threshold by its own negative keyword", () => {
    // fitness: "gym" (+5) + "workout" (+2) + "course" negative (-4) = 3, below the confidence
    // threshold of 4 -> falls to generic instead of fitness. Documented on purpose: negative
    // keywords are a blunt, prompt-wide instrument, not a phrase-adjacency check.
    expect(industryOf("Our gym offers a great workout course.")).toBe("generic");
  });
});

describe("BusinessProfileBuilder - tie-breaking (CLASSIFICATION_PRIORITY order)", () => {
  it("resolves a clean tie in favor of the higher-priority industry (medical before law)", () => {
    // medical: "dental" (+5). law: "lawyer" (+5). Tie -> medical wins (earlier in priority order).
    expect(industryOf("This service covers both dental and lawyer consultations.")).toBe("medical");
  });

  it("resolves a real-world tie in favor of the higher-priority industry (law before startup)", () => {
    // law: "law firm" (+5). startup: "startup" (+5, from "startup formation"). Tie -> law wins.
    expect(
      industryOf(
        "A boutique law firm specializing in business contracts, startup formation, and intellectual property protection."
      )
    ).toBe("law");
  });
});

describe("BusinessProfileBuilder - confidence threshold", () => {
  it("classifies when the score is exactly at the threshold (2 secondary hits = 4)", () => {
    expect(industryOf("We provide healthcare and treatment services to families.")).toBe("medical");
  });

  it("falls back to generic when the score is below the threshold (1 secondary hit = 2)", () => {
    expect(industryOf("We provide healthcare services.")).toBe("generic");
  });

  it("falls back to generic when primary + secondary + negative nets below the threshold (5 + 2 - 4 = 3)", () => {
    expect(industryOf("Our gym offers a great workout course.")).toBe("generic");
  });
});

describe("BusinessProfileBuilder - plural vs singular matching", () => {
  it("matches the singular form of a keyword", () => {
    expect(industryOf("Our restaurant serves fresh food and a great menu.")).toBe("restaurant");
  });

  it("documented limitation: plural-only mentions do not match singular keywords, and fall to generic", () => {
    // "restaurants" does not satisfy a word-boundary match against the keyword "restaurant" -
    // this is intentional (prevents partial-word false positives) but means a business
    // description that only ever uses the plural form of its own industry won't classify.
    expect(industryOf("Our restaurants serve fresh food across the city.")).toBe("generic");
  });
});

describe("BusinessProfileBuilder - mixed-industry / adversarial cases (provider vs audience)", () => {
  it("classifies a SaaS product described via its e-commerce audience as startup, not ecommerce", () => {
    expect(
      industryOf(
        "We're building an AI-powered analytics platform that helps e-commerce founders track revenue, customer churn, and behavior in real time."
      )
    ).toBe("startup");
  });

  it("classifies a CRM built for law firms as startup, not law", () => {
    expect(industryOf("A CRM built for law firms to manage client cases.")).toBe("startup");
  });

  it("classifies a software platform built for dentist offices as startup, not medical", () => {
    expect(
      industryOf("A software platform built for dentist offices to manage patient appointments.")
    ).toBe("startup");
  });

  // FIXED: "agency" was added as its own primary keyword (not just "marketing agency"/
  // "digital agency"/"creative agency"), so this prompt now scores agency 10 ("marketing
  // agency" + "agency", both primary) against restaurant's 5 ("restaurant owners") - a
  // clean, decisive win instead of a tie resolved by CLASSIFICATION_PRIORITY order.
  it("classifies an agency serving restaurant owners as agency, not restaurant", () => {
    expect(
      industryOf("A digital marketing agency helping restaurant owners increase online orders.")
    ).toBe("agency");
  });
});
