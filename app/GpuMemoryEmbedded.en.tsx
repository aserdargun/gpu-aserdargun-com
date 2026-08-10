"use client";

import { useMemo, useState } from "react";

type ModuleId = "hierarchy" | "coalescing" | "banks" | "occupancy";

const modules: { id: ModuleId; number: string; label: string; short: string }[] = [
  { id: "hierarchy", number: "01", label: "Memory hierarchy", short: "Hierarchy" },
  { id: "coalescing", number: "02", label: "Coalescing", short: "Coalescing" },
  { id: "banks", number: "03", label: "Bank conflicts", short: "Bank conflicts" },
  { id: "occupancy", number: "04", label: "Occupancy", short: "Occupancy" },
];

const hierarchyLayers = [
  {
    id: "register",
    name: "Register",
    place: "On the SM",
    scope: "Single thread",
    speed: "Lowest latency",
    capacity: "Very small",
    color: "violet",
    note: "The compiler keeps scalars and short-lived intermediate values in registers. Using too many registers can reduce the number of resident warps. Spilled values move to local memory, which is physically backed by global memory.",
  },
  {
    id: "shared",
    name: "Shared memory / L1",
    place: "On the SM",
    scope: "Thread block",
    speed: "Very low latency",
    capacity: "Small, programmable",
    color: "blue",
    note: "This is an explicitly managed workspace shared by threads in a block. It can reduce global-memory traffic when data is reused, but synchronization, bank conflicts, and per-block capacity all have costs.",
  },
  {
    id: "l2",
    name: "L2 cache",
    place: "Shared by the whole GPU",
    scope: "All SMs",
    speed: "Medium latency",
    capacity: "MB scale",
    color: "cyan",
    note: "L2 caches global- and local-memory traffic across the GPU and can reuse data between SMs. Kernels do not allocate L2 directly; access patterns and the working set determine the hit rate.",
  },
  {
    id: "global",
    name: "Global memory",
    place: "GPU DRAM",
    scope: "Grid and host",
    speed: "High latency",
    capacity: "Largest",
    color: "orange",
    note: "This is the home of large tensors. Bandwidth is high, but individual accesses have high latency. Performance depends on coalescing, cache use, data reuse, and enough ready warps to hide latency.",
  },
  {
    id: "host",
    name: "Host/system memory",
    place: "CPU side",
    scope: "System",
    speed: "Limited by connection",
    capacity: "Very large",
    color: "slate",
    note: "For a discrete GPU, this memory sits behind PCIe or a similar link. Frequent host-memory access is expensive. Batched transfers, pinned memory, and overlapping copies with compute help manage this boundary.",
  },
] as const;

function Header({ active, setActive, visited }: { active: ModuleId; setActive: (id: ModuleId) => void; visited: Set<ModuleId> }) {
  return (
    <header className="topbar">
      <button className="brand" onClick={() => setActive("hierarchy")} aria-label="GPU Memory Lab home page">
        <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
        <span><strong>GPU MEMORY</strong><small>INTERACTIVE LAB</small></span>
      </button>
      <nav className="module-nav" aria-label="Course modules">
        {modules.map((module) => (
          <button
            key={module.id}
            className={active === module.id ? "active" : ""}
            onClick={() => setActive(module.id)}
            aria-current={active === module.id ? "page" : undefined}
          >
            <span>{module.number}</span>{module.short}
            {visited.has(module.id) && <b aria-label="visited">•</b>}
          </button>
        ))}
      </nav>
      <div className="course-meta">
        <span>{visited.size}/4 MODULES</span>
        <div className="progress-track" aria-label={`Progress: ${visited.size} / 4`}><i style={{ width: `${visited.size * 25}%` }} /></div>
      </div>
    </header>
  );
}

