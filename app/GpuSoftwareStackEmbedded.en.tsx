"use client";

import { useMemo, useState } from "react";

type TrackKey = "rocm" | "mlir" | "tensorrt";

const tracks = {
  rocm: {
    eyebrow: "01 / GPU PROGRAMMING",
    title: "ROCm & HIP",
    intro:
      "Learn how to write kernels, memory hierarchy, and a CUDA-like execution model on AMD GPUs via HIP.",
    accent: "#ff6b35",
    stats: [
      ["Abstraction", "Runtime + kernel language"],
      ["Target", "AMD / NVIDIA*"],
      ["Output", "GPU duo + host code"],
    ],
    steps: [
      {
        label: "Host",
        code: "C++",
        detail:
          "The CPU selects the device, allocates memory, moves data, and manages the kernel launch sequence.",
      },
      {
        label: "Grid",
        code: "dim3",
        detail:
          "The job is divided into a grid of blocks. Consider problem size and execution geometry separately.",
      },
      {
        label: "Kernel",
        code: "__global__",
        detail:
          "Each thread executes the same kernel code with a different index; bounds checking is the first correctness gate.",
      },
      {
        label: "Memory",
        code: "HBM → LDS",
        detail:
          "Global memory provides high capacity, while LDS/shared memory provides a low-latency shared workspace. Access patterns are decisive.",
      },
      {
        label: "Sync",
        code: "barrier",
        detail:
          "Manage dependencies within a block with barriers. Handle global synchronization between blocks at kernel boundaries.",
      },
    ],
    code: `__global__ void saxpy(float a, const float* x,
                       float* y, int n) {
  int i = blockIdx.x * blockDim.x + threadIdx.x;
  if (i < n) y[i] = a * x[i] + y[i];
}

int blocks = (n + 255) / 256;
hipLaunchKernelGGL(saxpy, dim3(blocks), dim3(256),
                   0, 0, 2.0f, x, y, n);`,
    note: "* HIP source portability depends on the APIs and dependencies used; performance portability is not automatic.",
    pitfalls: ["Uncoalesced access", "Wavefront divergence", "Unnecessary host-device copies", "Missing error checks"],
  },
  mlir: {
    eyebrow: "02 / COMPILER INFRASTRUCTURE",
    title: "Compiler & MLIR",
    intro:
      "Reduce high-level tensor intent into target code with rewritable dialects and pass pipelines.",
    accent: "#b7f000",
    stats: [
      ["Abstraction", "Multi-level IR"],
      ["Target", "CPU/GPU/accelerator"],
      ["Output", "Lowered target IR"],
    ],
    steps: [
      {
        label: "Frontend",
        code: "AST/Graph",
        detail:
          "The source language or model graph is translated into MLIR operations without losing its semantics.",
      },
      {
        label: "Dialect",
        code: "linalg/tensor",
        detail:
          "A dialect defines operations, types, and attributes. The right abstraction level preserves the optimization space.",
      },
      {
        label: "Transform",
        code: "tile + fuse",
        detail:
          "Passes such as tiling, fusion, canonicalization and vectorization perform controlled transformations on IR.",
      },
      {
        label: "Lowering",
        code: "scf → gpu",
        detail:
          "Dialect conversion legalizes high-level operations into lower-level operations that are closer to the target.",
      },
      {
        label: "Backend",
        code: "LLVM/ROCDL",
        detail:
          "The final representation is translated through target paths such as LLVM, NVVM, ROCDL, or SPIR-V toward machine code.",
      },
    ],
    code: `module {\n  func.func @matmul(%a: tensor<128x64xf32>,\n                    %b: tensor<64x128xf32>)\n      -> tensor<128x128xf32> {\n    %init = tensor.empty() : tensor<128x128xf32>\n    %c = linalg.matmul\n      ins(%a, %b : tensor<128x64xf32>, tensor<64x128xf32>)\n      outs(%init : tensor<128x128xf32>)\n    return %c : tensor<128x128xf32>\n  }\n}`, 
    note: "MLIR is not a single IR. It is infrastructure for managing gradual transformations between dialects. Pass order is a design decision for both legality and performance.",
    pitfalls: ["Lowering too early", "Undefined pass contracts", "Skipping IR verification", "Ignoring the target cost model"],
  },
  tensorrt: {
    eyebrow: "03 / INFERENCE OPTIMIZATION",
    title: "TensorRT",
    intro:
      "Convert a trained model into an engine optimized for low latency and high throughput on NVIDIA GPUs.",
    accent: "#7c8cff",
    stats: [
      ["Abstraction", "Model graph + runtime"],
      ["Target", "NVIDIA GPU"],
      ["Output", "Serialized engine"],
    ],
    steps: [
      {
        label: "Import",
        code: "ONNX",
        detail:
          "The model graph is parsed. Unsupported operations may require plugins or graph rewrites.",
      },
      {
        label: "Analyze",
        code: "shape + layer",
        detail:
          "Builder evaluates layers, dimensions, precision constraints, and workspace.",
      },
      {
        label: "Optimize",
        code: "fusion + tactics",
        detail:
          "Layers are fused, and candidate kernels or tactics are selected by profiling the target hardware.",
      },
      {
        label: "Build",
        code: "engine.plan",
        detail:
          "The selected tactics become a serialized engine. Treat the target environment and version as part of the engine contract.",
      },
      {
        label: "Execute",
        code: "enqueueV3",
        detail:
          "The execution context launches asynchronous inference with the actual input shapes and buffer addresses.",
      },
    ],
    code: `config = builder.create_builder_config()\nprofile = builder.create_optimization_profile()\nprofile.set_shape("tokens",\n                  min=(1, 8), opt=(4, 128), max=(8, 512))\nconfig.add_optimization_profile(profile)\n\nserialized = builder.build_serialized_network(network, config)\nengine = runtime.deserialize_cuda_engine(serialized)\ncontext = engine.create_execution_context()`,
    note: "The min/opt/max range for dynamic shapes is a performance contract, not an API detail. Measure it against the real traffic distribution.",
    pitfalls: ["Wrong optimization shape", "Looking at P50 and missing P99", "Not measuring accuracy loss", "Assuming engine portability"],
  },
} as const;

