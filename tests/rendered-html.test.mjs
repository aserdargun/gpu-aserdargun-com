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

function architectureCard(html, id) {
  const card = html.match(new RegExp(`<article[^>]*data-testid="atlas-architecture-${id}"[^>]*>[\\s\\S]*?<\\/article>`));
  assert.ok(card, `missing rendered architecture card: ${id}`);
  return card[0];
}

function assertArchitectureAssociations(html, locale) {
  const labels = locale === "tr"
    ? { core: "Temel", current: "Güncel", preview: "Önizleme", caveat: "Önizleme içeriği, desteklenen araç zincirlerine bağlıdır." }
    : { core: "Core", current: "Current", preview: "Preview", caveat: "Preview content depends on supported toolchains." };
  const ada = architectureCard(html, "ada");
  const hopper = architectureCard(html, "hopper");
  const blackwell = architectureCard(html, "blackwell");
  const rubin = architectureCard(html, "rubin");

  assert.match(ada, new RegExp(`data-maturity="core"[\\s\\S]*>${labels.core}<[\\s\\S]*SM89 / core baseline`));
  assert.match(hopper, new RegExp(`data-maturity="current"[\\s\\S]*>${labels.current}<[\\s\\S]*SM90 / current`));
  assert.match(blackwell, new RegExp(`data-maturity="current"[\\s\\S]*>${labels.current}<[\\s\\S]*SM100 · SM120 / current`));
  assert.match(rubin, new RegExp(`data-maturity="preview"[\\s\\S]*>${labels.preview}<[\\s\\S]*SM107 / preview[\\s\\S]*${labels.caveat.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}`));
  assert.doesNotMatch(rubin, /freshness-badge current|data-maturity="current"|generally available|\bGA\b/i);
}

function extractFunctionBody(source, name) {
  const signature = source.indexOf(`function ${name}`);
  assert.ok(signature >= 0, `missing function ${name}`);
  const opening = source.indexOf("{", signature);
  assert.ok(opening >= 0, `missing body for ${name}`);
  let depth = 1;
  for (let index = opening + 1; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(opening + 1, index);
  }
  assert.fail(`unbalanced body for ${name}`);
}

test("extracts only a balanced function body", () => {
  const body = extractFunctionBody('const dead = () => "if (kind === \\"toolchain\\")"; function renderLab(kind) { if (kind === "memory") return null; }', "renderLab");
  assert.doesNotMatch(body, /toolchain/);
  assert.match(body, /kind === "memory"/);
});

