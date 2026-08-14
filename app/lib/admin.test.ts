import { describe, it, expect } from "vitest";
import { isAdmin } from "./admin";

const env = (ADMIN_EMAILS?: string) => ({ ADMIN_EMAILS });

// FALHA FECHADO
//
// Uma verificação de autorização que erra tem um lado seguro e um lado caro. Este erra para o
// lado de não deixar entrar - e um ambiente sem lista configurada não tem administradores, em
// vez de os ter todos.
describe("quem pode gastar o nosso dinheiro", () => {
  it("sem lista configurada, ninguém é administrador", () => {
    expect(isAdmin("a@b.pt", env())).toBe(false);
    expect(isAdmin("a@b.pt", env(""))).toBe(false);
    expect(isAdmin("a@b.pt", env("   "))).toBe(false);
  });

  it("sem sessão, ninguém é administrador", () => {
    expect(isAdmin(null, env("a@b.pt"))).toBe(false);
    expect(isAdmin(undefined, env("a@b.pt"))).toBe(false);
    expect(isAdmin("", env("a@b.pt"))).toBe(false);
  });

  it("deixa entrar quem está na lista", () => {
    expect(isAdmin("a@b.pt", env("a@b.pt"))).toBe(true);
    expect(isAdmin("c@d.pt", env("a@b.pt, c@d.pt , e@f.pt"))).toBe(true);
  });

  it("recusa quem não está", () => {
    expect(isAdmin("intruso@x.pt", env("a@b.pt,c@d.pt"))).toBe(false);
  });

  // Descobrir isto a meio de um incidente é tempo perdido por uma razão idiota.
  it("as maiúsculas e os espaços não decidem nada", () => {
    expect(isAdmin("  A@B.PT  ", env("a@b.pt"))).toBe(true);
    expect(isAdmin("a@b.pt", env(" A@B.PT "))).toBe(true);
  });

  // Uma vírgula a mais na configuração não pode abrir a porta a uma sessão sem email.
  it("entradas vazias na lista não autorizam ninguém", () => {
    expect(isAdmin("", env("a@b.pt,,"))).toBe(false);
    expect(isAdmin("   ", env("a@b.pt,,"))).toBe(false);
  });
});
