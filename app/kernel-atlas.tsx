"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
    outcome: "RMSNorm, RoPE, SwiGLU, maskeli softmax ve KV-cache operatör paketini tasarla.",
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
  ["04", "PyTorch özel operatörü", "torch.library, sahte uygulama, opcheck ve ilk Triton kernel", "Entegrasyon"],
  ["05", "RMSNorm ve RoPE", "Referans, adım duyarlı indeksleme ve CUDA/Triton ikilisi", "Operatör"],
  ["06", "SwiGLU", "Aktivasyon ve çarpım füzyonu; yazmaç baskısı", "Operatör"],
  ["07", "Maskeli softmax ve dikkat", "Kararlı indirgeme, maskeleme ve çevrimiçi softmax", "Operatör"],
  ["08", "KV-cache ve doğruluk", "Dağıtma/güncelleme, yarışlar ve geniş test matrisi", "Kanıt"],
  ["09", "Kıyaslama ve Nsight", "Isınma, yüzdelikler, çatı çizgisi ve üç profil çalışması", "Ölçüm"],
  ["10", "CUTLASS ve füzyon", "Döşeme politikası ve ilk uçtan uca birleşik kernel", "Optimizasyon"],
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
    home: "Kernel Atlas ana sayfası", mainNav: "Ana gezinme", overview: "Genel bakış", weeks: "12 hafta",
    progress: "İlerleme yüzdesi", menu: "Atlas menüsünü aç", search: "Atlas içinde ara", command: "Komuta merkezi",
    unified: "11 BİRLEŞİK ATLAS", learningAtlases: "Öğrenme atlasları", localProgress: "YEREL İLERLEME", stored: "Bu cihazda saklanır.",
    eyebrow: "BİRLEŞİK ÖĞRENME SİSTEMİ · 2026", headlineA: "Kernel’i yaz.", headlineB: "Sistemi anla.", headlineC: "Kanıtla.",
    hero: "CUDA’nın ilk warp’ından vLLM sunumuna ve çoklu GPU topolojisine kadar 11 etkileşimli atlas, tek bir 12 haftalık GPU Kernel Mühendisliği uygulamasında.",
    start: "Öğrenmeye başla", viewWeeks: "12 haftayı gör", atlasStat: "birleşik atlas", weekStat: "yoğun hafta", operatorStat: "LLM operatörü", gateStat: "kanıt kapısı",
    graph: "ÖĞRENME GRAFİĞİ", online: "ÇEVRİMİÇİ", correctness: "DOĞRULUK", measurement: "ÖLÇÜM", integration: "ENTEGRASYON",
    principle1: "Referans, şekil/veri türü matrisi ve temiz doğrulama sonuçları olmadan kernel tamamlanmış sayılmaz.", principle2: "Isınma, yüzdelikler, profil kanıtı ve kontrollü taban çizgisi olmadan hız iddiası kurulmaz.", principle3: "Gerçek hedef, PyTorch derleme ve sunum iş yükleri içinde çalışan portföy kalitesinde bir operatördür.",
    map: "ATLAS HARİTASI", mapA: "Tek uygulama.", mapB: "On bir uzmanlık alanı.", mapNote: "Temelden bitirme projesine ilerleyen rota. Her atlas kendi etkileşimli laboratuvarını, karar modelini ve kabul çıktısını içerir.", done: "TAMAMLANDI",
    route: "12 HAFTALIK YOĞUN ROTA", routeA: "Okuma listesi değil.", routeB: "Üretim sistemi.", routeNote: "Haftada 14–16 saat. Her hafta çalışan kod, doğruluk kanıtı veya ölçüm raporu üretir.",
    graduation: "MEZUNİYET KAPISI", dual: "CUDA/Triton\nçift uygulama", gain: "iki birleşik kernel\nmedyan kazancı", studies: "Nsight\nincelemesi", report: "vLLM TTFT/ITL/\niş hacmi raporu", interview: "mülakat\nsavunması",
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
  "Modern C++": ["Derleme modeli ve ABI", "RAII, sahiplik ve taşıma", "Şablonlar, kavramlar ve constexpr"],
  Python: ["Veri modeli ve türleme", "Yineleyiciler ve bağlam yöneticileri", "Paketleme, test ve profilleme"],
  "Linux ve Bash": ["Süreçler, sinyaller ve borular", "Tırnaklama ve güvenli betik yazımı", "Günlükler, ağ ve performans gözlemi"],
  Git: ["Nesne modeli ve üç alan", "Birleştirme, yeniden temellendirme ve geri alma", "Bisect, reflog ve kurtarma"],
  CMake: ["Hedefler ve kullanım gereksinimleri", "Önayarlar ve araç zincirleri", "CTest, kurulum ve paketleme"],
};

