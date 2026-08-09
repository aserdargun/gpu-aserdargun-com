"use client";

import { useEffect, useMemo, useState } from "react";

type LabKind =
  | "toolchain"
  | "architecture"
  | "memory"
  | "triton"
  | "operators"
  | "correctness"
  | "profiling"
  | "cutlass"
  | "inference"
  | "multigpu"
  | "systems";

type Module = {
  id: string;
  index: string;
  title: string;
  short: string;
  phase: string;
  description: string;
  concepts: string[];
  outcome: string;
  tags: string[];
  accent: string;
  kind: LabKind;
};

const modules: Module[] = [
  {
    id: "toolchain",
    index: "01",
    title: "Mühendislik Temelleri",
    short: "C++ · Linux · Git · CMake",
    phase: "Zemin",
    description: "Kernel geliştirme ortamını modern C++, Python, Linux, Git ve target tabanlı CMake ile sağlamlaştır.",
    concepts: ["RAII ve yaşam süresi", "Process, pipe ve otomasyon", "Tekrarlanabilir build ve test"],
    outcome: "Derlenebilir, test edilebilir ve geri alınabilir bir kernel çalışma alanı kur.",
    tags: ["C++23", "Python", "Linux", "Git", "CMake"],
    accent: "gold",
    kind: "toolchain",
  },
  {
    id: "architecture",
    index: "02",
    title: "Mimari → SIMT → CUDA",
    short: "Grid · Block · Warp · Lane",
    phase: "Zihinsel model",
    description: "CPU kontrolünden GPU yürütmesine uzanan hattı; grid, block, warp, lane ve divergence üzerinden kur.",
    concepts: ["Heterojen yürütme", "SIMT ve divergence", "Kernel boyutlandırma"],
    outcome: "Bir problem boyutunu güvenli bir grid’e çevir ve warp davranışını açıklayabil.",
    tags: ["CUDA", "SIMT", "warp", "launch"],
    accent: "lime",
    kind: "architecture",
  },
  {
    id: "memory",
    index: "03",
    title: "GPU Bellek Laboratuvarı",
    short: "Coalescing · Banks · Occupancy",
    phase: "Veri hareketi",
    description: "Register’dan HBM’e bellek hiyerarşisini, coalescing’i, bank conflict’i ve kaynak baskısını birlikte gör.",
    concepts: ["Bellek hiyerarşisi", "32 B sektörler", "Shared-memory bank’ları"],
    outcome: "Bir erişim deseninin taşıdığı gereksiz veriyi ve occupancy sınırını hesapla.",
    tags: ["HBM", "shared", "coalescing", "occupancy"],
    accent: "cyan",
    kind: "memory",
  },
  {
    id: "triton",
    index: "04",
    title: "PyTorch + Triton Kernel Lab",
    short: "Custom op · Autograd · Compile",
    phase: "Uygulama",
    description: "PyTorch referansından custom operator sözleşmesine, oradan maskeli Triton kernel’e ilerle.",
    concepts: ["torch.library sözleşmesi", "Program ID ve mask", "Autograd ve torch.compile"],
    outcome: "Bir operatörü referans, Triton uygulaması ve entegrasyon testleriyle paketle.",
    tags: ["PyTorch", "Triton", "opcheck", "compile"],
    accent: "violet",
    kind: "triton",
  },
  {
    id: "operators",
    index: "05",
    title: "LLM Kernel Desenleri",
    short: "GEMM · Reduction · Softmax · Attention",
    phase: "Operatörler",
    description: "GEMM, reduction, softmax, RMSNorm ve attention’ı veri hareketi, sayısal kararlılık ve füzyon açısından karşılaştır.",
    concepts: ["Tiling ve yeniden kullanım", "Kararlı reduction", "Online softmax ve fusion"],
    outcome: "RMSNorm, RoPE, SwiGLU, masked softmax ve KV-cache operatör paketini tasarla.",
    tags: ["GEMM", "RMSNorm", "softmax", "attention"],
    accent: "coral",
    kind: "operators",
  },
  {
    id: "correctness",
    index: "06",
    title: "Kernel Doğruluk & Güvenlik",
    short: "Reference · Tolerance · Sanitizer",
    phase: "Kanıt",
    description: "“Çalıştı” ile “doğru” arasındaki farkı; referans sözleşmesi, tolerans matrisi ve Compute Sanitizer ile kapat.",
    concepts: ["rtol + atol hata bütçesi", "Uç durum matrisi", "Bellek ve yarış dedektörleri"],
    outcome: "Sayısal, bellek ve eşzamanlılık doğruluğu için tekrar kullanılabilir bir kabul kapısı oluştur.",
    tags: ["pytest", "allclose", "memcheck", "racecheck"],
    accent: "green",
    kind: "correctness",
  },
  {
    id: "profiling",
    index: "07",
    title: "Nsight & Benchmark Rehberi",
    short: "Systems · Compute · Deney tasarımı",
    phase: "Ölçüm",
    description: "Önce zaman çizelgesini, sonra sıcak kerneli, en son gürültü kontrollü karşılaştırmayı kullan.",
    concepts: ["Nsight Systems zaman çizelgesi", "Nsight Compute hipotezi", "Warm-up ve quantile"],
    outcome: "Her optimizasyon için tekrarlanabilir bir kanıt zinciri ve karar kaydı üret.",
    tags: ["Nsight", "roofline", "benchmark", "quantile"],
    accent: "blue",
    kind: "profiling",
  },
  {
    id: "cutlass",
    index: "08",
    title: "CUTLASS · CuTe · Tensor Core · PTX",
    short: "Soyutlamadan silikona",
    phase: "Derin optimizasyon",
    description: "Bir GEMM’in kütüphane politikasından layout cebirine, PTX talimatına ve Tensor Core yürütmesine inişini izle.",
    concepts: ["CTA/warp/MMA tiling", "CuTe layout eşlemesi", "PTX → SASS doğrulaması"],
    outcome: "Profiler kanıtına göre doğru soyutlama seviyesini seç ve tile maliyetini hesapla.",
    tags: ["CUTLASS", "CuTe", "PTX", "Tensor Core"],
    accent: "pink",
    kind: "cutlass",
  },
  {
    id: "inference",
    index: "09",
    title: "Inference Systems Lab",
    short: "vLLM · CUDA Graphs · Quantization",
    phase: "Serving",
    description: "TTFT, ITL, throughput ve VRAM’i aynı sistem resmi içinde değerlendir; kaldıracı darboğaza göre seç.",
    concepts: ["Continuous batching", "CUDA Graph replay", "Weight ve KV-cache bütçesi"],
    outcome: "Sabit bir iş yükünde serving konfigürasyonlarını ölç ve kalite guardrail’iyle karşılaştır.",
    tags: ["vLLM", "TTFT", "ITL", "quantization"],
    accent: "lime",
    kind: "inference",
  },
  {
    id: "multigpu",
    index: "10",
    title: "NCCL & Multi-GPU Sistemleri",
    short: "Collectives · Parallelism · RDMA",
    phase: "Dağıtık sistem",
    description: "Ring ve tree kolektiflerini; data, tensor, pipeline ve expert parallel stratejileriyle topoloji üzerinde birleştir.",
    concepts: ["AllReduce maliyeti", "DP/TP/PP/EP seçimi", "GPUDirect RDMA veri yolu"],
    outcome: "Modeli değil, gerçek darboğazı bölen bir paralellik stratejisi seç.",
    tags: ["NCCL", "AllReduce", "NVLink", "RDMA"],
    accent: "cyan",
    kind: "multigpu",
  },
  {
    id: "systems",
    index: "11",
    title: "GPU Yazılım Yığını",
    short: "ROCm/HIP · MLIR · TensorRT",
    phase: "Ekosistem",
    description: "Taşınabilir kernel dilinden çok seviyeli derleyici IR’ına ve üretim inference engine’ine uzanan yığını katmanlarına ayır.",
    concepts: ["HIP yürütme modeli", "MLIR lowering pipeline", "TensorRT tactic ve engine"],
    outcome: "Optimizasyon problemini doğru yazılım katmanına yerleştir ve taşınabilirlik sınırlarını açıkça yaz.",
    tags: ["ROCm", "HIP", "MLIR", "TensorRT"],
    accent: "orange",
    kind: "systems",
  },
];

