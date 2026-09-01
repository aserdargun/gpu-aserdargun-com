# GPU Kernel Engineering — Kernel Atlas

A bilingual Turkish/English interactive learning atlas for a 12-week GPU kernel engineering track. It brings visual GPU foundations, CUDA, Triton, GPU memory, LLM operators, correctness, profiling, CUTLASS, inference, multi-GPU systems, and the wider GPU software stack into one application.

## Highlights

- Turkish and English UI with a visible `TR / EN` switch
- Canonical shareable locale paths: Turkish at `/` and English at `/en/`; after hydration, bare `/` safely applies the saved locale first and browser language second through a full-path navigation
- A shared atlas shell: overview, architecture matrix, maturity context, desktop rail, and accessible mobile drawer
- Architecture context for Ada / SM89, Hopper / SM90, Blackwell / SM100 and SM120, plus clearly labeled Rubin / SM107 preview material
- `Core`, `Current`, and `Preview` maturity labels, with architecture and backend applicability kept separate from document freshness
- Search across localized titles, summaries, tags, architectures, and maturity labels, including a localized empty state and clear action
- 12 interactive learning atlases, a bilingual Concept Studio in every module, and the 12-week roadmap
- Explicit device-local completion tracking and a `Continue` action that resumes the last selected module
- Responsive, keyboard-accessible controls, including drawer backdrop, Escape close, and focus return
- Localized document language, page copy, search behavior, number formatting, accessibility labels, and social metadata

## Shell and local state

The atlas shell owns navigation, search, locale selection, overview progress, and
module switching. Each module retains its specialist laboratory body inside the
shared product frame.

Progress is intentionally stored only in this browser on this device: locale,
completed module IDs, and the last visited module use local storage. Malformed
or obsolete stored values are safely ignored. There is no backend, account,
analytics, cloud storage, synchronization, or cross-device progress sharing.
The server-rendered and static bare root always stays Turkish for crawlers. In a
browser, an explicit `/en/` path wins; only a bare `/` without a legacy locale
query consults the stored preference and then the browser language after
hydration, redirecting the whole document to `/en/` when English is preferred.

The twelve laboratories are unified under one shared `main`/`h1` atlas frame.
Each laboratory keeps its specialist body with scoped CSS, plus verified
accessibility, responsive behavior, and overflow safeguards. The twelve-lab
and 12-week learning contract remains unchanged.

## Evidence and maturity policy

- **Core** is hardware-generation-independent skill and evidence required for completion.
- **Current** is supported by fresh first-party evidence; architecture and backend applicability are verified separately.
- **Preview** is an exploration path dependent on toolchain or hardware maturity. It is not a graduation requirement.

First-party sources are refreshed before publication. Documentation freshness,
feature maturity, and architecture/backend applicability are evaluated
separately. Interactive laboratories are educational simulations: they do not
claim measured hardware results or promise access to the newest hardware.

## Setup

Requires Node.js `>=22.13.0`.

```bash
npm install
```

## Run

```bash
npm run dev
```

Open the local URL shown by the development server. Codex checks use the
checkout-owned listener at `127.0.0.1:5173`:

```bash
npm run dev:codex
```

## Validate

To build and validate the production bundle:

```bash
npm test
npm run validate:codex
```

`validate:codex` checks lint, the Azure build/artifact, and diff integrity.

## Stop

```bash
npm run stop:local
```

Stop only terminates a listener whose working directory belongs to this
checkout.

## Deployment

The project uses the Sites-compatible vinext runtime. For Azure Static Web Apps,
`npm run build:azure` snapshots the rendered application and versioned client
assets into the prebuilt `out/` directory; `npm run verify:azure` validates the
artifact. Hosting metadata is stored in `.openai/hosting.json`; no secrets are
committed.

Live site: [gpu.aserdargun.com](https://gpu.aserdargun.com/)
