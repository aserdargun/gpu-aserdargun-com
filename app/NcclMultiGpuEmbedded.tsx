"use client";
/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- Labelled overflow regions must remain keyboard-scrollable. */

import { useMemo, useState } from "react";

type Collective = "Ring" | "Tree" | "Hiyerarşik";
type Parallelism = "DP" | "TP" | "PP" | "EP";

export const NCCL_TOPOLOGY_IDS = ["pcie", "nvlink", "nvswitch", "rdma"] as const;
export const NCCL_SYSTEM_PATH_IDS = ["topology", "symmetric", "fusion", "device-api"] as const;
export const NCCL_PARALLELISM_IDS = ["DP", "TP", "PP", "EP"] as const;
export const NCCL_DEVICE_FEATURE_IDS = ["lsa-multimem", "gin", "rust-bindings"] as const;

const ncclDeviceFeatures = {
  "lsa-multimem": { sourceId: "nccl-device-lsa-multimem", maturity: "current", coreCompletion: true, title: "LSA + Multimem", compatibility: "NCCL 2.29 ve sonrasında geriye dönük uyumludur." },
  gin: { sourceId: "nccl-device-gin", maturity: "current", coreCompletion: true, title: "GIN", compatibility: "Geriye dönük uyumlu değildir: NCCL yükseltildiğinde Device API kernelleri yeniden derlenmelidir." },
  "rust-bindings": { sourceId: "nccl-device-rust-bindings", maturity: "preview", coreCompletion: false, title: "nccl4rust bağları", compatibility: "LTO IR olarak sunulan deneysel host ve Device API bağları; isteğe bağlı Önizleme çalışmasıdır." },
} as const;

export function getNcclDeviceFeature(id: (typeof NCCL_DEVICE_FEATURE_IDS)[number]) { return { id, ...ncclDeviceFeatures[id] }; }

const ncclSystemPaths = {
  topology: { sourceId: "nccl-topology-detection", maturity: "current", implementationSourceId: undefined, implementationMaturity: undefined, coreCompletion: true, title: "Topoloji kanıtı", caveat: "PCIe, NVLink, NVSwitch ve GPUDirect RDMA yolunu önce doğrula." },
  symmetric: { sourceId: "nvshmem-symmetric-memory", maturity: "current", implementationSourceId: "nccl-device-lsa-multimem", implementationMaturity: "current", coreCompletion: true, title: "Simetrik kerneller", caveat: "LSA ve multimem güncel NCCL Device API yollarıdır ve NCCL 2.29'dan itibaren geriye dönük uyumludur." },
  fusion: { sourceId: "nccl-cuda-streams", maturity: "current", implementationSourceId: "nccl-device-api-fusion", implementationMaturity: "current", coreCompletion: true, title: "İletişim/hesap füzyonu", caveat: "Güncel Device API yapı taşları, özellik-bazlı uyumluluk sınırını koruyarak iletişim ve hesabı birleştirebilir." },
  "device-api": { sourceId: "nccl-device-gin", maturity: "current", implementationSourceId: undefined, implementationMaturity: undefined, coreCompletion: true, title: "Device API özellik matrisi", caveat: "GIN günceldir fakat geriye dönük uyumlu değildir: NCCL yükseltildiğinde Device API kernellerini yeniden derle." },
} as const;

export function getNcclSystemPath(id: (typeof NCCL_SYSTEM_PATH_IDS)[number]) { return { id, ...ncclSystemPaths[id] }; }

