# GPU Kernel Atlas Quality Refresh and Deployment Design

Date: 2026-09-04

## Purpose

Refresh the complete bilingual GPU Kernel Atlas without discarding either the local 2026 product redesign or the newer branding work on `origin/main`. Correct language and formatting defects, remove stale or overconfident technical claims, update official-source evidence, validate every atlas on desktop and mobile, and deploy the verified commit through the existing Azure Static Web Apps pipeline.

## Current State

- The local `main` contains the twelve-atlas 2026 redesign and is two commits ahead of its previous remote base.
- `origin/main` has advanced by eight commits with the standardized `GPU - GPU Kernel Engineering` title, favicon family, and related test updates.
- The branches therefore require a normal history-preserving merge. Force-pushing or replacing the remote branch is out of scope.
- User-owned untracked documents under `docs/superpowers/` must remain untouched unless they are explicitly selected for this work.
- The existing production path is GitHub `main` to the single `Deploy GPU Kernel Atlas to Azure` workflow and then to `swa-gpu-aserdargun-com`. The existing custom domain remains in place; this project does not modify DNS.

## Product and Content Design

### Preserve the existing product system

Keep the current visual identity, twelve-module information architecture, TR/EN locale routes, local progress state, module navigation, evidence panels, and responsive mobile drawer. Preserve the remote branding assets and title during branch reconciliation. This is a quality and currency refresh, not a new visual language or a new application shell.

### Language quality

Review every user-visible TR and EN string, including navigation, module introductions, labs, diagrams, evidence labels, status text, accessibility names, metadata, and validation messages.

For Turkish:

- correct direct spelling and grammar defects such as `saklayerek`, `çalıştırma’ın`, and `İlerleme yüzde`;
- use Turkish decimal formatting in prose where appropriate;
- remove apostrophes from inflected common technical nouns and prefer clear Turkish equivalents when they do not obscure an established API or product name;
- keep API names, identifiers, library names, instructions, and code literals unchanged;
- use consistent terms for concepts such as backend, warm-up, quantile, profiler, baseline, cache, prompt, batch, tile, thread, block, and serving.

TR and EN must remain semantically equivalent. A claim removed or qualified in one locale must receive the same treatment in the other.

### Evidence quality and freshness

Update the official-source registry verification date to 2026-09-04 after rechecking every referenced URL. Use first-party documentation and release notes for time-sensitive ecosystem statements.

The refresh must reflect these verified distinctions:

- CUDA and cuTile descriptions follow current NVIDIA documentation, including CUDA 13.3 and cuTile Python 1.5.0.
- CUTLASS and CuTe language distinguishes released support from previews and architecture-specific constraints.
- ROCm material follows the current ROCm 10.0.0 release notes.
- Triton Gluon remains explicitly experimental.
- PyTorch grouped-query attention remains experimental and backend-dependent.
- vLLM context parallel language distinguishes supported decode paths from prefill approaches that remain under active development.
- vLLM online quantization support is described with backend, hardware, and quality caveats rather than a single global maturity label.
- Nsight Compute and Compute Sanitizer references use their current release notes.
- NCCL facts remain tied to official NCCL release documentation.

Primary references:

- <https://docs.nvidia.com/cuda/>
- <https://docs.nvidia.com/cuda/cutile-python/generated/release_notes.html>
- <https://docs.nvidia.com/cutlass/latest/CHANGELOG.html>
- <https://rocm.docs.amd.com/en/latest/about/release-notes.html>
- <https://triton-lang.org/main/getting-started/tutorials/gluon/intro.html>
- <https://docs.pytorch.org/docs/main/generated/torch.nn.functional.scaled_dot_product_attention.html>
- <https://docs.vllm.ai/en/latest/serving/context_parallel_deployment/>
- <https://docs.vllm.ai/en/latest/features/quantization/online/>
- <https://docs.nvidia.com/nsight-compute/ReleaseNotes/>
- <https://docs.nvidia.com/compute-sanitizer/ReleaseNotes/index.html>
- <https://docs.nvidia.com/deeplearning/nccl/release-notes/>

### Performance-claim policy

Remove or rewrite naked multipliers and broad percentages such as `5–10×`, `2–3×`, and `~80%` unless the interface states the workload, hardware, software version, baseline, metric, and source. Educational illustrations may remain when labeled as illustrative or simulated rather than measured.

