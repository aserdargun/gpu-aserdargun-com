# GPU Kernel Atlas Quality Refresh and Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the local twelve-module Atlas with the remote branding line, correct bilingual language and presentation defects, refresh current first-party evidence, and deploy the fully verified commit to Azure.

**Architecture:** Preserve the existing `AtlasShell` and module boundaries. Reconcile `origin/main` through a normal merge, centralize freshness and wording contracts in the existing registry/copy modules, keep module-specific teaching text in its paired TR/EN components, and extend current Node and Playwright regressions instead of adding a new test framework.

**Tech Stack:** Node.js 22, React 19, Next.js 16 through Vinext, TypeScript, Node test runner, Playwright, GitHub Actions, Azure Static Web Apps.

**Spec:** `docs/superpowers/specs/2026-09-04-gpu-atlas-quality-refresh-deployment-design.md`

## Global Constraints

- Preserve the twelve-module information architecture, TR `/` and EN `/en/` routes, local progress state, and existing visual token system.
- Keep the standardized `GPU - GPU Kernel Engineering` title and favicon family from `origin/main`.
- Do not force-push, rewrite published history, reset destructively, or stage unrelated user-owned files.
- All source records must use the literal verification date `2026-09-04` after first-party URL validation.
- A claim changed in one locale must be changed equivalently in the other locale.
- Educational latency, bandwidth, or speedup numbers must be labeled illustrative/simulated or carry workload, hardware, version, baseline, metric, and source context.
- Preserve programmatic heading focus while removing the oversized native heading outline; interactive controls and focusable scrollers retain visible focus.
- Do not modify DNS or the existing custom-domain binding.
- Do not push until lint, build, contracts, Azure artifact verification, full E2E, browser review, and `git diff --check` pass.

---

### Task 1: Reconcile remote branding with the local Atlas

**Files:**
- Merge: `origin/main` into `main`
- Modify on conflict: `app/page.tsx`
- Modify on conflict: `tests/rendered-html.test.mjs`
- Modify on conflict: `tools/verify-azure-artifact.mjs`
- Preserve from remote: `app/apple-icon.png`
- Preserve from remote: `app/icon.png`
- Preserve from remote: `public/apple-touch-icon.png`
- Preserve merged branding: `public/favicon.svg`
- Modify: `app/locale-metadata.ts`
- Test: `tests/azure-static-artifact.test.mjs`

**Interfaces:**
- Consumes: `metadataForLocale(locale: Locale): Metadata`, the current localized static routes, and remote branding assets.
- Produces: one merge history containing both branding and the twelve-module shell; metadata title `GPU - GPU Kernel Engineering` in both locales.

- [ ] **Step 1: Confirm the remote has not moved and inspect merge inputs**

Run:

```bash
git fetch origin main
git status --short --branch
git log --oneline --left-right HEAD...origin/main
```

Expected: local documentation commits remain ahead, remote branding commits remain behind, and only the known user-owned documents are untracked.

- [ ] **Step 2: Merge without rewriting history**

Run:

```bash
git merge --no-ff origin/main
```

Expected: branding PNG assets are added automatically; conflicts may occur only in files changed by both the remote branding series and the local Atlas refresh.

- [ ] **Step 3: Resolve metadata and artifact contracts**

Keep the locale-aware route resolver from the local branch. In `app/locale-metadata.ts`, use the remote title in both records:

```ts
tr: {
  title: "GPU - GPU Kernel Engineering",
  imageAlt: "GPU - GPU Kernel Engineering",
  canonical: "/",
},
en: {
  title: "GPU - GPU Kernel Engineering",
  imageAlt: "GPU - GPU Kernel Engineering",
  canonical: "/en/",
},
```

Keep the local canonical/alternate URLs and `/en/` static route. Reconcile `tests/rendered-html.test.mjs`, `tests/azure-static-artifact.test.mjs`, and `tools/verify-azure-artifact.mjs` so they require the standardized title plus the lime/dark favicon-family checks.

- [ ] **Step 4: Verify the resolved merge**

Run:

```bash
git diff --check
git diff --name-only --diff-filter=U
npm run lint
```

