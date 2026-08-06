import type { GenerationRecord, ScoreRecord } from "./types";

// Deliberate deviation from this session's Prisma-repository pattern (see
// docs/ - Benchmark plan §A2): this is a one-off research exercise over 20 fixed
// businesses, not customer data - no multi-tenancy, no ownerId, and critically no
// dependency on the still-unconnected DATABASE_URL. Same interface-first discipline
// as app/lib/repositories/ though, so swapping to Prisma later touches one file.
export interface BenchmarkStore {
  saveGeneration(record: GenerationRecord): Promise<void>;
  listGenerations(businessId: string): Promise<GenerationRecord[]>;
  saveScore(record: ScoreRecord): Promise<void>;
  listScores(): Promise<ScoreRecord[]>;
}

interface BusinessFile {
  generations: GenerationRecord[];
  scores: ScoreRecord[];
}

function upsertGeneration(existing: GenerationRecord[], record: GenerationRecord): GenerationRecord[] {
  return [...existing.filter((g) => g.source !== record.source), record];
}

function upsertScore(existing: ScoreRecord[], record: ScoreRecord): ScoreRecord[] {
  return [
    ...existing.filter((s) => !(s.source === record.source && s.criterion === record.criterion)),
    record,
  ];
}

// In-memory - the test double, same role as app/lib/repositories/memory/*.ts's
// implementations play for the persistence layer.
export class InMemoryBenchmarkStore implements BenchmarkStore {
  private readonly files = new Map<string, BusinessFile>();

  private fileFor(businessId: string): BusinessFile {
    return this.files.get(businessId) ?? { generations: [], scores: [] };
  }

  async saveGeneration(record: GenerationRecord): Promise<void> {
    const file = this.fileFor(record.businessId);
    this.files.set(record.businessId, { ...file, generations: upsertGeneration(file.generations, record) });
  }

  async listGenerations(businessId: string): Promise<GenerationRecord[]> {
    return [...this.fileFor(businessId).generations];
  }

  async saveScore(record: ScoreRecord): Promise<void> {
    const file = this.fileFor(record.businessId);
    this.files.set(record.businessId, { ...file, scores: upsertScore(file.scores, record) });
  }

  async listScores(): Promise<ScoreRecord[]> {
    return Array.from(this.files.values()).flatMap((f) => f.scores);
  }
}

// File-backed - one JSON file per business under `dir` (default `benchmark-results/`,
// gitignored - real generated marketing copy for 20 businesses isn't something to
// commit), so a run can be inspected by hand and survives a server restart without
// needing Postgres connected.
export class FileBenchmarkStore implements BenchmarkStore {
  constructor(private readonly dir: string) {}

  private async fs() {
    // Dynamic import keeps this file safely importable from anywhere (Node-only APIs,
    // never bundled into client code) without every other module needing to know that.
    return import("fs/promises");
  }

  private async path() {
    return import("path");
  }

  private async filePath(businessId: string): Promise<string> {
    const path = await this.path();
    return path.join(this.dir, `${businessId}.json`);
  }

  private async readFile(businessId: string): Promise<BusinessFile> {
    const fs = await this.fs();
    try {
      const raw = await fs.readFile(await this.filePath(businessId), "utf-8");
      return JSON.parse(raw) as BusinessFile;
    } catch {
      return { generations: [], scores: [] };
    }
  }

  private async writeFile(businessId: string, data: BusinessFile): Promise<void> {
    const fs = await this.fs();
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(await this.filePath(businessId), JSON.stringify(data, null, 2), "utf-8");
  }

  async saveGeneration(record: GenerationRecord): Promise<void> {
    const data = await this.readFile(record.businessId);
    await this.writeFile(record.businessId, { ...data, generations: upsertGeneration(data.generations, record) });
  }

  async listGenerations(businessId: string): Promise<GenerationRecord[]> {
    return (await this.readFile(businessId)).generations;
  }

  async saveScore(record: ScoreRecord): Promise<void> {
    const data = await this.readFile(record.businessId);
    await this.writeFile(record.businessId, { ...data, scores: upsertScore(data.scores, record) });
  }

  async listScores(): Promise<ScoreRecord[]> {
    const fs = await this.fs();
    let entries: string[];
    try {
      entries = await fs.readdir(this.dir);
    } catch {
      return [];
    }

    const businessIds = entries.filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
    const files = await Promise.all(businessIds.map((id) => this.readFile(id)));
    return files.flatMap((f) => f.scores);
  }
}
