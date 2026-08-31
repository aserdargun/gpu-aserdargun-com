"use client";
/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- Labelled overflow regions must remain keyboard-scrollable. */

import { useMemo, useState } from "react";

type QuantGoal = "memory" | "latency" | "quality";
type Bottleneck = "ttft" | "itl" | "oom" | "gpu";

export const INFERENCE_DIAGNOSIS_IDS = ["scheduler", "kv-cache", "kernel", "network"] as const;
export const INFERENCE_GRAPH_IDS = ["cuda-piecewise", "cuda-full", "hip-piecewise", "hip-full"] as const;
export const INFERENCE_PARALLELISM_IDS = ["expert", "context"] as const;
export const INFERENCE_PRECISION_IDS = ["fp8", "mxfp8", "mxfp4", "nvfp4"] as const;
type InferenceDiagnosisId = typeof INFERENCE_DIAGNOSIS_IDS[number];
type InferenceGraphId = typeof INFERENCE_GRAPH_IDS[number];
type InferenceParallelismId = typeof INFERENCE_PARALLELISM_IDS[number];
type InferencePrecisionId = typeof INFERENCE_PRECISION_IDS[number];

const inferenceDiagnosis = {
  scheduler: { label: "Scheduler", bottleneck: "Scheduler queue", signals: ["queue time / waiting requests", "batch occupancy / token budget"], action: "Inspect request arrival, token budget, and preemption events together." },
  "kv-cache": { label: "KV cache", bottleneck: "KV-cache capacity and movement", signals: ["block occupancy / cache hit rate", "KV dtype / transfer time"], action: "Keep weight memory separate from KV block capacity; measure prefix hits and KV transfer independently." },
  kernel: { label: "Kernel", bottleneck: "Kernel and launch path", signals: ["GPU kernel time / occupancy", "launch gaps / graph coverage"], action: "Match attention, GEMM, and graph coverage to the backend and shape distribution." },
  network: { label: "Network", bottleneck: "Network and KV-transfer path", signals: ["KV connector latency", "NIC/rail utilization and queue"], action: "Record transfer time separately at disaggregated encode → prefill → decode boundaries." },
} as const;
const inferenceGraphs = {
  "cuda-piecewise": { label: "CUDA piecewise", backend: "CUDA", capture: "piecewise", sourceId: "vllm-cuda-graph-modes", maturity: "current", mechanism: undefined, mechanismSourceId: undefined, note: "vLLM supports piecewise CUDA Graph capture; incompatible attention regions can remain eager." },
  "cuda-full": { label: "CUDA full", backend: "CUDA", capture: "full", sourceId: "vllm-cuda-graph-modes", maturity: "current", mechanism: undefined, mechanismSourceId: undefined, note: "vLLM supports full CUDA Graph capture; batch/shape and backend compatibility determine the selection." },
  "hip-piecewise": { label: "HIP piecewise", backend: "HIP", capture: "piecewise", sourceId: "vllm-stable", maturity: "current", mechanism: "stream-capture", mechanismSourceId: "amd-hip-graphs", note: "Select the HIP piecewise graph mode on vLLM's stable surface; show AMD HIP stream capture separately as the underlying API mechanism." },
  "hip-full": { label: "HIP full", backend: "HIP", capture: "full", sourceId: "vllm-stable", maturity: "current", mechanism: "explicit-graph", mechanismSourceId: "amd-hip-graphs", note: "Select the HIP full graph mode on vLLM's stable surface; show AMD HIP explicit graph separately as the underlying API mechanism." },
} as const;
const inferenceParallelism = {
  expert: { label: "Expert parallel", sourceId: "vllm-expert-parallel", maturity: "current", coreCompletion: true, note: "Distributes MoE experts across ranks; all-to-all backend and topology cost remain part of the plan." },
  context: { label: "Context parallel", sourceId: "vllm-context-parallel", maturity: "preview", coreCompletion: false, note: "Splits long context differently for prefill and decode; official docs still describe some prefill paths as under active development." },
} as const;
const inferencePrecisions = {
  fp8: { label: "FP8", hardware: "GPU path to verify against vLLM's supported hardware/quantization matrix", backend: "vLLM FP8 W8A8 / selected linear-MoE kernel", scaleRepresentation: "E4M3 data; static or dynamic scale", accumulation: "Verify the backend-documented accumulation dtype for the selected kernel.", qualityGuardrail: "Educational guardrail: compare task metrics with a BF16 baseline and inspect sensitive layers.", sourceId: "vllm-online-quantization", sourceIds: ["vllm-online-quantization", "vllm-quantization-hardware"], maturity: "current" },
  mxfp8: { label: "MXFP8", hardware: "SM100+ for W8A8; other GPUs can fall back to W8A16", backend: "The platform-selected MXFP8 linear/MoE backend", scaleRepresentation: "E8M0 scale per 32-element block", accumulation: "Verify the selected CUTLASS/vLLM backend's accumulation path.", qualityGuardrail: "Educational guardrail: report fallback dtype and calibration/output drift.", sourceId: "vllm-online-quantization", sourceIds: ["vllm-online-quantization", "cutlass-inference-formats"], maturity: "current" },
  mxfp4: { label: "MXFP4", hardware: "Backend-specific Blackwell acceleration; verify platform fallback", backend: "A linear and MoE backend do not guarantee the same activation dtype", scaleRepresentation: "OCP MX FP4 E2M1 + E8M0 scale per 32-element block", accumulation: "Verify any high-precision accumulation choice with the selected backend documentation.", qualityGuardrail: "Educational guardrail: test ignored layers and the quality-loss boundary with task metrics.", sourceId: "cutlass-inference-formats", sourceIds: ["cutlass-inference-formats", "vllm-quantization-hardware"], maturity: "preview" },
  nvfp4: { label: "NVFP4", hardware: "Blackwell SM100 accelerated path", backend: "FlashInfer/TRTLLM or a compatible CUTLASS-based kernel", scaleRepresentation: "NV FP4 E2M1 + UE4M3 scale per 16-element block", accumulation: "Use FP32 accumulation only when the selected backend documents it.", qualityGuardrail: "Educational guardrail: compare per-token activation scale behavior and BF16 quality.", sourceId: "cutlass-inference-formats", sourceIds: ["cutlass-inference-formats", "vllm-quantization-hardware"], maturity: "preview" },
} as const;
export function getInferenceDiagnosis(id: InferenceDiagnosisId) { return { id, ...inferenceDiagnosis[id] }; }
export function getInferenceGraphPlan(id: InferenceGraphId) { return { id, ...inferenceGraphs[id], measuredHardwareEvidence: false }; }
export function getInferenceParallelismPlan(id: InferenceParallelismId) { return { id, ...inferenceParallelism[id] }; }
export function getInferencePrecisionPlan(id: InferencePrecisionId) { return { id, ...inferencePrecisions[id], measuredHardwareEvidence: false }; }
export function getInferenceSpeculativeBoundary() {
  return { sourceId: "vllm-speculative-acceptance", acceptanceSourceId: "vllm-speculative-acceptance", maturity: "preview" as const, acceptanceRate: "accepted draft tokens / proposed draft tokens", draftCost: "Educational decision input: draft-model work + verification + rejected draft work.", draftCostEvidenceKind: "educational" as const, measuredHardwareEvidence: false };
}

