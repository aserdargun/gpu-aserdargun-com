"use client";

import { useMemo, useState } from "react";

type Tab = "overview" | "architecture" | "simt" | "memory" | "lab" | "latency" | "occupancy" | "quiz";
type ArchLevel = "grid" | "block" | "warp" | "thread" | "instruction";
type MemoryLevel = "register" | "shared" | "l2" | "global";
type Predicate = "cutoff" | "even" | "quarter" | "uniform";
type Pattern = "contiguous" | "stride2" | "stride4" | "broadcast";

const tabs: { id: Tab; label: string }[] = [
  { id: "overview", label: "1 · Big picture" },
  { id: "architecture", label: "2 · Hierarchy" },
  { id: "simt", label: "3 SIMT" },
  { id: "memory", label: "4 Memory" },
  { id: "lab", label: "5 · Kernel Lab" },
  { id: "latency", label: "6 · Latency hiding" },
  { id: "occupancy", label: "7 · Occupancy" },
  { id: "quiz", label: "8 · Quiz" },
];

const archData: Record<ArchLevel, { label: string; code: string; title: string; body: string; owner: string; sharing: string; result: string }> = {
  grid: {
    label: "Grid", code: "kernel launch", title: "Grid · entire problem space",
    body: "They are all thread blocks of a kernel launch. Blocks are distributed in waves to appropriate SMs.",
    owner: "Kernel launch on the host side", sharing: "Blocks can communicate through global memory, but a normal kernel has no grid-wide barrier.",
    result: "Don't rely on block order; blocks can run in any order.",
  },
  block: {
    label: "Block", code: "blockIdx", title: "Block collaboration and resource allocation",
    body: "It is a group of threads that are scheduled together. A block remains in a single SM for its lifetime and is divided into warps.",
    owner: "Grid scheduler → a suitable SM", sharing: "The same block threads can use shared memory and create a barrier with __syncthreads().",
    result: "If register or shared memory consumption increases, the number of blocks that can live simultaneously in the same SM may decrease.",
  },
  warp: {
    label: "Warp", code: "32 threads", title: "Warp · basic issue / schedule group",
    body: "It consists of 32 consecutive threads. The scheduler tries to hide memory and pipeline waits by issuing instructions from ready warps.",
    owner: "SM warp scheduler", sharing: "Lanes can share register data with warp-level primitives; Active mask is important.",
    result: "Branch decomposition within the same warp can serialize paths with masks.",
  },
  thread: {
    label: "Thread", code: "threadIdx", title: "Thread · individual program state",
    body: "It has its own indexes, registers, and local data while running the same kernel code on different inputs.",
    owner: "Lane ID within a warp", sharing: "Registers are private to the thread; shared memory is scoped to the block, while global memory is scoped to the device.",
    result: "A thread is a logical program instance, not a permanent physical CUDA core.",
  },
  instruction: {
    label: "Instruction", code: "lane op", title: "Instruction · execution pipeline job",
    body: "The warp instruction is issued to the appropriate FP/INT, load-store, special function or tensor pipelines.",
    owner: "Warp scheduler + dispatch", sharing: "The active lane mask determines which threads write results.",
    result: "Throughput is shaped by the instruction mix, dependencies, ready warps, and execution-unit capacity.",
  },
};

const memoryData: Record<MemoryLevel, { title: string; scope: string; body: string; risk: string }> = {
  register: { title: "Registers", scope: "Thread", body: "Private workspace for each thread. Latency is very low and bandwidth is high, but the total budget per SM is limited.", risk: "Register pressure may reduce occupancy. If registers spill, local memory uses the global-memory path." },
  shared: { title: "Shared memory / L1", scope: "Block/SM", body: "An on-chip resource. Shared memory is managed explicitly for block-level reuse; L1 access is managed by hardware.", risk: "Bank conflicts can serialize access; high allocation may reduce the number of resident blocks." },
  l2: { title: "L2 cache", scope: "Device", body: "A device-level cache shared by all SMs that can reduce global-memory traffic.", risk: "If the working set is large or access is irregular, the hit rate may decrease." },
  global: { title: "Global memory", scope: "Device", body: "High-capacity GDDR/HBM with high latency and high bandwidth for regular, parallel access.", risk: "If coalescing is poor, too many sectors are moved for little useful data." },
};

