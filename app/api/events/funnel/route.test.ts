import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockAuth = vi.fn();
const mockFindMany = vi.fn();

// Mocked pela mesma razão que nos outros testes de rota: importar o módulo real arrasta o
// runtime do next-auth para dentro do ambiente de teste. A rota só lê session.user.email.
vi.mock("@/auth", () => ({ auth: () => mockAuth() }));

vi.mock("@/app/lib/prisma", () => ({
  prisma: { event: { findMany: (args: unknown) => mockFindMany(args) } },
}));

const { GET } = await import("./route");

const ADMIN_EMAILS_ORIGINAL = process.env.ADMIN_EMAILS;

const pedido = (dias = 30) => new Request(`https://suvka.com/api/events/funnel?days=${dias}`);

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ADMIN_EMAILS = "dono@suvka.com";
  mockFindMany.mockResolvedValue([]);
});

afterEach(() => {
  if (ADMIN_EMAILS_ORIGINAL === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = ADMIN_EMAILS_ORIGINAL;
});

describe("GET /api/events/funnel", () => {
  it("recusa quem tem sessão mas não está na lista de administradores", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", email: "cliente@restaurante.pt" } });

    const resposta = await GET(pedido());

    expect(resposta.status).toBe(401);
    // A leitura de negócio da Suvka não pode sair numa resposta a um cliente.
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("recusa quem não tem sessão nenhuma", async () => {
    mockAuth.mockResolvedValue(null);

    expect((await GET(pedido())).status).toBe(401);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("falha fechado quando ADMIN_EMAILS não está configurado", async () => {
    // Um ambiente sem a lista não tem administradores. Se isto passar a devolver 200, alguém
    // trocou a verificação por uma que assume boa fé quando a configuração falta.
    delete process.env.ADMIN_EMAILS;
    mockAuth.mockResolvedValue({ user: { id: "user-1", email: "dono@suvka.com" } });

    expect((await GET(pedido())).status).toBe(401);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("deixa passar o administrador, sem olhar a maiúsculas", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", email: "Dono@Suvka.com" } });

    const resposta = await GET(pedido());

    expect(resposta.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalled();
  });
});
