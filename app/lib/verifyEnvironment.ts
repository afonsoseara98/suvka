import { checkEnvironment, formatEnvReport } from "./env";

// SÓ NODE. NUNCA EDGE.
//
// Separado do instrumentation.ts por causa do `process.exit` lá em baixo. O
// instrumentation.ts é compilado para os dois runtimes, e o Edge não tem `process.exit` -
// o guarda `NEXT_RUNTIME === "nodejs"` impedia-o de correr, mas não o impedia de estar lá,
// e o build avisava a cada vez ("A Node.js API is used ... which is not supported in the
// Edge Runtime").
//
// Um aviso permanente num build é pior do que parece: passadas duas semanas ninguém o lê,
// e o próximo - que já não é inofensivo - aparece no meio destes e passa despercebido.
//
// Aqui dentro está tudo o que o Edge não pode ver. O instrumentation.ts chega cá por
// import dinâmico, dentro do ramo que só o Node executa.
export function verifyEnvironmentOrExit(): void {
  const report = checkEnvironment(process.env);
  if (report.fatal.length === 0 && report.warnings.length === 0) return;

  const text = formatEnvReport(report);

  if (report.fatal.length === 0) {
    console.warn(text);
    return;
  }

  console.error(text);

  // Em desenvolvimento diz-se e continua-se: quem está a trabalhar no gerador de páginas
  // não precisa de ter o Stripe configurado para ver uma página desenhar-se, e um arranque
  // que morre é a maneira mais rápida de alguém apagar esta verificação.
  if (process.env.NODE_ENV !== "production") {
    console.error("  (em desenvolvimento arranca na mesma - em produção não arrancaria)\n");
    return;
  }

  // POR QUE É QUE ISTO SAI EM VEZ DE FAZER THROW.
  //
  // Foi medido, não assumido. Um `throw` no register() NÃO mata o processo: o Next escreve
  // "Failed to prepare server", fica de pé, e responde HTTP 500 a tudo - incluindo ao
  // /api/health. O systemd via um processo vivo e não reiniciava nada, e o serviço ficava
  // a servir 500 a todos os restaurantes até alguém reparar.
  //
  // Sair com 1 dá o contrário: o systemd tenta, falha, e ao fim de StartLimitBurst desiste
  // e marca a unidade `failed` - visível num `systemctl status`, e o deploy.sh nunca chega
  // a dizer que correu bem.
  process.exit(1);
}
