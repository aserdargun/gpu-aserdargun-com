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
      ["Soyutlama", "Runtime + kernel language"],
      ["Hedef", "AMD / NVIDIA*"],
      ["Output", "GPU duo + host code"],
    ],
    steps: [
      {
        label: "Host",
        code: "C++",
        detail:
          "The CPU side selects the device, allocates memory, moves data, and manages the kernel initialization sequence.",
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
          "Each thread executes the same kernel code with different indexes; border control is the first gate of truth.",
      },
      {
        label: "Memory",
        code: "HBM → LDS",
        detail:
          "Global memory is a high capacity, LDS/shared memory is a low latency shared area. The access pattern is decisive.",
      },
      {
        label: "Senkron",
        code: "barrier",
        detail:
          "Manage dependencies within the Block with barriers; Consider global synchronization between blocks at the kernel boundary.",
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
    note: "* HIP resource portability depends on APIs and dependencies used; Performance portability is not automatic.",
    pitfalls: ["Uncoupled access", "Wavefront separation", "Unnecessary host-device copy", "Missing error checking"],
  },
  mlir: {
    eyebrow: "02 / COMPILER INFRASTRUCTURE",
    title: "Compiler & MLIR",
    intro:
      "Reduce high-level tensor intent into target code with rewritable dialects and pass pipelines.",
    accent: "#b7f000",
    stats: [
      ["Soyutlama", "Multi-level IR"],
      ["Hedef", "CPU/GPU/accelerator"],
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
          "Dialect; It is a dictionary of operations, types and attributes. The right level of abstraction preserves the optimization space.",
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
          "With dialect conversion, high-level operations are legalized into lower-level, closer-to-target operations.",
      },
      {
        label: "Backend",
        code: "LLVM/ROCDL",
        detail:
          "The final representation is translated into target paths such as LLVM, NVVM, ROCDL or SPIR-V, approximating machine code.",
      },
    ],
    code: `module {\n  func.func @matmul(%a: tensor<128x64xf32>,\n                    %b: tensor<64x128xf32>)\n      -> tensor<128x128xf32> {\n    %init = tensor.empty() : tensor<128x128xf32>\n    %c = linalg.matmul\n      ins(%a, %b : tensor<128x64xf32>, tensor<64x128xf32>)\n      outs(%init : tensor<128x128xf32>)\n    return %c : tensor<128x128xf32>\n  }\n}`, 
    note: "MLIR is not a single IR; It is an infrastructure that manages the gradual transformation between dialects. Pass order is a design decision for both legality and performance.",
    pitfalls: ["Lowering too early", "Indefinite pass contract", "Bypass IR verification", "Ignoring the target cost model"],
  },
  tensorrt: {
    eyebrow: "03 / INFERENCE OPTIMIZATION",
    title: "TensorRT",
    intro:
      "Converts the trained model into an engine optimized for low latency and high throughput on the NVIDIA GPU.",
    accent: "#7c8cff",
    stats: [
      ["Soyutlama", "Model graph + runtime"],
      ["Hedef", "NVIDIA GPU"],
      ["Output", "serialized engine"],
    ],
    steps: [
      {
        label: "Import",
        code: "ONNX",
        detail:
          "The model graph is decomposed; Unsupported operations may require plugins or graph rewrites.",
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
          "The layers are combined and candidate kernel/tactic options are selected by profiling the target hardware.",
      },
      {
        label: "Build",
        code: "engine.plan",
        detail:
          "Selections become a serialized engine. Manage Engine with target environment and version.",
      },
      {
        label: "Execute",
        code: "enqueueV3",
        detail:
          "The execution context initiates asynchronous extraction with the actual input shape and buffer addresses.",
      },
    ],
    code: `config = builder.create_builder_config()\nprofile = builder.create_optimization_profile()\nprofile.set_shape("tokens",\n                  min=(1, 8), opt=(4, 128), max=(8, 512))\nconfig.add_optimization_profile(profile)\n\nserialized = builder.build_serialized_network(network, config)\nengine = runtime.deserialize_cuda_engine(serialized)\ncontext = engine.create_execution_context()`,
    note: "The min/opt/max range for dynamic shape is a performance contract, not an API detail. Make the measurement with real traffic distribution.",
    pitfalls: ["Wrong optimization shape", "Looking at P50 and missing P99", "Not measuring accuracy loss", "Assuming engine portability"],
  },
} as const;

const glossary = [
  ["Wavefront", "The hardware execution unit of a group of threads that execute the same command together on an AMD GPU."],
  ["Occupancy", "Wave or warp rate that can be active on a compute unit / SM; It is not performance alone."],
  ["Dialect", "A dictionary of operations, types, and attributes of a particular field within MLIR."],
  ["Lowering", "The process of transforming a representation into a representation that is lower level or closer to the target."],
  ["Legality", "A set of rules regarding which operations are allowed at the end of dialect conversion."],
  ["Tactic", "The implementation option that TensorRT builder evaluates to execute a layer or fusion."],
  ["Engine", "The inference plan that TensorRT optimizes and serializes for the target runtime."],
  ["Optimization profile", "Accepted min/opt/max shape range for dynamic inputs."],
  ["Arithmetic intensity", "Amount of calculations made per data transferred; One of the main axes of roofline analysis."],
  ["Fusion", "Consolidating operations into a single execution region to reduce buffer traffic and launch cost."],
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
    body: "Fix the actual shape distribution, batch policy and accepted accuracy tolerance; Manufacture and measure the engine according to this contract.",
  },
} as const;

