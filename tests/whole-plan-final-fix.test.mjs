import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import typescript from "typescript";

const require = createRequire(import.meta.url);

async function render(url, acceptLanguage) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("whole-plan-final-fix", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(url, { headers: { accept: "text/html", ...(acceptLanguage ? { "accept-language": acceptLanguage } : {}) } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

async function loadCurriculumRegistry() {
  const source = await readFile(new URL("../app/atlas/curriculum-sources.ts", import.meta.url), "utf8");
  const compiled = typescript.transpileModule(source, {
    compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2022 },
    fileName: "curriculum-sources.ts",
  }).outputText;
  const compiledModule = { exports: {} };
  new Function("exports", "module", compiled)(compiledModule.exports, compiledModule);
  return compiledModule.exports;
}

async function loadTsxModule(component) {
  const source = await readFile(new URL(`../app/${component}.tsx`, import.meta.url), "utf8");
  const curriculumRegistry = await loadCurriculumRegistry();
  const localRequire = (specifier) => specifier === "./atlas/curriculum-sources" ? curriculumRegistry : require(specifier);
  const compiled = typescript.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: typescript.JsxEmit.ReactJSX,
      module: typescript.ModuleKind.CommonJS,
      target: typescript.ScriptTarget.ES2022,
    },
    fileName: `${component}.tsx`,
  }).outputText;
  const compiledModule = { exports: {} };
  new Function("exports", "module", "require", compiled)(compiledModule.exports, compiledModule, localRequire);
  return compiledModule.exports;
}

function tag(html, expression, message) {
  assert.match(html, expression, message);
}

function documentHead(html) {
  const head = html.match(/<head(?:\s[^>]*)?>[\s\S]*?<\/head>/i)?.[0];
  assert.ok(head, "rendered document must contain a real head element");
  return head;
}

