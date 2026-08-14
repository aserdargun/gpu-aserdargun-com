import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "out");

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const groups = await Promise.all(entries.map(async (entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  }));
  return groups.flat();
}

const [html, configText, favicon, trCard, enCard, files] = await Promise.all([
  readFile(resolve(out, "index.html"), "utf8"),
  readFile(resolve(out, "staticwebapp.config.json"), "utf8"),
  readFile(resolve(out, "favicon.svg"), "utf8"),
  stat(resolve(out, "og.png")),
  stat(resolve(out, "og-en.png")),
  filesUnder(resolve(out, "_next/static")),
]);

const checks = [
  [html.includes("GPU KERNEL ATLAS"), "identity"],
  [html.includes("Kernel’i yaz."), "Turkish shell"],
  [html.includes("_next/static/chunks/"), "client chunks"],
  [!/localhost(?::\d+)?/i.test(html), "production URLs"],
  [favicon.includes("GPU Kernel Atlas cube favicon"), "favicon"],
  [trCard.size > 100_000 && enCard.size > 100_000, "social cards"],
  [files.some((path) => path.endsWith(".js")), "JavaScript assets"],
  [files.some((path) => path.endsWith(".css")), "CSS assets"],
  [JSON.parse(configText).navigationFallback.rewrite === "/index.html", "SWA fallback"],
];

const failed = checks.filter(([passed]) => !passed).map(([, name]) => name);
if (failed.length > 0) throw new Error(`Azure artifact checks failed: ${failed.join(", ")}`);
console.log(`Azure artifact valid: ${files.length} versioned assets plus HTML, favicon, and social cards`);