const ncclTopologyEvidence = {
  pcie: { sourceId: "nccl-pcie-p2p", evidence: "PCIe P2P erişimini `nvidia-smi topo -p2p p` ile, NIC yakınlığını da topo çıktısıyla gözle." },
  nvlink: { sourceId: "nccl-nvlink-p2p", evidence: "NVLink P2P durumunu `nvidia-smi topo -p2p n` ile doğrula; yalnız aynı ada varsayımı yapma." },
  nvswitch: { sourceId: "nccl-nvswitch-topology", evidence: "NVSwitch alanını GPU/NIC yerleşimiyle birlikte doğrula; ada içi bant genişliğini düğümler arası ağla karıştırma." },
  rdma: { sourceId: "nccl-gpudirect-rdma", evidence: "GPUDirect RDMA için GPU–NIC PCIe kök karmaşıklığını ve uzak DMA yolunu sistem topolojisinde doğrula." },
} as const;
const ncclParallelismRecommendation: Record<Parallelism, string> = {
  DP: "DP için gradient kolektifini seçilen yolun bant genişliği ve NIC yakınlığıyla eşleştir.",
  TP: "TP için sık AllReduce/AllGather yolunda en düşük GPU–GPU gecikmesini önceliklendir.",
  PP: "PP için komşu aşamalar arası P2P yolunu ve düğüm sınırını görünür kıl.",
  EP: "EP için All-to-All trafiğini rail/NIC yerleşimi ve ağ tıkanmasıyla birlikte planla.",
};
export function getNcclTopologyRecommendation(parallelism: Parallelism, topology: (typeof NCCL_TOPOLOGY_IDS)[number]) {
  const topologyPlan = ncclTopologyEvidence[topology];
  return { parallelism, topology, parallelismSourceId: "vllm-parallelism-scaling", topologySourceId: topologyPlan.sourceId, recommendation: ncclParallelismRecommendation[parallelism], topologyEvidence: topologyPlan.evidence };
}

const collectiveCopy: Record<Collective, { path: string; note: string; formula: string }> = {
  Ring: {
    path: "GPU 0 → GPU 1 → GPU 2 → GPU 3 → GPU 0",
    note: "Büyük tensörlerde bant genişliğini iyi kullanır. Reduce-scatter + all-gather olarak düşünülebilir.",
    formula: "2 × (N−1)/N × M",
  },
  Tree: {
    path: "GPU 0 → {GPU 1, GPU 2} → GPU 3",
    note: "Adım sayısı logaritmiktir; küçük mesajlarda gecikme avantajı sağlayabilir.",
    formula: "2 × log₂(N) adım",
  },
  Hiyerarşik: {
    path: "NVLink ada içi ↔ NIC üzerinden düğümler arası",
    note: "Önce hızlı yerel bağlantıyı, sonra RDMA ağını kullanarak topolojiyi gözetir.",
    formula: "local reduce → RDMA → local broadcast",
  },
};

const strategies: Record<Parallelism, { title: string; description: string; comm: string; best: string; caution: string }> = {
  DP: {
    title: "Data Parallel",
    description: "Her GPU modelin kopyasını tutar; mini-batch parçalara ayrılır.",
    comm: "Gradient AllReduce",
    best: "Model tek GPU'ya sığıyor, batch büyüyebiliyorsa",
    caution: "Bellek kopyalanır; büyük model sorununu tek başına çözmez.",
  },
  TP: {
    title: "Tensor Parallel",
    description: "Tek katmandaki matris işlemleri GPU'lara bölünür.",
    comm: "Sık AllReduce / AllGather",
    best: "Katman tek GPU belleğine veya hesap süresine sığmıyorsa",
    caution: "Gecikmeye duyarlıdır; hızlı GPU–GPU bağlantısı ister.",
  },
  PP: {
    title: "Pipeline Parallel",
    description: "Katman grupları aşamalara ayrılır; mikro-batch'ler boru hattından akar.",
    comm: "Komşu aşamalar arası P2P",
    best: "Derin model, birden fazla düğüme yayılacaksa",
    caution: "Pipeline bubble ve dengesiz aşamalar verimi düşürür.",
  },
  EP: {
    title: "Expert Parallel",
    description: "MoE uzmanları GPU'lara dağıtılır; token'lar uygun uzmana yönlendirilir.",
    comm: "All-to-All",
    best: "Seyrek Mixture-of-Experts modellerinde",
    caution: "Token dengesizliği ve ağ tıkanması kritik hale gelir.",
  },
};