const weeks = [
  ["01", "Toolchain & tensor anatomisi", "C++/Linux/CMake ortamı; stride ve layout gözlemi", "Zemin"],
  ["02", "CUDA zihinsel modeli", "Grid, block, warp, divergence ve ilk güvenli kernel", "CUDA"],
  ["03", "Bellek & coalescing", "HBM, shared memory, bank conflict ve occupancy", "Bellek"],
  ["04", "PyTorch custom operator", "torch.library, fake kernel, opcheck ve ilk Triton kernel", "Entegrasyon"],
  ["05", "RMSNorm & RoPE", "Referans, stride-aware indeksleme ve CUDA/Triton ikilisi", "Operatör"],
  ["06", "SwiGLU", "Aktivasyon + çarpım füzyonu; register baskısı", "Operatör"],
  ["07", "Masked softmax & attention", "Kararlı reduction, maske ve online softmax", "Operatör"],
  ["08", "KV-cache & doğruluk", "Scatter/update, yarışlar ve geniş test matrisi", "Kanıt"],
  ["09", "Benchmark & Nsight", "Warm-up, quantile, roofline ve üç profil çalışması", "Ölçüm"],
  ["10", "CUTLASS & fusion", "Tile politikası ve ilk uçtan uca fused kernel", "Optimizasyon"],
  ["11", "Inference & multi-GPU", "vLLM, CUDA Graphs, NCCL ve iletişim maliyeti", "Sistem"],
  ["12", "Capstone & portföy", "TTFT/ITL/throughput raporu, iki %15+ füzyon ve savunma", "Mezuniyet"],
];

const toolchainTracks = {
  "Modern C++": ["Derleme modeli & ABI", "RAII, ownership & move", "Templates, concepts & constexpr"],
  Python: ["Veri modeli & typing", "Iterator ve context manager", "Paketleme, test & profiling"],
  "Linux & Bash": ["Process, signal & pipe", "Quoting ve güvenli scripting", "Loglar, ağ ve performans gözlemi"],
  Git: ["Object modeli & üç alan", "Merge, rebase & revert", "Bisect, reflog & kurtarma"],
  CMake: ["Target & usage requirements", "Presets & toolchains", "CTest, install & package"],
};

