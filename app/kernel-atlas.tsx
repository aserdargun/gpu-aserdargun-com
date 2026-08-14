"use client";

import { useEffect, useMemo, useState } from "react";
import type { Locale } from "./i18n";
import KernelForgeEmbedded from "./KernelForgeEmbedded";
import KernelForgeEmbeddedEn from "./KernelForgeEmbedded.en";
import CudaSimtEmbedded from "./CudaSimtEmbedded";
import CudaSimtEmbeddedEn from "./CudaSimtEmbedded.en";
import GpuMemoryEmbedded from "./GpuMemoryEmbedded";
import GpuMemoryEmbeddedEn from "./GpuMemoryEmbedded.en";
import PyTorchTritonEmbedded from "./PyTorchTritonEmbedded";
import PyTorchTritonEmbeddedEn from "./PyTorchTritonEmbedded.en";
import LlmKernelPatternsEmbedded from "./LlmKernelPatternsEmbedded";
import LlmKernelPatternsEmbeddedEn from "./LlmKernelPatternsEmbedded.en";
import KernelSafetyEmbedded from "./KernelSafetyEmbedded";
import KernelSafetyEmbeddedEn from "./KernelSafetyEmbedded.en";
import NsightBenchmarkEmbedded from "./NsightBenchmarkEmbedded";
import NsightBenchmarkEmbeddedEn from "./NsightBenchmarkEmbedded.en";
import CutlassCuteEmbedded from "./CutlassCuteEmbedded";
import CutlassCuteEmbeddedEn from "./CutlassCuteEmbedded.en";
import InferenceSystemsEmbedded from "./InferenceSystemsEmbedded";
import InferenceSystemsEmbeddedEn from "./InferenceSystemsEmbedded.en";
import NcclMultiGpuEmbedded from "./NcclMultiGpuEmbedded";
import NcclMultiGpuEmbeddedEn from "./NcclMultiGpuEmbedded.en";
import GpuSoftwareStackEmbedded from "./GpuSoftwareStackEmbedded";
import GpuSoftwareStackEmbeddedEn from "./GpuSoftwareStackEmbedded.en";

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

