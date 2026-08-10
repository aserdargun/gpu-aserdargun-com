"use client";

import { useMemo, useState } from "react";

type Lens = "systems" | "compute" | "benchmark";
type Scenario = "launch" | "memory" | "noise";

const navItems = [
  ["00", "mental model", "#model"],
  ["01", "Nsight Systems", "#systems"],
  ["02", "Nsight Compute", "#compute"],
  ["03", "Benchmark", "#benchmark"],
  ["04", "Uygulama", "#practice"],
] as const;

const lensData: Record<Lens, { kicker: string; title: string; question: string; output: string; color: string }> = {
  systems: {
    kicker: "WIDE ANGLE",
    title: "Nsight Systems",
    question: "Where is time lost? How do CPU, GPU, copy and sync overlap?",
    output: ".nsys-rep · timeline",
    color: "cyan",
  },
  compute: {
    kicker: "MICROSCOPE",
    title: "Nsight Compute",
    question: "Why is the kernel I chose slow? Memory, execution units, occupancy or instruction mix?",
    output: ".ncu-rep · kernel metrics",
    color: "lime",
  },
  benchmark: {
    kicker: "HAKEM",
    title: "Reliable benchmark",
    question: "Is the change really faster, or is it just heat, clock frequency and measurement noise?",
    output: "raw samples median distribution",
    color: "orange",
  },
};

const scenarioData: Record<Scenario, { title: string; subtitle: string; cpu: number[]; gpu: number[]; copy: number[]; clues: string[]; verdict: string; next: string }> = {
  launch: {
    title: "Launch-bound",
    subtitle: "Lots of small kernels",
    cpu: [8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74],
    gpu: [12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78],
    copy: [],
    clues: ["Kernel times are short", "CPU launch intervals visible", "There are gaps on the GPU"],
    verdict: "Kernel is not standalone, dispatch chain is expensive.",
    next: "Try Fusion, CUDA Graphs or batch scaling; then measure again.",
  },
  memory: {
    title: "Transfer-bound",
    subtitle: "The copy splits the calculation",
    cpu: [5, 46],
    gpu: [24, 57],
    copy: [10, 42, 69],
    clues: ["H2D/D2H dominant", "Copy and kernel do not overlap", "There is frequent synchronization"],
    verdict: "Data movement lengthens the critical path.",
    next: "Examine pinned memory, async copy, stream overlap and data placement.",
  },
  noise: {
    title: "noisy running",
    subtitle: "Single measurement is misleading",
    cpu: [7, 28, 63],
    gpu: [12, 34, 44, 72],
    copy: [54],
    clues: ["The difference between runs is high", "First iteration outlier", "Time/temperature status changes"],
    verdict: "The measurement protocol cannot explain the result.",
    next: "Fix benchmark conditions first; Time comparison with profiler.",
  },
};

const computeModes = {
  memory: {
    tag: "MEMORY LIMITED",
    title: "Data feed rate is at the limit",
    metric: "DRAM throughput 86%",
    copy: "Arithmetic intensity is low; The point is near the sloping memory ceiling. Access aggregation, data reuse, and unnecessary traffic are the first candidates.",
    checks: ["Memory Workload Analysis", "L1/L2 hit rate", "Bytes / useful element", "Global load efficiency"],
    point: [31, 64],
  },
  compute: {
    tag: "COMPUTATION LIMITED.",
    title: "Near execution ceiling",
    metric: "SM throughput 91%",
    copy: "Arithmetic intensity is high; The point is approaching the horizontal compute ceiling. Instruction mix, Tensor Core usage and account reduction are more valuable.",
    checks: ["speed of light", "instruction statistics", "Tensor pipe utilization", "Eligible warps"],
    point: [73, 24],
  },
  latency: {
    tag: "DELAY / SCHEDULING",
    title: "away from both ceilings",
    metric: "Eligible warps 0.7 / cycle",
    copy: "If the bandwidth and compute are not full, there may be dependencies, stalls, low parallelism, or unstable work. Don't just look at the occupancy number.",
    checks: ["Warp State Statistics", "Scheduler Statistics", "Achieved occupancy", "Launch configuration"],
    point: [50, 76],
  },
} as const;