const glossary = [
  ["NCCL", "NVIDIA GPU'ları arasında kolektif ve P2P iletişimi topolojiye göre yürüten kütüphane."],
  ["Collective", "Bir GPU grubunun birlikte katıldığı AllReduce, AllGather, Broadcast gibi işlem."],
  ["RDMA", "Uzak sistem belleğine, karşı CPU'yu veri yolunda çalıştırmadan doğrudan erişim."],
  ["GPUDirect RDMA", "NIC'in GPU belleğine doğrudan DMA yapması; CPU kopyasını atlar."],
  ["RoCEv2", "RDMA'yı yönlendirilebilir UDP/IP ağı üzerinde taşıyan Ethernet yaklaşımı."],
  ["InfiniBand", "RDMA için doğal destek, düşük gecikme ve kayıpsız ağ özellikleri sunan fabric."],
  ["Rail", "Çok NIC'li düğümlerde paralel kullanılan bağımsız ağ yolu."],
  ["Rank", "Dağıtık işteki her sürece verilen benzersiz kimlik."],
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(value);
}

export default function NcclMultiGpuEmbedded() {
  const [collective, setCollective] = useState<Collective>("Ring");
  const [parallel, setParallel] = useState<Parallelism>("TP");
  const [gpus, setGpus] = useState(8);
  const [payload, setPayload] = useState(4);
  const [bandwidth, setBandwidth] = useState(200);
  const [latency, setLatency] = useState(3);
  const [quizOpen, setQuizOpen] = useState(false);
  const [topology, setTopology] = useState<(typeof NCCL_TOPOLOGY_IDS)[number]>("pcie");
  const [systemPath, setSystemPath] = useState<(typeof NCCL_SYSTEM_PATH_IDS)[number]>("topology");
  const topologyRecommendation = getNcclTopologyRecommendation(parallel, topology);

  const metrics = useMemo(() => {
    const ringBytes = 2 * ((gpus - 1) / gpus) * payload;
    const transferMs = (ringBytes * 8 * 1000) / bandwidth;
    const latencyMs = (2 * (gpus - 1) * latency) / 1000;
    const total = transferMs + latencyMs;
    const efficiency = Math.max(8, Math.min(99, (payload / (payload + (latency * bandwidth) / 8000)) * 100));
    return { ringBytes, total, efficiency };
  }, [gpus, payload, bandwidth, latency]);

  return (
    <section className="nccl-multigpu-surface">
      <section className="hero" id="top">
        <div className="eyebrow">DAĞITIK GPU SİSTEMLERİ · 01</div>
        <div className="hero-grid">
          <div>
            <h2>GPU’lar<br /><em>nasıl birlikte</em><br />çalışır?</h2>
            <p className="hero-lede">NCCL kolektiflerinden çok boyutlu paralelliğe, PCIe’den GPUDirect RDMA’ya uzanan veri yolunu gör, değiştir ve ölç.</p>
            <div className="hero-actions">
              <a className="button primary" href="#temeller">Keşfe başla <span>↓</span></a>
              <a className="button ghost" href="#laboratuvar">Performans labı</a>
            </div>
          </div>
          <div className="hero-visual" aria-label="İki sunucu arasında GPU ve ağ bağlantısı şeması">
            <div className="visual-label top">DÜĞÜM 0 · NVLINK ALANI</div>
            <div className="node-row">
              {[0, 1, 2, 3].map((n) => <div className="gpu" key={n}><span>GPU</span><strong>{n}</strong></div>)}
            </div>
            <div className="bus"><span>NVSWITCH · YEREL FABRİK</span></div>
            <div className="data-stream"><i /><i /><i /><span>RDMA AĞI</span></div>
            <div className="bus lower"><span>NIC · DÜĞÜMLER ARASI FABRİK</span></div>
            <div className="node-row muted">
              {[4, 5, 6, 7].map((n) => <div className="gpu" key={n}><span>GPU</span><strong>{n}</strong></div>)}
            </div>
            <div className="visual-label bottom">DÜĞÜM 1 · UZAK BELLEK YOLU</div>
          </div>
        </div>
        <div className="hero-facts">
          <div><small>ANA SOYUTLAMA</small><strong>Kolektif iletişim</strong></div>
          <div><small>KRİTİK KAYNAK</small><strong>Bant genişliği + gecikme</strong></div>
          <div><small>HEDEF</small><strong>Hesabı iletişimle örtüştürmek</strong></div>
        </div>
      </section>

      <section className="section dark-section" id="temeller">
        <div className="section-heading">
          <span className="section-index">01 / NCCL</span>
          <div>
            <h2>Kolektif iletişim,<br />tek bir API.</h2>
            <p>NCCL bir “ağ protokolü” değildir. CUDA çekirdekleri, GPU belleği ve mevcut bağlantıları kullanarak rank’ler arasında en uygun iletişim yolunu kurar.</p>
          </div>
        </div>

        <div className="collective-grid">
          <div className="collective-card">
            <div className="card-label">ALLREDUCE · ADIM ADIM</div>
            <div className="ring-stage" data-mode={collective}>
              {[0, 1, 2, 3].map((n) => (
                <div className={`ring-node n${n}`} key={n}><span>RANK</span>{n}<i /></div>
              ))}
              <div className="ring-center"><small>OP</small><strong>Σ</strong><span>İNDİRGE<br />+ SHARE</span></div>
            </div>
            <div className="segmented" role="group" aria-label="Kolektif algoritma seçimi">
              {(["Ring", "Tree", "Hiyerarşik"] as Collective[]).map((item) => (
                <button type="button" aria-pressed={collective === item} className={collective === item ? "active" : ""} onClick={() => setCollective(item)} key={item}>{item}</button>
              ))}
            </div>
          </div>
          <div className="explain-stack">
            <div className="explain-card accent">
              <span className="micro-label">SEÇİLİ YOL</span>
              <code>{collectiveCopy[collective].path}</code>
              <p>{collectiveCopy[collective].note}</p>
              <div className="formula"><span>MALİYET MODELİ</span><strong>{collectiveCopy[collective].formula}</strong></div>
            </div>
            <div className="collective-list">
              <div><b>AllReduce</b><span>Her rank sonucu alır</span><code>sum + distribute</code></div>
              <div><b>AllGather</b><span>Parçaları herkeste birleştirir</span><code>gather shards</code></div>
              <div><b>ReduceScatter</b><span>Azaltır ve parçalı dağıtır</span><code>reduce → shard</code></div>
              <div><b>All-to-All</b><span>Her rank herkese farklı veri yollar</span><code>MoE routing</code></div>
            </div>
          </div>
        </div>
      </section>

      <section className="section paper-section" id="paralellik">
        <div className="section-heading light">
          <span className="section-index">02 / PARALLELISM</span>
          <div>
            <h2>Modeli değil,<br />darboğazı böl.</h2>
            <p>Doğru strateji model boyutuna, batch’e, topolojiye ve iletişim sıklığına bağlıdır. Büyük eğitimler genellikle bu boyutları 3D olarak birleştirir.</p>
          </div>
        </div>

        <div className="strategy-layout">
          <div className="strategy-tabs" role="group" aria-label="Paralellik stratejileri">
            {(Object.keys(strategies) as Parallelism[]).map((key) => (
              <button type="button" aria-pressed={parallel === key} className={parallel === key ? "active" : ""} onClick={() => setParallel(key)} key={key}>
                <span>{key}</span><strong>{strategies[key].title}</strong><i>↗</i>
              </button>
            ))}
          </div>
          <div className="strategy-detail" aria-live="polite">
            <div className="strategy-visual" data-strategy={parallel}>
              <div className="model-stack">
                {["EMBED", "ATTN", "MLP", "HEAD"].map((label, i) => <div key={label} style={{ "--i": i } as React.CSSProperties}>{label}<span>{parallel === "TP" ? "SHARD" : parallel === "PP" ? `STAGE ${i + 1}` : parallel === "EP" && label === "MLP" ? "EXPERTS" : "REPLICA"}</span></div>)}
              </div>
              <div className="strategy-arrow"><span>{strategies[parallel].comm}</span></div>
              <div className="gpu-bank">{[0,1,2,3].map(n => <div key={n}>G{n}</div>)}</div>
            </div>
            <div className="strategy-copy">
              <span className="micro-label">{parallel} · {strategies[parallel].title}</span>
              <h3>{strategies[parallel].description}</h3>
              <dl>
                <div><dt>İLETİŞİM DESENİ</dt><dd>{strategies[parallel].comm}</dd></div>
                <div><dt>NE ZAMAN?</dt><dd>{strategies[parallel].best}</dd></div>
                <div><dt>DİKKAT</dt><dd>{strategies[parallel].caution}</dd></div>
              </dl>
            </div>
          </div>
        </div>

        <div className="comparison-strip">
          <span>3D PARALLELISM</span>
          <strong>DP</strong><i>×</i><strong>TP</strong><i>×</i><strong>PP</strong>
          <p>Örnek: 64 GPU = 8 data × 4 tensor × 2 pipeline</p>
        </div>
      </section>

      <section className="section signal-section" id="rdma">
        <div className="nccl-architecture-lab" aria-labelledby="nccl-architecture-title">
          <div className="section-heading"><span className="section-index">03 / MİMARİ KARAR LABI</span><div><h2 id="nccl-architecture-title">Topolojiyi kanıta bağla.</h2><p>Kolektif, DP · TP · PP · EP paralelliği ve sistem yolunu ayrı kararlar olarak incele.</p></div></div>
          <div className="architecture-controls">
            <div data-control="parallelism" role="group" aria-label="Paralellik"><b>PARALELLİK</b>{NCCL_PARALLELISM_IDS.map((id) => <button type="button" key={id} aria-pressed={parallel === id} onClick={() => setParallel(id)}>{id}</button>)}</div>
            <div data-control="topology" role="group" aria-label="Topoloji"><b>TOPOLOJİ</b>{NCCL_TOPOLOGY_IDS.map((id) => <button type="button" key={id} aria-pressed={topology === id} onClick={() => setTopology(id)}>{({ pcie: "PCIe", nvlink: "NVLink", nvswitch: "NVSwitch", rdma: "GPUDirect RDMA" } as const)[id]}</button>)}</div>
            <div data-control="system-path" role="group" aria-label="Sistem yolu"><b>SİSTEM YOLU</b>{NCCL_SYSTEM_PATH_IDS.map((id) => <button type="button" key={id} aria-pressed={systemPath === id} onClick={() => setSystemPath(id)}>{ncclSystemPaths[id].title}</button>)}</div>
          </div>
          <div className="nccl-architecture-evidence" aria-live="polite" data-topology={topology} data-parallelism={parallel} data-system-path={systemPath}>
            <article data-claim="parallelism-recommendation" data-parallel-source-id={topologyRecommendation.parallelismSourceId} data-maturity="current"><b>{parallel} · GÜNCEL</b><p>{topologyRecommendation.recommendation}</p></article>
            <article data-claim="topology" data-topology-source-id={topologyRecommendation.topologySourceId} data-source-id={topologyRecommendation.topologySourceId} data-maturity="current"><b>{topology.toUpperCase()} · GÜNCEL</b><p>{topologyRecommendation.topologyEvidence}</p></article>
            <article data-claim="system-path" data-source-id={ncclSystemPaths[systemPath].sourceId} data-maturity={ncclSystemPaths[systemPath].maturity}><b>{ncclSystemPaths[systemPath].title} · {ncclSystemPaths[systemPath].maturity.toUpperCase()}</b><p>{ncclSystemPaths[systemPath].caveat}</p>{ncclSystemPaths[systemPath].implementationSourceId && <p data-claim="implementation" data-source-id={ncclSystemPaths[systemPath].implementationSourceId} data-maturity={ncclSystemPaths[systemPath].implementationMaturity}><b>DEVICE UYGULAMASI · {ncclSystemPaths[systemPath].implementationMaturity?.toUpperCase()}</b></p>}</article>
          </div>
          <div className="nccl-device-features" aria-label="NCCL 2.31.2 Device API özellik olgunluğu">
            {NCCL_DEVICE_FEATURE_IDS.map((id) => { const feature = ncclDeviceFeatures[id]; return <article key={id} data-feature={id} data-source-id={feature.sourceId} data-maturity={feature.maturity} data-core-optional={!feature.coreCompletion}><b>{feature.title} · {feature.maturity.toUpperCase()}</b><p>{feature.compatibility}</p></article>; })}
          </div>
        </div>
        <div className="section-heading">
          <span className="section-index">03 / RDMA</span>
          <div>
            <h2>Veri yolu kısaldıkça<br />GPU daha az bekler.</h2>
            <p>GPUDirect RDMA, uzak düğümdeki veri transferinde CPU ara belleği ve fazladan kopyaları kaldırır. Ancak performans; PCIe topolojisi, NIC eşleşmesi ve ağ yapılandırmasına bağlıdır.</p>
          </div>
        </div>

        <div className="path-comparison">
          <div className="path-card slow">
            <div className="card-label">GELENEKSEL YOL · EK KOPYALAR</div>
            <div className="path-flow" tabIndex={0} aria-label="Geleneksel ağ yolu">
              <span>GPU</span><i>1</i><span>CPU<br />MEM</span><i>2</i><span>NIC</span><b>AĞ</b><span>NIC</span><i>3</i><span>CPU<br />MEM</span><i>4</i><span>GPU</span>
            </div>
            <p>GPU belleği → host belleği → NIC; karşı tarafta yol tersine döner.</p>
          </div>
          <div className="path-card fast">
            <div className="card-label">GPUDIRECT RDMA · SIFIR KOPYALI YOL</div>
            <div className="path-flow" tabIndex={0} aria-label="GPU Direct RDMA yolu">
              <span>GPU</span><i>DMA</i><span>NIC</span><b>RDMA AĞI</b><span>NIC</span><i>DMA</i><span>GPU</span>
            </div>
            <p>NIC, kayıtlı GPU belleğine doğrudan erişir; CPU kontrol düzleminde kalır.</p>
          </div>
        </div>

        <div className="rdma-cards">
          <article><span>01</span><h3>Memory registration</h3><p>DMA yapılacak bellek önceden pin’lenir ve erişim anahtarlarıyla kaydedilir.</p></article>
          <article><span>02</span><h3>Queue pairs</h3><p>Send/receive iş istekleri kuyruklara yazılır; completion queue sonucu bildirir.</p></article>
          <article><span>03</span><h3>Lossless fabric</h3><p>InfiniBand ya da doğru ayarlanmış RoCEv2; kuyruk ve tıkanma yönetimi ister.</p></article>
          <article><span>04</span><h3>Topology affinity</h3><p>GPU–NIC aynı PCIe root complex altında olduğunda geçişler ve gecikme azalır.</p></article>
        </div>

        <aside className="reality-check">
          <span>GERÇEKLİK KONTROLÜ</span>
          <p><strong>RDMA ≠ otomatik hızlanma.</strong> Mesaj küçükse, GPU–NIC yolu kötüyse, link doygunsa veya kolektif yanlış seçilmişse darboğaz yalnızca yer değiştirir.</p>
        </aside>
      </section>

      <section className="section lab-section" id="laboratuvar">
        <div className="lab-title">
          <span className="section-index">04 / PERFORMANS LABORATUVARI</span>
          <h2>AllReduce maliyetini<br />kendin hesapla.</h2>
          <p>Basitleştirilmiş Hockney benzeri model. Gerçek sonuç için <code>nccl-tests</code> ile ölçüm gerekir.</p>
        </div>
        <div className="lab-console">
          <div className="controls">
            <label><span>GPU sayısı <b>{gpus}</b></span><input type="range" min="2" max="16" step="2" value={gpus} onChange={e => setGpus(Number(e.target.value))} /></label>
            <label><span>Payload <b>{payload} GB</b></span><input type="range" min="1" max="16" value={payload} onChange={e => setPayload(Number(e.target.value))} /></label>
            <label><span>Etkin bant genişliği <b>{bandwidth} Gb/s</b></span><input type="range" min="25" max="400" step="25" value={bandwidth} onChange={e => setBandwidth(Number(e.target.value))} /></label>
            <label><span>Link gecikmesi <b>{latency} μs</b></span><input type="range" min="1" max="20" value={latency} onChange={e => setLatency(Number(e.target.value))} /></label>
          </div>
          <div className="results">
            <div className="terminal-head"><i /><i /><i /><span>ring_allreduce.model</span></div>
            <div className="terminal-body">
              <p><span>$</span> topology --ranks {gpus} --algo ring</p>
              <div className="metric"><span>Taşınan veri / rank</span><strong>{formatNumber(metrics.ringBytes)} GB</strong></div>
              <div className="metric hero-metric"><span>Tahmini iletişim süresi</span><strong>{formatNumber(metrics.total)} ms</strong></div>
              <div className="meter"><i style={{ width: `${metrics.efficiency}%` }} /></div>
              <div className="metric"><span>Payload verimliliği</span><strong>%{formatNumber(metrics.efficiency)}</strong></div>
              <small>Model: T ≈ 2(N−1)α + 2(N−1)/N × M/B</small>
            </div>
          </div>
        </div>
        <div className="lab-notes">
          <div><b>LATENCY-BOUND</b><p>Küçük mesaj + çok rank. Tree algoritması veya toplu gönderim düşün.</p></div>
          <div><b>BANDWIDTH-BOUND</b><p>Büyük mesaj. Ring ve çoklu kanal ile linkleri doldur.</p></div>
          <div><b>TOPOLOGY-BOUND</b><p>Yavaş PCIe geçişi ya da yanlış NIC affinity. Önce yolu ölç.</p></div>
        </div>
      </section>

      <section className="section glossary-section">
        <div className="glossary-head"><span className="section-index">05 / SAHA KILAVUZU</span><h2>Hızlı referans.</h2></div>
        <div className="glossary-grid">
          {glossary.map(([term, desc]) => <article key={term}><span>↳</span><h3>{term}</h3><p>{desc}</p></article>)}
        </div>
        <div className="decision-card">
          <div><span className="micro-label">KENDİNİ TEST ET</span><h3>8 GPU’lu iki düğümde tensor parallel neden genellikle düğüm içinde tutulur?</h3></div>
          <button type="button" onClick={() => setQuizOpen(!quizOpen)} aria-expanded={quizOpen}>{quizOpen ? "Yanıtı gizle" : "Yanıtı göster"} <span>→</span></button>
          <p className="answer" aria-live="polite" hidden={!quizOpen}>{quizOpen ? "Tensor parallel, katman başına çok sık iletişim kurar. NVLink/NVSwitch genellikle düğümler arası RDMA ağından daha yüksek bant genişliği ve daha düşük gecikme sunar. Bu yüzden TP grubunu yerel tutup DP veya PP’yi düğümler arasında ölçeklemek çoğu topolojide daha verimlidir." : ""}</p>
        </div>
      </section>
      <p className="closing-note">NCCL · MULTI-GPU · RDMA<br />Etkileşimli sistemler başlangıcı</p>

    </section>
  );
}
