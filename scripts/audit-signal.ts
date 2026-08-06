import { BENCHMARK_BUSINESSES } from "../app/benchmark/businesses";
import { buildBusinessProfile } from "../app/ai/builders/BusinessProfileBuilder";
import { buildBusinessIntelligence } from "../app/ai/builders/BusinessIntelligence";
import { buildPipeline } from "../app/ai/builders/PipelineBuilder";

// SIGNAL AUDIT — permanent instrument. `npm run audit:signal`
//
// Every quality ceiling this project has hit so far turned out to be the same shape: a
// value that should differ between businesses does not differ enough, so whatever consumes
// it converges. Colour hit it (17 of 20 magenta). Design-family selection hit it (entropy
// 2.87 of 3.00 - effectively a lottery). This measures the whole chain in one pass so the
// next occurrence is found by running a command rather than by noticing it in a screenshot.
//
// It answers one question: WHERE does the signal die?
//
//   prompt text -> BusinessIntelligenceProfile -> StrategyDNA -> renderer
//
// If BI is well spread and DNA is not, the loss is in the DNA computation. If BI is
// already flat, the loss is upstream in the analysers themselves and fixing the DNA maths
// would achieve nothing. Those two diagnoses point at different files, so guessing between
// them is exactly the kind of expensive mistake this exists to prevent.

interface Stat {
  name: string;
  min: number;
  max: number;
  sd: number;
  distinct: number;
}

function describe(name: string, values: number[]): Stat {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sd = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
  return {
    name,
    min: Math.min(...values),
    max: Math.max(...values),
    sd,
    distinct: new Set(values.map((v) => v.toFixed(3))).size,
  };
}

function collect(rows: Record<string, number>[]): Stat[] {
  const keys = Object.keys(rows[0]).filter((k) => typeof rows[0][k] === "number");
  return keys.map((k) => describe(k, rows.map((r) => r[k]))).sort((a, b) => a.sd - b.sd);
}

// A sd below this means the axis cannot meaningfully separate two businesses: every
// consumer downstream sees what is effectively a constant.
const DEAD = 0.06;
const WEAK = 0.12;

function report(title: string, stats: Stat[]) {
  console.log(`\n=== ${title} ===`);
  console.log("axis".padEnd(30) + "min   max   range    sd   distinct");
  for (const s of stats) {
    const flag = s.sd < DEAD ? "  DEAD" : s.sd < WEAK ? "  weak" : "";
    console.log(
      s.name.padEnd(30) +
        s.min.toFixed(2).padStart(4) +
        s.max.toFixed(2).padStart(6) +
        (s.max - s.min).toFixed(2).padStart(7) +
        s.sd.toFixed(3).padStart(7) +
        String(s.distinct).padStart(8) +
        `/${BENCHMARK_BUSINESSES.length}` +
        flag
    );
  }
  const dead = stats.filter((s) => s.sd < DEAD).length;
  const weak = stats.filter((s) => s.sd >= DEAD && s.sd < WEAK).length;
  const meanSd = stats.reduce((a, s) => a + s.sd, 0) / stats.length;
  console.log(`  -> ${stats.length} axes | ${dead} dead | ${weak} weak | mean sd ${meanSd.toFixed(3)}`);
  return meanSd;
}

const biRows: Record<string, number>[] = [];
const dnaRows: Record<string, number>[] = [];

for (const business of BENCHMARK_BUSINESSES) {
  const profile = buildBusinessProfile(business.prompt);
  const bi = buildBusinessIntelligence(business.prompt, profile);
  const dna = buildPipeline(business.prompt).dna as unknown as Record<string, number>;

  const biNumeric: Record<string, number> = {};
  for (const [k, v] of Object.entries(bi)) if (typeof v === "number") biNumeric[k] = v;
  biRows.push(biNumeric);

  const dnaNumeric: Record<string, number> = {};
  for (const [k, v] of Object.entries(dna)) if (typeof v === "number") dnaNumeric[k] = v;
  dnaRows.push(dnaNumeric);
}

const biMean = report("STAGE 1 — BusinessIntelligenceProfile (input to the DNA)", collect(biRows));
const dnaMean = report("STAGE 2 — StrategyDNA (what the renderer consumes)", collect(dnaRows));

