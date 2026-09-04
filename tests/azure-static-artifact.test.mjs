import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "out");

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  }));
  return nested.flat();
}

test("Azure artifact is a complete prebuilt static site", async () => {
  const [html, configText, favicon, appIcon, appleIcon, trCard, enCard, files] = await Promise.all([
    readFile(resolve(out, "index.html"), "utf8"),
    readFile(resolve(out, "staticwebapp.config.json"), "utf8"),
    readFile(resolve(out, "favicon.svg"), "utf8"),
    stat(resolve(out, "icon.png")),
    stat(resolve(out, "apple-icon.png")),
    stat(resolve(out, "og.png")),
    stat(resolve(out, "og-en.png")),
    filesUnder(resolve(out, "_next/static")),
  ]);

  assert.match(html, /<title>GPU - GPU Kernel Engineering<\/title>/i);
  assert.match(html, /GPU KERNEL ATLAS/);
  assert.match(html, /Kernel’i yaz\./);
  assert.match(html, /_next\/static\/chunks\//);
  assert.match(html, /href="\/icon\.png\?[^"]+"/);
  assert.match(html, /href="\/apple-icon\.png\?[^"]+"/);
  assert.doesNotMatch(html, /localhost(?::\d+)?/i);
  // brand family check: must be an SVG that uses the lime + dark brand colors
  assert.match(favicon, /<svg\b/);
  assert.match(favicon, /#c8ff36/);
  assert.match(favicon, /#121310/);
  assert.ok(appIcon.size > 1_000);
  assert.ok(appleIcon.size > 1_000);
  assert.ok(trCard.size > 100_000);
  assert.ok(enCard.size > 100_000);
  assert.ok(files.some((path) => path.endsWith(".js")));
  assert.ok(files.some((path) => path.endsWith(".css")));

  const config = JSON.parse(configText);
  assert.equal(config.navigationFallback.rewrite, "/index.html");
  assert.ok(config.navigationFallback.exclude.includes("/_next/*"));
});
