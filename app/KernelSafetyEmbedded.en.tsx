"use client";
/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- Labelled overflow regions must remain keyboard-scrollable. */

import { useMemo, useState } from "react";

type Tool = "memcheck" | "racecheck" | "initcheck" | "synccheck";
type CorrectnessArchitecture = "ada" | "hopper" | "blackwell";

export const CORRECTNESS_ACCEPTANCE_CLASSES = [
  { id: "deterministic", label: "Deterministic", detail: "Repeated runs must match the reference within the same bounded error budget." },
  { id: "nondeterministic", label: "Nondeterministic", detail: "Accept a bounded result distribution across seeds and repeated schedules, not one lucky run." },
  { id: "mutation-alias", label: "Mutation / alias", detail: "Assert which inputs may mutate, which outputs alias storage, and which sentinels remain unchanged." },
] as const;

export function getCorrectnessArchitectureSupport(architecture: CorrectnessArchitecture) {
  return { tmemGuardrails: architecture === "blackwell", reason: architecture === "blackwell" ? null : "Tensor Memory guardrails require the Blackwell · SM100-family path." };
}

export function buildSanitizerCommand(tool: Tool, lineInfo: boolean, exitCode: boolean) {
  return ["compute-sanitizer", "--tool", tool, lineInfo ? "--show-backtrace yes" : null, exitCode ? "--error-exitcode 99" : null, "./build/kernel_tests"].filter(Boolean).join(" ");
}

const toolData: Record<Tool, { eyebrow: string; title: string; catches: string; misses: string; command: string; report: string[] }> = {
  memcheck: {
    eyebrow: "01 · RUN THIS FIRST",
    title: "memcheck",
    catches: "Out-of-bounds and unaligned accesses to global/local/shared memory; CUDA API errors and leaks.",
    misses: "Ordering problems between threads or numerically incorrect results that still access valid memory.",
    command: "compute-sanitizer --tool memcheck ./build/vector_add",
    report: [
      "Invalid __global__ write of size 4 bytes",
      "at vector_add.cu:12 in vector_add(float*, ...)",
      "by thread (31,0,0) in block (4,0,0)",
      "Address 0x... is 4 bytes after a block of size 512",
    ],
  },
  racecheck: {
    eyebrow: "02 data race",
    title: "racecheck",
    catches: "RAW, WAR and WAW hazards on shared memory; some asynchronous copy usage errors.",
    misses: "Global memory out-of-bounds access. Therefore, memcheck is run first.",
    command: "compute-sanitizer --tool racecheck ./build/reduce",
    report: [
      "Race reported between Write access at reduce.cu:18",
      "and Read access at reduce.cu:21",
      "Current Value: 0x40000000, Incoming Value: 0x40400000",
      "Hazard: RAW block (0,0,0)",
    ],
  },
  initcheck: {
    eyebrow: "03 initial state",
    title: "initcheck",
    catches: "Device global memory read without writing or copying; optionally shared memory.",
    misses: "Out-of-bounds accesses and synchronization violations. Run memcheck first.",
    command: "compute-sanitizer --tool initcheck ./build/stencil",
    report: [
      "Uninitialized __global__ memory read of size 4 bytes",
      "at stencil.cu:27 in update(float const*, float*)",
      "by thread (7,0,0) in block (2,0,0)",
      "Address 0x... is inside a 4096 byte allocation",
    ],
  },
  synccheck: {
    eyebrow: "04 barrier discipline",
    title: "synccheck",
    catches: "Invalid uses of __syncthreads(), __syncwarp() and the corresponding Cooperative Groups primitive.",
    misses: "Wrong algorithm or floating point tolerance problem. Accuracy tests find these.",
    command: "compute-sanitizer --tool synccheck ./build/scan",
    report: [
      "Barrier error detected. Divergent thread(s) in block",
      "at scan.cu:34 in block_scan(float*)",
      "by thread (17,0,0) in block (0,0,0)",
      "Barrier: __syncthreads() reached conditionally",
    ],
  },
};

