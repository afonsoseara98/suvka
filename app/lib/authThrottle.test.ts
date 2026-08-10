import { describe, it, expect } from "vitest";
import { checkLoginAttempt, type AuthThrottleLimiters } from "./authThrottle";
import { InMemoryRateLimiter } from "./rateLimit";

function limiters(addressLimit: number, emailLimit: number): AuthThrottleLimiters {
  return {
    byAddress: new InMemoryRateLimiter(addressLimit, 60_000),
    byEmail: new InMemoryRateLimiter(emailLimit, 60_000),
  };
}

describe("checkLoginAttempt", () => {
  it("deixa passar as primeiras tentativas", async () => {
    const shared = limiters(3, 10);

    for (let i = 0; i < 3; i++) {
      expect((await checkLoginAttempt({ address: "1.1.1.1", email: "a@b.pt" }, shared)).allowed).toBe(true);
    }
  });

  it("trava o endereço depois do limite, e diz quanto tempo falta", async () => {
    const shared = limiters(2, 10);
    await checkLoginAttempt({ address: "1.1.1.1", email: "a@b.pt" }, shared);
    await checkLoginAttempt({ address: "1.1.1.1", email: "a@b.pt" }, shared);

    const blocked = await checkLoginAttempt({ address: "1.1.1.1", email: "a@b.pt" }, shared);

    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("não deixa que um endereço esgotado afecte outro", async () => {
    const shared = limiters(1, 10);
    await checkLoginAttempt({ address: "1.1.1.1", email: "a@b.pt" }, shared);

    expect((await checkLoginAttempt({ address: "1.1.1.1", email: "a@b.pt" }, shared)).allowed).toBe(false);
    expect((await checkLoginAttempt({ address: "2.2.2.2", email: "c@d.pt" }, shared)).allowed).toBe(true);
  });

  // O caso que o limite por endereço sozinho não apanha: adivinhar a password de uma conta
  // a partir de muitos endereços diferentes, que é como isso se faz a sério.
  it("trava a mesma conta mesmo quando os endereços mudam a cada tentativa", async () => {
    const shared = limiters(50, 3);

    for (let i = 0; i < 3; i++) {
      const attempt = await checkLoginAttempt({ address: `10.0.0.${i}`, email: "dono@restaurante.pt" }, shared);
      expect(attempt.allowed).toBe(true);
    }

    const blocked = await checkLoginAttempt({ address: "10.0.0.99", email: "dono@restaurante.pt" }, shared);
    expect(blocked.allowed).toBe(false);
  });

  it("conta o mesmo email escrito com maiúsculas diferentes como um só", async () => {
    const shared = limiters(50, 2);

    await checkLoginAttempt({ address: "1.1.1.1", email: "Dono@Restaurante.pt" }, shared);
    await checkLoginAttempt({ address: "1.1.1.1", email: "  dono@restaurante.pt  " }, shared);

    const blocked = await checkLoginAttempt({ address: "1.1.1.1", email: "DONO@RESTAURANTE.PT" }, shared);
    expect(blocked.allowed).toBe(false);
  });

  it("não consome contagem de email quando o email vem vazio", async () => {
    const shared = limiters(50, 1);

    await checkLoginAttempt({ address: "1.1.1.1", email: "" }, shared);
    await checkLoginAttempt({ address: "1.1.1.1", email: "   " }, shared);

    expect((await checkLoginAttempt({ address: "1.1.1.1", email: "real@restaurante.pt" }, shared)).allowed).toBe(true);
  });

  // Um endereço já travado não deve gastar a contagem da conta - senão bastava alguém
  // atacar de um endereço só para deixar o dono do restaurante de fora.
  it("não gasta a contagem do email quando o endereço já está travado", async () => {
    const shared = limiters(1, 2);

    await checkLoginAttempt({ address: "1.1.1.1", email: "dono@restaurante.pt" }, shared);
    for (let i = 0; i < 5; i++) {
      await checkLoginAttempt({ address: "1.1.1.1", email: "dono@restaurante.pt" }, shared);
    }

    const fromElsewhere = await checkLoginAttempt({ address: "9.9.9.9", email: "dono@restaurante.pt" }, shared);
    expect(fromElsewhere.allowed).toBe(true);
  });
});
