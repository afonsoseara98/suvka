"use client";

import { readSchedule } from "@/app/lib/restaurant/openNow";

// O QUE PERCEBEMOS DO HORÁRIO, DITO ANTES DE SER TARDE
//
// O "Aberto agora" é o sinal que responde à pergunta de maior intenção que existe numa
// página de restaurante: "vou lá agora?". Só aparece quando o horário se consegue ler com
// certeza — e essa recusa é o desenho certo, porque um "Aberto" errado é alguém a conduzir
// até uma porta fechada.
//
// O que estava errado era a recusa ser INVISÍVEL. O dono escrevia o horário como quem
// escreve um aviso à porta, o distintivo não aparecia, e ele não sabia que existia,
// portanto não sabia que o tinha perdido. Foi assim que isto se descobriu: escrevi
// "Terça a sábado das 12h às 15h e das 19h30 às 23h. Domingo só almoços. Segunda fechado."
// — português normal — e não apareceu nada.
//
// Duas coisas que este componente NÃO faz, e são a razão de ele ser seguro:
//
//   1. Não corrige o texto dele. O horário que a página imprime é o que ele escreveu.
//   2. Não o impede de continuar. Um horário que não conseguimos ler continua a ser um
//      horário válido — a página mostra-o, só não põe o distintivo por cima.
//
// Os dias saem em lista e não em intervalo de propósito: o objectivo é ele reconhecer um
// erro NOSSO — ver lá "segunda" quando fecha à segunda — e uma lista mostra isso, um
// intervalo esconde-o.
export default function ScheduleReadback({ schedule }: { schedule: string }) {
  // Uma caixa por preencher não leva aviso nenhum. Só se diz que não se percebeu depois de
  // haver alguma coisa para perceber.
  if (schedule.trim().length < 6) return null;

  const leitura = readSchedule(schedule);

  // PERCEBEMOS QUASE TUDO, E DIZEMOS EXACTAMENTE O QUE NÃO
  //
  // Esconder o distintivo em silêncio é seguro para o cliente e inútil para o dono: ele fica
  // sem saber o que fazer. Mostrar-lhe a frase - a dele, com os acentos e as maiúsculas
  // dele - transforma um comportamento silencioso num comportamento que se percebe.
  //
  // Sem corrigir, sem alterar, sem sugerir uma reescrita. A frase é dele.
  if (leitura.unrepresented.length > 0) {
    return (
      <div className="mt-2 text-sm leading-relaxed text-amber-500/90">
        <p>Conseguimos perceber quase todo o horário. Não conseguimos interpretar:</p>
        <ul className="mt-1 space-y-1">
          {leitura.unrepresented.map((frase) => (
            <li key={frase} className="border-l-2 border-amber-500/40 pl-3 text-amber-300/90">
              &ldquo;{frase}&rdquo;
            </li>
          ))}
        </ul>
        <p className="mt-2">
          O site vai mostrar o horário tal como o escreveu — mas não vai dizer{" "}
          <strong>&ldquo;Aberto agora&rdquo;</strong>, para não arriscar dizer a um cliente
          que está fechado quando está aberto.
        </p>
      </div>
    );
  }

  if (!leitura.readable) {
    return (
      <p className="mt-2 text-sm leading-relaxed text-amber-500/90">
        Não conseguimos ler este horário. O site vai mostrá-lo tal como o escreveu — mas não
        vai poder dizer <strong>&ldquo;Aberto agora&rdquo;</strong> a quem o visitar.
      </p>
    );
  }

  const dias =
    leitura.days.length === 7
      ? "todos os dias"
      : leitura.days.length > 1
        ? `${leitura.days.slice(0, -1).join(", ")} e ${leitura.days[leitura.days.length - 1]}`
        : leitura.days[0];

  return (
    <p className="mt-2 text-sm leading-relaxed text-emerald-500/90">
      Percebemos: aberto {dias}, {leitura.ranges.join(" e ")}. O site vai poder dizer{" "}
      <strong>&ldquo;Aberto agora&rdquo;</strong>.
    </p>
  );
}
