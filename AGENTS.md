# GPU working contract

- Build the GPU Kernel Engineering atlas — a 12-week bilingual (tr/en) interactive learning site for CUDA, Triton, GPU memory, LLM operators, correctness, profiling, inference, and multi-GPU systems.
- Source of truth lives in `app/` (Next.js 16 + vinext routes and curriculum content), `tools/` (build, validation, and deploy scripts), and `tests/` (handoff gates). Code samples are illustrative teaching artifacts; no secrets, no real GPU execution in-browser.
- Public lesson copy, code examples, and lab walkthroughs are observer outputs rendered to readers. Build tooling, validation scripts, and Azure SWA hosting config are internal decision inputs.
- Behavior, experiment, world, simulation, metric, and export schema versions are explicit. Update affected versions when semantics change.
- Every build snapshot is versioned into `out/` with `staticwebapp.config.json`; `npm run verify:azure` validates the artifact. Reject invalid or unsupported builds.
- Keep Turkish and English controls and explanations equivalent. Label model assumptions and simulation units.
- Verify `npm run validate:codex` and review `git diff --check` before handoff.
- Local work only unless the user authorizes external publication. Preserve unrelated work and processes.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
