"use client";

import { useMemo, useState } from "react";

type Collective = "Ring" | "Tree" | "Hierarchical";
type Parallelism = "DP" | "TP" | "PP" | "EP";

const collectiveCopy: Record<Collective, { path: string; note: string; formula: string }> = {
  Ring: {
    path: "GPU 0 → GPU 1 → GPU 2 → GPU 3 → GPU 0",
    note: "Makes good use of bandwidth on large tensors. It can be thought of as reduce-scatter + all-gather.",
    formula: "2×(N−1)/N×M",
  },
  Tree: {
    path: "GPU 0 → {GPU 1, GPU 2} → GPU 3",
    note: "The number of steps is logarithmic, which can reduce latency for small messages.",
    formula: "2 × log₂(N) steps",
  },
  Hierarchical: {
    path: "NVLink intra-island ↔ inter-node via NIC",
    note: "It follows the topology by using fast local links first and the RDMA network between nodes.",
    formula: "local reduce → RDMA → local broadcast",
  },
};

const strategies: Record<Parallelism, { title: string; description: string; comm: string; best: string; caution: string }> = {
  DP: {
    title: "Data Parallel",
    description: "Each GPU keeps a copy of the model while the mini-batch is split across replicas.",
    comm: "Gradient AllReduce",
    best: "The model fits on one GPU and the batch can grow",
    caution: "The model is replicated, so data parallelism alone does not solve model-capacity limits.",
  },
  TP: {
    title: "Tensor Parallel",
    description: "Matrix operations within one layer are split across GPUs.",
    comm: "Frequent AllReduce / AllGather",
    best: "A layer does not fit within one GPU's memory or compute budget",
    caution: "It is latency-sensitive and requires a fast GPU-to-GPU link.",
  },
  PP: {
    title: "Pipeline Parallel",
    description: "Layer groups are divided into stages; micro-batches flow through the pipeline.",
    comm: "P2P between neighboring stages",
    best: "If the deep model will span multiple nodes",
    caution: "Pipeline bubbles and unbalanced stages reduce efficiency.",
  },
  EP: {
    title: "Expert Parallel",
    description: "MoE experts are distributed across GPUs; tokens are directed to the appropriate expert.",
    comm: "All-to-All",
    best: "Sparse Mixture-of-Experts models",
    caution: "Token imbalance and network congestion become critical.",
  },
};