export default function GpuSoftwareStackEmbedded() {
  const [activeTrack, setActiveTrack] = useState<TrackKey>("rocm");
  const [activeStep, setActiveStep] = useState(0);
  const [choice, setChoice] = useState<keyof typeof choiceMap>("kernel");
  const [precision, setPrecision] = useState("FP16");
  const [shapeMode, setShapeMode] = useState("Sabit");
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
          <a href="#rota">Route</a>
          <a href="#sozluk">Dictionary</a>
        </nav>
        <a className="header-cta" href="#workbench">Start exploring <span>↘</span></a>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="kicker"><span /> GPU SYSTEMS / FIELD GUIDE</div>
          <h1>GPU software<br />of the pile <em>into</em> look</h1>
          <p className="hero-lead">
            Learn three critical layers, from the kernel code to the compiler IR to the optimized inference engine, in one interactive atlas.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#map">Turn on system <span>↓</span></a>
            <a className="text-link" href="#rota">See the learning route <span>→</span></a>
          </div>
          <div className="hero-meta">
            <span><b>3</b> area of   expertise</span>
            <span><b>15</b> architectural step</span>
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
                <a href="#workbench" onClick={() => selectTrack(key)}>Check out the module <span>↘</span></a>
              </article>
            );
          })}
        </div>
      </section>

      <section className="workbench" id="workbench">
        <div className="workbench-header">
          <div><div className="section-label light">02 / INTERACTIVE WORKBENCH</div><h2>a pipeline<br />take it apart.</h2></div>
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
            <div><span>SELECTED LAYER</span><h4>{track.steps[activeStep].label}</h4><p>{track.steps[activeStep].detail}</p></div>
          </div>
        </div>

        <div className="code-and-risks">
          <div className="code-window">
            <div className="code-titlebar"><span><i /><i /><i /></span><b>{activeTrack === "rocm" ? "saxpy.hip" : activeTrack === "mlir" ? "matmul.mlir" : "build_engine.py"}</b><span>READ ONLY</span></div>
            <pre><code>{track.code}</code></pre>
          </div>
          <aside className="risk-panel">
            <span>ATTENTION ON THE FIELD</span>
            <h4>Common breakpoints</h4>
            <ol>{track.pitfalls.map((pitfall, index) => <li key={pitfall}><span>0{index + 1}</span>{pitfall}</li>)}</ol>
            <p className="field-note">{track.note}</p>
          </aside>
        </div>
      </section>

      <section className="compare-section">
        <div className="section-heading compact">
          <div><div className="section-label">03 / DECISION MATRIX</div><h2>the right tool,<br /><em>on the right layer</em> use</h2></div>
          <p>These tools are not alternatives to each other. Locating the problem moves the optimization effort to the correct level of abstraction.</p>
        </div>
        <div className="comparison-table" role="table" aria-label="Technology comparison">
          <div className="comparison-row comparison-head" role="row"><span>COMPARE</span><b>ROCm/HIP</b><b>MLIR</b><b>TensorRT</b></div>
          {[
            ["main question", "How does the kernel work?", "How does the code transform?", "How is the model serviced?"],
            ["control surface", "Thread, memory, stream", "IR, dialect, pass", "Graph, precision, profile"],
            ["primary measurement", "Bandwidth / kernel time", "IR quality / compile time", "Latency/throughput"],
            ["Error type", "Race / invalid access", "Illegal IR/miscompile", "Unsupported op / accuracy drift"],
            ["initial artifact", ".hip / C++ source", "Dialect or frontend IR", "ONNX / network definition"],
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
            <div><span>PRIORITY METRIC</span><strong>{shapeMode === "Dinamik" ? "P99 latency/shape" : "Latency + throughput"}</strong></div>
            <div><span>THE DOOR OF TRUTH</span><strong>{precision === "INT8" ? "Calibration + mission metric" : precision === "FP16" ? "FP32 parity check" : "Reference output difference"}</strong></div>
            <div><span>PROFILE DESIGN</span><strong>{shapeMode === "Dinamik" ? "Min/opt/max sets" : "Single shape, real batch"}</strong></div>
            <div><span>GRAPH CONTROL</span><strong>{fusion ? "Validate Fusion layers" : "Measure intermediate tensor traffic"}</strong></div>
          </div>
          <div className="lab-warning"><b>!</b><p><strong>This is not a performance estimate.</strong> It is not reliable to produce a speedup percentage without hardware, model, shape distribution and runtime conditions.</p></div>
        </div>
      </section>

      <section className="roadmap" id="rota">
        <div className="section-heading">
          <div><div className="section-label">05 / LEARNING ROUTE</div><h2>A route for producing,<br /><em>not just reading.</em></h2></div>
          <p>Close each stage with a measurable artifact. Durations are approximate study blocks; real progress is determined by accuracy and profile evidence.</p>
        </div>
        <div className="roadmap-grid">
          {[
            ["01", "Basis", "6–8 hours", "GPU execution model", "SAXPY+ accuracy test", ["grid/block/thread", "memory life cycle", "senkronizasyon"]],
            ["02", "Kernel", "10–14 hours", "HIP optimization cycle", "Naive → tiled matmul", ["koalesme", "LDS usage", "profiler hipotezi"]],
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

      <section className="glossary-section" id="sozluk">
        <div className="glossary-head">
          <div><div className="section-label light">06 / QUICK DICTIONARY</div><h2>Find the term,<br />Set the context.</h2></div>
          <label className="search-box"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="wavefront, lowering, tactic..." aria-label="search in dictionary" /><small>{filteredGlossary.length} CONCLUSION</small></label>
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
