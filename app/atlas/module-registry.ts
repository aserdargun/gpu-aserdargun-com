import type { ArchitectureId, AtlasModule, Localized, Maturity, ModuleId, RoadmapWeek } from "./types";

export const MODULE_IDS = [
  "toolchain", "architecture", "memory", "triton", "operators", "correctness",
  "profiling", "cutlass", "inference", "multigpu", "systems",
] as const satisfies readonly ModuleId[];

const maturityById: Record<ModuleId, Maturity> = {
  toolchain: "core", architecture: "current", memory: "current", triton: "current",
  operators: "current", correctness: "core", profiling: "current", cutlass: "current",
  inference: "current", multigpu: "current", systems: "current",
};

const architecturesById: Record<ModuleId, readonly ArchitectureId[]> = {
  toolchain: ["ada", "hopper", "blackwell"],
  architecture: ["ada", "hopper", "blackwell", "rubin"],
  memory: ["ada", "hopper", "blackwell"],
  triton: ["ada", "hopper", "blackwell"],
  operators: ["ada", "hopper", "blackwell"],
  correctness: ["ada", "hopper", "blackwell"],
  profiling: ["ada", "hopper", "blackwell"],
  cutlass: ["ada", "hopper", "blackwell", "rubin"],
  inference: ["ada", "hopper", "blackwell"],
  multigpu: ["hopper", "blackwell"],
  systems: ["ada", "hopper", "blackwell", "rubin"],
};