test("bare root is Turkish while /en/ emits English document and social metadata inside head before hydration", async () => {
  const english = await render("https://gpu.aserdargun.com/en/", "tr-TR,tr;q=0.9");
  assert.equal(english.status, 200);
  assert.equal(english.headers.get("content-language"), "en-US");
  const html = await english.text();
  const head = documentHead(html);
  tag(html, /<html lang="en">/i, "/en/ must be English at SSR time");
  tag(head, /<title>GPU - GPU Kernel Engineering<\/title>/i);
  tag(head, /<meta name="description" content="A unified 12-week interactive learning atlas/i);
  tag(head, /<meta property="og:title" content="GPU - GPU Kernel Engineering"/i);
  tag(head, /<meta property="og:locale" content="en_US"/i);
  tag(head, /<meta property="og:locale:alternate" content="tr_TR"/i);
  tag(head, /<meta property="og:image" content="https:\/\/gpu\.aserdargun\.com\/og-en\.png"/i);
  tag(head, /<meta name="twitter:title" content="GPU - GPU Kernel Engineering"/i);
  tag(head, /<meta name="twitter:image" content="https:\/\/gpu\.aserdargun\.com\/og-en\.png"/i);
  tag(head, /<link rel="canonical" href="https:\/\/gpu\.aserdargun\.com\/en\/"/i);
  tag(head, /<link rel="alternate" hreflang="tr-TR" href="https:\/\/gpu\.aserdargun\.com\/"/i);
  tag(head, /<link rel="alternate" hreflang="en-US" href="https:\/\/gpu\.aserdargun\.com\/en\/"/i);
  assert.doesNotMatch(head, /GPU Kernel Mühendisliği|\/og\.png"|og:locale" content="tr_TR"/i);

  const tr = await render("https://gpu.aserdargun.com/");
  assert.equal(tr.headers.get("content-language"), "tr-TR");
  const trHtml = await tr.text();
  const trHead = documentHead(trHtml);
  tag(trHtml, /<html lang="tr">/i);
  tag(trHead, /<title>GPU - GPU Kernel Engineering<\/title>/i);
  tag(trHead, /<meta property="og:locale" content="tr_TR"/i);
  tag(trHead, /<meta property="og:image" content="https:\/\/gpu\.aserdargun\.com\/og\.png"/i);
  tag(trHead, /<link rel="canonical" href="https:\/\/gpu\.aserdargun\.com\/"/i);
  assert.doesNotMatch(trHead, /\/og-en\.png|og:locale" content="en_US"/i);
});

test("Azure output contains crawler-addressable localized root and /en artifacts", async () => {
  const [trHtml, enHtml] = await Promise.all([
    readFile(new URL("../out/index.html", import.meta.url), "utf8"),
    readFile(new URL("../out/en/index.html", import.meta.url), "utf8"),
  ]);
  const trHead = documentHead(trHtml);
  const enHead = documentHead(enHtml);
  tag(trHtml, /<html lang="tr">/i);
  tag(trHead, /<title>GPU - GPU Kernel Engineering<\/title>/i);
  tag(trHead, /rel="canonical" href="https:\/\/gpu\.aserdargun\.com\/"/i);
  assert.doesNotMatch(trHead, /\/og-en\.png/i);
  tag(enHtml, /<html lang="en">/i);
  tag(enHead, /<title>GPU - GPU Kernel Engineering<\/title>/i);
  tag(enHead, /\/og-en\.png/i);
  tag(enHead, /rel="canonical" href="https:\/\/gpu\.aserdargun\.com\/en\/"/i);
  assert.doesNotMatch(enHead, /GPU Kernel Mühendisliği|\/og\.png"/i);
});

test("legacy query locale is dynamic-worker compatibility and does not alter the static root artifact", async () => {
  const response = await render("https://gpu.aserdargun.com/?lang=en", "tr-TR,tr;q=0.9");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-language"), "en-US");
  const dynamicHtml = await response.text();
  const dynamicHead = documentHead(dynamicHtml);
  tag(dynamicHtml, /<html lang="en">/i);
  tag(dynamicHead, /<title>GPU - GPU Kernel Engineering<\/title>/i);

  const staticRoot = await readFile(new URL("../out/index.html", import.meta.url), "utf8");
  const staticHead = documentHead(staticRoot);
  tag(staticRoot, /<html lang="tr">/i);
  tag(staticHead, /<title>GPU - GPU Kernel Engineering<\/title>/i);
  assert.doesNotMatch(staticHead, /\/og-en\.png/i);
});

test("NCCL 2.31.2 Device API evidence is feature-granular and preserves exact compatibility boundaries", async () => {
  const { curriculumSources } = await loadCurriculumRegistry();
  const expected = {
    "nccl-device-lsa-multimem": ["current", "NCCL 2.31.2 Device API — LSA and Multimem Compatibility", "https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/usage/deviceapi.html"],
    "nccl-device-gin": ["current", "NCCL 2.31.2 Device API — GIN Recompile Boundary", "https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/usage/deviceapi.html"],
    "nccl-device-rust-bindings": ["preview", "NCCL 2.31.2 Experimental Rust Device API Bindings", "https://docs.nvidia.com/deeplearning/nccl/archives/nccl_2312/release-notes/rel_2-31-2.html"],
  };
  for (const [id, [maturity, title, url]] of Object.entries(expected)) {
    const source = curriculumSources.find((candidate) => candidate.id === id);
    assert.ok(source, `missing ${id}`);
    assert.deepEqual(
      [source.moduleId, source.maturity, source.verifiedAt, source.title, source.url],
      ["multigpu", maturity, "2026-08-29", title, url],
    );
  }

  for (const component of ["NcclMultiGpuEmbedded", "NcclMultiGpuEmbedded.en"]) {
    const loaded = await loadTsxModule(component);
    const features = loaded.NCCL_DEVICE_FEATURE_IDS.map((id) => loaded.getNcclDeviceFeature(id));
    assert.deepEqual(features.map(({ id }) => id), ["lsa-multimem", "gin", "rust-bindings"]);
    assert.deepEqual(features.map(({ sourceId, maturity }) => [sourceId, maturity]), [
      ["nccl-device-lsa-multimem", "current"],
      ["nccl-device-gin", "current"],
      ["nccl-device-rust-bindings", "preview"],
    ]);
    assert.match(features[0].compatibility, /backward|geriye/i);
    assert.match(features[1].compatibility, /recompil|yeniden derlen/i);
    assert.equal(features[2].coreCompletion, false);
    const markup = renderToStaticMarkup(React.createElement(loaded.default));
    for (const feature of features) {
      tag(markup, new RegExp(`data-source-id="${feature.sourceId}"[^>]*data-maturity="${feature.maturity}"`, "i"));
    }
    assert.doesNotMatch(markup, /Device API[^<]{0,80}(?:all|entire|tüm).*?(?:experimental|deneysel)/i);
  }
});

test("CUDA 13.3 and cuTile 1.5 visible claims resolve to their direct current records", async () => {
  const { curriculumSources } = await loadCurriculumRegistry();
  const expected = {
    "cuda-tile-nvcc-13-3": ["NVIDIA CUDA Compiler Driver 13.3 — Tile Compilation", "https://docs.nvidia.com/cuda/cuda-compiler-driver-nvcc/"],
    "cutile-python-1-5-release": ["cuTile Python 1.5.0 Release Notes", "https://docs.nvidia.com/cuda/cutile-python/generated/release_notes.html"],
  };
  for (const [id, [title, url]] of Object.entries(expected)) {
    const source = curriculumSources.find((candidate) => candidate.id === id);
    assert.ok(source, `missing ${id}`);
    assert.deepEqual([source.moduleId, source.maturity, source.verifiedAt, source.title, source.url], ["architecture", "current", "2026-08-29", title, url]);
  }
  const historical = curriculumSources.find(({ id }) => id === "cuda-tile");
  assert.ok(historical);
  assert.doesNotMatch(historical.title, /13\.3|1\.5/);
});

test("the NCCL hero contains no unqualified throughput figures", async () => {
  for (const component of ["NcclMultiGpuEmbedded", "NcclMultiGpuEmbedded.en"]) {
    const loaded = await loadTsxModule(component);
    const markup = renderToStaticMarkup(React.createElement(loaded.default));
    const hero = markup.match(/<section class="hero"[\s\S]*?<section class="section dark-section"/)?.[0] ?? "";
    assert.doesNotMatch(hero, /\b900\s*GB\/s\b|\b400\s*Gb\/s\b/i);
  }
});

function luminance(hex) {
  const channels = hex.match(/[\da-f]{2}/gi).map((value) => Number.parseInt(value, 16) / 255);
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground, background) {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

test("root/module reduced motion, glossary focus, and sidebar colors are deterministic accessibility contracts", async () => {
  const [globals, shell, cuda, inference, nccl, stack] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/atlas/atlas-shell.css", import.meta.url), "utf8"),
    readFile(new URL("../app/cuda-simt.css", import.meta.url), "utf8"),
    readFile(new URL("../app/inference-systems.css", import.meta.url), "utf8"),
    readFile(new URL("../app/nccl-multigpu.css", import.meta.url), "utf8"),
    readFile(new URL("../app/gpu-software-stack.css", import.meta.url), "utf8"),
  ]);
  tag(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?html\s*\{[^}]*scroll-behavior:\s*auto\s*!important/i);
  tag(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\*,\s*\*::before,\s*\*::after\s*\{[^}]*(?:animation:\s*none|animation-duration:\s*0s)[^}]*(?:transition:\s*none|transition-duration:\s*0s)/i);
  for (const [name, css] of [["CUDA", cuda], ["inference", inference], ["NCCL", nccl]]) {
    tag(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\*,\s*\*::before,\s*\*::after\s*\{[^}]*(?:animation:\s*none|animation-duration:\s*0s)[^}]*(?:transition:\s*none|transition-duration:\s*0s)/i, `${name} needs descendant suppression`);
  }
  tag(stack, /\.search-box input:focus-visible\s*\{[^}]*(?:outline|box-shadow)/i);
  assert.doesNotMatch(stack, /\.search-box input:focus-visible\s*\{[^}]*(?:outline:\s*none|box-shadow:\s*none)/i);

  const requiredPairs = [
    ["atlas-side-label", /\.atlas-side-label\s*\{[^}]*color:\s*(#[\da-f]{6})/i, "090e10"],
    ["atlas-side-foot small", /\.atlas-side-foot small\s*\{[^}]*color:\s*(#[\da-f]{6})/i, "090e10"],
    ["atlas search placeholder", /\.atlas-search input::placeholder\s*\{[^}]*color:\s*(#[\da-f]{6})/i, "0e1518"],
  ];
  for (const [name, expression, background] of requiredPairs) {
    const foreground = shell.match(expression)?.[1]?.slice(1);
    assert.ok(foreground, `missing exact ${name} color`);
    assert.ok(contrast(foreground, background) >= 4.5, `${name} contrast is ${contrast(foreground, background).toFixed(2)}:1`);
  }
});

test("laboratory storage helpers fail closed for malformed, non-finite, and denied operations", async () => {
  const storage = await import("../app/atlas/lab-storage.mjs");
  const values = new Map([
    ["progress", "{bad-json"],
    ["count", "Infinity"],
  ]);
  const writable = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  assert.deepEqual(storage.readStringArray(writable, "progress", new Set(["cpp-0"])), []);
  assert.equal(values.has("progress"), false, "malformed progress should be repaired");
  assert.equal(storage.readFiniteInteger(writable, "count", { fallback: 1, min: 0, max: 18 }), 1);
  assert.equal(values.has("count"), false, "non-finite progress should be repaired");

  const denied = {
    getItem: () => { throw new Error("denied get"); },
    setItem: () => { throw new Error("denied set"); },
    removeItem: () => { throw new Error("denied remove"); },
  };
  assert.deepEqual(storage.readStringArray(denied, "progress", new Set(["cpp-0"])), []);
  assert.equal(storage.readFiniteInteger(denied, "count", { fallback: 1, min: 0, max: 18 }), 1);
  assert.equal(storage.readText(denied, "note", ""), "");
  assert.equal(storage.writeText(denied, "note", "kept in state"), false);
  assert.equal(storage.writeJson(denied, "progress", ["cpp-0"]), false);

  const deniedOwner = Object.defineProperty({}, "localStorage", { get() { throw new Error("denied acquire"); } });
  assert.equal(storage.acquireStorage(deniedOwner), null);
});

test("README and curriculum registry use their canonical live and CuTe DSL URLs", async () => {
  const [readme, sources] = await Promise.all([
    readFile(new URL("../README.md", import.meta.url), "utf8"),
    readFile(new URL("../app/atlas/curriculum-sources.ts", import.meta.url), "utf8"),
  ]);
  tag(readme, /Live site:\s*\[gpu\.aserdargun\.com\]\(https:\/\/gpu\.aserdargun\.com\/\)/i);
  assert.doesNotMatch(readme, /gpu-kernel-engineering-atlas\.aserdargun\.chatgpt\.site/i);
  tag(sources, /https:\/\/docs\.nvidia\.com\/cutlass\/latest\/media\/docs\/pythonDSL\/cute_dsl\.html/);
  assert.doesNotMatch(sources, /https:\/\/docs\.nvidia\.com\/cutlass\/latest\/media\/docs\/cpp\/cute_dsl\.html/);
});