const quiz = [
  {
    q: "The application has slowed down; You don't know yet which kernel is responsible.",
    options: ["First ncu --set full", "nsys timeline before", "Just time.time()"],
    answer: 1,
    why: "First you need to find the wide angle critical path and expensive kernel/range.",
  },
  {
    q: "The time measured by the host timer under Nsight Compute was extended. What results?",
    options: ["Kernel definitely slowed down", "Profiler overhead can disrupt time", "GPU broken"],
    answer: 1,
    why: "Metric collection and replay eliminates the wall clock measurement under the profiler as a benchmark.",
  },
  {
    q: "Optimized version: 41.2 µs; base version: 42.0 µs; Deviation between runs is 4%.",
    options: ["1.9% sure gain", "No significant difference", "2× acceleration"],
    answer: 1,
    why: "The observed difference is smaller than the noise floor; A stronger protocol and more samples are needed.",
  },
];

function CodeBlock({ children, label }: { children: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="code-block">
      <div className="code-head"><span>{label}</span><button onClick={copy} aria-label={`${label} komutunu kopyala`}>{copied ? "copied" : "Kopyala"}</button></div>
      <pre><code>{children}</code></pre>
    </div>
  );
}

export default function NsightBenchmarkEmbedded() {
  const [lens, setLens] = useState<Lens>("systems");
  const [scenario, setScenario] = useState<Scenario>("launch");
  const [computeMode, setComputeMode] = useState<keyof typeof computeModes>("memory");
  const [baseline, setBaseline] = useState(42.8);
  const [optimized, setOptimized] = useState(35.6);
  const [jitter, setJitter] = useState(1.2);
  const [protocol, setProtocol] = useState({ warmup: true, sync: true, repeats: true, environment: false, raw: true });
  const [answers, setAnswers] = useState<number[]>([-1, -1, -1]);
  const [commandTab, setCommandTab] = useState<"systems" | "compute" | "pytorch">("systems");

  const bench = useMemo(() => {
    const delta = baseline - optimized;
    const speedup = baseline / optimized;
    const pct = (delta / baseline) * 100;
    const enabled = Object.values(protocol).filter(Boolean).length;
    const signal = Math.abs(pct) / Math.max(jitter, 0.1);
    const grade = enabled === 5 && signal >= 3 ? "A" : enabled >= 4 && signal >= 2 ? "B" : enabled >= 3 ? "C" : "D";
    return { delta, speedup, pct, enabled, signal, grade };
  }, [baseline, optimized, jitter, protocol]);

  const quizScore = answers.reduce((sum, answer, i) => sum + (answer === quiz[i].answer ? 1 : 0), 0);
  const activeScenario = scenarioData[scenario];
  const activeCompute = computeModes[computeMode];

  return (
    <main className="nsight-benchmark-embed">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Kernel Measurement Laboratory home page">
          <span className="brand-mark">K</span>
          <span>KERNEL / LAB</span>
        </a>
        <div className="top-status"><span className="pulse" /> INTERACTIVE GUIDE <span className="version">GB · 01</span></div>
      </header>

      <div className="shell" id="top">
        <aside className="rail" aria-label="Departments">
          <div className="rail-label">LAB NOTES</div>
          <nav>
            {navItems.map(([n, title, href]) => (
              <a href={href} key={href}><span>{n}</span>{title}</a>
            ))}
          </nav>
          <div className="rail-card">
            <div className="mini-label">GOLDEN RULE</div>
            <p>Profiler diagnoses.<br />Benchmark decides.</p>
          </div>
        </aside>

        <div className="content">
          <section className="hero" id="model">
            <div className="eyebrow"><span>GPU PERFORMANCE FIELD GUIDE</span><i /></div>
            <div className="hero-grid">
              <div>
                <h1>Speed   is unpredictable.<br /><em>It is proven.</em></h1>
                <p className="hero-copy">Find the critical path with Nsight Systems. Open the kernel with Nsight Compute. Prove whether the change really works with a controlled benchmark.</p>
                <div className="hero-actions">
                  <a className="primary-button" href="#systems">Enter the laboratory <span>↓</span></a>
                  <span className="read-time">45 min · hands-on reading</span>
                </div>
              </div>
              <div className="scope-card" aria-label="Profiling mental model">
                <div className="scope-grid" />
                <div className="scope-ring ring-one" />
                <div className="scope-ring ring-two" />
                <div className="scope-ring ring-three" />
                <div className="scope-core">?</div>
                <div className="scope-note note-a"><b>01</b> WHERE?</div>
                <div className="scope-note note-b"><b>02</b> WHICH SCOPE?</div>
                <div className="scope-note note-c"><b>03</b> IS IT REAL?</div>
              </div>
            </div>
            <div className="principle-strip">
              <span>MEASUREMENT QUESTION</span><b>→</b><span>THE RIGHT TOOL</span><b>→</b><span>NARROW SCOPE</span><b>→</b><span>REPEATABLE EVIDENCE</span>
            </div>
          </section>

          <section className="section lens-section" aria-labelledby="lens-title">
            <div className="section-number">00 / MENTAL MODEL</div>
            <div className="section-title-row">
              <div><h2 id="lens-title">Three tools, three different questions</h2><p>Instead of measuring the same run with three instruments, reduce uncertainty sequentially.</p></div>
              <div className="corner-note">WIDE ANGLE → MICROSCOPE → REFEREE</div>
            </div>
            <div className="lens-switch" role="tablist" aria-label="Measuring tool selection">
              {(Object.keys(lensData) as Lens[]).map((key, i) => (
                <button key={key} role="tab" aria-selected={lens === key} onClick={() => setLens(key)} className={lens === key ? "active" : ""}>
                  <span>0{i + 1}</span>{lensData[key].title}
                </button>
              ))}
            </div>
            <div className={`lens-display ${lensData[lens].color}`}>
              <div className="lens-index">{lens === "systems" ? "S" : lens === "compute" ? "C" : "B"}</div>
              <div><div className="mini-label">{lensData[lens].kicker}</div><h3>{lensData[lens].question}</h3><p>{lensData[lens].output}</p></div>
              <div className="lens-rule">
                <span>IMPROPER USE</span>
                <p>{lens === "systems" ? "Searching for the instruction-level bottleneck of a single kernel" : lens === "compute" ? "Compare the end-to-end time of the application" : "Counting the time spent while Profiler is open as a performance result"}</p>
              </div>
            </div>
          </section>

          <section className="section" id="systems" aria-labelledby="systems-title">
            <div className="section-number cyan-text">01 / NSIGHT SYSTEMS</div>
            <div className="section-title-row">
              <div><h2 id="systems-title">Read the timeline first</h2><p>Nsight Systems answers “why is the application waiting?” before you ask “which kernel is slow?”</p></div>
              <span className="tool-pill cyan-pill">NSYS · SYSTEM-WIDE</span>
            </div>

            <div className="scenario-tabs" role="tablist" aria-label="Timeline scenarios">
              {(Object.keys(scenarioData) as Scenario[]).map((key) => (
                <button key={key} onClick={() => setScenario(key)} className={scenario === key ? "active" : ""}>
                  <span>{scenarioData[key].title}</span><small>{scenarioData[key].subtitle}</small>
                </button>
              ))}
            </div>

            <div className="timeline-card">
              <div className="timeline-head">
                <div><span className="live-dot" /> CAPTURE/inference_step</div>
                <div>0 µs <span>············</span> 100 µs</div>
              </div>
              <div className="timeline-ruler">{[0, 20, 40, 60, 80, 100].map(n => <span key={n} style={{ left: `${n}%` }}>{n}</span>)}</div>
              <div className="track"><span>CPU / CUDA API</span><div className="track-line cpu-line">{activeScenario.cpu.map((x, i) => <i key={i} style={{ left: `${x}%`, width: scenario === "launch" ? "4%" : "13%" }} />)}</div></div>
              <div className="track"><span>GPU / STREAM 7</span><div className="track-line gpu-line">{activeScenario.gpu.map((x, i) => <i key={i} style={{ left: `${x}%`, width: scenario === "launch" ? "4.6%" : "18%" }} />)}</div></div>
              <div className="track"><span>MEMCPY</span><div className="track-line copy-line">{activeScenario.copy.map((x, i) => <i key={i} style={{ left: `${x}%`, width: "18%" }} />)}</div></div>
              <div className="timeline-analysis">
                <div><span>OBSERVATION</span><strong>{activeScenario.verdict}</strong></div>
                <ul>{activeScenario.clues.map(clue => <li key={clue}>{clue}</li>)}</ul>
                <div className="next-action"><span>NEXT MOVE</span>{activeScenario.next}</div>
              </div>
            </div>

            <div className="two-col content-cards">
              <article className="info-card">
                <span className="card-index">A / CATCH</span>
                <h3>Minimal trace, clear question</h3>
                <p>First collect CUDA and NVTX traces. Choose a short, representative window. Unnecessary CPU sampling and long capture enlarges the file and embeds the signal.</p>
                <CodeBlock label="system trace" children={'nsys profile --trace=cuda,nvtx\\\n  --sample=none --cpuctxsw=none \\\n  -o reports/step ./your_app'} />
              </article>
              <article className="info-card">
                <span className="card-index">B / SUMMARY</span>
                <h3>Numerical summary before GUI</h3>
                <p>Scan total GPU time, kernel instance count, median and API cost. “% Time” may not be the percentage of the application wall clock; Read the report denominator.</p>
                <CodeBlock label="Report summary" children={'nsys stats --report cuda_gpu_sum \\\n  --report cuda_api_sum\\\n  reports/step.nsys-rep'} />
              </article>
            </div>

            <div className="check-grid">
              {[
                ["GPU gaps", "CPU latency, synchronization or data preparation?"],
                ["Memcpy overlap", "Do the copies proceed simultaneously with kernel execution?"],
                ["Kernel granularity", "Thousands of small launches or a few long kernels?"],
                ["Critical NVTX range", "Does the region you will optimize affect end-to-end time?"],
              ].map(([title, copy], i) => <div key={title}><b>0{i + 1}</b><span>{title}</span><p>{copy}</p></div>)}
            </div>
          </section>

          <section className="section" id="compute" aria-labelledby="compute-title">
            <div className="section-number lime-text">02 / NSIGHT COMPUTE</div>
            <div className="section-title-row">
              <div><h2 id="compute-title">Then take the single kernel into the microscope.</h2><p>Filter hot kernel proven in Systems. Collect sections that test your hypothesis, not every metric.</p></div>
              <span className="tool-pill lime-pill">NCU · KERNEL-SCOPE</span>
            </div>

            <div className="compute-layout">
              <div className="roofline-card">
                <div className="chart-head"><div><span>ROOFLINE / SCHEMATIC</span><b>PERFORMANCE</b></div><small>up is better</small></div>
                <div className="roofline-chart" aria-label="Schematic Roofline chart">
                  <div className="y-label">FLOP/s</div><div className="x-label">Arithmetic intensity →</div>
                  <div className="roof-slope" /><div className="roof-flat" />
                  <div className="roof-label memory-label">memory roof</div><div className="roof-label compute-label">compute roof</div>
                  <div className={`chart-point ${computeMode}`} style={{ left: `${activeCompute.point[0]}%`, top: `${activeCompute.point[1]}%` }}><span /></div>
                </div>
                <p className="chart-caveat">Roofline is not a judgment, but a navigation tool. Which ceiling the point is closest to determines the next metric.</p>
              </div>

              <div className="diagnosis-panel">
                <div className="mode-buttons">
                  {(Object.keys(computeModes) as (keyof typeof computeModes)[]).map(key => <button key={key} className={computeMode === key ? "active" : ""} onClick={() => setComputeMode(key)}>{key === "memory" ? "Memory" : key === "compute" ? "Compute" : "Latency"}</button>)}
                </div>
                <div className="diagnosis-content">
                  <span className="signal-tag">{activeCompute.tag}</span>
                  <h3>{activeCompute.title}</h3>
                  <div className="hero-metric">{activeCompute.metric}</div>
                  <p>{activeCompute.copy}</p>
                  <div className="metric-list"><span>REVIEW</span>{activeCompute.checks.map((x, i) => <div key={x}><b>0{i + 1}</b>{x}</div>)}</div>
                </div>
              </div>
            </div>

            <div className="decision-flow" aria-label="Kernel diagnostic decision flow">
              <div className="flow-start">Is SOL low?<small>SM + Memory utilization</small></div><i>→</i>
              <div><b>Yes</b> launch, parallelism, stall</div><i>↘</i>
              <div><b>No</b> Which ceiling is closest?</div><i>→</i>
              <div className="flow-end"><span>MEM</span> traffic / cache <em>·</em> <span>S.M.</span> instruction / pipe</div>
            </div>

            <div className="two-col content-cards">
              <article className="info-card lime-border">
                <span className="card-index">A / CLOSE</span>
                <h3>One kernel, several launches</h3>
                <p><code>--set full</code> Profiling the entire application with produces a lot of replay and high overhead. First the name filter, then the number of launches.</p>
                <CodeBlock label="Targeted kernel profile" children={'ncu --set basic\\\n  --kernel-name regex:".*rmsnorm.*" \\\n  --launch-skip 5 --launch-count 3\\\n  -o reports/rmsnorm ./your_app'} />
              </article>
              <article className="info-card lime-border">
                <span className="card-index">B / HYPOTHESIS</span>
                <h3>Choose Section, memorize not metric</h3>
                <p>SpeedOfLight and LaunchStats for a first look; followed by just the pointed MemoryWorkloadAnalysis, SchedulerStats, or SourceCounters.</p>
                <CodeBlock label="Selected sections" children={'ncu --section SpeedOfLight \\\n  --section LaunchStats\\\n  --section MemoryWorkloadAnalysis\\\n  --kernel-name regex:".*rmsnorm.*" ./your_app'} />
              </article>
            </div>

            <div className="warning-band"><b>PROFILER TRAP</b><span>Nsight Compute adds replay and metric collection overhead. Using the end-to-end time obtained by the host timer or CUDA event under NCU as a benchmark result.</span></div>
          </section>

          <section className="section" id="benchmark" aria-labelledby="benchmark-title">
            <div className="section-number orange-text">03 / RELIABLE BENCHMARK</div>
            <div className="section-title-row">
              <div><h2 id="benchmark-title">Separate gain from noise</h2><p>Benchmark is not a stopwatch; It is a small experiment comparing two versions under the same conditions.</p></div>
              <span className="tool-pill orange-pill">UNPROFILED · REPEATED</span>
            </div>

            <div className="bench-lab">
              <div className="bench-inputs">
                <div className="mini-label">EXPERIMENT INPUTS</div>
                <label>base median <span>{baseline.toFixed(1)} µs</span><input type="range" min="10" max="100" step="0.1" value={baseline} onChange={e => setBaseline(Number(e.target.value))} /></label>
                <label>Optimized median <span>{optimized.toFixed(1)} µs</span><input type="range" min="10" max="100" step="0.1" value={optimized} onChange={e => setOptimized(Number(e.target.value))} /></label>
                <label>Noise between runs <span>±{jitter.toFixed(1)}%</span><input type="range" min="0.1" max="10" step="0.1" value={jitter} onChange={e => setJitter(Number(e.target.value))} /></label>
                <div className="protocol-list">
                  {[
                    ["warmup", "Warm-up / lazy init"], ["sync", "GPU synchronization"], ["repeats", "Multiple replicates + median"], ["environment", "Fixed environment/clock/power"], ["raw", "Store raw samples"],
                  ].map(([key, label]) => <label key={key} className="toggle-row"><input type="checkbox" checked={protocol[key as keyof typeof protocol]} onChange={() => setProtocol(p => ({ ...p, [key]: !p[key as keyof typeof p] }))} /><span className="toggle" /><b>{label}</b></label>)}
                </div>
              </div>
              <div className="bench-result">
                <div className="grade-ring"><span>TRUST</span><b>{bench.grade}</b><small>{bench.enabled}/5 control</small></div>
                <div className="result-grid">
                  <div><span>ACCELERATION</span><b>{bench.speedup.toFixed(2)}×</b></div>
                  <div><span>DIFFERENCE</span><b>{bench.pct.toFixed(1)}%</b></div>
                  <div><span>SIGNAL / NOISE</span><b>{bench.signal.toFixed(1)}</b></div>
                </div>
                <div className={`verdict ${bench.grade.toLowerCase()}`}>
                  <span>{bench.grade === "A" ? "STRONG EVIDENCE" : bench.grade === "B" ? "REASONABLE EVIDENCE" : "INSUFFICIENT EVIDENCE"}</span>
                  <p>{bench.grade === "A" ? "The difference is significantly greater than the noise and the protocol is complete." : bench.grade === "B" ? "The result is promising; Complete the missing check and repeat." : "Claims of acceleration in these conditions are unreliable."}</p>
                </div>
              </div>
            </div>

            <div className="benchmark-rules">
              {[
                ["01", "accuracy first", "The base and optimized version should produce the same result within tolerance."],
                ["02", "Warmup separate", "Context creation, JIT and cache filling should be excluded from the measurement."],
                ["03", "Async awareness", "The CPU timer should not stop before the GPU job is finished; Use correct synchronization."],
                ["04", "Show distribution", "Report median, number of samples, spread, and outliers instead of single numbers."],
                ["05", "shape matrix", "A single shape victory cannot be generalized; Measure small/medium/large and realistic shapes."],
                ["06", "media recording", "Store GPU, driver, CUDA, power mode, clock, dtype and compilation flags."],
              ].map(([n, title, copy]) => <article key={n}><span>{n}</span><div><h3>{title}</h3><p>{copy}</p></div></article>)}
            </div>

            <CodeBlock label="PyTorch benchmark scaffold" children={'from torch.utils.benchmark import Timer\n\nt = Timer(\n    stmt="optimized(x)",\n    setup="from __main__ import optimized, x",\n    num_threads=1,\n)\nresult = t.blocked_autorange(min_run_time=1.0)\nprint(result)  # median, IQR, repeat count'} />
          </section>

          <section className="section" id="practice" aria-labelledby="practice-title">
            <div className="section-number">04 / APPLICATION</div>
            <div className="section-title-row"><div><h2 id="practice-title">End-to-end review recipe</h2><p>Produce the same chain of evidence for every optimization. Leave a decision record, not a raw tool dump.</p></div></div>
            <div className="recipe">
              {[
                ["1", "BASELINE", "Accuracy + representative shape matrix + raw times"],
                ["2", "SYSTEMS", "Critical NVTX range, gaps, duplicates, expensive kernel"],
                ["3", "COMPUTE", "Single kernel, open hypothesis, selected section, root cause"],
                ["4", "CHANGE", "One idea at a time; write the expected metric in advance"],
                ["5", "REMEASURE", "Same benchmark protocol + correctness gate"],
                ["6", "RAPORLA", "Median speedup, propagation, shapes, media, profiler evidence"],
              ].map(([n, title, copy]) => <div key={n}><b>{n}</b><span>{title}</span><p>{copy}</p></div>)}
            </div>

            <div className="command-center">
              <div className="command-tabs">
                {(["systems", "compute", "pytorch"] as const).map(key => <button key={key} className={commandTab === key ? "active" : ""} onClick={() => setCommandTab(key)}>{key === "systems" ? "NSYS" : key === "compute" ? "NCU" : "PYTORCH"}</button>)}
              </div>
              <div className="command-body">
                <div><span className="mini-label">COMMAND MAP</span><h3>{commandTab === "systems" ? "Find critical path" : commandTab === "compute" ? "Explain the hot kernel" : "Measure the claim"}</h3></div>
                <pre>{commandTab === "systems" ? `# short and named capture\nnsys profile --trace=cuda,nvtx -o run ./app\n\n# kernel + API abstracts\nnsys stats --report cuda_gpu_sum --report cuda_api_sum run.nsys-rep` : commandTab === "compute" ? `# see available sets first\nncu --list-sets\n\n# narrow collection\nncu --set basic -k regex:".*kernel.*" -c 3 -o kernel ./app` : `# warmup and accelerator sync built in\nTimer(stmt="kernel(x)", globals=globals()) \\\n  .blocked_autorange(min_run_time=1.0)`}</pre>
              </div>
            </div>

            <div className="quiz-card">
              <div className="quiz-head"><div><span className="mini-label">TEST YOURSELF</span><h3>Profiling reasoning</h3></div><div className="score">{quizScore}<span>/ {quiz.length}</span></div></div>
              {quiz.map((item, qi) => (
                <div className="question" key={item.q}>
                  <p><b>0{qi + 1}</b>{item.q}</p>
                  <div>{item.options.map((option, oi) => <button key={option} onClick={() => setAnswers(a => a.map((x, i) => i === qi ? oi : x))} className={answers[qi] === oi ? (oi === item.answer ? "correct" : "wrong") : ""}>{option}</button>)}</div>
                  {answers[qi] >= 0 && <small className={answers[qi] === item.answer ? "ok" : "no"}>{answers[qi] === item.answer ? "TRUE -" : "Think again —"}{item.why}</small>}
                </div>
              ))}
            </div>
          </section>

          <section className="source-section" aria-labelledby="sources-title">
            <span className="mini-label">RESOURCES / CURRENT DOCUMENTATION</span>
            <h2 id="sources-title">Go deeper</h2>
            <div>
              <a href="https://docs.nvidia.com/nsight-systems/UserGuide/index.html" target="_blank" rel="noreferrer"><b>01</b><span>Nsight Systems User Guide<small>Capture, trace and CLI</small></span><i>↗</i></a>
              <a href="https://docs.nvidia.com/nsight-systems/AnalysisGuide/index.html" target="_blank" rel="noreferrer"><b>02</b><span>Systems Analysis Guide<small>Reports and statistics</small></span><i>↗</i></a>
              <a href="https://docs.nvidia.com/nsight-compute/ProfilingGuide/index.html" target="_blank" rel="noreferrer"><b>03</b><span>Nsight Compute Profiling Guide<small>Replay, overhead, roofline</small></span><i>↗</i></a>
              <a href="https://docs.pytorch.org/docs/stable/benchmark_utils.html" target="_blank" rel="noreferrer"><b>04</b><span>PyTorch Benchmark Utilities<small>Timer and blocked_autorange</small></span><i>↗</i></a>
            </div>
          </section>
        </div>
      </div>

      <footer><div className="brand"><span className="brand-mark">K</span><span>KERNEL / LAB</span></div><p>Measure. Explain. Prove.</p><a href="#top">RETURN TO TOP ↑</a></footer>
    </main>
  );
}
