import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function run(command, args) {
  console.log(`+ ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("npm", ["run", "stop:local"]);
run("npm", ["run", "lint"]);
run("npm", ["test"]);
run("npm", ["run", "verify:azure"]);
run("git", ["diff", "--check"]);