const trModules = [
  {
    id: "toolchain", index: "01", title: "Mühendislik Temelleri", short: "C++ · Linux · Git · CMake", phase: "Zemin",
    description: "Kernel geliştirme ortamını modern C++, Python, Linux, Git, hedef tabanlı CMake ve taşınabilir bir yetenek kaydıyla sağlamlaştır.",
    concepts: ["RAII ve nesne yaşam süresi", "Süreçler, borular ve otomasyon", "Tekrarlanabilir derleme, test ve ortam manifestosu"],
    outcome: "Derlenebilir, test edilebilir ve ölçüm bağlamı yeniden üretilebilir bir kernel çalışma alanı kur.", tags: ["C++23", "Python", "Linux", "Git", "CMake", "yetenek kaydı"], accent: "gold",
  },
  {
    id: "architecture", index: "02", title: "Mimari → SIMT → CUDA", short: "Izgara · Blok · Warp · Şerit", phase: "Zihinsel model",
    description: "CPU denetiminden GPU yürütmesine uzanan hattı SIMT, warp işbirliği, tile programlama ve mimariye bağlı TMA üzerinden kur.",
    concepts: ["SIMT ve dallanma", "Warp işbirliği", "Thread → warp → döşeme → derleyici köprüsü"],
    outcome: "Bir problem boyutunu güvenli bir ızgaraya çevir; SIMT ile tile modellerinin sınırını ve TMA uygulanabilirliğini açıkla.", tags: ["CUDA", "SIMT", "warp", "tile programlama", "TMA"], accent: "lime",
  },
  {
    id: "memory", index: "03", title: "GPU Bellek Laboratuvarı", short: "Birleşik erişim · Bankalar · Doluluk", phase: "Veri hareketi",
    description: "Birleşik erişim, banka çakışması ve doluluğu; Hopper+ tensor tanımlayıcıları, DSMEM ve Blackwell TMEM sınırıyla birlikte gör.",
    concepts: ["Bellek hiyerarşisi ve coalescing", "Paylaşılan bellek bankaları ve doluluk", "Tensör tanımlayıcı · DSMEM · TMEM"],
    outcome: "Bir erişim deseninin gereksiz trafiğini hesapla ve mimarinin hangi veri hareketi yolunu gerçekten desteklediğini ayır.", tags: ["HBM", "paylaşılan bellek", "birleşik erişim", "doluluk", "tensor descriptor", "DSMEM", "TMEM"], accent: "cyan",
  },
  {
    id: "triton", index: "04", title: "PyTorch + Triton Kernel Laboratuvarı", short: "Özel operatör · Otomatik türev · Derleme", phase: "Uygulama",
    description: "PyTorch referansından torch.library kararına, triton_op + wrap_triton sınırına ve maskeli Triton kernel’e ilerle.",
    concepts: ["torch.library sözleşmesi ve mask", "triton_op, wrap_triton ve autotune", "Otomatik türev, FakeTensor ve AOTInductor"],
    outcome: "Bir operatörü referans, Triton uygulaması, autograd ve dinamik şekil kabul testleriyle paketle.", tags: ["PyTorch", "Triton", "opcheck", "autotune", "derleme"], accent: "violet",
  },
  {
    id: "operators", index: "05", title: "LLM Kernel Desenleri", short: "GEMM · İndirgeme · Softmax · Dikkat", phase: "Operatörler",
    description: "GEMM, indirgeme, softmax, RMSNorm ve dikkat çekirdeğini; gruplu GEMM/MoE, persistent matmul ve block-scaled FP4/FP8 sınırlarıyla karşılaştır.",
    concepts: ["Döşeme ve yeniden kullanım", "Kararlı indirgeme ve çevrimiçi softmax", "Gruplu GEMM, FP4/FP8 ölçek metaverisi ve birikim"],
    outcome: "RMSNorm, RoPE, SwiGLU, masked softmax, paged KV-cache/GQA ve MoE operatör paketini tasarla.", tags: ["GEMM", "indirgeme", "RMSNorm", "softmax", "dikkat", "gruplu", "FP4", "FP8"], accent: "coral",
  },
  {
    id: "correctness", index: "06", title: "Kernel Doğruluğu ve Güvenliği", short: "Referans · Tolerans · Doğrulama", phase: "Kanıt",
    description: "“Çalıştı” ile “doğru” arasındaki farkı referans sözleşmesi, deterministik/nondeterministik kabul ve Compute Sanitizer ile kapat.",
    concepts: ["rtol + atol hata bütçesi", "Mutasyon, alias ve determinism", "memcheck, racecheck ve TMEM korumaları"],
    outcome: "Sayısal, bellek, Python çağrı yığını ve eşzamanlılık doğruluğu için tekrar kullanılabilir bir kabul kapısı oluştur.", tags: ["pytest", "allclose", "memcheck", "racecheck", "TMEM", "determinism"], accent: "green",
  },
  {
    id: "profiling", index: "07", title: "Nsight ve Kıyaslama Rehberi", short: "Nsight Systems · Nsight Compute · Deney tasarımı", phase: "Ölçüm",
    description: "Önce zaman çizelgesini, sonra sıcak kerneli, en son gürültüsü kontrollü karşılaştırmayı kullan; rapor birleştirme ve CUDA Graph düğümü kanıtını ayrı kaydet.",
    concepts: ["Nsight Systems zaman çizelgesi", "Nsight Compute hipotezi", "Isınma, yüzdelikler · rapor birleştirme · CUDA Graph"],
    outcome: "Her optimizasyon için tekrarlanabilir bir kanıt zinciri ve karar kaydı üret.", tags: ["Nsight", "çatı çizgisi", "kıyaslama", "yüzdelik"], accent: "blue",
  },
  {
    id: "cutlass", index: "08", title: "CUTLASS · CuTe · Tensor Core · PTX", short: "Soyutlamadan silikona", phase: "Derin optimizasyon",
    description: "Bir GEMM’in CUTLASS 4 C++ şablonları ve CuTe DSL yolundan yerleşim cebirine, PTX komutuna ve Blackwell Tensor Core yürütmesine inişini izle.",
    concepts: ["CTA/warp/MMA döşemesi", "CuTe DSL yerleşim eşlemesi", "PTX → SASS doğrulaması · Blackwell TMEM · FP4/FP8"],
    outcome: "Profil kanıtına göre doğru soyutlama seviyesini seç, block-scaled ve grouped/persistent GEMM uygulanabilirliğini mimariye göre ayır.", tags: ["CUTLASS", "CuTe DSL", "PTX", "Tensor Core", "Blackwell", "FP4", "FP8"], accent: "pink",
  },
  {
    id: "inference", index: "09", title: "Çıkarım Sistemleri Laboratuvarı", short: "vLLM · CUDA Graphs · Nicemleme", phase: "Sunum",
    description: "TTFT, ITL, iş hacmi ve VRAM’i ayrıştırılmış encode/prefill/decode sistemi içinde değerlendir; kaldıracı darboğaza göre seç.",
    concepts: ["Sürekli toplu işleme", "CUDA/HIP Graph yeniden oynatma", "Ağırlık ve KV-cache bütçesi · MXFP biçimleri"],
    outcome: "Sabit bir iş yükünde sunum yapılandırmalarını ölç ve MXFP nicemleme için kalite güvence sınırıyla karşılaştır.", tags: ["vLLM", "TTFT", "ITL", "iş hacmi", "VRAM", "ayrıştırılmış", "MXFP"], accent: "lime",
  },
  {
    id: "multigpu", index: "10", title: "NCCL ve Çoklu GPU Sistemleri", short: "Kolektifler · Paralellik · RDMA", phase: "Dağıtık sistem",
    description: "Halka ve ağaç kolektif iletişimini DP, TP, PP ve EP stratejileriyle PCIe/NVLink/NVSwitch topolojisi üzerinde birleştir.",
    concepts: ["AllReduce kolektif maliyeti", "DP/TP/PP/EP seçimi", "GPUDirect RDMA · simetrik kernel ve füzyon"],
    outcome: "NVLink, NVSwitch ve RDMA kanıtına göre modelin gerçek darboğazını bölen bir paralellik stratejisi seç.", tags: ["NCCL", "kolektif", "DP", "TP", "PP", "EP", "NVLink", "NVSwitch", "RDMA", "simetrik"], accent: "cyan",
  },
  {
    id: "systems", index: "11", title: "GPU Yazılım Yığını", short: "ROCm/HIP · MLIR · TensorRT", phase: "Ekosistem",
    description: "ROCm 10 çalışma zamanından HIP ve ROCprofiler-SDK’ye, CUDA Tile IR/CuTe DSL kernel katmanından MLIR ve TensorRT’ye uzanan yığını ayır.",
    concepts: ["HIP ve ROCprofiler-SDK", "MLIR indirgeme hattı · CUDA Tile IR · CuTe DSL", "TensorRT taktikleri ve motoru"],
    outcome: "İyileştirme problemini doğru yazılım katmanına yerleştir ve ROCm 10 ile CUDA yollarının sınırlarını açıkça yaz.", tags: ["ROCm 10", "ROCprofiler-SDK", "HIP", "MLIR", "CUDA Tile IR", "CuTe DSL", "TensorRT"], accent: "orange",
  },
] as const;

