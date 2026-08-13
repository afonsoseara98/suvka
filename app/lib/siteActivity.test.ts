import { describe, it, expect } from "vitest";
import { activityLines, totalActivity } from "./siteActivity";

const nada = {
  phone_clicked: 0,
  whatsapp_clicked: 0,
  maps_clicked: 0,
  reservation_clicked: 0,
  order_clicked: 0,
};

describe("o que se diz ao dono sobre o que o site fez", () => {
  // Um zero não é informação sobre o negócio dele - é uma acusação sobre um canal que o
  // restaurante pode nem sequer ter. Um sítio sem WhatsApp não precisa de ler todos os meses
  // que ninguém lhe mandou mensagem.
  it("não mostra linha nenhuma a zero", () => {
    expect(activityLines({ ...nada, phone_clicked: 3 }).map((l) => l.event)).toEqual(["phone_clicked"]);
  });

  it("não mostra nada de todo quando não houve nada", () => {
    expect(activityLines(nada)).toEqual([]);
    expect(totalActivity(nada)).toBe(0);
  });

  // "1 pessoa(s) ligou(aram)" é a marca de um formulário. Isto é uma frase para ser lida.
  it("concorda em número", () => {
    expect(activityLines({ ...nada, phone_clicked: 1 })[0].text).toBe("1 pessoa ligou-lhe");
    expect(activityLines({ ...nada, phone_clicked: 12 })[0].text).toBe("12 pessoas ligaram-lhe");
  });

  // A ordem é a do valor para o restaurante, não a do volume. Uma reserva vale mais do que um
  // toque no mapa mesmo quando é dez vezes mais rara, e ele deve ler primeiro o que lhe paga
  // o mês.
  it("põe primeiro o que vale mais, não o que acontece mais", () => {
    const linhas = activityLines({
      phone_clicked: 8,
      whatsapp_clicked: 5,
      maps_clicked: 90,
      reservation_clicked: 2,
      order_clicked: 4,
    });

    expect(linhas.map((l) => l.event)).toEqual([
      "reservation_clicked",
      "phone_clicked",
      "whatsapp_clicked",
      "order_clicked",
      "maps_clicked",
    ]);
  });

  // Doze toques são doze. Não se diz "cerca de", não se estima, não se projecta o mês a
  // partir de uma semana - o dono vai repetir este número a alguém.
  it("nunca arredonda nem estima", () => {
    for (const n of [1, 7, 13, 47, 1234]) {
      const texto = activityLines({ ...nada, maps_clicked: n })[0].text;
      expect(texto, String(n)).toContain(String(n));
      expect(texto).not.toMatch(/cerca de|aproximadamente|\+|~/);
    }
  });

  it("conta o total sobre todos os canais", () => {
    expect(totalActivity({ phone_clicked: 3, maps_clicked: 4 })).toBe(7);
  });
});
