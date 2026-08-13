import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

// ATÉ ONDE É QUE ESTA BASE DE DADOS CORRESPONDE ÀS MIGRAÇÕES?
//
// A pergunta que tem de ser respondida antes de qualquer `migrate resolve`, e a única maneira
// errada de a responder é a olho.
//
// PORQUE É QUE ISTO NÃO É UM PASSO MANUAL
//
// A alternativa era comparar o `\d+` de três tabelas com o SQL de dez migrações e decidir. É
// exactamente o tipo de tarefa em que uma pessoa competente se engana: dez ficheiros, colunas
// com nomes parecidos, e uma conclusão que ninguém consegue verificar depois.
//
// E o erro que sairia daí não faz barulho nenhum. `migrate resolve --applied` ESCREVE no
// histórico e não verifica coisa nenhuma: marcar uma migração cujo SQL nunca correu faz o
// Prisma saltá-la para sempre. A coluna nunca aparece, o `migrate deploy` diz "no pending
// migrations", e a falha chega semanas depois num pedido qualquer, sem nada que a ligue a
// esta decisão.
//
// É a única classe de comando neste projecto que se executa com sucesso aparente e deixa a
// base permanentemente errada. Por isso a correspondência é feita por uma consulta e não por
// um julgamento.
//
// SÓ LÊ
//
// Todas as consultas aqui são SELECT sobre information_schema. Nada é criado, alterado nem
// apagado - o que este programa faz é imprimir comandos para uma pessoa decidir se corre.
//
// AS IMPRESSÕES DIGITAIS SAEM DO SQL, NÃO DE UMA LISTA ESCRITA À MÃO
//
// Uma tabela escrita à mão aqui divergiria das migrações na primeira que alguém acrescentasse
// - e divergiria em silêncio, que é o defeito que este programa existe para evitar. Isto lê os
// próprios ficheiros .sql, portanto não pode discordar deles.

export interface Impressao {
  nome: string;
  tabelas: string[];
  colunas: Array<{ tabela: string; coluna: string }>;
}

const CRIA_TABELA = /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?"([A-Za-z_]+)"/gi;
const ADICIONA_COLUNA = /ALTER TABLE\s+"([A-Za-z_]+)"\s+ADD COLUMN\s+(?:IF NOT EXISTS\s+)?"([A-Za-z_]+)"/gi;

