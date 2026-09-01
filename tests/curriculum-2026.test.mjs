import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import typescript from "typescript";

const require = createRequire(import.meta.url);

const requiredPatterns = {
  KernelForgeEmbedded: { tr: ["environment manifest|ortam manifestosu", "capability record|yetenek kaydı"], en: ["environment manifest", "capability record"] },
  CudaSimtEmbedded: { tr: ["TMA", "tile|döşeme"], en: ["TMA", "tile"] },
  GpuMemoryEmbedded: { tr: ["tensor descriptor|tensör tanımlayıcı", "TMEM"], en: ["tensor descriptor", "TMEM"] },
  PyTorchTritonEmbedded: { tr: ["triton_op", "wrap_triton", "opcheck"], en: ["triton_op", "wrap_triton", "opcheck"] },
  LlmKernelPatternsEmbedded: { tr: ["grouped GEMM|gruplu GEMM", "FP4", "FP8"], en: ["grouped GEMM", "FP4", "FP8"] },
  KernelSafetyEmbedded: { tr: ["Tensor Memory|Tensör Belleği", "determin"], en: ["Tensor Memory", "determin"] },
  NsightBenchmarkEmbedded: { tr: ["report|rapor", "instruction mix|komut karışımı", "CUDA Graph"], en: ["report", "instruction mix", "CUDA Graph"] },
  CutlassCuteEmbedded: { tr: ["CUTLASS 4", "CuTe DSL", "Blackwell"], en: ["CUTLASS 4", "CuTe DSL", "Blackwell"] },
  InferenceSystemsEmbedded: { tr: ["disaggregated|ayrıştırılmış", "speculative|spekülatif", "MXFP"], en: ["disaggregated", "speculative", "MXFP"] },
  NcclMultiGpuEmbedded: { tr: ["Device API|Cihaz API", "symmetric|simetrik"], en: ["Device API", "symmetric"] },
  GpuSoftwareStackEmbedded: { tr: ["ROCm 10", "ROCprofiler-SDK", "CUDA Tile IR"], en: ["ROCm 10", "ROCprofiler-SDK", "CUDA Tile IR"] },
};

const expectedModuleIds = [
  "toolchain", "architecture", "memory", "triton", "operators", "correctness",
  "profiling", "cutlass", "inference", "multigpu", "systems",
];

const approvedHosts = new Set([
  "docs.nvidia.com",
  "developer.nvidia.com",
  "docs.pytorch.org",
  "triton-lang.org",
  "docs.vllm.ai",
  "rocm.docs.amd.com",
  "github.com",
  "mlir.llvm.org",
]);

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
  const storageHelpers = { acquireStorage: () => null, readStringArray: () => [], readFiniteInteger: (_storage, _key, options) => options.fallback, readText: (_storage, _key, fallback) => fallback, writeText: () => false, writeJson: () => false };
  const localRequire = (specifier) => specifier === "./atlas/curriculum-sources" ? curriculumRegistry : specifier === "./atlas/lab-storage.mjs" ? storageHelpers : require(specifier);
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
  return { exports: compiledModule.exports, source };
}

async function loadModuleRegistry() {
  const source = await readFile(new URL("../app/atlas/module-registry.ts", import.meta.url), "utf8");
  const compiled = typescript.transpileModule(source, {
    compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2022 },
    fileName: "module-registry.ts",
  }).outputText;
  const compiledModule = { exports: {} };
  new Function("exports", "module", compiled)(compiledModule.exports, compiledModule);
  return compiledModule.exports;
}

async function loadAtlasCopy() {
  const source = await readFile(new URL("../app/atlas/copy.ts", import.meta.url), "utf8");
  const compiled = typescript.transpileModule(source, {
    compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2022 },
    fileName: "copy.ts",
  }).outputText;
  const compiledModule = { exports: {} };
  new Function("exports", "module", compiled)(compiledModule.exports, compiledModule);
  return compiledModule.exports;
}

test("both locales carry the required 2026 concepts", async () => {
  for (const [component, patternsByLocale] of Object.entries(requiredPatterns)) {
    for (const [locale, suffix] of [["tr", ""], ["en", ".en"]]) {
      const source = await readFile(new URL(`../app/${component}${suffix}.tsx`, import.meta.url), "utf8");
      for (const pattern of patternsByLocale[locale]) {
        assert.match(source, new RegExp(pattern, "i"), `${component}${suffix} missing ${pattern}`);
      }
    }
  }
});

test("curriculum registry exposes only real approved first-party source entries", async () => {
  const { curriculumSources } = await loadCurriculumRegistry();
  assert.ok(Array.isArray(curriculumSources), "curriculumSources must be an array export");
  assert.ok(curriculumSources.length >= expectedModuleIds.length, "each module needs a source entry");

  const actualHosts = new Set();
  for (const source of curriculumSources) {
    assert.equal(typeof source.id, "string");
    assert.equal(typeof source.title, "string");
    assert.equal(source.verifiedAt, "2026-08-29");
    assert.ok(["core", "current", "preview"].includes(source.maturity), `${source.id} has an unsupported maturity`);
    const url = new URL(source.url);
    assert.equal(url.protocol, "https:", `${source.id} must use HTTPS`);
    assert.ok(approvedHosts.has(url.hostname), `${source.id} uses an unapproved source host: ${url.hostname}`);
    actualHosts.add(url.hostname);
  }
  assert.deepEqual(actualHosts, approvedHosts, "registry must exercise every approved technical source host");
});

test("every module resolves its own first-party sources through the typed registry", async () => {
  const { curriculumSources, getSourcesForModule } = await loadCurriculumRegistry();
  assert.equal(typeof getSourcesForModule, "function");

  for (const moduleId of expectedModuleIds) {
    const resolved = getSourcesForModule(moduleId);
    assert.ok(resolved.length > 0, `source registry missing ${moduleId}`);
    assert.ok(resolved.every((source) => source.moduleId === moduleId), `${moduleId} returned another module's source`);
    assert.ok(curriculumSources.some((source) => source.moduleId === moduleId), `registry has no real ${moduleId} entry`);
  }
});