const glossary = [
  ["Wavefront", "A group of threads that execute the same instruction together on an AMD GPU."],
  ["Occupancy", "The fraction of waves or warps that can be active on a compute unit or SM; it is not a performance metric by itself."],
  ["Dialect", "A dictionary of operations, types, and attributes of a particular field within MLIR."],
  ["Lowering", "The process of transforming a representation into a lower-level form that is closer to the target."],
  ["Legality", "A set of rules regarding which operations are allowed at the end of dialect conversion."],
  ["Tactic", "The implementation option that TensorRT builder evaluates to execute a layer or fusion."],
  ["Engine", "The inference plan that TensorRT optimizes and serializes for the target runtime."],
  ["Optimization profile", "Accepted min/opt/max shape range for dynamic inputs."],
  ["Arithmetic intensity", "The amount of computation performed per byte transferred; one of the main axes of roofline analysis."],
  ["Fusion", "Combining operations into one execution region to reduce buffer traffic and launch overhead."],
] as const;

const choiceMap = {
  kernel: {
    tag: "Starting point: ROCm / HIP",
    title: "Make kernel behavior visible",
    body: "First, set up indexing, memory access and synchronization correctly. Then test bandwidth, occupancy and divergence hypotheses with profiler.",
  },
  compiler: {
    tag: "Starting point: MLIR",
    title: "Design the transformation at the IR level",
    body: "Keep source semantics in the appropriate dialect, determine pass contracts, and manage lowering limits with the target cost model.",
  },
  inference: {
    tag: "Starting point: TensorRT",
    title: "Work backward from service SLO",
    body: "Fix the real shape distribution, batch policy, and accepted accuracy tolerance. Build and measure the engine against that contract.",
  },
} as const;

