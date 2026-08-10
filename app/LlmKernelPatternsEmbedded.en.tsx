"use client";

import { useMemo, useState } from "react";

type TopicId = "gemm" | "reduction" | "softmax" | "normalization" | "attention";

const topics: { id: TopicId; index: string; name: string; eyebrow: string; color: string }[] = [
  { id: "gemm", index: "01", name: "GEMM", eyebrow: "MATMUL", color: "cyan" },
  { id: "reduction", index: "02", name: "Reduction", eyebrow: "AGGREGATE", color: "violet" },
  { id: "softmax", index: "03", name: "Softmax", eyebrow: "PROBABILITY", color: "orange" },
  { id: "normalization", index: "04", name: "Normalization", eyebrow: "STABILITY", color: "pink" },
  { id: "attention", index: "05", name: "Attention", eyebrow: "SEQUENCE", color: "lime" },
];

const topicCopy: Record<TopicId, { kicker: string; title: string; lead: string; formula: string }> = {
  gemm: {
    kicker: "CHAPTER 01 · THE ENGINE OF COMPUTATION",
    title: "GEMM: move data once, compute many times",
    lead: "General matrix multiplication, C = A × B, is the backbone of modern AI workloads. A good kernel shares tiles in fast memory instead of requesting each element A and B from global memory over and over again.",
    formula: "Cᵢⱼ = Σₖ Aᵢₖ · Bₖⱼ",
  },
  reduction: {
    kicker: "CHAPTER 02 · MANY TO ONE",
    title: "Reduction: combine thousands of values safely",
    lead: "Operations such as sum, maximum, and average reduce many inputs to one output. The goal is not parallelism alone: use minimal synchronization, regular memory access, and a numerically controlled reduction tree.",
    formula: "y = x₀ ⊕ x₁ ⊕ … ⊕ xₙ₋₁",
  },
  softmax: {
    kicker: "CHAPTER 03 · FROM SCORE TO PROBABILITY",
    title: "Softmax: stable, online and fuseable",
    lead: "Softmax transforms scores into a positive distribution that sums to 1. A naive exp(x) can overflow on large inputs, so a correct kernel first finds the row maximum and then computes the exponential sum.",
    formula: "pᵢ = exp(xᵢ − m) / Σⱼ exp(xⱼ − m)",
  },
  normalization: {
    kicker: "CHAPTER 04 · CHECK THE SCALE",
    title: "Normalization: keep activations within workable range",
    lead: "LayerNorm uses mean and variance, while RMSNorm uses only mean squares. From a kernel perspective, they are both good candidates for fusion of reduction, broadcasting, and element-wise transformation.",
    formula: "RMSNorm(x) = γ ⊙ x / √(mean(x²) + ε)",
  },
  attention: {
    kicker: "CHAPTER 05 · MATCH THE CONTEXT",
    title: "Attention: combine matrix multiplication with online softmax",
    lead: "Attention; QKᵀ scores consist of scaling, masking, softmax, and V and weighted sum. Flash-style kernels execute online softmax on tiles without writing the giant score matrix to memory.",
    formula: "O = softmax(QKᵀ / √d + mask) V",
  },
};

const quiz: Record<TopicId, { q: string; options: string[]; answer: number; note: string }> = {
  gemm: { q: "What is the main benefit of tiling in GEMM?", options: ["starting more threads", "Reusing global memory data", "remove size K"], answer: 1, note: "A tile can be reused by many FMAs as long as it remains in shared memory/register." },
  reduction: { q: "How many join steps does a 16-element balanced reduction tree require?", options: ["4", "8", "16"], answer: 0, note: "Each stage halves the number of active values: log₂(16) = 4." },
  softmax: { q: "Why is max(x) subtracted before exponential operation?", options: ["To reset the total", "To change the order", "To prevent overflow"], answer: 2, note: "Subtracting a constant value from all scores does not change the distribution; makes the largest exponential value 1." },
  normalization: { q: "What statistic does RMSNorm subtract from LayerNorm?", options: ["Mean centering", "mean squares", "Learned γ"], answer: 0, note: "RMSNorm does not center the input; Calculates the RMS scale and multiplies it by the learned γ." },
  attention: { q: "What is the main memory advantage of Flash-style attention?", options: ["Delete Q, K, and V", "Avoid writing the S×S score matrix to HBM", "Skip softmax"], answer: 1, note: "Score tiles are processed with online softmax, so the intermediate score matrix is not materialized in global memory." },
};

