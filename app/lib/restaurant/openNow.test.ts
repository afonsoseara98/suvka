import { describe, it, expect } from "vitest";
import { openStateFor } from "./openNow";

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