export default function GpuSoftwareStackEmbedded() {
  const [activeTrack, setActiveTrack] = useState<TrackKey>("rocm");
  const [activeStep, setActiveStep] = useState(0);
  const [choice, setChoice] = useState<keyof typeof choiceMap>("kernel");
  const [precision, setPrecision] = useState("FP16");
  const [shapeMode, setShapeMode] = useState("Static");
  const [fusion, setFusion] = useState(true);
  const [query, setQuery] = useState("");

  const track = tracks[activeTrack];
  const decision = choiceMap[choice];
  const filteredGlossary = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("en-US");
    if (!normalized) return glossary;
    return glossary.filter(([term, description]) =>
      `${term} ${description}`.toLocaleLowerCase("en-US").includes(normalized),
    );
  }, [query]);

  function selectTrack(key: TrackKey) {
    setActiveTrack(key);
    setActiveStep(0);
  }

  return (
    <main className="gpu-software-stack-embed">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Kernel Atlas home page">
          <span className="brand-mark" aria-hidden="true">K</span>
          <span>KERNEL ATLAS</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#map">Map</a>
          <a href="#workbench">Workbench</a>
          <a href="#roadmap">Route</a>
          <a href="#glossary">Glossary</a>
        </nav>
        <a className="header-cta" href="#workbench">Start exploring <span>↘</span></a>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="kicker"><span /> GPU SYSTEMS / FIELD GUIDE</div>
          <h1>Look inside the<br /><em>GPU software stack.</em></h1>
          <p className="hero-lead">
            Learn three critical layers, from the kernel code to the compiler IR to the optimized inference engine, in one interactive atlas.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#map">Open the system map <span>↓</span></a>
            <a className="text-link" href="#roadmap">See the learning route <span>→</span></a>
          </div>
          <div className="hero-meta">
            <span><b>3</b> areas of expertise</span>
            <span><b>15</b> architectural steps</span>
            <span><b>1</b> unified mental model</span>
          </div>
        </div>

        <div className="stack-visual" aria-label="GPU software stack diagram">
          <div className="visual-topline"><span>STACK / 001</span><span className="live-dot">LIVE MODEL</span></div>
          <div className="stack-grid">
            <div className="stack-layer layer-app">
              <span className="layer-index">L3</span>
              <div><small>INFERENCE</small><strong>TensorRT</strong><p>Graph · Precision · Engine</p></div>
              <b>TRT</b>
            </div>
            <div className="flow-mark">↓ <span>optimized graph</span></div>
            <div className="stack-layer layer-compiler">
              <span className="layer-index">L2</span>
              <div><small>COMPILER</small><strong>MLIR</strong><p>Dialect · Pass · Lowering</p></div>
              <b>IR</b>
            </div>
            <div className="flow-mark">↓ <span>target specific code</span></div>
            <div className="stack-layer layer-runtime">
              <span className="layer-index">L1</span>
              <div><small>RUNTIME + KERNEL</small><strong>ROCm/HIP</strong><p>Grid · Memory · Synchronize</p></div>
              <b>GPU</b>
            </div>
          </div>
          <div className="signal-row">
            {[18, 42, 30, 68, 54, 86, 40, 72, 48, 62, 36, 80, 55, 91, 46].map((height, i) => (
              <i key={i} style={{ height: `${height}%` }} />
            ))}
          </div>
          <div className="visual-footer"><span>DATA MOVEMENT</span><span>→</span><span>EXECUTION</span><span>→</span><span>MEASUREMENT</span></div>
        </div>
      </section>

      <section className="decision-strip" aria-labelledby="decision-title">
        <div className="section-label">00 / STARTING POINT</div>
        <div className="decision-grid">
          <div>
            <h2 id="decision-title">What are you<br />optimizing today?</h2>
            <div className="segmented" role="group" aria-label="Optimization target">
              {([
                ["kernel", "Kernel"], ["compiler", "Compiler"], ["inference", "Inference"],
              ] as const).map(([key, label]) => (
                <button key={key} className={choice === key ? "active" : ""} onClick={() => setChoice(key)}>{label}</button>
              ))}
            </div>
          </div>
          <div className="decision-output" aria-live="polite">
            <span>{decision.tag}</span>
            <h3>{decision.title}</h3>
            <p>{decision.body}</p>
            <a href="#workbench" onClick={() => selectTrack(choice === "kernel" ? "rocm" : choice === "compiler" ? "mlir" : "tensorrt")}>Open the relevant module <b>↗</b></a>
          </div>
        </div>
      </section>

      <section className="map-section" id="map">
        <div className="section-heading">
          <div><div className="section-label">01 / AREA MAP</div><h2>Three layers.<br /><em>One system.</em></h2></div>
          <p>Each technology solves a different problem. Taken together, they form an end-to-end optimization chain from high-level model intent to actual GPU execution.</p>
        </div>
        <div className="track-cards">
          {(Object.keys(tracks) as TrackKey[]).map((key, index) => {
            const item = tracks[key];
            return (
              <article key={key} className={`track-card card-${key}`}>
                <div className="card-top"><span>0{index + 1}</span><span className="card-symbol" aria-hidden="true">{key === "rocm" ? "⌁" : key === "mlir" ? "◇" : "▱"}</span></div>
                <div className="card-tag">{item.eyebrow.split(" / ")[1]}</div>
                <h3>{item.title}</h3>
                <p>{item.intro}</p>
                <ul>
                  {item.stats.map(([label, value]) => <li key={label}><span>{label}</span><b>{value}</b></li>)}
                </ul>
                <a href="#workbench" onClick={() => selectTrack(key)}>Open the module <span>↘</span></a>
              </article>
            );
          })}
        </div>
      </section>

      <section className="workbench" id="workbench">
        <div className="workbench-header">
          <div><div className="section-label light">02 / INTERACTIVE WORKBENCH</div><h2>Take a pipeline<br />apart.</h2></div>
          <div className="track-tabs" role="tablist" aria-label="Technology modules">
            {(Object.keys(tracks) as TrackKey[]).map((key) => (
              <button key={key} role="tab" aria-selected={activeTrack === key} onClick={() => selectTrack(key)}>
                <span style={{ background: tracks[key].accent }} />{tracks[key].title}
              </button>
            ))}
          </div>
        </div>

        <div className="track-intro" style={{ "--track-accent": track.accent } as React.CSSProperties}>
          <div><span>{track.eyebrow}</span><h3>{track.title}</h3><p>{track.intro}</p></div>
          <div className="stat-pills">{track.stats.map(([label, value]) => <span key={label}><small>{label}</small>{value}</span>)}</div>
        </div>

        <div className="pipeline-panel" style={{ "--track-accent": track.accent } as React.CSSProperties}>
          <div className="pipeline-steps" role="tablist" aria-label={`${track.title} pipeline steps`}>
            {track.steps.map((step, index) => (
              <button key={step.label} role="tab" aria-selected={activeStep === index} onClick={() => setActiveStep(index)}>
                <span>0{index + 1}</span><strong>{step.label}</strong><code>{step.code}</code>
              </button>
            ))}
          </div>
          <div className="step-detail" aria-live="polite">
            <div className="detail-number">0{activeStep + 1}</div>
            <div><span>SELECTED STEP</span><h4>{track.steps[activeStep].label}</h4><p>{track.steps[activeStep].detail}</p></div>
          </div>
        </div>

        <div className="code-and-risks">
          <div className="code-window">
            <div className="code-titlebar"><span><i /><i /><i /></span><b>{activeTrack === "rocm" ? "saxpy.hip" : activeTrack === "mlir" ? "matmul.mlir" : "build_engine.py"}</b><span>READ ONLY</span></div>
            <pre><code>{track.code}</code></pre>
          </div>
          <aside className="risk-panel">
            <span>FIELD NOTES</span>
            <h4>Common failure points</h4>
            <ol>{track.pitfalls.map((pitfall, index) => <li key={pitfall}><span>0{index + 1}</span>{pitfall}</li>)}</ol>
            <p className="field-note">{track.note}</p>
          </aside>
        </div>
      </section>

      <section className="compare-section">
        <div className="section-heading compact">
          <div><div className="section-label">03 / DECISION MATRIX</div><h2>Use the right tool<br /><em>at the right layer.</em></h2></div>
          <p>These tools are not alternatives to each other. Locating the problem moves the optimization effort to the correct level of abstraction.</p>
        </div>
        <div className="comparison-table" role="table" aria-label="Technology comparison">
          <div className="comparison-row comparison-head" role="row"><span>COMPARE</span><b>ROCm/HIP</b><b>MLIR</b><b>TensorRT</b></div>
          {[
            ["Main question", "How does the kernel execute?", "How does the code transform?", "How is the model served?"],
            ["Control surface", "Thread, memory, stream", "IR, dialect, pass", "Graph, precision, profile"],
            ["Primary measurement", "Bandwidth / kernel time", "IR quality / compile time", "Latency / throughput"],
            ["Failure mode", "Race / invalid access", "Illegal IR / miscompile", "Unsupported op / accuracy drift"],
            ["Starting artifact", ".hip / C++ source", "Dialect or frontend IR", "ONNX / network definition"],
          ].map((row) => <div className="comparison-row" role="row" key={row[0]}>{row.map((cell, i) => i === 0 ? <span key={cell}>{cell}</span> : <b key={cell}>{cell}</b>)}</div>)}
        </div>
      </section>

      <section className="lab-section" aria-labelledby="lab-title">
        <div className="lab-copy">
          <div className="section-label light">04 / OPTIMIZATION LAB</div>
          <h2 id="lab-title">Performance is not<br />a single <em>setting.</em></h2>
          <p>Every optimization carries an assumption. See how the measurement plan of your TensorRT scenario changes with the selections below.</p>
          <div className="lab-controls">
            <label>Precision
              <select value={precision} onChange={(e) => setPrecision(e.target.value)}><option>FP32</option><option>FP16</option><option>INT8</option></select>
            </label>
            <label>Shape
              <select value={shapeMode} onChange={(e) => setShapeMode(e.target.value)}><option>Static</option><option>Dynamic</option></select>
            </label>
            <div className="toggle-label"><span>Fusion</span>
              <button className={`toggle ${fusion ? "on" : ""}`} role="switch" aria-checked={fusion} onClick={() => setFusion(!fusion)}><span /></button>
            </div>
          </div>
        </div>
        <div className="lab-output" aria-live="polite">
          <div className="lab-screen-top"><span>MEASUREMENT PLAN</span><span>SCENARIO / A</span></div>
          <div className="metric-grid">
            <div><span>PRIORITY METRIC</span><strong>{shapeMode === "Dynamic" ? "P99 latency by shape" : "Latency + throughput"}</strong></div>
            <div><span>VALIDATION GATE</span><strong>{precision === "INT8" ? "Calibration + task metric" : precision === "FP16" ? "FP32 parity check" : "Reference output difference"}</strong></div>
            <div><span>PROFILE DESIGN</span><strong>{shapeMode === "Dynamic" ? "Min/opt/max sets" : "Single shape, real batch"}</strong></div>
            <div><span>GRAPH CONTROL</span><strong>{fusion ? "Validate fused layers" : "Measure intermediate tensor traffic"}</strong></div>
          </div>
          <div className="lab-warning"><b>!</b><p><strong>This is not a performance estimate.</strong> It is not reliable to produce a speedup percentage without hardware, model, shape distribution and runtime conditions.</p></div>
        </div>
      </section>

      <section className="roadmap" id="roadmap">
        <div className="section-heading">
          <div><div className="section-label">05 / LEARNING ROUTE</div><h2>A route for producing,<br /><em>not just reading.</em></h2></div>
          <p>Close each stage with a measurable artifact. Durations are approximate study blocks; real progress is determined by accuracy and profile evidence.</p>
        </div>
        <div className="roadmap-grid">
          {[
            ["01", "Foundations", "6–8 hours", "GPU execution model", "SAXPY + correctness test", ["grid/block/thread", "memory lifecycle", "synchronization"]],
            ["02", "Kernel", "10–14 hours", "HIP optimization cycle", "Naive → tiled matmul", ["coalescing", "LDS usage", "profiler hypothesis"]],
            ["03", "Compiler", "12–16 hours", "MLIR conversion line", "Special pass + IR test", ["dialect design", "rewrite pattern", "partial lowering"]],
            ["04", "Inference", "10–14 hours", "TensorRT deployment", "Measured engine report", ["ONNX review", "dynamic profile", "accuracy/latency gate"]],
          ].map(([num, tag, duration, title, artifact, bullets]) => (
            <article className="roadmap-card" key={num as string}>
              <div><span>{num as string}</span><b>{tag as string}</b><small>{duration as string}</small></div>
              <h3>{title as string}</h3>
              <p><span>EXIT ARTIFACT</span>{artifact as string}</p>
              <ul>{(bullets as string[]).map((bullet) => <li key={bullet}>↳ {bullet}</li>)}</ul>
            </article>
          ))}
        </div>
      </section>

      <section className="glossary-section" id="glossary">
        <div className="glossary-head">
          <div><div className="section-label light">06 / QUICK GLOSSARY</div><h2>Find the term.<br />Set the context.</h2></div>
          <label className="search-box"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="wavefront, lowering, tactic..." aria-label="Search the glossary" /><small>{filteredGlossary.length} RESULTS</small></label>
        </div>
        <div className="glossary-list">
          {filteredGlossary.map(([term, description], index) => (
            <article key={term}><span>{String(index + 1).padStart(2, "0")}</span><h3>{term}</h3><p>{description}</p></article>
          ))}
          {filteredGlossary.length === 0 && <p className="empty-state">There are no terms matching this search.</p>}
        </div>
      </section>

      <footer>
        <div className="footer-brand"><span className="brand-mark">K</span><div><b>KERNEL ATLAS</b><p>Learn GPU systems layer by layer.</p></div></div>
        <div className="footer-sources">
          <span>PRIMARY SOURCES</span>
          <a href="https://rocm.docs.amd.com/projects/HIP/en/develop/index.html" target="_blank" rel="noreferrer">AMD HIP Docs ↗</a>
          <a href="https://mlir.llvm.org/docs/" target="_blank" rel="noreferrer">LLVM MLIR Docs ↗</a>
          <a href="https://docs.nvidia.com/deeplearning/tensorrt/latest/" target="_blank" rel="noreferrer">NVIDIA TensorRT Docs ↗</a>
        </div>
        <div className="footer-note"><span>NOTES</span><p>Performance claims must be verified with hardware, data, and measurement method.</p></div>
      </footer>
    </main>
  );
}
