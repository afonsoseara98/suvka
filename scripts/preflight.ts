import { readFileSync } from "node:fs";
import { checkEnvironment, formatEnvReport } from "../app/lib/env";

// ANTES DE TOCAR EM ALGUMA COISA
//
// O deploy.sh corria, por esta ordem: git pull, npm ci, migrar a base de dados, build. E a
// verificação do ambiente acontecia implicitamente no build - o passo mais longo e o último.
//
// Consequência: um APP_URL em falta parava o deploy DEPOIS das migrações já terem corrido.
// Ficava um servidor a correr código antigo contra um esquema novo, com alguém a olhar para
// uma mensagem de erro sem saber se aquilo era grave. Neste caso concreto não era - as duas
// migrações novas só acrescentam colunas opcionais - mas essa é uma propriedade destas
// migrações e não do processo, e o processo é que tem de ser seguro.
//
// Isto corre antes da primeira coisa irreversível e diz tudo o que falta de uma vez.
//
// PORQUE É QUE NÃO REESCREVE AS REGRAS EM BASH
//
// A lista do que é obrigatório vive no app/lib/env.ts e é a mesma que decide se o servidor
// arranca. Uma segunda cópia em shell divergiria - e a maneira como divergiria é a pior
// possível: um preflight que diz "está tudo bem" sobre um arranque que vai falhar é pior do
// que não haver preflight nenhum, porque gasta a confiança de quem o corre.

// Um leitor mínimo, e deliberadamente mínimo: não expande variáveis, não interpreta aspas
// aninhadas, não faz nada de esperto. Aqui só é preciso saber QUE CHAVES existem e se têm
// algum valor - o Next carrega o ficheiro a sério logo a seguir, e é ele a autoridade.
function lerEnv(caminho: string): Record<string, string> {
  let texto: string;
  try {
    texto = readFileSync(caminho, "utf8");
  } catch {
    console.error(`\n  ${caminho} não existe.\n\n  Ver deploy/README.md — é o ficheiro com a configuração de produção.\n`);
    process.exit(1);
  }

  // Um mapa simples, e não um NodeJS.ProcessEnv: o tipo do Node exige NODE_ENV, que este
  // ficheiro não tem por definição - quem o define é o systemd ao arrancar o serviço.
  const env: Record<string, string> = {};
  for (const linha of texto.split("\n")) {
    const limpa = linha.trim();
    if (!limpa || limpa.startsWith("#")) continue;

    const igual = limpa.indexOf("=");
    if (igual < 0) continue;

    const chave = limpa.slice(0, igual).trim();
    const valor = limpa.slice(igual + 1).trim().replace(/^["']|["']$/g, "");
    if (chave) env[chave] = valor;
  }
  return env;
}

const caminho = process.argv[2] ?? ".env.production";
// NODE_ENV entra à mão porque não está no ficheiro: o systemd é que o define ao arrancar o
// serviço. Sem ele, o checkEnvironment avaliaria isto como uma máquina de trabalho e deixaria
// passar exactamente as coisas que só são obrigatórias em produção.
const report = checkEnvironment({ ...lerEnv(caminho), NODE_ENV: "production" });

if (report.fatal.length > 0) {
  console.error(formatEnvReport(report));
  console.error(`  Nada foi alterado. Corrija o ${caminho} e volte a correr o deploy.\n`);
  process.exit(1);
}

// Os avisos não param o deploy - são coisas que degradam o produto sem o partir, como não
// haver email configurado. Mas são impressos, porque um aviso que ninguém vê é um aviso que
// não existe.
if (report.warnings.length > 0) console.warn(formatEnvReport(report));

console.log(`  ok    ambiente (${caminho})`);