test("server-renders the complete Turkish shell and metadata", async () => {
  const response = await render({ lang: "tr" });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.equal(response.headers.get("content-language"), "tr-TR");

  const html = await response.text();
  assert.match(html, /<html lang="tr">/i);
  assert.match(html, /<title>GPU Kernel Atlas — GPU Kernel Mühendisliği<\/title>/i);
  assert.match(html, /<b>GPU KERNEL ATLAS<\/b><small>GPU KERNEL MÜHENDİSLİĞİ<\/small>/);
  assert.match(html, /aria-label="GPU Kernel Atlas ana sayfa"/);
  assert.match(html, /<nav class="atlas-topnav" aria-label="Ana navigasyon"><a href="#roadmap">12 hafta<\/a><\/nav>/);
  assert.doesNotMatch(html, /<button[^>]*>Genel bakış<\/button>|<button[^>]*>Atlas<\/button>/);
  assert.match(html, /property="og:title" content="GPU Kernel Atlas — GPU Kernel Mühendisliği"/);
  assert.match(html, /name="twitter:title" content="GPU Kernel Atlas — GPU Kernel Mühendisliği"/);
  assert.match(html, /Kernel’i yaz\./);
  for (const label of ["Ada", "Hopper", "Blackwell", "Rubin", "SM89", "SM90", "SM100", "SM120", "SM107", "Temel", "Güncel", "Önizleme"]) {
    assert.match(html, new RegExp(label));
  }
  assertArchitectureAssociations(html, "tr");
  assert.doesNotMatch(html, /sm_89/);
  assert.match(html, /GPU KERNEL MÜHENDİSLİĞİ/);
  assert.match(html, /11 atlas · 12 hafta · Tek öğrenme sistemi/);
  assert.match(html, /\/og\.png/);
  assert.doesNotMatch(html, /\/og-en\.png/);
  assert.doesNotMatch(html, /Write the kernel\.|GPU KERNEL ENGINEERING<\/small>/);
  assert.match(html, /TR/);
  assert.match(html, /EN/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("server-renders one overview main and heading", async () => {
  const response = await render({ lang: "tr" });
  const html = await response.text();
  assert.equal(html.match(/<main\b/g)?.length, 1);
  assert.equal(html.match(/<h1\b/g)?.length, 1);
});

test("server-renders one English overview main and heading", async () => {
  const response = await render({ lang: "en", acceptLanguage: "en-US,en;q=0.9" });
  const html = await response.text();
  assert.equal(html.match(/<main\b/g)?.length, 1);
  assert.equal(html.match(/<h1\b/g)?.length, 1);
});

test("server-renders the complete English shell with request-aware production metadata", async () => {
  const response = await render({ lang: "en", acceptLanguage: "en-US,en;q=0.9" });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-language"), "en-US");

  const html = await response.text();
  assert.match(html, /<html lang="en">/i);
  assert.match(html, /<title>GPU Kernel Atlas — GPU Kernel Engineering<\/title>/i);
  assert.match(html, /<b>GPU KERNEL ATLAS<\/b><small>GPU KERNEL ENGINEERING<\/small>/);
  assert.match(html, /aria-label="GPU Kernel Atlas home"/);
  assert.match(html, /<nav class="atlas-topnav" aria-label="Main navigation"><a href="#roadmap">12 weeks<\/a><\/nav>/);
  assert.doesNotMatch(html, /<button[^>]*>Overview<\/button>|<button[^>]*>Atlas<\/button>/);
  assert.match(html, /property="og:title" content="GPU Kernel Atlas — GPU Kernel Engineering"/);
  assert.match(html, /name="twitter:title" content="GPU Kernel Atlas — GPU Kernel Engineering"/);
  assert.match(html, /Write the kernel\./);
  for (const label of ["Ada", "Hopper", "Blackwell", "Rubin", "SM89", "SM90", "SM100", "SM120", "SM107", "Core", "Current", "Preview"]) {
    assert.match(html, new RegExp(label));
  }
  assertArchitectureAssociations(html, "en");
  assert.doesNotMatch(html, /sm_89/);
  assert.match(html, /GPU KERNEL ENGINEERING/);
  assert.match(html, /11 atlases · 12 weeks · One learning system/);
  assert.match(html, /\/og-en\.png/);
  assert.doesNotMatch(html, /\/og\.png"/);
  assert.doesNotMatch(html, /Kernel’i yaz\./);
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

test("routes active lab content through renderLab and ModuleFrame", async () => {
  const atlas = await readFile(new URL("../app/kernel-atlas.tsx", import.meta.url), "utf8");
  assert.match(atlas, /const lab = active == null \? null : renderLab\(active\.id, locale\);/);
  assert.match(atlas, /active \? \(\s*<ModuleFrame[\s\S]*?\{lab == null \? \(/);
  assert.match(atlas, /\)\s*:\s*lab\}\s*<\/ModuleFrame>/);
  assert.match(atlas, /function renderLab\(kind: ModuleId, locale: Locale\)/);
  const renderLab = extractFunctionBody(atlas, "renderLab");
  for (const [kind, component] of [
    ["toolchain", "ToolchainLab"], ["architecture", "ArchitectureLab"], ["memory", "MemoryLab"],
    ["triton", "TritonLab"], ["operators", "OperatorsLab"], ["correctness", "CorrectnessLab"],
    ["profiling", "ProfilingLab"], ["cutlass", "CutlassLab"], ["inference", "InferenceLab"],
    ["multigpu", "MultiGpuLab"], ["systems", "SystemsLab"],
  ]) assert.match(renderLab, new RegExp(`if \\(kind === "${kind}"\\) return <${component} locale=\\{locale\\} />`));
});

test("wraps every active laboratory module with ModuleFrame", async () => {
  const atlas = await readFile(new URL("../app/kernel-atlas.tsx", import.meta.url), "utf8");
  assert.match(atlas, /import \{ ModuleFrame \} from "\.\/atlas\/ModuleFrame"/);
  assert.match(atlas, /active \? \(\s*<ModuleFrame[\s\S]*?<\/ModuleFrame>\s*\) : \(/);
});

test("ships locale-aware routing, metadata, accessibility, favicon, and social cards", async () => {
  const [atlas, registry, copy, state, shell, layout, metadata, proxy, readme, favicon, trCard, enCard] = await Promise.all([
    readFile(new URL("../app/kernel-atlas.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/atlas/module-registry.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/atlas/copy.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/atlas/state.mjs", import.meta.url), "utf8"),
    readFile(new URL("../app/atlas/AtlasShell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/locale-metadata.ts", import.meta.url), "utf8"),
    readFile(new URL("../proxy.ts", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
    readFile(new URL("../public/favicon.svg", import.meta.url), "utf8"),
    readFile(new URL("../public/og.png", import.meta.url)),
    readFile(new URL("../public/og-en.png", import.meta.url)),
  ]);

  assert.match(registry, /const trModules/);
  assert.match(registry, /const enModules/);
  assert.match(copy, /graph: "ÖĞRENME GRAFİĞİ", online: "ÇEVRİM İÇİ"/);
  assert.match(state, /kernel-atlas-language/);
  assert.match(atlas, /window\.location\.assign/);
  assert.match(atlas, /window\.location\.replace/);
  assert.match(atlas, /document\.documentElement\.lang/);
  assert.match(shell, /href="#atlas-content"/);
  assert.match(metadata, /tr-TR/);
  assert.match(metadata, /en-US/);
  assert.match(metadata, /og\.png/);
  assert.match(metadata, /og-en\.png/);
  assert.match(layout, /favicon\.svg/);
  assert.match(layout, /<html lang=\{locale\}>/);
  assert.match(proxy, /Content-Language/);
  assert.match(proxy, /return "tr"/);
  assert.match(readme, /Turkish and English UI/);
  assert.match(readme, /English at `\/en\/`/);
  assert.doesNotMatch(readme, /shareable `\?lang=/);
  assert.match(favicon, /<title[^>]*>GPU Kernel Atlas cube favicon<\/title>/);
  assert.match(favicon, /<desc[^>]*>Isometric cube with lime top, blue left, and orange right faces\.<\/desc>/);
  assert.match(favicon, /#121310/);
  assert.match(favicon, /#c8ff36/);
  assert.match(favicon, /#6a8dff/);
  assert.match(favicon, /#ff7043/);
  assert.equal(favicon.match(/<polygon\b/g)?.length, 3);

  for (const image of [trCard, enCard]) {
    assert.equal(image.subarray(1, 4).toString(), "PNG");
    assert.equal(image.readUInt32BE(16), 1731);
    assert.equal(image.readUInt32BE(20), 909);
  }
  assert.notDeepEqual(trCard, enCard);
});

test("rejects legacy global navigation labels regardless of JSX attribute order", async () => {
  const sources = await Promise.all(embeddedLabs.flatMap((name) => [
    readFile(new URL(`../app/${name}.tsx`, import.meta.url), "utf8"),
    readFile(new URL(`../app/${name}.en.tsx`, import.meta.url), "utf8"),
  ]));
  const legacyLabels = /^(?:Ana navigasyon|Main navigation|Ana gezinme)$/;
  const navigationLabel = (openingTag) => openingTag.match(/(?:^|[ \t\r\n])aria-label[ \t\r\n]*=[ \t\r\n]*(?:(["'])(.*?)\1|[{][ \t\r\n]*(["'])(.*?)\3[ \t\r\n]*[}])/);
  assert.equal(navigationLabel('<nav data-aria-label="Ana navigasyon">'), null);
  assert.equal(navigationLabel('<nav className="x" aria-label={\'Main navigation\'}>')?.[4], "Main navigation");
  for (const source of sources) {
    for (const openingTag of source.matchAll(/<nav\b[^>]*>/g)) {
      const ariaLabel = navigationLabel(openingTag[0]);
      const label = ariaLabel?.[2] ?? ariaLabel?.[4];
      assert.ok(!label || !legacyLabels.test(label), `legacy global nav label: ${label}`);
    }
  }
});

test("Task 6 renders the Azure-built bilingual roadmap, maturity policy, and preserved social-card contract", async () => {
  const [{ exports: registry }, metadata] = await Promise.all([
    (async () => {
      const source = await readFile(new URL("../app/atlas/module-registry.ts", import.meta.url), "utf8");
      const typescript = (await import("typescript")).default;
      const compiled = typescript.transpileModule(source, {
        compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2022 },
        fileName: "module-registry.ts",
      }).outputText;
      const compiledModule = { exports: {} };
      new Function("exports", "module", compiled)(compiledModule.exports, compiledModule);
      return compiledModule;
    })(),
    readFile(new URL("../app/locale-metadata.ts", import.meta.url), "utf8"),
  ]);

  assert.deepEqual(registry.MODULE_IDS, ["toolchain", "architecture", "memory", "triton", "operators", "correctness", "profiling", "cutlass", "inference", "multigpu", "systems"]);
  assert.match(metadata, /og\.png/);
  assert.match(metadata, /og-en\.png/);

  for (const [locale, expected] of Object.entries({
    tr: {
      hero: "On bir etkileşimli atlas, tile düzeyi programlama, Blackwell farkındalıklı optimizasyon ve dağıtık çıkarımı; desteklediğiniz mimari ve backend sınırlarını görünür kılan 12 haftalık kanıt rotasında birleştirir.",
      labels: ["Temel", "Güncel", "Önizleme"],
      caveat: "Önizleme: araç zinciri ya da donanım olgunlaşmasına bağlı keşif yoludur; mezuniyet koşulu değildir.",
      evidence: "Etkileşimli laboratuvarlar eğitim amaçlı simülasyonlardır; ölçülmüş donanım sonucu iddia etmez.",
      weekOne: "Yetenek ve ortam kanıtı",
      weekEleven: "Ayrıştırılmış çıkarım ve NCCL",
    },
    en: {
      hero: "Eleven interactive atlases connect tile-level programming, Blackwell-aware optimization, and distributed inference in a 12-week evidence route that makes your supported architecture and backend boundaries visible.",
      labels: ["Core", "Current", "Preview"],
      caveat: "Preview: an exploration path dependent on toolchain or hardware maturity; it is not a graduation requirement.",
      evidence: "Interactive laboratories are educational simulations; they do not claim measured hardware results.",
      weekOne: "Capability &amp; environment evidence",
      weekEleven: "Disaggregated inference &amp; NCCL",
    },
  })) {
    const response = await render({ lang: locale, acceptLanguage: locale === "tr" ? "tr-TR,tr;q=0.9" : "en-US,en;q=0.9" });
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, new RegExp(expected.hero.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(html, /CUDA’nın ilk warp’ından|from your first CUDA warp/i);
    const roadmap = html.match(/<section class="roadmap section-block" id="roadmap">([\s\S]*?)<\/section>/)?.[1] ?? "";
    assert.equal((roadmap.match(/<article>/g) ?? []).length, 12, `${locale} roadmap must render exactly twelve weeks`);
    assert.match(roadmap, new RegExp(expected.weekOne));
    assert.match(roadmap, new RegExp(expected.weekEleven));
    assert.match(roadmap, /Bitirme projesi ve portföy|Capstone &amp; portfolio/);
    const policy = html.match(/<section[^>]*data-testid="atlas-maturity-policy"[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? "";
    for (const label of expected.labels) assert.match(policy, new RegExp(`>${label}<`));
    assert.match(policy, new RegExp(expected.caveat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(policy, new RegExp(expected.evidence.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