const operatorData = {
  GEMM: ["Cᵢⱼ = Σₖ Aᵢₖ · Bₖⱼ", "Tile’ları hızlı bellekte yeniden kullan; arithmetic intensity’yi yükselt.", "CTA → warp → MMA tile"],
  Reduction: ["y = x₀ ⊕ x₁ ⊕ … ⊕ xₙ₋₁", "Dengeli bir birleşim ağacı kur; senkronizasyon ve sayısal sırayı kontrol et.", "warp shuffle → block → grid"],
  Softmax: ["pᵢ = exp(xᵢ − m) / Σⱼ exp(xⱼ − m)", "Önce maksimumu çıkar; satır reduction’larını fuse etmeyi hedefle.", "max → exp-sum → normalize"],
  RMSNorm: ["y = γ ⊙ x / √(mean(x²) + ε)", "Kareler toplamını reduce et, girdiyi register’dan normalize edip tek geçişte yaz.", "load → reduce → scale → store"],
  Attention: ["O = softmax(QKᵀ / √d + mask) · V", "S×S skor matrisini HBM’e yazmadan online softmax ile tile’lar üzerinde ilerle.", "QK tile → online softmax → PV"],
};

function pct(value: number) {
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

export default function Home() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [completed, setCompleted] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("kernel-atlas-completed");
    if (saved) setCompleted(JSON.parse(saved));
  }, []);

  const filtered = useMemo(() => {
    const needle = query.toLocaleLowerCase("tr");
    return modules.filter((item) => `${item.title} ${item.short} ${item.tags.join(" ")}`.toLocaleLowerCase("tr").includes(needle));
  }, [query]);

  const active = modules.find((item) => item.id === activeId) ?? null;
  const progress = Math.round((completed.length / modules.length) * 100);

  const openModule = (id: string) => {
    setActiveId(id);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleComplete = (id: string) => {
    const next = completed.includes(id) ? completed.filter((item) => item !== id) : [...completed, id];
    setCompleted(next);
    window.localStorage.setItem("kernel-atlas-completed", JSON.stringify(next));
  };

  return (
    <main className="atlas-app">
      <header className="topbar">
        <button className="brand" onClick={() => setActiveId(null)} aria-label="Kernel Atlas ana sayfa">
          <span className="brand-mark">K//A</span>
          <span><b>KERNEL ATLAS</b><small>GPU KERNEL ENGINEERING</small></span>
        </button>
        <nav className="topnav" aria-label="Ana navigasyon">
          <button className={!active ? "active" : ""} onClick={() => setActiveId(null)}>Genel bakış</button>
          <button onClick={() => openModule("architecture")}>Atlas</button>
          <a href="#roadmap" onClick={() => setActiveId(null)}>12 hafta</a>
        </nav>
        <div className="top-progress" aria-label={`İlerleme yüzde ${progress}`}>
          <span>{completed.length}/11 ATLAS</span><i><b style={{ width: pct(progress) }} /></i>
        </div>
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label="Atlas menüsünü aç">≡</button>
      </header>

      <div className="workspace">
        <aside className={menuOpen ? "sidebar open" : "sidebar"}>
          <div className="search-wrap">
            <span>⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Atlas içinde ara" aria-label="Atlas içinde ara" />
          </div>
          <button className={!active ? "overview-link selected" : "overview-link"} onClick={() => { setActiveId(null); setMenuOpen(false); }}><span>⌂</span><b>Komuta merkezi</b></button>
          <div className="side-label"><span>11 BİRLEŞİK ATLAS</span><b>{filtered.length}</b></div>
          <nav className="module-nav" aria-label="Öğrenme atlasları">
            {filtered.map((item) => (
              <button key={item.id} onClick={() => openModule(item.id)} className={active?.id === item.id ? "selected" : ""}>
                <span className={`module-dot ${item.accent}`}>{completed.includes(item.id) ? "✓" : item.index}</span>
                <span><b>{item.title}</b><small>{item.short}</small></span>
              </button>
            ))}
          </nav>
          <div className="side-foot">
            <div><span>YEREL İLERLEME</span><b>{progress}%</b></div>
            <i><b style={{ width: pct(progress) }} /></i>
            <small>Bu cihazda saklanır.</small>
          </div>
        </aside>

        <section className="content">
          {active ? (
            <ModulePage module={active} completed={completed.includes(active.id)} onToggle={() => toggleComplete(active.id)} onNext={() => {
              const index = modules.findIndex((item) => item.id === active.id);
              openModule(modules[(index + 1) % modules.length].id);
            }} />
          ) : (
            <Overview onOpen={openModule} completed={completed} />
          )}
        </section>
      </div>
    </main>
  );
}