Replace categorical claims such as “always,” “never,” or one fixed instruction per cycle with scoped explanations. Correct misleading foundational language, including the description of an SM as a physical GPU core and universal claims about bank-conflict padding or stride behavior.

The PyTorch + Triton lab's sample latency and bandwidth values must visibly say that they are illustrative simulated outputs. They must not resemble a benchmark result produced on the viewer's machine.

## Interface and Accessibility

Keep programmatic focus on the module heading after navigation so screen-reader users receive the new page context. Remove the oversized native blue rectangle from the non-interactive heading and retain strong `:focus-visible` treatment for links, buttons, controls, and keyboard-focusable scrolling regions.

Polish the mobile drawer scrollbar only if it can be done within the existing token system without reducing discoverability or platform usability. No route, component hierarchy, spacing scale, typography family, or color-system redesign is required.

Desktop and mobile layouts must retain zero page-level horizontal overflow. Any intentionally scrollable code, timeline, table, or architecture region must remain keyboard reachable and accessibly named.

## Git Integration

1. Fetch and verify `origin/main` again immediately before integration.
2. Merge `origin/main` into the local `main` without force-pushing or rewriting published history.
3. Resolve conflicts by keeping the remote title/favicon asset family and the local 2026 Atlas shell, curriculum, and validation infrastructure.
4. Re-run branding and locale tests after conflict resolution.
5. Stage only files intentionally changed for this refresh. Preserve unrelated and user-owned untracked files.
6. Before pushing, fetch once more and stop if the remote branch has advanced again.

## Failure Handling

- A source that no longer resolves or contradicts a claim blocks that claim from publication; remove or qualify the claim instead of substituting an unverified secondary source.
- A merge conflict is resolved file by file. No destructive reset, force push, or blanket checkout is allowed.
- A language change that cannot be mirrored safely across TR and EN is incomplete and blocks deployment.
- Any failing lint, contract, build, artifact, accessibility, or browser check blocks the production push.
- A successful GitHub job alone is insufficient. Deployment is complete only after same-commit GitHub, Azure, HTTP/MIME, desktop/mobile interaction, and repository cleanliness evidence converge.
- Existing DNS and custom-domain records are read-only verification targets for this deployment.

## Verification Contract

Automated verification must include:

- lint and production build;
- Node contract tests and Azure artifact verification through `npm run validate:codex`;
- the full Playwright end-to-end suite;
- regression coverage for corrected Turkish strings, the refreshed evidence date, prohibited unqualified performance claims, TR/EN parity, and the module-heading focus treatment;
- `git diff --check` and a final status review.

Rendered verification in the Codex in-app browser must cover:

- the overview and all twelve modules in both locales;
- desktop and approximately 390-pixel-wide mobile viewports;
- module navigation, search, language switching, progress state, mobile drawer, interactive lab controls, and primary links;
- page width versus viewport width, focus behavior, and browser console errors.

## Deployment Contract

After all checks pass:

1. Commit the integrated refresh on `main`.
2. Fetch and confirm that the remote has not advanced.
3. Push `main` once, allowing the existing authoritative workflow to deploy the prebuilt `out/` artifact.
4. Monitor the exact GitHub Actions run to completion and record its commit SHA.
5. Confirm Azure's default environment is `Ready` for the same branch and updated time.
6. Verify the generated Azure hostname and `https://gpu.aserdargun.com` for HTTPS status, HTML, versioned JavaScript/CSS MIME types, favicon assets, locale routes, desktop/mobile interaction, and console health.
7. Confirm local `HEAD`, `origin/main`, the deployed workflow SHA, and a clean Git worktree agree.

## Acceptance Criteria

- All twelve modules and both locales have been reviewed.
- Identified spelling, grammar, terminology, numeric-format, and focus-presentation defects are corrected.
- Stale or unqualified technical claims are removed, scoped, or sourced.
- Official evidence metadata reflects the 2026-09-04 verification pass.
- Remote branding and local Atlas work both survive the merge.
- Automated and rendered validation pass without page-level overflow or console errors.
- The exact verified commit is deployed through the existing Azure workflow and is live on the default hostname and custom domain.
- DNS is unchanged and unrelated files remain preserved.