const enModules = [
  {
    id: "toolchain", index: "01", title: "Engineering Foundations", short: "C++ · Linux · Git · CMake", phase: "Foundation",
    description: "Strengthen your kernel development environment with modern C++, Python, Linux, Git, target-based CMake, and a portable capability record.",
    concepts: ["RAII and object lifetime", "Processes, pipes, and automation", "Reproducible builds, tests, and environment manifest"],
    outcome: "Build a kernel workspace that compiles, tests, and preserves reproducible measurement context.", tags: ["C++23", "Python", "Linux", "Git", "CMake", "capability record"], accent: "gold",
  },
  {
    id: "architecture", index: "02", title: "Architecture → SIMT → CUDA", short: "Grid · Block · Warp · Lane", phase: "Mental model",
    description: "Connect CPU control flow to GPU execution through SIMT, warp collaboration, tile programming, and architecture-gated TMA.",
    concepts: ["SIMT and divergence", "Warp collaboration", "Thread → warp → tile → compiler bridge"],
    outcome: "Translate a problem size into a safe grid; explain the SIMT/tile boundary and TMA applicability.", tags: ["CUDA", "SIMT", "warp", "tile programming", "TMA"], accent: "lime",
  },
  {
    id: "memory", index: "03", title: "GPU Memory Lab", short: "Coalescing · Banks · Occupancy", phase: "Data movement",
    description: "Connect coalescing, bank conflicts, and occupancy with Hopper+ tensor descriptors and DSMEM, plus the Blackwell TMEM boundary.",
    concepts: ["Memory hierarchy and coalescing", "Shared-memory banks and occupancy", "Tensor descriptor · DSMEM · TMEM"],
    outcome: "Calculate wasted traffic and distinguish which data-movement path the selected architecture actually supports.", tags: ["HBM", "shared", "coalescing", "occupancy", "tensor descriptor", "DSMEM", "TMEM"], accent: "cyan",
  },
  {
    id: "triton", index: "04", title: "PyTorch + Triton Kernel Lab", short: "Custom op · Autograd · Compile", phase: "Implementation",
    description: "Move from a PyTorch reference through a torch.library decision to a triton_op + wrap_triton boundary and masked Triton kernel.",
    concepts: ["torch.library contract and mask", "triton_op, wrap_triton, and autotune", "Autograd, FakeTensor, and AOTInductor"],
    outcome: "Package an operator with a reference, Triton implementation, autograd, and dynamic-shape acceptance tests.", tags: ["PyTorch", "Triton", "opcheck", "autotune", "compile"], accent: "violet",
  },
  {
    id: "operators", index: "05", title: "LLM Kernel Patterns", short: "GEMM · Reduction · Softmax · Attention", phase: "Operators",
    description: "Compare GEMM, reduction, softmax, RMSNorm, and attention with grouped GEMM/MoE, persistent matmul, and block-scaled FP4/FP8 boundaries.",
    concepts: ["Tiling and reuse", "Stable reduction and online softmax", "Grouped GEMM, FP4/FP8 scale metadata, and accumulation"],
    outcome: "Design an operator pack for RMSNorm, RoPE, SwiGLU, masked softmax, paged KV-cache/GQA, and MoE.", tags: ["GEMM", "reduction", "RMSNorm", "softmax", "attention", "grouped", "FP4", "FP8"], accent: "coral",
  },
  {
    id: "correctness", index: "06", title: "Kernel Correctness & Safety", short: "Reference · Tolerance · Sanitizer", phase: "Evidence",
    description: "Close the gap between ‘it ran’ and ‘it is correct’ with reference contracts, deterministic/nondeterministic acceptance, and Compute Sanitizer.",
    concepts: ["rtol + atol error budget", "Mutation, alias, and determinism", "memcheck, racecheck, and TMEM guardrails"],
    outcome: "Create a reusable acceptance gate for numerical, memory, Python call-stack, and synchronization correctness.", tags: ["pytest", "allclose", "memcheck", "racecheck", "TMEM", "determinism"], accent: "green",
  },
  {
    id: "profiling", index: "07", title: "Nsight & Benchmark Guide", short: "Systems · Compute · Experiment design", phase: "Measurement",
    description: "Inspect the timeline first, then the hot kernel, and finally compare variants under controlled noise; keep report merge and CUDA Graph node evidence distinct.",
    concepts: ["Nsight Systems timeline", "Nsight Compute hypothesis", "Warm-up and quantiles · report merge · CUDA Graph"],
    outcome: "Produce a reproducible evidence chain and decision record for every optimization.", tags: ["Nsight", "roofline", "benchmark", "quantile"], accent: "blue",
  },
  {
    id: "cutlass", index: "08", title: "CUTLASS · CuTe · Tensor Core · PTX", short: "From abstraction to silicon", phase: "Deep optimization",
    description: "Trace a GEMM from CUTLASS 4 C++ templates and CuTe DSL through layout algebra and PTX instructions to Blackwell Tensor Core execution.",
    concepts: ["CTA/warp/MMA tiling", "CuTe DSL layout mapping", "PTX → SASS verification · Blackwell TMEM · FP4/FP8"],
    outcome: "Choose the right abstraction level from profiler evidence and separate block-scaled and grouped/persistent GEMM applicability by architecture.", tags: ["CUTLASS", "CuTe DSL", "PTX", "Tensor Core", "Blackwell", "FP4", "FP8"], accent: "pink",
  },
  {
    id: "inference", index: "09", title: "Inference Systems Lab", short: "vLLM · CUDA Graphs · Quantization", phase: "Serving",
    description: "Evaluate TTFT, ITL, throughput, and VRAM across disaggregated encode/prefill/decode; choose levers based on the bottleneck.",
    concepts: ["Continuous batching", "CUDA/HIP Graph replay", "Weight and KV-cache budgets · MXFP formats"],
    outcome: "Measure serving configurations on a fixed workload and compare MXFP quantization with a quality guardrail.", tags: ["vLLM", "TTFT", "ITL", "throughput", "VRAM", "disaggregated", "MXFP"], accent: "lime",
  },
  {
    id: "multigpu", index: "10", title: "NCCL & Multi-GPU Systems", short: "Collectives · Parallelism · RDMA", phase: "Distributed system",
    description: "Combine ring and tree collective communication with DP, TP, PP, and EP on PCIe/NVLink/NVSwitch topologies.",
    concepts: ["AllReduce collective cost", "Choosing DP/TP/PP/EP", "GPUDirect RDMA · symmetric kernels and fusion"],
    outcome: "Use NVLink, NVSwitch, and RDMA evidence to split the actual bottleneck, not just the model.", tags: ["NCCL", "collective", "DP", "TP", "PP", "EP", "NVLink", "NVSwitch", "RDMA", "symmetric"], accent: "cyan",
  },
  {
    id: "systems", index: "11", title: "GPU Software Stack", short: "ROCm/HIP · MLIR · TensorRT", phase: "Ecosystem",
    description: "Separate ROCm 10 runtime, HIP and ROCprofiler-SDK, CUDA Tile IR/CuTe DSL kernels, MLIR, and TensorRT into explicit layers.",
    concepts: ["HIP and ROCprofiler-SDK", "MLIR lowering · CUDA Tile IR · CuTe DSL", "TensorRT tactics and engines"],
    outcome: "Place an optimization problem in the correct layer and state ROCm 10 versus CUDA boundaries explicitly.", tags: ["ROCm 10", "ROCprofiler-SDK", "HIP", "MLIR", "CUDA Tile IR", "CuTe DSL", "TensorRT"], accent: "orange",
  },
] as const;

