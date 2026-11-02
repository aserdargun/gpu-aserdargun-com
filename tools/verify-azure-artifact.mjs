import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { verifyArtifactManifest } from "./artifact-contract.mjs";
import { inlineScriptHashes, scriptSourceTokens } from "./inline-script-hashes.mjs";

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

const [html, englishHtml, configText, favicon, appIcon, appleIcon, trCard, enCard, files] = await Promise.all([
  readFile(resolve(out, "index.html"), "utf8"),
  readFile(resolve(out, "en/index.html"), "utf8"),
  readFile(resolve(out, "staticwebapp.config.json"), "utf8"),
  readFile(resolve(out, "favicon.svg"), "utf8"),
  stat(resolve(out, "icon.png")),
  stat(resolve(out, "apple-icon.png")),
  stat(resolve(out, "og.png")),
  stat(resolve(out, "og-en.png")),
  filesUnder(resolve(out, "_next/static")),
]);

await verifyArtifactManifest(out);

// The published policy has to permit exactly the inline scripts the shipped
// pages carry, and nothing more. A policy that misses one of them leaves the
// browser refusing to hydrate the atlas, and a policy that names a script
// the pages no longer ship is a hole that outlived its reason.
const policy = JSON.parse(configText).globalHeaders["Content-Security-Policy"];
const tokens = scriptSourceTokens(policy);
const permitted = new Set(tokens.filter((token) => token.startsWith("'sha256-")));
const required = new Set([...inlineScriptHashes(html), ...inlineScriptHashes(englishHtml)]);
const missing = [...required].filter((hash) => !permitted.has(hash));
const stale = [...permitted].filter((hash) => !required.has(hash));
if (missing.length > 0) {
  throw new Error(`The published policy blocks ${missing.length} inline script(s) the shipped pages carry`);
}
if (stale.length > 0) {
  throw new Error(`The published policy permits ${stale.length} inline script(s) the shipped pages do not carry`);
}
if (tokens.includes("'unsafe-inline'")) {
  throw new Error("The published policy must not allow unsafe-inline scripts");
}

const checks = [
  [html.includes("GPU KERNEL ATLAS"), "identity"],
  [html.includes("Kernel’i yaz."), "Turkish shell"],
  [englishHtml.includes('<html lang="en">') && englishHtml.includes("Write the kernel."), "English static route"],
  [englishHtml.includes("GPU - GPU Kernel Engineering") && englishHtml.includes("/og-en.png"), "English metadata"],
  [html.includes("_next/static/chunks/"), "client chunks"],
  [!/localhost(?::\d+)?/i.test(html), "production URLs"],
  [favicon.includes("#c8ff36") && favicon.includes("#121310"), "favicon"],
  [appIcon.size > 1_000 && appleIcon.size > 1_000, "app icons"],
  [trCard.size > 100_000 && enCard.size > 100_000, "social cards"],
  [files.some((path) => path.endsWith(".js")), "JavaScript assets"],
  [files.some((path) => path.endsWith(".css")), "CSS assets"],
  [JSON.parse(configText).navigationFallback.rewrite === "/index.html", "SWA fallback"],
];

const failed = checks.filter(([passed]) => !passed).map(([, name]) => name);
if (failed.length > 0) throw new Error(`Azure artifact checks failed: ${failed.join(", ")}`);
console.log(`Azure artifact valid: ${files.length} versioned assets plus localized HTML, icons, and social cards`);
