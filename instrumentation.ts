// O PRIMEIRO CÓDIGO QUE CORRE, ANTES DO PRIMEIRO PEDIDO
//
// O Next chama isto uma vez, ao preparar o servidor. Não corre durante o `next build` -
// verificado - portanto um build continua a funcionar numa máquina sem segredos nenhuns,
// que é o que a CI é.
//
// Este ficheiro é compilado para os dois runtimes, e por isso não pode conter uma única
// API de Node: o `process.exit` que isto acaba por chamar vive em verifyEnvironment.ts e
// entra por import dinâmico, dentro do ramo que só o Node executa. Estaticamente, o pacote
// do Edge não o vê.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { verifyEnvironmentOrExit } = await import("./app/lib/verifyEnvironment");
  verifyEnvironmentOrExit();
}
