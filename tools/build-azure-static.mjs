import { cp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const client = resolve(root, "dist/client");
const out = resolve(root, "out");

await rm(out, { recursive: true, force: true });
await cp(client, out, { recursive: true });

const workerUrl = pathToFileURL(resolve(root, "dist/server/index.js"));
workerUrl.searchParams.set("azure-static-build", `${process.pid}-${Date.now()}`);
const { default: worker } = await import(workerUrl.href);
const response = await worker.fetch(
  new Request("https://gpu.aserdargun.com/?lang=tr", {
    headers: { accept: "text/html", "accept-language": "tr-TR,tr;q=0.9" },
  }),
  { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
  { waitUntil() {}, passThroughOnException() {} },
);

if (!response.ok) {
  throw new Error(`Static render failed with HTTP ${response.status}`);
}

const html = await response.text();
if (/localhost(?::\d+)?/i.test(html)) {
  throw new Error("Static render contains a localhost production URL");
}

await writeFile(resolve(out, "index.html"), html, "utf8");
await writeFile(
  resolve(out, "staticwebapp.config.json"),
  await readFile(resolve(root, "staticwebapp.config.json"), "utf8"),
  "utf8",
);

console.log(`Azure static artifact written to ${out}`);
