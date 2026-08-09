import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders the production Kernel Atlas shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="tr">/i);
  assert.match(html, /<title>Kernel Atlas — GPU Kernel Engineering<\/title>/i);
  assert.match(html, /Kernel’i yaz\./);
  assert.match(html, /TR/);
  assert.match(html, /EN/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("ships complete Turkish and English i18n behavior", async () => {
  const [page, layout, readme] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
  ]);

  assert.match(page, /const trModules/);
  assert.match(page, /const enModules/);
  assert.match(page, /kernel-atlas-language/);
  assert.match(page, /navigator\.language/);
  assert.match(page, /url\.searchParams\.set\("lang", next\)/);
  assert.match(page, /document\.documentElement\.lang = locale/);
  assert.match(page, /toLocaleString\(locale === "tr" \? "tr-TR" : "en-US"\)/);
  assert.match(layout, /"tr-TR": "\/\?lang=tr"/);
  assert.match(layout, /"en-US": "\/\?lang=en"/);
  assert.match(readme, /Turkish and English UI/);
});
