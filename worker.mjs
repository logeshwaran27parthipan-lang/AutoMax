import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const workerPath = join(__dirname, "lib", "queue", "workflowWorker.ts");

const result = spawnSync("npx", ["tsx", workerPath], {
  stdio: "inherit",
  shell: true,
});

process.exit(result.status ?? 1);