const modules = [
  ["01", "vLLM Engine", "#vllm"],
  ["02", "CUDA Graphs", "#graphs"],
  ["03", "Quantization", "#quantization"],
  ["04", "Optimization", "#optimization"],
  ["05", "Measurement", "#measurement"],
];

const quantData = {
  memory: {
    eyebrow: "MEMORY PRIORITY",
    title: "Start with INT4/AWQ or GPTQ",
    copy: "This can reduce weight memory substantially. Budget KV-cache and workspace memory separately; 4-bit weights do not guarantee a fourfold reduction in total VRAM.",
    accent: "lime",
  },
  latency: {
    eyebrow: "LATENCY PRIORITY",
    title: "Try FP8 + optimized kernel path",
    copy: "On supported GPUs, FP8 can use Tensor Cores while reducing data movement. Do not assume a gain without measuring the hardware, model architecture, and kernel path.",
    accent: "cyan",
  },
  quality: {
    eyebrow: "QUALITY PRIORITY",
    title: "Keep a BF16 baseline",
    copy: "Record the BF16 quality and performance baseline first. Then compare weight-only or FP8 candidates with the same prompts and fixed sampling settings.",
    accent: "coral",
  },
};

const bottlenecks: Record<Bottleneck, { label: string; diagnosis: string; actions: string[] }> = {
  ttft: {
    label: "TTFT high",
    diagnosis: "Prefill, queueing, or long-prompt processing may dominate.",
    actions: ["Separate prompt length and queue time", "Measure prefix cache hit", "Sweep chunked prefill budget"],
  },
  itl: {
    label: "ITL high",
    diagnosis: "Decode steps may be hampered by memory bandwidth or small-batch launch costs.",
    actions: ["Check CUDA Graphs coverage", "Measure decode batch distribution", "Compare KV cache dtype and attention backend"],
  },
  oom: {
    label: "KV cache OOM",
    diagnosis: "The number of simultaneous tokens and KV blocks, not the weights, may be the limit.",
    actions: ["Reduce max_model_len and max_num_seqs", "Monitor KV-cache capacity by block", "Verify support for KV-cache quantization"],
  },
  gpu: {
    label: "GPU low usage",
    diagnosis: "Request arrival, CPU scheduling, network or small batch could be starving the GPU.",
    actions: ["Run a concurrency sweep", "Profile CPU and tokenizer time", "Inspect continuous batching and asynchronous scheduling"],
  },
};

