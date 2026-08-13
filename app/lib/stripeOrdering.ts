// O STRIPE NÃO GARANTE A ORDEM
//
// É a frase que a documentação deles diz e que é fácil de ler e não acreditar. Os eventos
// chegam por HTTP, com repetições, a partir de vários sítios — e "criado às 10:00" não
// significa "entregue antes do criado às 10:01".
//
// O QUE ISSO CUSTAVA AQUI
//
// Este produto tem UM sítio que escreve o estado da subscrição, e escrevia sempre. Portanto:
//
//   10:00  subscription.updated    active     ← entregue às 10:02
//   10:01  subscription.deleted    canceled   ← entregue às 10:01
//
// O último a chegar ganhava. O cliente cancelou e o produto ficou a dizer `active` — ou, na
// ordem contrária e pior, o cliente reactivou e o produto ficou a dizer `canceled`.
//
// Nenhum dos dois dá erro. Nenhum aparece num registo. O primeiro descobre-se quando alguém
// deixar de pagar e continuar a ter serviço; o segundo quando um cliente pagante telefonar a
// dizer que foi cortado.
//
// A REGRA
//
// Cada escrita guarda o `created` do evento que a fez. Um evento mais velho do que o último
// aplicado não escreve nada.
//
// Igual PASSA, de propósito. O Stripe repete o mesmo evento quando não recebe um 200, e o
// mesmo evento aplicado duas vezes escreve exactamente os mesmos valores — bloquear a
// repetição não protege de nada e faria uma primeira entrega perdida por um timeout ficar
// perdida para sempre.
//
// POR ISSO ISTO NÃO É IDEMPOTÊNCIA POR IDENTIFICADOR
//
// A alternativa era guardar os ids já processados. Resolvia a repetição, que não é um
// problema aqui, e NÃO resolvia a ordem, que é. Custava uma tabela que cresce para sempre e
// uma decisão sobre quando a limpar. Uma coluna com uma data responde à pergunta certa.

export interface Ordered {
  // O `created` do evento, em segundos, como o Stripe o manda.
  created: number;
}

export function eventTimeOf(event: Ordered): Date {
  return new Date(event.created * 1000);
}

// `null` é o estado de quem nunca recebeu um evento: o primeiro de todos passa sempre.
export function shouldApply(eventAt: Date, lastAppliedAt: Date | null): boolean {
  if (lastAppliedAt === null) return true;
  return eventAt.getTime() >= lastAppliedAt.getTime();
}
