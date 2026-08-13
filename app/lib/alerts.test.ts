import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { shouldSend, resetAlertMemory, reportFailure } from "./alerts";

beforeEach(() => {
  resetAlertMemory();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.ALERT_EMAIL;
});

// Um erro de base de dados num pico de tráfego são duzentos pedidos a falhar no mesmo
// minuto. Duzentos emails não dizem mais do que um - dizem menos, porque ninguém os lê e a
// caixa passa a ser ignorada, incluindo no dia em que lá chegar o alerta que interessava.
describe("uma falha repetida é a mesma notícia", () => {
  it("manda a primeira e cala as seguintes", () => {
    const agora = Date.now();

    expect(shouldSend("publish:falhou", agora)).toBe(true);
    expect(shouldSend("publish:falhou", agora + 1000)).toBe(false);
    expect(shouldSend("publish:falhou", agora + 14 * 60 * 1000)).toBe(false);
  });

  it("volta a mandar passada a janela — o problema não desapareceu", () => {
    const agora = Date.now();

    expect(shouldSend("publish:falhou", agora)).toBe(true);
    expect(shouldSend("publish:falhou", agora + 16 * 60 * 1000)).toBe(true);
  });

  // Duas coisas diferentes a falharem ao mesmo tempo é notícia a dobrar, não a metade.
  it("falhas diferentes não se calam umas às outras", () => {
    const agora = Date.now();

    expect(shouldSend("publish:falhou", agora)).toBe(true);
    expect(shouldSend("stripe_webhook:falhou", agora)).toBe(true);
  });
});

describe("reportFailure", () => {
  it("escreve sempre no journal, mesmo sem destinatário configurado", () => {
    reportFailure({ kind: "publish", summary: "Publicação falhou", error: new Error("sem disco") });

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("[publish] Publicação falhou"));
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("sem disco"));
  });

  it("põe o contexto na linha, para se procurar por ele no journal", () => {
    reportFailure({ kind: "stripe_webhook", summary: "Webhook falhou", context: { evento: "evt_123" } });
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("evento=evt_123"));
  });

  // O CICLO QUE ISTO EXISTE PARA NÃO TER
  //
  // Se o que falhou foi o envio de email, o alerta não pode ir por email: um servidor de
  // email em baixo produzia um alerta por cada tentativa de alerta, para sempre.
  it("não tenta anunciar por email uma falha de email", () => {
    process.env.ALERT_EMAIL = "operador@suvka.com";

    reportFailure({ kind: "email", summary: "Falha ao enviar", error: new Error("SMTP em baixo") });

    // Escreve no journal, e para aí. Se tivesse tentado enviar, a contagem de repetição
    // teria ficado marcada.
    expect(console.error).toHaveBeenCalled();
    expect(shouldSend("email:Falha ao enviar", Date.now())).toBe(true);
  });

  // Um alerta é observação. Um produto que deixa de servir um cliente porque não conseguiu
  // queixar-se de outra coisa é pior do que um produto sem alertas nenhuns.
  it("nunca rebenta o pedido de quem o chamou", () => {
    process.env.ALERT_EMAIL = "operador@suvka.com";

    expect(() =>
      reportFailure({ kind: "database", summary: "Sem ligação", error: { estranho: true } })
    ).not.toThrow();
  });
});
