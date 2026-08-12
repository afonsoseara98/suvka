import { describe, it, expect } from "vitest";
import { appUrl, normalizeAppUrl } from "./appUrl";

function env(vars: Record<string, string>): NodeJS.ProcessEnv {
  return { NODE_ENV: "production", ...vars } as NodeJS.ProcessEnv;
}

describe("appUrl", () => {
  it("usa APP_URL quando existe", () => {
    expect(appUrl(env({ APP_URL: "https://suvka.com" }))).toBe("https://suvka.com");
  });

  it("cai no AUTH_URL quando não há APP_URL", () => {
    expect(appUrl(env({ AUTH_URL: "https://suvka.com" }))).toBe("https://suvka.com");
  });

  it("prefere APP_URL a AUTH_URL", () => {
    expect(appUrl(env({ APP_URL: "https://suvka.com", AUTH_URL: "https://outro.com" }))).toBe("https://suvka.com");
  });

  it("sem configuração nenhuma assume o servidor local", () => {
    expect(appUrl(env({}))).toBe("http://localhost:3000");
  });

  // Uma barra a mais dá "https://suvka.com//taberna": uma URL diferente da que o site
  // serve, e conteúdo duplicado aos olhos de quem indexa.
  it("tira a barra final", () => {
    expect(appUrl(env({ APP_URL: "https://suvka.com/" }))).toBe("https://suvka.com");
    expect(appUrl(env({ APP_URL: "https://suvka.com///" }))).toBe("https://suvka.com");
  });

  it("ignora espaços à volta", () => {
    expect(appUrl(env({ APP_URL: "  https://suvka.com  " }))).toBe("https://suvka.com");
  });

  it("uma variável vazia conta como ausente", () => {
    expect(appUrl(env({ APP_URL: "   ", AUTH_URL: "https://suvka.com" }))).toBe("https://suvka.com");
  });

  it("normalizeAppUrl não mexe num endereço já limpo", () => {
    expect(normalizeAppUrl("https://suvka.com")).toBe("https://suvka.com");
  });
});
