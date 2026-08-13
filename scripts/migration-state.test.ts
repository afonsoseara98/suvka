import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { impressoesDas } from "./migration-state";

const PASTA = "prisma/migrations";

// O MODO DE FALHA QUE INTERESSA É SILENCIOSO
//
// O migration-state.ts extrai de cada migração as tabelas e colunas que ela cria, para depois
// perguntar à base de dados se lá estão. Se uma migração futura escrever o SQL de uma forma
// que a expressão regular não apanhe - sem aspas, com o ADD COLUMN noutra linha - o programa
// não dá erro nenhum: devolve uma impressão digital vazia e conclui "indeterminada", ou pior,
// deixa de ver colunas que existem.
//
// A consequência é a que este programa todo existe para evitar: um `migrate resolve --applied`
// sobre uma leitura errada, que grava no histórico uma coisa que nunca aconteceu.
//
// Isto conta as ocorrências no SQL por um caminho independente e exige que batam certo.
describe("nenhuma migração escapa ao extractor", () => {
  const migracoes = readdirSync(PASTA, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  const impressoes = impressoesDas(PASTA);

  it("lê todas as migrações que existem, por ordem cronológica", () => {
    expect(impressoes.map((i) => i.nome)).toEqual(migracoes);
  });

  it("apanha todos os CREATE TABLE e ADD COLUMN de cada ficheiro", () => {
    for (const impressao of impressoes) {
      const sql = readFileSync(join(PASTA, impressao.nome, "migration.sql"), "utf8");

      // Contagem por um caminho diferente do usado no programa: conta as palavras-chave, sem
      // olhar a aspas nem a nomes. Se as duas contagens divergirem, há SQL que o extractor
      // não está a ver.
      const criaTabela = (sql.match(/CREATE\s+TABLE/gi) ?? []).length;
      const adicionaColuna = (sql.match(/ADD\s+COLUMN/gi) ?? []).length;

      expect(impressao.tabelas.length, `${impressao.nome}: CREATE TABLE`).toBe(criaTabela);
      expect(impressao.colunas.length, `${impressao.nome}: ADD COLUMN`).toBe(adicionaColuna);
    }
  });

  // Uma migração sem tabelas nem colunas é legítima - pode mexer só em índices - mas o
  // programa tem de a tratar como "não sei", e não como aplicada. Hoje não há nenhuma; este
  // teste diz a quem acrescentar a primeira que o caso existe e está previsto.
  it("hoje todas as migrações deixam uma impressão verificável", () => {
    for (const impressao of impressoes) {
      expect(impressao.tabelas.length + impressao.colunas.length, impressao.nome).toBeGreaterThan(0);
    }
  });

  it("a impressão da inicial e das últimas é a esperada", () => {
    const porNome = new Map(impressoes.map((i) => [i.nome, i]));
    expect(porNome.get("20260806084133_init")?.tabelas).toContain("Project");
    expect(porNome.get("20260813200000_event_details")?.colunas).toEqual([{ tabela: "Event", coluna: "details" }]);
    expect(porNome.get("20260813210000_project_restaurant_input")?.colunas).toEqual([
      { tabela: "Project", coluna: "restaurantInput" },
    ]);
  });
});