function fmt(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}G`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}

function DotGrid({ active = 18 }: { active?: number }) {
  return (
    <div className="dot-grid" aria-label="Matrix tile visualization">
      {Array.from({ length: 64 }, (_, i) => <span key={i} className={i < active ? "on" : ""} />)}
    </div>
  );
}

function GemmLab() {
  const [m, setM] = useState(1024);
  const [n, setN] = useState(1024);
  const [k, setK] = useState(1024);
  const flops = 2 * m * n * k;
  const bytes = 4 * (m * k + k * n + m * n);
  const intensity = flops / bytes;

  return (
    <div className="lab-grid">
      <section className="panel visual-panel">
        <div className="panel-label"><span>Tile walkthrough</span><b>BLOCK 32×32</b></div>
        <div className="gemm-visual">
          <div><small>A·M×K</small><DotGrid active={32} /></div>
          <strong>×</strong>
          <div><small>B · K×N</small><DotGrid active={24} /></div>
          <strong>=</strong>
          <div><small>C · M×N</small><DotGrid active={16} /></div>
        </div>
        <p className="visual-caption"><i /> Each block stores tiles A and B into fast memory; Threads update register accumulators along the K-axis.</p>
      </section>
      <section className="panel controls-panel">
        <div className="panel-label"><span>Roofline intuition</span><b>FP32</b></div>
        {[["M", m, setM], ["N", n, setN], ["K", k, setK]].map(([label, value, setter]) => (
          <label className="range-row" key={label as string}><span>{label as string}</span><input type="range" min="256" max="4096" step="256" value={value as number} onChange={e => (setter as (v: number) => void)(+e.target.value)} /><output>{value as number}</output></label>
        ))}
        <div className="metric-strip">
          <div><span>Work</span><b>{fmt(flops)} FLOP</b></div>
          <div><span>Minimum traffic</span><b>{fmt(bytes)} B</b></div>
          <div><span>Intensity</span><b>{intensity.toFixed(1)} F/B</b></div>
        </div>
      </section>
    </div>
  );
}

function ReductionLab() {
  const [op, setOp] = useState<"SUM" | "MAX">("SUM");
  const values = [4, 7, 2, 9, 1, 5, 8, 3];
  const stages: number[][] = [values];
  while (stages[stages.length - 1].length > 1) {
    const prev = stages[stages.length - 1];
    const next = [];
    for (let i = 0; i < prev.length; i += 2) next.push(op === "SUM" ? prev[i] + prev[i + 1] : Math.max(prev[i], prev[i + 1]));
    stages.push(next);
  }
  return (
    <div className="lab-grid">
      <section className="panel visual-panel">
        <div className="panel-label"><span>Parallel reduction tree</span><b>{stages.length - 1} STAGES</b></div>
        <div className="tree">
          {stages.map((stage, i) => <div className="tree-row" key={i}>{stage.map((v, j) => <span key={j}>{v}</span>)}</div>)}
        </div>
      </section>
      <section className="panel controls-panel">
        <div className="panel-label"><span>Operator</span><b>ASSOCIATIVE</b></div>
        <div className="segmented"><button className={op === "SUM" ? "active" : ""} onClick={() => setOp("SUM")}>sum</button><button className={op === "MAX" ? "active" : ""} onClick={() => setOp("MAX")}>MAX</button></div>
        <div className="callout"><b>Warp → Block → Grid</b><p>First warp shuffle, then a small shared-memory reduction per block. In multi-block case, second kernel or atomic termination is required.</p></div>
        <div className="metric-strip"><div><span>Entry</span><b>8 values</b></div><div><span>Combination</span><b>7 transactions</b></div><div><span>Conclusion</span><b>{stages.at(-1)?.[0]}</b></div></div>
      </section>
    </div>
  );
}

const softmaxScores = [2.1, 0.8, -0.4, 1.6, 3.2, 0.2];

function SoftmaxLab() {
  const [temp, setTemp] = useState(1);
  const probs = useMemo(() => {
    const scaled = softmaxScores.map(v => v / temp);
    const max = Math.max(...scaled);
    const exps = scaled.map(v => Math.exp(v - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(v => v / sum);
  }, [temp]);
  return (
    <div className="lab-grid">
      <section className="panel visual-panel">
        <div className="panel-label"><span>Distribution</span><b>Σp = {probs.reduce((a, b) => a + b, 0).toFixed(3)}</b></div>
        <div className="bar-chart">{probs.map((p, i) => <div key={i} className="bar-item"><span style={{ height: `${Math.max(6, p * 190)}px` }}><b>{(p * 100).toFixed(1)}%</b></span><small>x{i}</small></div>)}</div>
      </section>
      <section className="panel controls-panel">
        <div className="panel-label"><span>temperature experiment</span><b>T = {temp.toFixed(1)}</b></div>
        <label className="range-row wide"><span>sharp</span><input type="range" min="0.4" max="2.5" step="0.1" value={temp} onChange={e => setTemp(+e.target.value)} /><output>soft</output></label>
        <ol className="algorithm-steps"><li><b>m = max(x)</b><span>prevent overflow</span></li><li><b>l = Σ exp(x − m)</b><span>find the denominator by reduction</span></li><li><b>p = exp(x − m) / l</b><span>normalize and write</span></li></ol>
      </section>
    </div>
  );
}

function NormalizationLab() {
  const [kind, setKind] = useState<"RMS" | "LAYER">("RMS");
  const raw = [1.8, -0.4, 2.7, 0.3, -1.5, 0.9, 2.1, -0.8];
  const mean = raw.reduce((a, b) => a + b, 0) / raw.length;
  const centered = kind === "LAYER" ? raw.map(v => v - mean) : raw;
  const scale = Math.sqrt(centered.reduce((a, b) => a + b * b, 0) / raw.length + 1e-5);
  const output = centered.map(v => v / scale);
  return (
    <div className="lab-grid">
      <section className="panel visual-panel">
        <div className="panel-label"><span>Activation profile</span><b>{kind}NORM</b></div>
        <div className="norm-chart"><div className="zero-line" />{raw.map((v, i) => <div className="norm-pair" key={i}><span className="raw" style={{ height: `${Math.abs(v) * 28}px`, transform: v < 0 ? "translateY(100%)" : "translateY(0)" }} /><span className="normalized" style={{ height: `${Math.abs(output[i]) * 28}px`, transform: output[i] < 0 ? "translateY(100%)" : "translateY(0)" }} /></div>)}</div>
        <div className="legend"><span><i className="raw-dot" />entry</span><span><i className="norm-dot" />normalized</span></div>
      </section>
      <section className="panel controls-panel">
        <div className="segmented"><button className={kind === "RMS" ? "active" : ""} onClick={() => setKind("RMS")}>RMSNorm</button><button className={kind === "LAYER" ? "active" : ""} onClick={() => setKind("LAYER")}>LayerNorm</button></div>
        <div className="compare-grid"><div><span>centering</span><b>{kind === "LAYER" ? "Yes, subtract μ" : "No"}</b></div><div><span>reduction</span><b>{kind === "LAYER" ? "Σx + Σx²" : "Σx²"}</b></div><div><span>Scale</span><b>{scale.toFixed(3)}</b></div><div><span>Fusion</span><b>γ + residual</b></div></div>
        <div className="callout compact"><b>kernel pattern</b><p>Load row → reduce statistic → normalize value from register → multiply by γ → write in one pass.</p></div>
      </section>
    </div>
  );
}

function AttentionLab() {
  const [seq, setSeq] = useState(2048);
  const [causal, setCausal] = useState(true);
  const naiveMB = (seq * seq * 2) / 1024 / 1024;
  return (
    <div className="lab-grid">
      <section className="panel visual-panel">
        <div className="panel-label"><span>Causal mask</span><b>{causal ? "HISTORY ONLY" : "FULL ACCESS"}</b></div>
        <div className="attention-matrix" aria-label="Attention mask matrix">{Array.from({ length: 64 }, (_, i) => { const r = Math.floor(i / 8), c = i % 8; const open = !causal || c <= r; return <span key={i} className={open ? "open" : "masked"} style={{ opacity: open ? 0.35 + (8 - Math.abs(r - c)) / 14 : 1 }} />; })}</div>
        <button className="toggle-row" onClick={() => setCausal(!causal)} aria-pressed={causal}><span>Mask future tokens</span><i className={causal ? "on" : ""}><b /></i></button>
      </section>
      <section className="panel controls-panel">
        <div className="panel-label"><span>Memory cost</span><b>FP16 1 HEAD</b></div>
        <label className="range-row"><span>S.</span><input type="range" min="256" max="8192" step="256" value={seq} onChange={e => setSeq(+e.target.value)} /><output>{seq}</output></label>
        <div className="memory-compare"><div className="bad"><span>Naive score matrix</span><b>{naiveMB.toFixed(1)} MB</b><small>O(S²) buffer</small></div><div className="good"><span>tiled / online</span><b>Tile scale</b><small>Scores are not written to HBM</small></div></div>
        <div className="pipeline"><span>QKᵀ</span><i>→</i><span>÷√d</span><i>→</i><span>mask</span><i>→</i><span>softmax</span><i>→</i><span>×V</span></div>
      </section>
    </div>
  );
}

const labs: Record<TopicId, () => React.ReactNode> = { gemm: GemmLab, reduction: ReductionLab, softmax: SoftmaxLab, normalization: NormalizationLab, attention: AttentionLab };

function KernelPattern({ topic }: { topic: TopicId }) {
  const content: Record<TopicId, { title: string; items: { n: string; h: string; p: string }[]; code: string[] }> = {
    gemm: { title: "Tiled GEMM bus", items: [{ n: "01", h: "Coalesced load", p: "Neighboring threads read neighboring A/B addresses." }, { n: "02", h: "Shared tiles", p: "The block shares the loaded piece with all warps." }, { n: "03", h: "Register accumulate", p: "Each thread accumulates a small piece of C with FMA." }], code: ["for k_tile in range(0, K, BK):", "a = load(A[m, k_tile:k_tile+BK])", "b = load(B[k_tile:k_tile+BK, n])", "acc += dot(a, b)", "store(C[m, n], acc)"] },
    reduction: { title: "Hierarchical reduction", items: [{ n: "01", h: "Thread-local", p: "Each thread produces a local result from strided inputs." }, { n: "02", h: "warp combine", p: "A combination between registers is made with Shuffle." }, { n: "03", h: "Block finalize", p: "Warp results are terminated in the small shared area." }], code: ["acc = identity", "for i in thread_strided_indices:", "acc = op(acc, x[i])", "acc = warp_reduce(acc)", "if lane == 0: partial[warp] = acc"] },
    softmax: { title: "From three passes to one kernel", items: [{ n: "01", h: "rowmax", p: "The maximum of the line is found by parallel reduction." }, { n: "02", h: "Exp + sum", p: "Shifted exponents and sum are generated in the same tile." }, { n: "03", h: "Normalize + store", p: "The values ​​in the register are divided by the denominator and written." }], code: ["x = load(row, mask=cols < N)", "m = max(x, axis=0)", "z = exp(x - m)", "l = sum(z, axis=0)", "store(out, z / l)"] },
    normalization: { title: "Reduction + pointwise fusion", items: [{ n: "01", h: "Load before", p: "The activation line is loaded once as coalesced." }, { n: "02", h: "Compute stats", p: "The μ/σ² or RMS scale is calculated within the block." }, { n: "03", h: "Affine + residual", p: "γ, β and residual are combined in the same spelling if possible." }], code: ["x = load(row)", "rms = sqrt(mean(x * x) + eps)", "y = x * rsqrt(rms * rms)", "y = y * gamma", "store(out, y)"] },
    attention: { title: "IO-aware attention", items: [{ n: "01", h: "Q tile fixed", p: "The Q part is kept in register/shared memory." }, { n: "02", h: "K/V flow", p: "Blocks K and V are passed through fast memory sequentially." }, { n: "03", h: "online softmax", p: "Running max and total are rescaled as new tiles arrive." }], code: ["for kv_tile in sequence:", "scores = dot(q, k.T) * scale", "m_new = max(m, max(scores))", "l = l * exp(m-m_new) + sum(exp(scores-m_new))", "out = rescale(out) + exp(scores-m_new) @ v"] },
  };
  const c = content[topic];
  return (
    <div className="pattern-section">
      <div className="section-heading"><div><span>KERNEL PATTERN</span><h2>{c.title}</h2></div><p>Performance often comes not from the algorithm, but from how you organize the movement of data.</p></div>
      <div className="pattern-grid">
        <div className="pattern-list">{c.items.map(item => <article key={item.n}><span>{item.n}</span><div><h3>{item.h}</h3><p>{item.p}</p></div></article>)}</div>
        <pre className="code-card"><div><i /><i /><i /><span>kernel.py</span></div><code>{c.code.map((line, i) => <span key={i}><b>{String(i + 1).padStart(2, "0")}</b>{line}</span>)}</code></pre>
      </div>
    </div>
  );
}

function Quiz({ topic, onComplete }: { topic: TopicId; onComplete: () => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const q = quiz[topic];
  return (
    <section className="quiz-card" key={topic}>
      <div><span>INFORMATION CHECK</span><h2>{q.q}</h2></div>
      <div className="quiz-options">{q.options.map((o, i) => <button key={o} className={selected === i ? (i === q.answer ? "correct" : "wrong") : ""} onClick={() => { setSelected(i); if (i === q.answer) onComplete(); }}><i>{String.fromCharCode(65 + i)}</i>{o}<b>{selected === i ? (i === q.answer ? "✓" : "×") : ""}</b></button>)}</div>
      {selected !== null && <p className="quiz-note"><b>{selected === q.answer ? "CORRECT." : "Think again."}</b> {q.note}</p>}
    </section>
  );
}

export default function LlmKernelPatternsEmbedded() {
  const [topic, setTopic] = useState<TopicId>("gemm");
  const [completed, setCompleted] = useState<TopicId[]>([]);
  const current = topicCopy[topic];
  const Lab = labs[topic];
  const selectTopic = (id: TopicId) => { setTopic(id); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <main className="llm-kernel-patterns-embed">
      <header className="topbar">
        <button className="brand" onClick={() => selectTopic("gemm")} aria-label="Kernel Atlas home page"><span className="brand-mark"><i /><i /><i /><i /></span><b>KERNEL<span>ATLAS</span></b></button>
        <nav aria-label="Main sections">{topics.map(t => <button key={t.id} className={topic === t.id ? "active" : ""} onClick={() => selectTopic(t.id)}>{t.name}</button>)}</nav>
        <div className="status"><i /> GPU LAB <span>{completed.length}/5</span></div>
      </header>

      <section className={`hero theme-${topic}`}>
        <div className="hero-grid" />
        <div className="hero-content">
          <div className="hero-copy"><span className="kicker">{current.kicker}</span><h1>{current.title}</h1><p>{current.lead}</p><div className="formula"><span>Core expression</span><code>{current.formula}</code></div></div>
          <aside className="topic-rail"><span>LEARNING ROUTE</span>{topics.map(t => <button key={t.id} className={`${topic === t.id ? "active" : ""} ${completed.includes(t.id) ? "done" : ""}`} onClick={() => selectTopic(t.id)}><i>{t.index}</i><span><small>{t.eyebrow}</small><b>{t.name}</b></span><em>{completed.includes(t.id) ? "✓" : "→"}</em></button>)}</aside>
        </div>
      </section>

      <div className="content-wrap">
        <section className="lab-heading"><div><span>LIVE LAB</span><h2>Change the numbers. See the pattern.</h2></div><p>Adjust the controls and observe how work, memory traffic, and numerical behavior change.</p></section>
        <Lab />
        <KernelPattern topic={topic} />
        <section className="principles">
          <article><span>01</span><h3>Correctness first</h3><p>Compare against a reference with tolerances; test boundary shapes, masks, and dtypes separately.</p></article>
          <article><span>02</span><h3>Measure before deciding</h3><p>Report median time, effective bandwidth, and FLOP/s after warm-up.</p></article>
          <article><span>03</span><h3>Name the bottleneck</h3><p>Is the kernel compute-bound or memory-bound? Prove it with occupancy, registration and access patterns.</p></article>
        </section>
        <Quiz topic={topic} onComplete={() => setCompleted(c => c.includes(topic) ? c : [...c, topic])} />
        <div className="next-row"><div><span>NEXT CHAPTER</span><b>{topics[(topics.findIndex(t => t.id === topic) + 1) % topics.length].name}</b></div><button onClick={() => selectTopic(topics[(topics.findIndex(t => t.id === topic) + 1) % topics.length].id)}>Follow the route <span>→</span></button></div>
      </div>

      <footer><button className="brand" onClick={() => selectTopic("gemm")}><span className="brand-mark"><i /><i /><i /><i /></span><b>KERNEL<span>ATLAS</span></b></button><p>Interactive field guide to GPU kernel engineering.</p><span>CUDA · TRITON · PYTORCH</span></footer>
    </main>
  );
}
