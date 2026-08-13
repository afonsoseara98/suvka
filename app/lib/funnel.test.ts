import { describe, it, expect } from "vitest";
import { funnelByOrigin, type EventoBruto } from "./funnel";

const preview = (draftId: string, origem?: string): EventoBruto => ({
  name: "preview_created",
  draftId,
  details: origem ? { origem } : null,
});

const passo = (name: string, draftId: string | null): EventoBruto => ({ name, draftId, details: null });

const linha = (rows: ReturnType<typeof funnelByOrigin>, origem: string) => rows.find((r) => r.origem === origem);

// A ÚNICA PERGUNTA QUE DECIDE ONDE GASTAR DINHEIRO
//
// A rota antiga dizia "100 pré-visualizações, 42 publicações" e era incapaz de dizer quais
// vieram de onde. Sem isso, um canal que traz cem curiosos e um que traz dez restaurantes a
// sério dão o mesmo número no topo, e o segundo parece dez vezes pior.
describe("cada canal com os seus números", () => {
  it("separa as origens e conta cada passo", () => {
    const rows = funnelByOrigin([
      preview("d1", "google"),
      passo("preview_viewed", "d1"),
      passo("publish_completed", "d1"),
      preview("d2", "google"),
      preview("d3", "instagram.com"),
      passo("preview_viewed", "d3"),
    ]);

    expect(linha(rows, "google")?.passos.preview_created).toBe(2);
    expect(linha(rows, "google")?.passos.publish_completed).toBe(1);
    expect(linha(rows, "instagram.com")?.passos.preview_created).toBe(1);
    expect(linha(rows, "instagram.com")?.passos.publish_completed).toBe(0);
  });

  it("a conversão é dos que começaram para os que ficaram no ar", () => {
    const rows = funnelByOrigin([
      preview("d1", "meta"),
      passo("publish_completed", "d1"),
      preview("d2", "meta"),
      preview("d3", "meta"),
      preview("d4", "meta"),
    ]);

    expect(linha(rows, "meta")?.conversao).toBe(0.25);
  });

  // Dez visitas que publicam valem mais do que cem que olham. É a inversão que este relatório
  // existe para tornar visível.
  it("um canal pequeno que converte não fica escondido atrás de um grande que não converte", () => {
    const rows = funnelByOrigin([
      ...Array.from({ length: 20 }, (_, i) => preview(`t${i}`, "tiktok")),
      ...Array.from({ length: 4 }, (_, i) => preview(`p${i}`, "parceiro-x")),
      ...Array.from({ length: 3 }, (_, i) => passo("publish_completed", `p${i}`)),
    ]);

    expect(linha(rows, "tiktok")?.conversao).toBe(0);
    expect(linha(rows, "parceiro-x")?.conversao).toBe(0.75);
  });

  it("ordena por quem trouxe mais gente", () => {
    const rows = funnelByOrigin([preview("a", "pequeno"), preview("b", "grande"), preview("c", "grande")]);
    expect(rows.map((r) => r.origem)).toEqual(["grande", "pequeno"]);
  });
});

// O QUE NÃO SE SABE FICA À VISTA, NÃO DISTRIBUÍDO
describe("os eventos sem origem não são inventados nem escondidos", () => {
  // O signup_completed só traz userId: uma conta cria-se num formulário que não sabe de que
  // rascunho veio.
  it("um evento sem rascunho fica numa linha própria", () => {
    const rows = funnelByOrigin([preview("d1", "google"), passo("signup_completed", null)]);

    expect(linha(rows, "google")?.passos.signup_completed).toBe(0);
    expect(linha(rows, "por-identificar")?.passos.signup_completed).toBe(1);
  });

  // Somá-lo ao "directo" inventaria conversões que ninguém pode verificar.
  it("nunca é atribuído ao tráfego directo por conveniência", () => {
    const rows = funnelByOrigin([preview("d1"), passo("signup_completed", null)]);
    expect(linha(rows, "directo")).toBeUndefined();
  });

  // Um relatório cujos totais não batem certo com a tabela perde a confiança de quem o lê.
  it("os totais da tabela batem certo com o número de eventos", () => {
    const eventos = [preview("d1", "google"), passo("preview_viewed", "d1"), passo("signup_completed", null)];
    const total = funnelByOrigin(eventos).reduce(
      (soma, r) => soma + Object.values(r.passos).reduce((a, b) => a + b, 0),
      0
    );
    expect(total).toBe(eventos.length);
  });

  it("uma pré-visualização sem origem gravada não desaparece", () => {
    expect(linha(funnelByOrigin([preview("d1")]), "por-identificar")?.passos.preview_created).toBe(1);
  });
});

describe("robustez", () => {
  it("sem eventos nenhuns devolve uma tabela vazia, não rebenta", () => {
    expect(funnelByOrigin([])).toEqual([]);
  });

  it("um nome de evento desconhecido é ignorado em vez de criar uma coluna", () => {
    const rows = funnelByOrigin([preview("d1", "google"), passo("evento_que_nao_existe", "d1")]);
    expect(Object.values(linha(rows, "google")!.passos).reduce((a, b) => a + b, 0)).toBe(1);
  });

  it("detalhes corrompidos lêem-se como origem em falta", () => {
    for (const details of [null, "texto", 42, {}, { origem: 7 }, { origem: "" }]) {
      const rows = funnelByOrigin([{ name: "preview_created", draftId: "d1", details }]);
      expect(rows[0].origem, JSON.stringify(details)).toBe("por-identificar");
    }
  });

  // Todos os passos conhecidos presentes, zeros incluídos: um funil com chaves em falta
  // lê-se como uma falha do produto e não como um passo onde ninguém chegou.
  it("todas as etapas aparecem, mesmo a zero", () => {
    const passos = funnelByOrigin([preview("d1", "google")])[0].passos;
    expect(passos.publish_clicked).toBe(0);
    expect(passos.phone_clicked).toBe(0);
  });
});