Expected: no unmerged paths, no whitespace errors, and lint exits 0.

- [ ] **Step 5: Complete the merge commit**

Run:

```bash
git add app/page.tsx app/locale-metadata.ts tests/rendered-html.test.mjs tests/azure-static-artifact.test.mjs tools/verify-azure-artifact.mjs public/favicon.svg app/apple-icon.png app/icon.png public/apple-touch-icon.png
git commit
```

Expected: one merge commit with both parent histories. Do not stage any other `docs/superpowers` files.

### Task 2: Add quality and freshness regression contracts

**Files:**
- Modify: `tests/whole-plan-final-fix.test.mjs`
- Modify: `tests/curriculum-2026.test.mjs`
- Modify: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: `curriculumSources`, paired `*.tsx`/`*.en.tsx` components, `app/atlas/copy.ts`, and `app/globals.css` as text or rendered markup.
- Produces: failing tests for the approved language, date, performance-claim, simulated-result, metadata, and focus requirements.

- [ ] **Step 1: Write the source-date and copy regression test**

Add a test that loads every registry record and checks the single literal date, then scans the Turkish shell and modules for known defects:

```js
test("quality refresh uses one current evidence date and removes known Turkish defects", async () => {
  const { curriculumSources } = await loadCurriculumRegistry();
  assert.ok(curriculumSources.length > 0);
  assert.deepEqual(new Set(curriculumSources.map(({ verifiedAt }) => verifiedAt)), new Set(["2026-09-04"]));

  const files = ["atlas/copy.ts", "CudaSimtEmbedded.tsx", "VisualFoundationsEmbedded.tsx", "NsightBenchmarkEmbedded.tsx", "KernelForgeEmbedded.tsx"];
  const text = (await Promise.all(files.map((file) => readFile(new URL(`../app/${file}`, import.meta.url), "utf8")))).join("\n");
  assert.doesNotMatch(text, /saklayerek|çalıştırma’ın|İlerleme yüzde|%1\.9|09\.08\.2026/);
});
```

- [ ] **Step 2: Write the unsupported-performance-claim regression**

Scan the paired visual-foundations modules and require the approved labels:

```js
test("foundations avoid unqualified multipliers and universal GPU claims", async () => {
  const text = (await Promise.all([
    readFile(new URL("../app/VisualFoundationsEmbedded.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/VisualFoundationsEmbedded.en.tsx", import.meta.url), "utf8"),
  ])).join("\n");
  assert.doesNotMatch(text, /5[–-]10×|2[–-]3×|~?80%|her çevrimde|every cycle|asla kullan|never use/i);
  assert.doesNotMatch(text, /SM[^\n]{0,80}(?:fiziksel GPU çekirdeği|physical GPU core)/i);
});
```

- [ ] **Step 3: Write the simulated-result and heading-focus CSS regressions**

Require both locales to identify output as simulated and require the non-interactive heading rule without weakening controls:

```js
test("sample Triton metrics are visibly simulated in both locales", async () => {
  const tr = await loadTsxModule("PyTorchTritonEmbedded");
  const en = await loadTsxModule("PyTorchTritonEmbedded.en");
  assert.match(renderToStaticMarkup(React.createElement(tr.default)), /temsili|simüle/i);
  assert.match(renderToStaticMarkup(React.createElement(en.default)), /illustrative|simulated/i);
});

test("programmatic module heading focus is quiet while controls keep focus-visible", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.module-hero h1:focus\s*\{[^}]*outline:\s*none/i);
  assert.match(css, /:focus-visible\s*\{[^}]*(?:outline|box-shadow)/i);
});
```

- [ ] **Step 4: Run the focused tests and verify they fail for the intended reasons**

Run:

```bash
npm run build:azure
node --test tests/whole-plan-final-fix.test.mjs tests/curriculum-2026.test.mjs tests/rendered-html.test.mjs
```

Expected: failures cite the old verification date, known Turkish strings, unqualified claims, missing simulated label, or missing heading-focus rule—not syntax or build errors.

- [ ] **Step 5: Commit the failing contracts**

Run:

