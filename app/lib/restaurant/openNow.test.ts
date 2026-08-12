import { describe, it, expect } from "vitest";
import { openStateFor, readSchedule } from "./openNow";

// A Tuesday. All times below are Lisbon time, which is what the function reads regardless of
// where the visitor is standing.
const tuesday = (hhmm: string) => new Date(`2026-08-11T${hhmm}:00+01:00`);
const sunday = (hhmm: string) => new Date(`2026-08-16T${hhmm}:00+01:00`);
const monday = (hhmm: string) => new Date(`2026-08-17T${hhmm}:00+01:00`);

// The three shapes real owners typed into this form during testing.
const REAL = {
  spanWithClosedDay: "Terça a domingo\n12:00–15:00 e 19:00–22:30\nEncerrado à segunda",
  prose: "Aberto todos os dias das 12h às 15h e das 19h às 23h. Segunda-feira fechado.",
  everyDay: "Todos os dias\n12:00–23:00",
};

describe("reading a schedule somebody actually typed", () => {
  it("knows it is open in the middle of lunch", () => {
    expect(openStateFor(REAL.spanWithClosedDay, tuesday("13:30"))).toEqual({
      open: true,
      closesAt: "15:00",
    });
  });

  it("knows it is shut between lunch and dinner, and when it comes back", () => {
    expect(openStateFor(REAL.spanWithClosedDay, tuesday("17:00"))).toEqual({
      open: false,
      opensAt: "19:00",
      opensDay: "today",
    });
  });

  it("says tomorrow after the kitchen closes", () => {
    expect(openStateFor(REAL.spanWithClosedDay, tuesday("23:10"))).toEqual({
      open: false,
      opensAt: "12:00",
      opensDay: "tomorrow",
    });
  });

  it("names the day when it is not tomorrow", () => {
    // Sunday night: shut Monday, back on Tuesday.
    expect(openStateFor(REAL.spanWithClosedDay, sunday("23:30"))).toMatchObject({
      open: false,
      opensDay: "terça-feira",
    });
  });

  it("is closed all day on the day the owner said it was closed", () => {
    expect(openStateFor(REAL.spanWithClosedDay, monday("13:00"))).toMatchObject({ open: false });
  });

  it("reads it written as a sentence, with 'h' instead of a colon", () => {
    expect(openStateFor(REAL.prose, tuesday("13:00"))).toEqual({ open: true, closesAt: "15:00" });
    expect(openStateFor(REAL.prose, monday("13:00"))).toMatchObject({ open: false });
  });

  it("reads a single unbroken range", () => {
    expect(openStateFor(REAL.everyDay, tuesday("22:00"))).toEqual({ open: true, closesAt: "23:00" });
  });
});

// The asymmetry this module is built around: a wrong "Fechado" is a customer who never
// calls, and nobody ever finds out. Saying nothing costs nothing - the hours are printed
// underneath either way.
describe("refuses rather than guesses", () => {
  it.each([
    ["no times at all", "Consulte-nos"],
    ["no day scope", "12:00–15:00"],
    ["a per-day schedule it cannot represent", "Segunda a sexta 12:00–15:00\nSábado a domingo 13:00–16:00"],
    ["hours that run past midnight", "Todos os dias 19:00–02:00"],
    ["something that is not a clock", "Todos os dias 12–99"],
    ["a closed sign only", "Encerrado para férias"],
    ["an empty schedule", ""],
  ])("says nothing for %s", (_why, schedule) => {
    expect(openStateFor(schedule, tuesday("13:00"))).toBeNull();
  });

  it("says nothing when every day was marked closed", () => {
    expect(openStateFor("Segunda a domingo. Encerrado.", tuesday("13:00"))).toBeNull();
  });
});

