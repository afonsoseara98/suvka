import { describe, it, expect } from "vitest";
import { eventTimeOf, shouldApply } from "./stripeOrdering";

// O Stripe não garante a ordem de entrega, e o custo disso neste produto era um estado de
// subscrição errado que não dá erro nenhum: descobre-se quando alguém deixa de pagar e
// continua a ter serviço, ou quando um cliente pagante telefona a dizer que foi cortado.
describe("a ordem dos eventos do Stripe", () => {
  const dezHoras = new Date("2026-08-13T10:00:00Z");
  const dezEUm = new Date("2026-08-13T10:01:00Z");

  it("lê o relógio do Stripe, que vem em segundos", () => {
    expect(eventTimeOf({ created: 1786608000 })).toEqual(new Date(1786608000 * 1000));
  });

  it("o primeiro evento de sempre passa", () => {
    expect(shouldApply(dezHoras, null)).toBe(true);
  });

  it("um evento mais recente escreve", () => {
    expect(shouldApply(dezEUm, dezHoras)).toBe(true);
  });

  // O CASO QUE ISTO EXISTE PARA IMPEDIR
  //
  //   10:00  subscription.updated   active     ← entregue às 10:02
  //   10:01  subscription.deleted   canceled   ← entregue às 10:01
  //
  // Sem a guarda, o último a chegar ganhava e o produto ficava a dizer `active` a quem tinha
  // cancelado. Na ordem contrária, e pior, dizia `canceled` a quem tinha reactivado.
  it("um evento mais antigo não desfaz um mais recente", () => {
    expect(shouldApply(dezHoras, dezEUm)).toBe(false);
  });

  // O Stripe repete o mesmo evento quando não recebe um 200. Aplicá-lo duas vezes escreve
  // exactamente os mesmos valores - bloquear a repetição não protegia de nada, e fazia uma
  // primeira entrega perdida por um timeout ficar perdida para sempre.
  it("o mesmo evento outra vez volta a passar", () => {
    expect(shouldApply(dezHoras, dezHoras)).toBe(true);
  });

  it("um segundo de diferença chega para decidir", () => {
    const umSegundoAntes = new Date(dezHoras.getTime() - 1000);
    expect(shouldApply(umSegundoAntes, dezHoras)).toBe(false);
  });
});
