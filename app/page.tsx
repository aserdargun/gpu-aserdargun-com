"use client";

import { useEffect, useMemo, useState } from "react";
import KernelForgeEmbedded from "./KernelForgeEmbedded";
import CudaSimtEmbedded from "./CudaSimtEmbedded";
import GpuMemoryEmbedded from "./GpuMemoryEmbedded";
import PyTorchTritonEmbedded from "./PyTorchTritonEmbedded";
import LlmKernelPatternsEmbedded from "./LlmKernelPatternsEmbedded";

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

type Locale = "tr" | "en";

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

const trModules: Module[] = [
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

const enModules: Module[] = [
  {
    id: "toolchain", index: "01", title: "Engineering Foundations", short: "C++ · Linux · Git · CMake", phase: "Foundation",
    description: "Strengthen your kernel development environment with modern C++, Python, Linux, Git, and target-based CMake.",
    concepts: ["RAII and object lifetime", "Processes, pipes, and automation", "Reproducible builds and tests"],
    outcome: "Build a kernel workspace that compiles, tests, and rolls back reliably.", tags: ["C++23", "Python", "Linux", "Git", "CMake"], accent: "gold", kind: "toolchain",
  },
  {
    id: "architecture", index: "02", title: "Architecture → SIMT → CUDA", short: "Grid · Block · Warp · Lane", phase: "Mental model",
    description: "Connect CPU control flow to GPU execution through grids, blocks, warps, lanes, and divergence.",
    concepts: ["Heterogeneous execution", "SIMT and divergence", "Kernel launch sizing"],
    outcome: "Translate a problem size into a safe grid and explain its warp behavior.", tags: ["CUDA", "SIMT", "warp", "launch"], accent: "lime", kind: "architecture",
  },
  {
    id: "memory", index: "03", title: "GPU Memory Lab", short: "Coalescing · Banks · Occupancy", phase: "Data movement",
    description: "Explore the hierarchy from registers to HBM, alongside coalescing, bank conflicts, and resource pressure.",
    concepts: ["Memory hierarchy", "32 B sectors", "Shared-memory banks"],
    outcome: "Calculate wasted traffic in an access pattern and identify its occupancy limit.", tags: ["HBM", "shared", "coalescing", "occupancy"], accent: "cyan", kind: "memory",
  },
  {
    id: "triton", index: "04", title: "PyTorch + Triton Kernel Lab", short: "Custom op · Autograd · Compile", phase: "Implementation",
    description: "Move from a PyTorch reference to a custom-operator contract, then to a masked Triton kernel.",
    concepts: ["torch.library contract", "Program ID and masking", "Autograd and torch.compile"],
    outcome: "Package an operator with a reference, Triton implementation, and integration tests.", tags: ["PyTorch", "Triton", "opcheck", "compile"], accent: "violet", kind: "triton",
  },
  {
    id: "operators", index: "05", title: "LLM Kernel Patterns", short: "GEMM · Reduction · Softmax · Attention", phase: "Operators",
    description: "Compare GEMM, reduction, softmax, RMSNorm, and attention through data movement, numerical stability, and fusion.",
    concepts: ["Tiling and reuse", "Stable reduction", "Online softmax and fusion"],
    outcome: "Design an operator pack for RMSNorm, RoPE, SwiGLU, masked softmax, and KV-cache.", tags: ["GEMM", "RMSNorm", "softmax", "attention"], accent: "coral", kind: "operators",
  },
  {
    id: "correctness", index: "06", title: "Kernel Correctness & Safety", short: "Reference · Tolerance · Sanitizer", phase: "Evidence",
    description: "Close the gap between ‘it ran’ and ‘it is correct’ with reference contracts, tolerance matrices, and Compute Sanitizer.",
    concepts: ["rtol + atol error budget", "Edge-case matrix", "Memory and race detectors"],
    outcome: "Create a reusable acceptance gate for numerical, memory, and synchronization correctness.", tags: ["pytest", "allclose", "memcheck", "racecheck"], accent: "green", kind: "correctness",
  },
  {
    id: "profiling", index: "07", title: "Nsight & Benchmark Guide", short: "Systems · Compute · Experiment design", phase: "Measurement",
    description: "Inspect the timeline first, then the hot kernel, and finally compare variants under controlled noise.",
    concepts: ["Nsight Systems timeline", "Nsight Compute hypothesis", "Warm-up and quantiles"],
    outcome: "Produce a reproducible evidence chain and decision record for every optimization.", tags: ["Nsight", "roofline", "benchmark", "quantile"], accent: "blue", kind: "profiling",
  },
  {
    id: "cutlass", index: "08", title: "CUTLASS · CuTe · Tensor Core · PTX", short: "From abstraction to silicon", phase: "Deep optimization",
    description: "Trace a GEMM from library policy through layout algebra and PTX instructions to Tensor Core execution.",
    concepts: ["CTA/warp/MMA tiling", "CuTe layout mapping", "PTX → SASS verification"],
    outcome: "Choose the right abstraction level from profiler evidence and calculate tile cost.", tags: ["CUTLASS", "CuTe", "PTX", "Tensor Core"], accent: "pink", kind: "cutlass",
  },
  {
    id: "inference", index: "09", title: "Inference Systems Lab", short: "vLLM · CUDA Graphs · Quantization", phase: "Serving",
    description: "Evaluate TTFT, ITL, throughput, and VRAM in one system view; choose levers based on the bottleneck.",
    concepts: ["Continuous batching", "CUDA Graph replay", "Weight and KV-cache budgets"],
    outcome: "Measure serving configurations on a fixed workload and compare them with a quality guardrail.", tags: ["vLLM", "TTFT", "ITL", "quantization"], accent: "lime", kind: "inference",
  },
  {
    id: "multigpu", index: "10", title: "NCCL & Multi-GPU Systems", short: "Collectives · Parallelism · RDMA", phase: "Distributed system",
    description: "Combine ring and tree collectives with data, tensor, pipeline, and expert parallel strategies on real topologies.",
    concepts: ["AllReduce cost", "Choosing DP/TP/PP/EP", "GPUDirect RDMA data path"],
    outcome: "Choose a parallelism strategy that splits the actual bottleneck, not just the model.", tags: ["NCCL", "AllReduce", "NVLink", "RDMA"], accent: "cyan", kind: "multigpu",
  },
  {
    id: "systems", index: "11", title: "GPU Software Stack", short: "ROCm/HIP · MLIR · TensorRT", phase: "Ecosystem",
    description: "Separate the stack from portable kernel languages through multi-level compiler IR to production inference engines.",
    concepts: ["HIP execution model", "MLIR lowering pipeline", "TensorRT tactics and engines"],
    outcome: "Place an optimization problem in the correct software layer and state portability boundaries explicitly.", tags: ["ROCm", "HIP", "MLIR", "TensorRT"], accent: "orange", kind: "systems",
  },
];

const trWeeks = [
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

const enWeeks = [
  ["01", "Toolchain & tensor anatomy", "C++/Linux/CMake environment; inspect strides and layouts", "Foundation"],
  ["02", "CUDA mental model", "Grid, block, warp, divergence, and the first safe kernel", "CUDA"],
  ["03", "Memory & coalescing", "HBM, shared memory, bank conflicts, and occupancy", "Memory"],
  ["04", "PyTorch custom operator", "torch.library, fake kernels, opcheck, and a first Triton kernel", "Integration"],
  ["05", "RMSNorm & RoPE", "Reference, stride-aware indexing, and CUDA/Triton twins", "Operator"],
  ["06", "SwiGLU", "Activation + multiply fusion; register pressure", "Operator"],
  ["07", "Masked softmax & attention", "Stable reduction, masking, and online softmax", "Operator"],
  ["08", "KV-cache & correctness", "Scatter/update, races, and a broad test matrix", "Evidence"],
  ["09", "Benchmark & Nsight", "Warm-up, quantiles, roofline, and three profile studies", "Measurement"],
  ["10", "CUTLASS & fusion", "Tile policy and the first end-to-end fused kernel", "Optimization"],
  ["11", "Inference & multi-GPU", "vLLM, CUDA Graphs, NCCL, and communication cost", "Systems"],
  ["12", "Capstone & portfolio", "TTFT/ITL/throughput report, two 15%+ fusions, and defense", "Graduation"],
];

const ui = {
  tr: {
    home: "Kernel Atlas ana sayfa", mainNav: "Ana navigasyon", overview: "Genel bakış", weeks: "12 hafta",
    progress: "İlerleme yüzde", menu: "Atlas menüsünü aç", search: "Atlas içinde ara", command: "Komuta merkezi",
    unified: "11 BİRLEŞİK ATLAS", learningAtlases: "Öğrenme atlasları", localProgress: "YEREL İLERLEME", stored: "Bu cihazda saklanır.",
    eyebrow: "BİRLEŞİK ÖĞRENME SİSTEMİ · 2026", headlineA: "Kernel’i yaz.", headlineB: "Sistemi anla.", headlineC: "Kanıtla.",
    hero: "CUDA’nın ilk warp’ından vLLM serving ve multi-GPU topolojisine kadar 11 etkileşimli atlas, tek bir 12 haftalık GPU Kernel Engineering uygulamasında.",
    start: "Öğrenmeye başla", viewWeeks: "12 haftayı gör", atlasStat: "birleşik atlas", weekStat: "yoğun hafta", operatorStat: "LLM operatörü", gateStat: "kanıt kapısı",
    graph: "LEARNING GRAPH", online: "ONLINE", correctness: "DOĞRULUK", measurement: "ÖLÇÜM", integration: "ENTEGRASYON",
    principle1: "Referans, şekil/dtype matrisi ve sanitizer temizliği olmadan kernel tamamlanmış sayılmaz.", principle2: "Warm-up, quantile, profiler ve kontrollü baseline olmadan hız iddiası kurulmaz.", principle3: "Gerçek hedef; PyTorch, compile ve serving iş yükü içinde çalışan portföy kalitesinde operatördür.",
    map: "ATLAS HARİTASI", mapA: "Tek uygulama.", mapB: "On bir uzmanlık alanı.", mapNote: "Temelden capstone’a ilerleyen rota. Her atlas kendi etkileşimli laboratuvarını, karar modelini ve kabul çıktısını içerir.", done: "TAMAMLANDI",
    route: "12 HAFTALIK YOĞUN ROTA", routeA: "Okuma listesi değil.", routeB: "Üretim sistemi.", routeNote: "Haftada 14–16 saat. Her hafta çalışan kod, doğruluk kanıtı veya ölçüm raporu üretir.",
    graduation: "MEZUNİYET KAPISI", dual: "CUDA/Triton\nçift uygulama", gain: "iki fused kernel\nmedyan kazanç", studies: "Nsight\nincelemesi", report: "vLLM TTFT/ITL/\nthroughput raporu", interview: "mülakat\nsavunması",
    interactive: "ETKİLEŞİMLİ ATLAS", evidence: "ÇIKIŞ KANITI", learned: "Öğrendin mi?", record: "Kanıtını kaydet.", complete: "Atlası tamamla", completed: "✓ Tamamlandı", next: "Sonraki atlas →",
  },
  en: {
    home: "Kernel Atlas home", mainNav: "Main navigation", overview: "Overview", weeks: "12 weeks",
    progress: "Progress percent", menu: "Open atlas menu", search: "Search the atlas", command: "Command center",
    unified: "11 UNIFIED ATLASES", learningAtlases: "Learning atlases", localProgress: "LOCAL PROGRESS", stored: "Stored on this device.",
    eyebrow: "UNIFIED LEARNING SYSTEM · 2026", headlineA: "Write the kernel.", headlineB: "Understand the system.", headlineC: "Prove it.",
    hero: "Eleven interactive atlases—from your first CUDA warp to vLLM serving and multi-GPU topologies—in one 12-week GPU Kernel Engineering application.",
    start: "Start learning", viewWeeks: "View the 12 weeks", atlasStat: "unified atlases", weekStat: "intensive weeks", operatorStat: "LLM operators", gateStat: "evidence gates",
    graph: "LEARNING GRAPH", online: "ONLINE", correctness: "CORRECTNESS", measurement: "MEASUREMENT", integration: "INTEGRATION",
    principle1: "A kernel is not complete without a reference, a shape/dtype matrix, and clean sanitizer results.", principle2: "No performance claim without warm-up, quantiles, profiler evidence, and a controlled baseline.", principle3: "The real goal is a portfolio-grade operator that works in PyTorch, compile, and serving workloads.",
    map: "ATLAS MAP", mapA: "One application.", mapB: "Eleven domains.", mapNote: "A route from foundations to capstone. Every atlas includes an interactive lab, a decision model, and an acceptance artifact.", done: "COMPLETED",
    route: "12-WEEK INTENSIVE ROUTE", routeA: "Not a reading list.", routeB: "A production system.", routeNote: "14–16 hours per week. Every week produces working code, correctness evidence, or a measurement report.",
    graduation: "GRADUATION GATE", dual: "CUDA/Triton\ndual implementation", gain: "median gain across\ntwo fused kernels", studies: "Nsight\nstudies", report: "vLLM TTFT/ITL/\nthroughput report", interview: "interview\ndefense",
    interactive: "INTERACTIVE ATLAS", evidence: "EXIT EVIDENCE", learned: "Did you learn it?", record: "Record the evidence.", complete: "Complete atlas", completed: "✓ Completed", next: "Next atlas →",
  },
} as const;

const toolchainTracks = {
  "Modern C++": ["Derleme modeli & ABI", "RAII, ownership & move", "Templates, concepts & constexpr"],
  Python: ["Veri modeli & typing", "Iterator ve context manager", "Paketleme, test & profiling"],
  "Linux & Bash": ["Process, signal & pipe", "Quoting ve güvenli scripting", "Loglar, ağ ve performans gözlemi"],
  Git: ["Object modeli & üç alan", "Merge, rebase & revert", "Bisect, reflog & kurtarma"],
  CMake: ["Target & usage requirements", "Presets & toolchains", "CTest, install & package"],
};

const enToolchainTracks = {
  "Modern C++": ["Compilation model & ABI", "RAII, ownership & move", "Templates, concepts & constexpr"],
  Python: ["Data model & typing", "Iterators and context managers", "Packaging, testing & profiling"],
  "Linux & Bash": ["Processes, signals & pipes", "Quoting and safe scripting", "Logs, networking & performance inspection"],
  Git: ["Object model & three trees", "Merge, rebase & revert", "Bisect, reflog & recovery"],
  CMake: ["Targets & usage requirements", "Presets & toolchains", "CTest, install & package"],
};

const operatorData = {
  GEMM: ["Cᵢⱼ = Σₖ Aᵢₖ · Bₖⱼ", "Tile’ları hızlı bellekte yeniden kullan; arithmetic intensity’yi yükselt.", "CTA → warp → MMA tile"],
  Reduction: ["y = x₀ ⊕ x₁ ⊕ … ⊕ xₙ₋₁", "Dengeli bir birleşim ağacı kur; senkronizasyon ve sayısal sırayı kontrol et.", "warp shuffle → block → grid"],
  Softmax: ["pᵢ = exp(xᵢ − m) / Σⱼ exp(xⱼ − m)", "Önce maksimumu çıkar; satır reduction’larını fuse etmeyi hedefle.", "max → exp-sum → normalize"],
  RMSNorm: ["y = γ ⊙ x / √(mean(x²) + ε)", "Kareler toplamını reduce et, girdiyi register’dan normalize edip tek geçişte yaz.", "load → reduce → scale → store"],
  Attention: ["O = softmax(QKᵀ / √d + mask) · V", "S×S skor matrisini HBM’e yazmadan online softmax ile tile’lar üzerinde ilerle.", "QK tile → online softmax → PV"],
};

const enOperatorData = {
  GEMM: ["Cᵢⱼ = Σₖ Aᵢₖ · Bₖⱼ", "Reuse tiles in fast memory to raise arithmetic intensity.", "CTA → warp → MMA tile"],
  Reduction: ["y = x₀ ⊕ x₁ ⊕ … ⊕ xₙ₋₁", "Build a balanced reduction tree; control synchronization and numerical order.", "warp shuffle → block → grid"],
  Softmax: ["pᵢ = exp(xᵢ − m) / Σⱼ exp(xⱼ − m)", "Subtract the maximum first; aim to fuse row reductions.", "max → exp-sum → normalize"],
  RMSNorm: ["y = γ ⊙ x / √(mean(x²) + ε)", "Reduce the sum of squares, then normalize from registers and write in one pass.", "load → reduce → scale → store"],
  Attention: ["O = softmax(QKᵀ / √d + mask) · V", "Advance over tiles with online softmax without materializing the S×S score matrix in HBM.", "QK tile → online softmax → PV"],
};

function pct(value: number) {
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

export default function Home() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [completed, setCompleted] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [locale, setLocale] = useState<Locale>("tr");

  useEffect(() => {
    const saved = window.localStorage.getItem("kernel-atlas-completed");
    const requested = new URLSearchParams(window.location.search).get("lang");
    const preferred = window.localStorage.getItem("kernel-atlas-language");
    const initialLocale = requested === "en" || requested === "tr" ? requested : preferred === "en" || preferred === "tr" ? preferred : navigator.language.toLowerCase().startsWith("tr") ? "tr" : "en";
    window.queueMicrotask(() => {
      if (saved) setCompleted(JSON.parse(saved));
      setLocale(initialLocale);
    });
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const modules = locale === "tr" ? trModules : enModules;
  const copy = ui[locale];

  const changeLocale = (next: Locale) => {
    setLocale(next);
    setQuery("");
    window.localStorage.setItem("kernel-atlas-language", next);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  };

  const filtered = useMemo(() => {
    const localeName = locale === "tr" ? "tr-TR" : "en-US";
    const needle = query.toLocaleLowerCase(localeName);
    return modules.filter((item) => `${item.title} ${item.short} ${item.tags.join(" ")}`.toLocaleLowerCase(localeName).includes(needle));
  }, [locale, modules, query]);

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
        <button className="brand" onClick={() => setActiveId(null)} aria-label={copy.home}>
          <span className="brand-mark">K//A</span>
          <span><b>KERNEL ATLAS</b><small>GPU KERNEL ENGINEERING</small></span>
        </button>
        <nav className="topnav" aria-label={copy.mainNav}>
          <button className={!active ? "active" : ""} onClick={() => setActiveId(null)}>{copy.overview}</button>
          <button onClick={() => openModule("architecture")}>Atlas</button>
          <a href="#roadmap" onClick={() => setActiveId(null)}>{copy.weeks}</a>
        </nav>
        <div className="locale-switch" role="group" aria-label={locale === "tr" ? "Dil seçimi" : "Language selection"}>
          <button className={locale === "tr" ? "active" : ""} onClick={() => changeLocale("tr")} aria-pressed={locale === "tr"}>TR</button>
          <button className={locale === "en" ? "active" : ""} onClick={() => changeLocale("en")} aria-pressed={locale === "en"}>EN</button>
        </div>
        <div className="top-progress" aria-label={`${copy.progress} ${progress}`}>
          <span>{completed.length}/11 ATLAS</span><i><b style={{ width: pct(progress) }} /></i>
        </div>
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label={copy.menu}>≡</button>
      </header>

      <div className="workspace">
        <aside className={menuOpen ? "sidebar open" : "sidebar"}>
          <div className="search-wrap">
            <span>⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} aria-label={copy.search} />
          </div>
          <button className={!active ? "overview-link selected" : "overview-link"} onClick={() => { setActiveId(null); setMenuOpen(false); }}><span>⌂</span><b>{copy.command}</b></button>
          <div className="side-label"><span>{copy.unified}</span><b>{filtered.length}</b></div>
          <nav className="module-nav" aria-label={copy.learningAtlases}>
            {filtered.map((item) => (
              <button key={item.id} onClick={() => openModule(item.id)} className={active?.id === item.id ? "selected" : ""}>
                <span className={`module-dot ${item.accent}`}>{completed.includes(item.id) ? "✓" : item.index}</span>
                <span><b>{item.title}</b><small>{item.short}</small></span>
              </button>
            ))}
          </nav>
          <div className="side-foot">
            <div><span>{copy.localProgress}</span><b>{progress}%</b></div>
            <i><b style={{ width: pct(progress) }} /></i>
            <small>{copy.stored}</small>
          </div>
        </aside>

        <section className="content">
          {active ? (
            <ModulePage module={active} locale={locale} completed={completed.includes(active.id)} onToggle={() => toggleComplete(active.id)} onNext={() => {
              const index = modules.findIndex((item) => item.id === active.id);
              openModule(modules[(index + 1) % modules.length].id);
            }} />
          ) : (
            <Overview locale={locale} modules={modules} onOpen={openModule} completed={completed} />
          )}
        </section>
      </div>
    </main>
  );
}

function Overview({ locale, modules, onOpen, completed }: { locale: Locale; modules: Module[]; onOpen: (id: string) => void; completed: string[] }) {
  const copy = ui[locale];
  const weeks = locale === "tr" ? trWeeks : enWeeks;
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span /> {copy.eyebrow}</div>
          <h1>{copy.headlineA}<br /><em>{copy.headlineB}</em><br />{copy.headlineC}</h1>
          <p>{copy.hero}</p>
          <div className="hero-actions">
            <button className="primary" onClick={() => onOpen("toolchain")}>{copy.start} <span>→</span></button>
            <a className="secondary" href="#roadmap">{copy.viewWeeks}</a>
          </div>
          <div className="hero-stats">
            <div><b>11</b><span>{copy.atlasStat}</span></div>
            <div><b>12</b><span>{copy.weekStat}</span></div>
            <div><b>5</b><span>{copy.operatorStat}</span></div>
            <div><b>3</b><span>{copy.gateStat}</span></div>
          </div>
        </div>
        <div className="hero-system" aria-label={locale === "tr" ? "GPU kernel engineering öğrenme sistemi" : "GPU kernel engineering learning system"}>
          <div className="system-head"><span>{copy.graph}</span><b>{copy.online}</b></div>
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
        <article><span>01</span><div><b>{copy.correctness}</b><p>{copy.principle1}</p></div></article>
        <article><span>02</span><div><b>{copy.measurement}</b><p>{copy.principle2}</p></div></article>
        <article><span>03</span><div><b>{copy.integration}</b><p>{copy.principle3}</p></div></article>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><span>{copy.map}</span><h2>{copy.mapA}<br /><em>{copy.mapB}</em></h2></div><p>{copy.mapNote}</p></div>
        <div className="module-grid">
          {modules.map((item) => (
            <button className={`module-card ${item.accent}`} key={item.id} onClick={() => onOpen(item.id)}>
              <div><span>{item.index} / {item.phase}</span>{completed.includes(item.id) && <b className="done-pill">{copy.done}</b>}</div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <footer><span>{item.tags.slice(0, 3).join(" · ")}</span><b>↗</b></footer>
            </button>
          ))}
        </div>
      </section>

      <section className="roadmap section-block" id="roadmap">
        <div className="section-heading light"><div><span>{copy.route}</span><h2>{copy.routeA}<br /><em>{copy.routeB}</em></h2></div><p>{copy.routeNote}</p></div>
        <div className="week-list">
          {weeks.map((week) => (
            <article key={week[0]}><span>{week[0]}</span><div><b>{week[1]}</b><p>{week[2]}</p></div><em>{week[3]}</em></article>
          ))}
        </div>
        <div className="graduation">
          <span>{copy.graduation}</span>
          <div><b>2×</b><p>{copy.dual}</p></div>
          <div><b>≥15%</b><p>{copy.gain}</p></div>
          <div><b>3</b><p>{copy.studies}</p></div>
          <div><b>1</b><p>{copy.report}</p></div>
          <div><b>≥80%</b><p>{copy.interview}</p></div>
        </div>
      </section>
    </>
  );
}

function ModulePage({ module, locale, completed, onToggle, onNext }: { module: Module; locale: Locale; completed: boolean; onToggle: () => void; onNext: () => void }) {
  const copy = ui[locale];
  return (
    <div className={`module-page ${module.accent}`}>
      <section className="module-hero">
        <div className="module-kicker"><span>{module.index}</span>{module.phase} · {copy.interactive}</div>
        <h1>{module.title}</h1>
        <p>{module.description}</p>
        <div className="tag-row">{module.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
      </section>
      <section className="module-foundation">
        <div className="concept-cards">
          {module.concepts.map((concept, index) => <article key={concept}><span>0{index + 1}</span><b>{concept}</b></article>)}
        </div>
        <aside><span>{copy.evidence}</span><p>{module.outcome}</p></aside>
      </section>
      <Lab kind={module.kind} locale={locale} />
      <section className="module-finish">
        <div><span>ATLAS {module.index} / 11</span><h2>{copy.learned}<br /><em>{copy.record}</em></h2></div>
        <div className="finish-actions">
          <button className={completed ? "complete done" : "complete"} onClick={onToggle}>{completed ? copy.completed : copy.complete}</button>
          <button className="next" onClick={onNext}>{copy.next}</button>
        </div>
      </section>
    </div>
  );
}

function Lab({ kind, locale }: { kind: LabKind; locale: Locale }) {
  if (kind === "toolchain") return <ToolchainLab locale={locale} />;
  if (kind === "architecture") return <ArchitectureLab locale={locale} />;
  if (kind === "memory") return <MemoryLab locale={locale} />;
  if (kind === "triton") return <TritonLab locale={locale} />;
  if (kind === "operators") return <OperatorsLab locale={locale} />;
  if (kind === "correctness") return <CorrectnessLab locale={locale} />;
  if (kind === "profiling") return <ProfilingLab locale={locale} />;
  if (kind === "cutlass") return <CutlassLab locale={locale} />;
  if (kind === "inference") return <InferenceLab locale={locale} />;
  if (kind === "multigpu") return <MultiGpuLab locale={locale} />;
  return <SystemsLab locale={locale} />;
}

function LabShell({ label, title, note, children }: { label: string; title: string; note: string; children: React.ReactNode }) {
  return <section className="lab-shell"><header><div><span>{label}</span><h2>{title}</h2></div><p>{note}</p></header>{children}</section>;
}

function ToolchainLab({ locale }: { locale: Locale }) {
  void locale;
  return <KernelForgeEmbedded />;
}

function ArchitectureLab({ locale }: { locale: Locale }) {
  void locale;
  return <CudaSimtEmbedded />;
}

function MemoryLab({ locale }: { locale: Locale }) {
  void locale;
  return <GpuMemoryEmbedded />;
}

function TritonLab({ locale }: { locale: Locale }) {
  void locale;
  return <PyTorchTritonEmbedded />;
}

function OperatorsLab({ locale }: { locale: Locale }) {
  void locale;
  return <LlmKernelPatternsEmbedded />;
}

function CorrectnessLab({ locale }: { locale: Locale }) {
  const scenarios = [
    ["FP32 reduction", "FP32 reduction", 12.5, 12.500012, 1e-5, 1e-5],
    ["Yanlış indeks", "Wrong index", 4, 4.25, 1e-5, 1e-5],
    ["Sıfıra yakın", "Near zero", 0.000001, 0.000002, 0.000002, 0],
  ] as const;
  const [scenario, setScenario] = useState(0);
  const [tool, setTool] = useState("memcheck");
  const row = scenarios[scenario];
  const error = Math.abs(row[2] - row[3]);
  const threshold = row[4] + row[5] * Math.abs(row[2]);
  const pass = error <= threshold;
  const sanitizerNotes = locale === "tr"
    ? { memcheck: "Sınır dışı ve hizasız erişim", racecheck: "Shared-memory veri yarışı", initcheck: "Başlatılmamış global memory okuması", synccheck: "Geçersiz bariyer kullanımı" }
    : { memcheck: "Out-of-bounds and misaligned access", racecheck: "Shared-memory data race", initcheck: "Uninitialized global-memory read", synccheck: "Invalid barrier use" };
  return <LabShell label="LAB / EVIDENCE GATE" title={locale === "tr" ? "Tolerans sözleşmesini test et." : "Test the tolerance contract."} note={locale === "tr" ? "allclose sayısal yakınlığı ölçer; bellek güvenliğini ayrıca kanıtla." : "allclose measures numerical proximity; prove memory safety separately."}>
    <div className="dual-lab"><div className="lab-panel"><span>{locale === "tr" ? "SAYISAL DOĞRULUK" : "NUMERICAL CORRECTNESS"}</span><h3>{row[locale === "tr" ? 0 : 1]}</h3><div className="segmented vertical">{scenarios.map((item, index) => <button key={item[0]} className={scenario === index ? "active" : ""} onClick={() => setScenario(index)}>{item[locale === "tr" ? 0 : 1]}</button>)}</div><div className={pass ? "verdict pass" : "verdict fail"}><b>{pass ? "PASS" : "FAIL"}</b><span>|a−b| {error.toExponential(2)} · limit {threshold.toExponential(2)}</span></div></div><div className="lab-panel"><span>{locale === "tr" ? "BELLEK & SENKRON" : "MEMORY & SYNC"}</span><h3>Compute Sanitizer</h3><div className="segmented vertical">{["memcheck", "racecheck", "initcheck", "synccheck"].map((name) => <button key={name} className={tool === name ? "active" : ""} onClick={() => setTool(name)}>{name}</button>)}</div><div className="terminal"><code>$ compute-sanitizer --tool {tool}</code><p>{sanitizerNotes[tool as keyof typeof sanitizerNotes]}</p></div></div></div>
  </LabShell>;
}

function ProfilingLab({ locale }: { locale: Locale }) {
  const [lens, setLens] = useState<"Systems" | "Compute" | "Benchmark">("Systems");
  const trCopy = {
    Systems: ["Uygulama neden bekliyor?", "CPU/GPU timeline · copy · launch · idle gap", "Sıcak kerneli ve bekleme bölgesini bul."],
    Compute: ["Kernel neden yavaş?", "Memory workload · occupancy · scheduler · roofline", "Tek bir hipotezi section set ile test et."],
    Benchmark: ["Kazanç gerçek mi?", "Warm-up · median · p95 · aynı ortam", "İki sürümü kontrollü deneyle kıyasla."],
  }[lens];
  const enCopy = {
    Systems: ["Why is the application waiting?", "CPU/GPU timeline · copy · launch · idle gap", "Find the hot kernel and the waiting region."],
    Compute: ["Why is the kernel slow?", "Memory workload · occupancy · scheduler · roofline", "Test one hypothesis with a targeted section set."],
    Benchmark: ["Is the gain real?", "Warm-up · median · p95 · same environment", "Compare two versions in a controlled experiment."],
  }[lens];
  const copy = locale === "tr" ? trCopy : enCopy;
  return <LabShell label="LAB / MEASUREMENT CHAIN" title={locale === "tr" ? "Doğru aracı, doğru soruya bağla." : "Match the right tool to the right question."} note={locale === "tr" ? "Her metriği toplamak yerine belirsizliği sırayla azalt." : "Reduce uncertainty in sequence instead of collecting every metric."}>
    <div className="lens-grid">{(["Systems", "Compute", "Benchmark"] as const).map((name, index) => <button key={name} className={lens === name ? "active" : ""} onClick={() => setLens(name)}><span>0{index + 1}</span><b>Nsight {name}</b><small>{["Timeline", "Kernel metrics", "Controlled experiment"][index]}</small></button>)}</div>
    <div className="evidence-panel"><span>{locale === "tr" ? "AKTİF MERCEK" : "ACTIVE LENS"} · {lens.toUpperCase()}</span><h3>{copy[0]}</h3><code>{copy[1]}</code><p>{copy[2]}</p><div className="fake-chart">{[28, 44, 36, 74, 58, 92, 64, 81, 52, 88, 69, 95].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div></div>
  </LabShell>;
}

function CutlassLab({ locale }: { locale: Locale }) {
  const layers = ["CUTLASS", "CuTe", "PTX", "Tensor Core"] as const;
  const [layer, setLayer] = useState<(typeof layers)[number]>("CuTe");
  const [m, setM] = useState(128);
  const [n, setN] = useState(128);
  const [k, setK] = useState(64);
  const flop = 2 * m * n * k;
  const bytes = 2 * (m * k + k * n + m * n);
  const notes = locale === "tr"
    ? { CUTLASS: "Kernel politikasını ve mainloop + epilogue bileşimini kurar.", CuTe: "Shape, stride ve thread–data eşlemesini layout cebiriyle ifade eder.", PTX: "Derleyici ile makine kodu arasındaki sanal ISA sözleşmesidir.", "Tensor Core": "Warp/warpgroup kolektif küçük matris MAC donanımıdır." }
    : { CUTLASS: "Builds the kernel policy and the mainloop + epilogue composition.", CuTe: "Expresses shapes, strides, and thread-to-data mapping with layout algebra.", PTX: "The virtual ISA contract between the compiler and machine code.", "Tensor Core": "Hardware for warp/warpgroup-level collective small-matrix MAC operations." };
  return <LabShell label="LAB / GEMM DESCENT" title={locale === "tr" ? "Tile’ı değiştir, maliyeti gör." : "Change the tile and inspect its cost."} note={locale === "tr" ? "PTX son söz değildir; hedef GPU’nun SASS çıktısı ve profiler sonucu doğrular." : "PTX is not the final word; verify the target GPU’s SASS and profiler results."}>
    <div className="cutlass-map">{layers.map((name, index) => <button key={name} className={layer === name ? "active" : ""} onClick={() => setLayer(name)}><span>0{index + 1}</span><b>{name}</b><i>↓</i></button>)}</div>
    <div className="tile-lab"><div><Range label="M tile" value={m} min={16} max={256} step={16} onChange={setM} /><Range label="N tile" value={n} min={16} max={256} step={16} onChange={setN} /><Range label="K tile" value={k} min={16} max={128} step={16} onChange={setK} /></div><div className="tile-visual"><span>CTA TILE</span><b>{m} × {n} × {k}</b><div>{Array.from({ length: 48 }, (_, index) => <i key={index} className={index % Math.max(1, Math.round(k / 16)) === 0 ? "hot" : ""} />)}</div></div><aside><p>{notes[layer]}</p><Metric label="FLOP" value={flop.toLocaleString(locale === "tr" ? "tr-TR" : "en-US")} /><Metric label={locale === "tr" ? "Yaklaşık F/B" : "Approx. F/B"} value={(flop / bytes).toFixed(1)} /></aside></div>
  </LabShell>;
}

function InferenceLab({ locale }: { locale: Locale }) {
  const [batching, setBatching] = useState(true);
  const [prefix, setPrefix] = useState(true);
  const [graphs, setGraphs] = useState(true);
  const [goal, setGoal] = useState<"memory" | "latency" | "quality">("memory");
  const throughput = 42 + (batching ? 31 : 0) + (prefix ? 11 : 0) + (graphs ? 8 : 0);
  const ttft = 920 + (batching ? 80 : 0) - (prefix ? 270 : 0) - (graphs ? 90 : 0);
  const advice = locale === "tr"
    ? goal === "memory" ? "INT4/AWQ adayını dene; KV-cache ve workspace’i ayrıca bütçele." : goal === "latency" ? "FP8 + optimize kernel yolunu sabit iş yükünde ölç." : "BF16 taban çizgisini koru; aynı istemlerle kalite karşılaştır."
    : goal === "memory" ? "Try an INT4/AWQ candidate; budget KV-cache and workspace separately." : goal === "latency" ? "Measure the FP8 + optimized-kernel path on a fixed workload." : "Keep the BF16 baseline and compare quality with the same prompts.";
  const goals = locale === "tr" ? [["memory", "Bellek"], ["latency", "Gecikme"], ["quality", "Kalite"]] : [["memory", "Memory"], ["latency", "Latency"], ["quality", "Quality"]];
  return <LabShell label="LAB / SERVING LEVERS" title={locale === "tr" ? "Darboğaza göre kaldıracı seç." : "Choose the lever that matches the bottleneck."} note={locale === "tr" ? "Rakamlar pedagojik modeldir; gerçek serving benchmark’ı değildir." : "Numbers are a pedagogical model, not a real serving benchmark."}>
    <div className="toggle-row">{[["Continuous batching", batching, setBatching], ["Prefix cache", prefix, setPrefix], ["CUDA Graphs", graphs, setGraphs]].map(([name, value, setter]) => <button key={name as string} className={value ? "on" : ""} onClick={() => (setter as (v: boolean) => void)(!value)}><i /><span>{name as string}</span></button>)}</div>
    <div className="metric-grid"><Metric label={locale === "tr" ? "Throughput tahmini" : "Estimated throughput"} value={`${throughput} tok/s`} /><Metric label={locale === "tr" ? "TTFT tahmini" : "Estimated TTFT"} value={`${ttft} ms`} /><Metric label={locale === "tr" ? "İzlenecek decode metriği" : "Decode metric to track"} value="ITL p50 / p95" /><Metric label={locale === "tr" ? "Bellek" : "Memory"} value="weights + KV + workspace" /></div>
    <div className="goal-panel"><div className="segmented">{goals.map(([id, label]) => <button key={id} className={goal === id ? "active" : ""} onClick={() => setGoal(id as typeof goal)}>{label}</button>)}</div><p>{advice}</p></div>
  </LabShell>;
}

function MultiGpuLab({ locale }: { locale: Locale }) {
  const [gpus, setGpus] = useState(8);
  const [payload, setPayload] = useState(4);
  const [bandwidth, setBandwidth] = useState(200);
  const [strategy, setStrategy] = useState<"DP" | "TP" | "PP" | "EP">("TP");
  const ringBytes = 2 * ((gpus - 1) / gpus) * payload;
  const transferMs = ringBytes * 8 * 1000 / bandwidth;
  const strategyCopy = (locale === "tr"
    ? { DP: "Model kopyası + gradient AllReduce", TP: "Katman içi bölme + sık AllReduce/AllGather", PP: "Katman aşamaları + mikro-batch P2P", EP: "MoE uzmanları + All-to-All" }
    : { DP: "Model replicas + gradient AllReduce", TP: "Intra-layer sharding + frequent AllReduce/AllGather", PP: "Layer stages + micro-batch P2P", EP: "MoE experts + All-to-All" })[strategy];
  return <LabShell label="LAB / COLLECTIVE COST" title={locale === "tr" ? "AllReduce maliyetini hesapla." : "Calculate the cost of AllReduce."} note={locale === "tr" ? "Basitleştirilmiş ring modeli; topoloji ve protokol ayrıntıları ayrıca ölçülür." : "Simplified ring model; measure topology and protocol details separately."}>
    <div className="control-grid three"><Range label="GPU" value={gpus} min={2} max={64} step={2} onChange={setGpus} /><Range label="Payload (GB)" value={payload} min={1} max={32} step={1} onChange={setPayload} /><Range label="Link (Gb/s)" value={bandwidth} min={25} max={800} step={25} onChange={setBandwidth} /></div>
    <div className="network-visual">{Array.from({ length: Math.min(12, gpus) }, (_, index) => <span key={index}>GPU {index}</span>)}<i>RING</i></div>
    <div className="metric-grid"><Metric label={locale === "tr" ? "Ring trafik / rank" : "Ring traffic / rank"} value={`${ringBytes.toFixed(1)} GB`} /><Metric label={locale === "tr" ? "İdeal transfer" : "Ideal transfer"} value={`${transferMs.toFixed(1)} ms`} /><Metric label={locale === "tr" ? "Kolektif" : "Collective"} value="ReduceScatter + AllGather" /></div>
    <div className="goal-panel"><div className="segmented">{(["DP", "TP", "PP", "EP"] as const).map((name) => <button key={name} className={strategy === name ? "active" : ""} onClick={() => setStrategy(name)}>{name}</button>)}</div><p>{strategyCopy}</p></div>
  </LabShell>;
}

function SystemsLab({ locale }: { locale: Locale }) {
  const trData = {
    "ROCm & HIP": [["Host", "C++"], ["Grid", "dim3"], ["Kernel", "__global__"], ["Bellek", "HBM → LDS"], ["Senkron", "barrier"]],
    "Compiler & MLIR": [["Frontend", "AST / Graph"], ["Dialect", "linalg / tensor"], ["Transform", "tile + fuse"], ["Lowering", "scf → gpu"], ["Backend", "LLVM / ROCDL"]],
    TensorRT: [["Import", "ONNX"], ["Analyze", "shape + layer"], ["Optimize", "fusion + tactics"], ["Build", "engine.plan"], ["Execute", "enqueueV3"]],
  } as const;
  const enData = {
    "ROCm & HIP": [["Host", "C++"], ["Grid", "dim3"], ["Kernel", "__global__"], ["Memory", "HBM → LDS"], ["Sync", "barrier"]],
    "Compiler & MLIR": [["Frontend", "AST / Graph"], ["Dialect", "linalg / tensor"], ["Transform", "tile + fuse"], ["Lowering", "scf → gpu"], ["Backend", "LLVM / ROCDL"]],
    TensorRT: [["Import", "ONNX"], ["Analyze", "shape + layer"], ["Optimize", "fusion + tactics"], ["Build", "engine.plan"], ["Execute", "enqueueV3"]],
  } as const;
  const data = locale === "tr" ? trData : enData;
  const names = Object.keys(data) as Array<keyof typeof data>;
  const [track, setTrack] = useState<(typeof names)[number]>("Compiler & MLIR");
  const note = locale === "tr"
    ? track === "ROCm & HIP" ? "Kaynak taşınabilirliği performans taşınabilirliği garantisi değildir." : track === "Compiler & MLIR" ? "Çok erken lowering, optimize edilebilir niyeti kaybettirebilir." : "Dynamic shape min/opt/max aralığı bir performans sözleşmesidir."
    : track === "ROCm & HIP" ? "Source portability does not guarantee performance portability." : track === "Compiler & MLIR" ? "Lowering too early can erase optimizable intent." : "The dynamic-shape min/opt/max range is a performance contract.";
  return <LabShell label="LAB / SOFTWARE STACK" title={locale === "tr" ? "Pipeline’ı katmanlarına ayır." : "Separate the pipeline into layers."} note={locale === "tr" ? "Optimizasyon problemini doğru katmana yerleştir." : "Place the optimization problem in the correct layer."}>
    <div className="segmented">{names.map((name) => <button key={name} className={track === name ? "active" : ""} onClick={() => setTrack(name)}>{name}</button>)}</div>
    <div className="stack-pipeline">{data[track].map((step, index) => <article key={step[0]}><span>0{index + 1}</span><b>{step[0]}</b><code>{step[1]}</code>{index < data[track].length - 1 && <i>→</i>}</article>)}</div>
    <div className="lab-callout"><span>{locale === "tr" ? "TAŞINABİLİRLİK SINIRI" : "PORTABILITY BOUNDARY"}</span><p>{note}</p></div>
  </LabShell>;
}

function Range({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  const progress = ((value - min) / (max - min)) * 100;
  return <div className="range"><span><b>{label}</b><output>{value}</output></span><input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} style={{ "--range": `${progress}%` } as React.CSSProperties} /></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><span>{label}</span><b>{value}</b></div>;
}