function addMetadata(modules: typeof trModules | typeof enModules): readonly AtlasModule[] {
  return modules.map((module) => ({
    ...module,
    maturity: maturityById[module.id],
    architectures: architecturesById[module.id],
  }));
}

const trWeeks = [
  ["01", "Yetenek ve ortam kanıtı", "GPU/arka uç, compute capability, araç zinciri ve ölçüm bağlamını kaydet.", "Zemin"],
  ["02", "SIMT → tile programlama", "Izgara, warp işbirliği, dallanma ve tile düzeyi problem ayrıştırma.", "CUDA"],
  ["03", "TMA ve veri hareketi", "Birleşik erişim, tensor tanımlayıcı, TMA/DSMEM uygulanabilirliği ve TMEM sınırı.", "Bellek"],
  ["04", "Yapılandırılmış Triton operatörleri", "torch.library, triton_op/wrap_triton, opcheck ve yapılandırılmış autotune.", "Entegrasyon"],
  ["05", "Gruplu GEMM ve MoE", "Gruplu iş atama, yönlendirme ve profil kanıtıyla operatör seçimi.", "Operatör"],
  ["06", "Düşük hassasiyetli operatörler", "FP8/MXFP8 ölçek metaverisi, birikim ve kalite koruması.", "Operatör"],
  ["07", "Dikkat ve block-scaled sınırlar", "Kararlı softmax, paged KV-cache ve FP4/FP8 uygulanabilirlik sınırları.", "Operatör"],
  ["08", "Genişletilmiş doğruluk kapısı", "Referans, tolerans, alias/determinism, memcheck, racecheck ve TMEM korumaları.", "Kanıt"],
  ["09", "2026 Nsight kanıtı", "Rapor birleştirme, clustering, instruction mix, scoreboard ve CUDA Graph düğümü.", "Ölçüm"],
  ["10", "CUTLASS 4 ve Blackwell farkındalığı", "C++/CuTe → PTX/SASS kanıtı, Tensor Core ve mimariye bağlı kalıcı/gruplu planlama.", "Optimizasyon"],
  ["11", "Ayrıştırılmış çıkarım ve NCCL", "Encode/prefill/decode, graph sınırları, DP/TP/PP/EP ve topoloji kanıtı.", "Sistem"],
  ["12", "Bitirme projesi ve portföy", "TTFT/ITL/iş hacmi raporu, iki %15+ füzyon ve savunma", "Mezuniyet"],
] as const satisfies readonly RoadmapWeek[];

