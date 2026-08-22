import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockFindById = vi.fn();
const mockDeleteProject = vi.fn();
const mockInvalidateSite = vi.fn();

// Mocked pela mesma razão que nos outros testes de rota: importar o módulo real arrasta o
// runtime do next-auth para dentro do ambiente de teste.
vi.mock("@/auth", () => ({ auth: () => mockAuth() }));

vi.mock("@/app/lib/repos", () => ({
  repos: { projects: { findById: (id: string) => mockFindById(id), update: vi.fn() }, pages: { getPublishedSnapshot: vi.fn() } },
}));

vi.mock("@/app/lib/projectService", () => ({
  loadProject: vi.fn(),
  deleteProject: (...args: unknown[]) => mockDeleteProject(...args),
}));

vi.mock("@/app/lib/siteCache", () => ({
  invalidateSite: (slug: string) => mockInvalidateSite(slug),
}));

const { DELETE } = await import("./route");

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const pedido = () => new Request("https://suvka.com/api/projects/proj-1", { method: "DELETE" });

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: "dono-1" } });
  mockFindById.mockResolvedValue({ id: "proj-1", ownerId: "dono-1", slug: "taberna-do-goncalo" });
  mockDeleteProject.mockResolvedValue(undefined);
});

describe("DELETE /api/projects/[id]", () => {
  // A REGRESSÃO QUE ISTO EXISTE PARA IMPEDIR
  //
  // Publicar e despublicar limpavam a cache; apagar não. O site continuava a ser servido
  // depois de o registo desaparecer da base - visível só com a cache quente, ou seja
  // exactamente nos sites que têm visitantes.
  it("limpa a cache do endereço que acabou de apagar", async () => {
    const resposta = await DELETE(pedido(), params("proj-1"));

    expect(resposta.status).toBe(200);
    expect(mockInvalidateSite).toHaveBeenCalledWith("taberna-do-goncalo");
  });

  // A ORDEM É A CORRECÇÃO, NÃO UM DETALHE
  //
  // Invalidar antes de apagar deixa uma janela em que um pedido em voo relê a linha que ainda
  // existe e volta a encher a cache com o site que estamos a apagar. Se alguém trocar estas
  // duas linhas, este teste parte - e é suposto partir.
  it("limpa a cache DEPOIS de apagar, nunca antes", async () => {
    const ordem: string[] = [];
    mockDeleteProject.mockImplementation(async () => { ordem.push("delete"); });
    mockInvalidateSite.mockImplementation(() => { ordem.push("invalidate"); });

    await DELETE(pedido(), params("proj-1"));

    expect(ordem).toEqual(["delete", "invalidate"]);
  });

  // Um projecto nunca publicado não tem endereço nem entrada em cache. Invalidar `null`
  // limparia uma etiqueta inventada - barato, mas é ruído a esconder o caso real.
  it("não invalida nada quando o projecto nunca foi publicado", async () => {
    mockFindById.mockResolvedValue({ id: "proj-1", ownerId: "dono-1", slug: null });

    expect((await DELETE(pedido(), params("proj-1"))).status).toBe(200);
    expect(mockInvalidateSite).not.toHaveBeenCalled();
  });

  // A guarda de propriedade continua a mandar: quem não é dono não apaga nem toca na cache
  // de um endereço que não é dele.
  it("não apaga nem invalida o site de outro utilizador", async () => {
    mockFindById.mockResolvedValue({ id: "proj-1", ownerId: "outro-dono", slug: "casa-alheia" });

    const resposta = await DELETE(pedido(), params("proj-1"));

    expect(resposta.status).toBe(404);
    expect(mockDeleteProject).not.toHaveBeenCalled();
    expect(mockInvalidateSite).not.toHaveBeenCalled();
  });

  it("recusa sem sessão, sem tocar em nada", async () => {
    mockAuth.mockResolvedValue(null);

    expect((await DELETE(pedido(), params("proj-1"))).status).toBe(401);
    expect(mockDeleteProject).not.toHaveBeenCalled();
    expect(mockInvalidateSite).not.toHaveBeenCalled();
  });
});
