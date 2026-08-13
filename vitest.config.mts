import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    // UM CLONE DO PRÓPRIO REPOSITÓRIO DENTRO DA PASTA DE TRABALHO
    //
    // Existe um `suvka/` que é uma cópia do projecto feita à mão. Já saiu do índice do git,
    // mas o vitest continuava a apanhá-lo: cada teste corria duas vezes, e a segunda contra
    // uma versão antiga do código.
    //
    // Isso não é só ruído. Um teste que passa aqui e falha na cópia manda alguém investigar
    // um defeito que já foi corrigido — e um que falha aqui e passa lá dá a impressão
    // contrária. Apanhado quando um teste falhou duas vezes com o mesmo nome.
    exclude: ["**/node_modules/**", "**/dist/**", "suvka/**"],
  },
});
