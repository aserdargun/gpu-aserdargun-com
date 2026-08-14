# GPU Kernel Engineering — Kernel Atlas

A bilingual Turkish/English interactive learning atlas for a 12-week GPU kernel engineering track. It brings CUDA, Triton, GPU memory, LLM operators, correctness, profiling, CUTLASS, inference, multi-GPU systems, and the wider GPU software stack into one application.

## Highlights

- Turkish and English UI with a visible `TR / EN` switch
- Browser-language detection, shareable `?lang=tr` and `?lang=en` URLs, and a saved local preference
- 11 interactive learning atlases and a 12-week roadmap
- Device-local completion tracking
- Responsive, keyboard-accessible controls
- Localized document language, page copy, search behavior, number formatting, accessibility labels, and social metadata

## Run locally

Requires Node.js `>=22.13.0`.

```bash
npm install
npm run dev
```

Open the local URL shown by the development server. To build and validate the production bundle:

```bash
npm test
```

Codex actions use `127.0.0.1:5173` through `npm run dev:codex`,
`npm run validate:codex`, and `npm run stop:local`. Stop only terminates a
listener whose working directory belongs to this checkout.

## Deployment

The project uses the Sites-compatible vinext runtime. For Azure Static Web Apps,
`npm run build:azure` snapshots the rendered application and versioned client
assets into the prebuilt `out/` directory; `npm run verify:azure` validates the
artifact. Hosting metadata is stored in `.openai/hosting.json`; no secrets are
committed.

Live site: [gpu-kernel-engineering-atlas.aserdargun.chatgpt.site](https://gpu-kernel-engineering-atlas.aserdargun.chatgpt.site/)