```bash
git add tests/whole-plan-final-fix.test.mjs tests/curriculum-2026.test.mjs tests/rendered-html.test.mjs
git commit -m "test: define GPU Atlas quality refresh contracts"
```

### Task 3: Correct bilingual language and performance teaching copy

**Files:**
- Modify: `app/atlas/copy.ts`
- Modify: `app/VisualFoundationsEmbedded.tsx`
- Modify: `app/VisualFoundationsEmbedded.en.tsx`
- Modify: `app/CudaSimtEmbedded.tsx`
- Modify when parity requires it: `app/CudaSimtEmbedded.en.tsx`
- Modify: `app/NsightBenchmarkEmbedded.tsx`
- Modify when parity requires it: `app/NsightBenchmarkEmbedded.en.tsx`
- Modify: other paired `app/*Embedded.tsx` and `app/*Embedded.en.tsx` files only where the full copy scan identifies the same approved terminology or punctuation defect.

**Interfaces:**
- Consumes: current locale-specific module exports and `uiByLocale` keys without changing their names.
- Produces: corrected TR/EN text with unchanged component exports, data attributes, source IDs, and interaction behavior.

- [ ] **Step 1: Correct the centralized shell copy**

Change `progress` to `İlerleme yüzdesi`. Replace prose-only mixed terms while preserving API names. The three principles should read naturally and remain equivalent, for example:

```ts
principle2: "Isınma, yüzdelik dağılımları, profil oluşturucu kanıtı ve kontrollü bir taban çizgisi olmadan hız iddiası kurulmaz.",
principle3: "Gerçek hedef; PyTorch, derleme ve hizmet iş yükleri içinde çalışan, portföy kalitesinde bir operatördür.",
```

- [ ] **Step 2: Correct the foundational Turkish defects**

Use `saklayarak`. Rewrite the launch description as:

```ts
body: "Bir kernel çalıştırmasının bütün iş parçacığı bloklarıdır. Bloklar uygun SM’lere dalgalar hâlinde dağıtılır.",
```

Use `%1,9` in Turkish prose. Remove common-noun apostrophes only in user-visible prose; do not alter identifiers, source titles, code, API names, or test selectors.

- [ ] **Step 3: Replace unsupported numerical shortcuts with scoped explanations**

In both visual-foundations components, replace global multipliers and `~80%` claims with concepts such as:

```ts
"Kazanç; GPU mimarisine, veri tipine, şekle, batch boyutuna ve karşılaştırma tabanına bağlıdır. Ölçmeden hız çarpanı ilan etme."
```

```ts
"Speedup depends on GPU architecture, dtype, shape, batch size, and the comparison baseline. Measure before publishing a multiplier."
```

Describe an SM as a streaming multiprocessor that schedules warps and owns execution resources. Scope shared-memory padding to access layout and bank width, and describe stride/random access as patterns to analyze rather than universal prohibitions.

- [ ] **Step 4: Run the focused quality contracts**

Run:

```bash
node --test tests/whole-plan-final-fix.test.mjs tests/rendered-html.test.mjs
```

Expected: language and performance-policy tests pass; any remaining failure points to another paired copy location that needs the same correction.

- [ ] **Step 5: Commit the copy refresh**

Run:

```bash
git add app/atlas/copy.ts app/*Embedded.tsx tests/whole-plan-final-fix.test.mjs tests/rendered-html.test.mjs
git commit -m "fix: refine bilingual GPU teaching copy"
```

Review the staged diff before committing so unrelated embedded-component changes are not included.

### Task 4: Refresh official evidence and maturity boundaries

**Files:**
- Modify: `app/atlas/curriculum-sources.ts`
- Modify: `app/KernelForgeEmbedded.tsx`
- Modify: `app/KernelForgeEmbedded.en.tsx`
- Modify: `app/InferenceSystemsEmbedded.tsx`
- Modify: `app/InferenceSystemsEmbedded.en.tsx`
- Modify as evidence requires: `app/CutlassCuteEmbedded.tsx`
- Modify as evidence requires: `app/CutlassCuteEmbedded.en.tsx`
- Test: `tests/curriculum-2026.test.mjs`
- Test: `tests/whole-plan-final-fix.test.mjs`

