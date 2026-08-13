import { describe, it, expect } from "vitest";
import { tidyPrice, tidyPhoneHref, mapsHref, whatsappHref, instagramUrl, instagramHandle, isGoogleLink, googleUrl } from "./tidy";

// A real owner filled these three in, one after the other, and got a menu with three
// different price formats on it.
describe("tidyPrice", () => {
  it("writes the three ways people actually type a price the same way", () => {
    expect(tidyPrice("24,00")).toBe("24,00 €");
    expect(tidyPrice("18€")).toBe("18,00 €");
    expect(tidyPrice("4,50 euros")).toBe("4,50 €");
  });

  it.each([
    ["18", "18,00 €"],
    ["18.5", "18,50 €"],
    ["18,5", "18,50 €"],
    ["  18,50 €  ", "18,50 €"],
    ["€18,50", "18,50 €"],
    ["18 EUR", "18,00 €"],
    ["7,25", "7,25 €"],
  ])("normalises %s", (input, expected) => {
    expect(tidyPrice(input)).toBe(expected);
  });

  // The line between formatting and inventing: a number is formatted, a sentence is not.
  it.each(["sob consulta", "a partir de 15 €", "20/30 €", "s/ preço", "PVP"])(
    "leaves %s exactly as written",
    (input) => {
      expect(tidyPrice(input)).toBe(input);
    }
  );

  it("does not round or alter the amount", () => {
    expect(tidyPrice("24,99")).toBe("24,99 €");
    expect(tidyPrice("0,50")).toBe("0,50 €");
  });
});

describe("tidyPhoneHref", () => {
  it("makes a nine-digit Portuguese number dialable from abroad", () => {
    // The tourist standing outside the door in August is the call that pays for the site.
    expect(tidyPhoneHref("234 390 100")).toBe("+351234390100");
    expect(tidyPhoneHref("912345678")).toBe("+351912345678");
  });

  it("leaves a number that already carries its country code alone", () => {
    expect(tidyPhoneHref("+351 234 390 100")).toBe("+351234390100");
    expect(tidyPhoneHref("+44 20 7946 0958")).toBe("+442079460958");
  });

  it("treats 00 as the international prefix it is", () => {
    expect(tidyPhoneHref("00351234390100")).toBe("+351234390100");
  });

  it("does not guess at a number it does not recognise", () => {
    expect(tidyPhoneHref("1820")).toBe("1820");
    expect(tidyPhoneHref("234 390")).toBe("234390");
  });
});

// Standing on a street with the restaurant's site open, the address was text you had to
// copy out by hand. Nobody does that - they go back to Google and search the name, which is
// where the competitor is.
describe("mapsHref", () => {
  it("builds a link that opens the map app the visitor already uses", () => {
    expect(mapsHref("Cais dos Mercanteis 14, Aveiro")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Cais%20dos%20Mercanteis%2014%2C%20Aveiro"
    );
  });

  it("has nothing to point at without an address", () => {
    expect(mapsHref("")).toBeUndefined();
    expect(mapsHref("   ")).toBeUndefined();
  });
});

describe("whatsappHref", () => {
  it("reaches the same restaurant however the owner typed the number", () => {
    expect(whatsappHref("912 345 678")).toBe("https://wa.me/351912345678");
    expect(whatsappHref("+351 912345678")).toBe("https://wa.me/351912345678");
  });

  it("carries a first message so the customer does not have to open with 'olá'", () => {
    expect(whatsappHref("912345678", "Boa tarde, queria reservar")).toBe(
      "https://wa.me/351912345678?text=Boa%20tarde%2C%20queria%20reservar"
    );
  });

  it("refuses rather than guesses at a number it cannot place", () => {
    // A wa.me link built from a wrong number opens a chat with a stranger, under the
    // restaurant's name.
    expect(whatsappHref("1820")).toBeUndefined();
    expect(whatsappHref("234 390")).toBeUndefined();
  });
});

describe("instagram", () => {
  it("accepts the three ways a person answers 'qual é o seu Instagram?'", () => {
    for (const typed of ["@tabernadosal", "tabernadosal", "https://instagram.com/tabernadosal"]) {
      expect(instagramUrl(typed), typed).toBe("https://instagram.com/tabernadosal");
    }
  });

  it("shows the handle rather than the URL", () => {
    // "https://instagram.com/tabernadosal" in a column next to a phone number reads as a
    // mistake; nobody says a full URL out loud.
    expect(instagramHandle("https://instagram.com/tabernadosal")).toBe("@tabernadosal");
    expect(instagramHandle("https://www.instagram.com/tabernadosal/")).toBe("@tabernadosal");
  });

  it("has nothing to show when it was left blank", () => {
    expect(instagramUrl("")).toBe("");
    expect(instagramUrl("  @  ")).toBe("");
  });
});

// A LIGAÇÃO PARA A FICHA DO GOOGLE
//
// É a única ligação cujo anfitrião verificamos, e a razão é o rótulo: um botão que diz
// "Ver as avaliações no Google" e leva a outro sítio é uma mentira ao cliente do
// restaurante, escrita por nós. Nos outros campos o rótulo é neutro e aceita-se o que o
// dono escreveu.
describe("isGoogleLink", () => {
  it("aceita as cinco formas que o Partilhar do Google Maps produz", () => {
    for (const url of [
      "https://maps.app.goo.gl/aBcDeF123",
      "https://g.page/taberna-do-bairro",
      "https://www.google.com/maps/place/Taberna+do+Bairro/@41.14,-8.61,17z",
      "https://google.pt/maps/place/Taberna",
      "https://share.google/xYz",
    ]) {
      expect(isGoogleLink(url), url).toBe(true);
    }
  });

  it("aceita sem o https à frente, que é como se cola de um telemóvel", () => {
    expect(isGoogleLink("maps.app.goo.gl/aBcDeF123")).toBe(true);
  });

  // A verificação é por anfitrião e não por "contém google": um endereço destes passava
  // num teste de substring, e o que está por trás do botão é uma afirmação nossa.
  it("recusa um domínio que só se PARECE com o Google", () => {
    for (const url of [
      "https://google-avaliacoes.com/taberna",
      "https://google.com.avaliacoes.net/x",
      "https://tripadvisor.pt/taberna",
      "não é um endereço",
      "",
    ]) {
      expect(isGoogleLink(url), url).toBe(false);
    }
  });
});

describe("googleUrl", () => {
  it("põe sempre o protocolo", () => {
    // Sem ele, o href é lido como caminho relativo: suvka.com/google.pt/maps/... dá 404 na
    // cara de quem queria ler as opiniões.
    expect(googleUrl("google.pt/maps/place/Taberna")).toBe("https://google.pt/maps/place/Taberna");
  });

  it("não mexe no que já vem completo", () => {
    expect(googleUrl("https://maps.app.goo.gl/abc")).toBe("https://maps.app.goo.gl/abc");
  });

  it("vazio continua vazio", () => {
    expect(googleUrl("   ")).toBe("");
  });
});
