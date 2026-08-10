import { checkEnvironment, formatEnvReport } from "@/app/lib/env";

// O PRIMEIRO CÓDIGO QUE CORRE, ANTES DO PRIMEIRO PEDIDO
//
// O Next chama isto uma vez, ao preparar o servidor. Não corre durante o `next build` -
// verificado - portanto um build continua a funcionar numa máquina sem segredos nenhuns,
// que é o que a CI é.
//
// POR QUE É QUE ISTO CHAMA process.exit E NÃO FAZ THROW.
//
// Foi medido, não assumido. Um `throw` aqui NÃO mata o processo: o Next escreve "Failed to
// prepare server", fica de pé, e responde HTTP 500 a tudo - incluindo ao /api/health. Isso
// é o pior resultado possível: o systemd vê um processo vivo e não reinicia nada, e o
// serviço fica ali a servir 500 a todos os restaurantes até alguém reparar.
//
// Sair com código 1 dá o contrário: o systemd tenta reiniciar, falha na mesma, e ao fim de
// StartLimitBurst desiste e marca a unidade `failed` - visível num `systemctl status`, e o
// deploy.sh nunca chega a dizer que correu bem.
export async function register() {
  // Só o runtime de Node. O edge não tem process.exit e nada disto lhe diz respeito.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

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

  process.exit(1);
}