const enToolchainTracks = {
  "Modern C++": ["Compilation model & ABI", "RAII, ownership & move", "Templates, concepts & constexpr"],
  Python: ["Data model & typing", "Iterators and context managers", "Packaging, testing & profiling"],
  "Linux & Bash": ["Processes, signals & pipes", "Quoting and safe scripting", "Logs, networking & performance inspection"],
  Git: ["Object model & three trees", "Merge, rebase & revert", "Bisect, reflog & recovery"],
  CMake: ["Targets & usage requirements", "Presets & toolchains", "CTest, install & package"],
};

const operatorData = {
  GEMM: ["Cᵢⱼ = Σₖ Aᵢₖ · Bₖⱼ", "Döşemeleri hızlı bellekte yeniden kullan; aritmetik yoğunluğu yükselt.", "CTA → warp → MMA döşemesi"],
  İndirgeme: ["y = x₀ ⊕ x₁ ⊕ … ⊕ xₙ₋₁", "Dengeli bir birleşim ağacı kur; eşzamanlamayı ve sayısal sırayı denetle.", "warp karıştırma → blok → ızgara"],
  Softmax: ["pᵢ = exp(xᵢ − m) / Σⱼ exp(xⱼ − m)", "Önce maksimumu çıkar; satır indirgemelerini birleştirmeyi hedefle.", "maksimum → üstel toplam → normalleştir"],
  RMSNorm: ["y = γ ⊙ x / √(mean(x²) + ε)", "Kareler toplamını indirge, girdiyi yazmaçlardan normalleştirip tek geçişte yaz.", "yükle → indirge → ölçekle → yaz"],
  Dikkat: ["O = softmax(QKᵀ / √d + mask) · V", "S×S skor matrisini HBM’e yazmadan çevrimiçi softmax ile döşemeler üzerinde ilerle.", "QK döşemesi → çevrimiçi softmax → PV"],
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

export default function KernelAtlas({ initialLocale }: { initialLocale: Locale }) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [completed, setCompleted] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [locale, setLocale] = useState<Locale>(initialLocale);

  useEffect(() => {
    const saved = window.localStorage.getItem("kernel-atlas-completed");
    window.queueMicrotask(() => {
      if (saved) setCompleted(JSON.parse(saved));
      setLocale(initialLocale);
    });
    window.localStorage.setItem("kernel-atlas-language", initialLocale);
  }, [initialLocale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const modules = locale === "tr" ? trModules : enModules;
  const copy = ui[locale];

  const changeLocale = (next: Locale) => {
    setLocale(next);
    setQuery("");
    window.localStorage.setItem("kernel-atlas-language", next);
    document.cookie = `kernel-atlas-language=${next}; Max-Age=31536000; Path=/; SameSite=Lax`;
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
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
          <span><b>KERNEL ATLAS</b><small>{locale === "tr" ? "GPU KERNEL MÜHENDİSLİĞİ" : "GPU KERNEL ENGINEERING"}</small></span>
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
            <span>CUDA</span><span>TRITON</span><span>{locale === "tr" ? "BELLEK" : "MEMORY"}</span><span>{locale === "tr" ? "OPERATÖRLER" : "OPS"}</span>
            <strong>GPU<br />KERNEL</strong>
            <span>NSIGHT</span><span>CUTLASS</span><span>{locale === "tr" ? "ÇIKARIM" : "INFERENCE"}</span><span>NCCL</span>
          </div>
          <div className="signal-row"><i /><i /><i /><i /><i /><i /><i /><i /></div>
          <div className="system-readout"><span>{locale === "tr" ? "MİMARİ sm_89" : "ARCH sm_89"}</span><span>{locale === "tr" ? "PROGRAM 14–16 sa/hafta" : "TRACK 14–16 h/w"}</span><span>{locale === "tr" ? "YAKLAŞIM kanıt-öncelikli" : "MODE evidence-first"}</span></div>
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
  const tracks = locale === "tr" ? toolchainTracks : enToolchainTracks;
  const names = Object.keys(tracks) as Array<keyof typeof tracks>;
  const [track, setTrack] = useState<(typeof names)[number]>("Modern C++");
  const lessonSteps = locale === "tr" ? ["Modeli kur", "Laboratuvarda boz ve düzelt", "Test ile sözleşmeye bağla"] : ["Build the model", "Break and repair it in the lab", "Turn it into a tested contract"];
  return <LabShell label={locale === "tr" ? "LAB / ARAÇ ZİNCİRİ" : "LAB / TOOLCHAIN"} title={locale === "tr" ? "Temeli seç, öğrenme zincirini gör." : "Choose a foundation and trace the learning chain."} note={locale === "tr" ? "Araç sürümlerinden önce kalıcı zihinsel modelleri kur." : "Build durable mental models before chasing tool versions."}>
    <div className="segmented">{names.map((name) => <button key={name} className={track === name ? "active" : ""} onClick={() => setTrack(name)}>{name}</button>)}</div>
    <div className="pipeline-list">{tracks[track].map((lesson, index) => <article key={lesson}><span>{index + 1}</span><div><b>{lesson}</b><p>{lessonSteps[index]}</p></div><i>→</i></article>)}</div>
    <div className="lab-callout"><span>{locale === "tr" ? "ÇALIŞMA SÖZLEŞMESİ" : "WORKFLOW CONTRACT"}</span><code>{locale === "tr" ? "yapılandır → derle → test et → profille → kaydet" : "configure → build → test → profile → record"}</code></div>
  </LabShell>;
}

function ArchitectureLab({ locale }: { locale: Locale }) {
  const [n, setN] = useState(1000);
  const [block, setBlock] = useState(256);
  const blocks = Math.ceil(n / block);
  const warps = blocks * Math.ceil(block / 32);
  const extra = blocks * block - n;
  return <LabShell label={locale === "tr" ? "LAB / ÇALIŞTIRMA GEOMETRİSİ" : "LAB / LAUNCH GEOMETRY"} title={locale === "tr" ? "Problemi ızgaraya dönüştür." : "Map the problem onto a grid."} note={locale === "tr" ? "Her iş parçacığı bir elemanı işler; son blok sınır korumasıyla güvenlidir." : "One element per thread; guard the final block at the boundary."}>
    <div className="control-grid">
      <Range label={locale === "tr" ? "Problem boyutu N" : "Problem size N"} value={n} min={1} max={4096} step={1} onChange={setN} />
      <Range label={locale === "tr" ? "İş parçacığı / blok" : "Threads / block"} value={block} min={32} max={1024} step={32} onChange={setBlock} />
    </div>
    <div className="metric-grid"><Metric label={locale === "tr" ? "Izgara" : "Grid"} value={`${blocks} ${locale === "tr" ? "blok" : "blocks"}`} /><Metric label={locale === "tr" ? "Toplam warp" : "Total warps"} value={String(warps)} /><Metric label={locale === "tr" ? "Koruma şeritleri" : "Guard lanes"} value={String(extra)} /><Metric label={locale === "tr" ? "İndeks" : "Index"} value="blockIdx × blockDim + threadIdx" /></div>
    <div className="warp-strip">{Array.from({ length: 32 }, (_, lane) => <span key={lane} className={lane < Math.max(0, 32 - Math.min(32, extra)) ? "active" : ""}>{lane}</span>)}</div>
    <div className="lab-callout"><span>{locale === "tr" ? "KRİTİK KURAL" : "CRITICAL RULE"}</span><p>{locale === "tr" ? "Blok sırasına güvenme. Aynı warp içindeki farklı dallanma yolları seri maskeler yaratabilir." : "Never rely on block order. Divergent branches within a warp may execute as serialized masks."}</p></div>
  </LabShell>;
}

function MemoryLab({ locale }: { locale: Locale }) {
  const patterns = locale === "tr" ? { Ardışık: 1, "Stride 2": 2, "Stride 4": 4, "Stride 8": 8 } : { Contiguous: 1, "Stride 2": 2, "Stride 4": 4, "Stride 8": 8 };
  const [patternIndex, setPatternIndex] = useState(0);
  const [bankStride, setBankStride] = useState(1);
  const patternNames = Object.keys(patterns);
  const stride = Object.values(patterns)[patternIndex];
  const sectors = new Set(Array.from({ length: 32 }, (_, lane) => Math.floor((lane * stride * 4) / 32))).size;
  const efficiency = Math.round(128 / (sectors * 32) * 100);
  const bankDegree = Math.max(1, Math.min(32, bankStride));
  return <LabShell label={locale === "tr" ? "LAB / BELLEK TRAFİĞİ" : "LAB / MEMORY TRAFFIC"} title={locale === "tr" ? "Erişim düzenini değiştir." : "Change the access pattern."} note={locale === "tr" ? "4 baytlık elemanlar ve 32 baytlık sektörler kullanan basitleştirilmiş model." : "Simplified model with 4-byte elements and 32-byte sectors."}>
    <div className="dual-lab">
      <div className="lab-panel"><span>{locale === "tr" ? "GLOBAL BELLEK" : "GLOBAL MEMORY"}</span><h3>{locale === "tr" ? "Birleşik erişim" : "Coalescing"}</h3><div className="segmented vertical">{patternNames.map((name, index) => <button key={name} className={patternIndex === index ? "active" : ""} onClick={() => setPatternIndex(index)}>{name}</button>)}</div><div className="big-result"><b>{efficiency}%</b><span>{sectors} × 32 B {locale === "tr" ? "sektör" : "sectors"}</span></div></div>
      <div className="lab-panel"><span>{locale === "tr" ? "PAYLAŞILAN BELLEK" : "SHARED MEMORY"}</span><h3>{locale === "tr" ? "Banka çakışması" : "Bank conflict"}</h3><Range label={locale === "tr" ? "Sözcük adımı" : "Word stride"} value={bankStride} min={1} max={32} step={1} onChange={setBankStride} /><div className="bank-map">{Array.from({ length: 32 }, (_, bank) => <i key={bank} className={bank % bankDegree === 0 ? "hot" : ""}>{bank}</i>)}</div><div className="big-result"><b>{bankDegree}×</b><span>{locale === "tr" ? "yaklaşık serileşme" : "approx. serialization"}</span></div></div>
    </div>
    <div className="lab-callout"><span>{locale === "tr" ? "SONUÇ" : "READOUT"}</span><p>{locale === "tr" ? "Yüksek doluluk tek başına hız değildir; yazmaçlar, paylaşılan bellek ve yeniden kullanım arasındaki dengeyi profil aracıyla doğrula." : "High occupancy alone does not guarantee speed; use a profiler to verify the tradeoff among registers, shared memory, and reuse."}</p></div>
  </LabShell>;
}

function TritonLab({ locale }: { locale: Locale }) {
  const [tab, setTab] = useState<"PyTorch" | "Triton">("Triton");
  const [block, setBlock] = useState(256);
  const [ran, setRan] = useState(false);
  const code = tab === "Triton" ? `@triton.jit\ndef add_kernel(x, y, out, n: tl.constexpr,\n               BLOCK: tl.constexpr):\n    pid = tl.program_id(0)\n    offsets = pid * BLOCK + tl.arange(0, BLOCK)\n    mask = offsets < n\n    tl.store(out + offsets,\n             tl.load(x + offsets, mask=mask) +\n             tl.load(y + offsets, mask=mask), mask=mask)` : `@custom_op("atlas::add", mutates_args=())\ndef vector_add(x: Tensor, y: Tensor) -> Tensor:\n    return x + y\n\n@vector_add.register_fake\ndef _(x, y):\n    torch._check(x.shape == y.shape)\n    return torch.empty_like(x)`;
  return <LabShell label={locale === "tr" ? "LAB / ÖZEL OPERATÖR" : "LAB / CUSTOM OP"} title={locale === "tr" ? "Referanstan kernel’e geç." : "Move from reference to kernel."} note={locale === "tr" ? "Tarayıcıdaki sonuç bir öğretim simülasyonudur; gerçek GPU kıyaslaması değildir." : "The browser result is an educational simulation, not a real GPU benchmark."}>
    <div className="code-lab"><div className="code-editor"><div><span>{tab.toLowerCase()}.py</span><div className="segmented mini"><button className={tab === "PyTorch" ? "active" : ""} onClick={() => setTab("PyTorch")}>PyTorch</button><button className={tab === "Triton" ? "active" : ""} onClick={() => setTab("Triton")}>Triton</button></div></div><pre>{code}</pre></div><aside><Range label="BLOCK_SIZE" value={block} min={32} max={1024} step={32} onChange={setBlock} /><button className="run-button" onClick={() => { setRan(false); window.setTimeout(() => setRan(true), 450); }}>{locale === "tr" ? "Testleri çalıştır" : "Run tests"}</button><div className={ran ? "test-output passed" : "test-output"}><span>{locale === "tr" ? ran ? "GEÇTİ" : "HAZIR" : ran ? "PASS" : "READY"}</span><p>{ran ? locale === "tr" ? `opcheck ✓ · tek sayılı boyut ✓ · BLOK=${block}` : `opcheck ✓ · odd shape ✓ · BLOCK=${block}` : locale === "tr" ? "Referans ve maskeli kernel karşılaştırılacak." : "The reference and masked kernel will be compared."}</p></div></aside></div>
  </LabShell>;
}

function OperatorsLab({ locale }: { locale: Locale }) {
  const operators = locale === "tr" ? operatorData : enOperatorData;
  const names = Object.keys(operators) as Array<keyof typeof operators>;
  const [operator, setOperator] = useState<(typeof names)[number]>("RMSNorm");
  const [size, setSize] = useState(2048);
  const data = operators[operator];
  return <LabShell label={locale === "tr" ? "LAB / OPERATÖR DESENLERİ" : "LAB / OPERATOR PATTERNS"} title={locale === "tr" ? "Operatörü seç, veri yolunu çöz." : "Choose an operator and trace its data path."} note={locale === "tr" ? "Aynı yapı taşları farklı LLM operatörlerinde tekrar eder." : "The same building blocks recur across LLM operators."}>
    <div className="segmented">{names.map((name) => <button key={name} className={operator === name ? "active" : ""} onClick={() => setOperator(name)}>{name}</button>)}</div>
    <div className="operator-stage"><div><span>{locale === "tr" ? "FORMÜL" : "FORMULA"}</span><code>{data[0]}</code><p>{data[1]}</p></div><aside><Range label={locale === "tr" ? "Çalışma boyutu" : "Working size"} value={size} min={128} max={8192} step={128} onChange={setSize} /><Metric label={locale === "tr" ? "Örnek eleman" : "Example elements"} value={size.toLocaleString(locale === "tr" ? "tr-TR" : "en-US")} /><Metric label={locale === "tr" ? "Kernel yolu" : "Kernel path"} value={data[2]} /></aside></div>
    <div className="operator-pack">{(locale === "tr" ? ["RMSNorm", "Yarı bölmeli RoPE", "SwiGLU", "Maskeli softmax", "KV-cache güncellemesi"] : ["RMSNorm", "Half-split RoPE", "SwiGLU", "Masked softmax", "KV-cache update"]).map((name, index) => <span key={name}><b>0{index + 1}</b>{name}</span>)}</div>
  </LabShell>;
}

function CorrectnessLab({ locale }: { locale: Locale }) {
  const scenarios = [
    ["FP32 indirgeme", "FP32 reduction", 12.5, 12.500012, 1e-5, 1e-5],
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
    ? { memcheck: "Sınır dışı ve hizasız erişim", racecheck: "Paylaşılan bellek veri yarışı", initcheck: "Başlatılmamış global bellek okuması", synccheck: "Geçersiz bariyer kullanımı" }
    : { memcheck: "Out-of-bounds and misaligned access", racecheck: "Shared-memory data race", initcheck: "Uninitialized global-memory read", synccheck: "Invalid barrier use" };
  return <LabShell label={locale === "tr" ? "LAB / KANIT KAPISI" : "LAB / EVIDENCE GATE"} title={locale === "tr" ? "Tolerans sözleşmesini test et." : "Test the tolerance contract."} note={locale === "tr" ? "allclose sayısal yakınlığı ölçer; bellek güvenliğini ayrıca kanıtla." : "allclose measures numerical proximity; prove memory safety separately."}>
    <div className="dual-lab"><div className="lab-panel"><span>{locale === "tr" ? "SAYISAL DOĞRULUK" : "NUMERICAL CORRECTNESS"}</span><h3>{row[locale === "tr" ? 0 : 1]}</h3><div className="segmented vertical">{scenarios.map((item, index) => <button key={item[0]} className={scenario === index ? "active" : ""} onClick={() => setScenario(index)}>{item[locale === "tr" ? 0 : 1]}</button>)}</div><div className={pass ? "verdict pass" : "verdict fail"}><b>{locale === "tr" ? pass ? "GEÇTİ" : "KALDI" : pass ? "PASS" : "FAIL"}</b><span>|a−b| {error.toExponential(2)} · {locale === "tr" ? "sınır" : "limit"} {threshold.toExponential(2)}</span></div></div><div className="lab-panel"><span>{locale === "tr" ? "BELLEK VE EŞZAMANLAMA" : "MEMORY & SYNC"}</span><h3>Compute Sanitizer</h3><div className="segmented vertical">{["memcheck", "racecheck", "initcheck", "synccheck"].map((name) => <button key={name} className={tool === name ? "active" : ""} onClick={() => setTool(name)}>{name}</button>)}</div><div className="terminal"><code>$ compute-sanitizer --tool {tool}</code><p>{sanitizerNotes[tool as keyof typeof sanitizerNotes]}</p></div></div></div>
  </LabShell>;
}

function ProfilingLab({ locale }: { locale: Locale }) {
  const [lens, setLens] = useState<"Systems" | "Compute" | "Benchmark">("Systems");
  const trCopy = {
    Systems: ["Uygulama neden bekliyor?", "CPU/GPU zaman çizelgesi · kopyalama · çalıştırma · boşluk", "Sıcak kerneli ve bekleme bölgesini bul."],
    Compute: ["Kernel neden yavaş?", "Bellek iş yükü · doluluk · zamanlayıcı · çatı çizgisi", "Tek bir hipotezi hedefli bölüm kümesiyle test et."],
    Benchmark: ["Kazanç gerçek mi?", "Isınma · medyan · p95 · aynı ortam", "İki sürümü kontrollü deneyle kıyasla."],
  }[lens];
  const enCopy = {
    Systems: ["Why is the application waiting?", "CPU/GPU timeline · copy · launch · idle gap", "Find the hot kernel and the waiting region."],
    Compute: ["Why is the kernel slow?", "Memory workload · occupancy · scheduler · roofline", "Test one hypothesis with a targeted section set."],
    Benchmark: ["Is the gain real?", "Warm-up · median · p95 · same environment", "Compare two versions in a controlled experiment."],
  }[lens];
  const copy = locale === "tr" ? trCopy : enCopy;
  const lensLabels = locale === "tr" ? ["Nsight Systems", "Nsight Compute", "Kıyaslama"] : ["Nsight Systems", "Nsight Compute", "Benchmark"];
  const lensNotes = locale === "tr" ? ["Zaman çizelgesi", "Kernel metrikleri", "Kontrollü deney"] : ["Timeline", "Kernel metrics", "Controlled experiment"];
  const activeLens = lensLabels[["Systems", "Compute", "Benchmark"].indexOf(lens)];
  return <LabShell label={locale === "tr" ? "LAB / ÖLÇÜM ZİNCİRİ" : "LAB / MEASUREMENT CHAIN"} title={locale === "tr" ? "Doğru aracı, doğru soruya bağla." : "Match the right tool to the right question."} note={locale === "tr" ? "Her metriği toplamak yerine belirsizliği sırayla azalt." : "Reduce uncertainty in sequence instead of collecting every metric."}>
    <div className="lens-grid">{(["Systems", "Compute", "Benchmark"] as const).map((name, index) => <button key={name} className={lens === name ? "active" : ""} onClick={() => setLens(name)}><span>0{index + 1}</span><b>{lensLabels[index]}</b><small>{lensNotes[index]}</small></button>)}</div>
    <div className="evidence-panel"><span>{locale === "tr" ? "AKTİF MERCEK" : "ACTIVE LENS"} · {activeLens.toUpperCase()}</span><h3>{copy[0]}</h3><code>{copy[1]}</code><p>{copy[2]}</p><div className="fake-chart">{[28, 44, 36, 74, 58, 92, 64, 81, 52, 88, 69, 95].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div></div>
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
    ? { CUTLASS: "Kernel politikasını ve ana döngü + son işlem bileşimini kurar.", CuTe: "Şekil, adım ve iş parçacığı–veri eşlemesini yerleşim cebiriyle ifade eder.", PTX: "Derleyici ile makine kodu arasındaki sanal ISA sözleşmesidir.", "Tensor Core": "Warp/warp grubu düzeyinde kolektif küçük matris MAC donanımıdır." }
    : { CUTLASS: "Builds the kernel policy and the mainloop + epilogue composition.", CuTe: "Expresses shapes, strides, and thread-to-data mapping with layout algebra.", PTX: "The virtual ISA contract between the compiler and machine code.", "Tensor Core": "Hardware for warp/warpgroup-level collective small-matrix MAC operations." };
  return <LabShell label={locale === "tr" ? "LAB / GEMM KATMANLARI" : "LAB / GEMM DESCENT"} title={locale === "tr" ? "Döşemeyi değiştir, maliyeti gör." : "Change the tile and inspect its cost."} note={locale === "tr" ? "PTX son söz değildir; hedef GPU’nun SASS çıktısı ve profil sonucu doğrular." : "PTX is not the final word; verify the target GPU’s SASS and profiler results."}>
    <div className="cutlass-map">{layers.map((name, index) => <button key={name} className={layer === name ? "active" : ""} onClick={() => setLayer(name)}><span>0{index + 1}</span><b>{name}</b><i>↓</i></button>)}</div>
    <div className="tile-lab"><div><Range label={locale === "tr" ? "M döşemesi" : "M tile"} value={m} min={16} max={256} step={16} onChange={setM} /><Range label={locale === "tr" ? "N döşemesi" : "N tile"} value={n} min={16} max={256} step={16} onChange={setN} /><Range label={locale === "tr" ? "K döşemesi" : "K tile"} value={k} min={16} max={128} step={16} onChange={setK} /></div><div className="tile-visual"><span>{locale === "tr" ? "CTA DÖŞEMESİ" : "CTA TILE"}</span><b>{m} × {n} × {k}</b><div>{Array.from({ length: 48 }, (_, index) => <i key={index} className={index % Math.max(1, Math.round(k / 16)) === 0 ? "hot" : ""} />)}</div></div><aside><p>{notes[layer]}</p><Metric label="FLOP" value={flop.toLocaleString(locale === "tr" ? "tr-TR" : "en-US")} /><Metric label={locale === "tr" ? "Yaklaşık F/B" : "Approx. F/B"} value={(flop / bytes).toFixed(1)} /></aside></div>
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
    ? goal === "memory" ? "INT4/AWQ adayını dene; KV-cache ve çalışma alanını ayrıca bütçele." : goal === "latency" ? "FP8 + iyileştirilmiş kernel yolunu sabit iş yükünde ölç." : "BF16 taban çizgisini koru; aynı istemlerle kaliteyi karşılaştır."
    : goal === "memory" ? "Try an INT4/AWQ candidate; budget KV-cache and workspace separately." : goal === "latency" ? "Measure the FP8 + optimized-kernel path on a fixed workload." : "Keep the BF16 baseline and compare quality with the same prompts.";
  const goals = locale === "tr" ? [["memory", "Bellek"], ["latency", "Gecikme"], ["quality", "Kalite"]] : [["memory", "Memory"], ["latency", "Latency"], ["quality", "Quality"]];
  const toggleLabels = locale === "tr" ? ["Sürekli toplu işleme", "Ön ek önbelleği", "CUDA Graphs"] : ["Continuous batching", "Prefix cache", "CUDA Graphs"];
  return <LabShell label={locale === "tr" ? "LAB / ÇIKARIM KALDIRAÇLARI" : "LAB / SERVING LEVERS"} title={locale === "tr" ? "Darboğaza göre kaldıracı seç." : "Choose the lever that matches the bottleneck."} note={locale === "tr" ? "Rakamlar pedagojik bir modeldir; gerçek sunum kıyaslaması değildir." : "Numbers are a pedagogical model, not a real serving benchmark."}>
    <div className="toggle-row">{[[toggleLabels[0], batching, setBatching], [toggleLabels[1], prefix, setPrefix], [toggleLabels[2], graphs, setGraphs]].map(([name, value, setter]) => <button key={name as string} className={value ? "on" : ""} onClick={() => (setter as (v: boolean) => void)(!value)}><i /><span>{name as string}</span></button>)}</div>
    <div className="metric-grid"><Metric label={locale === "tr" ? "İş hacmi tahmini" : "Estimated throughput"} value={`${throughput} tok/s`} /><Metric label={locale === "tr" ? "TTFT tahmini" : "Estimated TTFT"} value={`${ttft} ms`} /><Metric label={locale === "tr" ? "İzlenecek çözümleme metriği" : "Decode metric to track"} value="ITL p50 / p95" /><Metric label={locale === "tr" ? "Bellek" : "Memory"} value={locale === "tr" ? "ağırlıklar + KV + çalışma alanı" : "weights + KV + workspace"} /></div>
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
    ? { DP: "Model kopyaları + gradyan AllReduce", TP: "Katman içi bölme + sık AllReduce/AllGather", PP: "Katman aşamaları + mikro toplu iş P2P", EP: "MoE uzmanları + All-to-All" }
    : { DP: "Model replicas + gradient AllReduce", TP: "Intra-layer sharding + frequent AllReduce/AllGather", PP: "Layer stages + micro-batch P2P", EP: "MoE experts + All-to-All" })[strategy];
  return <LabShell label={locale === "tr" ? "LAB / KOLEKTİF MALİYETİ" : "LAB / COLLECTIVE COST"} title={locale === "tr" ? "AllReduce maliyetini hesapla." : "Calculate the cost of AllReduce."} note={locale === "tr" ? "Basitleştirilmiş halka modeli; topoloji ve protokol ayrıntıları ayrıca ölçülür." : "Simplified ring model; measure topology and protocol details separately."}>
    <div className="control-grid three"><Range label="GPU" value={gpus} min={2} max={64} step={2} onChange={setGpus} /><Range label={locale === "tr" ? "Veri yükü (GB)" : "Payload (GB)"} value={payload} min={1} max={32} step={1} onChange={setPayload} /><Range label={locale === "tr" ? "Bağlantı (Gb/s)" : "Link (Gb/s)"} value={bandwidth} min={25} max={800} step={25} onChange={setBandwidth} /></div>
    <div className="network-visual">{Array.from({ length: Math.min(12, gpus) }, (_, index) => <span key={index}>GPU {index}</span>)}<i>{locale === "tr" ? "HALKA" : "RING"}</i></div>
    <div className="metric-grid"><Metric label={locale === "tr" ? "Halka trafiği / süreç" : "Ring traffic / rank"} value={`${ringBytes.toFixed(1)} GB`} /><Metric label={locale === "tr" ? "İdeal aktarım" : "Ideal transfer"} value={`${transferMs.toFixed(1)} ms`} /><Metric label={locale === "tr" ? "Kolektif" : "Collective"} value="ReduceScatter + AllGather" /></div>
    <div className="goal-panel"><div className="segmented">{(["DP", "TP", "PP", "EP"] as const).map((name) => <button key={name} className={strategy === name ? "active" : ""} onClick={() => setStrategy(name)}>{name}</button>)}</div><p>{strategyCopy}</p></div>
  </LabShell>;
}

function SystemsLab({ locale }: { locale: Locale }) {
  const trData = {
    "ROCm & HIP": [["Ana makine", "C++"], ["Izgara", "dim3"], ["Kernel", "__global__"], ["Bellek", "HBM → LDS"], ["Eşzamanlama", "barrier"]],
    "Compiler & MLIR": [["Ön uç", "AST / Graph"], ["Diyalekt", "linalg / tensor"], ["Dönüşüm", "döşe + birleştir"], ["İndirgeme", "scf → gpu"], ["Arka uç", "LLVM / ROCDL"]],
    TensorRT: [["İçe aktar", "ONNX"], ["Çözümle", "şekil + katman"], ["İyileştir", "füzyon + taktikler"], ["Oluştur", "engine.plan"], ["Çalıştır", "enqueueV3"]],
  } as const;
  const enData = {
    "ROCm & HIP": [["Host", "C++"], ["Grid", "dim3"], ["Kernel", "__global__"], ["Memory", "HBM → LDS"], ["Sync", "barrier"]],
    "Compiler & MLIR": [["Frontend", "AST / Graph"], ["Dialect", "linalg / tensor"], ["Transform", "tile + fuse"], ["Lowering", "scf → gpu"], ["Backend", "LLVM / ROCDL"]],
    TensorRT: [["Import", "ONNX"], ["Analyze", "shape + layer"], ["Optimize", "fusion + tactics"], ["Build", "engine.plan"], ["Execute", "enqueueV3"]],
  } as const;
  const data = locale === "tr" ? trData : enData;
  const names = Object.keys(data) as Array<keyof typeof data>;
  const [track, setTrack] = useState<(typeof names)[number]>("Compiler & MLIR");
  const trackLabels = locale === "tr" ? { "ROCm & HIP": "ROCm ve HIP", "Compiler & MLIR": "Derleyici ve MLIR", TensorRT: "TensorRT" } : { "ROCm & HIP": "ROCm & HIP", "Compiler & MLIR": "Compiler & MLIR", TensorRT: "TensorRT" };
  const note = locale === "tr"
    ? track === "ROCm & HIP" ? "Kaynak taşınabilirliği performans taşınabilirliği garantisi değildir." : track === "Compiler & MLIR" ? "Çok erken indirgeme, iyileştirilebilir niyeti kaybettirebilir." : "Dinamik şeklin en az/uygun/en çok aralığı bir performans sözleşmesidir."
    : track === "ROCm & HIP" ? "Source portability does not guarantee performance portability." : track === "Compiler & MLIR" ? "Lowering too early can erase optimizable intent." : "The dynamic-shape min/opt/max range is a performance contract.";
  return <LabShell label={locale === "tr" ? "LAB / YAZILIM YIĞINI" : "LAB / SOFTWARE STACK"} title={locale === "tr" ? "Hattı katmanlarına ayır." : "Separate the pipeline into layers."} note={locale === "tr" ? "İyileştirme problemini doğru katmana yerleştir." : "Place the optimization problem in the correct layer."}>
    <div className="segmented">{names.map((name) => <button key={name} className={track === name ? "active" : ""} onClick={() => setTrack(name)}>{trackLabels[name]}</button>)}</div>
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
