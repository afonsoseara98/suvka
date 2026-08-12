import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockAuth = vi.fn();
const mockFindUnique = vi.fn();
const mockSessionsCreate = vi.fn();

// Mocked for the same reason app/api/generate/route.test.ts mocks it: importing the real
// module pulls next-auth's runtime into the test environment. The route only reads
// session.user.id.
vi.mock("@/auth", () => ({ auth: () => mockAuth() }));

vi.mock("@/app/lib/prisma", () => ({
  prisma: { user: { findUnique: () => mockFindUnique(), update: vi.fn() } },
}));

vi.mock("@/app/lib/stripe", () => ({
  stripeClient: () => ({
    customers: { create: vi.fn() },
    checkout: { sessions: { create: (args: unknown) => mockSessionsCreate(args) } },
  }),
  stripePriceId: () => "price_live_abc",
  trialEndFor: () => undefined,
}));

const { POST } = await import("./route");

const APP_URL_ORIGINAL = process.env.APP_URL;
const AUTH_URL_ORIGINAL = process.env.AUTH_URL;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.APP_URL = "https://suvka.com";
  delete process.env.AUTH_URL;

  mockAuth.mockResolvedValue({ user: { id: "user-1" } });
  mockFindUnique.mockResolvedValue({
    email: "dono@restaurante.pt",
    stripeCustomerId: "cus_existente",
    trialStartedAt: new Date("2026-08-01T00:00:00Z"),
  });
  mockSessionsCreate.mockResolvedValue({ url: "https://checkout.stripe.com/c/pay/abc" });
});

afterEach(() => {
  if (APP_URL_ORIGINAL === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = APP_URL_ORIGINAL;
  if (AUTH_URL_ORIGINAL === undefined) delete process.env.AUTH_URL;
  else process.env.AUTH_URL = AUTH_URL_ORIGINAL;
});

const urlsDoCheckout = () => mockSessionsCreate.mock.calls[0][0] as { success_url: string; cancel_url: string };

describe("POST /api/stripe/checkout", () => {
  // O BLOCKER #3. A garantia mais forte não está aqui: está na assinatura da rota, que
  // deixou de receber um Request. Atrás do Caddy o pedido diz http://127.0.0.1:3000, e
  // enquanto ele estivesse ao alcance havia sempre a hipótese de alguém voltar a
  // reconstruir o `origin` a partir dele. Sem parâmetro, não há de onde.
  it("constrói as URLs de retorno a partir da configuração", async () => {
    await POST();

    const { success_url, cancel_url } = urlsDoCheckout();
    expect(success_url).toBe("https://suvka.com/dashboard?subscricao=ativa");
    expect(cancel_url).toBe("https://suvka.com/dashboard");
  });

  // Dito ao contrário: o cliente acaba de pagar 19 EUR e é devolvido a um endereço em
  // texto simples. O Caddy resolve com um redireccionamento, mas o segundo a seguir a um
  // pagamento é o pior momento do produto para uma volta a mais.
  it("nunca devolve o cliente para 127.0.0.1 nem para http://", async () => {
    await POST();

    const { success_url, cancel_url } = urlsDoCheckout();
    for (const url of [success_url, cancel_url]) {
      expect(url).not.toContain("127.0.0.1");
      expect(url.startsWith("https://")).toBe(true);
    }
  });

  it("segue a AUTH_URL quando não há APP_URL, como o resto do produto", async () => {
    delete process.env.APP_URL;
    process.env.AUTH_URL = "https://suvka.com";

    await POST();

    expect(urlsDoCheckout().success_url).toBe("https://suvka.com/dashboard?subscricao=ativa");
  });

  it("recusa sem sessão iniciada", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await POST();

    expect(response.status).toBe(401);
    expect(mockSessionsCreate).not.toHaveBeenCalled();
  });
});