function ModuleIntro({ eyebrow, title, lead, children }: { eyebrow: string; title: string; lead: string; children: React.ReactNode }) {
  return (
    <aside className="lesson-copy">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="lead">{lead}</p>
      </div>
      {children}
    </aside>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="fact"><span>{label}</span><p>{children}</p></div>;
}

function HierarchyLab() {
  const [selected, setSelected] = useState<(typeof hierarchyLayers)[number]["id"]>("shared");
  const current = hierarchyLayers.find((layer) => layer.id === selected)!;
  return (
    <section className="module-layout">
      <ModuleIntro eyebrow="MODULE 01 · WHERE IS THE DATA?" title="Memory hierarchy" lead="Much of GPU performance comes not from arithmetic, but from moving data to the right place at the right time.">
        <Fact label="MAIN IDEA">Fast layers are small and local; large layers are remote and shared. Kernel design moves reused data closer.</Fact>
        <Fact label="FALSE INTUITION">“Shared memory always speeds up” is not true. If there is no reuse, the cost of copying and barrier may wipe out the gain.</Fact>
        <div className="code-note"><span>bus</span><code>DRAM → L2 → L1/shared → register → ALU</code></div>
      </ModuleIntro>
      <div className="lab-surface hierarchy-lab">
        <div className="surface-heading">
          <div><span>INTERACTIVE MAP</span><h2>Choose a tier, see its cost</h2></div>
          <div className="direction-key"><span>SPEED</span><i /><span>CAPACITY</span></div>
        </div>
        <div className="hierarchy-stack">
          {hierarchyLayers.map((layer, index) => (
            <button
              key={layer.id}
              className={`memory-layer ${layer.color} ${selected === layer.id ? "selected" : ""}`}
              style={{ width: `${52 + index * 12}%` }}
              onClick={() => setSelected(layer.id)}
              aria-pressed={selected === layer.id}
            >
              <span className="layer-index">L.{index}</span>
              <strong>{layer.name}</strong>
              <small>{layer.scope}</small>
              <i aria-hidden="true" />
            </button>
          ))}
        </div>
        <div className="selected-detail" aria-live="polite">
          <div className={`detail-index ${current.color}`}>{String(hierarchyLayers.findIndex((l) => l.id === current.id)).padStart(2, "0")}</div>
          <div><span>SELECTED LAYER</span><h3>{current.name}</h3><p>{current.note}</p></div>
          <dl>
            <div><dt>Location</dt><dd>{current.place}</dd></div>
            <div><dt>Delay</dt><dd>{current.speed}</dd></div>
            <div><dt>Capacity</dt><dd>{current.capacity}</dd></div>
          </dl>
        </div>
      </div>
    </section>
  );
}

const accessPatterns = {
  aligned: { label: "Consecutive", sub: "addr = lane × 4", address: (lane: number) => lane * 4 },
  offset: { label: "+4 bytes offset", sub: "addr = lane × 4 + 4", address: (lane: number) => lane * 4 + 4 },
  stride2: { label: "Stride 2", sub: "addr = lane × 8", address: (lane: number) => lane * 8 },
  stride8: { label: "Stride 8", sub: "addr = lane × 32", address: (lane: number) => lane * 32 },
} as const;

type AccessPattern = keyof typeof accessPatterns;

function CoalescingLab() {
  const [pattern, setPattern] = useState<AccessPattern>("aligned");
  const result = useMemo(() => {
    const addresses = Array.from({ length: 32 }, (_, lane) => accessPatterns[pattern].address(lane));
    const sectors = Array.from(new Set(addresses.map((address) => Math.floor(address / 32))));
    return { addresses, sectors, efficiency: Math.round((128 / (sectors.length * 32)) * 100) };
  }, [pattern]);
  const rating = result.efficiency === 100 ? "Ideal" : result.efficiency >= 50 ? "Partial" : "Messy";
  return (
    <section className="module-layout">
      <ModuleIntro eyebrow="MODULE 02 · GLOBAL MEMORY" title="Coalescing" lead="When a warp's 32 threads access nearby addresses, the hardware combines these requests into a small number of memory operations.">
        <Fact label="MODEL">Each thread reads one <code>float</code> (4 bytes). For compute capability 6.0 and later, the visualization groups accesses into required 32-byte sectors.</Fact>
        <Fact label="WHY IS IT IMPORTANT?">While the required 128 bytes remains the same, the number of sectors moved may grow. Unused bytes consume bandwidth.</Fact>
        <div className="formula"><span>Utility</span><strong>requested byte / moved byte</strong></div>
      </ModuleIntro>
      <div className="lab-surface coalescing-lab">
        <div className="surface-heading">
          <div><span>WARP ACCESS SIMULATOR</span><h2>32 threads, how many memory operations?</h2></div>
          <div className={`result-stamp ${result.efficiency === 100 ? "good" : result.efficiency >= 50 ? "mid" : "bad"}`}><strong>{result.efficiency}%</strong><span>{rating}</span></div>
        </div>
        <div className="segmented-control" role="group" aria-label="Access pattern">
          {(Object.keys(accessPatterns) as AccessPattern[]).map((key) => (
            <button key={key} className={pattern === key ? "active" : ""} onClick={() => setPattern(key)} aria-pressed={pattern === key}>
              <strong>{accessPatterns[key].label}</strong><small>{accessPatterns[key].sub}</small>
            </button>
          ))}
        </div>
        <div className="sim-label"><span>WARP · 32 THREAD</span><span>Each frame is 4-byte <code>float</code> access</span></div>
        <div className="lane-grid">
          {result.addresses.map((address, lane) => <div key={lane} className="lane" title={`Thread ${lane}: byte ${address}`}><span>T{String(lane).padStart(2, "0")}</span><strong>{address}</strong></div>)}
        </div>
        <div className="transaction-map">
          <div className="transaction-summary"><span>MEMORY SECTORS</span><strong>{result.sectors.length} ×32B</strong><small>{result.sectors.length * 32} bytes moved · 128 bytes requested</small></div>
          <div className="sector-strip" aria-label={`${result.sectors.length} memory sectors in use`}>
            {Array.from({ length: Math.min(32, Math.max(...result.sectors) + 1) }, (_, sector) => (
              <div key={sector} className={result.sectors.includes(sector) ? "used" : ""}><span>{sector}</span></div>
            ))}
          </div>
        </div>
        <p className="lab-caption"><b>Read:</b> {pattern === "aligned" ? "32 consecutive floats fit into exactly four sectors. This is classic coalesced access." : pattern === "offset" ? "Shifting by just 4 bytes spreads the access across five sectors. Adjacent warps may reuse some cache lines, but the first access still requires an extra sector." : pattern === "stride2" ? "Reading every second float uses only half the bytes in each sector, so the transaction count doubles." : "Each thread lands in a different 32-byte sector. Moving 128 bytes of useful data creates 1 KB of traffic, reducing useful bandwidth to one-eighth."}</p>
      </div>
    </section>
  );
}

type BankPattern = "1" | "2" | "4" | "8" | "16" | "32" | "broadcast";

function BankConflictLab() {
  const [pattern, setPattern] = useState<BankPattern>("1");
  const result = useMemo(() => {
    const addresses = Array.from({ length: 32 }, (_, lane) => pattern === "broadcast" ? 0 : lane * Number(pattern));
    const banks = addresses.map((word) => word % 32);
    const counts = Array.from({ length: 32 }, (_, bank) => banks.filter((value) => value === bank).length);
    const degree = pattern === "broadcast" ? 1 : Math.max(...counts);
    return { addresses, banks, counts, degree };
  }, [pattern]);
  return (
    <section className="module-layout">
      <ModuleIntro eyebrow="MODULE 03 · SHARED MEMORY" title="Bank conflict" lead="Shared memory is divided into 32 independent banks. If the same warp is stacked in the same bank with different addresses, the requests become serialized.">
        <Fact label="MATCHING RULE">Simplified mapping for 32-bit words: <code>bank = word_index mod 32</code>.</Fact>
        <Fact label="SPECIAL CASE">If more than one thread reads the same address, broadcast is made instead of conflict. Same bank but different addresses is a conflict.</Fact>
        <div className="code-note"><span>Classic solution</span><code>tile[32][32] → tile[32][33]</code></div>
      </ModuleIntro>
      <div className="lab-surface banks-lab">
        <div className="surface-heading">
          <div><span>BANK-MAPPING EXPERIMENT</span><h2>How do banks fill as stride changes?</h2></div>
          <div className={`result-stamp ${result.degree === 1 ? "good" : result.degree <= 4 ? "mid" : "bad"}`}><strong>{result.degree}×</strong><span>{pattern === "broadcast" ? "Broadcast" : result.degree === 1 ? "conflict free" : "serialization"}</span></div>
        </div>
        <div className="stride-control" role="group" aria-label="Shared memory access stride value">
          {(["1", "2", "4", "8", "16", "32", "broadcast"] as BankPattern[]).map((value) => <button key={value} onClick={() => setPattern(value)} className={pattern === value ? "active" : ""} aria-pressed={pattern === value}>{value === "broadcast" ? "same address" : `Stride ${value}`}</button>)}
        </div>
        <div className="mapping-equation"><span>THREAD <b>t</b></span><i>→</i><code>word[{pattern === "broadcast" ? "0" : `t × ${pattern}`}]</code><i>→</i><span>BENCH <b>{pattern === "broadcast" ? "0" : `(t × ${pattern}) % 32`}</b></span></div>
        <div className="bank-grid" aria-label="32 shared memory bank occupancy map">
          {result.counts.map((count, bank) => (
            <div key={bank} className={count === 0 ? "empty" : count === 1 ? "single" : count <= 4 ? "warm" : "hot"}>
              <span>B.{String(bank).padStart(2, "0")}</span>
              <strong>{count || "·"}</strong>
              {count > 0 && <small>{count === 1 ? `T${String(result.banks.indexOf(bank)).padStart(2, "0")}` : `${count} thread`}</small>}
            </div>
          ))}
        </div>
        <div className="bank-explanation">
          <div><span>ACTIVE BANK</span><strong>{result.counts.filter(Boolean).length} / 32</strong></div>
          <p>{pattern === "broadcast" ? "All threads read the same word: hardware broadcasts the value across the warp, so no bank conflict occurs." : result.degree === 1 ? "Each thread maps to a separate bank. The warp request can be served in parallel." : `Each active bank receives ${result.degree} distinct address requests. Hardware splits the access into roughly ${result.degree} conflict-free steps.`}</p>
        </div>
      </div>
    </section>
  );
}

function Slider({ label, value, min, max, step, unit, onChange }: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (value: number) => void }) {
  const percent = ((value - min) / (max - min)) * 100;
  return (
    <div className="slider-row">
      <span><strong>{label}</strong><output>{value}{unit}</output></span>
      <input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} style={{ "--value": `${percent}%` } as React.CSSProperties} />
      <small><i>{min}{unit}</i><i>{max}{unit}</i></small>
    </div>
  );
}

