import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render({ lang = "tr", acceptLanguage = "tr-TR,tr;q=0.9" } = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost/?lang=${lang}`, { headers: { accept: "text/html", "accept-language": acceptLanguage } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders the production Kernel Atlas shell", async () => {
  const response = await render({ lang: "tr" });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.equal(response.headers.get("content-language"), "tr-TR");

  const html = await response.text();
  assert.match(html, /<html lang="tr">/i);
  assert.match(html, /<title>Kernel Atlas — GPU Kernel Engineering<\/title>/i);
  assert.match(html, /Kernel’i yaz\./);
  assert.match(html, /GPU KERNEL MÜHENDİSLİĞİ/);
  assert.match(html, /11 atlas · 12 hafta · Tek öğrenme sistemi/);
  assert.match(html, /\/og\.png/);
  assert.doesNotMatch(html, /Write the kernel\./);
  assert.match(html, /TR/);
  assert.match(html, /EN/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("server-renders a fully English page and metadata", async () => {
  const response = await render({ lang: "en", acceptLanguage: "en-US,en;q=0.9" });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-language"), "en-US");

  const html = await response.text();
  assert.match(html, /<html lang="en">/i);
  assert.match(html, /Write the kernel\./);
  assert.match(html, /GPU KERNEL ENGINEERING/);
  assert.match(html, /11 atlases · 12 weeks · One learning system/);
  assert.match(html, /\/og-en\.png/);
  assert.doesNotMatch(html, /Kernel’i yaz\.|GPU KERNEL MÜHENDİSLİĞİ/);
});

test("ships complete Turkish and English i18n behavior", async () => {
  const [page, atlas, layout, proxy, readme] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/kernel-atlas.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../proxy.ts", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
  ]);

  assert.match(atlas, /const trModules/);
  assert.match(atlas, /const enModules/);
  assert.match(atlas, /kernel-atlas-language/);
  assert.match(atlas, /url\.searchParams\.set\("lang", next\)/);
  assert.match(atlas, /document\.documentElement\.lang = locale/);
  assert.match(atlas, /toLocaleString\(locale === "tr" \? "tr-TR" : "en-US"\)/);
  assert.match(page, /"tr-TR": "\/\?lang=tr"/);
  assert.match(page, /"en-US": "\/\?lang=en"/);
  assert.match(page, /image: "\/og\.png"/);
  assert.match(page, /image: "\/og-en\.png"/);
  assert.match(layout, /x-kernel-atlas-locale/);
  assert.match(proxy, /Content-Language/);
  assert.match(proxy, /accept-language/);

  for (const marker of [
    "LAB / ARAÇ ZİNCİRİ",
    "LAB / ÇALIŞTIRMA GEOMETRİSİ",
    "LAB / BELLEK TRAFİĞİ",
    "LAB / ÖZEL OPERATÖR",
    "LAB / OPERATÖR DESENLERİ",
    "LAB / KANIT KAPISI",
    "LAB / ÖLÇÜM ZİNCİRİ",
    "LAB / GEMM KATMANLARI",
    "LAB / ÇIKARIM KALDIRAÇLARI",
    "LAB / KOLEKTİF MALİYETİ",
    "LAB / YAZILIM YIĞINI",
  ]) assert.match(atlas, new RegExp(marker));

  const turkishModules = atlas.slice(atlas.indexOf("const trModules"), atlas.indexOf("const enModules"));
  assert.doesNotMatch(turkishModules, /\b(?:Grid|Block|Lane|shared|coalescing|occupancy|Reduction|Attention|Reference|Tolerance|Benchmark|quantile|quantization)\b/);
  assert.match(readme, /Turkish and English UI/);
});
