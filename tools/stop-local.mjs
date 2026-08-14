import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_PORT, stopOwnedListeners } from "./preview-control.mjs";

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

function option(name, fallback) {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
}

const port = Number(option("--port", DEFAULT_PORT));
const root = resolve(option("--root", defaultRoot));

process.exitCode = await stopOwnedListeners({ port, root });