// O QUE DIZEMOS AO DONO SOBRE O QUE PERCEBEMOS
//
// O openStateFor recusa-se a adivinhar, e recusa-se com frequência - é o desenho. O que
// estava errado era a recusa ser invisível: o dono perdia o "Aberto agora" sem saber que
// existia. Isto é o que o formulário lhe mostra.
describe("readSchedule", () => {
  it("percebe o horário do exemplo, e diz que dias", () => {
    const leitura = readSchedule("Terça a domingo\n12:00–15:00 e 19:00–22:30\nEncerrado à segunda");

    expect(leitura.readable).toBe(true);
    expect(leitura.days).not.toContain("segunda-feira");
    expect(leitura.days).toContain("terça-feira");
    expect(leitura.days).toContain("domingo");
    expect(leitura.ranges).toEqual(["12:00–15:00", "19:00–22:30"]);
  });

  // O CASO QUE DEU ORIGEM A ISTO, E QUE ME DESMENTIU
  //
  // Na auditoria de fricção escrevi que este horário perdia o "Aberto agora". Estava
  // errado: eu tinha procurado o distintivo no HTML do servidor, e o OpenNow é um
  // componente de cliente, portanto nunca lá está. O parser percebe isto muito bem.
  //
  // O que ele não percebe é a EXCEPÇÃO. "Domingo só almoços" é descartado, e o domingo fica
  // marcado como fechado - ver o teste a seguir, que é o defeito a sério.
  it("percebe o horário que eu tinha dado como ilegível", () => {
    const leitura = readSchedule(
      "Terça a sábado das 12h às 15h e das 19h30 às 23h. Domingo só almoços. Segunda fechado."
    );

    expect(leitura.readable).toBe(true);
    expect(leitura.days).toEqual(["terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"]);
  });

  // O DEFEITO QUE A LISTA DE DIAS TORNA VISÍVEL
  //
  // O dono escreveu que abre ao domingo para almoços. O site diz a um cliente, ao domingo
  // à hora de almoço, que está fechado até terça-feira.
  //
  // É exactamente a falha que o cabeçalho deste módulo diz ser a pior: "a wrong Fechado is a
  // customer who does not call, and we never find out it happened". Não é uma recusa - é uma
  // afirmação confiante e errada.
  //
  // Este teste FIXA o comportamento actual para que a correcção o tenha de mudar de
  // propósito. Ver FRICCAO.md, F-11.
  it("DEFEITO CONHECIDO: uma excepção de meio dia é lida como dia fechado", () => {
    const horario = "Terça a sábado das 12h às 15h e das 19h30 às 23h. Domingo só almoços. Segunda fechado.";
    const domingoAoAlmoco = new Date("2026-08-16T12:00:00Z");

    const estado = openStateFor(horario, domingoAoAlmoco);

    expect(estado).toEqual({ open: false, opensAt: "12:00", opensDay: "terça-feira" });
    // O que devia acontecer é uma destas duas, e a decisão está por tomar: ou aberto, ou
    // silêncio. O que não pode continuar é "fechado até terça" a quem está à porta.
  });

  it("não inventa nada a partir de texto que não é um horário", () => {
    for (const texto of ["Ao almoço e ao jantar", "Consulte o Facebook", ""]) {
      expect(readSchedule(texto).readable, texto).toBe(false);
    }
  });

  it("o que devolve concorda sempre com o que o site vai fazer", () => {
    // A promessa do formulário - "o site vai poder dizer Aberto agora" - só vale se as duas
    // funções nunca discordarem. Um sim aqui e um null lá seria mentir ao dono no ecrã.
    const horarios = [
      "Terça a domingo 12:00-15:00",
      "Todos os dias das 9h às 18h",
      "Segunda a sexta 12h-15h e 19h-23h",
      "Terça a sábado das 12h às 15h. Domingo só almoços.",
      "Quando houver peixe",
    ];

    for (const horario of horarios) {
      const diz = readSchedule(horario).readable;
      // Domingo às 13:00, uma hora em que qualquer um destes que seja legível tem resposta.
      const faz = openStateFor(horario, new Date("2026-08-16T13:00:00Z")) !== null;
      expect(diz, horario).toBe(faz);
    }
  });
});