const phases = ["Predicate", "PathA", "PathB", "Reconverge"];

const simtVsSimd = [
  ["Execution model", "Lockstep: all lanes perform the same operation at once", "Independent thread states: each lane advances with its own registers and flow"],
  ["Program counter", "The whole vector shares a single PC", "Each thread has its own program counter"],
  ["Divergence", "The whole vector takes the same path; no divergence", "Paths are serialized per-lane with masks"],
  ["Width", "Fixed vector width (e.g. 4/8/16 elements)", "32-lane warp (hardware unit)"],
  ["Hardware", "CPU vector unit (AVX/NEON)", "GPU SM + warp scheduler"],
  ["Goal", "Data parallelism within a single core", "Throughput across thousands of threads"],
];

type QuizQuestion = { q: string; options: string[]; answer: number; explain: string };

const quizQuestions: QuizQuestion[] = [
  { q: "How many threads make up a warp?", options: ["8", "16", "32", "64"], answer: 2, explain: "A warp is the basic issue/scheduling unit of 32 consecutive threads." },
  { q: "What happens when lanes in the same warp take different branches?", options: ["Nothing; they run in parallel", "Paths are serialized with masks (divergence)", "The kernel errors out", "Only the first lane runs"], answer: 1, explain: "The warp runs path A with the A-mask, then path B with the B-mask; masked lanes write no results." },
  { q: "What is the key difference between SIMT and SIMD?", options: ["SIMT is faster", "In SIMT each thread has independent program state", "SIMD only runs on GPUs", "There is no difference"], answer: 1, explain: "In SIMT each lane has its own registers and program counter; SIMD shares a single PC in lockstep." },
  { q: "How is the global thread index computed?", options: ["i = threadIdx.x", "i = blockIdx.x", "i = blockIdx.x * blockDim.x + threadIdx.x", "i = blockIdx.x + threadIdx.x"], answer: 2, explain: "blockIdx.x * blockDim.x + threadIdx.x is the thread's unique index across the whole grid." },
  { q: "Why is the boundary check (if (i < N)) needed in the last block?", options: ["To improve performance", "N may not be a multiple of the block size; extra threads would write out of bounds", "The compiler requires it", "It is not needed"], answer: 1, explain: "It prevents extra threads from writing past the array bounds." },
  { q: "What hides memory latency?", options: ["Faster memory", "Enough ready warps (occupancy)", "Fewer threads", "Larger blocks"], answer: 1, explain: "While one warp waits on memory, the scheduler switches to another ready warp; without enough warps the SM idles." },
  { q: "What determines occupancy?", options: ["Only the thread count", "The most constrained resource (register/shared/thread/block)", "Only the register count", "GPU temperature"], answer: 1, explain: "Occupancy is set by the most constrained resource." },
  { q: "What is coalescing?", options: ["Neighboring lanes accessing neighboring addresses", "Threads running different kernels", "Memory cleanup", "Register sharing"], answer: 0, explain: "Neighboring lane → neighboring address; access is gathered into 32B sectors, reducing wasted traffic." },
];