**Interfaces:**
- Consumes: `CurriculumSource`, module `sourceId` references, and existing `Maturity` values `core | current | preview`.
- Produces: registry records verified on `2026-09-04` and feature-level maturity descriptions that match official documentation.

- [ ] **Step 1: Revalidate every source URL**

Extract literal HTTPS URLs from `app/atlas/curriculum-sources.ts` and request each one with redirects enabled. Expected: every real first-party URL returns a successful final response; any unavailable source is replaced only by the corresponding vendor's official current documentation.

- [ ] **Step 2: Update the registry date and current feature records**

Change the `verifiedAt` literal type and every record from `2026-08-29` to `2026-09-04`. Keep Gluon and PyTorch GQA as preview/experimental. Update vLLM context-parallel and online-quantization records so feature maturity is granular rather than applying one label to an entire subsystem.

- [ ] **Step 3: Update visible release-radar and systems language**

Use `04.09.2026` in Turkish and `September 4, 2026` in English. State that decode context parallel is supported while prefill approaches remain under active development. Describe online MXFP4 support as documented but backend-, hardware-, and quality-dependent. Keep CUTLASS Rubin material explicitly preliminary where the Operator API or toolchain remains preview.

- [ ] **Step 4: Run curriculum tests**

Run:

```bash
node --test tests/curriculum-2026.test.mjs tests/whole-plan-final-fix.test.mjs
```

Expected: all source IDs resolve, all verification dates equal `2026-09-04`, and maturity/applicability assertions pass.

- [ ] **Step 5: Commit the evidence refresh**

Run:

```bash
git add app/atlas/curriculum-sources.ts app/KernelForgeEmbedded.tsx app/KernelForgeEmbedded.en.tsx app/InferenceSystemsEmbedded.tsx app/InferenceSystemsEmbedded.en.tsx app/CutlassCuteEmbedded.tsx app/CutlassCuteEmbedded.en.tsx tests/curriculum-2026.test.mjs tests/whole-plan-final-fix.test.mjs
git commit -m "docs: refresh GPU ecosystem evidence"
```

### Task 5: Fix heading focus presentation and simulated metric labels

**Files:**
- Modify: `app/globals.css`
- Modify: `app/PyTorchTritonEmbedded.tsx`
- Modify: `app/PyTorchTritonEmbedded.en.tsx`
- Test: `tests/whole-plan-final-fix.test.mjs`
- Test: `tests/e2e/atlas.spec.ts`

**Interfaces:**
- Consumes: `ModuleFrame`'s existing `headingRef.current?.focus({ preventScroll: true })` behavior and the existing lab result markup.
- Produces: quiet focus for the `tabIndex={-1}` heading, unchanged focus visibility for controls, and explicit simulated-result labels in both locales.

- [ ] **Step 1: Add the heading focus rule**

Add next to `.module-hero h1`:

```css
.module-hero h1:focus { outline: none; }
```

Do not add a global outline reset. Leave existing `:focus-visible` rules for controls and focusable regions unchanged.

- [ ] **Step 2: Label sample Triton output**

Add a visible result note adjacent to the `18.7 µs` and bandwidth output:

```tsx
<small className="simulation-label">Temsili simülasyon çıktısı · cihazınızda ölçülmedi</small>
```

```tsx
<small className="simulation-label">Illustrative simulation output · not measured on your device</small>
```

Style the label through the existing `.pytorch-triton-surface` token system.

- [ ] **Step 3: Add the browser regression**

After opening a module, assert that the heading is focused and has no visible outline while a keyboard-focused interactive control still has a visible focus treatment:

```ts
test("module navigation announces the heading without a cosmetic browser outline", async ({ page }) => {
  await page.goto("/en/");
  await page.getByTestId("atlas-module-triton").click();
  const title = page.getByTestId("atlas-module-title");
  await expect(title).toBeFocused();
  expect(await title.evaluate((node) => getComputedStyle(node).outlineStyle)).toBe("none");
});
```

- [ ] **Step 4: Run focused tests**

Run:

```bash
node --test tests/whole-plan-final-fix.test.mjs
npx playwright test tests/e2e/atlas.spec.ts --grep "module navigation announces"
```