function OccupancyLab() {
  const [threads, setThreads] = useState(256);
  const [registers, setRegisters] = useState(32);
  const [shared, setShared] = useState(16);
  const result = useMemo(() => {
    const warpsPerBlock = Math.ceil(threads / 32);
    const limits = {
      Threads: Math.floor(1536 / threads),
      Register: Math.floor(65536 / (threads * registers)),
      Shared: shared === 0 ? 24 : Math.floor(100 / shared),
      "block limit": 24,
    };
    const activeBlocks = Math.max(0, Math.min(...Object.values(limits)));
    const activeWarps = Math.min(48, activeBlocks * warpsPerBlock);
    const occupancy = Math.round((activeWarps / 48) * 100);
    const minLimit = Math.min(...Object.values(limits));
    const bottlenecks = Object.entries(limits).filter(([, value]) => value === minLimit).map(([key]) => key);
    return { warpsPerBlock, limits, activeBlocks, activeWarps, occupancy, bottlenecks };
  }, [threads, registers, shared]);
  return (
    <section className="module-layout">
      <ModuleIntro eyebrow="MODULE 04 · HIDING LATENCY" title="Occupancy" lead="Occupancy is the ratio of active warps on an SM to the maximum number of active warps supported by the hardware.">
        <Fact label="NOT THE PURPOSE, BUT A TOOL">More ready warps can hide memory latency. But higher occupancy alone is not a guarantee of higher performance.</Fact>
        <Fact label="LIMITING RESOURCES">Block size, registers per thread, shared memory per block, and the architectural block limit together determine how many blocks can reside on an SM.</Fact>
        <div className="model-note"><span>TEACHING MODEL</span><p>1 SM · 1,536 threads · 48 warps · 65,536 registers · 100 KB shared · 24 blocks. Allocation roundings are not taken into account.</p></div>
      </ModuleIntro>
      <div className="lab-surface occupancy-lab">
        <div className="surface-heading">
          <div><span>RESOURCE CALCULATOR</span><h2>Change kernel configuration</h2></div>
          <div className={`occupancy-ring ${result.occupancy >= 75 ? "good" : result.occupancy >= 40 ? "mid" : "bad"}`} style={{ "--occ": `${result.occupancy * 3.6}deg` } as React.CSSProperties}><div><strong>{result.occupancy}%</strong><span>OCCUPANCY</span></div></div>
        </div>
        <div className="occupancy-body">
          <div className="controls-panel">
            <Slider label="Thread/block" value={threads} min={32} max={1024} step={32} unit="" onChange={setThreads} />
            <Slider label="Register/thread" value={registers} min={8} max={128} step={8} unit="" onChange={setRegisters} />
            <Slider label="Shared memory/block" value={shared} min={0} max={100} step={4} unit=" KB" onChange={setShared} />
          </div>
          <div className="sm-visual">
            <div className="sm-label"><span>STREAMING MULTIPROCESSOR</span><strong>{result.activeBlocks} active block · {result.activeWarps} active warp</strong></div>
            <div className="block-slots">
              {Array.from({ length: 12 }, (_, index) => <div key={index} className={index < Math.min(result.activeBlocks, 12) ? "filled" : ""}><span>{index < result.activeBlocks ? `B${index}` : ""}</span></div>)}
            </div>
            {result.activeBlocks > 12 && <p className="more-blocks">+ {result.activeBlocks - 12} block more</p>}
          </div>
        </div>
        <div className="limit-table">
          {Object.entries(result.limits).map(([name, limit]) => (
            <div key={name} className={result.bottlenecks.includes(name) ? "limiting" : ""}><span>{name}</span><strong>{limit} block</strong><i>{result.bottlenecks.includes(name) ? "LIMITING" : ""}</i></div>
          ))}
        </div>
        <p className="lab-caption"><b>Interpretation:</b> This configuration is limited by <strong>{result.bottlenecks.join(" + ")}</strong>. {result.occupancy === 100 ? "All theoretical warp slots are occupied; now verify real performance with a profiler." : result.occupancy === 0 ? "Not even one block fits in the resource pool; the configuration is invalid." : "You can raise occupancy by reducing the limiting resource, but register spills or less data reuse may still hurt performance."}</p>
      </div>
    </section>
  );
}

export default function GpuMemoryEmbedded() {
  const [active, setActiveState] = useState<ModuleId>("hierarchy");
  const [visited, setVisited] = useState<Set<ModuleId>>(new Set(["hierarchy"]));
  const setActive = (id: ModuleId) => { setActiveState(id); setVisited((previous) => new Set(previous).add(id)); };
  return (
    <main className="gpu-memory-embed">
      <Header active={active} setActive={setActive} visited={visited} />
      <div className="page-shell">
        {active === "hierarchy" && <HierarchyLab />}
        {active === "coalescing" && <CoalescingLab />}
        {active === "banks" && <BankConflictLab />}
        {active === "occupancy" && <OccupancyLab />}
      </div>
      <footer>
        <span>GPU Memory Interactive Lab</span>
        <p>These simulations support conceptual learning; measure the real kernel on actual hardware.</p>
        <div><a href="https://docs.nvidia.com/cuda/cuda-programming-guide/02-basics/writing-cuda-kernels.html#memory-performance" target="_blank" rel="noreferrer">CUDA Programming Guide ↗</a><a href="https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/" target="_blank" rel="noreferrer">Best Practices ↗</a></div>
      </footer>
    </main>
  );
}