const trModules: Module[] = [
  {
    id: "toolchain",
    index: "01",
    title: "Mühendislik Temelleri",
    short: "C++ · Linux · Git · CMake",
    phase: "Zemin",
    description: "Kernel geliştirme ortamını modern C++, Python, Linux, Git ve hedef tabanlı CMake ile sağlamlaştır.",
    concepts: ["RAII ve nesne yaşam süresi", "Süreçler, borular ve otomasyon", "Tekrarlanabilir derleme ve test"],
    outcome: "Derlenebilir, test edilebilir ve güvenle geri alınabilir bir kernel çalışma alanı kur.",
    tags: ["C++23", "Python", "Linux", "Git", "CMake"],
    accent: "gold",
    kind: "toolchain",
  },
  {
    id: "architecture",
    index: "02",
    title: "Mimari → SIMT → CUDA",
    short: "Izgara · Blok · Warp · Şerit",
    phase: "Zihinsel model",
    description: "CPU denetiminden GPU yürütmesine uzanan hattı; ızgara, blok, warp, iş parçacığı şeridi ve dallanma üzerinden kur.",
    concepts: ["Heterojen yürütme", "SIMT ve dallanma", "Kernel çalıştırma boyutlandırması"],
    outcome: "Bir problem boyutunu güvenli bir ızgaraya çevir ve warp davranışını açıklayabil.",
    tags: ["CUDA", "SIMT", "warp", "çalıştırma"],
    accent: "lime",
    kind: "architecture",
  },
  {
    id: "memory",
    index: "03",
    title: "GPU Bellek Laboratuvarı",
    short: "Birleşik erişim · Bankalar · Doluluk",
    phase: "Veri hareketi",
    description: "Yazmaçtan HBM’e bellek hiyerarşisini, birleşik erişimi, banka çakışmasını ve kaynak baskısını birlikte gör.",
    concepts: ["Bellek hiyerarşisi", "32 B sektörler", "Paylaşılan bellek bankaları"],
    outcome: "Bir erişim deseninin taşıdığı gereksiz veriyi ve doluluk sınırını hesapla.",
    tags: ["HBM", "paylaşılan bellek", "birleşik erişim", "doluluk"],
    accent: "cyan",
    kind: "memory",
  },
  {
    id: "triton",
    index: "04",
    title: "PyTorch + Triton Kernel Laboratuvarı",
    short: "Özel operatör · Otomatik türev · Derleme",
    phase: "Uygulama",
    description: "PyTorch referansından özel operatör sözleşmesine, oradan maskeli Triton kernel’e ilerle.",
    concepts: ["torch.library sözleşmesi", "Program kimliği ve maskeleme", "Otomatik türev ve torch.compile"],
    outcome: "Bir operatörü referans, Triton uygulaması ve entegrasyon testleriyle paketle.",
    tags: ["PyTorch", "Triton", "opcheck", "derleme"],
    accent: "violet",
    kind: "triton",
  },
  {
    id: "operators",
    index: "05",
    title: "LLM Kernel Desenleri",
    short: "GEMM · İndirgeme · Softmax · Dikkat",
    phase: "Operatörler",
    description: "GEMM, indirgeme, softmax, RMSNorm ve dikkat işlemlerini veri hareketi, sayısal kararlılık ve füzyon açısından karşılaştır.",
    concepts: ["Döşeme ve yeniden kullanım", "Kararlı indirgeme", "Çevrimiçi softmax ve füzyon"],
    outcome: "RMSNorm, RoPE, SwiGLU, masked softmax ve KV-cache operatör paketini tasarla.",
    tags: ["GEMM", "RMSNorm", "softmax", "dikkat"],
    accent: "coral",
    kind: "operators",
  },
  {
    id: "correctness",
    index: "06",
    title: "Kernel Doğruluğu ve Güvenliği",
    short: "Referans · Tolerans · Doğrulama",
    phase: "Kanıt",
    description: "“Çalıştı” ile “doğru” arasındaki farkı referans sözleşmesi, tolerans matrisi ve Compute Sanitizer ile kapat.",
    concepts: ["rtol + atol hata bütçesi", "Uç durum matrisi", "Bellek ve yarış dedektörleri"],
    outcome: "Sayısal, bellek ve eşzamanlılık doğruluğu için tekrar kullanılabilir bir kabul kapısı oluştur.",
    tags: ["pytest", "allclose", "memcheck", "racecheck"],
    accent: "green",
    kind: "correctness",
  },
  {
    id: "profiling",
    index: "07",
    title: "Nsight ve Kıyaslama Rehberi",
    short: "Nsight Systems · Nsight Compute · Deney tasarımı",
    phase: "Ölçüm",
    description: "Önce zaman çizelgesini, sonra sıcak kerneli, en son gürültüsü kontrollü karşılaştırmayı kullan.",
    concepts: ["Nsight Systems zaman çizelgesi", "Nsight Compute hipotezi", "Isınma ve yüzdelikler"],
    outcome: "Her optimizasyon için tekrarlanabilir bir kanıt zinciri ve karar kaydı üret.",
    tags: ["Nsight", "çatı çizgisi", "kıyaslama", "yüzdelik"],
    accent: "blue",
    kind: "profiling",
  },
  {
    id: "cutlass",
    index: "08",
    title: "CUTLASS · CuTe · Tensor Core · PTX",
    short: "Soyutlamadan silikona",
    phase: "Derin optimizasyon",
    description: "Bir GEMM’in kütüphane politikasından yerleşim cebirine, PTX komutuna ve Tensor Core yürütmesine inişini izle.",
    concepts: ["CTA/warp/MMA döşemesi", "CuTe yerleşim eşlemesi", "PTX → SASS doğrulaması"],
    outcome: "Profil kanıtına göre doğru soyutlama seviyesini seç ve döşeme maliyetini hesapla.",
    tags: ["CUTLASS", "CuTe", "PTX", "Tensor Core"],
    accent: "pink",
    kind: "cutlass",
  },
  {
    id: "inference",
    index: "09",
    title: "Çıkarım Sistemleri Laboratuvarı",
    short: "vLLM · CUDA Graphs · Nicemleme",
    phase: "Sunum",
    description: "TTFT, ITL, iş hacmi ve VRAM’i aynı sistem resmi içinde değerlendir; kaldıracı darboğaza göre seç.",
    concepts: ["Sürekli toplu işleme", "CUDA Graph yeniden oynatma", "Ağırlık ve KV-cache bütçesi"],
    outcome: "Sabit bir iş yükünde sunum yapılandırmalarını ölç ve kalite güvence sınırıyla karşılaştır.",
    tags: ["vLLM", "TTFT", "ITL", "nicemleme"],
    accent: "lime",
    kind: "inference",
  },
  {
    id: "multigpu",
    index: "10",
    title: "NCCL ve Çoklu GPU Sistemleri",
    short: "Kolektifler · Paralellik · RDMA",
    phase: "Dağıtık sistem",
    description: "Halka ve ağaç kolektiflerini veri, tensor, ardışık düzen ve uzman paralelliği stratejileriyle topoloji üzerinde birleştir.",
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
    description: "Taşınabilir kernel dilinden çok seviyeli derleyici ara gösterimine ve üretim çıkarım motoruna uzanan yığını katmanlarına ayır.",
    concepts: ["HIP yürütme modeli", "MLIR indirgeme hattı", "TensorRT taktikleri ve motoru"],
    outcome: "İyileştirme problemini doğru yazılım katmanına yerleştir ve taşınabilirlik sınırlarını açıkça yaz.",
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
  ["01", "Araç zinciri ve tensor anatomisi", "C++/Linux/CMake ortamı; adım ve yerleşim gözlemi", "Zemin"],
  ["02", "CUDA zihinsel modeli", "Izgara, blok, warp, dallanma ve ilk güvenli kernel", "CUDA"],
  ["03", "Bellek ve birleşik erişim", "HBM, paylaşılan bellek, banka çakışması ve doluluk", "Bellek"],
  ["04", "PyTorch özel operatörü", "torch.library, sahte kernel, opcheck ve ilk Triton kernel", "Entegrasyon"],
  ["05", "RMSNorm ve RoPE", "Referans, adıma duyarlı indeksleme ve CUDA/Triton ikilisi", "Operatör"],
  ["06", "SwiGLU", "Aktivasyon + çarpım füzyonu; yazmaç baskısı", "Operatör"],
  ["07", "Maskeli softmax ve dikkat", "Kararlı indirgeme, maske ve çevrimiçi softmax", "Operatör"],
  ["08", "KV-cache ve doğruluk", "Dağıtma/güncelleme, yarışlar ve geniş test matrisi", "Kanıt"],
  ["09", "Kıyaslama ve Nsight", "Isınma, yüzdelikler, çatı çizgisi ve üç profil çalışması", "Ölçüm"],
  ["10", "CUTLASS ve füzyon", "Döşeme politikası ve ilk uçtan uca birleştirilmiş kernel", "Optimizasyon"],
  ["11", "Çıkarım ve çoklu GPU", "vLLM, CUDA Graphs, NCCL ve iletişim maliyeti", "Sistem"],
  ["12", "Bitirme projesi ve portföy", "TTFT/ITL/iş hacmi raporu, iki %15+ füzyon ve savunma", "Mezuniyet"],
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
    home: "GPU Kernel Atlas ana sayfa", mainNav: "Ana navigasyon", weeks: "12 hafta",
    progress: "İlerleme yüzde", menu: "Atlas menüsünü aç", search: "Atlas içinde ara", command: "Komuta merkezi",
    unified: "11 BİRLEŞİK ATLAS", learningAtlases: "Öğrenme atlasları", localProgress: "YEREL İLERLEME", stored: "Bu cihazda saklanır.",
    eyebrow: "BİRLEŞİK ÖĞRENME SİSTEMİ · 2026", headlineA: "Kernel’i yaz.", headlineB: "Sistemi anla.", headlineC: "Kanıtla.",
    hero: "CUDA’nın ilk warp’ından vLLM serving ve multi-GPU topolojisine kadar 11 etkileşimli atlas, tek bir 12 haftalık GPU Kernel Engineering uygulamasında.",
    start: "Öğrenmeye başla", viewWeeks: "12 haftayı gör", atlasStat: "birleşik atlas", weekStat: "yoğun hafta", operatorStat: "LLM operatörü", gateStat: "kanıt kapısı",
    graph: "ÖĞRENME GRAFİĞİ", online: "ÇEVRİM İÇİ", correctness: "DOĞRULUK", measurement: "ÖLÇÜM", integration: "ENTEGRASYON",
    principle1: "Referans, şekil/dtype matrisi ve sanitizer temizliği olmadan kernel tamamlanmış sayılmaz.", principle2: "Warm-up, quantile, profiler ve kontrollü baseline olmadan hız iddiası kurulmaz.", principle3: "Gerçek hedef; PyTorch, compile ve serving iş yükü içinde çalışan portföy kalitesinde operatördür.",
    map: "ATLAS HARİTASI", mapA: "Tek uygulama.", mapB: "On bir uzmanlık alanı.", mapNote: "Temelden capstone’a ilerleyen rota. Her atlas kendi etkileşimli laboratuvarını, karar modelini ve kabul çıktısını içerir.", done: "TAMAMLANDI",
    route: "12 HAFTALIK YOĞUN ROTA", routeA: "Okuma listesi değil.", routeB: "Üretim sistemi.", routeNote: "Haftada 14–16 saat. Her hafta çalışan kod, doğruluk kanıtı veya ölçüm raporu üretir.",
    graduation: "MEZUNİYET KAPISI", dual: "CUDA/Triton\nçift uygulama", gain: "iki fused kernel\nmedyan kazanç", studies: "Nsight\nincelemesi", report: "vLLM TTFT/ITL/\nthroughput raporu", interview: "mülakat\nsavunması",
    interactive: "ETKİLEŞİMLİ ATLAS", evidence: "ÇIKIŞ KANITI", learned: "Öğrendin mi?", record: "Kanıtını kaydet.", complete: "Atlası tamamla", completed: "✓ Tamamlandı", next: "Sonraki atlas →",
  },
  en: {
    home: "GPU Kernel Atlas home", mainNav: "Main navigation", weeks: "12 weeks",
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

function pct(value: number) {
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

export default function KernelAtlas({ initialLocale }: { initialLocale: Locale }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [completed, setCompleted] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [locale, setLocale] = useState<Locale>(initialLocale);

  useEffect(() => {
    const saved = window.localStorage.getItem("kernel-atlas-completed");
    const requested = new URL(window.location.href).searchParams.get("lang");
    const stored = window.localStorage.getItem("kernel-atlas-language");
    const detected = window.navigator.language.toLowerCase().startsWith("tr") ? "tr" : "en";
    const nextLocale: Locale = requested === "tr" || requested === "en"
      ? requested
      : stored === "tr" || stored === "en"
        ? stored
        : detected;
    window.queueMicrotask(() => {
      if (saved) {
        try {
          setCompleted(JSON.parse(saved));
        } catch {
          window.localStorage.removeItem("kernel-atlas-completed");
        }
      }
      setLocale(nextLocale);
      document.documentElement.lang = nextLocale;
    });
  }, []);

  const modules = locale === "tr" ? trModules : enModules;
  const copy = ui[locale];

  const changeLocale = (next: Locale) => {
    setQuery("");
    setLocale(next);
    window.localStorage.setItem("kernel-atlas-language", next);
    document.documentElement.lang = next;
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
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
          <span><b>GPU KERNEL ATLAS</b><small>{locale === "tr" ? "GPU KERNEL MÜHENDİSLİĞİ" : "GPU KERNEL ENGINEERING"}</small></span>
        </button>
        <nav className="topnav" aria-label={copy.mainNav}>
          <a href="#roadmap" onClick={() => setActiveId(null)}>{copy.weeks}</a>
        </nav>
        <div className="locale-switch" role="group" aria-label={locale === "tr" ? "Dil seçimi" : "Language selection"}>
          <button className={locale === "tr" ? "active" : ""} onClick={() => changeLocale("tr")} aria-pressed={locale === "tr"}>TR</button>
          <button className={locale === "en" ? "active" : ""} onClick={() => changeLocale("en")} aria-pressed={locale === "en"}>EN</button>
        </div>
        <div className="top-progress" aria-label={`${copy.progress} ${progress}`}>
          <span>{completed.length}/11 {locale === "tr" ? "ATLAS" : "ATLASES"}</span><i><b style={{ width: pct(progress) }} /></i>
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
            <span>CUDA</span><span>TRITON</span><span>{locale === "tr" ? "BELLEK" : "MEMORY"}</span><span>{locale === "tr" ? "İŞLEÇ" : "OPS"}</span>
            <strong>GPU<br />KERNEL</strong>
            <span>NSIGHT</span><span>CUTLASS</span><span>{locale === "tr" ? "ÇIKARIM" : "INFERENCE"}</span><span>NCCL</span>
          </div>
          <div className="signal-row"><i /><i /><i /><i /><i /><i /><i /><i /></div>
          <div className="system-readout"><span>{locale === "tr" ? "MİMARİ" : "ARCH"} sm_89</span><span>{locale === "tr" ? "TEMPO 14–16 sa/hafta" : "TRACK 14–16 h/w"}</span><span>{locale === "tr" ? "MOD kanıt-öncelikli" : "MODE evidence-first"}</span></div>
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

function ToolchainLab({ locale }: { locale: Locale }) {
  return locale === "tr" ? <KernelForgeEmbedded /> : <KernelForgeEmbeddedEn />;
}

function ArchitectureLab({ locale }: { locale: Locale }) {
  return locale === "tr" ? <CudaSimtEmbedded /> : <CudaSimtEmbeddedEn />;
}

function MemoryLab({ locale }: { locale: Locale }) {
  return locale === "tr" ? <GpuMemoryEmbedded /> : <GpuMemoryEmbeddedEn />;
}

function TritonLab({ locale }: { locale: Locale }) {
  return locale === "tr" ? <PyTorchTritonEmbedded /> : <PyTorchTritonEmbeddedEn />;
}

function OperatorsLab({ locale }: { locale: Locale }) {
  return locale === "tr" ? <LlmKernelPatternsEmbedded /> : <LlmKernelPatternsEmbeddedEn />;
}

function CorrectnessLab({ locale }: { locale: Locale }) {
  return locale === "tr" ? <KernelSafetyEmbedded /> : <KernelSafetyEmbeddedEn />;
}

function ProfilingLab({ locale }: { locale: Locale }) {
  return locale === "tr" ? <NsightBenchmarkEmbedded /> : <NsightBenchmarkEmbeddedEn />;
}

function CutlassLab({ locale }: { locale: Locale }) {
  return locale === "tr" ? <CutlassCuteEmbedded /> : <CutlassCuteEmbeddedEn />;
}

function InferenceLab({ locale }: { locale: Locale }) {
  return locale === "tr" ? <InferenceSystemsEmbedded /> : <InferenceSystemsEmbeddedEn />;
}

function MultiGpuLab({ locale }: { locale: Locale }) {
  return locale === "tr" ? <NcclMultiGpuEmbedded /> : <NcclMultiGpuEmbeddedEn />;
}

function SystemsLab({ locale }: { locale: Locale }) {
  return locale === "tr" ? <GpuSoftwareStackEmbedded /> : <GpuSoftwareStackEmbeddedEn />;
}