function Overview({ onOpen, completed }: { onOpen: (id: string) => void; completed: string[] }) {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span /> BİRLEŞİK ÖĞRENME SİSTEMİ · 2026</div>
          <h1>Kernel’i yaz.<br /><em>Sistemi anla.</em><br />Kanıtla.</h1>
          <p>CUDA’nın ilk warp’ından vLLM serving ve multi-GPU topolojisine kadar 11 etkileşimli atlas, tek bir 12 haftalık GPU Kernel Engineering uygulamasında.</p>
          <div className="hero-actions">
            <button className="primary" onClick={() => onOpen("toolchain")}>Öğrenmeye başla <span>→</span></button>
            <a className="secondary" href="#roadmap">12 haftayı gör</a>
          </div>
          <div className="hero-stats">
            <div><b>11</b><span>birleşik atlas</span></div>
            <div><b>12</b><span>yoğun hafta</span></div>
            <div><b>5</b><span>LLM operatörü</span></div>
            <div><b>3</b><span>kanıt kapısı</span></div>
          </div>
        </div>
        <div className="hero-system" aria-label="GPU kernel engineering öğrenme sistemi">
          <div className="system-head"><span>LEARNING GRAPH</span><b>ONLINE</b></div>
          <div className="gpu-core">
            <span>CUDA</span><span>TRITON</span><span>MEMORY</span><span>OPS</span>
            <strong>GPU<br />KERNEL</strong>
            <span>NSIGHT</span><span>CUTLASS</span><span>INFERENCE</span><span>NCCL</span>
          </div>
          <div className="signal-row"><i /><i /><i /><i /><i /><i /><i /><i /></div>
          <div className="system-readout"><span>ARCH sm_89</span><span>TRACK 14–16 h/w</span><span>MODE evidence-first</span></div>
        </div>
      </section>

      <section className="principles">
        <article><span>01</span><div><b>DOĞRULUK</b><p>Referans, şekil/dtype matrisi ve sanitizer temizliği olmadan kernel tamamlanmış sayılmaz.</p></div></article>
        <article><span>02</span><div><b>ÖLÇÜM</b><p>Warm-up, quantile, profiler ve kontrollü baseline olmadan hız iddiası kurulmaz.</p></div></article>
        <article><span>03</span><div><b>ENTEGRASYON</b><p>Gerçek hedef; PyTorch, compile ve serving iş yükü içinde çalışan portföy kalitesinde operatördür.</p></div></article>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><span>ATLAS HARİTASI</span><h2>Tek uygulama.<br /><em>On bir uzmanlık alanı.</em></h2></div><p>Temelden capstone’a ilerleyen rota. Her atlas kendi etkileşimli laboratuvarını, karar modelini ve kabul çıktısını içerir.</p></div>
        <div className="module-grid">
          {modules.map((item) => (
            <button className={`module-card ${item.accent}`} key={item.id} onClick={() => onOpen(item.id)}>
              <div><span>{item.index} / {item.phase}</span>{completed.includes(item.id) && <b className="done-pill">TAMAMLANDI</b>}</div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <footer><span>{item.tags.slice(0, 3).join(" · ")}</span><b>↗</b></footer>
            </button>
          ))}
        </div>
      </section>

      <section className="roadmap section-block" id="roadmap">
        <div className="section-heading light"><div><span>12 HAFTALIK YOĞUN ROTA</span><h2>Okuma listesi değil.<br /><em>Üretim sistemi.</em></h2></div><p>Haftada 14–16 saat. Her hafta çalışan kod, doğruluk kanıtı veya ölçüm raporu üretir.</p></div>
        <div className="week-list">
          {weeks.map((week) => (
            <article key={week[0]}><span>{week[0]}</span><div><b>{week[1]}</b><p>{week[2]}</p></div><em>{week[3]}</em></article>
          ))}
        </div>
        <div className="graduation">
          <span>MEZUNİYET KAPISI</span>
          <div><b>2×</b><p>CUDA/Triton<br />çift uygulama</p></div>
          <div><b>≥15%</b><p>iki fused kernel<br />medyan kazanç</p></div>
          <div><b>3</b><p>Nsight<br />incelemesi</p></div>
          <div><b>1</b><p>vLLM TTFT/ITL/<br />throughput raporu</p></div>
          <div><b>≥80%</b><p>mülakat<br />savunması</p></div>
        </div>
      </section>
    </>
  );
}