const questions = [
  { q: "An FP32 parallel reduction differs from the CPU reference by 2e-6. What should you do first?", a: ["Require bit-for-bit equality", "Define an error budget with rtol/atol", "Run memcheck and accept the result if it passes"], correct: 1 },
  { q: "Which tool directly catches out-of-bounds global memory writes?", a: ["racecheck", "synccheck", "memcheck"], correct: 2 },
  { q: "Kernel is only correct for N=1024. What is the most likely testing vulnerability?", a: ["Shape and boundary matrix", "lower rtol", "Longer benchmark"], correct: 0 },
  { q: "Which order is appropriate in case of conditional __syncthreads()?", a: ["synccheck → profiler", "benchmark → initcheck", "racecheck → bit by bit comparison"], correct: 0 },
];

const scenarios = [
  { name: "FP32 reduction", expected: 12.5, actual: 12.500012, atol: 1e-5, rtol: 1e-5 },
  { name: "wrong index", expected: 4, actual: 4.25, atol: 1e-5, rtol: 1e-5 },
  { name: "close to zero", expected: 0.000001, actual: 0.000002, atol: 0.000002, rtol: 0 },
];

export default function KernelSafetyEmbedded() {
  const [tool, setTool] = useState<Tool>("memcheck");
  const [scenario, setScenario] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  const [lineInfo, setLineInfo] = useState(true);
  const [exitCode, setExitCode] = useState(true);
  const [copied, setCopied] = useState(false);
  const [acceptanceClass, setAcceptanceClass] = useState<(typeof CORRECTNESS_ACCEPTANCE_CLASSES)[number]["id"]>("deterministic");
  const [architecture, setArchitecture] = useState<CorrectnessArchitecture>("ada");
  const [tmemSelected, setTmemSelected] = useState(false);

  const s = scenarios[scenario];
  const absoluteError = Math.abs(s.actual - s.expected);
  const threshold = s.atol + s.rtol * Math.abs(s.expected);
  const passes = absoluteError <= threshold;
  const score = useMemo(() => questions.reduce((sum, q, i) => sum + (answers[i] === q.correct ? 1 : 0), 0), [answers]);
  const command = buildSanitizerCommand(tool, lineInfo, exitCode);
  const selectedAcceptance = CORRECTNESS_ACCEPTANCE_CLASSES.find((item) => item.id === acceptanceClass) ?? CORRECTNESS_ACCEPTANCE_CLASSES[0];
  const architectureSupport = getCorrectnessArchitectureSupport(architecture);

  const copyCommand = async () => {
    try { await navigator.clipboard.writeText(command); } catch { /* clipboard may be unavailable in preview */ }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <section className="kernel-safety-surface" id="top" aria-labelledby="kernel-safety-title">
      <section className="hero">
        <div className="hero-copy">
          <div className="kicker"><span>GPU KERNEL ENGINEERING</span><i /> MODULE 03</div>
          <h2 id="kernel-safety-title">Being fast isn't enough.<br />Prove that it is <em>correct.</em></h2>
          <p>Learn how to test GPU kernels systematically with a reference implementation, tolerance matrix, edge cases, and NVIDIA Compute Sanitizer.</p>
          <div className="hero-actions">
            <a className="primary" href="#correctness">Start lab <span>↓</span></a>
            <a className="text-link" href="#workflow">7-step checklist →</a>
          </div>
        </div>
        <div className="hero-terminal" aria-label="Example successful test output">
          <div className="terminal-head"><span><i /><i /><i /></span><code>kernel_tests — zsh</code><b>PASS</b></div>
          <pre tabIndex={0} aria-label="Test terminal"><span className="muted">$</span> pytest tests/test_rmsnorm.py -q{`\n`}
<span className="cyan">test_forward_fp32</span>      <span className="green">PASSED</span>{`\n`}
<span className="cyan">test_odd_shapes</span>         <span className="green">PASSED</span>{`\n`}
<span className="cyan">test_noncontiguous</span>      <span className="green">PASSED</span>{`\n`}
<span className="cyan">test_extreme_values</span>     <span className="green">PASSED</span>{`\n\n`}
<span className="muted">$</span> compute-sanitizer --tool memcheck ...{`\n`}
========= <span className="green">ERROR SUMMARY: 0 errors</span></pre>
          <div className="terminal-foot"><span>14 tests</span><span>0 errors</span><span>2.81s</span></div>
        </div>
      </section>

      <section className="concept-strip" aria-label="Three layers of accuracy">
        <article><span>01</span><div><b>NUMERICAL</b><p>Is it close enough to the reference?</p></div></article>
        <article><span>02</span><div><b>MEMORY</b><p>Is every access valid and initialized?</p></div></article>
        <article><span>03</span><div><b>CONCURRENCY</b><p>Can thread order change the result?</p></div></article>
      </section>

      <section className="section task3-correctness" aria-labelledby="acceptance-classes-heading">
        <div className="section-title"><div><span className="chapter">ACCEPTANCE MODEL</span><h2 id="acceptance-classes-heading">Classify the contract before reading <em>one result</em></h2></div><p>Numerical comparison, repeatability, and storage semantics are separate evidence. Native Python host backtrace support helps connect a device report to its Python call stack.</p></div>
        <div className="correctness-acceptance-lab">
          <div className="acceptance-class-options" role="group" aria-label="Correctness acceptance classes">{CORRECTNESS_ACCEPTANCE_CLASSES.map((item) => <button key={item.id} aria-pressed={acceptanceClass === item.id} onClick={() => setAcceptanceClass(item.id)}>{item.label}</button>)}</div>
          <p className="acceptance-class-detail" aria-live="polite"><strong>{selectedAcceptance.label}</strong>{selectedAcceptance.detail}</p>
        </div>
        <div className="correctness-architecture-gate">
          <div className="architecture-selector" role="group" aria-label="Correctness architecture">{([['ada','Ada · SM89'],['hopper','Hopper · SM90'],['blackwell','Blackwell · SM100 family']] as const).map(([id,label]) => <button key={id} aria-pressed={architecture === id} onClick={() => { setArchitecture(id); setTmemSelected(false); }}>{label}</button>)}</div>
          <div className="tmem-gate"><button disabled={!architectureSupport.tmemGuardrails} aria-disabled={!architectureSupport.tmemGuardrails} aria-pressed={tmemSelected} aria-describedby={!architectureSupport.tmemGuardrails ? "tmem-disabled-reason" : undefined} onClick={() => setTmemSelected(true)}>Tensor Memory guardrails</button></div>
          {!architectureSupport.tmemGuardrails && <p id="tmem-disabled-reason" className="gate-reason">{architectureSupport.reason}</p>}
          <p className="tmem-detail" aria-live="polite">{tmemSelected ? "Compile PTXAS with -g-tmem-access-check, then use memcheck for out-of-bounds, misaligned, unallocated, or relinquished Tensor Memory access." : "Select the Blackwell path to inspect -g-tmem-access-check; this hardware-specific gate does not create a simulated result."}</p>
        </div>
      </section>

      <section className="section" id="correctness">
        <div className="section-title">
          <div><span className="chapter">CHAPTER 01</span><h2>A correctness test <em>is a comparison contract</em></h2></div>
          <p>“It worked” just says it didn't crash. To say "correct", you first define the expected behavior and the acceptance limit.</p>
        </div>

        <div className="contract-grid">
          <article className="lesson-card"><span className="card-no">A.</span><h3>Reference</h3><p>A simple, readable and CPU/PyTorch independent implementation. It is written for reliability, not performance.</p><code>expected = torch_rmsnorm(x, w)</code></article>
          <article className="lesson-card"><span className="card-no">B.</span><h3>Observed</h3><p>CUDA/Triton kernel output using the same input, dtype, and semantics.</p><code>actual = custom_kernel(x, w)</code></article>
          <article className="lesson-card accent"><span className="card-no">C.</span><h3>Decision rule</h3><p>Use absolute and relative tolerance together. The same contract covers large and near-zero values.</p><code>|a-b| ≤ atol + rtol × |b|</code></article>
        </div>

        <div className="lab-grid">
          <article className="tolerance-lab">
            <div className="lab-head"><div><span>INTERACTIVE LAB</span><h3>See tolerance decision</h3></div><b className={passes ? "pass-badge" : "fail-badge"}>{passes ? "PASS" : "FAIL"}</b></div>
            <div className="scenario-tabs" role="group" aria-label="Test scenarios">
              {scenarios.map((item, i) => <button aria-pressed={scenario === i} className={scenario === i ? "active" : ""} key={item.name} onClick={() => setScenario(i)}>{item.name}</button>)}
            </div>
            <div className="number-pair">
              <label>REFERENCE <output>{s.expected}</output></label>
              <label>KERNEL <output>{s.actual}</output></label>
            </div>
            <div className="error-track"><span style={{ width: `${Math.min(100, (absoluteError / Math.max(threshold, 1e-12)) * 50)}%` }} /></div>
            <div className="formula-row">
              <div><small>OBSERVED ERROR</small><b>{absoluteError.toExponential(2)}</b></div>
              <span>{passes ? "≤" : ">"}</span>
              <div><small>ALLOWED</small><b>{threshold.toExponential(2)}</b></div>
            </div>
            <p className="lab-note">{passes ? "The difference is within the defined error budget. This test passes; Sanitizer checks are still required." : "The difference is too large to be explained by tolerance. Examine indexing, reduction order, or dtype conversion."}</p>
          </article>

          <aside className="matrix-card">
            <span className="mini-label">MINIMUM TEST MATRIX</span>
            <h3>One happy path is not enough</h3>
            <ul>
              <li><b>Shape:</b> 0/1, prime size, warp limit −1/+1</li>
              <li><b>Layout:</b> contiguous, transposed, sliced</li>
              <li><b>Value:</b> zero, negative, very small/large, NaN/Inf policy</li>
              <li><b>Dtype:</b> FP32, FP16/BF16, and accumulation dtype</li>
              <li><b>Initialization:</b> different seeds and reruns</li>
              <li><b>Guardrails:</b> output sentinels, input immutability</li>
            </ul>
            <div className="warning"><b>!</b><p><strong>Important distinction</strong>The allclose result measures semantic correctness; it does not prove memory safety.</p></div>
          </aside>
        </div>
      </section>

      <section className="sanitizer-section" id="sanitizer">
        <div className="section-title light">
          <div><span className="chapter">CHAPTER 02</span><h2>Compute Sanitizer: <em>four separate detectors</em></h2></div>
          <p>Each tool targets a different error class. Run memcheck before the other tools, and remember that clean sanitizer results do not guarantee mathematical correctness.</p>
        </div>
        <div className="tool-shell">
          <div className="tool-tabs" role="group" aria-label="Compute Sanitizer tools">
            {(Object.keys(toolData) as Tool[]).map((key) => <button key={key} aria-pressed={tool === key} className={tool === key ? "active" : ""} onClick={() => setTool(key)}><span>{toolData[key].eyebrow}</span>{key}</button>)}
          </div>
          <div className="tool-body">
            <div className="tool-explain">
              <span className="mini-label">{toolData[tool].eyebrow}</span>
              <h3>{toolData[tool].title}</h3>
              <div className="explain-row"><b className="good">CAPTURES</b><p>{toolData[tool].catches}</p></div>
              <div className="explain-row"><b className="bad">CAN'T CATCH</b><p>{toolData[tool].misses}</p></div>
              <div className="code-line" tabIndex={0} aria-label="Sanitizer command"><code>{toolData[tool].command}</code></div>
            </div>
            <div className="report-window">
              <div className="report-head"><span>compute-sanitizer report</span><b>sample output</b></div>
              <pre tabIndex={0} aria-label="Sanitizer report">{toolData[tool].report.map((line, i) => <span key={line} className={i === 0 ? "report-error" : ""}>========= {line}{`\n`}</span>)}</pre>
              <div className="report-summary">========= ERROR SUMMARY: <b>1 error</b></div>
            </div>
          </div>
        </div>

        <article className="command-builder">
          <div><span className="mini-label">COMMAND GENERATOR</span><h3>Produce a repeatable run for CI</h3></div>
          <div className="toggles">
            <label><input type="checkbox" checked={lineInfo} onChange={(e) => setLineInfo(e.target.checked)} /><span /> Show backtrace</label>
            <label><input type="checkbox" checked={exitCode} onChange={(e) => setExitCode(e.target.checked)} /><span /> Exit 99 on error</label>
          </div>
          <div className="generated-command"><code tabIndex={0} aria-label="Generated command">{command}</code><button onClick={copyCommand}>{copied ? "Copied ✓" : "Copy"}</button></div>
          <p><b>Compilation note:</b> Add <code>-lineinfo</code> for source-line mapping instead of switching to a fully unoptimized debug build. It keeps reports readable while preserving optimized behavior.</p>
        </article>
      </section>

      <section className="workflow section" id="workflow">
        <div className="section-title">
          <div><span className="chapter">CHAPTER 03</span><h2>Build a <em>chain of evidence</em> before accepting a kernel</h2></div>
          <p>This order narrows down the debugging space: semantic contract first, memory and concurrency next, performance last.</p>
        </div>
        <ol className="steps">
          {[
            ["Write the contract", "Define shape, dtype, broadcasting, NaN/Inf, and aliasing behavior explicitly."],
            ["Establish an independent reference", "Use a slow but straightforward CPU/PyTorch implementation instead of copying the kernel logic."],
            ["Scan test matrix", "Bounds, prime sizes, different strides, outliers and seeds."],
            ["Clean up with memcheck", "Remove out-of-bounds or unaligned accesses and CUDA API errors first."],
            ["Scan race + init + sync", "Distinguish shared-memory hazards, uninitialized reads, and barrier violations."],
            ["Force repeatability", "Run the same entry multiple times; Make nondeterministic bias visible."],
            ["Then benchmark", "Measure performance with warm-up, synchronization, distribution and different shapes."],
          ].map((step, i) => <li key={step[0]}><span>{String(i + 1).padStart(2, "0")}</span><div><b>{step[0]}</b><p>{step[1]}</p></div>{i < 6 && <i>↓</i>}</li>)}
        </ol>
        <div className="acceptance">
          <div><span>MERGE GATE</span><h3>“Accelerated” alone is not an acceptance criterion.</h3></div>
          <div className="gate-list"><span>✓ reference comparison</span><span>✓ edge case matrix</span><span>✓ 0 sanitizer errors</span><span>✓ performance distribution</span></div>
        </div>
      </section>

      <section className="quiz-section" id="quiz">
        <div className="quiz-intro"><span className="chapter">CHAPTER 04</span><h2>Are you ready?<br /><em>Decide.</em></h2><p>Four short scenarios. The goal is not to memorize commands, but to choose the right evidence tool.</p><div className="score" aria-live="polite" hidden={!checked}>{checked ? <><b>{score}/4</b><span>{score === 4 ? "Kernel reviewer mode is enabled." : "Review the answers, then try again."}</span></> : null}</div></div>
        <div className="questions">
          {questions.map((q, qi) => <fieldset key={q.q}><legend><span>{qi + 1}</span>{q.q}</legend>{q.a.map((answer, ai) => <label key={answer} className={checked ? (ai === q.correct ? "correct" : answers[qi] === ai ? "wrong" : "") : ""}><input type="radio" name={`q-${qi}`} checked={answers[qi] === ai} onChange={() => { setAnswers({ ...answers, [qi]: ai }); setChecked(false); }} /><i />{answer}</label>)}</fieldset>)}
          <button className="quiz-button" disabled={Object.keys(answers).length !== questions.length} onClick={() => setChecked(true)}>Check answers <span>→</span></button>
        </div>
      </section>

      <aside className="resources" aria-label="Resources">
        <p>Source: <a href="https://docs.nvidia.com/compute-sanitizer/ComputeSanitizer/index.html" target="_blank" rel="noreferrer">NVIDIA Compute Sanitizer</a> · <a href="https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/" target="_blank" rel="noreferrer">CUDA Best Practices</a></p>
      </aside>
    </section>
  );
}
