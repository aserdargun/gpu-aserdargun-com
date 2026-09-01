"use client";

/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- Labelled overflow regions remain keyboard-scrollable on narrow screens. */

import { useEffect, useMemo, useRef, useState } from "react";

type Section = "compare" | "anatomy" | "lifecycle" | "memory" | "pitfalls" | "quiz" | "map" | "recall" | "glossary" | "cheat" | "code" | "anim";
type AnatomyPart = "sm" | "l2" | "hbm" | "host";

const sections: Array<{ id: Section; number: string; short: string }> = [
  { id: "compare", number: "01", short: "CPU vs GPU" },
  { id: "anatomy", number: "02", short: "GPU Anatomy" },
  { id: "lifecycle", number: "03", short: "Kernel Life" },
  { id: "memory", number: "04", short: "Lasting Knowledge" },
  { id: "pitfalls", number: "05", short: "Pitfalls" },
  { id: "quiz", number: "06", short: "Self-Check" },
  { id: "map", number: "07", short: "Concept Map" },
  { id: "recall", number: "08", short: "Recall" },
  { id: "glossary", number: "09", short: "Glossary" },
  { id: "cheat", number: "10", short: "Cheat Sheet" },
  { id: "code", number: "11", short: "Code Patterns" },
  { id: "anim", number: "12", short: "Animation" },
];

const knowledgeCards: Array<{
  badge: string;
  type: "mnemonic" | "analogy" | "contrast";
  title: string;
  body: string;
  hook: string;
}> = [
  {
    badge: "MNEMONIC",
    type: "mnemonic",
    title: "Memory pyramid: RSL-D-H",
    body: "RSL-D-H",
    hook: "Register · Shared · L2 · DRAM · Host — go up for speed, down for size. Re-check this code every time you write a kernel.",
  },
  {
    badge: "ANALOGY",
    type: "analogy",
    title: "A warp is a 32-person classroom",
    body: "A warp is 32 students solving the same question in the same order. The teacher (issue unit) gives one instruction; all execute the same command at once. Someone going a different way = divergence.",
    hook: "Everyone on the same page is fastest; one going forward and one back slows the whole class.",
  },
  {
    badge: "ANALOGY",
    type: "analogy",
    title: "Coalescing = public transit",
    body: "32 threads take one bus instead of 32 separate taxis. They arrive in 4 sectors (32 B × 4) at once. Same road, 32 passengers.",
    hook: "Stride 1 = bus, stride 8 = 8 taxis. Same road, 8× the fuel.",
  },
  {
    badge: "CONTRAST",
    type: "contrast",
    title: "Throughput vs Latency",
    body: "CPU does a little work and finishes with low latency. GPU does a lot of work and hides latency (with many warps) to maximize throughput. The motto: 'don't wait, fill the pipeline'.",
    hook: "A waiter (CPU) serves one customer fast; a chef (GPU) cooks all orders at once.",
  },
  {
    badge: "CONTRAST",
    type: "contrast",
    title: "Coalesced ≠ Cached",
    body: "Coalesced: threads land in the same sector → fewer memory transactions. Cached: repeat accesses sit in L1/L2 → no DRAM trip. First is about address pattern, second about working set.",
    hook: "Coalescing needs the right addresses; cache hits need the right working set. Different doors.",
  },
  {
    badge: "MNEMONIC",
    type: "mnemonic",
    title: "Correctness triangle: R-T-S",
    body: "Reference · Tolerance · Sanitizer",
    hook: "A kernel is 'correct' only with a reference comparison + rtol/atol budget + clean sanitizer results. One missing → the claim is weak.",
  },
];

const pitfalls: Array<{ topic: string; title: string; wrong: string; right: string }> = [
  {
    topic: "Memory access",
    title: "'Strided access is fine'",
    wrong: "Stride 8 access uses only ~12.5% of each sector; you waste 8× the bandwidth.",
    right: "Before reading, ask: 'which sector do I land in?' Aim for stride 1, repack through shared memory if you must.",
  },
  {
    topic: "Kernel launch",
    title: "'More blocks = faster'",
    wrong: "Launching 1M blocks fills the SMs; the rest wait in the queue and add overhead.",
    right: "Divide work by SM count × occupancy target. 'Enough and efficient' beats 'as many as possible'.",
  },
  {
    topic: "Profiling",
    title: "'One run is enough'",
    wrong: "Mean time from one run measures GPU clock noise, not real speed.",
    right: "Warm-up + quantiles (p50/p95) + controlled baseline. 'No speed claim without Nsight evidence'.",
  },
  {
    topic: "Correctness",
    title: "'allclose(default) is enough'",
    wrong: "Default rtol=1e-05 atol=1e-08 becomes meaningless for FP16 or large reductions.",
    right: "Write a tolerance matrix by shape and dtype. ~1e-2 for FP16; range checks for big softmax reductions.",
  },
];

type QuizQuestion = {
  q: string;
  options: string[];
  correct: number;
  explain: string;
};

const quiz: QuizQuestion[] = [
  {
    q: "Why does a GPU have hundreds of small cores instead of a few large ones like a CPU?",
    options: [
      "To use less energy",
      "To hide latency by keeping many warps ready, increasing throughput on parallel work",
      "To increase the clock speed",
      "To produce less heat",
    ],
    correct: 1,
    explain: "GPUs keep many warps ready to run while others wait on memory, hiding latency. The goal is throughput, not latency.",
  },
  {
    q: "What is it called when 32 threads in a warp access consecutive bytes in the same 128-byte sector?",
    options: ["Bank conflict", "Warp divergence", "Coalesced access", "Shared broadcast"],
    correct: 2,
    explain: "Coalesced access lets the hardware combine 32 thread requests into a few memory transactions. Divergence means different paths in the same warp; bank conflict happens in shared memory.",
  },
  {
    q: "Which memory layer is the fastest?",
    options: ["L2 cache", "DRAM (global memory)", "Register", "Shared memory"],
    correct: 2,
    explain: "Registers sit on the SM and are scalar-accessible in a single cycle. Shared memory is also very fast but is programmable and shared by all threads in a block. Registers are the fastest.",
  },
  {
    q: "Which of the following is required to call a kernel 'correct'?",
    options: [
      "Only that it runs on the test data",
      "Reference comparison, an rtol/atol budget, and clean sanitizer results",
      "Only that it works on small shapes",
      "Only that it works in FP32",
    ],
    correct: 1,
    explain: "Triple acceptance gate: a reference (PyTorch/eager), a numerical budget (rtol+atol), and compute-sanitizer (memcheck, racecheck). One missing → weak claim.",
  },
  {
    q: "What does the 'roofline' chart in Nsight show?",
    options: [
      "Instant GPU temperature",
      "The ceiling set by memory bandwidth and compute capacity — where does the kernel land?",
      "Core count graph",
      "PCIe bus utilization",
    ],
    correct: 1,
    explain: "Roofline: AI (arithmetic intensity) on x-axis, performance on y-axis. Tells you whether the kernel is memory-bound or compute-bound. Without it, optimization is guesswork.",
  },
];

function CpuSvg() {
  return (
    <svg className="vf-compare-svg" viewBox="0 0 320 180" role="img" aria-label="CPU 4 large cores">
      <rect x="0" y="0" width="320" height="180" fill="#e9e3d3" />
      <rect x="20" y="20" width="280" height="140" fill="#fbf8f1" stroke="#4f5a6b" strokeWidth="1.5" />
      <text x="160" y="14" className="sub" textAnchor="middle" fill="#4f5a6b">CPU · 4 large cores</text>
      <g>
        <rect x="40" y="40" width="50" height="100" fill="#4f5a6b" />
        <text x="65" y="85" className="label" fill="white">ALU</text>
        <text x="65" y="100" className="label" fill="white" fontSize="7">+cache</text>
      </g>
      <g>
        <rect x="100" y="40" width="50" height="100" fill="#4f5a6b" />
        <text x="125" y="85" className="label" fill="white">ALU</text>
        <text x="125" y="100" className="label" fill="white" fontSize="7">+cache</text>
      </g>
      <g>
        <rect x="160" y="40" width="50" height="100" fill="#4f5a6b" />
        <text x="185" y="85" className="label" fill="white">ALU</text>
        <text x="185" y="100" className="label" fill="white" fontSize="7">+cache</text>
      </g>
      <g>
        <rect x="220" y="40" width="50" height="100" fill="#4f5a6b" />
        <text x="245" y="85" className="label" fill="white">ALU</text>
        <text x="245" y="100" className="label" fill="white" fontSize="7">+cache</text>
      </g>
    </svg>
  );
}