export default function CudaSimtEmbedded() {
  const [tab, setTab] = useState<Tab>("overview");
  const [arch, setArch] = useState<ArchLevel>("grid");
  const [memory, setMemory] = useState<MemoryLevel>("register");
  const [predicate, setPredicate] = useState<Predicate>("cutoff");
  const [cutoff, setCutoff] = useState(16);
  const [phase, setPhase] = useState(0);
  const [selectedLane, setSelectedLane] = useState(0);
  const [pattern, setPattern] = useState<Pattern>("contiguous");
  const [n, setN] = useState(1000);
  const [blockSize, setBlockSize] = useState(256);
  const [smCount, setSmCount] = useState(4);
  const [warps, setWarps] = useState(4);
  const [latency, setLatency] = useState(80);
  const [computeCycles, setComputeCycles] = useState(8);
  const [occBlockSize, setOccBlockSize] = useState(256);
  const [regsPerThread, setRegsPerThread] = useState(32);
  const [sharedPerBlock, setSharedPerBlock] = useState(0);

  const laneTakesA = (lane: number) => {
    if (predicate === "cutoff") return lane < cutoff;
    if (predicate === "even") return lane % 2 === 0;
    if (predicate === "quarter") return lane % 4 === 0;
    return true;
  };
  const aCount = Array.from({ length: 32 }, (_, lane) => laneTakesA(lane)).filter(Boolean).length;
  const serialPaths = aCount > 0 && aCount < 32 ? 2 : 1;

  const addresses = useMemo(() => {
    if (pattern === "stride2") return Array.from({ length: 32 }, (_, lane) => lane * 2);
    if (pattern === "stride4") return Array.from({ length: 32 }, (_, lane) => lane * 4);
    if (pattern === "broadcast") return Array(32).fill(0);
    return Array.from({ length: 32 }, (_, lane) => lane);
  }, [pattern]);
  const sectors = useMemo(() => [...new Set(addresses.map((address) => Math.floor(address / 8)))], [addresses]);

  const blocks = Math.ceil(n / blockSize);
  const warpsPerBlock = Math.ceil(blockSize / 32);
  const totalWarps = blocks * warpsPerBlock;
  const extraThreads = blocks * blockSize - n;
  const validThreadsInLastBlock = n - (blocks - 1) * blockSize;
  const lastWarpStart = (warpsPerBlock - 1) * 32;
  const lastWarpActive = Math.max(0, Math.min(32, validThreadsInLastBlock - lastWarpStart));

  const period = computeCycles + latency;
  const neededWarps = Math.ceil(period / computeCycles);
  const utilization = Math.min(1, (warps * computeCycles) / period);
  const warpComputing = (warp: number, t: number) => {
    const s = ((t - warp * computeCycles) % period + period) % period;
    return s < computeCycles;
  };
  const smBusy = (t: number) => Array.from({ length: warps }, (_, w) => warpComputing(w, t)).some(Boolean);

  const occWarpsPerBlock = Math.ceil(occBlockSize / 32);
  const blocksByThreads = Math.floor(2048 / occBlockSize);
  const regsPerBlock = regsPerThread * occBlockSize;
  const blocksByRegs = Math.floor(65536 / regsPerBlock);
  const sharedBytes = sharedPerBlock * 1024;
  const blocksByShared = sharedBytes === 0 ? 32 : Math.floor(49152 / sharedBytes);
  const blocksPerSM = Math.min(blocksByThreads, blocksByRegs, blocksByShared, 32);
  const warpsPerSM = blocksPerSM * occWarpsPerBlock;
  const occupancy = warpsPerSM / 64;
  const occLimits = [
    { name: "Thread limit", detail: "2048 / " + occBlockSize, blocks: blocksByThreads },
    { name: "Register limit", detail: "65536 / (" + regsPerThread + " × " + occBlockSize + ")", blocks: blocksByRegs },
    { name: "Shared memory", detail: sharedBytes === 0 ? "not used" : "49152 / " + sharedBytes, blocks: blocksByShared },
    { name: "Block limit", detail: "32", blocks: 32 },
  ];
  const occMinBlocks = Math.min(...occLimits.map((l) => l.blocks));

  return (
    <main className="cuda-simt-embed atlas-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">INTERACTIVE GPU MENTAL MODEL</p>
          <h1>Computer Architecture <span>→</span> SIMT <span>→</span> CUDA</h1>
          <p className="hero-copy">The journey of a kernel call from the CPU to warp, memory and the SM scheduler.</p>
        </div>
        <div className="hero-chip" aria-label="Learning route">
          <span>HOST</span><i>→</i><span>GRID</span><i>→</i><span>WARP</span><i>→</i><span>LANE</span>
        </div>
      </header>

      <div className="tabs" role="tablist" aria-label="CUDA learning sections">
        {tabs.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)}>{item.label}</button>
        ))}
      </div>

      {tab === "overview" && (
        <section className="panel-stack" role="tabpanel">
          <SectionHead title="Heterogeneous system: CPU control, GPU parallelism" subtitle="Host code launches the kernel; device code runs across thousands of threads." badge="Host + Device" />
          <div className="flow" aria-label="Execution flow from CPU to GPU">
            <FlowNode tone="blue" title="CPU Host" copy="Serial control, I/O, kernel launch, memory orchestration" />
            <b aria-hidden>→</b>
            <FlowNode tone="amber" title="CUDA Runtime + Driver" copy="Grid configuration, command queue, data movement" />
            <b aria-hidden>→</b>
            <FlowNode tone="cyan" title="GPU Device" copy="SMs, warp schedulers, execution units, GDDR/HBM" />
          </div>
          <div className="launch-strip">
            {[ ["Allocate", "Allocate device memory"], ["Copy H→D", "Move input to GPU"], ["Launch", "<<<grid, block>>>"], ["Execute", "Grid → block → warp"], ["Copy D→H", "Get the result to CPU"] ].map(([title, copy], index) => (
              <div className="launch-step" key={title}><em>{index + 1}</em><div><strong>{title}</strong><span>{copy}</span></div></div>
            ))}
          </div>
          <div className="compare-grid">
            <Compare title="CPU design priority" rows={[["Aim", "low latency"], ["Sunflower seed", "Few, complex"], ["Control", "Branch prediction + out-of-order"], ["ideal job", "Serial stream, irregular control, OS / I/O"]]} />
            <Compare title="GPU design priority" rows={[["Aim", "high throughput"], ["Sunflower seed", "Large number of parallel execution resources"], ["Control", "Latency hiding with warp multiplicity"], ["ideal job", "Regular, data-parallel, arithmetic intensive"]]} />
          </div>
          <Lesson title="Main distinction" copy="A CPU is optimized to finish a small number of tasks quickly, while a GPU is optimized to run many similar tasks together." />
        </section>
      )}

      {tab === "architecture" && (
        <section className="panel-stack" role="tabpanel">
          <SectionHead title="How does the programming hierarchy map to hardware?" subtitle="Select a level to inspect its scope, work unit, and hardware counterpart." badge={`Selected: ${archData[arch].label}`} />
          <div className="arch-layout">
            <div className="choice-rail">
              {(Object.keys(archData) as ArchLevel[]).map((key) => <button key={key} type="button" aria-pressed={arch === key} onClick={() => setArch(key)}><span>{archData[key].label}</span><code>{archData[key].code}</code></button>)}
            </div>
            <div className="arch-stage">
              <div className="hierarchy">
                {(Object.keys(archData) as ArchLevel[]).map((key) => <div className={arch === key ? "hier-node active" : "hier-node"} key={key}><strong>{archData[key].label}</strong><span>{archData[key].code}</span></div>)}
              </div>
              <div className="mapping-grid">
                <Fact label="Grid" value="All GPU / multiple SM" />
                <Fact label="Block" value="Single SM; does not migrate until it is finished" />
                <Fact label="Warp" value="SM warp scheduler" />
                <Fact label="Thread" value="Register status + lane" />
              </div>
              <DetailCard title={archData[arch].title} body={archData[arch].body} facts={[["Who governs?", archData[arch].owner], ["sharing", archData[arch].sharing], ["important result", archData[arch].result]]} />
            </div>
          </div>
          <Lesson title="Wrong mental model" copy="A CUDA core is not a single thread throughout its life. Warp instructions are issued to execution units throughout the cycles; Thread state is maintained in registers." />
        </section>
      )}

      {tab === "simt" && (
        <section className="panel-stack" role="tabpanel">
          <SectionHead title="SIMT: single instruction, 32 independent thread states" subtitle="Each lane has different data and register status; warp issues the common instruction stream." badge="Warp = 32 threads" />
          <div className="controls">
            <label>Predicate<select value={predicate} onChange={(e) => { setPredicate(e.target.value as Predicate); setPhase(0); }}><option value="cutoff">lane &lt; threshold</option><option value="even">lane %2 == 0</option><option value="quarter">lane% 4 == 0</option><option value="uniform">all lanes true</option></select></label>
            {predicate === "cutoff" && <label>Threshold: <strong>{cutoff}</strong><input type="range" min="1" max="31" value={cutoff} onChange={(e) => { setCutoff(Number(e.target.value)); setPhase(0); }} /></label>}
            <button className="primary" type="button" onClick={() => setPhase((phase + 1) % phases.length)}>Next stage →</button>
          </div>
          <div className="simt-layout">
            <div className="warp-stage">
              <div className="stage-title"><strong>Warp 0 · lane 0…31</strong><b>{phases[phase]}</b></div>
              <div className="lane-grid">
                {Array.from({ length: 32 }, (_, lane) => {
                  const pathA = laneTakesA(lane);
                  const masked = (phase === 1 && !pathA) || (phase === 2 && pathA);
                  return <button type="button" key={lane} onClick={() => setSelectedLane(lane)} className={`lane ${pathA ? "path-a" : "path-b"} ${masked ? "masked" : ""} ${selectedLane === lane ? "selected" : ""}`} aria-label={`Lane ${lane}, ${pathA ? "PathA" : "PathB"}`}>{lane}</button>;
                })}
              </div>
              <div className="path-strip"><Path title="Path A · if" value={`${aCount} active lanes`} tone="blue" /><Path title="Path B · else" value={`${32 - aCount} active lanes`} tone="amber" /><Path title="Reconverge" value="Warp reconverges" tone="cyan" /></div>
            </div>
            <DetailCard title="Divergence cost" body={serialPaths === 1 ? "Since all active lanes take the same path, warp-level branch divergence does not occur." : "Warp first executes path A with A-mask, then path B with B-mask. Masked lanes produce no results."} facts={[["PathA", `${aCount} / 32`], ["PathB", `${32 - aCount} / 32`], ["serial buses", String(serialPaths)], ["Selected lane", `Lane ${selectedLane} → ${laneTakesA(selectedLane) ? "PathA" : "PathB"}`]]} />
          </div>
          <SimtVsSimd title="SIMD and SIMT are not the same thing" rows={simtVsSimd} />
          <Lesson title="critical limit" copy="Different warps taking different branches is not divergence. The cost is incurred by the separation of lanes within the same warp." />
        </section>
      )}

      {tab === "memory" && (
        <section className="panel-stack" role="tabpanel">
          <SectionHead title="Memory hierarchy + coalescing" subtitle="Scope, capacity, access pattern and reuse are as important as speed." badge="Near → far" />
          <div className="memory-layout">
            <div className="memory-stack">
              {(Object.keys(memoryData) as MemoryLevel[]).map((key) => <button type="button" key={key} aria-pressed={memory === key} onClick={() => setMemory(key)}><span>{memoryData[key].title}</span><small>{memoryData[key].scope}</small></button>)}
              <DetailCard title={memoryData[memory].title} body={memoryData[memory].body} facts={[["living space", memoryData[memory].scope], ["Risk", memoryData[memory].risk]]} />
            </div>
            <div className="coalesce-stage">
              <label className="select-label">Warp access pattern<select value={pattern} onChange={(e) => setPattern(e.target.value as Pattern)}><option value="contiguous">Sequential: base + lane</option><option value="stride2">Stride 2: base + 2×lane</option><option value="stride4">Stride 4: base + 4×lane</option><option value="broadcast">Broadcast: entire lane → base</option></select></label>
              <div className="stats"><Stat label="Element" value="4 B int" /><Stat label="Sector touched" value={`${sectors.length} × 32 B`} /><Stat label="Address propagation" value={`${Math.min(...addresses)}…${Math.max(...addresses)}`} /></div>
              <div><h3>Lane → element index</h3><div className="address-grid">{addresses.map((address, lane) => <div key={lane}><strong>{lane}</strong><span>→{address}</span></div>)}</div></div>
              <div><h3>32 B sector view</h3><div className="sector-grid">{Array.from({ length: Math.min(Math.max(...sectors) + 1, 16) }, (_, sector) => <div key={sector} className={sectors.includes(sector) ? "hit" : ""}>S.{sector}</div>)}</div></div>
              <p className="muted">{pattern === "contiguous" ? "Aligned sequential access collects 128 B data in 4 sectors." : pattern === "stride2" ? "Stride 2 spreads access across 8 sectors; About half of the sectors remain unused." : pattern === "stride4" ? "Stride 4 spreads access across 16 sectors; useful data per sector decreases." : "All lanes target the same word; cache/broadcast behavior can reduce duplication."}</p>
            </div>
          </div>
          <Lesson title="Limit of the model" copy="This view is simplified to teach aligned 4B access and 32B sectors; actual traffic may vary depending on cache status and GPU generation." />
        </section>
      )}

      {tab === "lab" && (
        <section className="panel-stack" role="tabpanel">
          <SectionHead title="Kernel Lab: convert problem size to grid" subtitle="1D example: each thread processes one element; Boundary control keeps the last block safe." badge="i = blockIdx.x × blockDim.x + threadIdx.x" />
          <div className="lab-layout">
            <div className="lab-controls">
              <Range label="Problem size N" value={n} min={1} max={4096} onChange={setN} />
              <Range label="Block size" value={blockSize} suffix=" thread" min={32} max={1024} step={32} onChange={setBlockSize} />
              <Range label="Number of sample SMs" value={smCount} min={1} max={8} onChange={setSmCount} />
              <div className="formula"><code>grid = ceil(N / blockDim)</code><strong>ceil({n} / {blockSize}) = {blocks} block</strong></div>
              <p className="muted">The SM number only indicates distribution; actual concurrency depends on resource limits.</p>
            </div>
            <div className="lab-stage">
              <div className="stats"><Stat label="Grid" value={`${blocks} block`} /><Stat label="total warp" value={String(totalWarps)} /><Stat label="Too many threads" value={String(extraThreads)} /></div>
              <div><h3>Possible wave distribution of blocks to SMs</h3><div className="sm-grid" style={{ gridTemplateColumns: `repeat(${Math.min(smCount, 4)}, minmax(0, 1fr))` }}>{Array.from({ length: smCount }, (_, sm) => { const owned = Array.from({ length: blocks }, (_, block) => block).filter((block) => block % smCount === sm); return <div className="sm-column" key={sm}><strong>S.M. {sm}</strong>{owned.slice(0, 8).map((block) => <span key={block} className={block === blocks - 1 ? "last" : ""}>block {block}</span>)}{owned.length === 0 && <small>waiting</small>}{owned.length > 8 && <small>+{owned.length - 8} block</small>}</div>; })}</div></div>
              <div><div className="stage-title"><strong>Last block · last warp</strong><span>{lastWarpActive} active, {32 - lastWarpActive} closed lane with guard</span></div><div className="lane-grid">{Array.from({ length: 32 }, (_, lane) => <div key={lane} className={`lane ${lane < lastWarpActive ? "path-a" : "masked"}`}>{lane}</div>)}</div></div>
            </div>
          </div>
          <div className="kernel-code-block">
            <h3>Real CUDA code</h3>
            <KernelCode n={n} blockSize={blockSize} blocks={blocks} />
          </div>
          <div className="checklist"><Fact label="Correctness" value="if (i < N) limit protection" /><Fact label="Coalescing" value="Neighbor lane → neighbor address" /><Fact label="Occupancy" value="Thread + register + shared memory + block limits" /></div>
          <Lesson title="Block size alone is not the answer" copy="128 or 256 threads are useful starting points. Choose by measuring profiler data, register usage, shared memory, latency hiding, and memory behavior." />
        </section>
      )}
      {tab === "latency" && (
        <section className="panel-stack" role="tabpanel">
          <SectionHead title="Latency hiding: the SM stays busy while memory waits" subtitle="While one warp waits on memory, the scheduler switches to another ready warp; without enough warps the SM idles." badge={"Period = " + computeCycles + " + " + latency + " = " + period + " cycles"} />
          <div className="latency-controls">
            <Range label="Resident warps" value={warps} min={1} max={16} onChange={setWarps} />
            <Range label="Memory latency" value={latency} suffix=" cycles" min={20} max={200} step={10} onChange={setLatency} />
            <Range label="Compute cycles" value={computeCycles} suffix=" cycles" min={4} max={32} step={4} onChange={setComputeCycles} />
          </div>
          <div className="stats">
            <Stat label="Utilization" value={Math.round(utilization * 100) + "%"} />
            <Stat label="Warps to fully hide" value={String(neededWarps)} />
            <Stat label="Period" value={period + " cycles"} />
          </div>
          <div className="latency-timeline">
            {Array.from({ length: warps }, (_, w) => (
              <div className="latency-row" key={w}>
                <span className="latency-label">W{w}</span>
                {Array.from({ length: 48 }, (_, t) => <div key={t} className={"latency-cell " + (warpComputing(w, t) ? "compute" : "memory")} />)}
              </div>
            ))}
            <div className="latency-row sm">
              <span className="latency-label">SM</span>
              {Array.from({ length: 48 }, (_, t) => <div key={t} className={"latency-cell " + (smBusy(t) ? "busy" : "idle")} />)}
            </div>
          </div>
          <div className="latency-legend">
            <span><i className="compute" /> Compute</span>
            <span><i className="memory" /> Memory wait</span>
            <span><i className="busy" /> SM busy</span>
            <span><i className="idle" /> SM idle</span>
          </div>
          <Lesson title="Critical threshold" copy={warps >= neededWarps ? "Enough warps (" + warps + " ≥ " + neededWarps + "): memory latency is fully hidden and the SM stays busy every cycle." : "Not enough warps (" + warps + " < " + neededWarps + "): the SM idles while all warps wait on memory. Full hiding needs ceil((C+L)/C) = " + neededWarps + " warps."} />
        </section>
      )}
      {tab === "occupancy" && (
        <section className="panel-stack" role="tabpanel">
          <SectionHead title="Occupancy: how many warps fit on one SM?" subtitle="Register, shared-memory, and thread limits all apply at once; the most constrained resource sets occupancy." badge={"Occupancy = " + Math.round(occupancy * 100) + "%"} />
          <div className="occ-controls">
            <Range label="Block size" value={occBlockSize} suffix=" threads" min={32} max={1024} step={32} onChange={setOccBlockSize} />
            <Range label="Registers / thread" value={regsPerThread} min={16} max={255} step={8} onChange={setRegsPerThread} />
            <Range label="Shared memory / block" value={sharedPerBlock} suffix=" KB" min={0} max={48} step={4} onChange={setSharedPerBlock} />
          </div>
          <div className="stats">
            <Stat label="Occupancy" value={Math.round(occupancy * 100) + "%"} />
            <Stat label="Blocks / SM" value={String(blocksPerSM)} />
            <Stat label="Warps / SM" value={warpsPerSM + " / 64"} />
          </div>
          <div className="occ-limits">
            {occLimits.map((l) => (
              <div key={l.name} className={l.blocks === occMinBlocks ? "occ-limit binding" : "occ-limit"}>
                <span>{l.name}</span>
                <code>{l.detail}</code>
                <b>{l.blocks} blocks</b>
              </div>
            ))}
          </div>
          <Lesson title="Critical rule" copy="Occupancy is set by the most constrained resource. Reduce register or shared-memory usage to fit more blocks per SM." />
        </section>
      )}
      {tab === "quiz" && (
        <section className="panel-stack" role="tabpanel">
          <SectionHead title="Test your knowledge" subtitle="8 questions; see the explanation after each answer." badge="Checkpoint" />
          <Quiz questions={quizQuestions} />
        </section>
      )}
    </main>
  );
}

