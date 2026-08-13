import { describe, it, expect } from "vitest";
import { captureAttribution, readAttribution, attributionDetails } from "./attribution";

function memoria(inicial: Record<string, string> = {}) {
  const dados = { ...inicial };
  return {
    getItem: (k: string) => dados[k] ?? null,
    setItem: (k: string, v: string) => {
      dados[k] = v;
    },
    dados,
  };
}

const capturar = (endereco: string, referenciador = "", store = memoria()) => {
  captureAttribution(endereco, referenciador, store);
  return readAttribution(store);
};

describe("de onde veio esta pessoa", () => {
  it("uma campanha marcada no endereço", () => {
    expect(capturar("https://suvka.com/?utm_source=Google&utm_campaign=Restaurantes-Porto")).toEqual({
      origem: "google",
      campanha: "restaurantes-porto",
    });
  });

  it("sem marcação, vale o sítio de onde veio o clique", () => {
    expect(capturar("https://suvka.com/", "https://www.instagram.com/p/abc123/")?.origem).toBe("instagram.com");
  });

  it("sem marcação e sem referenciador é tráfego directo", () => {
    expect(capturar("https://suvka.com/")?.origem).toBe("directo");
  });

  // Distinguir um anúncio de um resultado orgânico é precisamente a comparação em causa, e
  // ambos chegam com referenciador do Google.
  it("a marcação ganha ao referenciador, porque é mais específica", () => {
    expect(capturar("https://suvka.com/?utm_source=google-ads", "https://www.google.com/")?.origem).toBe("google-ads");
  });

  // A MANEIRA MAIS COMUM DE UMA MEDIÇÃO DE AQUISIÇÃO MENTIR
  //
  // Quem chega por um anúncio, sai, e volta a escrever o endereço à mão foi trazido pelo
  // anúncio. Se o último toque ganhasse, o canal "directo" levava o crédito de todos os
  // outros e a publicidade parecia sempre não funcionar.
  it("a primeira visita ganha à última", () => {
    const store = memoria();
    captureAttribution("https://suvka.com/?utm_source=meta", "", store);
    captureAttribution("https://suvka.com/", "", store);

    expect(readAttribution(store)?.origem).toBe("meta");
  });
});

// O REFERENCIADOR TRAZ MAIS DO QUE PRECISAMOS
//
// O caminho completo de um referenciador traz termos de pesquisa e identificadores de sessão
// de outros sítios. Guardá-los seria recolher sobre a pessoa exactamente aquilo que o
// app/lib/events.ts promete que não se faz.
describe("guarda de onde veio o clique, nunca quem clicou", () => {
  it("do referenciador fica só o domínio", () => {
    const origem = capturar("https://suvka.com/", "https://www.google.com/search?q=criar+site+restaurante&sid=A1B2")?.origem;
    expect(origem).toBe("google.com");
    expect(origem).not.toContain("criar");
    expect(origem).not.toContain("a1b2");
  });

  // APANHADO POR UM TESTE QUE ESTAVA ERRADO
  //
  // Escrevi este caso à espera que um referenciador de aplicação fosse lixo a descartar. Não
  // é: um link partilhado por WhatsApp é, num mercado português, o canal orgânico mais
  // importante que existe — e o app/lib/events.ts já diz que o boca-a-boca é a única forma de
  // um produto para restaurantes crescer sem orçamento de aquisição. Confundi-lo com tráfego
  // directo era apagar exactamente o sinal que mais vale a pena ter.
  it("uma partilha por WhatsApp é um canal, não é tráfego directo", () => {
    expect(capturar("https://suvka.com/", "android-app://com.whatsapp")?.origem).toBe("com.whatsapp");
  });

  it("um referenciador que não é endereço nenhum lê-se como directo", () => {
    expect(capturar("https://suvka.com/", "isto não é um url")?.origem).toBe("directo");
  });
});

// ISTO VEM DE UM NAVEGADOR, PORTANTO VEM DE UM ESTRANHO
describe("o servidor não confia no que recebe", () => {
  it("corta o que não é um nome de canal", () => {
    expect(attributionDetails({ origem: "  Google Ads / Porto  " })).toEqual({ origem: "google-ads-porto" });
  });

  it("recusa valores que não são origem nenhuma", () => {
    expect(attributionDetails(null)).toBeNull();
    expect(attributionDetails({})).toBeNull();
    expect(attributionDetails({ origem: "" })).toBeNull();
    expect(attributionDetails({ origem: "!!!" })).toBeNull();
    expect(attributionDetails("google")).toBeNull();
  });

  it("trava o comprimento, para uma etiqueta continuar a ser uma etiqueta", () => {
    const enorme = attributionDetails({ origem: "a".repeat(500) });
    expect(enorme!.origem.length).toBeLessThanOrEqual(60);
  });

  it("omite a campanha quando não há, em vez de guardar vazio", () => {
    expect(attributionDetails({ origem: "google", campanha: "" })).toEqual({ origem: "google" });
  });
});

// A MEDIÇÃO NUNCA PODE PARTIR AQUILO QUE MEDE
describe("falha em silêncio, nunca em cima do utilizador", () => {
  it("sem armazenamento — navegação privada — não rebenta", () => {
    expect(() => captureAttribution("https://suvka.com/?utm_source=x", "", null)).not.toThrow();
    expect(readAttribution(null)).toBeNull();
  });

  it("um armazenamento que recusa escrever não parte o formulário", () => {
    const cheio = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(() => captureAttribution("https://suvka.com/?utm_source=x", "", cheio)).not.toThrow();
  });

  it("lixo no armazenamento lê-se como ausência", () => {
    expect(readAttribution(memoria({ "suvka:origem": "isto não é json" }))).toBeNull();
  });
});