function GpuSvg() {
  return (
    <svg className="vf-compare-svg" viewBox="0 0 320 180" role="img" aria-label="GPU hundreds of small cores">
      <rect x="0" y="0" width="320" height="180" fill="#f9e0ea" />
      <rect x="10" y="20" width="300" height="140" fill="#fbf8f1" stroke="#d8467c" strokeWidth="1.5" />
      <text x="160" y="14" className="sub" textAnchor="middle" fill="#d8467c">GPU · hundreds of small cores (SM × lane)</text>
      {Array.from({ length: 8 }).map((_, row) =>
        Array.from({ length: 16 }).map((_, col) => {
          const x = 22 + col * 18;
          const y = 30 + row * 16;
          return <rect key={`${row}-${col}`} x={x} y={y} width="14" height="12" fill="#d8467c" opacity={0.85} />;
        })
      )}
    </svg>
  );
}

function AnatomySvg({ active, onSelect }: { active: AnatomyPart; onSelect: (p: AnatomyPart) => void }) {
  return (
    <svg viewBox="0 0 540 360" className="w-full" style={{ width: "100%", height: "auto" }} role="img" aria-label="GPU anatomy">
      <rect x="0" y="0" width="540" height="360" fill="#fbf8f1" />
      <g className="cursor" onClick={() => onSelect("host")}>
        <rect x="20" y="120" width="100" height="120" fill="var(--slate-soft)" stroke="var(--slate)" strokeWidth="1.5" />
        <text x="70" y="170" className="label" fill="#1a1614">CPU</text>
        <text x="70" y="184" className="label" fill="#1a1614" fontSize="7">Host system</text>
        <text x="70" y="252" className="small-label" fill="#1a1614">Host DRAM</text>
      </g>
      <line x1="120" y1="180" x2="180" y2="180" stroke="var(--ink)" strokeWidth="1.2" strokeDasharray="4 3" />
      <text x="150" y="172" className="small-label" fill="#1a1614">PCIe</text>
      <g>
        <rect x="180" y="40" width="340" height="280" fill="#ffffff" stroke="var(--ink)" strokeWidth="1.5" />
        <text x="350" y="32" className="die-label" textAnchor="middle" fill="var(--ink)">GPU DIE</text>
        <g className="cursor" onClick={() => onSelect("hbm")}>
          <rect x="190" y="50" width="320" height="38" fill="var(--teal-soft)" stroke="var(--teal)" strokeWidth="1" />
          <text x="350" y="74" className="label" fill="#1a1614">HBM · high bandwidth, high latency</text>
        </g>
        <g className="cursor" onClick={() => onSelect("l2")}>
          <rect x="190" y="100" width="320" height="28" fill="var(--violet-soft)" stroke="var(--violet)" strokeWidth="1" />
          <text x="350" y="119" className="label" fill="#1a1614">L2 cache · shared across SMs</text>
        </g>
        {Array.from({ length: 4 }).map((_, row) =>
          Array.from({ length: 8 }).map((_, col) => {
            const x = 200 + col * 38;
            const y = 145 + row * 40;
            const isActive = active === "sm";
            return (
              <g key={`sm-${row}-${col}`} className="cursor" onClick={() => onSelect("sm")}>
                <rect x={x} y={y} width="32" height="32" fill={isActive ? "var(--rose)" : "var(--rose-soft)"} stroke="var(--rose)" strokeWidth="1" />
                <text x={x + 16} y={y + 20} className="label" fill={isActive ? "#fff" : "#1a1614"} fontSize="7">SM</text>
              </g>
            );
          })
        )}
        <text x="350" y="316" className="small-label" fill="#1a1614">SM × 32 (Streaming Multiprocessor)</text>
      </g>
    </svg>
  );
}

function Header({ active, setActive, visited }: { active: Section; setActive: (s: Section) => void; visited: Set<Section> }) {
  return (
    <header className="vf-topbar">
      <button className="vf-brand" onClick={() => setActive("compare")} aria-label="Visual & Lasting Learning home">
        <span className="vf-brand-mark">V/L</span>
        <span><strong>VISUAL & LASTING</strong><small>LEARNING ATLAS</small></span>
      </button>
      <nav className="vf-module-nav" aria-label="Sections" tabIndex={0}>
        {sections.map((s) => (
          <button
            key={s.id}
            className={active === s.id ? "active" : ""}
            onClick={() => setActive(s.id)}
            aria-current={active === s.id ? "page" : undefined}
          >
            <span>{s.number}</span>{s.short}
          </button>
        ))}
      </nav>
      <div className="vf-course-meta">
        <span>{visited.size}/12 SECTIONS</span>
        <div className="vf-progress-track" aria-label={`Progress: ${visited.size} / 12`}><i style={{ width: `${(visited.size / 12) * 100}%` }} /></div>
      </div>
    </header>
  );
}

function SectionHead({ label, title, note }: { label: string; title: React.ReactNode; note: string }) {
  return (
    <div className="vf-section-head">
      <div>
        <div className="label">{label}</div>
        <h2>{title}</h2>
      </div>
      <p className="note">{note}</p>
    </div>
  );
}

function CompareSection() {
  return (
    <section className="vf-section">
      <SectionHead
        label="SECTION 01 · FIRST LOOK"
        title={<>CPU <em>vs</em> GPU: not latency, but <em>throughput</em>.</>}
        note="A CPU is a specialist: little work, low latency. A GPU is an army: many small soldiers working together for high throughput. Two different problems, two different designs."
      />
      <div className="vf-compare">
        <article className="vf-compare-card cpu">
          <div className="tag">● CPU · Latency-Optimizer</div>
          <h3>Few cores, deep cache</h3>
          <p className="lede">Heavy control flow, branch prediction, and serial workloads. Optimized to finish a single thread as fast as possible.</p>
          <CpuSvg />
          <dl className="vf-compare-grid">
            <dt>CORES</dt><dd>4–16 large, complex cores</dd>
            <dt>CACHE</dt><dd>L1/L2/L3 deep; predictors</dd>
            <dt>POWER</dt><dd>High clock × few cores</dd>
            <dt>PARADIGM</dt><dd>Cut latency, speed up a single task</dd>
          </dl>
        </article>
        <article className="vf-compare-card gpu">
          <div className="tag">● GPU · Throughput-Optimizer</div>
          <h3>Many cores, hundreds of lanes</h3>
          <p className="lede">SM × hundreds of lanes run in parallel. While one warp waits on memory, others compute. Slice the data and run every slice in parallel.</p>
          <GpuSvg />
          <dl className="vf-compare-grid">
            <dt>CORES</dt><dd>128 lanes per SM (4 warp × 32)</dd>
            <dt>CACHE</dt><dd>L1/shared programmable; L2 shared</dd>
            <dt>PARADIGM</dt><dd>Hide latency, raise throughput</dd>
            <dt>BEST FOR</dt><dd>SIMD, matmul, convolution, attention</dd>
          </dl>
        </article>
      </div>
    </section>
  );
}

const anatomyParts: Record<AnatomyPart, { title: string; desc: string; meta: Array<{ k: string; v: string }> }> = {
  sm: {
    title: "SM · Streaming Multiprocessor",
    desc: "The GPU's real work unit. An SM contains dozens of lanes, register file, shared memory, and special-function units. A kernel is divided into blocks across SMs. The more warps an SM can keep (occupancy), the more latency it can hide.",
    meta: [
      { k: "LOCATION", v: "On the GPU die" },
      { k: "RESOURCES", v: "Register + shared + L1" },
      { k: "COUNT", v: "80–140 per chip" },
    ],
  },
  l2: {
    title: "L2 cache",
    desc: "Shared cache for all SMs. Reduces global and local memory traffic. The kernel never allocates L2 directly; access pattern and working-set size determine the hit rate.",
    meta: [
      { k: "SCOPE", v: "All SMs" },
      { k: "SIZE", v: "MB scale" },
      { k: "LATENCY", v: "Lower than DRAM, higher than registers" },
    ],
  },
  hbm: {
    title: "HBM · High Bandwidth Memory",
    desc: "Home of large tensors. Bandwidth is high (TB/s scale), but a single access has high latency. Coalesced access and enough ready warps hide the latency.",
    meta: [
      { k: "LOCATION", v: "Outside the GPU package" },
      { k: "SIZE", v: "40–80 GB typical" },
      { k: "LATENCY", v: "Hundreds of cycles" },
    ],
  },
  host: {
    title: "CPU & Host memory",
    desc: "Behind a PCIe or similar link on a discrete GPU. Round-trips are expensive. Batched transfer, pinned memory, and copy-compute overlap manage this boundary.",
    meta: [
      { k: "LINK", v: "PCIe / NVLink" },
      { k: "SIZE", v: "System memory" },
      { k: "USE", v: "Load data, init, retrieve result" },
    ],
  },
};