console.log("\n=== WHERE THE SIGNAL DIES ===");
console.log(`  mean sd, business intelligence : ${biMean.toFixed(3)}`);
console.log(`  mean sd, strategy DNA          : ${dnaMean.toFixed(3)}`);
const retained = (dnaMean / biMean) * 100;
console.log(`  variation retained             : ${retained.toFixed(0)}%`);
console.log(
  retained < 70
    ? "  -> the DNA computation is losing it: the analysers speak, the DNA muffles them."
    : "  -> the DNA is faithful; the analysers themselves are flat. Fixing DNA maths would change nothing."
);

// Averaging independent variables shrinks variance: for y = c + sum(w_i * x_i) with
// roughly independent x_i, sd(y) ~ sd(x) * sqrt(sum(w_i^2)), not sd(x) * sum(w_i). Four
// equally-weighted terms retain about half the spread; that is a property of the FORM of
// the expression, not of the quality of its inputs, which is what makes it worth testing
// separately from "are the signals any good".
console.log("\n=== control: variance retention predicted by averaging alone ===");
for (const terms of [2, 3, 4, 5]) {
  const weights = Array.from({ length: terms }, () => 1 / terms);
  const retention = Math.sqrt(weights.reduce((a, w) => a + w * w, 0)) * terms;
  console.log(`  ${terms} equally-weighted terms -> ${(retention * 100 / terms).toFixed(0)}% of a single term's sd`);
}

// ---------------------------------------------------------------------------------------
// WHY the analysers are flat: how often does a dimension fall back to the neutral default?
//
// scorePrimary = clamp01(prior + hits*HIT_WEIGHT), where prior falls back to NEUTRAL when
// the industry does not declare that dimension. So a value landing exactly on NEUTRAL means
// two things happened at once: no industry prior, and no lexicon hit anywhere in the text.
// That is the business contributing nothing at all to that axis.
const NEUTRAL = 0.5;
const PRIMARY_DIMENSIONS = Object.keys(biRows[0]);

let neutralCells = 0;
const perDimension: Record<string, number> = {};

for (const row of biRows) {
  for (const dim of PRIMARY_DIMENSIONS) {
    if (Math.abs(row[dim] - NEUTRAL) < 1e-9) {
      neutralCells++;
      perDimension[dim] = (perDimension[dim] ?? 0) + 1;
    }
  }
}

const totalCells = biRows.length * PRIMARY_DIMENSIONS.length;
console.log("\n=== how often the business says nothing at all ===");
console.log(`  cells landing exactly on NEUTRAL: ${neutralCells}/${totalCells} (${((neutralCells / totalCells) * 100).toFixed(0)}%)`);
for (const [dim, n] of Object.entries(perDimension).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${dim.padEnd(26)} ${String(n).padStart(2)}/${biRows.length} businesses`);
}

// ---------------------------------------------------------------------------------------
// The decisive question: can the analyser tell two businesses apart at all?
//
// The values are not defaulting (only ~4% land on NEUTRAL), so they ARE being set - just
// into a narrow band. That leaves one candidate cause: the industry prior is doing all the
// work and the text signal almost never fires, which would make BusinessIntelligence an
// industry lookup table wearing a float's clothing. If so, two businesses sharing an
// industry are literally indistinguishable downstream.
const industryOf = BENCHMARK_BUSINESSES.map((b) => buildBusinessProfile(b.prompt).industry);
const signature = (row: Record<string, number>) => PRIMARY_DIMENSIONS.map((d) => row[d].toFixed(4)).join(",");

const groups: Record<string, string[]> = {};
biRows.forEach((row, i) => {
  (groups[signature(row)] ??= []).push(BENCHMARK_BUSINESSES[i].id);
});

const collisions = Object.values(groups).filter((g) => g.length > 1);
console.log("\n=== can the analyser tell two businesses apart? ===");
console.log(`  distinct intelligence profiles: ${Object.keys(groups).length}/${biRows.length}`);
for (const group of collisions) console.log(`    IDENTICAL: ${group.join(", ")}`);

// How much of the final value is the industry prior, versus the text? Businesses sharing an
// industry should still differ if the text is contributing anything.
const byIndustry: Record<string, Set<string>> = {};
biRows.forEach((row, i) => {
  (byIndustry[industryOf[i]] ??= new Set()).add(signature(row));
});
console.log("\n  within-industry differentiation (distinct profiles / businesses):");
for (const [ind, sigs] of Object.entries(byIndustry)) {
  const n = industryOf.filter((x) => x === ind).length;
  if (n > 1) console.log(`    ${ind.padEnd(16)} ${sigs.size}/${n}${sigs.size === 1 ? "   <- the text changed nothing" : ""}`);
}
