// Build-time snapshot: scan all sources once and bake the result to public/data/jobs.json.
// GitHub Actions rebuilds this on a schedule (see .github/workflows/deploy.yml).
import { scanAll } from "../lib/sources.mjs";
import { mkdir, writeFile } from "node:fs/promises";

const data = await scanAll();
const dir = new URL("../public/data/", import.meta.url);
await mkdir(dir, { recursive: true });
await writeFile(new URL("jobs.json", dir), JSON.stringify(data));
console.log(`snapshot: ${data.jobs.length} jobs, ${data.sources.ok}/${data.sources.total} sources ok, ${data.read} postings read`);
