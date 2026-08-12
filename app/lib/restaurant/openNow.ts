// IS THIS RESTAURANT OPEN RIGHT NOW?
//
// The schedule is free text, because forcing an owner through fourteen time pickers is how
// you lose him at field six. So this reads what he wrote - and refuses, loudly and often,
// when it cannot be sure.
//
// The asymmetry that drives every decision here: a wrong "Fechado" is a customer who does
// not call, and we never find out it happened. A wrong "Aberto" is somebody driving to a
// closed door. Both are worse than showing no state at all, which costs nothing - the hours
// are still printed underneath exactly as the owner typed them.
//
// So this returns null for anything it does not recognise with certainty, and null is the
// expected outcome for a large share of real input. That is the design, not a gap in it.

export type OpenState =
  | { open: true; closesAt: string }
  | { open: false; opensAt: string; opensDay: "today" | "tomorrow" | string };

interface TimeRange {
  from: number; // minutes since midnight
  to: number;
}

// Accent-stripped so "terça" and "terca" are the same word, lowercase so "Todos" is too.
function strip(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// Index matches JavaScript's getDay(): 0 is Sunday.
const DAY_NAMES = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
const DAY_LABELS_PT = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

// "12:00-15:00", "12h as 15h", "12h30 as 15h", "12.00 ate 15.30", "19–22:30".
//
// Two details that both cost a test to find. The trailing `h?` is for an hour written with
// no minutes - "12h" - where the minutes group cannot match and would otherwise leave the
// "h" sitting exactly where the separator is expected. And the separators are ordered
// longest-first: regex alternation takes the first branch that matches, so a bare "a" ahead
// of "as" swallows half the word and the match dies on the next character.
const TIME_RANGE = /(\d{1,2})(?:[:h.](\d{2}))?\s*h?\s*(?:-|–|—|ate|até|as|à s|a)\s*(\d{1,2})(?:[:h.](\d{2}))?/g;

function minutes(hour: number, minute: number): number {
  return hour * 60 + minute;
}

function parseRanges(text: string): TimeRange[] {
  const ranges: TimeRange[] = [];

  for (const match of text.matchAll(TIME_RANGE)) {
    const fromHour = Number(match[1]);
    const fromMinute = Number(match[2] ?? 0);
    const toHour = Number(match[3]);
    const toMinute = Number(match[4] ?? 0);

    // A real clock. Anything else is a date, a price or a phone number that happened to sit
    // next to a dash, and reading it as a time is exactly the confident-but-wrong answer
    // this module exists to avoid.
    if (fromHour > 23 || toHour > 23 || fromMinute > 59 || toMinute > 59) return [];

    const from = minutes(fromHour, fromMinute);
    const to = minutes(toHour, toMinute);
    // Past midnight ("19:00-02:00") is real, and handling it correctly means reasoning about
    // which day the closing time belongs to. Out of scope; refuse rather than guess.
    if (to <= from) return [];

    ranges.push({ from, to });
  }

  return ranges.sort((a, b) => a.from - b.from);
}

// Which days the restaurant is open, as a 7-item boolean array, or null when the text does
// not say clearly enough.
function parseDays(text: string): boolean[] | null {
  const closed = new Set<number>();

  // "encerrado a segunda", "segunda-feira fechado", "fechado aos domingos". Matched within a
  // short window of the word so a day named elsewhere in the sentence is not swept up.
  for (const match of text.matchAll(/(encerrad\w*|fechad\w*)[^.]{0,20}?(domingo|segunda|terca|quarta|quinta|sexta|sabado)/g)) {
    closed.add(DAY_NAMES.indexOf(match[2]));
  }
  for (const match of text.matchAll(/(domingo|segunda|terca|quarta|quinta|sexta|sabado)[^.]{0,20}?(encerrad\w*|fechad\w*)/g)) {
    closed.add(DAY_NAMES.indexOf(match[1]));
  }

  const open = new Array<boolean>(7).fill(false);

  if (/todos os dias|diariamente|todo o dia/.test(text)) {
    open.fill(true);
  } else {
    // "terca a domingo", "de segunda a sexta".
    const span = text.match(/(domingo|segunda|terca|quarta|quinta|sexta|sabado)\s*(?:a|ate|até|-|–)\s*(domingo|segunda|terca|quarta|quinta|sexta|sabado)/);
    if (!span) return null;

    // Exactly one span. Two of them means a per-day schedule ("seg a sex ... sab a dom ...")
    // which this model cannot represent, and pretending otherwise would produce a confident
    // wrong answer on the days it got backwards.
    if (text.match(/(domingo|segunda|terca|quarta|quinta|sexta|sabado)\s*(?:a|ate|até|-|–)\s*(domingo|segunda|terca|quarta|quinta|sexta|sabado)/g)!.length > 1) {
      return null;
    }

    const first = DAY_NAMES.indexOf(span[1]);
    const last = DAY_NAMES.indexOf(span[2]);
    for (let i = 0, day = first; i < 7; i++, day = (day + 1) % 7) {
      open[day] = true;
      if (day === last) break;
    }
  }

  for (const day of closed) open[day] = false;
  return open.some(Boolean) ? open : null;
}

function clock(total: number): string {
  const hour = Math.floor(total / 60);
  const minute = total % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

// Reads the clock in Lisbon, not on the visitor's device. A Portuguese restaurant's opening
// hours are Portuguese hours, and somebody checking from London at 21:00 their time is
// asking about 21:00 in Aveiro.
function lisbonNow(now: Date): { day: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Lisbon",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  if (weekday < 0) throw new Error("Unrecognised weekday from Intl");

  return { day: weekday, minute: minutes(Number(get("hour")), Number(get("minute"))) };
}

// O QUE FICOU POR REPRESENTAR
//
// CONFIDENCE OR SILENCE. NEVER CONFIDENCE WITHOUT CERTAINTY.
//
// O parser lia "Terça a sábado ... Domingo só almoços. Segunda fechado." e produzia um
// horário de terça a sábado. O "só almoços" era deitado fora e o domingo ficava marcado
// como FECHADO — a um cliente que consultasse o site ao domingo à hora de almoço, com o
// restaurante cheio, dizia-se que abria terça-feira.
//
// Não era uma recusa. Era uma afirmação confiante e errada, que é a única coisa que o
// cabeçalho deste ficheiro diz que nunca pode acontecer: um "Fechado" errado é um cliente
// que não telefona, e ninguém dá por isso.
//
// A REGRA
//
// Toda a menção a um dia da semana tem de estar contabilizada — ou é uma das pontas do
// intervalo ("terça a sábado"), ou é uma declaração de encerramento ("segunda fechado").
// Uma menção que não seja nenhuma das duas é uma instrução que não sabemos representar, e
// a partir daí o módulo cala-se por completo.
//
// Deliberadamente conservador. Prefere calar-se de mais a acertar por sorte: o custo de não
// mostrar o distintivo é pequeno e visível; o custo de o mostrar errado é um cliente
// perdido que nunca ninguém contabiliza.
//
// O texto devolvido é o ORIGINAL, com acentos e maiúsculas como o dono os escreveu. Ele tem
// de reconhecer a sua própria frase para saber o que reescrever — e nunca lha reescrevemos.
function segmentsOf(schedule: string): string[] {
  return schedule
    .split(/[.;\n]+/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

const DAY_WORD = /(domingo|segunda|terca|quarta|quinta|sexta|sabado)/;
const CLOSED_WORD = /(encerrad\w*|fechad\w*)/;
const DAY_SPAN = /(domingo|segunda|terca|quarta|quinta|sexta|sabado)\s*(?:a|ate|até|-|–)\s*(domingo|segunda|terca|quarta|quinta|sexta|sabado)/;

function unrepresentedSegments(schedule: string): string[] {
  return segmentsOf(schedule).filter((segment) => {
    const text = strip(segment);
    // "todos os dias" e "diariamente" não nomeiam dia nenhum, portanto não caem aqui - e é
    // de propósito que NÃO há uma excepção para eles. "Todos os dias EXCEPTO domingo" nomeia
    // o domingo, e o "excepto" não é lido por ninguém: o dia ficava marcado como aberto, e
    // o site mandava alguém a uma porta fechada ao domingo. É o erro simétrico ao que isto
    // veio corrigir, e estava aqui desde sempre.
    if (!DAY_WORD.test(text)) return false;
    if (DAY_SPAN.test(text)) return false;
    if (CLOSED_WORD.test(text)) return false;
    return true;
  });
}

// O QUE PERCEBEMOS, PARA PODER SER DITO AO DONO
//
// Este módulo recusa-se a adivinhar, e recusa-se com frequência - é o desenho, não uma
// falha. Mas até aqui a recusa era invisível: o dono escrevia o horário como quem escreve
// um aviso à porta, o "Aberto agora" não aparecia, e ele não sabia que existia, portanto
// não sabia que o tinha perdido. É o sinal que responde à pergunta de maior intenção que há
// numa página de restaurante - "vou lá agora?" - e desaparecia em silêncio.
//
// Isto devolve o que foi entendido para o formulário o poder mostrar. Nunca para corrigir o
// texto dele: o horário que a página imprime é o que ele escreveu, sempre.
//
// Os dias vão em lista e não em intervalo ("terça, quarta e quinta", não "de terça a
// quinta") de propósito. O objectivo é ele reconhecer um erro nosso - ver lá "segunda"
// quando fecha à segunda - e uma lista mostra isso; um intervalo esconde-o.
export interface ScheduleReading {
  readable: boolean;
  days: string[];
  ranges: string[];
  // As frases exactas, como o dono as escreveu, que fizeram o módulo calar-se. Vazio quando
  // o horário foi lido por inteiro, e vazio também quando não se percebeu nada de nada -
  // aí não há uma frase a apontar, há um horário que não é um horário.
  unrepresented: string[];
}

export function readSchedule(schedule: string): ScheduleReading {
  const text = strip(schedule);
  const unrepresented = unrepresentedSegments(schedule);
  const ranges = parseRanges(text);
  const days = parseDays(text);

  if (ranges.length === 0 || !days) {
    // Uma frase por representar só se aponta quando o resto FOI entendido. Se nem os dias
    // nem as horas se leram, dizer "não percebemos esta linha" mandava o dono corrigir uma
    // linha quando o problema é o texto todo.
    return { readable: false, days: [], ranges: [], unrepresented: [] };
  }

  if (unrepresented.length > 0) {
    return {
      readable: false,
      days: [],
      ranges: [],
      unrepresented,
    };
  }

  return {
    readable: true,
    days: days.map((open, index) => (open ? DAY_LABELS_PT[index] : null)).filter((day): day is string => day !== null),
    ranges: ranges.map((range) => `${clock(range.from)}–${clock(range.to)}`),
    unrepresented: [],
  };
}

// null means "say nothing" - see the note at the top of this file. Every caller must render
// the schedule as written and no state at all when this returns null.
export function openStateFor(schedule: string, now: Date = new Date()): OpenState | null {
  const text = strip(schedule);

  // Silêncio à primeira instrução que não sabemos representar. É a mesma verificação que o
  // readSchedule faz, e tem de ser: o formulário promete ao dono que "o site vai poder dizer
  // Aberto agora", e as duas funções a discordarem seria mentir-lhe no ecrã.
  if (unrepresentedSegments(schedule).length > 0) return null;

  const ranges = parseRanges(text);
  if (ranges.length === 0) return null;

  const days = parseDays(text);
  if (!days) return null;

  const { day, minute } = lisbonNow(now);

  if (days[day]) {
    const current = ranges.find((range) => minute >= range.from && minute < range.to);
    if (current) return { open: true, closesAt: clock(current.to) };

    const laterToday = ranges.find((range) => range.from > minute);
    if (laterToday) return { open: false, opensAt: clock(laterToday.from), opensDay: "today" };
  }

  // Nothing left today. Walk forward to the next day that is open at all.
  for (let ahead = 1; ahead <= 7; ahead++) {
    const next = (day + ahead) % 7;
    if (!days[next]) continue;

    return {
      open: false,
      opensAt: clock(ranges[0].from),
      opensDay: ahead === 1 ? "tomorrow" : DAY_LABELS_PT[next],
    };
  }

  return null;
}
