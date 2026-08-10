"use client";

import { useEffect, useMemo, useState } from "react";

const weeks = [
  { id: 1, title: "Tensor anatomy", eyebrow: "Foundations", desc: "Inspect strides, layouts, and eager execution directly.", status: "done", minutes: 90, skills: ["stride", "broadcast", "profiling"] },
  { id: 2, title: "Custom operator", eyebrow: "PyTorch", desc: "Define the schema, CPU reference, and fake kernel with torch.library.", status: "active", minutes: 120, skills: ["torch.library", "FakeTensor", "opcheck"] },
  { id: 3, title: "First Triton kernel", eyebrow: "Triton", desc: "Program ID, blocks, mask and coalesced access.", status: "next", minutes: 150, skills: ["tl.program_id", "mask", "BLOCK_SIZE"] },
  { id: 4, title: "Autograd + compile", eyebrow: "Integration", desc: "Preserve the backward pass and diagnose graph breaks with torch.compile.", status: "locked", minutes: 150, skills: ["register_autograd", "torch.compile", "AOT"] },
  { id: 5, title: "RMSNorm", eyebrow: "Operator 01", desc: "Move from a reference implementation to a fused Triton kernel and measure three shapes.", status: "locked", minutes: 180, skills: ["reduction", "numerics", "fusion"] },
  { id: 6, title: "RoPE", eyebrow: "Operator 02", desc: "Half-split rotary embedding and stride-aware indexing.", status: "locked", minutes: 180, skills: ["indexing", "vectorization", "backward"] },
  { id: 7, title: "SwiGLU", eyebrow: "Operator 03", desc: "Combine activation and multiplication into a single kernel.", status: "locked", minutes: 180, skills: ["fusion", "occupancy", "precision"] },
  { id: 8, title: "Masked softmax", eyebrow: "Operator 04", desc: "Stable reduction, masking, and boundary cases.", status: "locked", minutes: 210, skills: ["online softmax", "masking", "NaN"] },
  { id: 9, title: "KV-cache update", eyebrow: "Operator 05", desc: "Write safely and efficiently into a paged-memory layout.", status: "locked", minutes: 210, skills: ["scatter", "cache", "race"] },
  { id: 10, title: "Benchmark science", eyebrow: "Performance", desc: "Run an honest comparison with warm-up, quantiles, and roofline analysis.", status: "locked", minutes: 150, skills: ["triton.testing", "roofline", "Nsight"] },
  { id: 11, title: "Fusion studio", eyebrow: "Optimization", desc: "Target at least a 15% median improvement across two fused kernels.", status: "locked", minutes: 240, skills: ["fusion", "register pressure", "autotune"] },
  { id: 12, title: "Inference capstone", eyebrow: "Graduation", desc: "Produce a TTFT, ITL, and throughput report for a vLLM workload.", status: "locked", minutes: 300, skills: ["vLLM", "TTFT", "portfolio"] },
];

const customOpCode = `import torch
from torch.library import custom_op

@custom_op("kernellab::add", mutates_args=())
def vector_add(x: torch.Tensor, y: torch.Tensor) -> torch.Tensor:
    """CPU/CUDA reference: correctness first."""
    return x + y

@vector_add.register_fake
def _(x, y):
    torch._check(x.shape == y.shape)
    return torch.empty_like(x)

# Compiler and subsystem checks
torch.library.opcheck(
    vector_add,
    (torch.randn(128), torch.randn(128)),
)`;

const tritonCode = `import torch
import triton
import triton.language as tl

@triton.jit
def add_kernel(x_ptr, y_ptr, out_ptr, n: tl.constexpr,
               BLOCK_SIZE: tl.constexpr):
    pid = tl.program_id(axis=0)
    offsets = pid * BLOCK_SIZE + tl.arange(0, BLOCK_SIZE)
    mask = offsets < n

    x = tl.load(x_ptr + offsets, mask=mask)
    y = tl.load(y_ptr + offsets, mask=mask)
    tl.store(out_ptr + offsets, x + y, mask=mask)

def triton_add(x, y):
    out = torch.empty_like(x)
    grid = (triton.cdiv(x.numel(), 256),)
    add_kernel[grid](x, y, out, x.numel(), BLOCK_SIZE=256)
    return out`;

const quizOptions = [
  "Each program processes the entire tensor; the mask only improves speed.",
  "Programs process fixed-size blocks; if the last block extends past the tensor, the mask protects invalid addresses.",
  "The mask is only required in the backward kernel.",
];

function formatTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m ? `${m}m` : ""}` : `${m}m`;
}

export default function PyTorchTritonEmbedded() {
  const [selectedWeek, setSelectedWeek] = useState(2);
  const [codeTab, setCodeTab] = useState<"pytorch" | "triton">("triton");
  const [runState, setRunState] = useState<"idle" | "running" | "passed">("idle");
  const [blockSize, setBlockSize] = useState(256);
  const [quiz, setQuiz] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [completedLabs, setCompletedLabs] = useState(1);

  useEffect(() => {
    const stored = window.localStorage.getItem("kernel-lab-note");
    const storedLabs = window.localStorage.getItem("kernel-lab-completed");
    window.queueMicrotask(() => {
      if (stored) setNote(stored);
      if (storedLabs) setCompletedLabs(Number(storedLabs));
    });
  }, []);

  const activeWeek = weeks.find((week) => week.id === selectedWeek) ?? weeks[1];
  const totalMinutes = useMemo(() => weeks.reduce((sum, week) => sum + week.minutes, 0), []);
  const progress = Math.round((completedLabs / 18) * 100);

  function runTests() {
    setRunState("running");
    window.setTimeout(() => {
      setRunState("passed");
      const next = Math.max(completedLabs, 2);
      setCompletedLabs(next);
      window.localStorage.setItem("kernel-lab-completed", String(next));
    }, 900);
  }

  function saveNote() {
    window.localStorage.setItem("kernel-lab-note", note);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }

  return (
    <main className="pytorch-triton-embed">
      <nav className="topbar" aria-label="Main navigation">
        <a className="brand" href="#top" aria-label="Kernel Lab home page">
          <span className="brand-mark">K//</span>
          <span>KERNEL LAB</span>
        </a>
        <div className="nav-links">
          <a href="#path">Roadmap</a>
          <a href="#lab">Code lab</a>
          <a href="#model">Mental model</a>
        </div>
        <div className="nav-status" aria-label="Learning series">
          <span className="pulse-dot" /> 3-day series
        </div>
      </nav>

      <section className="hero" id="top">
        <div className="hero-grid" />
        <div className="hero-copy">
          <div className="kicker"><span>INTENSIVE PROGRAM</span><span>12 WEEKS</span><span>14–16 HR / WEEK</span></div>
          <h1>From PyTorch<br /><em>to bare metal.</em></h1>
          <p className="hero-lede">Learn by taking an operator from a correct Python reference to a compilable PyTorch custom op and a measured Triton kernel.</p>
          <div className="hero-actions">
            <a className="primary-button" href="#lab">Enter active lab <span>↗</span></a>
            <a className="text-link" href="#path">View the program <span>↓</span></a>
          </div>
        </div>
        <aside className="current-mission" aria-label="Next task">
          <div className="mission-topline"><span>CURRENT TASK</span><span>02 / 18</span></div>
          <div className="mission-glyph" aria-hidden="true"><span>π</span><i /></div>
          <p className="mission-label">MODULE 02 · CUSTOM OP</p>
          <h2>Vector addition:<br />from schema to kernel</h2>
          <div className="mission-meta"><span>◷ 35 min</span><span>◆ Medium</span><span>⌁ GPU</span></div>
          <div className="progress-track"><i style={{ width: `${progress}%` }} /></div>
          <div className="progress-label"><span>Total progress</span><strong>{progress}%</strong></div>
        </aside>
        <div className="hero-index" aria-hidden="true">01</div>
      </section>

      <section className="ticker" aria-label="Program achievements">
        <div>ACCURACY MATRIX <span>×</span> TORCH.COMPILE <span>×</span> TRITON KERNEL <span>×</span> AUTOGRAD <span>×</span> NSIGHT <span>×</span> VLLM CAPSTONE <span>×</span></div>
      </section>

      <section className="section roadmap" id="path">
        <div className="section-heading">
          <div><span className="section-number">01</span><p className="eyebrow">LEARNING SYSTEM</p><h2>Don't memorize the map.<br /><em>Build the kernel.</em></h2></div>
          <p>Each week builds one mental model and turns working code into test evidence and a performance report.</p>
        </div>

        <div className="week-rail" role="tablist" aria-label="12 week program">
          {weeks.map((week) => (
            <button key={week.id} role="tab" aria-selected={selectedWeek === week.id} className={`week-node ${week.status} ${selectedWeek === week.id ? "selected" : ""}`} onClick={() => setSelectedWeek(week.id)}>
              <span>{String(week.id).padStart(2, "0")}</span>
              <i />
            </button>
          ))}
        </div>

        <article className="week-detail">
          <div className="week-title-block">
            <p>{activeWeek.eyebrow} · WEEK {String(activeWeek.id).padStart(2, "0")}</p>
            <h3>{activeWeek.title}</h3>
            <span>{formatTime(activeWeek.minutes)} focused work</span>
          </div>
          <div className="week-description">
            <p>{activeWeek.desc}</p>
            <div className="skill-list">{activeWeek.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
          </div>
          <div className="week-gate">
            <p>WEEK EXIT GATE</p>
            <strong>{activeWeek.id < 4 ? "Code + test + explanation in your own words" : "Correctness matrix + benchmark report"}</strong>
            <button onClick={() => document.querySelector("#lab")?.scrollIntoView({ behavior: "smooth" })}>Open content <span>→</span></button>
          </div>
        </article>
        <p className="roadmap-total"><strong>{formatTime(totalMinutes)}</strong> core lab work · 5 mandatory LLM operators · 1 capstone</p>
      </section>

      <section className="section lab-section" id="lab">
        <div className="section-heading light">
          <div><span className="section-number">02</span><p className="eyebrow">LIVE LABORATORY</p><h2>Read. Change it.<br /><em>Prove.</em></h2></div>
          <p>Stay in a single working loop with code split screen, testing console, and truth matrix.</p>
        </div>

        <div className="lab-shell">
          <div className="lab-toolbar">
            <div className="window-dots" aria-hidden="true"><i /><i /><i /></div>
            <div className="file-tabs" role="tablist">
              <button className={codeTab === "pytorch" ? "active" : ""} onClick={() => setCodeTab("pytorch")}>operator.py</button>
              <button className={codeTab === "triton" ? "active" : ""} onClick={() => setCodeTab("triton")}>kernel.py <span>●</span></button>
            </div>
            <span className="runtime">CUDA · FP32 · n=65,537</span>
          </div>

          <div className="lab-main">
            <div className="editor-pane">
              <div className="editor-heading"><span>{codeTab === "triton" ? "TRITON IMPLEMENTATION" : "PYTORCH CUSTOM OP"}</span><span>Python</span></div>
              <pre aria-label={`${codeTab} sample code`}><code>{(codeTab === "triton" ? tritonCode : customOpCode).split("\n").map((line, index) => <span className="code-line" key={index}><i>{index + 1}</i>{line || " "}</span>)}</code></pre>
            </div>
            <aside className="task-pane">
              <p className="task-kicker">TASK 02.3</p>
              <h3>Load within bounds</h3>
              <p>When <code>n</code> is not a multiple of the block size, the final program extends past the tensor boundary. Protect both loads and stores with the same mask.</p>
              <div className="checks">
                <label><input type="checkbox" defaultChecked /><span>Get program ID</span></label>
                <label><input type="checkbox" defaultChecked /><span>Generate offset vector</span></label>
                <label><input type="checkbox" /><span>Apply the bounds mask</span></label>
              </div>
              <div className="hint"><span>CLUE</span><p>Each program processes one block. Use <code>offsets &lt; n</code> to identify valid elements.</p></div>
              <button className={`run-button ${runState}`} onClick={runTests} disabled={runState === "running"}>
                <span>{runState === "running" ? "RUNNING TESTS" : runState === "passed" ? "RUN AGAIN" : "RUN TESTS"}</span><b>{runState === "running" ? "···" : "▶"}</b>
              </button>
            </aside>
          </div>

          <div className={`console ${runState}`} aria-live="polite">
            <div className="console-title"><span>TEST CONSOLE</span><span>{runState === "passed" ? "4/4 PASSED" : runState === "running" ? "RUNNING" : "READY"}</span></div>
            {runState === "idle" && <p><span className="prompt">$</span> Ready to initialize opcheck and correctness matrix.</p>}
            {runState === "running" && <p><span className="prompt">›</span> n ∈ [1, 257, 65_537] · Comparing fp32/fp16…</p>}
            {runState === "passed" && <div className="test-results"><p><b>✓</b> opcheck: schema + fake tensor</p><p><b>✓</b> n=1 / limit</p><p><b>✓</b> n=257 / mask</p><p><b>✓</b> max |Δ| = 0.00e+00</p></div>}
          </div>
        </div>

        <div className="evidence-strip">
          <div><span>TRUTH</span><strong>{runState === "passed" ? "4 / 4" : "—/4"}</strong><small>shape × dtype</small></div>
          <div><span>MEDIAN</span><strong>{runState === "passed" ? "18.7 µs" : "— µs"}</strong><small>100 reps</small></div>
          <div><span>BANDWIDTH</span><strong>{runState === "passed" ? "612GB/s" : "— GB/s"}</strong><small>representative result</small></div>
          <div className="proof-note"><i>!</i><p>Performance numbers are for instructional purposes. It's not portfolio proof until you measure it on your own GPU.</p></div>
        </div>
      </section>

      <section className="section model-section" id="model">
        <div className="section-heading">
          <div><span className="section-number">03</span><p className="eyebrow">MENTAL MODEL</p><h2>How does a kernel<br /><em>think?</em></h2></div>
          <p>Change the parameter and observe the relationship between the grid, program, and memory access.</p>
        </div>

        <div className="model-grid">
          <div className="simulator">
            <div className="sim-toolbar">
              <label htmlFor="block-size">BLOCK_SIZE</label>
              <input id="block-size" type="range" min="64" max="512" step="64" value={blockSize} onChange={(event) => setBlockSize(Number(event.target.value))} />
              <output>{blockSize}</output>
            </div>
            <div className="memory-visual">
              <div className="memory-label"><span>GLOBAL MEMORY</span><span>n = 1,024 elements</span></div>
              <div className="memory-cells">
                {Array.from({ length: 32 }).map((_, index) => <i key={index} className={index < Math.min(32, blockSize / 16) ? "hot" : ""} style={{ animationDelay: `${index * 25}ms` }} />)}
              </div>
              <div className="flow-lines"><i /><i /><i /><i /></div>
              <div className="program-row">
                {Array.from({ length: Math.max(2, 1024 / blockSize) }).slice(0, 8).map((_, index) => <div key={index} className={index === 0 ? "active" : ""}><span>PID {index}</span><b>{index * blockSize}…{Math.min(1023, (index + 1) * blockSize - 1)}</b></div>)}
              </div>
            </div>
            <div className="sim-caption"><span>{1024 / blockSize} program</span><span>{blockSize / 32} warp/program</span><span>coalesced access</span></div>
          </div>

          <div className="explanation">
            <p className="eyebrow">IN YOUR OWN SENTENCES</p>
            <h3>program ≠ thread</h3>
            <p>In Triton, one program processes a block of data as vectors. <code>tl.arange</code> is not an individual thread ID; it produces the offset vector handled by that program.</p>
            <ol>
              <li><b>grid</b><span>How many program instances will run?</span></li>
              <li><b>Program ID</b><span>Which block does this example claim?</span></li>
              <li><b>offsets</b><span>Which elements within the block will be processed?</span></li>
              <li><b>mask</b><span>Which ones are actually valid?</span></li>
            </ol>
          </div>
        </div>
      </section>

      <section className="section checkpoint">
        <div className="checkpoint-copy">
          <span className="section-number">04</span>
          <p className="eyebrow">QUICK CHECK</p>
          <h2>Prove that you<br /><em>understand.</em></h2>
          <p>Answer without looking at your notes. A wrong answer is useful evidence for the next learning cycle.</p>
        </div>
        <div className="quiz-card">
          <div className="quiz-top"><span>QUESTION 1 / 3</span><span>ONE CHOICE</span></div>
          <h3>Why do we need a mask if the vector length is not a multiple of BLOCK_SIZE?</h3>
          <div className="quiz-options">
            {quizOptions.map((option, index) => (
              <button key={option} className={`${quiz === index ? "selected" : ""} ${quiz !== null && index === 1 ? "correct" : ""} ${quiz === index && index !== 1 ? "wrong" : ""}`} onClick={() => setQuiz(index)}>
                <span>{String.fromCharCode(65 + index)}</span><p>{option}</p><i>{quiz !== null && index === 1 ? "✓" : ""}</i>
              </button>
            ))}
          </div>
          {quiz !== null && <p className={`feedback ${quiz === 1 ? "success" : "retry"}`}>{quiz === 1 ? "CORRECT. The mask prevents the final program from accessing unallocated memory." : "Think again: the offsets of the final program may exceed the tensor limit."}</p>}
        </div>
      </section>

      <section className="section journal">
        <div>
          <p className="eyebrow">ENGINEER NOTEBOOK</p>
          <h2>What did you<br /><em>really learn today?</em></h2>
          <p>Write your own description first. A verified summary comes only after testing and review.</p>
        </div>
        <div className="note-area">
          <label htmlFor="learning-note">Explain the concept of “mask” in two sentences to someone who is hearing it for the first time.</label>
          <textarea id="learning-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="In your own words…" />
          <div><span>{note.length} characters · stored on this device</span><button onClick={saveNote}>{saved ? "SAVED ✓" : "SAVE NOTE"}</button></div>
        </div>
      </section>

      <footer>
        <div className="footer-brand"><span className="brand-mark">K//</span><h2>Speed you do not measure<br />is not evidence.</h2></div>
        <div className="footer-stats"><div><strong>12</strong><span>weeks</span></div><div><strong>18</strong><span>labs</span></div><div><strong>05</strong><span>LLM operators</span></div></div>
        <a href="#top">BACK TO TOP ↑</a>
      </footer>
    </main>
  );
}