const enWeeks = [
  ["01", "Capability & environment evidence", "Record GPU/backend, compute capability, toolchain, and measurement context.", "Foundation"],
  ["02", "SIMT → tile programming", "Grid, warp collaboration, divergence, and tile-level problem decomposition.", "CUDA"],
  ["03", "TMA & data movement", "Coalescing, tensor descriptors, TMA/DSMEM applicability, and the TMEM boundary.", "Memory"],
  ["04", "Structured Triton operators", "torch.library, triton_op/wrap_triton, opcheck, and structured autotune.", "Integration"],
  ["05", "Grouped GEMM & MoE", "Grouped work assignment, routing, and profiler-backed operator selection.", "Operators"],
  ["06", "Low-precision operators", "FP8/MXFP8 scale metadata, accumulation, and quality guardrails.", "Operators"],
  ["07", "Attention & block-scaled boundaries", "Stable softmax, paged KV-cache, and FP4/FP8 applicability boundaries.", "Operators"],
  ["08", "Expanded correctness gate", "Reference, tolerance, alias/determinism, memcheck, racecheck, and TMEM guardrails.", "Evidence"],
  ["09", "2026 Nsight evidence", "Report merge, clustering, instruction mix, scoreboards, and CUDA Graph nodes.", "Measurement"],
  ["10", "CUTLASS 4 & Blackwell awareness", "C++/CuTe → PTX/SASS evidence, Tensor Cores, and architecture-gated persistent/grouped scheduling.", "Optimization"],
  ["11", "Disaggregated inference & NCCL", "Encode/prefill/decode, graph boundaries, DP/TP/PP/EP, and topology evidence.", "Systems"],
  ["12", "Capstone & portfolio", "TTFT/ITL/throughput report, two 15%+ fusions, and defense", "Graduation"],
] as const satisfies readonly RoadmapWeek[];

export const modulesByLocale: Localized<readonly AtlasModule[]> = { tr: addMetadata(trModules), en: addMetadata(enModules) };
export const roadmapByLocale: Localized<readonly RoadmapWeek[]> = { tr: trWeeks, en: enWeeks };