function AnatomySection() {
  const [active, setActive] = useState<AnatomyPart>("sm");
  return (
    <section className="vf-section">
      <SectionHead
        label="SECTION 02 · INSIDE"
        title={<>What's <em>inside</em> a GPU? Click a part to learn.</>}
        note="Every part balances speed and capacity. Kernel design is the art of moving hot data to the nearest layer."
      />
      <div className="vf-anatomy">
        <div className="vf-anatomy-canvas">
          <AnatomySvg active={active} onSelect={setActive} />
        </div>
        <div className="vf-anatomy-side">
          {(Object.keys(anatomyParts) as AnatomyPart[]).map((key) => {
            const part = anatomyParts[key];
            return (
              <button key={key} className={`part ${active === key ? "active" : ""}`} onClick={() => setActive(key)}>
                <h4>{part.title}</h4>
                <p>{part.desc}</p>
                <div className="meta">{part.meta.map((m) => <span key={m.k}>{m.k}: {m.v}</span>)}</div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const lifecycleSteps = [
  {
    num: "01",
    title: "Host → Device",
    where: "CPU side",
    time: "μs – ms",
    desc: "Move data from host memory to GPU memory. Bulk and pinned transfers speed this up. The kernel cannot start before this.",
    glyph: (
      <svg viewBox="0 0 56 56" width="56" height="56" aria-hidden="true">
        <rect x="2" y="14" width="20" height="28" fill="var(--slate-soft)" stroke="var(--slate)" />
        <text x="12" y="32" fontSize="6" textAnchor="middle" fontWeight="800" fill="var(--ink)">CPU</text>
        <line x1="22" y1="28" x2="36" y2="28" stroke="var(--rose)" strokeWidth="2" strokeDasharray="3 2" />
        <polygon points="36,28 32,25 32,31" fill="var(--rose)" />
        <rect x="36" y="14" width="18" height="28" fill="var(--rose-soft)" stroke="var(--rose)" />
        <text x="45" y="32" fontSize="6" textAnchor="middle" fontWeight="800" fill="var(--ink)">GPU</text>
      </svg>
    ),
  },
  {
    num: "02",
    title: "Launch kernel",
    where: "Driver · grid × block",
    time: "5–20 μs launch",
    desc: "CPU launches the kernel with grid and block dimensions. Parameters go into the GPU command queue. This is expensive; don't launch for tiny work.",
    glyph: (
      <svg viewBox="0 0 56 56" width="56" height="56" aria-hidden="true">
        <circle cx="28" cy="28" r="22" fill="var(--rose-soft)" stroke="var(--rose)" strokeWidth="1.5" />
        <path d="M 28 12 L 28 28 L 40 36" stroke="var(--rose)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <circle cx="28" cy="28" r="2" fill="var(--rose)" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Execution",
    where: "SM × warp × lane",
    time: "ns – μs",
    desc: "Blocks are assigned to SMs. SM issues a different warp each cycle. Warps waiting on memory go to the background; ready warps advance. Latency hiding happens here.",
    glyph: (
      <svg viewBox="0 0 56 56" width="56" height="56" aria-hidden="true">
        <rect x="6" y="10" width="44" height="36" fill="var(--rose-soft)" stroke="var(--rose)" />
        {Array.from({ length: 8 }).map((_, i) => (
          <rect key={i} x={10 + i * 5} y={20 + (i % 2) * 4} width="3" height={20 - (i % 2) * 4} fill="var(--rose)" />
        ))}
        <text x="28" y="54" fontSize="6" textAnchor="middle" fontWeight="800" fill="var(--ink)">SM</text>
      </svg>
    ),
  },
  {
    num: "04",
    title: "Result & sync",
    where: "Device → Host",
    time: "μs – ms",
    desc: "Execution ends, sync or async retrieval. Pinned memory and CUDA Graphs cut the cost of repeated launches here.",
    glyph: (
      <svg viewBox="0 0 56 56" width="56" height="56" aria-hidden="true">
        <rect x="2" y="14" width="20" height="28" fill="var(--rose-soft)" stroke="var(--rose)" />
        <text x="12" y="32" fontSize="6" textAnchor="middle" fontWeight="800" fill="var(--ink)">GPU</text>
        <line x1="22" y1="28" x2="36" y2="28" stroke="var(--teal)" strokeWidth="2" strokeDasharray="3 2" />
        <polygon points="36,28 32,25 32,31" fill="var(--teal)" />
        <rect x="36" y="14" width="18" height="28" fill="var(--teal-soft)" stroke="var(--teal)" />
        <text x="45" y="32" fontSize="6" textAnchor="middle" fontWeight="800" fill="var(--ink)">CPU</text>
      </svg>
    ),
  },
];

function LifecycleSection() {
  return (
    <section className="vf-section">
      <SectionHead
        label="SECTION 03 · LIFE CYCLE"
        title={<>How does a kernel <em>live</em>? Four steps, four costs.</>}
        note="Most optimizations touch one of these four steps. Memorize them: load, launch, execute, retrieve."
      />
      <div className="vf-lifecycle">
        {lifecycleSteps.map((step) => (
          <article key={step.num} className="vf-lifecycle-step">
            <div className="time">{step.time}</div>
            <div className="glyph">{step.glyph}</div>
            <div className="num">{step.num}</div>
            <div>
              <h4>{step.title}</h4>
              <div className="where">📍 {step.where}</div>
            </div>
            <p>{step.desc}</p>
          </article>
        ))}
      </div>
      <div className="vf-technique-strip">
        <div className="cell">
          <div className="num">TECHNIQUE 01</div>
          <h5>Dual Coding</h5>
          <p>Combine visual and verbal. Look at the diagram, read the line, then explain it in your own words.</p>
        </div>
        <div className="cell">
          <div className="num">TECHNIQUE 02</div>
          <h5>Retrieval</h5>
          <p>One day after closing the section, try to teach it from the heading alone.</p>
        </div>
        <div className="cell">
          <div className="num">TECHNIQUE 03</div>
          <h5>Spaced Repetition</h5>
          <p>Today, tomorrow, 1 week, 2 weeks. Each time, force recall. The interval grows.</p>
        </div>
        <div className="cell">
          <div className="num">TECHNIQUE 04</div>
          <h5>Mnemonics & Analogy</h5>
          <p>Pair each technical term with a daily-life analogy. Use abbreviations like 'RSL-D-H'.</p>
        </div>
      </div>
    </section>
  );
}

function MemorySection() {
  return (
    <section className="vf-section">
      <SectionHead
        label="SECTION 04 · LASTING KNOWLEDGE"
        title={<>Cards that <em>stick</em> across every atlas.</>}
        note="Build associations instead of memorizing. These cards give you hooks to recall the terms a year from now."
      />
      <div className="vf-knowledge">
        {knowledgeCards.map((card) => (
          <article key={card.title} className={`vf-knowledge-card ${card.type}`}>
            <span className="badge">{card.badge}</span>
            <h4>{card.title}</h4>
            {card.type === "mnemonic" && <div className="term">{card.body}</div>}
            {card.type === "analogy" && <div className="analogy-line">{card.body}</div>}
            {card.type === "contrast" && <div className="contrast-line">{card.body}</div>}
            <p className="memory-hook">{card.hook}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function PitfallsSection() {
  return (
    <section className="vf-section">
      <SectionHead
        label="SECTION 05 · COMMON PITFALLS"
        title={<>Four <em>wrong</em> intuitions, four right answers.</>}
        note="Mistakes students fall into most often. Each one teaches how to think about the correct model."
      />
      <div className="vf-pitfalls">
        {pitfalls.map((p) => (
          <article key={p.title} className="vf-pitfall">
            <span className="topic">{p.topic.toUpperCase()}</span>
            <h4>{p.title}</h4>
            <p className="wrong">{p.wrong}</p>
            <p className="right">{p.right}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function QuizSection({ onScore }: { onScore: (s: number) => void }) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  const question = quiz[step];
  const isCorrect = selected === question.correct;

  const handleCheck = () => {
    if (selected === null) return;
    setRevealed(true);
    if (isCorrect) setScore((s) => s + 1);
  };
  const handleNext = () => {
    if (step + 1 >= quiz.length) {
      const finalScore = score + (isCorrect ? 1 : 0);
      onScore(finalScore);
      setCompleted(true);
    } else {
      setStep(step + 1);
      setSelected(null);
      setRevealed(false);
    }
  };
  const handleReset = () => {
    setStep(0);
    setSelected(null);
    setRevealed(false);
    setScore(0);
    setCompleted(false);
  };

  if (completed) {
    const finalScore = score;
    return (
      <section className="vf-section">
        <SectionHead
          label="SECTION 06 · SELF-CHECK"
          title={<>Test complete — <em>result:</em> {finalScore} / {quiz.length}.</>}
          note="Each correct answer moves a concept to long-term memory. Revisit the wrong ones and read the explanation."
        />
        <div className="vf-quiz">
          <p className="vf-quiz-question">
            {finalScore === quiz.length
              ? "Perfect. These five questions cover ~80% of the atlases. Come back in a week and try again."
              : finalScore >= 3
              ? "Good. Revisit the wrong answers and reopen the relevant atlas. Without review, it won't stick."
              : "These are fundamentals. Walk through the atlases in order and revisit the 'lasting knowledge' cards."}
          </p>
          <div className="vf-quiz-actions">
            <div className="vf-quiz-score">{finalScore}<span className="total"> / {quiz.length}</span></div>
            <button className="vf-quiz-btn" onClick={handleReset}>Restart Quiz</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="vf-section">
      <SectionHead
        label="SECTION 06 · SELF-CHECK"
        title={<>Did you <em>learn</em> it?</>}
        note="Five questions, five core concepts. Each answer moves a fact to long-term memory. Wrong answers teach too."
      />
      <div className="vf-quiz">
        <div className="quiz-head">
          <h3>Question {step + 1} / {quiz.length}</h3>
          <div className="progress">SCORE · {score}</div>
        </div>
        <p className="vf-quiz-question">{question.q}</p>
        <div className="vf-quiz-options">
          {question.options.map((opt, i) => {
            let cls = "vf-quiz-option";
            if (selected === i) cls += " selected";
            if (revealed) {
              if (i === question.correct) cls += " correct";
              else if (selected === i) cls += " wrong";
            }
            return (
              <button
                key={i}
                className={cls}
                onClick={() => !revealed && setSelected(i)}
                disabled={revealed}
              >
                <span className="letter">{String.fromCharCode(65 + i)}</span>
                <span className="text">{opt}</span>
              </button>
            );
          })}
        </div>
        {revealed && <div className="vf-quiz-explain">{question.explain}</div>}
        <div className="vf-quiz-actions">
          <div className="vf-quiz-score">{score}<span className="total"> / {quiz.length}</span></div>
          {!revealed ? (
            <button className="vf-quiz-btn" onClick={handleCheck} disabled={selected === null}>Check Answer</button>
          ) : (
            <button className="vf-quiz-btn" onClick={handleNext}>{step + 1 >= quiz.length ? "Finish Test" : "Next Question →"}</button>
          )}
        </div>
      </div>
    </section>
  );
}

const conceptMapNodes = [
  { id: "visual", idx: "01", title: "Visual & Lasting", x: 50, y: 50, color: "var(--rose)" },
  { id: "toolchain", idx: "02", title: "Engineering Foundations", x: 220, y: 50, color: "var(--gold)" },
  { id: "architecture", idx: "03", title: "Arch → SIMT", x: 390, y: 50, color: "var(--lime)" },
  { id: "memory", idx: "04", title: "GPU Memory", x: 560, y: 50, color: "var(--cyan)" },
  { id: "triton", idx: "05", title: "Triton Lab", x: 730, y: 50, color: "var(--violet)" },
  { id: "operators", idx: "06", title: "LLM Kernel Patterns", x: 50, y: 250, color: "var(--coral)" },
  { id: "correctness", idx: "07", title: "Correctness & Safety", x: 220, y: 250, color: "var(--green)" },
  { id: "profiling", idx: "08", title: "Nsight & Benchmark", x: 390, y: 250, color: "var(--blue)" },
  { id: "cutlass", idx: "09", title: "CUTLASS · CuTe", x: 560, y: 250, color: "var(--pink)" },
  { id: "inference", idx: "10", title: "Inference Lab", x: 730, y: 250, color: "var(--lime)" },
  { id: "multigpu", idx: "11", title: "NCCL & Multi-GPU", x: 130, y: 450, color: "var(--cyan)" },
  { id: "systems", idx: "12", title: "GPU Software Stack", x: 460, y: 450, color: "var(--orange)" },
];

const conceptMapEdges = [
  { from: "visual", to: "architecture", kind: "prereq" as const },
  { from: "toolchain", to: "architecture", kind: "prereq" as const },
  { from: "architecture", to: "memory", kind: "prereq" as const },
  { from: "architecture", to: "triton", kind: "prereq" as const },
  { from: "memory", to: "operators", kind: "prereq" as const },
  { from: "triton", to: "operators", kind: "prereq" as const },
  { from: "operators", to: "correctness", kind: "feeds" as const },
  { from: "correctness", to: "profiling", kind: "prereq" as const },
  { from: "profiling", to: "cutlass", kind: "feeds" as const },
  { from: "cutlass", to: "inference", kind: "prereq" as const },
  { from: "inference", to: "multigpu", kind: "prereq" as const },
  { from: "multigpu", to: "systems", kind: "feeds" as const },
];

const conceptMapDetails: Record<string, { title: string; desc: string; prereq: string[]; feeds: string[] }> = {
  visual: {
    title: "Visual & Lasting Learning",
    desc: "Meta-learning layer that ties all atlases together. GPU 101, anatomy, lasting knowledge cards, and retrieval practice.",
    prereq: [],
    feeds: ["architecture", "memory", "operators", "profiling"],
  },
  toolchain: {
    title: "Engineering Foundations",
    desc: "C++, Linux, Git, CMake. Infrastructure for every atlas.",
    prereq: [],
    feeds: ["architecture", "triton"],
  },
  architecture: {
    title: "Arch → SIMT → CUDA",
    desc: "Grid, block, warp, lane. Core of the mental model. Foundation for memory and operator atlases.",
    prereq: ["visual", "toolchain"],
    feeds: ["memory", "triton"],
  },
  memory: {
    title: "GPU Memory Lab",
    desc: "Coalescing, bank conflicts, occupancy. The main lever for operator performance.",
    prereq: ["architecture"],
    feeds: ["operators"],
  },
  triton: {
    title: "PyTorch + Triton Lab",
    desc: "torch.library, masked kernel, opcheck, torch.compile. The practical way to write an operator.",
    prereq: ["architecture"],
    feeds: ["operators"],
  },
  operators: {
    title: "LLM Kernel Patterns",
    desc: "GEMM, reduction, softmax, RMSNorm, attention. ~80% of modern GPU kernel work lives here.",
    prereq: ["memory", "triton"],
    feeds: ["correctness", "cutlass"],
  },
  correctness: {
    title: "Correctness & Safety",
    desc: "Reference, tolerance, sanitizer. Closes the gap between 'it ran' and 'it is correct'.",
    prereq: ["operators"],
    feeds: ["profiling"],
  },
  profiling: {
    title: "Nsight & Benchmark",
    desc: "Timeline, roofline, quantiles. The evidence for any optimization starts here.",
    prereq: ["correctness"],
    feeds: ["cutlass", "inference"],
  },
  cutlass: {
    title: "CUTLASS · CuTe · Tensor Core",
    desc: "From abstraction to silicon. Strip GEMM to its layout algebra.",
    prereq: ["operators", "profiling"],
    feeds: ["inference"],
  },
  inference: {
    title: "Inference Systems",
    desc: "vLLM, CUDA Graphs, quantization. Balance TTFT / ITL / throughput.",
    prereq: ["cutlass", "profiling"],
    feeds: ["multigpu"],
  },
  multigpu: {
    title: "NCCL & Multi-GPU",
    desc: "Collectives, parallelism strategies, RDMA. The reality of distribution.",
    prereq: ["inference"],
    feeds: ["systems"],
  },
  systems: {
    title: "GPU Software Stack",
    desc: "ROCm, HIP, MLIR, TensorRT. Portability and the wider ecosystem.",
    prereq: ["multigpu"],
    feeds: [],
  },
};

function MapSection() {
  const [active, setActive] = useState<string>("visual");
  const detail = conceptMapDetails[active];
  const nodeMap: Record<string, typeof conceptMapNodes[number]> = Object.fromEntries(conceptMapNodes.map((n) => [n.id, n]));
  return (
    <section className="vf-section">
      <SectionHead
        label="SECTION 07 · BIG PICTURE"
        title={<>See all 12 atlases on <em>one map</em>: who feeds whom, who needs whom first.</>}
        note="Solid line = 'feeds' (knowing this makes the next easier). Dashed line = 'prerequisite' (don't enter without finishing the previous one)."
      />
      <div className="vf-map-legend">
        <span className="item"><span className="swatch" style={{ background: "var(--rose-soft)", borderColor: "var(--rose)" }} /> ATLAS NODE</span>
        <span className="item"><span className="swatch" style={{ background: "transparent", borderColor: "var(--teal)" }} /> FEEDS</span>
        <span className="item"><span className="swatch" style={{ background: "transparent", borderColor: "var(--rose)", borderStyle: "dashed" }} /> PREREQUISITE</span>
      </div>
      <div className="vf-map-canvas">
        <svg viewBox="0 0 910 540" role="img" aria-label="Atlas concept map">
          {conceptMapEdges.map((edge) => {
            const from = nodeMap[edge.from];
            const to = nodeMap[edge.to];
            if (!from || !to) return null;
            return (
              <line
                key={`${edge.from}-${edge.to}`}
                className={`vf-map-edge ${edge.kind}`}
                x1={from.x + 65}
                y1={from.y + 22}
                x2={to.x + 65}
                y2={to.y + 22}
              />
            );
          })}
          {conceptMapNodes.map((node) => (
            <g
              key={node.id}
              className="vf-map-node"
              onClick={() => setActive(node.id)}
              transform={`translate(${node.x}, ${node.y})`}
            >
              <rect
                x="0"
                y="0"
                width="130"
                height="44"
                rx="4"
                fill={node.color}
                stroke={active === node.id ? "#1a1614" : "transparent"}
                strokeWidth={active === node.id ? "2" : "0"}
              />
              <text className="idx" x="14" y="17">{node.idx}</text>
              <text className="title" x="65" y="29">{node.title}</text>
            </g>
          ))}
        </svg>
      </div>
      <div className="vf-map-detail">
        <div className="badge" style={{ background: nodeMap[active]?.color, color: "#fff" }}>{nodeMap[active]?.idx}</div>
        <div>
          <h4>{detail.title}</h4>
          <p>{detail.desc}</p>
          <div className="rel">
            {detail.prereq.length > 0 && <span>PREREQ → {detail.prereq.map((p) => conceptMapDetails[p]?.title).join(" · ")}</span>}
            {detail.feeds.length > 0 && <span>FEEDS → {detail.feeds.map((p) => conceptMapDetails[p]?.title).join(" · ")}</span>}
            {detail.prereq.length === 0 && detail.feeds.length === 0 && <span>INDEPENDENT ENTRY POINT</span>}
          </div>
        </div>
      </div>
    </section>
  );
}

const recallCards = [
  { atlas: "Visual & Lasting", idx: "01", prompt: "You compare a warp to a classroom: what does the teacher give, what do students do, and when does divergence happen?", answer: "The teacher (issue unit) issues one instruction; 32 students execute the same instruction at once. If some take a different branch, that's divergence." },
  { atlas: "Engineering Foundations", idx: "02", prompt: "What principle do you use in modern C++ for resource management, and why?", answer: "RAII: tie resource lifetime to object lifetime. Destructor runs on scope exit, so leaks and double-frees go away." },
  { atlas: "Arch → SIMT", idx: "03", prompt: "32 threads run the same instruction. Two terms: coalescing and divergence.", answer: "Coalesced: requests land in the same sector → few transactions. Divergence: same warp takes different paths → serialized execution." },
  { atlas: "GPU Memory", idx: "04", prompt: "Order the memory hierarchy from fastest to biggest. Which is fastest and slowest?", answer: "Register (fastest) → Shared → L2 → DRAM (HBM) → Host. Each layer is bigger and slower than the previous." },
  { atlas: "Triton", idx: "05", prompt: "What does torch.library do? Why is opcheck critical?", answer: "torch.library: registers a custom op in PyTorch with a contract (schema, autograd). Opcheck: shape/dtype/grad tests verify the autograd contract." },
  { atlas: "LLM Kernel Patterns", idx: "06", prompt: "How do you make softmax numerically stable?", answer: "Subtract the max: x - max(x), then exp and sum. Prevents exp overflow on large values. Online softmax does it in one pass." },
  { atlas: "Correctness", idx: "07", prompt: "Three requirements to call a kernel 'correct' (the R-T-S triangle).", answer: "R: reference comparison. T: rtol + atol budget. S: Compute Sanitizer (memcheck, racecheck) clean." },
  { atlas: "Nsight & Benchmark", idx: "08", prompt: "What does the roofline chart show? Which two ceilings?", answer: "AI (arithmetic intensity) on x-axis, performance on y-axis. Memory-bandwidth ceiling + compute-capacity ceiling. A kernel lands between the two." },
  { atlas: "CUTLASS · CuTe", idx: "09", prompt: "What is a 'tile' in CUTLASS, and why does it matter?", answer: "Tile: the block a CTA processes in one step. Critical for memory reuse — bigger tile = more data in shared memory, smaller tile = lower occupancy." },
  { atlas: "Inference", idx: "10", prompt: "What do TTFT and ITL measure? Which matters more in chat vs batch?", answer: "TTFT: time to first token. ITL: inter-token latency. Chat workloads care more about TTFT; batch generation cares more about ITL." },
  { atlas: "NCCL & Multi-GPU", idx: "11", prompt: "What does AllReduce cost depend on? Why 2(N-1)/N steps in ring?", answer: "Bandwidth and latency. Ring: each link carries one chunk at a time; N-1 reduce-scatter + N-1 all-gather = 2(N-1)/N. Small N is link-limited." },
  { atlas: "GPU Software Stack", idx: "12", prompt: "What's the main portability layer between ROCm and CUDA stacks? What does HIP provide?", answer: "HIP: source-level portability. Same source code compiles for AMD and NVIDIA. Limits: kernel intrinsics and arch details may need hand-tuning." },
];

function RecallSection() {
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [reviewed, setReviewed] = useState<Set<number>>(new Set());

  const toggle = (i: number) => {
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
    setReviewed((prev) => new Set(prev).add(i));
  };

  const flipAll = () => {
    setFlipped((prev) => (prev.size === recallCards.length ? new Set() : new Set(recallCards.map((_, i) => i))));
  };
  const markAllReviewed = () => {
    setReviewed(new Set(recallCards.map((_, i) => i)));
  };
  const reset = () => {
    setFlipped(new Set());
    setReviewed(new Set());
  };

  const pct = Math.round((reviewed.size / recallCards.length) * 100);

  return (
    <section className="vf-section">
      <SectionHead
        label="SECTION 08 · RETRIEVAL"
        title={<>A <em>one-sentence</em> summary of every atlas. Flip a card, try to recall.</>}
        note="Active retrieval is ~3x more effective than re-reading. Click a card → see the answer → compare with your recall. Don't close the section until you've reviewed all of them."
      />
      <div className="vf-card-grid">
        {recallCards.map((card, i) => {
          const isFlipped = flipped.has(i);
          return (
            <button
              key={i}
              className={`vf-card ${isFlipped ? "flipped" : ""}`}
              onClick={() => toggle(i)}
              aria-label={`${card.atlas} — card ${i + 1}`}
            >
              <div className="vf-card-face vf-card-front">
                <div className="top">
                  <span className="label">{card.atlas.toUpperCase()}</span>
                  <span className="num">{card.idx}</span>
                </div>
                <div className="prompt">{card.prompt}</div>
                <div className="flip-hint">{isFlipped ? "ANSWER ↓" : "CLICK FOR ANSWER →"}</div>
              </div>
              <div className="vf-card-face vf-card-back">
                <div className="top">
                  <span className="label">{card.atlas.toUpperCase()}</span>
                  <span className="num">{card.idx}</span>
                </div>
                <div className="answer-label">ANSWER · QUICK SUMMARY</div>
                <div className="answer">{card.answer}</div>
                <div className="flip-hint">BACK TO PROMPT ↑</div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="vf-card-stats">
        <b>{reviewed.size}<small style={{ fontWeight: 600, opacity: 0.7, fontSize: "10px", marginLeft: "4px" }}> / {recallCards.length}</small></b>
        <div className="progress-track" aria-label={`Reviewed: ${reviewed.size} / ${recallCards.length}`}>
          <i style={{ width: `${pct}%` }} />
        </div>
        <small>{pct}% REVIEWED</small>
      </div>
      <div className="vf-card-actions">
        <button onClick={flipAll} className={flipped.size === recallCards.length ? "active" : ""}>
          {flipped.size === recallCards.length ? "FLIP ALL BACK" : "FLIP ALL"}
        </button>
        <button onClick={markAllReviewed} className={reviewed.size === recallCards.length ? "active" : ""}>
          {reviewed.size === recallCards.length ? "ALL MARKED" : "MARK ALL REVIEWED"}
        </button>
        <button onClick={reset} className="secondary" style={{ borderColor: "var(--line)", color: "var(--muted)" }}>
          RESET
        </button>
      </div>
    </section>
  );
}

const glossaryTerms: Array<{ term: string; def: string; analogy: string; cat: string }> = [
  { term: "Kernel", def: "A function run in parallel by thousands of threads on the GPU. Marked __global__.", analogy: "A stage director (host) hands the stage (GPU) a single script (kernel); hundreds of actors (threads) perform it at once.", cat: "Architecture" },
  { term: "Thread", def: "Smallest unit of execution. Each thread has its own register file.", analogy: "A single student in a classroom. Each writes in their own notebook (register).", cat: "Architecture" },
  { term: "Warp", def: "32 threads that execute in lockstep. The SM issues one warp per cycle.", analogy: "A row of 32 students. They all turn the same page at the same time.", cat: "Architecture" },
  { term: "Block (CTA)", def: "Threads sharing one SM (up to 1024). They share shared memory and can sync.", analogy: "A classroom (32 rows = warps, classroom = block). They share a blackboard (shared memory).", cat: "Architecture" },
  { term: "Grid", def: "All blocks in one kernel launch. One launch = one grid.", analogy: "The whole school. Each class (block) does its own work; the principal (driver) only starts it.", cat: "Architecture" },
  { term: "SM (Streaming Multiprocessor)", def: "Physical core of the GPU. Holds registers, shared memory, lanes, and a scheduler.", analogy: "A workshop: a foreman (scheduler) hands jobs to benches (warps) one by one.", cat: "Architecture" },
  { term: "Register", def: "On-chip, single-cycle access. Fastest but smallest memory layer.", analogy: "The note in your pocket. Instant access, but you can only write a little.", cat: "Memory" },
  { term: "Shared Memory", def: "Block-wide scratchpad. Programmable, high bandwidth, low latency.", analogy: "The classroom blackboard. Anyone can write or erase; everyone shares it.", cat: "Memory" },
  { term: "L2 Cache", def: "Cache shared by all SMs. MB scale, lower latency than DRAM.", analogy: "The school library. Anyone can borrow; classes don't bring the same book from home.", cat: "Memory" },
  { term: "HBM", def: "GPU DRAM. High bandwidth, high latency. Lives outside the die.", analogy: "The city warehouse. Far away, but bulk transport is fast (bus = sector).", cat: "Memory" },
  { term: "Coalesced Access", def: "32 threads land in the same 128 B sector. The hardware combines requests.", analogy: "32 people board the same bus. 4 seats × 8 rows = one trip.", cat: "Memory" },
  { term: "Bank Conflict", def: "Multiple threads in a warp hit the same shared-memory bank → serialized.", analogy: "32 writers, 1 pen. The rest have to wait their turn.", cat: "Memory" },
  { term: "Occupancy", def: "Active warps per SM ÷ max warps. Measures latency-hiding capacity.", analogy: "How full the elevator is. Too high = stuck, too low = wasted capacity.", cat: "Memory" },
  { term: "Divergence", def: "Threads in the same warp take different branches → execution serializes.", analogy: "Half the class asks for page 5, half for page 7. The teacher teaches 5, then 7.", cat: "Architecture" },
  { term: "GEMM", def: "General Matrix Multiply: Y = A × B. The heart of modern GPU kernels.", analogy: "Multiplying two Excel tables. Cell × column = new cell.", cat: "Operators" },
  { term: "Softmax", def: "Maps numbers to 0–1 probabilities: x → exp(x) / sum(exp(x)).", analogy: "Turning test scores into a 'chance ranking'. Subtract max first to avoid overflow.", cat: "Operators" },
  { term: "RMSNorm", def: "Light layer norm. Uses root-mean-square instead of mean.", analogy: "Class height RMS instead of mean. Faster and lighter.", cat: "Operators" },
  { term: "Fusion", def: "Combining two consecutive ops into one kernel. Halves memory traffic.", analogy: "One grocery run for everything, instead of two stores, two trips.", cat: "Operators" },
  { term: "rtol / atol", def: "Two tolerances in allclose: relative and absolute. ~1e-2 for FP16, ~1e-5 for FP32.", analogy: "There's no 'exactly right' in measurements. You set a 'close enough' budget.", cat: "Correctness" },
  { term: "Sanitizer", def: "Catches memory and race bugs. memcheck, racecheck.", analogy: "Food-safety check at the kitchen. Catches issues before they reach the customer.", cat: "Correctness" },
  { term: "Nsight Systems", def: "Timeline profiler. When each kernel runs, CPU↔GPU waits.", analogy: "A daily hourly schedule. Which class takes how long, what you do at break.", cat: "Profiling" },
  { term: "Nsight Compute", def: "Detailed profile of a single kernel: roofline, memory, occupancy.", analogy: "A single exam analysis. Time per question, where you got stuck.", cat: "Profiling" },
  { term: "Roofline", def: "Performance ceiling chart. Shows memory and compute limits.", analogy: "A car's top speed. Measure how close you are to the ceiling.", cat: "Profiling" },
  { term: "Tensor Core", def: "Special hardware for matrix multiply. 4×4 FP16 matrices per cycle.", analogy: "Using a calculator in math class. Same job, way faster.", cat: "Hardware" },
  { term: "CUDA Graph", def: "Record a sequence of kernel launches and replay them cheaply.", analogy: "An orchestra conductor saving the score. No need to re-read it every rehearsal.", cat: "Inference" },
  { term: "AllReduce", def: "Sum tensors across all GPUs and broadcast the result back.", analogy: "Collect class scores, take the average, share the result with everyone.", cat: "Multi-GPU" },
  { term: "NCCL", def: "NVIDIA Collective Communications Library. Multi-GPU collectives.", analogy: "The post office. Every city (GPU) sends, merges, and forwards the package.", cat: "Multi-GPU" },
  { term: "TTFT", def: "Time To First Token. How long until the model produces the first token.", analogy: "How long from sitting down to the first course arriving. The soup = first token.", cat: "Inference" },
  { term: "ITL", def: "Inter-Token Latency. Time between consecutive tokens.", analogy: "Time between main course, dessert, coffee. Should feel smooth.", cat: "Inference" },
  { term: "Triton", def: "Python-like GPU kernel language. Natural integration with PyTorch.", analogy: "Learning Spanish instead of French. Similar to CUDA, but closer to Python.", cat: "Tools" },
];

function GlossarySection() {
  const [filter, setFilter] = useState<string>("All");
  const cats = useMemo(() => ["All", ...Array.from(new Set(glossaryTerms.map((t) => t.cat)))], []);
  const filtered = filter === "All" ? glossaryTerms : glossaryTerms.filter((t) => t.cat === filter);
  return (
    <section className="vf-section">
      <SectionHead
        label="SECTION 09 · GLOSSARY"
        title={<>30 <em>terms</em>, 30 daily-life analogies. Click, remember.</>}
        note="Every technical term that appears in the atlases lives here. The analogy turns each term into a story you'll remember."
      />
      <div className="vf-glossary-filter" role="group" aria-label="Category filter">
        {cats.map((cat) => (
          <button key={cat} className={filter === cat ? "active" : ""} onClick={() => setFilter(cat)} aria-pressed={filter === cat}>
            {cat.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="vf-glossary-grid">
        {filtered.map((t) => (
          <article key={t.term} className="vf-glossary-term">
            <strong className="term">{t.term}</strong>
            <p className="def">{t.def}</p>
            <p className="analogy">💡 {t.analogy}</p>
            <span className="cat">{t.cat.toUpperCase()}</span>
          </article>
        ))}
      </div>
      <div className="vf-glossary-stats">
        <span>SHOWING · <b>{filtered.length}</b> / {glossaryTerms.length} TERMS</span>
        <span>CATEGORIES · <b>{cats.length - 1}</b></span>
      </div>
    </section>
  );
}

const cheatSheets: Array<{ idx: string; name: string; atlas: string; points: string[]; tag: string }> = [
  {
    idx: "01", name: "Visual & Lasting", atlas: "Visual & Lasting Learning",
    points: [
      "GPU raises throughput by hiding latency — hundreds of small cores.",
      "Memory: Register → Shared → L2 → DRAM (HBM) → Host. Speed drops, size grows.",
      "Coalesced = 32 threads land in the same sector. Stride 1 always wins.",
      "A kernel is correct: reference + rtol/atol + sanitizer (R-T-S triangle).",
      "Roofline: memory or compute bound? Ask first, then optimize.",
    ],
    tag: "META",
  },
  {
    idx: "02", name: "Engineering Foundations", atlas: "Engineering Foundations",
    points: [
      "Modern C++ (C++17/20/23) + target-based CMake.",
      "Git: small commits + meaningful messages + rebase for clean history.",
      "RAII: destructor on scope exit. Kills leaks and double-frees.",
      "Tests: pytest, smoke, integration. Coverage % matters less than critical-path count.",
      "CMake target-based: use target_link_libraries, not add_library/executable.",
    ],
    tag: "TOOLCHAIN",
  },
  {
    idx: "03", name: "Architecture → SIMT", atlas: "Architecture → SIMT → CUDA",
    points: [
      "Grid → Block → Warp → Lane. 32 lanes = 1 warp.",
      "Block size must be a multiple of 32; never above 1024.",
      "One block = one SM. The SM holds multiple blocks, not slices them.",
      "Shared memory: per-block, programmable. Fast but limited.",
      "Divergence: same warp, different paths = serial execution. Split data before branch.",
    ],
    tag: "CUDA",
  },
  {
    idx: "04", name: "GPU Memory", atlas: "GPU Memory Lab",
    points: [
      "Hierarchy: Register > Shared > L2 > HBM > Host.",
      "Coalesced: 128 B request lands in 4 sectors (32 B × 4).",
      "Stride 8 = 8× wasted bandwidth. Aim for stride 1.",
      "Shared memory: 32 banks. Conflict on the same bank. tile[33] padding fixes it.",
      "Occupancy = active/max warps. High isn't required — only enough to hide latency.",
    ],
    tag: "MEMORY",
  },
  {
    idx: "05", name: "Triton", atlas: "PyTorch + Triton Kernel Lab",
    points: [
      "torch.library to register an op. Write schema, forward, backward separately.",
      "Triton: @triton.jit, program_id(axis) for block index.",
      "Mask: when size isn't a tile multiple, guard out-of-bounds access.",
      "Opcheck: shape/dtype/grad tests. Verifies the autograd contract.",
      "torch.compile: pattern-match auto-fusion. Eager first, compile after.",
    ],
    tag: "PYTORCH",
  },
  {
    idx: "06", name: "LLM Kernel Patterns", atlas: "LLM Kernel Patterns",
    points: [
      "GEMM: M×K × K×N = M×N. Tensor Core does 4×4×4 cubes per cycle.",
      "Softmax: x - max(x) prevents overflow. Online softmax = one pass.",
      "RMSNorm: RMS instead of mean. Lighter than LayerNorm.",
      "FlashAttention: fusion for attention. Memory O(N) instead of O(N²).",
      "KV-cache: pre-computed key/value for attention. Budget it.",
    ],
    tag: "OPERATORS",
  },
  {
    idx: "07", name: "Correctness", atlas: "Kernel Correctness & Safety",
    points: [
      "R-T-S triangle: Reference, Tolerance, Sanitizer.",
      "allclose(rtol=1e-5, atol=1e-8) for FP32, ~1e-2 for FP16.",
      "Edge-case matrix: empty, single element, NaN/Inf, large/small batch.",
      "Compute Sanitizer: memcheck (leaks), racecheck (data races).",
      "If not bitwise deterministic, fix seeds. Bf16 atomic add order matters.",
    ],
    tag: "CORRECTNESS",
  },
  {
    idx: "08", name: "Nsight & Benchmark", atlas: "Nsight & Benchmark Guide",
    points: [
      "Warm-up: at least 10 iterations. Cache + clock stable now.",
      "Quantile (p50/p95), not mean. p95 catches the tail.",
      "Nsight Systems: timeline first. Which kernel takes how long?",
      "Nsight Compute: single kernel. Roofline + bottleneck visualization.",
      "Baseline: same shape/dtype, same hardware, same driver. Otherwise the claim is weak.",
    ],
    tag: "PROFILING",
  },
  {
    idx: "09", name: "CUTLASS · CuTe", atlas: "CUTLASS · CuTe · Tensor Core · PTX",
    points: [
      "CUTLASS: pick a tile policy. TileShape, ClusterShape, PipelineStage.",
      "CuTe: layout algebra. make_layout, local_partition.",
      "Tensor Core: 16×8×16 (mma.m16n8k16) with FP16, BF16, TF32.",
      "PTX: mma.sync instruction. Verify SASS — drivers can do surprising things.",
      "Fusion: 3–5 ops in one kernel. Memory traffic halves.",
    ],
    tag: "DEEP",
  },
  {
    idx: "10", name: "Inference", atlas: "Inference Systems Lab",
    points: [
      "vLLM: PagedAttention fixes KV-cache memory fragmentation.",
      "Continuous batching: dynamic batch. 5–10× throughput.",
      "CUDA Graph: for repeated calls with fixed shapes. 2–3× speedup.",
      "Quantization: FP32 → FP16 (1.5×), → INT8 (2–3×), → INT4 (4×).",
      "TTFT vs ITL: chat cares about TTFT, batch about ITL. Different bottlenecks.",
    ],
    tag: "INFERENCE",
  },
  {
    idx: "11", name: "NCCL & Multi-GPU", atlas: "NCCL & Multi-GPU Systems",
    points: [
      "AllReduce cost = 2(N-1)/N. 8 GPUs ≈ 1.75 steps, 64 GPUs ≈ 1.97.",
      "NVLink > PCIe. Use NVLink/Switch when you can.",
      "DP (data parallel): sum gradients. TP (tensor): split large matmuls.",
      "PP (pipeline): split layers. EP (expert): for mixture of experts.",
      "RDMA: GPUDirect skips the CPU. NVSwitch is the gold standard.",
    ],
    tag: "MULTI-GPU",
  },
  {
    idx: "12", name: "GPU Software Stack", atlas: "GPU Software Stack",
    points: [
      "ROCm: AMD GPU stack. API-level similar to CUDA.",
      "HIP: source portability. Same code, two platforms.",
      "MLIR: multi-level IR. Triton, IREE, JAX all use it.",
      "TensorRT: NVIDIA inference engine. Tactic selection + calibration.",
      "Portability: ~80% HIP. The other 20% is arch-specific (warp features, async copy).",
    ],
    tag: "STACK",
  },
];

function CheatSection() {
  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };
  return (
    <section className="vf-section">
      <SectionHead
        label="SECTION 10 · CHEAT SHEETS"
        title={<>A <em>one-page</em> summary of every atlas. Print it, keep it on your desk.</>}
        note="5 bullets per atlas. Print-friendly — this section exports to PDF cleanly via Ctrl+P / ⌘+P."
      />
      <div className="vf-print-strip">
        <button onClick={handlePrint}>🖨️ PRINT / SAVE AS PDF</button>
        <button disabled style={{ opacity: 0.5 }}>📋 CLIPBOARD (soon)</button>
      </div>
      <div className="vf-cheat-grid">
        {cheatSheets.map((sheet) => (
          <article key={sheet.idx} className="vf-cheat-card">
            <div className="vf-cheat-card-head">
              <div className="left">
                <span className="atlas">{sheet.atlas.toUpperCase()}</span>
                <span className="name">{sheet.name}</span>
              </div>
              <span className="num">{sheet.idx}</span>
            </div>
            <span className="tag">{sheet.tag}</span>
            <ul>
              {sheet.points.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

const codePatterns = [
  {
    title: "Coalesced Global Memory Access (float4 vectorized)",
    tag: "MEMORY",
    code: [
      { type: "kw", text: "__global__ " },
      { type: "ty", text: "void " },
      { type: "fn", text: "vecAdd" },
      { type: "st", text: "(" },
      { type: "ty", text: "float4" },
      { type: "st", text: "* " },
      { type: "nm", text: "A" },
      { type: "st", text: ", " },
      { type: "ty", text: "float4" },
      { type: "st", text: "* " },
      { type: "nm", text: "B" },
      { type: "st", text: ", " },
      { type: "ty", text: "float4" },
      { type: "st", text: "* " },
      { type: "nm", text: "C" },
      { type: "st", text: ", " },
      { type: "ty", text: "int " },
      { type: "nm", text: "N" },
      { type: "st", text: ") {" },
    ],
    annotations: [
      "Read float4 (16 B): 32 threads × 16 B = 512 B = 4 sectors. Fully coalesced.",
      "Pitfall: never use stride 2 or random indexing. Bandwidth drops 2–8×.",
    ],
  },
  {
    title: "Shared Memory Tiling (matrix transpose)",
    tag: "SHARED",
    code: [
      { type: "kw", text: "__shared__ " },
      { type: "ty", text: "float " },
      { type: "nm", text: "tile" },
      { type: "st", text: "[" },
      { type: "nm", text: "32" },
      { type: "st", text: "][" },
      { type: "nm", text: "33" },
      { type: "st", text: "];" },
      { type: "cm", text: "  // 33 = padding, prevents bank conflicts" },
    ],
    annotations: [
      "Padding 33 (instead of 32) breaks bank conflicts. A natural 32-wide column would put all threads on the same bank.",
      "__syncthreads() after each write. No thread reads before all have written.",
    ],
  },
  {
    title: "Warp-level Reduction (sum)",
    tag: "REDUCTION",
    code: [
      { type: "ty", text: "int " },
      { type: "nm", text: "val" },
      { type: "st", text: " = " },
      { type: "fn", text: "__shfl_xor_sync" },
      { type: "st", text: "(" },
      { type: "nm", text: "0xffffffff" },
      { type: "st", text: ", " },
      { type: "nm", text: "val" },
      { type: "st", text: ", " },
      { type: "nm", text: "16" },
      { type: "st", text: ");" },
    ],
    annotations: [
      "__shfl_xor_sync: register transfer between lanes. No shared memory needed.",
      "Strides 16, 8, 4, 2, 1 in 5 steps sum 32 values. Zero shared memory traffic.",
    ],
  },
  {
    title: "Masked Boundary (Triton)",
    tag: "TRITON",
    code: [
      { type: "kw", text: "@triton.jit" },
      { type: "st", text: "\n" },
      { type: "kw", text: "def " },
      { type: "fn", text: "add_kernel" },
      { type: "st", text: "(" },
      { type: "nm", text: "x_ptr" },
      { type: "st", text: ", " },
      { type: "nm", text: "y_ptr" },
      { type: "st", text: ", " },
      { type: "nm", text: "n" },
      { type: "st", text: ", " },
      { type: "nm", text: "BLOCK" },
      { type: "st", text: ": " },
      { type: "ty", text: "tl.constexpr" },
      { type: "st", text: "):" },
    ],
    annotations: [
      "pid = tl.program_id(0): block index. Tells you which slice to process.",
      "offsets = pid*BLOCK + tl.arange(0, BLOCK): the indices for this slice.",
      "mask = offsets < n: the last block may overflow. Unmasked read = undefined behavior.",
    ],
  },
];

function CodeSection() {
  return (
    <section className="vf-section">
      <SectionHead
        label="SECTION 11 · CODE PATTERNS"
        title={<>4 <em>patterns</em>, 4 critical performance tricks.</>}
        note="~80% of modern GPU kernels use one of these patterns. The 'why this way' is next to each pattern."
      />
      <div className="vf-code-grid">
        {codePatterns.map((p, i) => (
          <article key={p.title} className="vf-code-pattern">
            <div className="vf-code-pattern-head">
              <h4>{p.title}</h4>
              <span className="tag">{p.tag}</span>
            </div>
            <div className="vf-code-pattern-body">
              <pre className="vf-code-block" tabIndex={0} aria-label={`${p.title} code example`}>
                {p.code.map((tok, j) => (
                  <span key={j} className={tok.type === "st" ? "" : tok.type}>
                    {j === 0 ? <span className="ln">{i + 1}</span> : null}
                    {tok.text}
                  </span>
                ))}
              </pre>
              <div className="vf-code-annotations">
                {p.annotations.map((a, j) => (
                  <div key={j} className="item">
                    <span className="num">{String(j + 1).padStart(2, "0")}</span>
                    <span className="text">{a}</span>
                  </div>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AnimSection() {
  const totalCycles = 32;
  const [cycle, setCycle] = useState(0);
  const [playing, setPlaying] = useState(false);
  const reqRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!playing) return;
    const step = (time: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      const delta = time - lastTimeRef.current;
      if (delta > 200) {
        setCycle((c) => (c + 1) % totalCycles);
        lastTimeRef.current = time;
      }
      reqRef.current = requestAnimationFrame(step);
    };
    reqRef.current = requestAnimationFrame(step);
    return () => {
      if (reqRef.current !== null) cancelAnimationFrame(reqRef.current);
      lastTimeRef.current = 0;
    };
  }, [playing]);

  const warpState = (warpId: number) => {
    const phase = (cycle + warpId * 4) % totalCycles;
    if (phase < 8) return "issue";
    if (phase < 16) return "execute";
    if (phase < 24) return "memory";
    return "stall";
  };

  const stateColor = (state: string) => {
    if (state === "issue") return "var(--lime)";
    if (state === "execute") return "var(--rose)";
    if (state === "memory") return "var(--violet)";
    return "var(--muted)";
  };

  const stateLabel: Record<string, string> = {
    issue: "ISSUE", execute: "EXEC", memory: "MEM", stall: "STALL",
  };

  const currentStep = cycle < 8
    ? "ISSUE: Scheduler picks a warp's instruction and sends it to the execution unit. One per cycle."
    : cycle < 16
    ? "EXECUTE: ALU or Tensor Core runs the instruction across 32 lanes. Single cycle."
    : cycle < 24
    ? "MEMORY: Waiting for global or shared memory. Hundreds of cycles. The scheduler runs other warps meanwhile."
    : "STALL: Memory dependency or sync causes a halt. Other warps advance if occupancy is high enough.";

  return (
    <section className="vf-section">
      <SectionHead
        label="SECTION 12 · ANIMATION"
        title={<>What do <em>4 warps</em> do inside an SM across 32 cycles?</>}
        note="Each warp cycles through four states: ISSUE → EXECUTE → MEMORY → STALL. The scheduler hides MEMORY/STALL by running other warps — this is 'latency hiding'."
      />
      <div className="vf-anim-stage">
        <div className="vf-anim-canvas">
          <svg viewBox="0 0 800 320" role="img" aria-label="Kernel execution animation">
            <rect x="0" y="0" width="800" height="320" fill="#fbf8f1" />
            <text x="400" y="22" className="die-label" textAnchor="middle" fill="var(--ink)">SM · 4 WARPS · 32 CYCLES</text>
            {Array.from({ length: 4 }).map((_, warpId) => (
              <g key={warpId} transform={`translate(40, ${60 + warpId * 60})`}>
                <text x="-10" y="14" className="label" textAnchor="end" fill="var(--ink)">W{warpId}</text>
                {Array.from({ length: totalCycles }).map((_, c) => {
                  const phase = (c + warpId * 4) % totalCycles;
                  let state = "stall";
                  if (phase < 8) state = "issue";
                  else if (phase < 16) state = "execute";
                  else if (phase < 24) state = "memory";
                  const isPast = c <= cycle;
                  return (
                    <rect
                      key={c}
                      x={c * 18}
                      y="0"
                      width="16"
                      height="34"
                      fill={stateColor(state)}
                      opacity={isPast ? 1 : 0.15}
                      stroke={c === cycle ? "var(--ink)" : "transparent"}
                      strokeWidth={c === cycle ? "2" : "0"}
                    />
                  );
                })}
              </g>
            ))}
            <line x1="40" y1="0" x2="40" y2="320" stroke="var(--muted)" strokeWidth="1" />
          </svg>
        </div>
        <div className="vf-anim-legend">
          <span className="item"><span className="swatch" style={{ background: "var(--lime)" }} /> ISSUE</span>
          <span className="item"><span className="swatch" style={{ background: "var(--rose)" }} /> EXECUTE</span>
          <span className="item"><span className="swatch" style={{ background: "var(--violet)" }} /> MEMORY</span>
          <span className="item"><span className="swatch" style={{ background: "var(--muted)" }} /> STALL</span>
          <span className="item">▮▮ PAST · ▯▯ FUTURE</span>
        </div>
        <div className="vf-anim-controls">
          <button onClick={() => setPlaying(!playing)} aria-pressed={playing}>
            {playing ? "⏸ PAUSE" : "▶ PLAY"}
          </button>
          <button onClick={() => setCycle((c) => (c - 1 + totalCycles) % totalCycles)} disabled={playing}>◀ STEP</button>
          <button onClick={() => setCycle((c) => (c + 1) % totalCycles)} disabled={playing}>STEP ▶</button>
          <button onClick={() => { setPlaying(false); setCycle(0); }}>↺ RESET</button>
          <div
            className="timeline"
            role="slider"
            tabIndex={0}
            aria-valuemin={0}
            aria-valuemax={totalCycles - 1}
            aria-valuenow={cycle}
            aria-label="Cycle scrubber"
            onClick={(e) => {
              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              setCycle(Math.floor(pct * totalCycles));
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                setCycle((c) => (c - 1 + totalCycles) % totalCycles);
              } else if (e.key === "ArrowRight") {
                e.preventDefault();
                setCycle((c) => (c + 1) % totalCycles);
              } else if (e.key === "Home") {
                e.preventDefault();
                setCycle(0);
              } else if (e.key === "End") {
                e.preventDefault();
                setCycle(totalCycles - 1);
              }
            }}
          >
            <i style={{ width: `${(cycle / (totalCycles - 1)) * 100}%` }} />
          </div>
          <span className="cycle">CYCLE {cycle + 1} / {totalCycles}</span>
        </div>
        <div className="vf-anim-step">
          <b>{stateLabel[warpState(0)]}:</b> {currentStep}
        </div>
      </div>
    </section>
  );
}

export default function VisualFoundationsEmbedded() {
  const [active, setActiveRaw] = useState<Section>("compare");
  const [visited, setVisitedRaw] = useState<Set<Section>>(() => new Set(["compare"]));
  const [bestScore, setBestScore] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = window.localStorage.getItem("vf-quiz-best");
      return saved ? Number(saved) : null;
    } catch {
      return null;
    }
  });

  const setActive = (next: Section) => {
    setActiveRaw(next);
    setVisitedRaw((prev) => {
      if (prev.has(next)) return prev;
      const nextSet = new Set(prev);
      nextSet.add(next);
      return nextSet;
    });
  };

  const handleScore = (score: number) => {
    setBestScore((prev) => {
      const next = prev === null ? score : Math.max(prev, score);
      if (typeof window !== "undefined") {
        try { window.localStorage.setItem("vf-quiz-best", String(next)); } catch { /* Device storage can be unavailable. */ }
      }
      return next;
    });
  };

  return (
    <section className="visual-foundations-embed" aria-label="Visual and lasting GPU learning laboratory">
      <Header active={active} setActive={setActive} visited={visited} />
      <div className="vf-page-shell">
        {active === "compare" && <CompareSection />}
        {active === "anatomy" && <AnatomySection />}
        {active === "lifecycle" && <LifecycleSection />}
        {active === "memory" && <MemorySection />}
        {active === "pitfalls" && <PitfallsSection />}
        {active === "quiz" && <QuizSection onScore={handleScore} />}
        {active === "map" && <MapSection />}
        {active === "recall" && <RecallSection />}
        {active === "glossary" && <GlossarySection />}
        {active === "cheat" && <CheatSection />}
        {active === "code" && <CodeSection />}
        {active === "anim" && <AnimSection />}
        <div className="vf-foot">
          <div>
            <b>Lasting-Learning Triangle</b>
            <p>Visual · Verbal · Retrieval. Applied together, knowledge lasts 5 years instead of 1.</p>
          </div>
          <div>
            <b>BEST SCORE · {bestScore ?? "—"} / 5</b>
            <p>Stored only on this device. Rises with practice.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