Expected: both pass, and existing scroller/control focus tests remain unaffected.

- [ ] **Step 5: Commit the presentation fix**

Run:

```bash
git add app/globals.css app/pytorch-triton.css app/PyTorchTritonEmbedded.tsx app/PyTorchTritonEmbedded.en.tsx tests/whole-plan-final-fix.test.mjs tests/e2e/atlas.spec.ts
git commit -m "fix: clarify simulated metrics and heading focus"
```

### Task 6: Run complete local and rendered validation

**Files:**
- Validate only; modify failing implementation or regression files from Tasks 1–5 if a defect is found.

**Interfaces:**
- Consumes: the integrated application and all existing validation scripts.
- Produces: a clean, deployable `out/` artifact and recorded desktop/mobile evidence.

- [ ] **Step 1: Run the full local validation contract**

Run:

```bash
npm run validate:codex
```

Expected: listener cleanup, lint, production build, all Node contracts, Azure artifact validation, and diff check pass.

- [ ] **Step 2: Run the complete browser suite**

Run:

```bash
npm run test:e2e
```

Expected: every Playwright test passes with no retries hiding a persistent failure.

- [ ] **Step 3: Start the checkout-owned preview**

Run:

```bash
npm run dev:codex
```

Expected: the verified listener owns `127.0.0.1:5173` and its PID cwd is this checkout.

- [ ] **Step 4: Inspect the rendered product in the Codex in-app browser**

Check `/` and `/en/`, overview plus all twelve modules, desktop and approximately 390-pixel mobile viewports. Exercise search, locale switching, progress, drawer, module navigation, representative lab controls, and external source links. Record `document.documentElement.scrollWidth === document.documentElement.clientWidth` and an empty error log for each page state.

- [ ] **Step 5: Stop the preview and verify repository scope**

Run:

```bash
npm run stop:local
git diff --check
git status --short --branch
```

Expected: port 5173 is free; only deliberate commits plus the pre-existing user-owned untracked documents remain.

### Task 7: Push, deploy, and correlate production evidence

**Files:**
- No source edits expected.
- Use: `.github/workflows/deploy-swa-gpu-aserdargun-com.yml`

**Interfaces:**
- Consumes: clean verified `main`, GitHub remote, existing deployment secret, and `swa-gpu-aserdargun-com`.
- Produces: one pushed production SHA and correlated GitHub/Azure/HTTP/browser evidence for that same SHA.

- [ ] **Step 1: Perform the last remote race check**

Run:

```bash
git fetch origin main
git log --oneline HEAD..origin/main
git status --short --branch
```

Expected: `HEAD..origin/main` is empty. If it is not, stop and integrate the new remote commits before pushing.

- [ ] **Step 2: Push the verified main branch once**

Run:

```bash
git push origin main
```

Expected: a fast-forward update and exactly one push-triggered production workflow run.

- [ ] **Step 3: Monitor the authoritative workflow**

Resolve the run for the pushed SHA with `gh run list`, then wait with `gh run watch <run-id> --exit-status`. Expected: build, test, artifact verification, and Azure deployment all succeed.

- [ ] **Step 4: Verify Azure and HTTP delivery**

Confirm the Azure default environment is `Ready`, source branch is `main`, and its update time follows the workflow. Request the Azure-generated hostname and `https://gpu.aserdargun.com` for `/`, `/en/`, versioned CSS/JS, favicon SVG, icon PNGs, and social cards. Expected: successful HTTPS responses and correct HTML, CSS, JavaScript, SVG, and PNG MIME types.

- [ ] **Step 5: Verify production interaction in the Codex in-app browser**

Open the custom domain in desktop and mobile sizes. Verify title/favicon, TR/EN navigation, search, module navigation, focus behavior, drawer, progress, no page-level overflow, and no console errors.

- [ ] **Step 6: Record final convergence**

Run:

```bash
git fetch origin main
git rev-parse HEAD
git rev-parse origin/main
git status --short --branch
```

Expected: local `HEAD` equals `origin/main`, the workflow deployed that SHA, Azure is ready, live checks pass, and the only remaining untracked files are the user-owned documents that predated this refresh.
