import path from "path";
import { FileBenchmarkStore } from "./store";

// The one shared FileBenchmarkStore instance every benchmark API route uses - same
// "one place a store is constructed" discipline as app/lib/repos.ts for the Project
// persistence layer. `benchmark-results/` at the project root, gitignored (.gitignore).
export const benchmarkStore = new FileBenchmarkStore(path.join(process.cwd(), "benchmark-results"));