export function impressoesDas(pasta: string): Impressao[] {
  return readdirSync(pasta, { withFileTypes: true })
    .filter((entrada) => entrada.isDirectory())
    .map((entrada) => entrada.name)
    // Os nomes começam por um carimbo de data, portanto a ordem alfabética É a cronológica -
    // que é a mesma ordem pela qual o Prisma as aplica.
    .sort()
    .map((nome) => {
      const sql = readFileSync(join(pasta, nome, "migration.sql"), "utf8");
      return {
        nome,
        tabelas: [...sql.matchAll(CRIA_TABELA)].map((m) => m[1]),
        colunas: [...sql.matchAll(ADICIONA_COLUNA)].map((m) => ({ tabela: m[1], coluna: m[2] })),
      };
    });
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      "\n  DATABASE_URL não está definido nesta shell.\n\n" +
        "  No servidor está no .env.production, que o systemd carrega para o SERVIÇO — não\n" +
        "  para a sua sessão. Carregue-o primeiro:\n\n" +
        "    set -a; . ./.env.production; set +a\n"
    );
    process.exit(1);
  }

  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    // PRIMEIRO: SERÁ QUE ISTO É SEQUER UM PROBLEMA?
    //
    // Se o _prisma_migrations existir, não há baseline nenhum a fazer e o P3005 não pode
    // acontecer. Vale a pena saber isso antes de olhar para mais alguma coisa.
    const { rows: existeHistorico } = await client.query<{ existe: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
       ) AS existe`
    );

    const { rows: tabelas } = await client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
    );
    const { rows: colunas } = await client.query<{ table_name: string; column_name: string }>(
      `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`
    );

    const temTabela = new Set(tabelas.map((r) => r.table_name));
    const temColuna = new Set(colunas.map((r) => `${r.table_name}.${r.column_name}`));

    if (existeHistorico[0].existe) {
      const { rows } = await client.query<{ migration_name: string; finished_at: Date | null }>(
        `SELECT migration_name, finished_at FROM "_prisma_migrations" ORDER BY started_at`
      );
      console.log("\n  _prisma_migrations EXISTE. Não há baseline a fazer, e o P3005 não pode acontecer.\n");
      for (const linha of rows) {
        console.log(`    ${linha.finished_at ? "aplicada  " : "POR ACABAR"} ${linha.migration_name}`);
      }
      console.log("\n  Uma migração 'POR ACABAR' é uma que falhou a meio — essa sim precisa de");
      console.log("  atenção, e a resposta NÃO é marcá-la como aplicada.\n");
      console.log("  Se estiverem todas aplicadas, o que falta é só correr ./deploy/deploy.sh\n");
      return;
    }

    console.log("\n  _prisma_migrations NÃO existe. É este o caso do P3005.\n");

    const impressoes = impressoesDas("prisma/migrations");
    const estados = impressoes.map((m) => {
      const esperado = [
        ...m.tabelas.map((t) => ({ chave: `tabela ${t}`, presente: temTabela.has(t) })),
        ...m.colunas.map((c) => ({ chave: `${c.tabela}.${c.coluna}`, presente: temColuna.has(`${c.tabela}.${c.coluna}`) })),
      ];
      const presentes = esperado.filter((e) => e.presente).length;

      // Uma migração que só mexe em índices não deixa impressão digital aqui. Nenhuma das
      // actuais está nesse caso, mas uma futura pode estar - e nessa altura este programa tem
      // de dizer que não sabe, e não presumir que está aplicada.
      const estado =
        esperado.length === 0 ? "indeterminada" : presentes === esperado.length ? "presente" : presentes === 0 ? "ausente" : "PARCIAL";

      return { nome: m.nome, estado, esperado, presentes };
    });

    for (const e of estados) {
      const marca = { presente: "  ok   ", ausente: "  --   ", PARCIAL: "  !!   ", indeterminada: "  ?    " }[e.estado];
      console.log(`${marca}${e.nome}  (${e.presentes}/${e.esperado.length})`);
      if (e.estado === "PARCIAL") {
        for (const item of e.esperado) console.log(`           ${item.presente ? "tem" : "FALTA"}  ${item.chave}`);
      }
    }

    // A LINHA DE CORTE TEM DE SER UM PREFIXO LIMPO
    //
    // O risco que interessa não é "faltam as últimas quatro" - é uma migração intermédia por
    // aplicar com as seguintes já lá. Aí a base não corresponde a nenhum ponto do histórico, e
    // marcar seja o que for como aplicado grava uma mentira.
    const primeiraAusente = estados.findIndex((e) => e.estado !== "presente");
    const aplicadas = primeiraAusente === -1 ? estados : estados.slice(0, primeiraAusente);
    const restantes = primeiraAusente === -1 ? [] : estados.slice(primeiraAusente);
    const buraco = restantes.some((e) => e.estado === "presente");
    const parcial = estados.some((e) => e.estado === "PARCIAL");
    const indeterminada = estados.some((e) => e.estado === "indeterminada");

    if (buraco || parcial || indeterminada) {
      console.error("\n  NÃO CORRA NENHUM `migrate resolve`.\n");
      if (parcial) console.error("  Há uma migração aplicada a meio: a base não está em nenhum ponto do histórico.");
      if (buraco) console.error("  Há uma migração por aplicar com outras posteriores já presentes.");
      if (indeterminada) console.error("  Há uma migração sem tabelas nem colunas — este programa não a sabe verificar.");
      console.error("\n  Isto resolve-se a olhar para o caso concreto, não com uma receita.\n");
      process.exit(2);
    }

    console.log(`\n  A base corresponde exactamente às primeiras ${aplicadas.length} migrações.\n`);
    console.log("  Marcar como aplicadas (só escreve no histórico, não toca no esquema):\n");
    for (const e of aplicadas) console.log(`    npx prisma migrate resolve --applied ${e.nome}`);
    console.log("\n  E depois aplicar as que faltam de verdade:\n");
    for (const e of restantes) console.log(`    # ${e.nome}`);
    console.log("    npx prisma migrate deploy\n");
    console.log("  Faça uma cópia de segurança antes: ./deploy/backup.sh\n");
  } finally {
    await client.end();
  }
}

// SÓ CORRE QUANDO É CHAMADO, NÃO QUANDO É IMPORTADO
//
// Sem este guarda, importar `impressoesDas` para um teste ligava-se à base de dados e chamava
// process.exit - o que rebentava o teste de uma forma que não tinha nada a ver com o que ele
// estava a verificar. Um módulo que faz coisas ao ser importado é um módulo que não se
// consegue testar.
const chamadoDirectamente = process.argv[1]?.endsWith("migration-state.ts");

if (chamadoDirectamente) {
  main().catch((erro) => {
    console.error("\n  Não foi possível ler o estado da base de dados:\n");
    console.error(`    ${erro instanceof Error ? erro.message : String(erro)}\n`);
    process.exit(1);
  });
}
