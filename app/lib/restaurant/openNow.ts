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

// null means "say nothing" - see the note at the top of this file. Every caller must render
// the schedule as written and no state at all when this returns null.
export function openStateFor(schedule: string, now: Date = new Date()): OpenState | null {
  const text = strip(schedule);

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
