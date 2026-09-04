import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const client = resolve(root, "dist/client");
const out = resolve(root, "out");

await rm(out, { recursive: true, force: true });
await cp(client, out, { recursive: true });
await Promise.all([
  cp(resolve(root, "app/icon.png"), resolve(out, "icon.png")),
  cp(resolve(root, "app/apple-icon.png"), resolve(out, "apple-icon.png")),
]);

const workerUrl = pathToFileURL(resolve(root, "dist/server/index.js"));
workerUrl.searchParams.set("azure-static-build", `${process.pid}-${Date.now()}`);
const { default: worker } = await import(workerUrl.href);
async function render(path, acceptLanguage) {
  const response = await worker.fetch(
  new Request(`https://gpu.aserdargun.com${path}`, {
    headers: { accept: "text/html", ...(acceptLanguage ? { "accept-language": acceptLanguage } : {}) },
  }),
  { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
  { waitUntil() {}, passThroughOnException() {} },
  );

  if (!response.ok) throw new Error(`Static render for ${path} failed with HTTP ${response.status}`);
  const html = await response.text();
  if (/localhost(?::\d+)?/i.test(html)) throw new Error(`Static render for ${path} contains a localhost production URL`);
  return html;
}

const [html, englishHtml] = await Promise.all([
  render("/"),
  render("/en/", "en-US,en;q=0.9"),
]);

await writeFile(resolve(out, "index.html"), html, "utf8");
await mkdir(resolve(out, "en"), { recursive: true });
await writeFile(resolve(out, "en/index.html"), englishHtml, "utf8");
await writeFile(
  resolve(out, "staticwebapp.config.json"),
  await readFile(resolve(root, "staticwebapp.config.json"), "utf8"),
  "utf8",
);

console.log(`Azure static artifact written to ${out}`);