function ModulePage({ module, completed, onToggle, onNext }: { module: Module; completed: boolean; onToggle: () => void; onNext: () => void }) {
  return (
    <div className={`module-page ${module.accent}`}>
      <section className="module-hero">
        <div className="module-kicker"><span>{module.index}</span>{module.phase} · INTERACTIVE ATLAS</div>
        <h1>{module.title}</h1>
        <p>{module.description}</p>
        <div className="tag-row">{module.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
      </section>
      <section className="module-foundation">
        <div className="concept-cards">
          {module.concepts.map((concept, index) => <article key={concept}><span>0{index + 1}</span><b>{concept}</b></article>)}
        </div>
        <aside><span>ÇIKIŞ KANITI</span><p>{module.outcome}</p></aside>
      </section>
      <Lab kind={module.kind} />
      <section className="module-finish">
        <div><span>ATLAS {module.index} / 11</span><h2>Öğrendin mi?<br /><em>Kanıtını kaydet.</em></h2></div>
        <div className="finish-actions">
          <button className={completed ? "complete done" : "complete"} onClick={onToggle}>{completed ? "✓ Tamamlandı" : "Atlası tamamla"}</button>
          <button className="next" onClick={onNext}>Sonraki atlas →</button>
        </div>
      </section>
    </div>
  );
}

function Lab({ kind }: { kind: LabKind }) {
  if (kind === "toolchain") return <ToolchainLab />;
  if (kind === "architecture") return <ArchitectureLab />;
  if (kind === "memory") return <MemoryLab />;
  if (kind === "triton") return <TritonLab />;
  if (kind === "operators") return <OperatorsLab />;
  if (kind === "correctness") return <CorrectnessLab />;
  if (kind === "profiling") return <ProfilingLab />;
  if (kind === "cutlass") return <CutlassLab />;
  if (kind === "inference") return <InferenceLab />;
  if (kind === "multigpu") return <MultiGpuLab />;
  return <SystemsLab />;
}

function LabShell({ label, title, note, children }: { label: string; title: string; note: string; children: React.ReactNode }) {
  return <section className="lab-shell"><header><div><span>{label}</span><h2>{title}</h2></div><p>{note}</p></header>{children}</section>;
}

function ToolchainLab() {
  const names = Object.keys(toolchainTracks) as Array<keyof typeof toolchainTracks>;
  const [track, setTrack] = useState<(typeof names)[number]>("Modern C++");
  return <LabShell label="LAB / TOOLCHAIN" title="Temeli seç, öğrenme zincirini gör." note="Araç sürümlerinden önce kalıcı zihinsel modelleri kur.">
    <div className="segmented">{names.map((name) => <button key={name} className={track === name ? "active" : ""} onClick={() => setTrack(name)}>{name}</button>)}</div>
    <div className="pipeline-list">{toolchainTracks[track].map((lesson, index) => <article key={lesson}><span>{index + 1}</span><div><b>{lesson}</b><p>{["Modeli kur", "Laboratuvarda boz ve düzelt", "Test ile sözleşmeye bağla"][index]}</p></div><i>→</i></article>)}</div>
    <div className="lab-callout"><span>ÇALIŞMA SÖZLEŞMESİ</span><code>configure → build → test → profile → record</code></div>
  </LabShell>;
}

function ArchitectureLab() {
  const [n, setN] = useState(1000);
  const [block, setBlock] = useState(256);
  const blocks = Math.ceil(n / block);
  const warps = blocks * Math.ceil(block / 32);
  const extra = blocks * block - n;
  return <LabShell label="LAB / LAUNCH GEOMETRY" title="Problemi grid’e dönüştür." note="Her thread bir eleman; son block sınır korumasıyla güvenli.">
    <div className="control-grid">
      <Range label="Problem boyutu N" value={n} min={1} max={4096} step={1} onChange={setN} />
      <Range label="Thread / block" value={block} min={32} max={1024} step={32} onChange={setBlock} />
    </div>
    <div className="metric-grid"><Metric label="Grid" value={`${blocks} block`} /><Metric label="Toplam warp" value={String(warps)} /><Metric label="Guard lane" value={String(extra)} /><Metric label="İndeks" value="blockIdx × blockDim + threadIdx" /></div>
    <div className="warp-strip">{Array.from({ length: 32 }, (_, lane) => <span key={lane} className={lane < Math.max(0, 32 - Math.min(32, extra)) ? "active" : ""}>{lane}</span>)}</div>
    <div className="lab-callout"><span>KRİTİK KURAL</span><p>Block sırasına güvenme. Aynı warp içindeki farklı branch yolları seri maskeler yaratabilir.</p></div>
  </LabShell>;
}

function MemoryLab() {
  const patterns = { Ardışık: 1, "Stride 2": 2, "Stride 4": 4, "Stride 8": 8 };
  const [pattern, setPattern] = useState<keyof typeof patterns>("Ardışık");
  const [bankStride, setBankStride] = useState(1);
  const stride = patterns[pattern];
  const sectors = new Set(Array.from({ length: 32 }, (_, lane) => Math.floor((lane * stride * 4) / 32))).size;
  const efficiency = Math.round(128 / (sectors * 32) * 100);
  const bankDegree = Math.max(1, Math.min(32, bankStride));
  return <LabShell label="LAB / MEMORY TRAFFIC" title="Erişim düzenini değiştir." note="Basitleştirilmiş 4-byte eleman ve 32-byte sektör modeli.">
    <div className="dual-lab">
      <div className="lab-panel"><span>GLOBAL MEMORY</span><h3>Coalescing</h3><div className="segmented vertical">{Object.keys(patterns).map((name) => <button key={name} className={pattern === name ? "active" : ""} onClick={() => setPattern(name as keyof typeof patterns)}>{name}</button>)}</div><div className="big-result"><b>{efficiency}%</b><span>{sectors} × 32 B sektör</span></div></div>
      <div className="lab-panel"><span>SHARED MEMORY</span><h3>Bank conflict</h3><Range label="Kelime stride" value={bankStride} min={1} max={32} step={1} onChange={setBankStride} /><div className="bank-map">{Array.from({ length: 32 }, (_, bank) => <i key={bank} className={bank % bankDegree === 0 ? "hot" : ""}>{bank}</i>)}</div><div className="big-result"><b>{bankDegree}×</b><span>yaklaşık serileşme</span></div></div>
    </div>
    <div className="lab-callout"><span>OKUMA</span><p>Yüksek occupancy tek başına hız değildir; register, shared memory ve yeniden kullanım arasındaki dengeyi profiler ile doğrula.</p></div>
  </LabShell>;
}

function TritonLab() {
  const [tab, setTab] = useState<"PyTorch" | "Triton">("Triton");
  const [block, setBlock] = useState(256);
  const [ran, setRan] = useState(false);
  const code = tab === "Triton" ? `@triton.jit\ndef add_kernel(x, y, out, n: tl.constexpr,\n               BLOCK: tl.constexpr):\n    pid = tl.program_id(0)\n    offsets = pid * BLOCK + tl.arange(0, BLOCK)\n    mask = offsets < n\n    tl.store(out + offsets,\n             tl.load(x + offsets, mask=mask) +\n             tl.load(y + offsets, mask=mask), mask=mask)` : `@custom_op("atlas::add", mutates_args=())\ndef vector_add(x: Tensor, y: Tensor) -> Tensor:\n    return x + y\n\n@vector_add.register_fake\ndef _(x, y):\n    torch._check(x.shape == y.shape)\n    return torch.empty_like(x)`;
  return <LabShell label="LAB / CUSTOM OP" title="Referanstan kernel’e geç." note="Tarayıcıdaki sonuç öğretim simülasyonudur; gerçek GPU benchmark’ı değildir.">
    <div className="code-lab"><div className="code-editor"><div><span>{tab.toLowerCase()}.py</span><div className="segmented mini"><button className={tab === "PyTorch" ? "active" : ""} onClick={() => setTab("PyTorch")}>PyTorch</button><button className={tab === "Triton" ? "active" : ""} onClick={() => setTab("Triton")}>Triton</button></div></div><pre>{code}</pre></div><aside><Range label="BLOCK_SIZE" value={block} min={32} max={1024} step={32} onChange={setBlock} /><button className="run-button" onClick={() => { setRan(false); window.setTimeout(() => setRan(true), 450); }}>Testleri çalıştır</button><div className={ran ? "test-output passed" : "test-output"}><span>{ran ? "PASS" : "READY"}</span><p>{ran ? `opcheck ✓ · odd shape ✓ · BLOCK=${block}` : "Referans ve maskeli kernel karşılaştırılacak."}</p></div></aside></div>
  </LabShell>;
}

function OperatorsLab() {
  const names = Object.keys(operatorData) as Array<keyof typeof operatorData>;
  const [operator, setOperator] = useState<(typeof names)[number]>("RMSNorm");
  const [size, setSize] = useState(2048);
  const data = operatorData[operator];
  return <LabShell label="LAB / OPERATOR PATTERNS" title="Operatörü seç, veri yolunu çöz." note="Aynı building block’lar farklı LLM operatörlerinde tekrar eder.">
    <div className="segmented">{names.map((name) => <button key={name} className={operator === name ? "active" : ""} onClick={() => setOperator(name)}>{name}</button>)}</div>
    <div className="operator-stage"><div><span>FORMÜL</span><code>{data[0]}</code><p>{data[1]}</p></div><aside><Range label="Çalışma boyutu" value={size} min={128} max={8192} step={128} onChange={setSize} /><Metric label="Örnek eleman" value={size.toLocaleString("tr-TR")} /><Metric label="Kernel yolu" value={data[2]} /></aside></div>
    <div className="operator-pack">{["RMSNorm", "Half-split RoPE", "SwiGLU", "Masked softmax", "KV-cache update"].map((name, index) => <span key={name}><b>0{index + 1}</b>{name}</span>)}</div>
  </LabShell>;
}

function CorrectnessLab() {
  const scenarios = [
    ["FP32 reduction", 12.5, 12.500012, 1e-5, 1e-5],
    ["Yanlış indeks", 4, 4.25, 1e-5, 1e-5],
    ["Sıfıra yakın", 0.000001, 0.000002, 0.000002, 0],
  ] as const;
  const [scenario, setScenario] = useState(0);
  const [tool, setTool] = useState("memcheck");
  const row = scenarios[scenario];
  const error = Math.abs(row[1] - row[2]);
  const threshold = row[3] + row[4] * Math.abs(row[1]);
  const pass = error <= threshold;
  return <LabShell label="LAB / EVIDENCE GATE" title="Tolerans sözleşmesini test et." note="allclose sayısal yakınlığı ölçer; bellek güvenliğini ayrıca kanıtla.">
    <div className="dual-lab"><div className="lab-panel"><span>SAYISAL DOĞRULUK</span><h3>{row[0]}</h3><div className="segmented vertical">{scenarios.map((item, index) => <button key={item[0]} className={scenario === index ? "active" : ""} onClick={() => setScenario(index)}>{item[0]}</button>)}</div><div className={pass ? "verdict pass" : "verdict fail"}><b>{pass ? "PASS" : "FAIL"}</b><span>|a−b| {error.toExponential(2)} · limit {threshold.toExponential(2)}</span></div></div><div className="lab-panel"><span>BELLEK & SENKRON</span><h3>Compute Sanitizer</h3><div className="segmented vertical">{["memcheck", "racecheck", "initcheck", "synccheck"].map((name) => <button key={name} className={tool === name ? "active" : ""} onClick={() => setTool(name)}>{name}</button>)}</div><div className="terminal"><code>$ compute-sanitizer --tool {tool}</code><p>{tool === "memcheck" ? "Sınır dışı ve hizasız erişim" : tool === "racecheck" ? "Shared-memory veri yarışı" : tool === "initcheck" ? "Başlatılmamış global memory okuması" : "Geçersiz bariyer kullanımı"}</p></div></div></div>
  </LabShell>;
}

function ProfilingLab() {
  const [lens, setLens] = useState<"Systems" | "Compute" | "Benchmark">("Systems");
  const copy = {
    Systems: ["Uygulama neden bekliyor?", "CPU/GPU timeline · copy · launch · idle gap", "Sıcak kerneli ve bekleme bölgesini bul."],
    Compute: ["Kernel neden yavaş?", "Memory workload · occupancy · scheduler · roofline", "Tek bir hipotezi section set ile test et."],
    Benchmark: ["Kazanç gerçek mi?", "Warm-up · median · p95 · aynı ortam", "İki sürümü kontrollü deneyle kıyasla."],
  }[lens];
  return <LabShell label="LAB / MEASUREMENT CHAIN" title="Doğru aracı, doğru soruya bağla." note="Her metriği toplamak yerine belirsizliği sırayla azalt.">
    <div className="lens-grid">{(["Systems", "Compute", "Benchmark"] as const).map((name, index) => <button key={name} className={lens === name ? "active" : ""} onClick={() => setLens(name)}><span>0{index + 1}</span><b>Nsight {name}</b><small>{["Timeline", "Kernel metrics", "Controlled experiment"][index]}</small></button>)}</div>
    <div className="evidence-panel"><span>AKTİF MERCEK · {lens.toUpperCase()}</span><h3>{copy[0]}</h3><code>{copy[1]}</code><p>{copy[2]}</p><div className="fake-chart">{[28, 44, 36, 74, 58, 92, 64, 81, 52, 88, 69, 95].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div></div>
  </LabShell>;
}

function CutlassLab() {
  const layers = ["CUTLASS", "CuTe", "PTX", "Tensor Core"] as const;
  const [layer, setLayer] = useState<(typeof layers)[number]>("CuTe");
  const [m, setM] = useState(128);
  const [n, setN] = useState(128);
  const [k, setK] = useState(64);
  const flop = 2 * m * n * k;
  const bytes = 2 * (m * k + k * n + m * n);
  const notes = { CUTLASS: "Kernel politikasını ve mainloop + epilogue bileşimini kurar.", CuTe: "Shape, stride ve thread–data eşlemesini layout cebiriyle ifade eder.", PTX: "Derleyici ile makine kodu arasındaki sanal ISA sözleşmesidir.", "Tensor Core": "Warp/warpgroup kolektif küçük matris MAC donanımıdır." };
  return <LabShell label="LAB / GEMM DESCENT" title="Tile’ı değiştir, maliyeti gör." note="PTX son söz değildir; hedef GPU’nun SASS çıktısı ve profiler sonucu doğrular.">
    <div className="cutlass-map">{layers.map((name, index) => <button key={name} className={layer === name ? "active" : ""} onClick={() => setLayer(name)}><span>0{index + 1}</span><b>{name}</b><i>↓</i></button>)}</div>
    <div className="tile-lab"><div><Range label="M tile" value={m} min={16} max={256} step={16} onChange={setM} /><Range label="N tile" value={n} min={16} max={256} step={16} onChange={setN} /><Range label="K tile" value={k} min={16} max={128} step={16} onChange={setK} /></div><div className="tile-visual"><span>CTA TILE</span><b>{m} × {n} × {k}</b><div>{Array.from({ length: 48 }, (_, index) => <i key={index} className={index % Math.max(1, Math.round(k / 16)) === 0 ? "hot" : ""} />)}</div></div><aside><p>{notes[layer]}</p><Metric label="FLOP" value={flop.toLocaleString("tr-TR")} /><Metric label="Yaklaşık F/B" value={(flop / bytes).toFixed(1)} /></aside></div>
  </LabShell>;
}

function InferenceLab() {
  const [batching, setBatching] = useState(true);
  const [prefix, setPrefix] = useState(true);
  const [graphs, setGraphs] = useState(true);
  const [goal, setGoal] = useState<"Bellek" | "Gecikme" | "Kalite">("Bellek");
  const throughput = 42 + (batching ? 31 : 0) + (prefix ? 11 : 0) + (graphs ? 8 : 0);
  const ttft = 920 + (batching ? 80 : 0) - (prefix ? 270 : 0) - (graphs ? 90 : 0);
  const advice = goal === "Bellek" ? "INT4/AWQ adayını dene; KV-cache ve workspace’i ayrıca bütçele." : goal === "Gecikme" ? "FP8 + optimize kernel yolunu sabit iş yükünde ölç." : "BF16 taban çizgisini koru; aynı istemlerle kalite karşılaştır.";
  return <LabShell label="LAB / SERVING LEVERS" title="Darboğaza göre kaldıracı seç." note="Rakamlar pedagojik modeldir; gerçek serving benchmark’ı değildir.">
    <div className="toggle-row">{[["Continuous batching", batching, setBatching], ["Prefix cache", prefix, setPrefix], ["CUDA Graphs", graphs, setGraphs]].map(([name, value, setter]) => <button key={name as string} className={value ? "on" : ""} onClick={() => (setter as (v: boolean) => void)(!value)}><i /><span>{name as string}</span></button>)}</div>
    <div className="metric-grid"><Metric label="Throughput tahmini" value={`${throughput} tok/s`} /><Metric label="TTFT tahmini" value={`${ttft} ms`} /><Metric label="İzlenecek decode metriği" value="ITL p50 / p95" /><Metric label="Bellek" value="weights + KV + workspace" /></div>
    <div className="goal-panel"><div className="segmented">{(["Bellek", "Gecikme", "Kalite"] as const).map((name) => <button key={name} className={goal === name ? "active" : ""} onClick={() => setGoal(name)}>{name}</button>)}</div><p>{advice}</p></div>
  </LabShell>;
}

function MultiGpuLab() {
  const [gpus, setGpus] = useState(8);
  const [payload, setPayload] = useState(4);
  const [bandwidth, setBandwidth] = useState(200);
  const [strategy, setStrategy] = useState<"DP" | "TP" | "PP" | "EP">("TP");
  const ringBytes = 2 * ((gpus - 1) / gpus) * payload;
  const transferMs = ringBytes * 8 * 1000 / bandwidth;
  const strategyCopy = { DP: "Model kopyası + gradient AllReduce", TP: "Katman içi bölme + sık AllReduce/AllGather", PP: "Katman aşamaları + mikro-batch P2P", EP: "MoE uzmanları + All-to-All" }[strategy];
  return <LabShell label="LAB / COLLECTIVE COST" title="AllReduce maliyetini hesapla." note="Basitleştirilmiş ring modeli; topoloji ve protokol ayrıntıları ayrıca ölçülür.">
    <div className="control-grid three"><Range label="GPU" value={gpus} min={2} max={64} step={2} onChange={setGpus} /><Range label="Payload (GB)" value={payload} min={1} max={32} step={1} onChange={setPayload} /><Range label="Link (Gb/s)" value={bandwidth} min={25} max={800} step={25} onChange={setBandwidth} /></div>
    <div className="network-visual">{Array.from({ length: Math.min(12, gpus) }, (_, index) => <span key={index}>GPU {index}</span>)}<i>RING</i></div>
    <div className="metric-grid"><Metric label="Ring trafik / rank" value={`${ringBytes.toFixed(1)} GB`} /><Metric label="İdeal transfer" value={`${transferMs.toFixed(1)} ms`} /><Metric label="Kolektif" value="ReduceScatter + AllGather" /></div>
    <div className="goal-panel"><div className="segmented">{(["DP", "TP", "PP", "EP"] as const).map((name) => <button key={name} className={strategy === name ? "active" : ""} onClick={() => setStrategy(name)}>{name}</button>)}</div><p>{strategyCopy}</p></div>
  </LabShell>;
}

function SystemsLab() {
  const data = {
    "ROCm & HIP": [["Host", "C++"], ["Grid", "dim3"], ["Kernel", "__global__"], ["Bellek", "HBM → LDS"], ["Senkron", "barrier"]],
    "Compiler & MLIR": [["Frontend", "AST / Graph"], ["Dialect", "linalg / tensor"], ["Transform", "tile + fuse"], ["Lowering", "scf → gpu"], ["Backend", "LLVM / ROCDL"]],
    TensorRT: [["Import", "ONNX"], ["Analyze", "shape + layer"], ["Optimize", "fusion + tactics"], ["Build", "engine.plan"], ["Execute", "enqueueV3"]],
  } as const;
  const names = Object.keys(data) as Array<keyof typeof data>;
  const [track, setTrack] = useState<(typeof names)[number]>("Compiler & MLIR");
  const note = track === "ROCm & HIP" ? "Kaynak taşınabilirliği performans taşınabilirliği garantisi değildir." : track === "Compiler & MLIR" ? "Çok erken lowering, optimize edilebilir niyeti kaybettirebilir." : "Dynamic shape min/opt/max aralığı bir performans sözleşmesidir.";
  return <LabShell label="LAB / SOFTWARE STACK" title="Pipeline’ı katmanlarına ayır." note="Optimizasyon problemini doğru katmana yerleştir.">
    <div className="segmented">{names.map((name) => <button key={name} className={track === name ? "active" : ""} onClick={() => setTrack(name)}>{name}</button>)}</div>
    <div className="stack-pipeline">{data[track].map((step, index) => <article key={step[0]}><span>0{index + 1}</span><b>{step[0]}</b><code>{step[1]}</code>{index < data[track].length - 1 && <i>→</i>}</article>)}</div>
    <div className="lab-callout"><span>TAŞINABİLİRLİK SINIRI</span><p>{note}</p></div>
  </LabShell>;
}

function Range({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  const progress = ((value - min) / (max - min)) * 100;
  return <label className="range"><span><b>{label}</b><output>{value}</output></span><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} style={{ "--range": `${progress}%` } as React.CSSProperties} /></label>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><span>{label}</span><b>{value}</b></div>;
}
