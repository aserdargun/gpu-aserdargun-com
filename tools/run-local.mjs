import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_PORT, stopOwnedListeners } from "./preview-control.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const stopResult = await stopOwnedListeners({ port: DEFAULT_PORT, root });
if (stopResult !== 0) process.exit(stopResult);

const child = spawn(
  "npm",
  ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", String(DEFAULT_PORT)],
  { cwd: root, stdio: "inherit" },
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (child.exitCode === null) child.kill(signal);
  });
}

child.once("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.once("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