test("preview topics and unsupported architecture paths stay explicit", async () => {
  const [copy, trMemory, enMemory, trCutlass, enCutlass, trNccl, enNccl] = await Promise.all([
    readFile(new URL("../app/atlas/copy.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/GpuMemoryEmbedded.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/GpuMemoryEmbedded.en.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/CutlassCuteEmbedded.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/CutlassCuteEmbedded.en.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/NcclMultiGpuEmbedded.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/NcclMultiGpuEmbedded.en.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(copy, /previewCaveat/);
  for (const source of [trMemory, enMemory]) assert.match(source, /disabled|aria-disabled/);
  for (const source of [trCutlass, trNccl]) assert.match(source, /Önizleme|Deneysel/i);
  for (const source of [enCutlass, enNccl]) assert.match(source, /Preview|Experimental/i);
});

test("Task 2 foundations capability artifact is bilingual and component-state-only", async () => {
  const [tr, en] = await Promise.all([
    loadTsxModule("KernelForgeEmbedded"),
    loadTsxModule("KernelForgeEmbedded.en"),
  ]);
  const expectedKeys = ["gpuModel", "computeCapability", "driver", "toolkit", "framework", "compilerFlags", "benchmarkCommand"];

  assert.deepEqual(tr.exports.CAPABILITY_FIELDS.map(({ key }) => key), expectedKeys);
  assert.deepEqual(en.exports.CAPABILITY_FIELDS.map(({ key }) => key), expectedKeys);
  assert.deepEqual(tr.exports.getCapabilityRecordStatus({}), { completed: 0, total: 7, ready: false });
  assert.deepEqual(en.exports.getCapabilityRecordStatus(Object.fromEntries(expectedKeys.map((key) => [key, "recorded"]))), {
    completed: 7,
    total: 7,
    ready: true,
  });
  assert.match(tr.source, /ortam manifestosu/i);
  assert.match(en.source, /environment manifest/i);
  for (const source of [tr.source, en.source]) {
    assert.match(source, /writeJson\(acquireStorage\(window\), "kernel-forge-progress", next\)/);
    assert.doesNotMatch(source, /write(?:Json|Text)[^\n]*(?:gpuModel|computeCapability|driver|toolkit|framework|compilerFlags|benchmarkCommand)/, "machine details must never be persisted");
  }
});

test("Task 2 CUDA bridge preserves SIMT and gates TMA to Hopper and newer", async () => {
  const [tr, en] = await Promise.all([
    loadTsxModule("CudaSimtEmbedded"),
    loadTsxModule("CudaSimtEmbedded.en"),
  ]);
  const expectedStages = ["thread", "warp", "tile", "mapping"];

  assert.deepEqual(tr.exports.CUDA_PROGRAMMING_BRIDGE.map(({ id }) => id), expectedStages);
  assert.deepEqual(en.exports.CUDA_PROGRAMMING_BRIDGE.map(({ id }) => id), expectedStages);
  for (const locale of [tr.exports, en.exports]) {
    assert.equal(locale.getCudaArchitectureSupport("ada").tma, false);
    assert.equal(locale.getCudaArchitectureSupport("hopper").tma, true);
    assert.equal(locale.getCudaArchitectureSupport("blackwell").tma, true);
    assert.equal(locale.CUDA_TILE_MATURITY.cudaTile, "current");
    assert.equal(locale.CUDA_TILE_MATURITY.cuTile, "current");
  }
  assert.match(tr.source, /SIMT(?:'nin|’nin)? yerini almaz|SIMT.*tamamlar/is);
  assert.match(en.source, /does not replace SIMT|complements SIMT/is);
  assert.match(tr.exports.getCudaArchitectureSupport("ada").reason, /Hopper|SM90/i);
  assert.match(en.exports.getCudaArchitectureSupport("ada").reason, /Hopper|SM90/i);
});

test("Task 2 memory architecture gate disables unsupported features with localized reasons", async () => {
  const [tr, en] = await Promise.all([
    loadTsxModule("GpuMemoryEmbedded"),
    loadTsxModule("GpuMemoryEmbedded.en"),
  ]);
  const expectedMatrix = {
    ada: [false, false, false, false],
    hopper: [true, true, true, false],
    blackwell: [true, true, true, true],
  };

  for (const locale of [tr.exports, en.exports]) {
    assert.deepEqual(locale.MEMORY_ARCHITECTURES.map(({ id }) => id), ["ada", "hopper", "blackwell"]);
    for (const [architecture, enabled] of Object.entries(expectedMatrix)) {
      const support = locale.getMemoryFeatureSupport(architecture);
      assert.deepEqual(support.map((feature) => feature.enabled), enabled, `${architecture} support matrix drifted`);
      for (const feature of support) {
        assert.equal(feature.enabled ? feature.reason : Boolean(feature.reason), feature.enabled ? null : true);
      }
    }
  }

  assert.match(tr.exports.getMemoryFeatureSupport("hopper").find(({ id }) => id === "tmem").reason, /Blackwell/i);
  assert.match(en.exports.getMemoryFeatureSupport("hopper").find(({ id }) => id === "tmem").reason, /Blackwell/i);
  assert.match(tr.source, /disabled=\{!feature\.enabled\}/);
  assert.match(en.source, /disabled=\{!feature\.enabled\}/);
  assert.match(tr.source, /aria-disabled=\{!feature\.enabled\}/);
  assert.match(en.source, /aria-disabled=\{!feature\.enabled\}/);
  assert.match(tr.source, /yazmaçların|paylaşılan belleğin/i);
  assert.match(en.source, /registers|shared memory/i);

  const trMarkup = renderToStaticMarkup(React.createElement(tr.exports.default));
  const enMarkup = renderToStaticMarkup(React.createElement(en.exports.default));
  for (const markup of [trMarkup, enMarkup]) {
    assert.equal((markup.match(/disabled=""/g) ?? []).length, 4, "Ada must expose four disabled architecture-specific controls");
    assert.equal((markup.match(/aria-disabled="true"/g) ?? []).length, 4, "Ada must expose aria-disabled for every unsupported control");
    assert.equal((markup.match(/aria-describedby=/g) ?? []).length, 4, "unsupported controls need programmatic reasons");
  }
  assert.match(trMarkup, /Bu seçim ölçülmüş veya simüle edilmiş bir donanım sonucu üretmez/i);
  assert.match(enMarkup, /does not produce a measured or simulated hardware result/i);
});

test("Task 2 registry preserves core concepts while adding current concepts in both locales", async () => {
  const { modulesByLocale } = await loadModuleRegistry();
  const byId = (locale, id) => modulesByLocale[locale].find((module) => module.id === id);

  for (const locale of ["tr", "en"]) {
    const foundations = byId(locale, "toolchain");
    const architecture = byId(locale, "architecture");
    const memory = byId(locale, "memory");
    const foundationText = [...foundations.concepts, ...foundations.tags, foundations.description].join(" ");
    const architectureText = [...architecture.concepts, ...architecture.tags, architecture.description].join(" ");
    const memoryText = [...memory.concepts, ...memory.tags, memory.description].join(" ");

    assert.match(foundationText, /reproduc|tekrarlanabilir/i);
    assert.match(foundationText, /capability|yetenek/i);
    assert.match(architectureText, /SIMT/i);
    assert.match(architectureText, /tile|döşeme/i);
    assert.match(architectureText, /TMA/i);
    assert.match(memoryText, /coalesc|birleşik/i);
    assert.match(memoryText, /bank/i);
    assert.match(memoryText, /occupancy|doluluk/i);
    assert.match(memoryText, /tensor descriptor|tensör tanımlayıcı/i);
    assert.match(memoryText, /DSMEM/i);
    assert.match(memoryText, /TMEM/i);
  }
});

test("Task 3 source records preserve the audit date and separate maturity from hardware applicability", async () => {
  const { curriculumSources } = await loadCurriculumRegistry();
  const byId = (id) => curriculumSources.find((source) => source.id === id);
  const expected = {
    "pytorch-triton-integration": ["triton", "current", "2026-08-29", "Using User-Defined Triton Kernels with torch.compile", "https://docs.pytorch.org/tutorials/recipes/torch_compile_user_defined_triton_kernel_tutorial.html"],
    "triton-gluon": ["triton", "preview", "2026-08-29", "Introduction to Gluon", "https://triton-lang.org/main/getting-started/tutorials/gluon/intro.html"],
    "triton-operator-tutorials": ["operators", "current", "2026-08-29", "Triton Operator Tutorials", "https://triton-lang.org/main/getting-started/tutorials/index.html"],
    "triton-block-scaled": ["operators", "current", "2026-08-29", "Block Scaled Matrix Multiplication", "https://triton-lang.org/main/getting-started/tutorials/10-block-scaled-matmul.html"],
    "vllm-paged-attention-design": ["operators", "current", "2026-08-29", "vLLM Paged Attention Design", "https://docs.vllm.ai/en/latest/design/paged_attention/"],
    "pytorch-sdpa-gqa": ["operators", "preview", "2026-08-29", "PyTorch scaled_dot_product_attention", "https://docs.pytorch.org/docs/main/generated/torch.nn.functional.scaled_dot_product_attention.html"],
    "compute-sanitizer-release": ["correctness", "current", "2026-08-29", "Compute Sanitizer Release Notes", "https://docs.nvidia.com/compute-sanitizer/ReleaseNotes/index.html"],
  };

  assert.deepEqual(curriculumSources.filter(({ id }) => Object.hasOwn(expected, id)).map(({ id }) => id), Object.keys(expected));
  for (const [id, [moduleId, maturity, verifiedAt, title, url]] of Object.entries(expected)) {
    const source = byId(id);
    assert.ok(source, `missing Task 3 source ${id}`);
    assert.equal(source.moduleId, moduleId);
    assert.equal(source.maturity, maturity);
    assert.equal(source.verifiedAt, verifiedAt);
    assert.equal(source.title, title);
    assert.equal(source.url, url);
  }
});

test("Task 3 PyTorch decision model separates integration, registration, and numerical acceptance", async () => {
  const [tr, en] = await Promise.all([
    loadTsxModule("PyTorchTritonEmbedded"),
    loadTsxModule("PyTorchTritonEmbedded.en"),
  ]);
  const decisionIds = ["composition", "plain-triton", "triton-op", "custom-op"];
  const acceptanceIds = ["dynamic-shape", "mutation-alias", "faketensor", "autograd", "aotinductor"];
  const autotuneIds = ["latency", "balanced", "throughput"];
  const expectedStatuses = {
    composition: ["covered", "not-applicable", "owned", "owned", "visible"],
    "plain-triton": ["required", "required", "not-applicable", "manual", "supported"],
    "triton-op": ["required", "required", "required", "required", "visible"],
    "custom-op": ["required", "required", "required", "required", "opaque"],
  };

  for (const locale of [tr, en]) {
    assert.deepEqual(locale.exports.PYTORCH_INTEGRATION_DECISIONS.map(({ id }) => id), decisionIds);
    assert.deepEqual(locale.exports.PYTORCH_ACCEPTANCE_ROWS.map(({ id }) => id), acceptanceIds);
    assert.deepEqual(locale.exports.TRITON_AUTOTUNE_CONFIGS.map(({ id }) => id), autotuneIds);
    assert.equal(locale.exports.TRITON_GLUON_PREVIEW.sourceId, "triton-gluon");
    assert.equal(locale.exports.TRITON_GLUON_PREVIEW.maturity, "preview");
    for (const [branch, statuses] of Object.entries(expectedStatuses)) {
      const plan = locale.exports.getPyTorchExecutionPlan(branch, "throughput");
      assert.equal(plan.branch, branch);
      assert.deepEqual(plan.acceptance.map(({ status }) => status), statuses);
      assert.equal(plan.boundaries.opcheck === "registration", branch === "triton-op" || branch === "custom-op");
      assert.equal(plan.boundaries.numerical, "separate");
      assert.equal(plan.boundaries.gradient, "separate");
    }
    const composition = locale.exports.getPyTorchExecutionPlan("composition", "throughput");
    const plain = locale.exports.getPyTorchExecutionPlan("plain-triton", "throughput");
    const tritonOp = locale.exports.getPyTorchExecutionPlan("triton-op", "throughput");
    const customOp = locale.exports.getPyTorchExecutionPlan("custom-op", "throughput");
    assert.match(composition.code, /return x \+ y/);
    assert.doesNotMatch(composition.code, /custom_op|triton/i);
    assert.match(plain.code, /add_kernel\[grid\]/);
    assert.doesNotMatch(plain.code, /torch\.library/);
    assert.match(plain.boundaries.compile, /AOTInductor/i);
    assert.match(plain.boundaries.compile, /supported|uygundur/i);
    assert.match(plain.boundaries.compile, /triton_op \+ wrap_triton/i);
    assert.match(plain.boundaries.compile, /subsystem|alt sistem/i);
    assert.match(plain.acceptance.at(-1).statusLabel, /AOTInductor/i);
    assert.match(plain.acceptance.at(-1).statusLabel, /supported|uygun/i);
    assert.match(tritonOp.code, /torch\.library\.triton_op/);
    assert.match(tritonOp.code, /torch\.library\.wrap_triton/);
    assert.match(customOp.code, /torch\.library\.custom_op/);
    assert.match(customOp.boundaries.compile, /opaque|opak/i);
    assert.match(plain.code, /BLOCK_SIZE=512/);
    assert.match(tritonOp.code, /BLOCK_SIZE=512/);
    assert.match(locale.exports.getPyTorchExecutionPlan("triton-op", "latency").code, /BLOCK_SIZE=128/);
    assert.notEqual(locale.exports.getPyTorchExecutionPlan("triton-op", "latency").configEffect, tritonOp.configEffect);
  }

  const trMarkup = renderToStaticMarkup(React.createElement(tr.exports.default));
  const enMarkup = renderToStaticMarkup(React.createElement(en.exports.default));
  assert.match(trMarkup, /Yerleşik PyTorch bileşimi[\s\S]*Düz Triton[\s\S]*torch\.library\.triton_op[\s\S]*wrap_triton[\s\S]*custom_op/i);
  assert.match(enMarkup, /Built-in PyTorch composition[\s\S]*Plain Triton[\s\S]*torch\.library\.triton_op[\s\S]*wrap_triton[\s\S]*custom_op/i);
  for (const markup of [trMarkup, enMarkup]) {
    assert.match(markup, /opcheck/i);
    assert.match(markup, /numerical|sayısal/i);
    assert.match(markup, /gradient|gradyan/i);
    assert.match(markup, /dynamic shape|dinamik şekil/i);
    assert.match(markup, /mutation|mutasyon/i);
    assert.match(markup, /FakeTensor/i);
    assert.match(markup, /AOTInductor/i);
    assert.match(markup, /data-source-id="triton-gluon"/i);
  }
  assert.match(trMarkup, /Önizleme/);
  assert.match(enMarkup, /Preview/);
});

test("Task 3 operators keep official tutorials current while gating hardware applicability", async () => {
  const [tr, en] = await Promise.all([
    loadTsxModule("LlmKernelPatternsEmbedded"),
    loadTsxModule("LlmKernelPatternsEmbedded.en"),
  ]);
  const topicIds = ["gemm", "reduction", "softmax", "normalization", "attention", "grouped", "precision"];
  const expectedSupport = {
    ada: [true, true, false],
    hopper: [true, true, false],
    blackwell: [true, true, true],
  };

  for (const locale of [tr, en]) {
    assert.deepEqual(locale.exports.LLM_TOPIC_IDS, topicIds);
    assert.equal(locale.exports.BLOCK_SCALED_TUTORIAL.sourceId, "triton-block-scaled");
    assert.equal(locale.exports.BLOCK_SCALED_TUTORIAL.maturity, "current");
    assert.deepEqual(locale.exports.PAGED_ATTENTION_SOURCE, { sourceId: "vllm-paged-attention-design", maturity: "current" });
    assert.deepEqual(locale.exports.GQA_SOURCE, { sourceId: "pytorch-sdpa-gqa", maturity: "preview" });
    for (const [architecture, enabled] of Object.entries(expectedSupport)) {
      const support = locale.exports.getOperatorArchitectureSupport(architecture);
      assert.deepEqual(support.map(({ enabled }) => enabled), enabled);
      assert.deepEqual(support.map(({ maturity }) => maturity), ["current", "current", "current"]);
    }
  }

  const trMarkup = renderToStaticMarkup(React.createElement(tr.exports.default));
  const enMarkup = renderToStaticMarkup(React.createElement(en.exports.default));
  for (const markup of [trMarkup, enMarkup]) {
    assert.match(markup, /grouped GEMM/i);
    assert.match(markup, /MoE/i);
    assert.match(markup, /persistent matmul/i);
    assert.match(markup, /FP4/i);
    assert.match(markup, /FP8/i);
    assert.match(markup, /scale metadata|ölçek metaverisi/i);
    assert.match(markup, /accumulation|birikim/i);
    assert.match(markup, /paged/i);
    assert.match(markup, /GQA/i);
    assert.match(markup, /data-source-id="triton-block-scaled"/i);
    assert.match(markup, /data-source-id="triton-operator-tutorials"/i);
    assert.match(markup, /data-source-id="vllm-paged-attention-design"/i);
    assert.match(markup, /data-source-id="pytorch-sdpa-gqa"/i);
    assert.match(markup, /vLLM Paged Attention Design/);
    assert.match(markup, /PyTorch scaled_dot_product_attention/);
    assert.match(markup, /historical design overview|tarihsel tasarım özeti/i);
    assert.match(markup, /does not describe current code|güncel kodu açıklamaz/i);
    assert.match(markup, /enable_gqa=True/);
    assert.match(markup, /experimental feature|deneysel özellik/i);
    assert.match(markup, /Hq % Hkv == 0/);
    assert.match(markup, /current|güncel/i);
    assert.match(markup, /hardware applicability|donanım uygulanabilirliği/i);
    const tritonScope = markup.match(/<aside class="operator-current-scope"[^>]*data-source-id="triton-operator-tutorials"[^>]*>([\s\S]*?)<\/aside>/i)?.[1];
    assert.ok(tritonScope, "Triton operator tutorial source container must render");
    assert.match(tritonScope, /grouped GEMM|Gruplu GEMM/i);
    assert.match(tritonScope, /persistent matmul/i);
    assert.match(tritonScope, /block-scaled/i);
    assert.doesNotMatch(tritonScope, /paged|GQA/i, "paged attention and GQA belong only to their direct source cards");

    const pagedCard = markup.match(/<article data-source-id="vllm-paged-attention-design" data-maturity="current">([\s\S]*?)<\/article>/i)?.[1];
    const gqaCard = markup.match(/<article data-source-id="pytorch-sdpa-gqa" data-maturity="preview">([\s\S]*?)<\/article>/i)?.[1];
    assert.ok(pagedCard, "paged attention must remain Current under the direct vLLM source");
    assert.ok(gqaCard, "GQA must render Preview under the direct PyTorch source");
    assert.match(pagedCard, />Current<|>Güncel</i);
    assert.match(gqaCard, />Preview<|>Önizleme</i);
    assert.match(gqaCard, /API page is current|API sayfası günceldir/i);
    assert.match(gqaCard, /not a core completion requirement|temel tamamlanma koşulu değildir/i);
  }
});

test("Task 3 correctness classifies determinism, mutation, Python backtraces, and TMEM gates", async () => {
  const [tr, en] = await Promise.all([
    loadTsxModule("KernelSafetyEmbedded"),
    loadTsxModule("KernelSafetyEmbedded.en"),
  ]);
  const classIds = ["deterministic", "nondeterministic", "mutation-alias"];

  for (const locale of [tr, en]) {
    assert.deepEqual(locale.exports.CORRECTNESS_ACCEPTANCE_CLASSES.map(({ id }) => id), classIds);
    assert.equal(locale.exports.getCorrectnessArchitectureSupport("ada").tmemGuardrails, false);
    assert.equal(locale.exports.getCorrectnessArchitectureSupport("hopper").tmemGuardrails, false);
    assert.equal(locale.exports.getCorrectnessArchitectureSupport("blackwell").tmemGuardrails, true);
    assert.equal(
      locale.exports.buildSanitizerCommand("memcheck", true, true),
      "compute-sanitizer --tool memcheck --show-backtrace yes --error-exitcode 99 ./build/kernel_tests",
    );
    assert.equal(
      locale.exports.buildSanitizerCommand("racecheck", false, false),
      "compute-sanitizer --tool racecheck ./build/kernel_tests",
    );
  }

  const trMarkup = renderToStaticMarkup(React.createElement(tr.exports.default));
  const enMarkup = renderToStaticMarkup(React.createElement(en.exports.default));
  for (const markup of [trMarkup, enMarkup]) {
    assert.match(markup, /Tensor Memory/i);
    assert.match(markup, /-g-tmem-access-check/i);
    assert.match(markup, /Python/i);
    assert.match(markup, /host backtrace|ana makine çağrı yığını/i);
    assert.match(markup, /deterministic|deterministik/i);
    assert.match(markup, /nondeterministic|nondeterministik/i);
    assert.match(markup, /mutation|mutasyon/i);
    assert.match(markup, /alias/i);
  }
});

test("Task 3 registry preserves old operator and correctness concepts in both locales", async () => {
  const { modulesByLocale } = await loadModuleRegistry();
  const byId = (locale, id) => modulesByLocale[locale].find((module) => module.id === id);

  for (const locale of ["tr", "en"]) {
    const triton = byId(locale, "triton");
    const operators = byId(locale, "operators");
    const correctness = byId(locale, "correctness");
    const tritonText = [...triton.concepts, ...triton.tags, triton.description, triton.outcome].join(" ");
    const operatorText = [...operators.concepts, ...operators.tags, operators.description, operators.outcome].join(" ");
    const correctnessText = [...correctness.concepts, ...correctness.tags, correctness.description, correctness.outcome].join(" ");

    assert.match(tritonText, /torch\.library/i);
    assert.match(tritonText, /mask/i);
    assert.match(tritonText, /autograd|otomatik türev/i);
    assert.match(tritonText, /triton_op/i);
    assert.match(tritonText, /autotune/i);
    assert.match(operatorText, /GEMM/i);
    assert.match(operatorText, /reduction|indirgeme/i);
    assert.match(operatorText, /softmax/i);
    assert.match(operatorText, /attention|dikkat/i);
    assert.match(operatorText, /grouped|gruplu/i);
    assert.match(operatorText, /FP4/i);
    assert.match(operatorText, /FP8/i);
    assert.match(correctnessText, /rtol/i);
    assert.match(correctnessText, /memcheck/i);
    assert.match(correctnessText, /racecheck/i);
    assert.match(correctnessText, /TMEM|Tensor Memory/i);
    assert.match(correctnessText, /determin/i);
  }
});

test("Task 4 Nsight workflows expose five evidence states and a reproducible report-artifact record", async () => {
  const [tr, en, { curriculumSources }] = await Promise.all([
    loadTsxModule("NsightBenchmarkEmbedded"),
    loadTsxModule("NsightBenchmarkEmbedded.en"),
    loadCurriculumRegistry(),
  ]);
  const expectedSources = {
    "nsight-compute-2026-release": ["profiling", "current", "2026-08-29", "Nsight Compute Release Notes", "https://docs.nvidia.com/nsight-compute/ReleaseNotes/"],
  };
  const expectedWorkflowIds = ["report-merge", "clustering", "instruction-mix", "scoreboard", "graph-node"];
  const expectedArtifactFields = ["gpu", "driver", "cuda", "nsysVersion", "ncuVersion"];

  for (const [id, [moduleId, maturity, verifiedAt, title, url]] of Object.entries(expectedSources)) {
    const source = curriculumSources.find((entry) => entry.id === id);
    assert.ok(source, `missing Task 4 source ${id}`);
    assert.equal(source.moduleId, moduleId);
    assert.equal(source.maturity, maturity);
    assert.equal(source.verifiedAt, verifiedAt);
    assert.equal(source.title, title);
    assert.equal(source.url, url);
  }

  for (const locale of [tr, en]) {
    assert.deepEqual(locale.exports.NSIGHT_WORKFLOW_IDS, expectedWorkflowIds);
    assert.deepEqual(locale.exports.NSIGHT_REPORT_ARTIFACT_FIELDS, expectedArtifactFields);
    const artifact = locale.exports.getNsightReportArtifactRecord();
    assert.deepEqual(Object.keys(artifact), expectedArtifactFields);
    assert.match(artifact.nsysVersion, /nsys/i);
    assert.match(artifact.ncuVersion, /ncu/i);
    for (const id of expectedWorkflowIds) {
      const workflow = locale.exports.getNsightWorkflowEvidence(id);
      assert.equal(workflow.id, id);
      assert.equal(workflow.sourceId, "nsight-compute-2026-release");
      assert.equal(workflow.maturity, "current");
      assert.ok(workflow.evidence.length > 40, `${id} needs a non-decorative evidence explanation`);
    }
  }

  const [trMarkup, enMarkup] = [
    renderToStaticMarkup(React.createElement(tr.exports.default)),
    renderToStaticMarkup(React.createElement(en.exports.default)),
  ];
  for (const markup of [trMarkup, enMarkup]) {
    assert.match(markup, /data-source-id="nsight-compute-2026-release"/i);
    assert.match(markup, /report merge|rapor birleştirme/i);
    assert.match(markup, /version|sürüm/i);
    assert.match(markup, /nsys/i);
    assert.match(markup, /ncu/i);
    assert.match(markup, /data-artifact-field="gpu"/i);
    assert.match(markup, /data-artifact-field="ncuVersion"/i);
  }
});

test("Task 4 CUTLASS paths preserve direct source maturity and do not cross-associate Blackwell evidence", async () => {
  const [tr, en, { curriculumSources }] = await Promise.all([
    loadTsxModule("CutlassCuteEmbedded"),
    loadTsxModule("CutlassCuteEmbedded.en"),
    loadCurriculumRegistry(),
  ]);
  const expectedSources = {
    "cutlass-overview-4": ["cutlass", "current", "2026-08-29", "CUTLASS 4 Overview", "https://docs.nvidia.com/cutlass/latest/overview.html"],
    "cutlass-cpp-templates": ["cutlass", "current", "2026-08-29", "CUTLASS 3.x GEMM API", "https://docs.nvidia.com/cutlass/latest/media/docs/cpp/gemm_api_3x.html"],
    "cutlass-cute-dsl": ["cutlass", "preview", "2026-08-29", "CuTe DSL", "https://docs.nvidia.com/cutlass/latest/media/docs/pythonDSL/cute_dsl.html"],
    "cutlass-legacy-generator": ["cutlass", "current", "2026-08-29", "CUTLASS Code Organization", "https://docs.nvidia.com/cutlass/latest/media/docs/cpp/code_organization.html"],
    "cutlass-blackwell-sm100": ["cutlass", "current", "2026-08-29", "CUTLASS Blackwell SM100 GEMMs", "https://docs.nvidia.com/cutlass/latest/media/docs/cpp/blackwell_functionality.html"],
    "cutlass-grouped-scheduler": ["cutlass", "current", "2026-08-29", "CUTLASS Grouped Kernel Schedulers", "https://docs.nvidia.com/cutlass/latest/media/docs/cpp/grouped_scheduler.html"],
    "cutlass-blackwell-clc": ["cutlass", "current", "2026-08-29", "CUTLASS Blackwell Cluster Launch Control", "https://docs.nvidia.com/cutlass/latest/media/docs/cpp/blackwell_cluster_launch_control.html"],
    "cutlass-rubin-sm107": ["cutlass", "preview", "2026-08-29", "CUTLASS Rubin SM107 Changelog", "https://docs.nvidia.com/cutlass/latest/CHANGELOG.html"],
  };
  const expectedArchitectures = ["ada", "hopper", "blackwell", "rubin"];

  for (const [id, [moduleId, maturity, verifiedAt, title, url]] of Object.entries(expectedSources)) {
    const source = curriculumSources.find((entry) => entry.id === id);
    assert.ok(source, `missing Task 4 source ${id}`);
    assert.equal(source.moduleId, moduleId);
    assert.equal(source.maturity, maturity);
    assert.equal(source.verifiedAt, verifiedAt);
    assert.equal(source.title, title);
    assert.equal(source.url, url);
  }

  for (const locale of [tr, en]) {
    assert.deepEqual(locale.exports.CUTLASS_ARCHITECTURE_IDS, expectedArchitectures);
    assert.deepEqual(locale.exports.CUTLASS_IMPLEMENTATION_IDS, ["cpp-templates", "cute-dsl", "legacy-generator"]);
    const cppTemplates = locale.exports.getCutlassImplementationPlan("cpp-templates");
    const cuteDsl = locale.exports.getCutlassImplementationPlan("cute-dsl");
    const legacyGenerator = locale.exports.getCutlassImplementationPlan("legacy-generator");
    assert.deepEqual([cppTemplates.sourceId, cppTemplates.maturity], ["cutlass-cpp-templates", "current"]);
    assert.deepEqual([cuteDsl.sourceId, cuteDsl.maturity], ["cutlass-cute-dsl", "preview"]);
    assert.deepEqual([legacyGenerator.sourceId, legacyGenerator.maturity], ["cutlass-legacy-generator", "current"]);
    const blackwell = locale.exports.getCutlassArchitecturePlan("blackwell");
    const rubin = locale.exports.getCutlassArchitecturePlan("rubin");
    assert.equal(blackwell.sourceId, "cutlass-blackwell-sm100");
    assert.equal(blackwell.maturity, "current");
    assert.equal(blackwell.coreCompletion, true);
    assert.match(blackwell.evidence, /tcgen05\.mma/i);
    assert.match(blackwell.evidence, /TMEM/i);
    assert.match(blackwell.evidence, /FP4/i);
    assert.match(blackwell.evidence, /FP8/i);
    assert.match(blackwell.evidence, /fifth-generation Tensor Core|beşinci nesil Tensör Çekirdeği/i);
    assert.deepEqual(blackwell.evidenceSources.map((entry) => entry.sourceId), ["cutlass-blackwell-sm100", "cutlass-grouped-scheduler", "cutlass-blackwell-clc"]);
    assert.match(blackwell.evidenceSources[0].claim, /tcgen05\.mma.*block.scaled|tcgen05\.mma.*blok ölçekli/i);
    assert.match(blackwell.evidenceSources[1].claim, /grouped GEMM|gruplu GEMM/i);
    assert.match(blackwell.evidenceSources[2].claim, /persistent|kalıcı/i);
    assert.equal(rubin.sourceId, "cutlass-rubin-sm107");
    assert.equal(rubin.maturity, "preview");
    assert.equal(rubin.coreCompletion, false);
    assert.match(rubin.evidence, /SM107/i);
    assert.match(rubin.evidence, /R615/i);
  }

  const [trMarkup, enMarkup] = [
    renderToStaticMarkup(React.createElement(tr.exports.default)),
    renderToStaticMarkup(React.createElement(en.exports.default)),
  ];
  for (const markup of [trMarkup, enMarkup]) {
    assert.match(markup, /CUTLASS 4/i);
    assert.match(markup, /CuTe DSL/i);
    assert.match(markup, /legacy (Python )?generator|eski Python üreteci/i);
    assert.match(markup, /Problem → CUTLASS 4\.x\/CuTe DSL → PTX\/SASS evidence → Tensor Core/i);
    assert.match(markup, /data-source-id="cutlass-cpp-templates"/i);
    assert.match(markup, /data-source-id="cutlass-blackwell-sm100"/i);
    assert.match(markup, /data-source-id="cutlass-grouped-scheduler"/i);
    assert.match(markup, /data-source-id="cutlass-blackwell-clc"/i);
    assert.match(markup, /tcgen05\.mma/i);
    assert.match(markup, /Tensor Memory|Tensör Belleği/i);
    assert.match(markup, /block.scaled|blok ölçekli/i);
    assert.match(markup, /FP4/i);
    assert.match(markup, /FP8/i);
    assert.match(markup, /grouped GEMM|gruplu GEMM/i);
    assert.match(markup, /persistent|kalıcı/i);
    assert.match(markup, /fifth-generation Tensor Core|beşinci nesil Tensör Çekirdeği/i);
  }
});

test("Task 4 registry retains the profiling and CUTLASS foundations while extending bilingual concepts", async () => {
  const { modulesByLocale } = await loadModuleRegistry();
  const byId = (locale, id) => modulesByLocale[locale].find((module) => module.id === id);

  for (const locale of ["tr", "en"]) {
    const profiling = byId(locale, "profiling");
    const cutlass = byId(locale, "cutlass");
    const profilingText = [...profiling.concepts, ...profiling.tags, profiling.description, profiling.outcome].join(" ");
    const cutlassText = [...cutlass.concepts, ...cutlass.tags, cutlass.description, cutlass.outcome].join(" ");

    assert.match(profilingText, /timeline|zaman çizelgesi/i);
    assert.match(profilingText, /hot kernel|sıcak kernel/i);
    assert.match(profilingText, /warm-up|Isınma|ısınma/i);
    assert.match(profilingText, /quantile|yüzdelik/i);
    assert.match(profilingText, /report merge|rapor birleştirme/i);
    assert.match(profilingText, /CUDA Graph/i);
    assert.match(cutlassText, /CUTLASS/i);
    assert.match(cutlassText, /CuTe DSL/i);
    assert.match(cutlassText, /PTX.*SASS|PTX → SASS/i);
    assert.match(cutlassText, /Tensor Core/i);
    assert.match(cutlassText, /Blackwell/i);
    assert.match(cutlassText, /FP4/i);
    assert.match(cutlassText, /FP8/i);
  }
});

test("Task 5 source records bind each systems claim to direct official evidence and literal maturity", async () => {
  const { curriculumSources } = await loadCurriculumRegistry();
  const expected = {
    "vllm-disaggregated-encoder": ["inference", "current", "Disaggregated Encoder", "https://docs.vllm.ai/en/latest/examples/disaggregated/disaggregated_encoder/"],
    "vllm-cuda-graph-modes": ["inference", "current", "vLLM CUDA Graphs", "https://docs.vllm.ai/en/stable/design/cuda_graphs/"],
    "amd-hip-graphs": ["inference", "current", "AMD HIP Graphs Runtime API", "https://rocm.docs.amd.com/projects/HIP/en/latest/how-to/hip_runtime_api/hipgraph.html"],
    "vllm-speculative-acceptance": ["inference", "preview", "vLLM Per-Request Acceptance Metrics", "https://docs.vllm.ai/en/latest/features/speculative_decoding/acceptance_metrics/"],
    "vllm-expert-parallel": ["inference", "current", "vLLM Expert Parallel Deployment", "https://docs.vllm.ai/en/latest/serving/expert_parallel_deployment/"],
    "vllm-context-parallel": ["inference", "preview", "vLLM Context Parallel Deployment", "https://docs.vllm.ai/en/latest/serving/context_parallel_deployment/"],
    "vllm-online-quantization": ["inference", "current", "vLLM Online Quantization", "https://docs.vllm.ai/en/latest/features/quantization/online/"],
    "cutlass-inference-formats": ["inference", "current", "CUTLASS Blackwell Block-Scaled Formats", "https://docs.nvidia.com/cutlass/latest/media/docs/cpp/blackwell_functionality.html"],
    "nccl-topology-detection": ["multigpu", "current", "NCCL Topology Detection", "https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/troubleshooting/gpu_troubleshooting.html"],
    "nccl-device-api-experimental": ["multigpu", "preview", "NCCL 2.28.3 Device API Release Notes", "https://docs.nvidia.com/deeplearning/nccl/release-notes/rel_2-28-3.html"],
    "nccl-device-api-fusion": ["multigpu", "current", "NCCL Device API", "https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/api/device.html"],
    "nvshmem-symmetric-memory": ["multigpu", "current", "NVIDIA NVSHMEM Symmetric Memory", "https://docs.nvidia.com/nvshmem/api/latest/using.html"],
    "nccl-cuda-streams": ["multigpu", "current", "NCCL CUDA Stream Semantics", "https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/usage/streams.html"],
    "vllm-parallelism-scaling": ["multigpu", "current", "vLLM Parallelism and Scaling", "https://docs.vllm.ai/en/stable/serving/parallelism_scaling/"],
    "rocm-10-core": ["systems", "current", "ROCm Core SDK 10.0.0 Release Notes", "https://rocm.docs.amd.com/en/develop/about/release-notes.html"],
    "rocprofiler-sdk-rocm10": ["systems", "current", "ROCprofiler-SDK in ROCm 10", "https://rocm.docs.amd.com/en/develop/about/release-notes.html"],
    "hip-programming-rocm10": ["systems", "current", "AMD GPU Programming on ROCm", "https://rocm.docs.amd.com/en/develop/reference/hip-programming.html"],
    "mlir-dialect-conversion": ["systems", "current", "MLIR Dialect Conversion", "https://mlir.llvm.org/docs/DialectConversion/"],
    "cuda-tile-ir": ["systems", "current", "CUDA Tile IR", "https://docs.nvidia.com/cuda/tile-ir/main/sections/introduction.html"],
    "cutile-tileir": ["systems", "current", "cuTile Python Quickstart", "https://docs.nvidia.com/cuda/cutile-python/quickstart.html"],
    "cute-dsl-stack": ["systems", "preview", "CUTLASS CuTe DSL Overview", "https://docs.nvidia.com/cutlass/latest/overview.html"],
    "tensorrt-how-it-works": ["systems", "current", "How TensorRT Works", "https://docs.nvidia.com/deeplearning/tensorrt/latest/architecture/how-trt-works.html"],
    "triton-tileir-incubator": ["systems", "preview", "Triton-to-Tile-IR Incubator", "https://github.com/triton-lang/Triton-to-tile-IR"],
    "systems-rubin-sm107": ["systems", "preview", "CUTLASS Rubin SM107 Changelog", "https://docs.nvidia.com/cutlass/latest/CHANGELOG.html"],
  };

  assert.deepEqual(curriculumSources.filter(({ id }) => Object.hasOwn(expected, id)).map(({ id }) => id), Object.keys(expected));
  for (const [id, [moduleId, maturity, title, url]] of Object.entries(expected)) {
    const source = curriculumSources.find((entry) => entry.id === id);
    assert.ok(source, `missing Task 5 source ${id}`);
    assert.deepEqual(
      [source.moduleId, source.maturity, source.verifiedAt, source.title, source.url],
      [moduleId, maturity, "2026-08-29", title, url],
      `${id} source contract drifted`,
    );
  }
});

test("Task 5 inference decision model separates diagnosis, graph, parallelism, and precision boundaries", async () => {
  const locales = await Promise.all([loadTsxModule("InferenceSystemsEmbedded"), loadTsxModule("InferenceSystemsEmbedded.en")]);
  for (const locale of locales) {
    assert.deepEqual(locale.exports.INFERENCE_DIAGNOSIS_IDS, ["scheduler", "kv-cache", "kernel", "network"]);
    assert.deepEqual(locale.exports.INFERENCE_GRAPH_IDS, ["cuda-piecewise", "cuda-full", "hip-piecewise", "hip-full"]);
    assert.deepEqual(locale.exports.INFERENCE_PARALLELISM_IDS, ["expert", "context"]);
    assert.deepEqual(locale.exports.INFERENCE_PRECISION_IDS, ["fp8", "mxfp8", "mxfp4", "nvfp4"]);

    const speculative = locale.exports.getInferenceSpeculativeBoundary();
    assert.equal(speculative.sourceId, "vllm-speculative-acceptance");
    assert.equal(speculative.maturity, "preview");
    assert.match(speculative.acceptanceRate, /accepted.*draft|kabul.*taslak/i);
    assert.match(speculative.draftCost, /draft|taslak/i);
    assert.equal(speculative.measuredHardwareEvidence, false);

    for (const id of locale.exports.INFERENCE_DIAGNOSIS_IDS) {
      const plan = locale.exports.getInferenceDiagnosis(id);
      assert.equal(plan.id, id);
      assert.ok(plan.signals.length >= 2);
      assert.notEqual(plan.bottleneck, locale.exports.getInferenceDiagnosis(id === "network" ? "scheduler" : "network").bottleneck);
    }
    for (const id of locale.exports.INFERENCE_GRAPH_IDS) {
      const plan = locale.exports.getInferenceGraphPlan(id);
      assert.equal(plan.id, id);
      assert.ok(["CUDA", "HIP"].includes(plan.backend));
      assert.ok(["piecewise", "full"].includes(plan.capture));
      assert.equal(plan.sourceId, id.startsWith("cuda") ? "vllm-cuda-graph-modes" : "vllm-stable");
      assert.equal(plan.measuredHardwareEvidence, false);
    }
    assert.deepEqual(
      locale.exports.INFERENCE_PARALLELISM_IDS.map((id) => {
        const plan = locale.exports.getInferenceParallelismPlan(id);
        return [id, plan.sourceId, plan.maturity, plan.coreCompletion];
      }),
      [
        ["expert", "vllm-expert-parallel", "current", true],
        ["context", "vllm-context-parallel", "preview", false],
      ],
    );
    for (const id of locale.exports.INFERENCE_PRECISION_IDS) {
      const plan = locale.exports.getInferencePrecisionPlan(id);
      assert.equal(plan.id, id);
      assert.ok(plan.hardware.length > 10);
      assert.ok(plan.backend.length > 5);
      assert.ok(plan.scaleRepresentation.length > 5);
      assert.ok(plan.qualityGuardrail.length > 10);
      assert.equal(plan.measuredHardwareEvidence, false);
    }
  }

  for (const locale of locales) {
    const markup = renderToStaticMarkup(React.createElement(locale.exports.default));
    assert.match(markup, /disaggregated|ayrıştırılmış/i);
    assert.match(markup, /encode|kodlama/i);
    assert.match(markup, /prefill|ön doldurma/i);
    assert.match(markup, /decode/i);
    assert.match(markup, /data-source-id="vllm-speculative-acceptance"[^>]*data-maturity="preview"/i);
    assert.match(markup, /data-source-id="vllm-context-parallel"[^>]*data-maturity="preview"/i);
    assert.match(markup, /not measured hardware evidence|ölçülmüş donanım kanıtı değildir/i);
    assert.doesNotMatch(markup, /data-evidence-kind="measured"/i);
  }
});

test("Task 5 NCCL model binds topology, symmetric kernels, fusion, and feature-granular Device API maturity", async () => {
  const locales = await Promise.all([loadTsxModule("NcclMultiGpuEmbedded"), loadTsxModule("NcclMultiGpuEmbedded.en")]);
  for (const locale of locales) {
    assert.deepEqual(locale.exports.NCCL_TOPOLOGY_IDS, ["pcie", "nvlink", "nvswitch", "rdma"]);
    assert.deepEqual(locale.exports.NCCL_SYSTEM_PATH_IDS, ["topology", "symmetric", "fusion", "device-api"]);
    assert.deepEqual(locale.exports.NCCL_PARALLELISM_IDS, ["DP", "TP", "PP", "EP"]);
    const topology = locale.exports.getNcclSystemPath("topology");
    const symmetric = locale.exports.getNcclSystemPath("symmetric");
    const fusion = locale.exports.getNcclSystemPath("fusion");
    const deviceApi = locale.exports.getNcclSystemPath("device-api");
    assert.deepEqual([topology.sourceId, topology.maturity], ["nccl-topology-detection", "current"]);
    assert.deepEqual([symmetric.sourceId, symmetric.maturity, symmetric.implementationSourceId, symmetric.implementationMaturity], ["nvshmem-symmetric-memory", "current", "nccl-device-lsa-multimem", "current"]);
    assert.deepEqual([fusion.sourceId, fusion.maturity, fusion.implementationSourceId, fusion.implementationMaturity], ["nccl-cuda-streams", "current", "nccl-device-api-fusion", "current"]);
    assert.deepEqual([deviceApi.sourceId, deviceApi.maturity, deviceApi.coreCompletion], ["nccl-device-gin", "current", true]);
    assert.match(deviceApi.caveat, /recompile|yeniden derle/i);
  }
  for (const locale of locales) {
    const markup = renderToStaticMarkup(React.createElement(locale.exports.default));
    assert.match(markup, /AllReduce/i);
    assert.match(markup, /DP.*TP.*PP.*EP/is);
    assert.match(markup, /NVLink/i);
    assert.match(markup, /NVSwitch/i);
    assert.match(markup, /RDMA/i);
    assert.match(markup, /data-source-id="nccl-device-rust-bindings"[^>]*data-maturity="preview"/i);
    assert.match(markup, /optional Preview|isteğe bağlı Önizleme/i);
  }
});

test("Task 5 software stack keeps five layers and current versus Preview paths distinct", async () => {
  const locales = await Promise.all([loadTsxModule("GpuSoftwareStackEmbedded"), loadTsxModule("GpuSoftwareStackEmbedded.en")]);
  const expectedLayers = ["graph-compiler", "kernel-dsl", "kernel-library", "runtime", "serving-system"];
  const expectedPaths = ["rocm10", "cuda-tile", "triton-tileir", "rubin"];
  for (const locale of locales) {
    assert.deepEqual(locale.exports.GPU_STACK_LAYER_IDS, expectedLayers);
    assert.deepEqual(locale.exports.GPU_STACK_PATH_IDS, expectedPaths);
    assert.deepEqual(locale.exports.getGpuStackPath("rocm10").sourceIds, ["rocm-10-core", "rocprofiler-sdk-rocm10", "hip-programming-rocm10"]);
    assert.deepEqual([locale.exports.getGpuStackPath("cuda-tile").sourceId, locale.exports.getGpuStackPath("cuda-tile").maturity], ["cuda-tile-ir", "current"]);
    assert.deepEqual([locale.exports.getGpuStackPath("triton-tileir").sourceId, locale.exports.getGpuStackPath("triton-tileir").maturity, locale.exports.getGpuStackPath("triton-tileir").coreCompletion], ["triton-tileir-incubator", "preview", false]);
    assert.deepEqual([locale.exports.getGpuStackPath("rubin").sourceId, locale.exports.getGpuStackPath("rubin").maturity, locale.exports.getGpuStackPath("rubin").coreCompletion], ["systems-rubin-sm107", "preview", false]);
    const technologies = locale.exports.GPU_STACK_TECHNOLOGIES;
    for (const name of ["ROCm 10", "ROCprofiler-SDK", "CUDA Tile IR", "CuTe DSL", "HIP", "MLIR", "TensorRT"]) {
      assert.equal(technologies.filter((entry) => entry.name === name).length, 1, `${name} must be one distinct entry`);
    }
    assert.equal(technologies.find(({ name }) => name === "HIP").layer, "runtime");
    assert.equal(technologies.find(({ name }) => name === "MLIR").layer, "graph-compiler");
    assert.equal(technologies.find(({ name }) => name === "TensorRT").layer, "serving-system");
  }
  for (const locale of locales) {
    const markup = renderToStaticMarkup(React.createElement(locale.exports.default));
    assert.match(markup, /graph compiler.*kernel DSL.*kernel library.*runtime.*serving system|graf derleyici.*kernel DSL.*kernel kütüphanesi.*çalışma zamanı.*sunum sistemi/is);
    assert.match(markup, /data-source-id="triton-tileir-incubator"[^>]*data-maturity="preview"/i);
    assert.match(markup, /data-source-id="systems-rubin-sm107"[^>]*data-maturity="preview"/i);
    assert.match(markup, /not a core completion requirement|temel tamamlanma koşulu değildir/i);
  }
});

test("Task 5 review round 1 gives every stack layer direct non-fallback technology cards", async () => {
  const locales = await Promise.all([loadTsxModule("GpuSoftwareStackEmbedded"), loadTsxModule("GpuSoftwareStackEmbedded.en")]);
  const expected = {
    "graph-compiler": [["MLIR", "mlir-dialect-conversion", "current"], ["CUDA Tile IR", "cuda-tile-ir", "current"]],
    "kernel-dsl": [["cuTile", "cutile-tileir", "current"], ["CuTe DSL", "cute-dsl-stack", "preview"]],
    "kernel-library": [["CUTLASS", "cutlass-kernel-library", "current"]],
    runtime: [["ROCm 10", "rocm-10-core", "current"], ["ROCprofiler-SDK", "rocprofiler-sdk-rocm10", "current"], ["HIP", "hip-programming-rocm10", "current"]],
    "serving-system": [["TensorRT", "tensorrt-how-it-works", "current"], ["vLLM", "vllm-stable", "current"]],
  };
  for (const locale of locales) {
    for (const [layer, cards] of Object.entries(expected)) {
      const plan = locale.exports.getGpuStackLayer(layer);
      assert.equal(plan.id, layer);
      assert.ok(plan.cards.length > 0, `${layer} must not fall back to generic copy`);
      assert.deepEqual(plan.cards.map(({ name, sourceId, maturity }) => [name, sourceId, maturity]), cards);
      assert.ok(plan.cards.every(({ role }) => role.length > 8));
    }
    const markup = renderToStaticMarkup(React.createElement(locale.exports.default));
    assert.match(markup, /data-technology="MLIR"[^>]*data-source-id="mlir-dialect-conversion"[^>]*data-maturity="current"/i);
    assert.match(markup, /data-technology="CUDA Tile IR"[^>]*data-source-id="cuda-tile-ir"[^>]*data-maturity="current"/i);
  }
});

test("Task 5 review round 1 makes topology recommendations depend on parallelism and direct topology evidence", async () => {
  const locales = await Promise.all([loadTsxModule("NcclMultiGpuEmbedded"), loadTsxModule("NcclMultiGpuEmbedded.en")]);
  const sourceByTopology = { pcie: "nccl-pcie-p2p", nvlink: "nccl-nvlink-p2p", nvswitch: "nccl-nvswitch-topology", rdma: "nccl-gpudirect-rdma" };
  for (const locale of locales) {
    for (const parallelism of locale.exports.NCCL_PARALLELISM_IDS) for (const [topology, sourceId] of Object.entries(sourceByTopology)) {
      const plan = locale.exports.getNcclTopologyRecommendation(parallelism, topology);
      assert.equal(plan.parallelism, parallelism);
      assert.equal(plan.topology, topology);
      assert.equal(plan.topologySourceId, sourceId);
      assert.ok(plan.recommendation.length > 24);
    }
    assert.deepEqual([locale.exports.getNcclSystemPath("symmetric").maturity, locale.exports.getNcclSystemPath("symmetric").coreCompletion], ["current", true]);
    assert.deepEqual([locale.exports.getNcclSystemPath("fusion").maturity, locale.exports.getNcclSystemPath("fusion").coreCompletion], ["current", true]);
    assert.deepEqual([locale.exports.getNcclSystemPath("device-api").maturity, locale.exports.getNcclSystemPath("device-api").coreCompletion], ["current", true]);
  }
});

test("Task 5 review round 1 keeps precision evidence feature-specific", async () => {
  const locales = await Promise.all([loadTsxModule("InferenceSystemsEmbedded"), loadTsxModule("InferenceSystemsEmbedded.en")]);
  for (const locale of locales) {
    for (const id of locale.exports.INFERENCE_PRECISION_IDS) {
      const plan = locale.exports.getInferencePrecisionPlan(id);
      assert.ok(Array.isArray(plan.sourceIds) && plan.sourceIds.length >= 2, `${id} needs direct evidence split`);
      assert.ok(["current", "preview"].includes(plan.maturity));
      assert.match(plan.qualityGuardrail, /educational|eğitsel/i);
    }
    const speculative = locale.exports.getInferenceSpeculativeBoundary();
    assert.equal(speculative.acceptanceSourceId, "vllm-speculative-acceptance");
    assert.equal(speculative.draftCostEvidenceKind, "educational");
  }
});

test("Task 5 review round 2 keeps HIP feature modes separate from AMD graph mechanisms", async () => {
  const locales = await Promise.all([loadTsxModule("InferenceSystemsEmbedded"), loadTsxModule("InferenceSystemsEmbedded.en")]);
  for (const locale of locales) {
    for (const id of ["hip-piecewise", "hip-full"]) {
      const plan = locale.exports.getInferenceGraphPlan(id);
      assert.equal(plan.capture, id.endsWith("piecewise") ? "piecewise" : "full");
      assert.equal(plan.sourceId, "vllm-stable");
      assert.equal(plan.mechanismSourceId, "amd-hip-graphs");
      assert.equal(plan.mechanism, id.endsWith("piecewise") ? "stream-capture" : "explicit-graph");
    }
  }
});

test("Task 5 review round 2 keeps NCCL concepts, feature maturity, and recommendation provenance distinct", async () => {
  const locales = await Promise.all([loadTsxModule("NcclMultiGpuEmbedded"), loadTsxModule("NcclMultiGpuEmbedded.en")]);
  for (const locale of locales) {
    const symmetric = locale.exports.getNcclSystemPath("symmetric");
    const fusion = locale.exports.getNcclSystemPath("fusion");
    assert.deepEqual([symmetric.sourceId, symmetric.maturity, symmetric.implementationSourceId, symmetric.implementationMaturity, symmetric.coreCompletion], ["nvshmem-symmetric-memory", "current", "nccl-device-lsa-multimem", "current", true]);
    assert.deepEqual([fusion.sourceId, fusion.maturity, fusion.implementationSourceId, fusion.implementationMaturity, fusion.coreCompletion], ["nccl-cuda-streams", "current", "nccl-device-api-fusion", "current", true]);
    for (const parallelism of locale.exports.NCCL_PARALLELISM_IDS) {
      const plan = locale.exports.getNcclTopologyRecommendation(parallelism, "rdma");
      assert.equal(plan.parallelismSourceId, "vllm-parallelism-scaling");
      assert.equal(plan.topologySourceId, "nccl-gpudirect-rdma");
      assert.notEqual(plan.parallelismSourceId, plan.topologySourceId);
    }
  }
});

test("Task 5 registry preserves systems foundations while adding bilingual current concepts", async () => {
  const { modulesByLocale } = await loadModuleRegistry();
  const byId = (locale, id) => modulesByLocale[locale].find((module) => module.id === id);
  for (const locale of ["tr", "en"]) {
    const inference = byId(locale, "inference");
    const multigpu = byId(locale, "multigpu");
    const systems = byId(locale, "systems");
    const inferenceText = [...inference.concepts, ...inference.tags, inference.description, inference.outcome].join(" ");
    const multigpuText = [...multigpu.concepts, ...multigpu.tags, multigpu.description, multigpu.outcome].join(" ");
    const systemsText = [...systems.concepts, ...systems.tags, systems.description, systems.outcome].join(" ");
    for (const term of [/TTFT/i, /ITL/i, /throughput|iş hacmi/i, /VRAM/i, /disaggregated|ayrıştırılmış/i, /MXFP/i]) assert.match(inferenceText, term);
    for (const term of [/collective|kolektif/i, /DP/i, /TP/i, /PP/i, /EP/i, /NVLink/i, /NVSwitch/i, /RDMA/i, /symmetric|simetrik/i]) assert.match(multigpuText, term);
    for (const term of [/ROCm 10/i, /ROCprofiler-SDK/i, /CUDA Tile IR/i, /CuTe DSL/i, /HIP/i, /MLIR/i, /TensorRT/i]) assert.match(systemsText, term);
  }
});

test("Task 6 roadmap keeps the bilingual evidence cadence, twelve modules, and non-graduation Preview boundary", async () => {
  const [{ MODULE_IDS, modulesByLocale, roadmapByLocale }, { uiByLocale }] = await Promise.all([
    loadModuleRegistry(),
    loadAtlasCopy(),
  ]);
  const expectedIds = [
    "visual", "toolchain", "architecture", "memory", "triton", "operators", "correctness",
    "profiling", "cutlass", "inference", "multigpu", "systems",
  ];
  const expectedRoadmap = {
    tr: [
      ["01", "Yetenek ve ortam kanıtı", "GPU/arka uç, compute capability, araç zinciri ve ölçüm bağlamını kaydet.", "Zemin"],
      ["02", "SIMT → tile programlama", "Izgara, warp işbirliği, dallanma ve tile düzeyi problem ayrıştırma.", "CUDA"],
      ["03", "TMA ve veri hareketi", "Birleşik erişim, tensor tanımlayıcı, TMA/DSMEM uygulanabilirliği ve TMEM sınırı.", "Bellek"],
      ["04", "Yapılandırılmış Triton operatörleri", "torch.library, triton_op/wrap_triton, opcheck ve yapılandırılmış autotune.", "Entegrasyon"],
      ["05", "Gruplu GEMM ve MoE", "Gruplu iş atama, yönlendirme ve profil kanıtıyla operatör seçimi.", "Operatör"],
      ["06", "Düşük hassasiyetli operatörler", "FP8/MXFP8 ölçek metaverisi, birikim ve kalite koruması.", "Operatör"],
      ["07", "Dikkat ve block-scaled sınırlar", "Kararlı softmax, paged KV-cache ve FP4/FP8 uygulanabilirlik sınırları.", "Operatör"],
      ["08", "Genişletilmiş doğruluk kapısı", "Referans, tolerans, alias/determinism, memcheck, racecheck ve TMEM korumaları.", "Kanıt"],
      ["09", "2026 Nsight kanıtı", "Rapor birleştirme, clustering, instruction mix, scoreboard ve CUDA Graph düğümü.", "Ölçüm"],
      ["10", "CUTLASS 4 ve Blackwell farkındalığı", "C++/CuTe → PTX/SASS kanıtı, Tensor Core ve mimariye bağlı kalıcı/gruplu planlama.", "Optimizasyon"],
      ["11", "Ayrıştırılmış çıkarım ve NCCL", "Encode/prefill/decode, graph sınırları, DP/TP/PP/EP ve topoloji kanıtı.", "Sistem"],
      ["12", "Bitirme projesi ve portföy", "TTFT/ITL/iş hacmi raporu, iki %15+ füzyon ve savunma", "Mezuniyet"],
    ],
    en: [
      ["01", "Capability & environment evidence", "Record GPU/backend, compute capability, toolchain, and measurement context.", "Foundation"],
      ["02", "SIMT → tile programming", "Grid, warp collaboration, divergence, and tile-level problem decomposition.", "CUDA"],
      ["03", "TMA & data movement", "Coalescing, tensor descriptors, TMA/DSMEM applicability, and the TMEM boundary.", "Memory"],
      ["04", "Structured Triton operators", "torch.library, triton_op/wrap_triton, opcheck, and structured autotune.", "Integration"],
      ["05", "Grouped GEMM & MoE", "Grouped work assignment, routing, and profiler-backed operator selection.", "Operators"],
      ["06", "Low-precision operators", "FP8/MXFP8 scale metadata, accumulation, and quality guardrails.", "Operators"],
      ["07", "Attention & block-scaled boundaries", "Stable softmax, paged KV-cache, and FP4/FP8 applicability boundaries.", "Operators"],
      ["08", "Expanded correctness gate", "Reference, tolerance, alias/determinism, memcheck, racecheck, and TMEM guardrails.", "Evidence"],
      ["09", "2026 Nsight evidence", "Report merge, clustering, instruction mix, scoreboards, and CUDA Graph nodes.", "Measurement"],
      ["10", "CUTLASS 4 & Blackwell awareness", "C++/CuTe → PTX/SASS evidence, Tensor Cores, and architecture-gated persistent/grouped scheduling.", "Optimization"],
      ["11", "Disaggregated inference & NCCL", "Encode/prefill/decode, graph boundaries, DP/TP/PP/EP, and topology evidence.", "Systems"],
      ["12", "Capstone & portfolio", "TTFT/ITL/throughput report, two 15%+ fusions, and defense", "Graduation"],
    ],
  };

  assert.deepEqual(MODULE_IDS, expectedIds);
  for (const locale of ["tr", "en"]) {
    assert.deepEqual(modulesByLocale[locale].map(({ id }) => id), expectedIds);
    assert.deepEqual(roadmapByLocale[locale], expectedRoadmap[locale]);
    assert.equal(roadmapByLocale[locale].length, 12);
    assert.equal(roadmapByLocale[locale][11][0], "12");
  }

  assert.equal(uiByLocale.tr.hero, "On iki etkileşimli atlas; görsel GPU temellerini, tile düzeyi programlamayı, Blackwell farkındalıklı optimizasyonu ve dağıtık çıkarımı, desteklenen mimari ve backend sınırlarını görünür kılan 12 haftalık kanıt rotasında birleştirir.");
  assert.equal(uiByLocale.en.hero, "Twelve interactive atlases connect visual GPU foundations, tile-level programming, Blackwell-aware optimization, and distributed inference in a 12-week evidence route that makes supported architecture and backend boundaries visible.");
  assert.doesNotMatch(uiByLocale.tr.hero, /CUDA’nın ilk warp’ından/i);
  assert.doesNotMatch(uiByLocale.en.hero, /from your first CUDA warp/i);

  const expectedPolicy = {
    tr: {
      core: "Temel: donanım kuşağından bağımsız, tamamlanması gereken beceri ve kanıt.",
      current: "Güncel: güncel birinci taraf kanıtla desteklenir; mimari ve backend uygulanabilirliği ayrıca doğrulanır.",
      preview: "Önizleme: araç zinciri ya da donanım olgunlaşmasına bağlı keşif yoludur; mezuniyet koşulu değildir.",
      evidence: "Birinci taraf kaynaklar yayın öncesinde tazelenir; belge güncelliği, özellik olgunluğu ve mimari/backend uygulanabilirliği ayrı değerlendirilir.",
      simulation: "Etkileşimli laboratuvarlar eğitim amaçlı simülasyonlardır; ölçülmüş donanım sonucu iddia etmez.",
    },
    en: {
      core: "Core: hardware-generation-independent skills and evidence required for completion.",
      current: "Current: supported by fresh first-party evidence; architecture and backend applicability are verified separately.",
      preview: "Preview: an exploration path dependent on toolchain or hardware maturity; it is not a graduation requirement.",
      evidence: "First-party sources are refreshed before publication; document freshness, feature maturity, and architecture/backend applicability are evaluated separately.",
      simulation: "Interactive laboratories are educational simulations; they do not claim measured hardware results.",
    },
  };
  for (const locale of ["tr", "en"]) {
    assert.deepEqual(uiByLocale[locale].maturityDefinitions, {
      core: expectedPolicy[locale].core,
      current: expectedPolicy[locale].current,
      preview: expectedPolicy[locale].preview,
    });
    assert.equal(uiByLocale[locale].evidencePolicy, expectedPolicy[locale].evidence);
    assert.equal(uiByLocale[locale].simulationCaveat, expectedPolicy[locale].simulation);
  }
});
