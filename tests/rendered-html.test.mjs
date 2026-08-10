import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const embeddedLabs = [
  "KernelForgeEmbedded",
  "CudaSimtEmbedded",
  "GpuMemoryEmbedded",
  "PyTorchTritonEmbedded",
  "LlmKernelPatternsEmbedded",
  "KernelSafetyEmbedded",
  "NsightBenchmarkEmbedded",
  "CutlassCuteEmbedded",
  "InferenceSystemsEmbedded",
  "NcclMultiGpuEmbedded",
  "GpuSoftwareStackEmbedded",
];

async function render({ lang = "tr", acceptLanguage = "tr-TR,tr;q=0.9" } = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${lang}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost/?lang=${lang}`, { headers: { accept: "text/html", "accept-language": acceptLanguage } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the complete Turkish shell and metadata", async () => {
  const response = await render({ lang: "tr" });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.equal(response.headers.get("content-language"), "tr-TR");

  const html = await response.text();
  assert.match(html, /<html lang="tr">/i);
  assert.match(html, /<title>Kernel Atlas — GPU Kernel Mühendisliği<\/title>/i);
  assert.match(html, /Kernel’i yaz\./);
  assert.match(html, /GPU KERNEL MÜHENDİSLİĞİ/);
  assert.match(html, /11 atlas · 12 hafta · Tek öğrenme sistemi/);
  assert.match(html, /\/og\.png/);
  assert.doesNotMatch(html, /Write the kernel\.|GPU KERNEL ENGINEERING<\/small>/);
  assert.match(html, /TR/);
  assert.match(html, /EN/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("server-renders the complete English shell and metadata", async () => {
  const response = await render({ lang: "en", acceptLanguage: "en-US,en;q=0.9" });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-language"), "en-US");

  const html = await response.text();
  assert.match(html, /<html lang="en">/i);
  assert.match(html, /<title>Kernel Atlas — GPU Kernel Engineering<\/title>/i);
  assert.match(html, /Write the kernel\./);
  assert.match(html, /GPU KERNEL ENGINEERING/);
  assert.match(html, /11 atlases · 12 weeks · One learning system/);
  assert.match(html, /\/og-en\.png/);
  assert.doesNotMatch(html, /Kernel’i yaz\.|GPU KERNEL MÜHENDİSLİĞİ/);
});

test("wires every interactive lab to a separate Turkish and English experience", async () => {
  const atlas = await readFile(new URL("../app/kernel-atlas.tsx", import.meta.url), "utf8");
  const forbiddenEnglishUiInTurkish = /GPU MEMORY|INTERACTIVE LAB|INFERENCE SYSTEMS LAB|INTERACTIVE PRIMER|GPU SYSTEMS \/ FIELD GUIDE|GPU PERFORMANCE FIELD GUIDE|PYTORCH CUSTOM OP|MODÜL 02 · GLOBAL MEMORY|LEARNING GRAPH|INTERACTIVE WORKBENCH|ÜRETİM CHECKLIST|ETKİLEŞİMLİ GPU MENTAL MODELİ|MODEL RUNNER|<span>OUTPUT<\/span>/;
  const turkishResidueInEnglish = /[ÇĞİÖŞÜçğıöşü]|\b(?:kilit|başlangıç|temel|cevap|adım|referans|derleme|tarayıcı|çalışma|seçili|aktif|yollar|desteklenen|çıktı|simülasyonu|iskeleti|sayısı|ortalama|matrisi|hiyerarşik|gezinme|kullanılıyor|başarılı|açılış|kapanış|laboratuvar|doğruluk|öğrenme|kaynak|sınır|görev|hafta|entegrasyon|performans|optimizasyon|mezuniyet|uygulama|hakem|kopyala|soyutlama|hedef|senkronizasyon|koalesme|hipotezi|sabit|dinamik|ziyaret|desteklenmeyen|temeller|paralellik|dogruluk|sinav|rota|sozluk)\b|SHOO|HAZIR|WELDING TABLE|MUTAN TEKE/i;

  for (const name of embeddedLabs) {
    assert.match(atlas, new RegExp(`import ${name}En from "\\./${name}\\.en"`));
    assert.match(atlas, new RegExp(`locale === "tr" \\? <${name} \\/> : <${name}En \\/>`));

    const [turkish, english] = await Promise.all([
      readFile(new URL(`../app/${name}.tsx`, import.meta.url), "utf8"),
      readFile(new URL(`../app/${name}.en.tsx`, import.meta.url), "utf8"),
    ]);
    assert.doesNotMatch(turkish, forbiddenEnglishUiInTurkish, `${name} still contains a generic English UI label`);
    assert.doesNotMatch(english, turkishResidueInEnglish, `${name}.en still contains Turkish copy`);
  }
});

test("ships locale-aware routing, metadata, accessibility, and social cards", async () => {
  const [page, atlas, layout, proxy, readme, trCard, enCard] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/kernel-atlas.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../proxy.ts", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
    readFile(new URL("../public/og.png", import.meta.url)),
    readFile(new URL("../public/og-en.png", import.meta.url)),
  ]);

  assert.match(atlas, /const trModules/);
  assert.match(atlas, /const enModules/);
  assert.match(atlas, /graph: "ÖĞRENME GRAFİĞİ", online: "ÇEVRİM İÇİ"/);
  assert.match(atlas, /kernel-atlas-language/);
  assert.match(atlas, /router\.replace/);
  assert.match(page, /"tr-TR": "\/\?lang=tr"/);
  assert.match(page, /"en-US": "\/\?lang=en"/);
  assert.match(page, /image: "\/og\.png"/);
  assert.match(page, /image: "\/og-en\.png"/);
  assert.match(page, /icons: \{ icon: "\/favicon\.svg" \}/);
  assert.match(layout, /x-kernel-atlas-locale/);
  assert.match(proxy, /Content-Language/);
  assert.match(proxy, /accept-language/);
  assert.match(readme, /Turkish and English UI/);

  for (const image of [trCard, enCard]) {
    assert.equal(image.subarray(1, 4).toString(), "PNG");
    assert.equal(image.readUInt32BE(16), 1731);
    assert.equal(image.readUInt32BE(20), 909);
  }
  assert.notDeepEqual(trCard, enCard);
});