function SectionHead({ title, subtitle, badge }: { title: string; subtitle: string; badge: string }) { return <div className="section-head"><div><h2>{title}</h2><p>{subtitle}</p></div><span>{badge}</span></div>; }
function FlowNode({ title, copy, tone }: { title: string; copy: string; tone: string }) { return <div className={`flow-node ${tone}`}><strong>{title}</strong><span>{copy}</span></div>; }
function Compare({ title, rows }: { title: string; rows: string[][] }) { return <div className="compare"><h3>{title}</h3>{rows.map(([label, value]) => <Fact key={label} label={label} value={value} />)}</div>; }
function Fact({ label, value }: { label: string; value: string }) { return <div className="fact"><span>{label}</span><strong>{value}</strong></div>; }
function Lesson({ title, copy }: { title: string; copy: string }) { return <div className="lesson"><span>◇</span><p><strong>{title}:</strong> {copy}</p></div>; }
function DetailCard({ title, body, facts }: { title: string; body: string; facts: string[][] }) { return <article className="detail-card"><h3>{title}</h3><p>{body}</p>{facts.map(([label, value]) => <Fact key={label} label={label} value={value} />)}</article>; }
function Path({ title, value, tone }: { title: string; value: string; tone: string }) { return <div className={`path ${tone}`}><strong>{title}</strong><span>{value}</span></div>; }
function Stat({ label, value }: { label: string; value: string }) { return <div className="stat"><span>{label}</span><strong>{value}</strong></div>; }
function SimtVsSimd({ title, rows }: { title: string; rows: string[][] }) { return <div className="simt-vs-block"><h3 className="simt-vs-title">{title}</h3><div className="simt-vs-simd"><div className="simt-vs-head"><span className="dim" aria-hidden /><span className="simd">SIMD</span><span className="simt">SIMT</span></div>{rows.map(([dim, simd, simt]) => <div className="simt-vs-row" key={dim}><span className="dim">{dim}</span><span className="simd">{simd}</span><span className="simt">{simt}</span></div>)}</div></div>; }
function KernelCode({ n, blockSize, blocks }: { n: number; blockSize: number; blocks: number }) {
  const segs: (string | { hl: string })[] = [
    "// 1) Kernel: each thread processes one element\n",
    "__global__ void scale_kernel(const float* x, float* y, float alpha, int n) {\n",
    "    int i = blockIdx.x * blockDim.x + threadIdx.x;\n",
    "    if (i < n) {  // boundary guard\n",
    "        y[i] = alpha * x[i];\n",
    "    }\n",
    "}\n",
    "\n",
    "// 2) Host: compute the grid size and launch\n",
    "int blockSize = ", { hl: String(blockSize) }, ";\n",
    "int gridSize  = (", { hl: String(n) }, " + ", { hl: String(blockSize) }, " - 1) / ", { hl: String(blockSize) }, ";  // ceil(n / blockSize) = ", { hl: String(blocks) }, "\n",
    "\n",
    "scale_kernel<<<", { hl: String(blocks) }, ", ", { hl: String(blockSize) }, ">>>(d_x, d_y, 2.0f, ", { hl: String(n) }, ");\n",
  ];
  return <pre className="kernel-code"><code>{segs.map((seg, i) => typeof seg === "string" ? seg : <span key={i} className="hl">{seg.hl}</span>)}</code></pre>;
}
function Quiz({ questions }: { questions: QuizQuestion[] }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const answered = Object.keys(answers).length;
  const correct = questions.filter((q, i) => answers[i] === q.answer).length;
  return (
    <div className="quiz">
      <div className="quiz-score">
        <div><span>Score</span><b>{correct} / {questions.length}</b></div>
        {answered === questions.length && <button type="button" onClick={() => setAnswers({})}>Retry</button>}
      </div>
      {questions.map((q, i) => {
        const chosen = answers[i];
        const isAnswered = chosen !== undefined;
        const isCorrect = chosen === q.answer;
        return (
          <div key={i} className={"quiz-q" + (isAnswered ? (isCorrect ? " correct" : " wrong") : "")}>
            <h3>{i + 1}. {q.q}</h3>
            <div className="quiz-options">
              {q.options.map((opt, j) => {
                const isChosen = chosen === j;
                const isAnswer = q.answer === j;
                let cls = "";
                if (isAnswered) {
                  if (isAnswer) cls = "answer";
                  else if (isChosen) cls = "chosen-wrong";
                }
                return <button key={j} type="button" disabled={isAnswered} onClick={() => setAnswers({ ...answers, [i]: j })} className={cls}>{opt}</button>;
              })}
            </div>
            {isAnswered && <p className="quiz-explain">{isCorrect ? "✓ Correct" : "✗ Wrong"} — {q.explain}</p>}
          </div>
        );
      })}
    </div>
  );
}
function Range({ label, value, suffix = "", min, max, step = 1, onChange }: { label: string; value: number; suffix?: string; min: number; max: number; step?: number; onChange: (value: number) => void }) { return <label className="range-label"><span>{label}: <strong>{value}{suffix}</strong></span><input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} /></label>; }