const glossary = [
  ["NCCL", "Library that handles collective and P2P communication between NVIDIA GPUs according to topology."],
  ["Collective", "An operation such as AllReduce, AllGather, or Broadcast in which a group of GPUs participates."],
  ["RDMA", "Direct access to remote system memory without moving data through the remote CPU."],
  ["GPUDirect RDMA", "NIC DMA directly to GPU memory, bypassing an extra CPU-memory copy."],
  ["RoCEv2", "Ethernet approach that carries RDMA over a routable UDP/IP network."],
  ["InfiniBand", "Fabric that offers native support for RDMA, low latency and lossless networking features."],
  ["Rail", "Independent network path used in parallel across multi-NIC nodes."],
  ["Rank", "Unique ID given to each process in a distributed job."],
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

export default function NcclMultiGpuEmbedded() {
  const [collective, setCollective] = useState<Collective>("Ring");
  const [parallel, setParallel] = useState<Parallelism>("TP");
  const [gpus, setGpus] = useState(8);
  const [payload, setPayload] = useState(4);
  const [bandwidth, setBandwidth] = useState(200);
  const [latency, setLatency] = useState(3);
  const [quizOpen, setQuizOpen] = useState(false);

  const metrics = useMemo(() => {
    const ringBytes = 2 * ((gpus - 1) / gpus) * payload;
    const transferMs = (ringBytes * 8 * 1000) / bandwidth;
    const latencyMs = (2 * (gpus - 1) * latency) / 1000;
    const total = transferMs + latencyMs;
    const efficiency = Math.max(8, Math.min(99, (payload / (payload + (latency * bandwidth) / 8000)) * 100));
    return { ringBytes, total, efficiency };
  }, [gpus, payload, bandwidth, latency]);

  return (
    <main className="nccl-multigpu-embed">
      <nav className="topbar" aria-label="Main navigation">
        <a className="brand" href="#top" aria-label="Kernel Atlas home page">
          <span className="brand-mark">K/A</span>
          <span>KERNEL ATLAS</span>
        </a>
        <div className="nav-links">
          <a href="#fundamentals">Fundamentals</a>
          <a href="#parallelism">Parallelism</a>
          <a href="#rdma">RDMA</a>
          <a href="#lab">Lab</a>
        </div>
        <span className="status-pill"><i /> INTERACTIVE PRIMER</span>
      </nav>

      <section className="hero" id="top">
        <div className="eyebrow">DISTRIBUTED GPU SYSTEMS · 01</div>
        <div className="hero-grid">
          <div>
            <h1>How do<br /><em>GPUs work</em><br />together?</h1>
            <p className="hero-lede">See, manipulate and measure the data path from NCCL collectives to multidimensional parallelism, from PCIe to GPUDirect RDMA.</p>
            <div className="hero-actions">
              <a className="button primary" href="#fundamentals">Start exploring <span>↓</span></a>
              <a className="button ghost" href="#lab">Performance lab</a>
            </div>
          </div>
          <div className="hero-visual" aria-label="GPU and network connection diagram between two servers">
            <div className="visual-label top">NODE 0 · NVLINK DOMAIN</div>
            <div className="node-row">
              {[0, 1, 2, 3].map((n) => <div className="gpu" key={n}><span>GPU</span><strong>{n}</strong></div>)}
            </div>
            <div className="bus"><span>NVSWITCH · 900GB/s</span></div>
            <div className="data-stream"><i /><i /><i /><span>RDMA FABRIC</span></div>
            <div className="bus lower"><span>NIC · 400Gb/s</span></div>
            <div className="node-row muted">
              {[4, 5, 6, 7].map((n) => <div className="gpu" key={n}><span>GPU</span><strong>{n}</strong></div>)}
            </div>
            <div className="visual-label bottom">NODE 1 · REMOTE MEMORY PATH</div>
          </div>
        </div>
        <div className="hero-facts">
          <div><small>MAIN ABSTRACT</small><strong>collective communication</strong></div>
          <div><small>CRITICAL RESOURCE</small><strong>Bandwidth + latency</strong></div>
          <div><small>GOAL</small><strong>Match compute to communication</strong></div>
        </div>
      </section>

      <section className="section dark-section" id="fundamentals">
        <div className="section-heading">
          <span className="section-index">01/NCCL</span>
          <div>
            <h2>Collective communication,<br />one API.</h2>
            <p>NCCL is not a “network protocol”. It establishes the optimal communication path between ranks using CUDA cores, GPU memory and existing connections.</p>
          </div>
        </div>

        <div className="collective-grid">
          <div className="collective-card">
            <div className="card-label">ALLREDUCE · STEP BY STEP</div>
            <div className="ring-stage" data-mode={collective}>
              {[0, 1, 2, 3].map((n) => (
                <div className={`ring-node n${n}`} key={n}><span>RANK</span>{n}<i /></div>
              ))}
              <div className="ring-center"><small>OP</small><strong>Σ</strong><span>REDUCE<br />+SHARE</span></div>
            </div>
            <div className="segmented" role="group" aria-label="Collective algorithm selection">
              {(["Ring", "Tree", "Hierarchical"] as Collective[]).map((item) => (
                <button className={collective === item ? "active" : ""} onClick={() => setCollective(item)} key={item}>{item}</button>
              ))}
            </div>
          </div>
          <div className="explain-stack">
            <div className="explain-card accent">
              <span className="micro-label">SELECTED PATH</span>
              <code>{collectiveCopy[collective].path}</code>
              <p>{collectiveCopy[collective].note}</p>
              <div className="formula"><span>COST MODEL</span><strong>{collectiveCopy[collective].formula}</strong></div>
            </div>
            <div className="collective-list">
              <div><b>AllReduce</b><span>Each rank gets the result</span><code>sum + distribute</code></div>
              <div><b>AllGather</b><span>Puts the pieces together in everyone</span><code>gather shards</code></div>
              <div><b>ReduceScatter</b><span>Reduces and distributes in pieces</span><code>reduce → shard</code></div>
              <div><b>All-to-All</b><span>Each rank sends different data to everyone</span><code>MOE routing</code></div>
            </div>
          </div>
        </div>
      </section>

      <section className="section paper-section" id="parallelism">
        <div className="section-heading light">
          <span className="section-index">02 / PARALLELISM</span>
          <div>
            <h2>Do not just split the model.<br />Split the bottleneck.</h2>
            <p>The right strategy depends on model size, batch, topology and communication frequency. Large tutorials often combine these dimensions in 3D.</p>
          </div>
        </div>

        <div className="strategy-layout">
          <div className="strategy-tabs" role="tablist" aria-label="Parallelism strategies">
            {(Object.keys(strategies) as Parallelism[]).map((key) => (
              <button role="tab" aria-selected={parallel === key} className={parallel === key ? "active" : ""} onClick={() => setParallel(key)} key={key}>
                <span>{key}</span><strong>{strategies[key].title}</strong><i>↗</i>
              </button>
            ))}
          </div>
          <div className="strategy-detail">
            <div className="strategy-visual" data-strategy={parallel}>
              <div className="model-stack">
                {["EMBED", "ATTN", "MLP", "HEAD"].map((label, i) => <div key={label} style={{ "--i": i } as React.CSSProperties}>{label}<span>{parallel === "TP" ? "SHARD" : parallel === "PP" ? `STAGE ${i + 1}` : parallel === "EP" && label === "MLP" ? "EXPERTS" : "REPLICA"}</span></div>)}
              </div>
              <div className="strategy-arrow"><span>{strategies[parallel].comm}</span></div>
              <div className="gpu-bank">{[0,1,2,3].map(n => <div key={n}>g{n}</div>)}</div>
            </div>
            <div className="strategy-copy">
              <span className="micro-label">{parallel} · {strategies[parallel].title}</span>
              <h3>{strategies[parallel].description}</h3>
              <dl>
                <div><dt>COMMUNICATION PATTERN</dt><dd>{strategies[parallel].comm}</dd></div>
                <div><dt>WHEN?</dt><dd>{strategies[parallel].best}</dd></div>
                <div><dt>ATTENTION</dt><dd>{strategies[parallel].caution}</dd></div>
              </dl>
            </div>
          </div>
        </div>

        <div className="comparison-strip">
          <span>3D PARALLELISM</span>
          <strong>DP</strong><i>×</i><strong>TP</strong><i>×</i><strong>PP</strong>
          <p>Example: 64 GPUs = 8 data × 4 tensor × 2 pipelines</p>
        </div>
      </section>

      <section className="section signal-section" id="rdma">
        <div className="section-heading">
          <span className="section-index">03/RDMA</span>
          <div>
            <h2>As the data path gets shorter<br />GPU waits less.</h2>
            <p>GPUDirect RDMA removes CPU buffering and redundant copies during data transfer at the remote node. However, performance; Depends on PCIe topology, NIC pairing and network configuration.</p>
          </div>
        </div>

        <div className="path-comparison">
          <div className="path-card slow">
            <div className="card-label">THE TRADITIONAL WAY · ADDITIONAL COPIES</div>
            <div className="path-flow">
              <span>GPU</span><i>1</i><span>CPU<br />MEM</span><i>2</i><span>NIC</span><b>NETWORK</b><span>NIC</span><i>3</i><span>CPU<br />MEM</span><i>4</i><span>GPU</span>
            </div>
            <p>GPU memory → host memory → NIC; On the other side, the path reverses.</p>
          </div>
          <div className="path-card fast">
            <div className="card-label">GPUDIRECT RDMA · ZERO-COPY PATH</div>
            <div className="path-flow">
              <span>GPU</span><i>DMA</i><span>NIC</span><b>RDMA FABRIC</b><span>NIC</span><i>DMA</i><span>GPU</span>
            </div>
            <p>The NIC directly accesses registered GPU memory while the CPU remains in the control plane.</p>
          </div>
        </div>

        <div className="rdma-cards">
          <article><span>01</span><h3>Memory registration</h3><p>The memory to be DMAed is pre-pinned and registered with access keys.</p></article>
          <article><span>02</span><h3>Queue pairs</h3><p>Send and receive work requests are written to queues, and the completion queue reports their results.</p></article>
          <article><span>03</span><h3>Lossless fabric</h3><p>InfiniBand or properly configured RoCEv2 requires careful queue and congestion management.</p></article>
          <article><span>04</span><h3>Topology affinity</h3><p>Keeping the GPU and NIC under the same PCIe root complex reduces hops and latency.</p></article>
        </div>

        <aside className="reality-check">
          <span>REALITY CHECK</span>
          <p><strong>RDMA ≠ automatic acceleration.</strong> If the message is small, the GPU–NIC path is bad, the link is saturated, or the collective is incorrectly chosen, the bottleneck will simply shift.</p>
        </aside>
      </section>

      <section className="section lab-section" id="lab">
        <div className="lab-title">
          <span className="section-index">04 / PERFORMANCE LAB</span>
          <h2>Calculate the<br />AllReduce cost.</h2>
          <p>This is a simplified Hockney-style model. Measure the real system with <code>nccl-tests</code>.</p>
        </div>
        <div className="lab-console">
          <div className="controls">
            <label><span>Number of GPUs <b>{gpus}</b></span><input type="range" min="2" max="16" step="2" value={gpus} onChange={e => setGpus(Number(e.target.value))} /></label>
            <label><span>Payload <b>{payload} GB</b></span><input type="range" min="1" max="16" value={payload} onChange={e => setPayload(Number(e.target.value))} /></label>
            <label><span>Effective bandwidth <b>{bandwidth} Gb/s</b></span><input type="range" min="25" max="400" step="25" value={bandwidth} onChange={e => setBandwidth(Number(e.target.value))} /></label>
            <label><span>Link delay <b>{latency} μs</b></span><input type="range" min="1" max="20" value={latency} onChange={e => setLatency(Number(e.target.value))} /></label>
          </div>
          <div className="results">
            <div className="terminal-head"><i /><i /><i /><span>ring_allreduce.model</span></div>
            <div className="terminal-body">
              <p><span>$</span> topology --ranks {gpus} --algo ring</p>
              <div className="metric"><span>Moved data / rank</span><strong>{formatNumber(metrics.ringBytes)} GB</strong></div>
              <div className="metric hero-metric"><span>Estimated communication time</span><strong>{formatNumber(metrics.total)} ms</strong></div>
              <div className="meter"><i style={{ width: `${metrics.efficiency}%` }} /></div>
              <div className="metric"><span>Payload efficiency</span><strong>{formatNumber(metrics.efficiency)}%</strong></div>
              <small>Model: T ≈ 2(N−1)α + 2(N−1)/N × M/B</small>
            </div>
          </div>
        </div>
        <div className="lab-notes">
          <div><b>LATENCY-BOUND</b><p>Small message + multi rank. Think tree algorithm or bulk shipping.</p></div>
          <div><b>BANDWIDTH-BOUND</b><p>For large messages, fill the links with ring and multi-channel algorithms.</p></div>
          <div><b>TOPOLOGY-BOUND</b><p>Slow PCIe migration or incorrect NIC affinity. Measure the path first.</p></div>
        </div>
      </section>

      <section className="section glossary-section">
        <div className="glossary-head"><span className="section-index">05 / FIELD GUIDE</span><h2>Quick reference.</h2></div>
        <div className="glossary-grid">
          {glossary.map(([term, desc]) => <article key={term}><span>↳</span><h3>{term}</h3><p>{desc}</p></article>)}
        </div>
        <div className="decision-card">
          <div><span className="micro-label">TEST YOURSELF</span><h3>On two nodes with 8 GPUs, why is tensor parallel usually kept within the node?</h3></div>
          <button onClick={() => setQuizOpen(!quizOpen)} aria-expanded={quizOpen}>{quizOpen ? "Hide reply" : "Show answer"} <span>→</span></button>
          {quizOpen && <p className="answer">Tensor parallel communicates very frequently per layer. NVLink/NVSwitch generally offers higher bandwidth and lower latency than a node-to-node RDMA network. Therefore, it is more efficient in most topologies to keep the TP group local and scale DP or PP across nodes.</p>}
        </div>
      </section>

      <footer>
        <div className="brand"><span className="brand-mark">K/A</span><span>KERNEL ATLAS</span></div>
        <p>NCCL MULTI-GPU RDMA<br />Interactive systems primer</p>
        <a href="#top">Back to top ↑</a>
      </footer>
    </main>
  );
}
