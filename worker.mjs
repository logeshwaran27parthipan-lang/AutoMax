import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const workerPath = join(__dirname, "lib", "queue", "workflowWorker.ts");

const result = spawnSync("./node_modules/.bin/tsx", [workerPath], {
  stdio: "inherit",
  shell: false,
  env: process.env,
});

console.log("Worker exited with code:", result.status);
process.exit(result.status ?? 1);