const quiz = [
  {
    q: "Which cost does CUDA Graphs most directly reduce?",
    options: ["Model weight memory", "Recurring CPU launch cost", "KV cache accuracy"],
    answer: 1,
  },
  {
    q: "Which phase affects the initial token delay the most for a long prompt?",
    options: ["Prefill", "Decode", "Detokenization"],
    answer: 0,
  },
  {
    q: "What don't 4-bit weights guarantee?",
    options: ["Smaller weight footprint", "Full 4× reduction of total VRAM", "Less weight data"],
    answer: 1,
  },
];

function ArrowIcon() {
  return <span aria-hidden="true">↗</span>;
}

export default function InferenceSystemsEmbedded() {
  const [batching, setBatching] = useState(true);
  const [prefix, setPrefix] = useState(true);
  const [chunked, setChunked] = useState(true);
  const [replays, setReplays] = useState(100);
  const [params, setParams] = useState(8);
  const [bits, setBits] = useState(4);
  const [goal, setGoal] = useState<QuantGoal>("memory");
  const [bottleneck, setBottleneck] = useState<Bottleneck>("ttft");
  const [diagnosisId, setDiagnosisId] = useState<InferenceDiagnosisId>("scheduler");
  const [graphId, setGraphId] = useState<InferenceGraphId>("cuda-piecewise");
  const [parallelismId, setParallelismId] = useState<InferenceParallelismId>("expert");
  const [precisionId, setPrecisionId] = useState<InferencePrecisionId>("fp8");
  const [answers, setAnswers] = useState<number[]>([-1, -1, -1]);

  const serving = useMemo(() => {
    let throughput = 42;
    let ttft = 920;
    if (batching) {
      throughput += 31;
      ttft += 80;
    }
    if (prefix) {
      throughput += 11;
      ttft -= 270;
    }
    if (chunked) {
      throughput += 8;
      ttft -= 120;
    }
    return { throughput, ttft };
  }, [batching, prefix, chunked]);

  const eagerCost = replays * 24;
  const graphCost = 180 + replays * 3.2;
  const graphSaving = Math.max(0, Math.round((1 - graphCost / eagerCost) * 100));
  const weightMemory = (params * bits) / 8;
  const quizScore = answers.reduce((total, answer, index) => total + (answer === quiz[index].answer ? 1 : 0), 0);

  return (
    <section className="inference-systems-surface">
      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="kicker"><span>GPU INFERENCE / 2026</span><span>INTERACTIVE GUIDE</span></div>
          <h2>MORE<br />TOKENS.<br /><em>LESS</em><br />WAITING.</h2>
          <p className="hero-intro">Explore the modern LLM serving system layer by layer, from vLLM's scheduler to CUDA Graphs replay, from 4-bit weights to the throughput benchmark.</p>
          <div className="hero-actions">
            <a className="primary-cta" href="#vllm">OPEN SYSTEM <span>↓</span></a>
            <span className="read-time">≈ 25 min reading<br />4 interactive labs</span>
          </div>
        </div>
        <div className="hero-visual" aria-label="Inference flow from request to token">
          <div className="visual-label">LIVE STREAM / DECODE STEP 128</div>
          <div className="request request-a"><span>REQ 01</span><b>16 tok</b></div>
          <div className="request request-b"><span>REQ 02</span><b>1 tok</b></div>
          <div className="request request-c"><span>REQ 03</span><b>8 tok</b></div>
          <div className="scheduler-core">
            <span>SCHEDULER</span>
            <strong>CONTINUOUS<br />BATCH</strong>
            <small>25 TOKENS / STEP</small>
          </div>
          <div className="gpu-strip">
            <span>GPU</span>
            {Array.from({ length: 12 }).map((_, i) => <i key={i} style={{ opacity: 0.25 + i * 0.06 }} />)}
          </div>
          <div className="token-stream"><span>OUTPUT</span><b>▮</b><b>▮</b><b>▮</b><b className="hot">▮</b><small>+1 TOKEN</small></div>
        </div>
      </section>

      <div className="content-shell">
        <aside className="module-rail" aria-label="Modules">
          <p>MODULES</p>
          {modules.map(([number, label, href]) => (
            <a href={href} key={number}><span>{number}</span>{label}</a>
          ))}
          <div className="rail-note"><b>GOAL</b><p>Measure the bottleneck and choose the right lever instead of memorizing a flag.</p></div>
        </aside>

        <div className="lesson-flow">
          <section className="lesson" id="vllm">
            <div className="section-index">01/VLLM ENGINE</div>
            <div className="section-heading">
              <h2>Serving is more than a model call.</h2>
              <p>vLLM turns variable-length requests into a continuous GPU workflow. The gain does not come from one kernel; it comes from scheduling, KV-cache, and execution layers working together.</p>
            </div>

            <div className="pipeline" tabIndex={0} aria-label="Request processing pipeline">
              <div className="pipe-node"><span>01</span><b>API SERVER</b><small>OpenAI compatible request</small></div>
              <div className="pipe-arrow">→</div>
              <div className="pipe-node active"><span>02</span><b>SCHEDULER</b><small>Token budget + queue</small></div>
              <div className="pipe-arrow">→</div>
              <div className="pipe-node"><span>03</span><b>MODEL RUNNER</b><small>Forward + sampling</small></div>
              <div className="pipe-arrow">→</div>
              <div className="pipe-node"><span>04</span><b>STREAM</b><small>Token response</small></div>
            </div>

            <div className="concept-grid">
              <article><span className="concept-tag">PAGED ATTENTION</span><h3>Splits the KV cache into blocks</h3><p>It uses fixed-size blocks instead of allocating one large contiguous region per request. This reduces fragmentation and lets requests acquire blocks as they grow.</p><div className="block-viz">{Array.from({ length: 18 }).map((_, i) => <i className={i % 5 === 4 ? "gap" : i < 13 ? "used" : ""} key={i} />)}</div></article>
              <article><span className="concept-tag">CONTINUOUS BATCHING</span><h3>The batch does not wait for every request</h3><p>At each decode step, completed requests leave and waiting requests can enter. This reduces the static batch cost of waiting for the slowest request.</p><div className="timeline-viz"><i style={{ width: "82%" }} /><i style={{ width: "48%" }} /><i style={{ width: "68%" }} /><i className="new" style={{ width: "31%" }} /></div></article>
              <article><span className="concept-tag">CHUNKED PREFILL</span><h3>Splits long prompts into chunks</h3><p>Compute-heavy prefill chunks can be scheduled alongside memory-heavy decode work. The token budget is one of the main controls for the TTFT–ITL trade-off.</p><div className="chunk-viz"><i /><i /><i /><b>D</b><b>D</b><i /></div></article>
              <article><span className="concept-tag">PREFIX CACHING</span><h3>Reuses a shared prefix</h3><p>Matching KV blocks do not need to be recomputed when a system prompt or context is reused. The largest gains come from workloads with repeated prefixes.</p><div className="prefix-viz"><span>SYSTEM</span><span>POLICY</span><b>USER A</b><b>USER B</b></div></article>
            </div>
          </section>

          <section className="lab-panel" id="labs">
            <div className="lab-header"><div><span>LAB/01</span><h2>Serving lever simulator</h2></div><p>Pedagogical model · not a true benchmark</p></div>
            <div className="lab-body">
              <div className="controls" role="group" aria-label="Serving lever options">
                {[
                  ["Continuous batching", "More GPU work per step", batching, setBatching],
                  ["Prefix caching", "Skip repetitive prefix prefill", prefix, setPrefix],
                  ["Chunked prefill", "Schedule prefill and decode together", chunked, setChunked],
                ].map(([label, note, value, setter]) => (
                  <button className="toggle-row" type="button" onClick={() => (setter as (v: boolean) => void)(!(value as boolean))} aria-pressed={value as boolean} key={label as string}>
                    <span><b>{label as string}</b><small>{note as string}</small></span><i className={value ? "on" : ""}><em /></i>
                  </button>
                ))}
              </div>
              <div className="result-board">
                <div className="result-metric"><span>ESTIMATED THROUGHPUT</span><b>{serving.throughput}</b><small>tok/s</small></div>
                <div className="result-metric"><span>ESTIMATED TTFT</span><b>{serving.ttft}</b><small>ms</small></div>
                <div className="mini-bars"><span style={{ height: `${Math.min(100, serving.throughput)}%` }} /><span style={{ height: `${Math.min(100, serving.ttft / 12)}%` }} /></div>
                <p>This result shows direction only. The real value varies with the model, GPU, prompt distribution, concurrency, and software version.</p>
              </div>
            </div>
          </section>

          <section className="inference-decision-lab" aria-labelledby="inference-decision-title-en">
            <div className="section-index">01.5 / EVIDENCE-BOUND DECISION LAB</div>
            <div className="section-heading"><h2 id="inference-decision-title-en">Choose the layer in the encode → prefill → decode path.</h2><p>Disaggregated serving, graphs, parallelism, and low precision are separate decisions. Every choice exposes source maturity, backend, and hardware applicability independently.</p></div>
            <div className="inference-decision-controls">
              <div data-control="diagnosis" role="group" aria-label="Bottleneck diagnosis"><b>BOTTLENECK</b>{INFERENCE_DIAGNOSIS_IDS.map((id) => <button type="button" aria-pressed={diagnosisId === id} onClick={() => setDiagnosisId(id)} key={id}>{inferenceDiagnosis[id].label}</button>)}</div>
              <div data-control="graph" role="group" aria-label="Graph backend and scope"><b>GRAPH PATH</b>{INFERENCE_GRAPH_IDS.map((id) => <button type="button" aria-pressed={graphId === id} onClick={() => setGraphId(id)} key={id}>{inferenceGraphs[id].label}</button>)}</div>
              <div data-control="parallelism" role="group" aria-label="Inference parallelism"><b>PARALLELISM</b>{INFERENCE_PARALLELISM_IDS.map((id) => <button type="button" aria-pressed={parallelismId === id} onClick={() => setParallelismId(id)} key={id}>{inferenceParallelism[id].label}</button>)}</div>
              <div data-control="precision" role="group" aria-label="Low precision format"><b>PRECISION</b>{INFERENCE_PRECISION_IDS.map((id) => <button type="button" aria-pressed={precisionId === id} onClick={() => setPrecisionId(id)} key={id}>{inferencePrecisions[id].label}</button>)}</div>
            </div>
            <article className="inference-decision-evidence" aria-live="polite" data-diagnosis={diagnosisId} data-graph={graphId} data-parallelism={parallelismId} data-precision={precisionId}>
              <div data-claim="diagnosis"><small>BOTTLENECK SEPARATION</small><h3>{getInferenceDiagnosis(diagnosisId).bottleneck}</h3><p>{getInferenceDiagnosis(diagnosisId).signals.join(" · ")}</p><p>{getInferenceDiagnosis(diagnosisId).action}</p></div>
              <div data-claim="graph" data-source-id={getInferenceGraphPlan(graphId).sourceId} data-maturity={getInferenceGraphPlan(graphId).maturity}><small>{getInferenceGraphPlan(graphId).maturity === "current" ? "CURRENT" : "PREVIEW"} · {getInferenceGraphPlan(graphId).backend} / {getInferenceGraphPlan(graphId).capture}</small><p>{getInferenceGraphPlan(graphId).note}</p></div>{getInferenceGraphPlan(graphId).mechanism && <div data-claim="graph-mechanism" data-source-id={getInferenceGraphPlan(graphId).mechanismSourceId} data-maturity="current"><small>UNDERLYING API MECHANISM · AMD HIP</small><p>{getInferenceGraphPlan(graphId).mechanism}</p></div>}
              <div data-claim="parallelism" data-source-id={getInferenceParallelismPlan(parallelismId).sourceId} data-maturity={getInferenceParallelismPlan(parallelismId).maturity}><small>{getInferenceParallelismPlan(parallelismId).maturity === "preview" ? "PREVIEW" : "CURRENT"}</small><p>{getInferenceParallelismPlan(parallelismId).note}</p>{!getInferenceParallelismPlan(parallelismId).coreCompletion && <p><b>This Preview path is not a core completion requirement.</b></p>}</div>
              <div data-claim="precision" data-source-id={getInferencePrecisionPlan(precisionId).sourceId} data-source-ids={getInferencePrecisionPlan(precisionId).sourceIds.join(" ")} data-maturity={getInferencePrecisionPlan(precisionId).maturity}><small>HARDWARE · BACKEND · SCALE · ACCUMULATION · QUALITY</small><p><b>Hardware:</b> {getInferencePrecisionPlan(precisionId).hardware}</p><p><b>Backend:</b> {getInferencePrecisionPlan(precisionId).backend}</p><p><b>Scale:</b> {getInferencePrecisionPlan(precisionId).scaleRepresentation}</p><p><b>Accumulation:</b> {getInferencePrecisionPlan(precisionId).accumulation}</p><p><b>Quality:</b> {getInferencePrecisionPlan(precisionId).qualityGuardrail}</p></div>
              <div data-source-id="vllm-disaggregated-encoder" data-maturity="current"><small>DISAGGREGATED SERVING</small><p>Encode, prefill, and decode can scale on separate instances; KV/encoder transfer time belongs to network diagnosis.</p></div>
              <div data-claim="speculative-acceptance" data-source-id={getInferenceSpeculativeBoundary().acceptanceSourceId} data-maturity="preview"><small>PREVIEW · METRICS SCHEMA IS EXPERIMENTAL</small><p>Acceptance rate: {getInferenceSpeculativeBoundary().acceptanceRate}.</p></div><div data-claim="draft-cost" data-evidence-kind={getInferenceSpeculativeBoundary().draftCostEvidenceKind}><small>EDUCATIONAL DECISION INPUT</small><p>Draft cost: {getInferenceSpeculativeBoundary().draftCost}</p></div>
            <p className="inference-evidence-caveat"><b>This decision model is not measured hardware evidence.</b> Re-measure TTFT, ITL, throughput, and VRAM on the real workload.</p>
          </article>
          <aside data-source-id="vllm-context-parallel" data-maturity="preview">Context parallel · PREVIEW · not a core completion requirement.</aside>
        </section>

          <section className="lesson graphs-section" id="graphs">
            <div className="section-index">02 / CUDA GRAPHS</div>
            <div className="section-heading"><h2>Catch it once.<br />Replay over and over.</h2><p>In normal eager flow, the CPU prepares and launches each kernel. CUDA Graphs save repeated GPU operations with their dependencies; instantiates and replays with a single replay call.</p></div>
            <div className="compare-board">
              <div className="compare-lane"><span>EAGER / EVERY STEP</span><div className="kernel-row">{["LN", "QKV", "ATTN", "MLP", "SAMPLE"].map((k) => <b key={k}>{k}</b>)}</div><small>CPU → launch → CPU → launch → CPU → launch…</small></div>
              <div className="compare-lane graph"><span>GRAPH / REPLAY</span><div className="graph-capsule"><b>cudaGraphLaunch()</b><i>LN</i><i>QKV</i><i>ATTN</i><i>MLP</i><i>SAMPLE</i></div><small>Predefined dependency graph</small></div>
            </div>
            <div className="rule-grid">
              <div><span>01</span><h3>Shape must be stable</h3><p>The captured graph depends on certain shape and address assumptions. Serving systems can use graph pooling and padding for different batch sizes.</p></div>
              <div><span>02</span><h3>Addresses must be stable</h3><p>The input data is copied to the static buffer; replay uses the same virtual addresses. Dynamic allocation pushes capture limits.</p></div>
              <div><span>03</span><h3>Warm-up comes first</h3><p>Lazy init, autotune and library preparations are completed outside of capture. Don't confuse first call cost with steady-state.</p></div>
            </div>
            <div className="graph-lab">
              <div className="graph-lab-copy"><span>LAB / 02</span><h3>See the amortization</h3><p>As the number of replays increases, the one-time capture and instantiation cost is spread over more calls.</p><label htmlFor="replays">NUMBER OF REPLAYS <b>{replays}</b></label><input id="replays" type="range" min="10" max="500" step="10" value={replays} onChange={(e) => setReplays(Number(e.target.value))} /></div>
              <div className="cost-chart" aria-label="Eager and graph total launch cost comparison">
                <div><span>EAGER</span><i style={{ width: `${Math.min(100, eagerCost / 120)}%` }} /><b>{eagerCost.toFixed(0)} unit</b></div>
                <div><span>GRAPH</span><i className="graph-bar" style={{ width: `${Math.min(100, graphCost / 120)}%` }} /><b>{graphCost.toFixed(0)} unit</b></div>
                <strong>≈ {graphSaving}% LESS LAUNCH COST</strong>
              </div>
            </div>
          </section>

          <section className="lesson" id="quantization">
            <div className="section-index">03 / QUANTIZATION</div>
            <div className="section-heading"><h2>Fewer bits do not guarantee speed.</h2><p>Quantization narrows the numerical representation of weights, activations, or KV cache. That can reduce memory use and data movement, but speed improves only when the hardware and kernel path execute the format efficiently.</p></div>

            <div className="precision-stack">
              <div className="precision-head"><span>FORMAT</span><span>APPROXIMATE WEIGHT SIZE*</span><span>MAIN TRADE-OFF</span></div>
              {[
                ["BF16", "16 bit", "1.00×", "Strong baseline", "100%"],
                ["FP8", "8 bit", "0.50×", "Hardware + scale path", "50%"],
                ["INT8", "8 bit", "0.50×", "Depends on kernel support", "50%"],
                ["INT4", "4 bits", "0.25×", "Quality and dequant cost", "25%"],
              ].map(([name, bit, ratio, note, width]) => <div className="precision-row" key={name}><b>{name}<small>{bit}</small></b><div><i style={{ width }} /></div><strong>{ratio}</strong><span>{note}</span></div>)}
              <small className="footnote">* Theoretical raw weight size only; excludes metadata, scales, padding, KV cache, and runtime workspace.</small>
            </div>

            <div className="quant-tools">
              <div className="memory-calc">
                <span className="tool-label">LAB / 03 · WEIGHT MEMORY</span><h3>Weigh the model</h3>
                <label htmlFor="parameter-count-en">PARAMETER <b>{params}B</b></label><input id="parameter-count-en" type="range" min="1" max="70" value={params} onChange={(e) => setParams(Number(e.target.value))} />
                <span className="tool-label">PRECISION</span><div className="segmented" role="group" aria-label="Weight precision">{[16, 8, 4].map((b) => <button type="button" aria-pressed={bits === b} className={bits === b ? "selected" : ""} onClick={() => setBits(b)} key={b}>{b}-BIT</button>)}</div>
                <div className="memory-output"><span>THEORETICAL WEIGHT MEMORY</span><b>{weightMemory.toFixed(1)} <small>GB</small></b><p>It is the decimal GB approach, not GiB.</p></div>
              </div>
              <div className="decision-card">
                <span className="tool-label">DECISION ASSISTANT</span><h3>What's your priority?</h3>
                <div className="goal-tabs" role="group" aria-label="Optimization priority">{(["memory", "latency", "quality"] as QuantGoal[]).map((g) => <button type="button" aria-pressed={goal === g} onClick={() => setGoal(g)} className={goal === g ? "selected" : ""} key={g}>{g === "memory" ? "MEMORY" : g === "latency" ? "LATENCY" : "QUALITY"}</button>)}</div>
                <div className={`recommendation ${quantData[goal].accent}`}><span>{quantData[goal].eyebrow}</span><h4>{quantData[goal].title}</h4><p>{quantData[goal].copy}</p></div>
              </div>
            </div>
          </section>

          <section className="lesson optimization" id="optimization">
            <div className="section-index">04 / INFERENCE OPTIMIZATION</div>
            <div className="section-heading"><h2>First the bottleneck.<br />Then the lever.</h2><p>The fastest configuration is not universal. Prefill can be compute-bound while decode is memory-bound; latency dominates at low traffic and throughput at high traffic. Tie every change to the target metric.</p></div>

            <div className="roofline-card">
              <div className="roof-copy"><span>SYSTEM MAP</span><h3>Two different hot paths</h3><p><b>Prefill</b> processes many tokens in parallel, so large matrix multiplications can consume compute capacity. <b>Decode</b> reads the weights at every step to generate a small number of tokens, so data movement can dominate.</p></div>
              <div className="axis-chart"><span className="y-label">PERF ↑</span><i className="roof" /><i className="prefill-dot"><em>PREFILL</em></i><i className="decode-dot"><em>DECODE</em></i><span className="x-label">ARITHMETIC INTENSITY →</span></div>
            </div>

            <div className="lever-table">
              <div className="lever-head"><span>LEVER</span><span>AIM</span><span>RISK / MEASUREMENT</span></div>
              {[
                ["Continuous batching", "GPU occupancy + throughput", "Queue time and queue latency"],
                ["CUDA Graphs", "CPU launch overhead + ITL", "Capture scope, shape padding"],
                ["Quantization", "VRAM + bandwidth", "Quality, kernel and dequant"],
                ["Prefix caching", "Repeated prefill", "Hit rate + cache pressure"],
                ["Speculative decoding", "Low/medium QPS ITL", "Acceptance rate + draft cost"],
                ["Tensor parallel", "Deploy the model", "Communication and scaling efficiency"],
              ].map((row, i) => <div className="lever-row" key={row[0]}><b><span>{String(i + 1).padStart(2, "0")}</span>{row[0]}</b><p>{row[1]}</p><p>{row[2]}</p></div>)}
            </div>

            <div className="detective">
              <div className="detective-menu" role="group" aria-label="Observed bottleneck"><span>LAB/04</span><h3>Bottleneck detective</h3><p>Choose the main symptom you observe.</p>{(Object.keys(bottlenecks) as Bottleneck[]).map((key) => <button type="button" aria-pressed={bottleneck === key} className={bottleneck === key ? "selected" : ""} onClick={() => setBottleneck(key)} key={key}>{bottlenecks[key].label}<span>→</span></button>)}</div>
              <div className="diagnosis" aria-live="polite"><span>POSSIBLE DIAGNOSIS</span><h3>{bottlenecks[bottleneck].diagnosis}</h3><ol>{bottlenecks[bottleneck].actions.map((action) => <li key={action}>{action}</li>)}</ol><p>Don't declare a root cause by looking at a single metric. Examine GPU timeline, scheduler statistics and request distribution together.</p></div>
            </div>
          </section>

          <section className="lesson measurement" id="measurement">
            <div className="section-index">05 / MEASUREMENT DISCIPLINE</div>
            <div className="section-heading"><h2>A benchmark is not one number.</h2><p>Latency and throughput tell different stories even in the same experiment. Results are not portable unless they report warm-up, concurrency, prompt and output lengths, and latency percentiles.</p></div>
            <div className="metric-grid">
              <article><span>TTFT</span><h3>Time to First Token</h3><p>Tail + prefill + initial decode. User perception of “answer started”.</p></article>
              <article><span>ITL</span><h3>Inter-token Latency</h3><p>The time between consecutive tokens when streaming.</p></article>
              <article><span>TPOT</span><h3>Time per Output Token</h3><p>The ratio of production time after the first token to the number of output tokens.</p></article>
              <article><span>TOK/S</span><h3>Throughput</h3><p>The number of input and output tokens completed by the system per unit time.</p></article>
            </div>
            <div className="benchmark-card">
              <div><span>PRODUCTION CHECKLIST</span><h3>Repeatable run</h3><p>Before-and-after comparisons are unreliable without the same model revision, tokenizer, and sampling settings.</p></div>
              <ul>
                <li><b>01</b> Model + quant method + revision</li>
                <li><b>02</b> GPU, driver, CUDA and serving version</li>
                <li><b>03</b> Prompt/output length distribution</li>
                <li><b>04</b> QPS or concurrency sweep</li>
                <li><b>05</b> Warm-up and measurement window</li>
                <li><b>06</b> p50/p95/p99+ error rate</li>
                <li><b>07</b> Quality and accuracy guardrail</li>
              </ul>
            </div>
          </section>

          <section className="quiz" id="quiz">
            <div className="quiz-intro"><span>KNOWLEDGE CHECK</span><h2>Do you understand the system?</h2><p>Verify key trade-offs with three quick questions.</p><div className="score"><b>{quizScore}</b><span>/ 3<br />CORRECT</span></div></div>
            <div className="quiz-list">
              {quiz.map((item, qIndex) => <fieldset key={item.q}><legend><span>0{qIndex + 1}</span>{item.q}</legend>{item.options.map((option, oIndex) => {
                const selected = answers[qIndex] === oIndex;
                const answered = answers[qIndex] !== -1;
                const correct = oIndex === item.answer;
                return <button type="button" aria-pressed={selected} className={`${selected ? "selected" : ""} ${answered && selected ? (correct ? "correct" : "wrong") : ""}`} onClick={() => setAnswers((current) => current.map((a, i) => i === qIndex ? oIndex : a))} key={option}><span>{String.fromCharCode(65 + oIndex)}</span>{option}<b className="quiz-feedback" aria-live="polite" hidden={!answered || !selected}>{answered && selected ? (correct ? "CORRECT" : "THINK AGAIN") : ""}</b></button>;
              })}</fieldset>)}
            </div>
          </section>

          <section className="sources">
            <div><span>RESOURCE DESK</span><h2>Go deeper.</h2></div>
            <div className="source-links">
              <a href="https://docs.vllm.ai/en/latest/" target="_blank" rel="noreferrer"><span>01</span><b>vLLM Documentation</b><ArrowIcon /></a>
              <a href="https://docs.vllm.ai/en/latest/configuration/optimization/" target="_blank" rel="noreferrer"><span>02</span><b>Optimization &amp; Tuning</b><ArrowIcon /></a>
              <a href="https://docs.nvidia.com/cuda/cuda-programming-guide/04-special-topics/cuda-graphs.html" target="_blank" rel="noreferrer"><span>03</span><b>NVIDIA CUDA Graphs</b><ArrowIcon /></a>
              <a href="https://docs.vllm.ai/en/latest/features/quantization/" target="_blank" rel="noreferrer"><span>04</span><b>vLLM Quantization</b><ArrowIcon /></a>
            </div>
          </section>
          <p className="closing-note">MEASURE → DIAGNOSE → REPLACE → MEASURE AGAIN</p>
        </div>
      </div>

    </section>
  );
}
