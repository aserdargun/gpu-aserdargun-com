"use client";

import { useMemo, useState } from "react";

type QuantGoal = "memory" | "latency" | "quality";
type Bottleneck = "ttft" | "itl" | "oom" | "gpu";

const modules = [
  ["01", "vLLM Engine", "#vllm"],
  ["02", "CUDA Graphs", "#graphs"],
  ["03", "Quantization", "#quantization"],
  ["04", "Optimizasyon", "#optimization"],
  ["05", "Measurement", "#measurement"],
];

const quantData = {
  memory: {
    eyebrow: "MEMORY PRIORITY",
    title: "Start with INT4/AWQ or GPTQ",
    copy: "Powerfully reduces weight memory. Budget KV cache and workspace memory separately; 4-bit weights do not guarantee reducing the total VRAM to a quarter.",
    accent: "lime",
  },
  latency: {
    eyebrow: "DELAY PRIORITY",
    title: "Try FP8 + optimized kernel path",
    copy: "It targets the Tensor Core path and smaller data movement on the appropriate GPU. Don't assume gains without measuring hardware, model architecture and kernel support.",
    accent: "cyan",
  },
  quality: {
    eyebrow: "QUALITY IS A PRIORITY",
    title: "BF16 keep baseline",
    copy: "Save the BF16 quality and performance baseline first. Then compare the weight-only or FP8 candidates with the same prompts and fixed sampling settings.",
    accent: "coral",
  },
};

