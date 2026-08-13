import { describe, it, expect } from "vitest";
import { issueResetToken, hashResetToken, resetTokenMatches, verdictFor, RESET_TTL_MS } from "./passwordReset";

// Uma recuperação de password é, por construção, uma forma de entrar numa conta sem saber a
// password dela. Cada teste aqui verifica que essa forma é mais estreita do que a porta da
// frente, e não mais larga.
describe("o código de recuperação", () => {
  it("nunca sai duas vezes igual", () => {
    const emitidos = new Set(Array.from({ length: 200 }, () => issueResetToken().token));
    expect(emitidos.size).toBe(200);
  });

  it("é grande ao ponto de não valer a pena adivinhar", () => {
    // 32 bytes em base64url. Menos do que isto e adivinhar o código passa a ser mais fácil
    // do que adivinhar a password, o que inverteria o propósito.
    expect(issueResetToken().token.length).toBeGreaterThanOrEqual(43);
  });

  // A DECISÃO QUE PROTEGE UMA CÓPIA DA BASE DE DADOS
  //
  // Se o código ficasse guardado, uma cópia que vazasse era um kit de tomada de contas
  // pronto a usar para todas as contas com um pedido aberto.
  it("o que fica guardado não permite reconstruir o código", () => {
    const { token, tokenHash } = issueResetToken();

    expect(tokenHash).not.toContain(token);
    expect(tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(tokenHash).not.toBe(token);
  });

  it("o mesmo código dá sempre o mesmo resumo, e outro dá outro", () => {
    expect(hashResetToken("abc")).toBe(hashResetToken("abc"));
    expect(hashResetToken("abc")).not.toBe(hashResetToken("abd"));
  });

  it("reconhece o código certo e recusa o errado", () => {
    const { token, tokenHash } = issueResetToken();

    expect(resetTokenMatches(token, tokenHash)).toBe(true);
    expect(resetTokenMatches(issueResetToken().token, tokenHash)).toBe(false);
    expect(resetTokenMatches("", tokenHash)).toBe(false);
  });

  it("não rebenta com lixo em vez de um resumo", () => {
    expect(resetTokenMatches("abc", "não é hexadecimal")).toBe(false);
    expect(resetTokenMatches("abc", "")).toBe(false);
  });

  it("vale uma hora", () => {
    const agora = new Date("2026-08-13T12:00:00Z");
    expect(issueResetToken(agora).expiresAt.getTime() - agora.getTime()).toBe(RESET_TTL_MS);
  });
});

describe("quando um pedido deixa de servir", () => {
  const agora = new Date("2026-08-13T12:00:00Z");
  const daquiAMeiaHora = new Date(agora.getTime() + 30 * 60 * 1000);

  it("serve enquanto não expirou nem foi usado", () => {
    expect(verdictFor({ expiresAt: daquiAMeiaHora, usedAt: null }, agora)).toBe("valid");
  });

  it("deixa de servir passada a hora", () => {
    const passou = new Date(agora.getTime() - 1000);
    expect(verdictFor({ expiresAt: passou, usedAt: null }, agora)).toBe("expired");
  });

  // O link fica no email para sempre. Sem isto, quem tiver acesso ao email dele daqui a um
  // ano entra na conta com um link antigo.
  it("uma vez usado, nunca mais serve", () => {
    expect(verdictFor({ expiresAt: daquiAMeiaHora, usedAt: agora }, agora)).toBe("used");
  });

  // Usado ganha a expirado quando os dois se aplicam: o que interessa saber é que alguém já
  // entrou com aquele código, não que ele entretanto também caducou.
  it("usado E expirado conta como usado", () => {
    const passou = new Date(agora.getTime() - 1000);
    expect(verdictFor({ expiresAt: passou, usedAt: passou }, agora)).toBe("used");
  });

  it("expira exactamente na hora, não um instante depois", () => {
    expect(verdictFor({ expiresAt: agora, usedAt: null }, agora)).toBe("expired");
  });
});