const bottlenecks: Record<Bottleneck, { label: string; diagnosis: string; actions: string[] }> = {
  ttft: {
    label: "TTFT high",
    diagnosis: "Prefill, tail or long prompt path may dominate.",
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
    actions: ["reduce max_model_len and max_num_seqs", "Monitor KV cache capacity on a block basis", "Verify KV cache quantization compliance"],
  },
  gpu: {
    label: "GPU low usage",
    diagnosis: "Request arrival, CPU scheduling, network or small batch could be starving the GPU.",
    actions: ["Perform a concurrency sweep", "Profile CPU and tokenizer time", "Check out continuous batching and async scheduling"],
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
    <main className="inference-systems-embed">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Inference Systems Lab home page">
          <span className="brand-mark">WORK</span>
          <span>INFERENCE SYSTEMS LAB</span>
        </a>
        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="#vllm">Topics</a>
          <a href="#labs">Lab</a>
          <a href="#measurement">Measurement</a>
        </nav>
        <a className="status-pill" href="#quiz"><span /> TEST YOURSELF</a>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="kicker"><span>GPU INFERENCE / 2026</span><span>INTERACTIVE GUIDE</span></div>
          <h1>MORE<br />TOKEN.<br /><em>LESS</em><br />WAIT.</h1>
          <p className="hero-intro">Explore the modern LLM serving system layer by layer, from vLLM's scheduler to CUDA Graphs replay, from 4-bit weights to the throughput benchmark.</p>
          <div className="hero-actions">
            <a className="primary-cta" href="#vllm">OPEN SYSTEM <span>↓</span></a>
            <span className="read-time">≈ 25 min reading<br />4 interactive labs</span>
          </div>
        </div>
        <div className="hero-visual" aria-label="Inference flow from request to token">
          <div className="visual-label">LIVE STREAM / DECODE STEP 128</div>
          <div className="request request-a"><span>REQ 01</span><b>16 full</b></div>
          <div className="request request-b"><span>REQ 02</span><b>1 full</b></div>
          <div className="request request-c"><span>REQ 03</span><b>8 full</b></div>
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
          <div className="rail-note"><b>AIM</b><p>Not memorizing a flag, but measuring the bottleneck and choosing the right leverage.</p></div>
        </aside>

        <div className="lesson-flow">
          <section className="lesson" id="vllm">
            <div className="section-index">01/VLLM ENGINE</div>
            <div className="section-heading">
              <h2>Serving is more than a pattern call.</h2>
              <p>vLLM turns variable-length requests into a continuous GPU workflow. The gain is not from a single kernel; It comes from the collaboration of scheduling, KV cache and execution layers.</p>
            </div>

            <div className="pipeline">
              <div className="pipe-node"><span>01</span><b>API SERVER</b><small>OpenAI compatible request</small></div>
              <div className="pipe-arrow">→</div>
              <div className="pipe-node active"><span>02</span><b>SCHEDULER</b><small>Token budget + queue</small></div>
              <div className="pipe-arrow">→</div>
              <div className="pipe-node"><span>03</span><b>MODEL RUNNER</b><small>Forward + sampling</small></div>
              <div className="pipe-arrow">→</div>
              <div className="pipe-node"><span>04</span><b>STREAM</b><small>Token response</small></div>
            </div>

            <div className="concept-grid">
              <article><span className="concept-tag">PAGED ATTENTION</span><h3>KV divides the cache into blocks</h3><p>It works with fixed-size blocks instead of allocating large, contiguous space for each request. This reduces fragmentation and blocks can be added as requests grow.</p><div className="block-viz">{Array.from({ length: 18 }).map((_, i) => <i className={i % 5 === 4 ? "gap" : i < 13 ? "used" : ""} key={i} />)}</div></article>
              <article><span className="concept-tag">CONTINUOUS BATCHING</span><h3>Batch does not wait for the request to finish</h3><p>At each decode step, the completed request exits and the pending request can enter. Reduces the “wait for slowest” cost of static batch.</p><div className="timeline-viz"><i style={{ width: "82%" }} /><i style={{ width: "48%" }} /><i style={{ width: "68%" }} /><i className="new" style={{ width: "31%" }} /></div></article>
              <article><span className="concept-tag">CHUNKED PREFILL</span><h3>Slices long prompt</h3><p>It can schedule compute-intensive prefill parts in the same step as memory-intensive decode jobs. Token budget is one of the main buttons of the TTFT–ITL balance.</p><div className="chunk-viz"><i /><i /><i /><b>D.</b><b>D.</b><i /></div></article>
              <article><span className="concept-tag">PREFIX CACHING</span><h3>Reuses common beginning</h3><p>Matching KV blocks are not recalculated when the same system prompt or shared context comes up again. The largest value occurs in repetitive prefix workloads.</p><div className="prefix-viz"><span>SYSTEM</span><span>POLICY</span><b>USER A</b><b>USER B</b></div></article>
            </div>
          </section>

          <section className="lab-panel" id="labs">
            <div className="lab-header"><div><span>LAB/01</span><h2>Serving lever simulator</h2></div><p>Pedagogical model · not a true benchmark</p></div>
            <div className="lab-body">
              <div className="controls">
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
                <div className="result-metric"><span>ESTIMATED THROUGHPUT</span><b>{serving.throughput}</b><small>full/h</small></div>
                <div className="result-metric"><span>ESTIMATED TTFT</span><b>{serving.ttft}</b><small>ms</small></div>
                <div className="mini-bars"><span style={{ height: `${Math.min(100, serving.throughput)}%` }} /><span style={{ height: `${Math.min(100, serving.ttft / 12)}%` }} /></div>
                <p>This result only tells the direction. Real value; Varies with model, GPU, prompt distribution, concurrency and version.</p>
              </div>
            </div>
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
                <strong>≈ %{graphSaving} LESS LAUNCH COST</strong>
              </div>
            </div>
          </section>

          <section className="lesson" id="quantization">
            <div className="section-index">03 / QUANTIZATION</div>
            <div className="section-heading"><h2>Less bits alone does not mean fast.</h2><p>Quantization narrows the numerical representation of weights, activations, or KV cache. Conclusion; There may be less memory and data movement. Speed   only comes when the hardware and the kernel path run this format efficiently.</p></div>

            <div className="precision-stack">
              <div className="precision-head"><span>FORMAT</span><span>APPROXIMATE WEIGHT SIZE*</span><span>MAIN TRADE-OFF</span></div>
              {[
                ["BF16", "16 bit", "1.00×", "Strong baseline", "100%"],
                ["FP8", "8 bit", "0.50×", "Hardware + scale path", "50%"],
                ["INT8", "8 bit", "0.50×", "Depends on kernel support", "50%"],
                ["INT4", "4 bits", "0.25×", "Quality and dequant cost", "25%"],
              ].map(([name, bit, ratio, note, width]) => <div className="precision-row" key={name}><b>{name}<small>{bit}</small></b><div><i style={{ width }} /></div><strong>{ratio}</strong><span>{note}</span></div>)}
              <small className="footnote">* Theoretical raw size of weights only; Except for metadata, scale, padding, KV cache and runtime workspace.</small>
            </div>

            <div className="quant-tools">
              <div className="memory-calc">
                <span className="tool-label">LAB / 03 · WEIGHT MEMORY</span><h3>Weigh the model</h3>
                <label htmlFor="parameter-count-en">PARAMETER <b>{params}B</b></label><input id="parameter-count-en" type="range" min="1" max="70" value={params} onChange={(e) => setParams(Number(e.target.value))} />
                <span className="tool-label">PRECISION</span><div className="segmented">{[16, 8, 4].map((b) => <button type="button" className={bits === b ? "selected" : ""} onClick={() => setBits(b)} key={b}>{b}-BIT</button>)}</div>
                <div className="memory-output"><span>THEORETICAL WEIGHT MEMORY</span><b>{weightMemory.toFixed(1)} <small>GB</small></b><p>It is the decimal GB approach, not GiB.</p></div>
              </div>
              <div className="decision-card">
                <span className="tool-label">DECISION ASSISTANT</span><h3>What's your priority?</h3>
                <div className="goal-tabs">{(["memory", "latency", "quality"] as QuantGoal[]).map((g) => <button type="button" onClick={() => setGoal(g)} className={goal === g ? "selected" : ""} key={g}>{g === "memory" ? "MEMORY" : g === "latency" ? "DELAY" : "QUALITY"}</button>)}</div>
                <div className={`recommendation ${quantData[goal].accent}`}><span>{quantData[goal].eyebrow}</span><h4>{quantData[goal].title}</h4><p>{quantData[goal].copy}</p></div>
              </div>
            </div>
          </section>

          <section className="lesson optimization" id="optimization">
            <div className="section-index">04 / INFERENCE OPTIMIZATION</div>
            <div className="section-heading"><h2>First the bottleneck.<br />Then leverage.</h2><p>The fastest configuration is not universal. Prefill can be compute-bound, decode can be memory-bound; In low traffic, latency dominates, and in high traffic, throughput dominates. Tie each change to the target metric.</p></div>

            <div className="roofline-card">
              <div className="roof-copy"><span>SYSTEM MAP</span><h3>Two different hot ways</h3><p><b>Prefill</b> processes multiple tokens in parallel; Large matrix multiplications can consume compute capacity. <b>Decode</b> It reads the weights at each step and generates few tokens; data movement can be dominant.</p></div>
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
              <div className="detective-menu"><span>LAB/04</span><h3>bottleneck detective</h3><p>Choose the main symptom you observe.</p>{(Object.keys(bottlenecks) as Bottleneck[]).map((key) => <button type="button" className={bottleneck === key ? "selected" : ""} onClick={() => setBottleneck(key)} key={key}>{bottlenecks[key].label}<span>→</span></button>)}</div>
              <div className="diagnosis"><span>POSSIBLE DIAGNOSIS</span><h3>{bottlenecks[bottleneck].diagnosis}</h3><ol>{bottlenecks[bottleneck].actions.map((action) => <li key={action}>{action}</li>)}</ol><p>Don't declare a root cause by looking at a single metric. Examine GPU timeline, scheduler statistics and request distribution together.</p></div>
            </div>
          </section>

          <section className="lesson measurement" id="measurement">
            <div className="section-index">05 / MEASUREMENT DISCIPLINE</div>
            <div className="section-heading"><h2>Benchmark is not a single number.</h2><p>Latency and throughput tell different stories even in the same experiment. Results without reporting warm-up, concurrency, prompt/output length and percentages are not portable.</p></div>
            <div className="metric-grid">
              <article><span>TTFT</span><h3>Time to First Token</h3><p>Tail + prefill + initial decode. User perception of “answer started”.</p></article>
              <article><span>ITL</span><h3>Inter-token Latency</h3><p>The time between consecutive tokens when streaming.</p></article>
              <article><span>TPOT</span><h3>Time per Output Token</h3><p>The ratio of production time after the first token to the number of output tokens.</p></article>
              <article><span>TOC/S</span><h3>throughput</h3><p>The amount of input/output tokens completed by the system per unit time.</p></article>
            </div>
            <div className="benchmark-card">
              <div><span>PRODUCTION CHECKLIST</span><h3>repeatable running</h3><p>Before/after comparisons are unreliable without the same model revision, tokenizer and sampling settings.</p></div>
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
            <div className="quiz-intro"><span>KNOWLEDGE CHECK</span><h2>Do you understand the system?</h2><p>Verify key tradeoffs with three quick questions.</p><div className="score"><b>{quizScore}</b><span>/ 3<br />TRUE</span></div></div>
            <div className="quiz-list">
              {quiz.map((item, qIndex) => <fieldset key={item.q}><legend><span>0{qIndex + 1}</span>{item.q}</legend>{item.options.map((option, oIndex) => {
                const selected = answers[qIndex] === oIndex;
                const answered = answers[qIndex] !== -1;
                const correct = oIndex === item.answer;
                return <button type="button" className={`${selected ? "selected" : ""} ${answered && selected ? (correct ? "correct" : "wrong") : ""}`} onClick={() => setAnswers((current) => current.map((a, i) => i === qIndex ? oIndex : a))} key={option}><span>{String.fromCharCode(65 + oIndex)}</span>{option}{answered && selected && <b>{correct ? "TRUE" : "THINK AGAIN"}</b>}</button>;
              })}</fieldset>)}
            </div>
          </section>

          <section className="sources">
            <div><span>WELDING TABLE</span><h2>Go deep.</h2></div>
            <div className="source-links">
              <a href="https://docs.vllm.ai/en/latest/" target="_blank" rel="noreferrer"><span>01</span><b>vLLM Documentation</b><ArrowIcon /></a>
              <a href="https://docs.vllm.ai/en/latest/configuration/optimization/" target="_blank" rel="noreferrer"><span>02</span><b>Optimization &amp; Tuning</b><ArrowIcon /></a>
              <a href="https://docs.nvidia.com/cuda/cuda-programming-guide/04-special-topics/cuda-graphs.html" target="_blank" rel="noreferrer"><span>03</span><b>NVIDIA CUDA Graphs</b><ArrowIcon /></a>
              <a href="https://docs.vllm.ai/en/latest/features/quantization/" target="_blank" rel="noreferrer"><span>04</span><b>vLLM Quantization</b><ArrowIcon /></a>
            </div>
          </section>
        </div>
      </div>

      <footer><a className="brand" href="#top"><span className="brand-mark">WORK</span><span>INFERENCE SYSTEMS LAB</span></a><p>MEASURE → DIAGNOSE → REPLACE → MEASURE AGAIN</p><a href="#top">RETURN TO TOP ↑</a></footer>
    </main>
  );
}
