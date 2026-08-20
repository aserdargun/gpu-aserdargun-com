"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "./i18n";

export type StudioKind =
  | "visual"
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

type StepCopy = { title: string; caption: string };

type ScenarioMeta = {
  label: string;
  headline: string;
  intro: string;
  why: string;
};

type Scenario = Record<Locale, ScenarioMeta>;

const scenarioMeta: Record<StudioKind, Scenario> = {
  visual: {
    tr: {
      label: "GPU 101 · Görsel",
      headline: "CPU ile GPU farkı, gözünün önünde",
      intro: "Aynı işi iki farklı mimari nasıl yapar: birkaç güçlü çekirdek mi, binlerce küçük çekirdek mi? Anatomiyi ve kernel'in yaşam döngüsünü adım adım izle.",
      why: "CPU gecikme, GPU iş hacmi için tasarlanır; bu tek fark, bu atlasta göreceğin her kernel deseninin nedenini açıklar.",
    },
    en: {
      label: "GPU 101 · Visual",
      headline: "The CPU vs GPU difference, before your eyes",
      intro: "How do two architectures do the same job: a few powerful cores, or thousands of tiny ones? Follow the anatomy and the kernel lifecycle step by step.",
      why: "CPUs are designed for latency, GPUs for throughput; this single difference explains every kernel pattern you will meet in this atlas.",
    },
  },
  toolchain: {
    tr: {
      label: "Araç zinciri",
      headline: "Kaynak koddan çalışır dosyaya",
      intro: "Yazdığın kod, derleme, bağlama ve test aşamalarından geçerek güvenle çalıştırabileceğin bir dosyaya dönüşür. Her adımı izle.",
      why: "Derleme ve test zincirini otomatikleştirmek, kernel hatalarını dakikalar yerine saniyeler içinde yakalamanı sağlar.",
    },
    en: {
      label: "Toolchain",
      headline: "From source code to a running binary",
      intro: "Your code travels through configure, compile, link, and test stages until it becomes a binary you can trust. Watch each step.",
      why: "Automating the build-and-test chain catches kernel bugs in seconds instead of minutes.",
    },
  },
  architecture: {
    tr: {
      label: "Mimari · SIMT",
      headline: "Izgaradan warp'a: GPU kodu nasıl çalıştırır?",
      intro: "Tek bir kernel çağrısı binlerce thread'e dönüşür. Izgara, blok, warp ve şerit hiyerarşisini adım adım izle.",
      why: "Kernel'in hızını, donanımın thread'lerinizi nasıl gruplayıp zamanladığını anlamadan açıklayamazsın.",
    },
    en: {
      label: "Architecture · SIMT",
      headline: "From grid to warp: how a GPU runs your code",
      intro: "A single kernel call becomes thousands of threads. Follow the grid, block, warp, and lane hierarchy step by step.",
      why: "You cannot explain a kernel's speed without understanding how the hardware groups and schedules your threads.",
    },
  },
  memory: {
    tr: {
      label: "GPU belleği",
      headline: "Birleşik erişim: 32 baytluk sektörler",
      intro: "32 lane'in okuduğu 128 baytlık veri, erişim desenine göre 4 ya da 16 sektörü hareket ettirebilir. Farkı canlı gör.",
      why: "Aynı veriyi taşıyan bir warp, erişim desenine göre 4 ya da 16 sektör okuyabilir — aradaki fark doğrudan bant genişliğidir.",
    },
    en: {
      label: "GPU memory",
      headline: "Coalescing: the 32-byte sectors",
      intro: "The 128 bytes a warp needs can move 4 or 16 sectors depending on the access pattern. See the difference live.",
      why: "The same warp data can cost 4 or 16 sectors depending on the pattern — the difference is pure bandwidth.",
    },
  },
  triton: {
    tr: {
      label: "PyTorch · Triton",
      headline: "PyTorch operatöründen Triton kernel'ına",
      intro: "Bir operatör fikri nasıl GPU'da çalışan maskelemeli bir kernel'a dönüşür? Python tarafı ile GPU tarafı yan yana akar.",
      why: "Triton, CUDA C++ yazmadan GPU'a inen özel operatörler yazmanın en hızlı yoludur; maskeleme ve program kimliği iki temel fikirdir.",
    },
    en: {
      label: "PyTorch · Triton",
      headline: "From a PyTorch op to a Triton kernel",
      intro: "How does an operator idea become a masked kernel running on the GPU? The Python side and the GPU side flow side by side.",
      why: "Triton is the fastest path to custom operators that reach the GPU without CUDA C++; masking and the program ID are its two core ideas.",
    },
  },
  operators: {
    tr: {
      label: "Operatör desenleri",
      headline: "GEMM'i döşemek: veriyi bir kez taşı, çok kullan",
      intro: "Naif matris çarpımı her çıktı için veriyi yeniden okur. Döşeme, paylaşılan bellek ve yazmaç birikimi nasıl kurtarır?",
      why: "Tüm derin öğrenme hızlandırmalarının özü aynı fikir: veriyi hızlı belleğe bir kez taşı ve mümkün olan en çok işlemde yeniden kullan.",
    },
    en: {
      label: "Operator patterns",
      headline: "Tiling a GEMM: move data once, use it many times",
      intro: "A naive matmul re-reads data for every output. How do tiling, shared memory, and register accumulation rescue it?",
      why: "Every deep-learning optimization shares one core idea: move data into fast memory once and reuse it across as much math as possible.",
    },
  },
  correctness: {
    tr: {
      label: "Doğruluk",
      headline: "'Çalıştı' değil, 'doğru' nasıl kanıtlanır?",
      intro: "Referans, tolerans, uç durumlar ve sanitizer'lar: kabul kapısına giden zinciri adım adım kur.",
      why: "'Çalıştı' bir kanıt değildir; referans, tolerans ve sanitizer üçlüsü olmadan bir kernel asla tamamlanmış sayılmaz.",
    },
    en: {
      label: "Correctness",
      headline: "Proving 'correct', not just 'it ran'",
      intro: "Reference, tolerance, edge cases, and sanitizers: build the chain that leads to an acceptance gate, step by step.",
      why: "'It ran' is not evidence; without a reference, tolerance, and sanitizers a kernel is never done.",
    },
  },
  profiling: {
    tr: {
      label: "Profilleme",
      headline: "Ölçmeden hız iddiası yok",
      intro: "Isınma, zaman çizelgesi, sıcak kernel, çatı çizgisi ve dağılım: dürüst bir ölçüm hikâyesinin aşamaları.",
      why: "Yanlış ölçüm, yanlış optimizasyona götürür; ısınma, tekrar ve dağılım istatistikleri gerçek resmi verir.",
    },
    en: {
      label: "Profiling",
      headline: "No speed claim without honest measurement",
      intro: "Warm-up, the timeline, the hot kernel, the roofline, and the distribution: the stages of an honest measurement story.",
      why: "Bad measurement leads to bad optimization; warm-up, repetition, and distribution statistics reveal the real picture.",
    },
  },
  cutlass: {
    tr: {
      label: "CUTLASS · CuTe · PTX",
      headline: "Bir matris çarpımının silikona inişi",
      intro: "D = α·A×B + β·C satırı kütüphane politikasından Tensor Core'a altı katmandan geçer. Veri paketiyle birlikte in.",
      why: "Her katmanın neyi kontrol ettiğini bilmezsen, optimizasyonu doğru katmanda yapamazsın.",
    },
    en: {
      label: "CUTLASS · CuTe · PTX",
      headline: "A matmul's descent to silicon",
      intro: "The line D = α·A×B + β·C crosses six layers from library policy down to the Tensor Core. Descend with the data packet.",
      why: "If you don't know what each layer controls, you will optimize in the wrong layer.",
    },
  },
  inference: {
    tr: {
      label: "Çıkarım sistemleri",
      headline: "Bir LLM sunucusunda token'ların yolculuğu",
      intro: "Prefill, decode, KV-cache ve sürekli toplu işleme: bir isteğin sunucudaki yaşamını izle.",
      why: "TTFT ve ITL metrikleri kullanıcı deneyimini, KV-cache bütçesi ise sunucunun kapasitesini belirler.",
    },
    en: {
      label: "Inference systems",
      headline: "A token's journey through an LLM server",
      intro: "Prefill, decode, the KV cache, and continuous batching: follow a request's life inside the server.",
      why: "TTFT and ITL define the user experience; the KV-cache budget caps the server's capacity.",
    },
  },
  multigpu: {
    tr: {
      label: "NCCL · Çoklu GPU",
      headline: "Halka AllReduce: 4 GPU'da gradyan toplama",
      intro: "Reduce-scatter ve all-gather aşamalarıyla parçalar halkada dolaşır; her GPU sonuçta toplamın tamamına kavuşur.",
      why: "Çoklu GPU eğitiminin iletişim maliyetini anlamak, paralellik stratejisini seçmenin temelidir.",
    },
    en: {
      label: "NCCL · Multi-GPU",
      headline: "Ring AllReduce: summing gradients on 4 GPUs",
      intro: "Chunks circulate through reduce-scatter and all-gather phases until every GPU holds the complete sum.",
      why: "Understanding multi-GPU communication cost is the foundation of choosing a parallelism strategy.",
    },
  },
  systems: {
    tr: {
      label: "Yazılım yığını",
      headline: "Kodun gerçekten nerede çalışır?",
      intro: "model(x) satırı framework'ten sürücüye ve donanıma uzanan katmanlardan geçer. İşi katman katman izle.",
      why: "Aynı GPU problemi farklı yazılım katmanlarında çözülebilir; doğru katmanı seçmek zaman ve taşınabilirlik kazandırır.",
    },
    en: {
      label: "Software stack",
      headline: "Where does your code really run?",
      intro: "The line model(x) crosses layers from the framework down to the driver and hardware. Follow the job, layer by layer.",
      why: "The same GPU problem can be solved at different software layers; picking the right one saves time and keeps code portable.",
    },
  },
};

const stepCopy: Record<StudioKind, Record<Locale, StepCopy[]>> = {
  visual: {
    tr: [
      { title: "Görev", caption: "128 parça veri işlenecek. Aynı görevi önce CPU'nun, sonra GPU'nun nasıl çözdüğünü düşün: iki makine, iki felsefe." },
      { title: "CPU yolu", caption: "4 güçlü çekirdek görevi sıraya dizip yüksek hızla tek tek bitirir: az çekirdek, yüksek saat hızı, büyük önbellek — gecikme odaklı." },
      { title: "GPU yolu", caption: "Binlerce basit çekirdek küçük parçaları aynı anda işler: çok çekirdek, düşük saat — iş hacmi odaklı. Görev büyüdükçe fark açılır." },
      { title: "İçinde ne var?", caption: "SM hesap birimidir, L2 tüm SM'lerin ortak önbelleğidir, HBM ise geniş ve hızlı ana bellektir. Veri HBM'den L2'ye, oradan SM'lere akar." },
      { title: "Kernel'in hayatı", caption: "Yaz → derle → başlat (<<<blocks, threads>>>) → bloklar SM'lere dağılır → sonuç HBM'ye yazılır → host'a kopyalanır." },
      { title: "SIMT fikri", caption: "Aynı komut, farklı veri: her lane kendi i indeksini işler. Dizi ne kadar büyükse GPU o kadar verimli; iş küçükse CPU kazanır." },
      { title: "Akılda kalsın", caption: "Izgara → bloklar → 32'lik warp'lar → lane'ler. Bu zinciri hatırla; bu atlastaki her laboratuvar bu zincirin üzerine kurulur." },
    ],
    en: [
      { title: "The task", caption: "128 pieces of data to process. Watch how a CPU and then a GPU solve the same job: two machines, two philosophies." },
      { title: "The CPU way", caption: "4 powerful cores queue the tasks and burn through them one by one: few cores, high clocks, big caches — latency oriented." },
      { title: "The GPU way", caption: "Thousands of simple cores work on small pieces simultaneously: many cores, lower clocks — throughput oriented. The bigger the job, the wider the gap." },
      { title: "What's inside?", caption: "The SM is the compute unit, L2 is the cache shared by all SMs, HBM is the large, fast main memory. Data flows HBM → L2 → SMs." },
      { title: "A kernel's life", caption: "Write → compile → launch (<<<blocks, threads>>>) → blocks land on SMs → results written to HBM → copied back to the host." },
      { title: "The SIMT idea", caption: "Same instruction, different data: each lane processes its own index i. Bigger arrays make the GPU happier; tiny jobs favor the CPU." },
      { title: "Make it stick", caption: "Grid → blocks → warps of 32 → lanes. Remember this chain; every lab in this atlas is built on top of it." },
    ],
  },
  toolchain: {
    tr: [
      { title: "Kaynak dosyalar", caption: "Her şey main.cpp, kernel.cu ve CMakeLists.txt gibi düz metin dosyalarıyla başlar. Henüz çalıştırılabilir hiçbir şey yok." },
      { title: "CMake yapılandırması", caption: "CMake derleyiciyi bulur, platformu sınar ve derleme komutlarını (Makefile/Ninja) üretir. Tanım bir kez yazılır, her yerde çalışır." },
      { title: "Derleme", caption: "Derleyici her .cpp/.cu dosyasını ayrı ayrı makine koduna çevirir ve .o nesne dosyaları üretir. Bu adım paralelleştirilebilir." },
      { title: "Bağlama", caption: "Bağlayıcı, nesne dosyalarını ve kütüphaneleri (libcuda, torch…) tek bir çalıştırılabilir dosyada birleştirir." },
      { title: "Testler çalışır", caption: "ctest testleri tek tek çalıştırır. Kırmızı bir test, kod git'e girmeden önce geri bildirim verir." },
      { title: "Git kontrol noktası", caption: "Yeşil testlerin ardından değişiklik commit edilir. Bir şey bozulursa güvenle dönebileceğin bir nokta oluşur." },
      { title: "Döngü", caption: "Değiştir → derle → test et → commit'le. Kernel mühendisliği, bu döngüyü hızlı ve güvenli tutmaktır." },
    ],
    en: [
      { title: "Source files", caption: "Everything starts as plain text: main.cpp, kernel.cu, and a CMakeLists.txt. Nothing runs yet." },
      { title: "CMake configure", caption: "CMake finds the compiler, tests the platform, and generates build files (Makefile/Ninja). Describe once, build anywhere." },
      { title: "Compile", caption: "The compiler translates each .cpp/.cu file independently into machine-code objects (.o). This step parallelizes well." },
      { title: "Link", caption: "The linker combines objects and libraries (libcuda, torch…) into a single executable." },
      { title: "Tests run", caption: "ctest runs your test suite. A red test gives feedback before anything reaches git." },
      { title: "Git checkpoint", caption: "With green tests the change is committed. If something breaks later, you have a safe point to return to." },
      { title: "The loop", caption: "Edit → build → test → commit. Kernel engineering is keeping this loop fast and safe." },
    ],
  },
  architecture: {
    tr: [
      { title: "Problem", caption: "N = 1000 elemanlı bir dizinin her elemanı işlenecek. CPU bunu döngüyle yapar; GPU binlerce thread ile yapar." },
      { title: "Kernel başlatma", caption: "myKernel<<<blok_sayısı, blok_boyutu>>>(…) çağrısı GPU'a iş verir: bloklardan oluşan bir ızgara (grid) yaratılır." },
      { title: "Bloklar SM'lere dağılır", caption: "1000 / 256 = 4 blok (ceil). Her blok tek bir SM'e atanır ve ömrü boyunca orada kalır; bloklar dalga dalga işlenir." },
      { title: "Warp'lara bölünme", caption: "256 thread'lik her blok 32'lik warp'lara bölünür (8 warp). Warp, GPU'un zamanlama birimidir: 32 lane birden ilerler." },
      { title: "Global indeks", caption: "i = blockIdx.x · blockDim.x + threadIdx.x her thread'e benzersiz bir eleman verir. Aynı kod, farklı veri — SIMT'in özü." },
      { title: "Sınır kontrolü", caption: "1000, 256'nın tam katı değil: son blokta 24 thread boşa düşer. if (i < N) koruması olmayan kernel bellek dışına yazar." },
      { title: "Dallanma (divergence)", caption: "Aynı warp'ta koşul lane'lere göre farklıysa donanım yolları maskeleyerek arka arkaya koşturur: iki yol ≈ iki kat süre." },
      { title: "Yeniden birleşme", caption: "Yollar birleşir. İpucu: bir warp'ın thread'leri aynı yolu alsın ki maskelenmiş (boşta) lane kalmasın." },
    ],
    en: [
      { title: "The problem", caption: "We must process each of N = 1000 elements. A CPU loops; a GPU launches thousands of threads." },
      { title: "Kernel launch", caption: "myKernel<<<num_blocks, block_size>>>(…) hands work to the GPU: it creates a grid of blocks." },
      { title: "Blocks land on SMs", caption: "1000 / 256 = 4 blocks (ceil). Each block is assigned to one SM and stays there for life; blocks run in waves." },
      { title: "Split into warps", caption: "Each 256-thread block splits into warps of 32 (8 warps). The warp is the GPU's scheduling unit: 32 lanes advance together." },
      { title: "Global index", caption: "i = blockIdx.x · blockDim.x + threadIdx.x gives each thread its own element. Same code, different data — the essence of SIMT." },
      { title: "Bounds check", caption: "1000 is not a multiple of 256: the last block has 24 idle threads. Without if (i < N), the kernel writes out of bounds." },
      { title: "Divergence", caption: "If a condition differs across lanes of one warp, hardware serializes the paths with masks: two paths ≈ twice the time." },
      { title: "Reconvergence", caption: "The paths merge. Rule of thumb: keep a warp's threads on the same path so no lane sits masked and idle." },
    ],
  },
  memory: {
    tr: [
      { title: "Warp bellekten okuyacak", caption: "32 lane'in her biri bir float (4 bayt) okuyacak. Gereksinim sadece 128 bayt — ama kaç bayt taşınacak?" },
      { title: "32 baytluk sektörler", caption: "Global bellek 32 baytlık sektörler halinde servis yapar. Bir sektör — ister 4 bayt ister 32 bayt lazım — tamamen taşınır." },
      { title: "Bitişik erişim: 4 sektör", caption: "lane i → adres i olursa 32 lane, bitişik 128 baytlık bölgeye düşer: 4 sektör taşınır, %100 verim." },
      { title: "2'li adım: 8 sektör", caption: "lane i → adres 2i olursa aynı veri için 8 sektör taşınır; yarısı boşa gider. Bant genişliğinin %50'si çöpe." },
      { title: "4'lü adım: 16 sektör", caption: "stride 4'te 16 sektör taşınır, verim %25'e düşer. Bellek 'yavaş' görünür — aslında verimsiz kullanılıyor." },
      { title: "Çözüm: düzen", caption: "Erişimi bitişiğe çevir: veri düzenini değiştir (SoA), blok boyutunu ayarla veya indekslemeyi yeniden yaz." },
    ],
    en: [
      { title: "A warp loads memory", caption: "Each of 32 lanes reads one float (4 bytes). The useful payload is only 128 bytes — but how many bytes actually move?" },
      { title: "32-byte sectors", caption: "Global memory is served in 32-byte sectors. A sector moves in full, whether you need 4 or 32 bytes of it." },
      { title: "Contiguous: 4 sectors", caption: "With lane i → address i, all 32 lanes hit one contiguous 128-byte range: 4 sectors move, 100% efficiency." },
      { title: "Stride 2: 8 sectors", caption: "With lane i → address 2i, the same data needs 8 sectors; half the bytes are wasted. 50% of bandwidth lost." },
      { title: "Stride 4: 16 sectors", caption: "At stride 4, 16 sectors move and efficiency drops to 25%. Memory looks 'slow' — it is actually being wasted." },
      { title: "Fix the layout", caption: "Make accesses contiguous: change the data layout (SoA), pick block sizes, or rewrite the index math." },
    ],
  },
  triton: {
    tr: [
      { title: "Referans", caption: "Önce PyTorch ile yavaş ama kesin doğru bir referans yaz: torch_out = x + y. Bu satır, doğruluğun tanımıdır." },
      { title: "Özel operatör", caption: "torch.library ile operatörü kaydet: PyTorch dispatcher artık add_custom(x, y) çağrısını senin kernel'ına yönlendirir." },
      { title: "Triton kernel'ı", caption: "@triton.jit ile Python sözdiziminde GPU kernel'ı yazarsın; Triton onu senin GPU'un için CUDA'ya derler." },
      { title: "Program kimliği", caption: "GPU aynı kernel'ı yüzlerce programla çalıştırır. pid = tl.program_id(0) her programa kendi dilimini (blok) verir." },
      { title: "İlk çağrı: derleme", caption: "İlk çağrıda Triton kernel'ı hedef GPU için derler (JIT). Aynı şekil tekrar geldiğinde önbellekten gelir." },
      { title: "Maskeleme", caption: "offs < n koşulu, son bloğun dizinin dışına taşan elemanlarını korur. Maske, Triton'un güvenlik kemeridir." },
      { title: "Autograd + compile", caption: "backward kaydıyla operatör autograd'a katılır; torch.compile onu daha büyük grafiklerde eritip birleştirebilir." },
    ],
    en: [
      { title: "Reference", caption: "First write a slow-but-certain PyTorch reference: torch_out = x + y. This line defines what 'correct' means." },
      { title: "Custom operator", caption: "Register the op with torch.library: the PyTorch dispatcher now routes add_custom(x, y) to your kernel." },
      { title: "The Triton kernel", caption: "With @triton.jit you write the GPU kernel in Python syntax; Triton compiles it to CUDA for your GPU." },
      { title: "Program ID", caption: "The GPU runs the same kernel in hundreds of programs. pid = tl.program_id(0) gives each one its own block." },
      { title: "First call: JIT", caption: "On the first call Triton compiles the kernel for the target GPU (JIT). The same shape later hits the cache." },
      { title: "Masking", caption: "The condition offs < n guards the last block from touching elements beyond the array. The mask is Triton's seat belt." },
      { title: "Autograd + compile", caption: "Register a backward and the op joins autograd; torch.compile can fuse it inside larger graphs." },
    ],
  },
  operators: {
    tr: [
      { title: "Naif GEMM", caption: "C = A×B'nin naif hali her çıktı için A'nın bir satırını ve B'nin bir sütununu yeniden okur: K = 4'te bile eleman başına 8 okuma." },
      { title: "Döşeme (tiling)", caption: "Matrisleri örneğin 3×3'lük karolara böl. Artık veriyi karolar halinde taşıyıp paylaşabiliriz." },
      { title: "Paylaşılan belleğe", caption: "Bir A-karosu ve bir B-karosu kooperatif olarak shared memory'ye kopyalanır: blok içi tüm thread'ler aynı veriye erişir." },
      { title: "Yazmaçlarda birikim", caption: "Her thread kendi C parçasını yazmaçta tutar ve K boyunca sadece ekler: bir kez oku, çok kez çarp." },
      { title: "Yeniden kullanım", caption: "Bir A-karosu 3 farklı çıktı satırıyla, bir B-karosu da 3 farklı çıktı sütunuyla kullanılır: okuma başına hesap katlanır." },
      { title: "Epilogue füzyonu", caption: "Sonuç yazılırken bias veya aktivasyonu aynı kernel'da birleştir (fuse): ayrı bir kernel'ın bellek turu ortadan kalkar." },
      { title: "Aynı fikir her yerde", caption: "Attention, convolution, RMSNorm… hepsi aynı kalıptır: taşı → yeniden kullan → birleştir." },
    ],
    en: [
      { title: "Naive GEMM", caption: "Naive C = A×B re-reads a row of A and a column of B for every output: even with K = 4 that is 8 loads per element." },
      { title: "Tiling", caption: "Cut the matrices into tiles, say 3×3. Now data can be moved and shared tile by tile." },
      { title: "Into shared memory", caption: "One A-tile and one B-tile are cooperatively copied into shared memory, where the whole block reuses them." },
      { title: "Accumulate in registers", caption: "Each thread keeps its piece of C in registers and only adds across K: load once, multiply many times." },
      { title: "Reuse", caption: "One A-tile serves 3 output rows, one B-tile serves 3 output columns: math per loaded byte multiplies." },
      { title: "Fuse the epilogue", caption: "Fuse bias or activation into the write-back: the extra kernel and its memory round-trip disappear." },
      { title: "One idea, everywhere", caption: "Attention, convolution, RMSNorm… all follow the same pattern: move → reuse → fuse." },
    ],
  },
  correctness: {
    tr: [
      { title: "Referans sözleşmesi", caption: "Doğruluk kernel'ın kendisinden değil referanstan gelir: torch referansı + rastgele girdiler + sabit tohum (seed)." },
      { title: "Karşılaştır", caption: "Kernel çıktısı ile referansı yan yana koy. Float aritmetiği birleşmeli değildir: toplama sırası bile bit'leri değiştirir." },
      { title: "Tolerans", caption: "|x − y| ≤ atol + rtol·|y| bütçesi kabul eşiğini tanımlar. allclose(rtol, atol) bu sözleşmenin kod halidir." },
      { title: "Uç durumlar", caption: "Boş tensör, 1 eleman, 65537 gibi tek boyutlar, ±inf, sıfıra yakın değerler: hataların çoğu kenarlarda saklanır." },
      { title: "memcheck", caption: "Compute Sanitizer memcheck, dizinin dışına yazan erişimi yakalar: kernel 'çalışıyor' ama sessizce belleği bozuyor olabilir." },
      { title: "racecheck", caption: "racecheck, senkronizasyonsuz aynı adrese yazan thread'leri bulur: __syncthreads() eksikse sonuç makineden makineye değişir." },
      { title: "Kabul kapısı", caption: "Referans + tolerans + uç durum + sanitizer hepsi yeşilse kernel 'tamam'dır. Bu zincir CI'da her commit'te koşar." },
    ],
    en: [
      { title: "Reference contract", caption: "Correctness comes from a reference, not from the kernel: a torch reference plus random inputs with a fixed seed." },
      { title: "Compare", caption: "Put kernel and reference side by side. Floating-point math is not associative: even summation order changes bits." },
      { title: "Tolerance", caption: "The budget |x − y| ≤ atol + rtol·|y| defines acceptance. allclose(rtol, atol) is that contract in code." },
      { title: "Edge cases", caption: "Empty tensors, a single element, odd sizes like 65537, ±inf, near-zero values: most bugs hide at the edges." },
      { title: "memcheck", caption: "Compute Sanitizer memcheck catches out-of-bounds accesses: a kernel can 'work' while silently corrupting memory." },
      { title: "racecheck", caption: "racecheck finds threads writing the same address without synchronization: missing __syncthreads() means results vary per run." },
      { title: "Acceptance gate", caption: "Reference + tolerance + edge cases + sanitizer, all green — only then is the kernel 'done'. The chain runs in CI on every commit." },
    ],
  },
  profiling: {
    tr: [
      { title: "Naif zamanlama", caption: "time.time() ile tek ölçüm: JIT, önbellek ve saat hızı gürültüsü sonucu saptırır. Tek sayı = tek yanılgı." },
      { title: "Isınma", caption: "Önce birkaç kez çalıştır: derleme biter, önbellek dolar, GPU saat hızı oturur. Ölçüm ancak şimdi anlamlıdır." },
      { title: "Zaman çizelgesi", caption: "Nsight Systems tüm akışı gösterir: kopyalar, kernel'lar ve aralarındaki boşluklar. Önce nereye bakacağını burada seçersin." },
      { title: "Boşluk = bedava hız", caption: "Çizelgedeki boşluklar GPU'un beklediği yerlerdir. Kopyaları kernel ile üst üste getirirsen matematik değişmeden hızlanırsın." },
      { title: "Sıcak kernel", caption: "En çok zaman harcayan kernel'ı Nsight Compute ile aç: SM mi, bellek mi sınır? Cevap, optimizasyonun yönünü belirler." },
      { title: "Çatı çizgisi", caption: "Roofline, iş yoğunluğuna (FLOP/bayt) karşı elde edilen hızı çizer; noktanın çatıya uzaklığı geri kazanılabilir payı gösterir." },
      { title: "Dağılım raporu", caption: "Birkaç koşunun ortalamasını değil; yüzlerce koşunun medyanı ve p99'unu raporla. Varyantları aynı koşullarda karşılaştır." },
    ],
    en: [
      { title: "Naive timing", caption: "One time.time() measurement: JIT, caches, and clock ramping distort it. One number = one delusion." },
      { title: "Warm-up", caption: "Run a few times first: compilation finishes, caches fill, clocks settle. Only now do numbers mean anything." },
      { title: "The timeline", caption: "Nsight Systems shows the whole flow: copies, kernels, and the gaps between them. It tells you where to look next." },
      { title: "Gaps are free speed", caption: "Gaps in the timeline are the GPU waiting. Overlap copies with kernels and you gain speed without changing the math." },
      { title: "The hot kernel", caption: "Open the most expensive kernel in Nsight Compute: SM-bound or memory-bound? The answer picks your next move." },
      { title: "Roofline", caption: "The roofline plots achieved speed against arithmetic intensity (FLOP/byte); the gap to the roof is your headroom." },
      { title: "Report the distribution", caption: "Not the mean of a few runs — report the median and p99 of hundreds. Compare variants under identical conditions." },
    ],
  },
  cutlass: {
    tr: [
      { title: "Problem", caption: "D = α·A×B + β·C. Tek satır gibi görünür; bu animasyon, bu çarpımın donanıma inen yolculuğunu izler." },
      { title: "CUTLASS politikası", caption: "CUTLASS şablonları döşeme planını, veri tiplerini ve mainloop bileşenlerini seçer; parçaları bir araya getirir." },
      { title: "CuTe yerleşimi", caption: "CuTe, (m, n, k) koordinatlarını shape + stride ile bellek adresine bağlar: 'hangi veri nerede duruyor' sorusunun cebiri." },
      { title: "Veri inişi", caption: "Karolar global bellekten shared memory'ye (cp.async), oradan yazmaçlara (ldmatrix) akar; hesap sürerken sonraki karolar yoldadır." },
      { title: "PTX mma.sync", caption: "Warp, yazmaçlardaki fragment'larla mma.sync talimatını verir: küçük matris çarpımları birikimli olarak işlenir." },
      { title: "PTX → SASS", caption: "Sürücü, PTX'i hedef mimarinin gerçek talimatlarına (SASS) çevirir. Profilcide gördüğün son kod SASS'tır." },
      { title: "Tensor Core", caption: "Talimat, SM içindeki Tensor Core'da D = A×B + C'yi tek adımda işler; kernel tasarımının amacı onu aralıksız beslemektir." },
    ],
    en: [
      { title: "The problem", caption: "D = α·A×B + β·C. One line of math; this animation follows its journey down to silicon." },
      { title: "CUTLASS policy", caption: "CUTLASS templates pick the tile schedule, data types, and mainloop components; it assembles the parts." },
      { title: "CuTe layouts", caption: "CuTe maps (m, n, k) coordinates to memory addresses via shape + stride: the algebra of 'which data lives where'." },
      { title: "Data descent", caption: "Tiles stream from global to shared memory (cp.async), then to registers (ldmatrix); the next tiles are already in flight." },
      { title: "PTX mma.sync", caption: "The warp issues mma.sync over register fragments: small matrix products accumulate in place." },
      { title: "PTX → SASS", caption: "The driver lowers PTX to the real instructions of your GPU (SASS). What the profiler shows you is SASS." },
      { title: "Tensor Core", caption: "The instruction runs on a Tensor Core inside the SM, computing D = A×B + C in one step; your job is to keep it fed." },
    ],
  },
  inference: {
    tr: [
      { title: "İstek gelir", caption: "Kullanıcı sunucuya bir prompt yollar: 'GPU'ları anlat'. Amaç: yanıtın her token'ını sırayla üretmek." },
      { title: "Prefill", caption: "Prompt'un tamamı tek geçişte paralel işlenir; her token'ın anahtar/değer (KV) vektörleri önbelleğe yazılır." },
      { title: "İlk token → TTFT", caption: "İlk yanıt token'ı üretilir. Kullanıcının beklediği süre TTFT'dir: prefill ne kadar uzunsa bekleme o kadar fazla." },
      { title: "Decode döngüsü", caption: "Bundan sonrası tek yönlüdür: her adımda yalnız son token işlenir ve bir yeni token üretilir." },
      { title: "Ağırlık darboğazı", caption: "Her adımda modelin tüm ağırlıkları okunur ama hesap azdır: decode, bellek bant genişliğine bağımlıdır (memory-bound)." },
      { title: "KV-cache büyür", caption: "Her yeni token KV-cache'e eklenir ve VRAM dolmaya başlar; cache dolunca yeni istekler kuyruğa girer." },
      { title: "Sürekli toplu işleme", caption: "Continuous batching: biten isteğin yuvasına hemen yeni istek alınır; GPU dolu tutulur." },
      { title: "Ölçütler", caption: "TTFT bekleme hissini, ITL akıcılığı, iş hacmi maliyeti anlatır; üçünü birlikte yönetirsin." },
    ],
    en: [
      { title: "A request arrives", caption: "A user sends a prompt: 'explain GPUs'. The goal is to generate the answer token by token." },
      { title: "Prefill", caption: "The whole prompt is processed in one parallel pass; each token's key/value (KV) vectors are written to the cache." },
      { title: "First token → TTFT", caption: "The first answer token appears. The wait the user felt is TTFT: the longer the prompt, the longer the wait." },
      { title: "The decode loop", caption: "From here it is sequential: each step processes only the last token and produces one new token." },
      { title: "The weight bottleneck", caption: "Every step reads all model weights but does little math: decode is memory-bandwidth bound." },
      { title: "KV cache grows", caption: "Each new token appends to the KV cache; VRAM fills up. When it is full, new requests must queue." },
      { title: "Continuous batching", caption: "Continuous batching: a finished request frees its slot immediately and a new one joins; the GPU stays busy." },
      { title: "The metrics", caption: "TTFT is the wait, ITL is the smoothness, throughput is the cost. You manage all three together." },
    ],
  },
  multigpu: {
    tr: [
      { title: "Dört GPU, dört parça", caption: "Veri-paralel eğitimde her GPU kendi verisiyle gradyan hesaplar; sonuçlar farklıdır. Ortak güncelleme için hepsini toplamak gerekir." },
      { title: "Parçala", caption: "Her GPU verisini N = 4 parçaya (chunk) böler ve halka topolojisinde komşusuna göndereceği parçayı hazırlar." },
      { title: "Reduce-scatter · 1. adım", caption: "Her GPU bir parça gönderir ve komşudan geleni kendi parçasına ekler. Parçalar halkada dönmeye başlar." },
      { title: "Reduce-scatter · 2–3. adım", caption: "Üç adımın sonunda her GPU, tam toplanmış olan tek bir parçaya sahip olur: iş bölüşüldü, toplandı." },
      { title: "All-gather başlar", caption: "Şimdi tamamlanmış parçalar halkada tekrar dolaşır — bu sefer eklemek yerine kopyalanır." },
      { title: "All-gather · 2. adım", caption: "Tamamlanmış parçalar komşudan komşuya geçer; her GPU eksiklerini tek tek tamamlar." },
      { title: "All-gather · 3. adım", caption: "Son adımda her GPU, dört parçanın tamamına — yani herkesin gradyanlarının toplamına — kavuşur." },
      { title: "Maliyet", caption: "Toplam taşıma ≈ 2·(N−1)/N · veri. NVLink hızlıdır, ağ yavaştır; NCCL topolojiye göre halka veya ağaç seçer." },
    ],
    en: [
      { title: "Four GPUs, four shards", caption: "In data-parallel training each GPU computes gradients on its own data; the results differ. Updating together requires summing them." },
      { title: "Split into chunks", caption: "Each GPU splits its data into N = 4 chunks and prepares the chunk it will send to its ring neighbor." },
      { title: "Reduce-scatter · hop 1", caption: "Each GPU sends one chunk and adds the chunk received from its neighbor. Chunks start circulating." },
      { title: "Reduce-scatter · hops 2–3", caption: "After three hops each GPU owns exactly one fully reduced chunk: the work was divided, then summed." },
      { title: "All-gather begins", caption: "Now the finished chunks circulate again — this time they are copied, not added." },
      { title: "All-gather · hop 2", caption: "Completed chunks pass from neighbor to neighbor; each GPU fills in its missing pieces." },
      { title: "All-gather · hop 3", caption: "In the final hop every GPU collects all four chunks — the sum of everyone's gradients." },
      { title: "The cost", caption: "Total traffic ≈ 2·(N−1)/N × data. NVLink is fast, the network is slow; NCCL picks ring or tree based on topology." },
    ],
  },
  systems: {
    tr: [
      { title: "Python'dan", caption: "model(x) yazarsın. Bu satır, uzun bir yazılım zincirinin yalnızca ilk halkasıdır." },
      { title: "Framework katmanı", caption: "PyTorch operatörü dispatcher ile çözümlenir: hazır CUDA kernel'ı mı, Triton mu, yoksa CPU yolu mu çalışacak?" },
      { title: "Derleyici katmanı", caption: "torch.compile grafı yakalar, derleyici ara gösterimlerinden geçirdikten sonra Triton veya CUDA üretir ve PTX'e derler." },
      { title: "Çalışma zamanı", caption: "CUDA çalışma zamanı ve sürücü, işleri GPU komut kuyruklarına dizer; akışlar (stream) eşzamanlılığı yönetir." },
      { title: "Alternatif yığınlar", caption: "Aynı fikir başka yığınlarda da vardır: ROCm/HIP (AMD), TensorRT (çıkarım motoru), MLIR tabanlı derleyiciler." },
      { title: "Doğru katman", caption: "Optimizasyon problemini doğru katmana koy: bir satır API değişikliği mi, yeni bir kernel mı, yoksa derleyici bayrağı mı?" },
    ],
    en: [
      { title: "It starts in Python", caption: "You write model(x). That line is just the first link of a long software chain." },
      { title: "The framework layer", caption: "PyTorch resolves the operator through its dispatcher: a stock CUDA kernel, Triton, or the CPU path?" },
      { title: "The compiler layer", caption: "torch.compile captures the graph, lowers it through compiler IRs into Triton or CUDA, and compiles to PTX." },
      { title: "The runtime", caption: "The CUDA runtime and driver enqueue work onto GPU command queues; streams manage concurrency." },
      { title: "Alternative stacks", caption: "The same idea exists in other stacks: ROCm/HIP (AMD), TensorRT (inference engines), MLIR-based compilers." },
      { title: "The right layer", caption: "Place each optimization problem in the right layer: an API change, a new kernel, or a compiler flag?" },
    ],
  },
};

const studioUi = {
  tr: {
    kicker: "KONSEPT STÜDYOSU · ADIM ADIM ANİMASYON",
    stepsLabel: "Adımlar",
    play: "Oynat",
    pause: "Duraklat",
    prev: "Önceki adım",
    next: "Sonraki adım",
    restart: "Baştan",
    speedLabel: "hız",
    whyLabel: "NEDEN ÖNEMLİ?",
    stepOf: "Adım",
    hint: "Bir adıma tıklayarak doğrudan atla.",
  },
  en: {
    kicker: "CONCEPT STUDIO · STEP-BY-STEP ANIMATION",
    stepsLabel: "Steps",
    play: "Play",
    pause: "Pause",
    prev: "Previous step",
    next: "Next step",
    restart: "Restart",
    speedLabel: "speed",
    whyLabel: "WHY IT MATTERS",
    stepOf: "Step",
    hint: "Click any step to jump straight to it.",
  },
} as const;

const STEP_MS = 3400;

type StageProps = { step: number; locale: Locale };

function StageToolchain({ step, locale }: StageProps) {
  const tr = locale === "tr";
  const boxes = tr
    ? [
        ["Kaynak", "main.cpp · kernel.cu"],
        ["CMake", "yapılandırma"],
        ["Derleyici", ".o nesneleri"],
        ["Bağlayıcı", "çalıştırılabilir"],
        ["ctest", "testler"],
        ["git", "kontrol noktası"],
      ]
    : [
        ["Sources", "main.cpp · kernel.cu"],
        ["CMake", "configure"],
        ["Compiler", ".o objects"],
        ["Linker", "executable"],
        ["ctest", "tests"],
        ["git", "checkpoint"],
      ];
  const lines = tr
    ? [
        ["$ ls src/", "main.cpp  kernel.cu  CMakeLists.txt"],
        ["$ cmake -B build -G Ninja", "-- Configuring done (0.4s)"],
        ["$ ninja -j8", "[9/9] Building CXX object kernel.cu.o"],
        ["[9/9] Linking target app", "LD build/app ✓"],
        ["$ ctest", "100% tests passed, 0 failed / 12"],
        ["$ git commit -m 'vector add'", "[main 4f2a9c1] 2 files changed"],
        ["$ değiştir → derle → test → commit ↻"],
      ]
    : [
        ["$ ls src/", "main.cpp  kernel.cu  CMakeLists.txt"],
        ["$ cmake -B build -G Ninja", "-- Configuring done (0.4s)"],
        ["$ ninja -j8", "[9/9] Building CXX object kernel.cu.o"],
        ["[9/9] Linking target app", "LD build/app ✓"],
        ["$ ctest", "100% tests passed, 0 failed / 12"],
        ["$ git commit -m 'vector add'", "[main 4f2a9c1] 2 files changed"],
        ["$ edit → build → test → commit ↻"],
      ];
  return (
    <div className="st-pipe">
      <div className="cs-flow">
        {boxes.map((box, index) => (
          <div key={box[0]} className={`cs-box${index === step ? " on" : ""}${index < step ? " done" : ""}`}>
            <small>0{index + 1}</small>
            <b>{box[0]}</b>
            <span>{box[1]}</span>
          </div>
        ))}
      </div>
      <div className="st-term" aria-hidden="true">
        {lines.slice(0, Math.min(step + 1, lines.length)).map((pair, index) => (
          <p key={index} className={index === Math.min(step, lines.length - 1) ? "hot" : ""}>
            <b>{pair[0]}</b>
            {pair[1]}
          </p>
        ))}
        <i className="st-caret" />
      </div>
    </div>
  );
}

function StageArchitecture({ step, locale }: StageProps) {
  const tr = locale === "tr";
  const lanes = Array.from({ length: 32 }, (_, lane) => lane);
  const showWarp = step >= 3;
  const diverged = step === 6;
  const allOn = step === 4 || step === 5 || step === 7;
  return (
    <div className="st-arch">
      <div className={`st-problem${step === 0 ? " on" : " dim"}`}>
        <span>{tr ? "PROBLEM" : "PROBLEM"}</span>
        <b>N = 1000</b>
        <div className="st-cells">
          {Array.from({ length: 24 }, (_, index) => (
            <i key={index} className={step === 0 && index % 3 === 0 ? "hot" : ""} />
          ))}
        </div>
      </div>
      <div className="st-sms">
        {[0, 1].map((sm) => (
          <div key={sm} className={`st-sm${step >= 2 ? " on" : " dim"}`}>
            <small>
              SM {sm} {tr ? "· 2 blok" : "· 2 blocks"}
            </small>
            <div className="st-blocks">
              {[0, 1].map((slot) => {
                const blockIndex = sm * 2 + slot;
                return (
                  <div key={slot} className={`st-block${step >= 1 ? " on" : ""}${step === 2 && blockIndex === 3 ? " last" : ""}`}>
                    <b>
                      {tr ? "blok" : "block"} {blockIndex}
                    </b>
                    <span>256 th = 8 warp</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div className="st-launch">
          <code>myKernel&lt;&lt;&lt;4, 256&gt;&gt;&gt;(…)</code>
          <span>{tr ? "ceil(1000 / 256) = 4 blok" : "ceil(1000 / 256) = 4 blocks"}</span>
        </div>
      </div>
      <div className={`st-warpzone${showWarp ? " on" : ""}`}>
        <small>{tr ? "WARP 0 · BLOK 0 · 32 LANE" : "WARP 0 · BLOCK 0 · 32 LANES"}</small>
        <div className="cs-lanes">
          {lanes.map((lane) => {
            const state = !showWarp ? "" : diverged ? (lane < 16 ? " a" : " b") : allOn ? " on" : "";
            return <span key={lane} className={`cs-lane${state}`} title={`lane ${lane}`}>{lane}</span>;
          })}
        </div>
        {step >= 4 && (
          <code className="st-formula">i = blockIdx.x · blockDim.x + threadIdx.x{step === 5 ? "  →  if (i &lt; N)" : ""}</code>
        )}
        {diverged && (
          <div className="st-legend">
            <span className="dot a" />
            {tr ? "Yol A · 16 lane aktif" : "Path A · 16 lanes active"}
            <span className="dot b" />
            {tr ? "Yol B · 16 lane maskeli → sonra tersi" : "Path B · 16 masked → then swapped"}
          </div>
        )}
      </div>
    </div>
  );
}

function StageMemory({ step, locale }: StageProps) {
  const tr = locale === "tr";
  const stride = step === 3 ? 2 : step === 4 ? 4 : 1;
  const active = step >= 2 && step <= 4;
  const addresses = Array.from({ length: 32 }, (_, lane) => lane * stride);
  const sectors = Array.from({ length: 16 }, (_, index) => index);
  const hit = new Set(active ? addresses.map((address) => Math.floor(address / 8)) : []);
  const fetched = hit.size;
  const efficiency = fetched === 0 ? 0 : Math.min(100, Math.round((128 / (fetched * 32)) * 100));
  return (
    <div className="st-mem">
      <div className="st-row-label">
        <span>{tr ? "WARP · 32 LANE" : "WARP · 32 LANES"}</span>
        <span>{tr ? "her lane 1 float (4 B) okur" : "each lane reads 1 float (4 B)"}</span>
      </div>
      <div className="cs-lanes">
        {addresses.map((address, lane) => (
          <span key={lane} className={`cs-lane${active ? " on" : ""}`} title={`a[${address}]`}>
            {address}
          </span>
        ))}
      </div>
      <div className="st-row-label">
        <span>{tr ? "GLOBAL BELLEK · 32 B SEKTÖRLER" : "GLOBAL MEMORY · 32 B SECTORS"}</span>
        <span>{tr ? "bir sektör tamamen taşınır" : "a sector always moves in full"}</span>
      </div>
      <div className="st-sectors">
        {sectors.map((sector) => (
          <span key={sector} className={hit.has(sector) ? "on" : ""}>
            {(sector * 8).toString().padStart(3, "0")}
          </span>
        ))}
      </div>
      <div className="st-meters">
        <div>
          <small>{tr ? "taşınan sektör" : "sectors moved"}</small>
          <b>{active ? fetched : "—"}</b>
        </div>
        <div>
          <small>{tr ? "taşınan bayt" : "bytes moved"}</small>
          <b>{active ? fetched * 32 : "—"}</b>
        </div>
        <div>
          <small>{tr ? "kullanışlı bayt" : "useful bytes"}</small>
          <b>{active ? 128 : "—"}</b>
        </div>
        <div className={efficiency > 0 && efficiency < 60 ? "bad" : ""}>
          <small>{tr ? "verim" : "efficiency"}</small>
          <b>{active ? `${efficiency}%` : "—"}</b>
        </div>
      </div>
      {step === 5 && (
        <p className="st-note">
          {tr
            ? "Çözüm: veri düzenini bitişiğe çevir (SoA), thread↔veri eşlemesini ve blok boyutunu yeniden düşün."
            : "The fix: make the layout contiguous (SoA) and rethink the thread↔data mapping and block size."}
        </p>
      )}
    </div>
  );
}

function StageTriton({ step, locale }: StageProps) {
  const tr = locale === "tr";
  const code = tr
    ? [
        "# referans (torch)",
        "torch_out = x + y",
        "",
        "@triton.jit",
        "def add_kernel(x_ptr, y_ptr, o_ptr, n,",
        "               BLOCK: tl.constexpr):",
        "    pid  = tl.program_id(0)",
        "    offs = pid * BLOCK + tl.arange(0, BLOCK)",
        "    mask = offs < n",
        "    tl.store(o_ptr + offs, x + y, mask=mask)",
      ]
    : [
        "# reference (torch)",
        "torch_out = x + y",
        "",
        "@triton.jit",
        "def add_kernel(x_ptr, y_ptr, o_ptr, n,",
        "               BLOCK: tl.constexpr):",
        "    pid  = tl.program_id(0)",
        "    offs = pid * BLOCK + tl.arange(0, BLOCK)",
        "    mask = offs < n",
        "    tl.store(o_ptr + offs, x + y, mask=mask)",
      ];
  const hotLine = [1, 6, 4, 6, 4, 8, 9][Math.min(step, 6)];
  const programs = Array.from({ length: 8 }, (_, index) => index);
  const launched = step >= 3;
  return (
    <div className="st-triton">
      <div className="st-code">
        {code.map((line, index) => (
          <p key={index} className={index === hotLine ? "hot" : ""}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            {line || " "}
          </p>
        ))}
      </div>
      <div className="st-gpuside">
        <small>{tr ? "GPU · GRID = 8 PROGRAM (n=1000, BLOCK=128)" : "GPU · GRID = 8 PROGRAMS (n=1000, BLOCK=128)"}</small>
        <div className="st-programs">
          {programs.map((pid) => (
            <div key={pid} className={`st-program${launched ? " on" : ""}${step >= 5 && pid === 7 ? " masked" : ""}`}>
              <b>pid {pid}</b>
              <span>{step >= 5 && pid === 7 ? (tr ? "mask: 104/128" : "mask: 104/128") : "128/128"}</span>
            </div>
          ))}
        </div>
        {step === 4 && (
          <p className="st-note">
            {tr ? "İlk çağrı: Triton bu GPU için kernel'ı derliyor (JIT)…" : "First call: Triton is compiling the kernel for this GPU (JIT)…"}
          </p>
        )}
        {step === 6 && (
          <p className="st-note">
            {tr ? "backward kaydı → autograd · torch.compile → füzyon" : "backward registration → autograd · torch.compile → fusion"}
          </p>
        )}
      </div>
    </div>
  );
}

function StageOperators({ step, locale }: StageProps) {
  const tr = locale === "tr";
  const aCells = Array.from({ length: 24 }, (_, index) => index);
  const bCells = Array.from({ length: 24 }, (_, index) => index);
  const cCells = Array.from({ length: 36 }, (_, index) => index);
  const tiled = step >= 1;
  const tileARow = (cell: number) => tiled && Math.floor(cell / 8) >= 1 && Math.floor(cell / 8) <= 3 && cell % 8 >= 1 && cell % 8 <= 3;
  const naiveRow = (cell: number) => step === 0 && Math.floor(cell / 8) === 1;
  const tileBCol = (cell: number) => tiled && cell % 6 >= 1 && cell % 6 <= 3 && Math.floor(cell / 6) >= 1 && Math.floor(cell / 6) <= 3;
  const naiveCol = (cell: number) => step === 0 && cell % 6 === 1;
  const tileC = (cell: number) => tiled && Math.floor(cell / 6) >= 1 && Math.floor(cell / 6) <= 3 && cell % 6 >= 1 && cell % 6 <= 3;
  const smemOn = step >= 2;
  const regOn = step >= 3;
  return (
    <div className="st-gemm">
      <div className="st-mats">
        <div className="st-mat">
          <small>A · 6×4</small>
          <div>
            {aCells.map((cell) => (
              <i key={cell} className={naiveRow(cell) ? "naive" : tileARow(cell) ? "tile" : ""} />
            ))}
          </div>
        </div>
        <em>×</em>
        <div className="st-mat">
          <small>B · 4×6</small>
          <div>
            {bCells.map((cell) => (
              <i key={cell} className={naiveCol(cell) ? "naive" : tileBCol(cell) ? "tile" : ""} />
            ))}
          </div>
        </div>
        <em>=</em>
        <div className="st-mat c">
          <small>C · 6×6</small>
          <div>
            {cCells.map((cell) => (
              <i
                key={cell}
                className={step === 0 && cell === 7 ? "naive" : tileC(cell) ? (step >= 5 ? "done" : "tile") : ""}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="st-gemm-lower">
        <div className={`st-buf${smemOn ? " on" : ""}`}>
          <small>SHARED MEMORY</small>
          <div>
            <span className={smemOn ? "a on" : "a"}>{tr ? "A-karosu 3×3" : "A-tile 3×3"}</span>
            <span className={smemOn ? "b on" : "b"}>{tr ? "B-karosu 3×3" : "B-tile 3×3"}</span>
          </div>
          <p>{tr ? "blok içi herkes erişir" : "the whole block reuses it"}</p>
        </div>
        <div className={`st-buf${regOn ? " on" : ""}`}>
          <small>REGISTERS</small>
          <div>
            <span className="acc">acc += a·b</span>
          </div>
          <p>{tr ? "K boyunca sadece toplama" : "only adds across K"}</p>
        </div>
        <div className="st-gemm-stats">
          <div>
            <small>{tr ? "okuma / çıktı" : "loads / output"}</small>
            <b>{step === 0 ? "8" : tiled ? "1" : "—"}</b>
          </div>
          <div>
            <small>{tr ? "yeniden kullanım" : "reuse factor"}</small>
            <b>{step >= 4 ? "3×3 → 9×" : "—"}</b>
          </div>
          <div>
            <small>{tr ? "epilogue" : "epilogue"}</small>
            <b>{step >= 5 ? (tr ? "bias + akt." : "bias + act.") : "—"}</b>
          </div>
        </div>
      </div>
      {step === 6 && (
        <p className="st-note">
          {tr
            ? "Attention, convolution, RMSNorm… hepsi aynı kalıp: taşı → yeniden kullan → birleştir."
            : "Attention, convolution, RMSNorm… the same pattern: move → reuse → fuse."}
        </p>
      )}
    </div>
  );
}

function StageCorrectness({ step, locale }: StageProps) {
  const tr = locale === "tr";
  const rows = [
    ["1.000000", "1.000871", true],
    ["2.000000", "1.999312", true],
    ["0.500000", "0.500204", true],
    ["-3.200000", "-3.201104", true],
    ["1.0e-08", "2.4e-08", true],
    ["1.000000", "8.742131", false],
  ] as const;
  const comparing = step >= 1;
  const showVerdict = step >= 2;
  const fixed = step >= 6;
  const badges = tr
    ? [
        ["allclose", step >= 2],
        ["uç durumlar", step >= 3],
        ["memcheck", step >= 4],
        ["racecheck", step >= 5],
        ["CI kapısı", step >= 6],
      ]
    : [
        ["allclose", step >= 2],
        ["edge cases", step >= 3],
        ["memcheck", step >= 4],
        ["racecheck", step >= 5],
        ["CI gate", step >= 6],
      ];
  return (
    <div className="st-corr">
      <div className="st-corr-cols">
        <div className="st-corr-col">
          <small>{tr ? "REFERANS (torch, cpu)" : "REFERENCE (torch, cpu)"}</small>
          {rows.map((row) => (
            <p key={row[0]}>{row[0]}</p>
          ))}
        </div>
        <div className="st-corr-col">
          <small>{tr ? "KERNEL (gpu)" : "KERNEL (gpu)"}</small>
          {rows.map((row) => (
            <p key={row[0]} className={comparing ? (fixed || row[2] ? "ok" : "no") : ""}>
              {row[1]}
            </p>
          ))}
        </div>
        <div className="st-corr-col wide">
          <small>{tr ? "TOLERANS |x−y| ≤ atol + rtol·|y|" : "TOLERANCE |x−y| ≤ atol + rtol·|y|"}</small>
          {rows.map((row) => (
            <p key={row[0]} className={showVerdict ? (fixed || row[2] ? "ok" : "no") : ""}>
              {showVerdict ? (fixed || row[2] ? "✓" : (tr ? "✗ tolerans dışı" : "✗ out of tolerance")) : "…"}
            </p>
          ))}
        </div>
      </div>
      <div className="st-badges">
        {badges.map((badge) => (
          <span key={badge[0] as string} className={badge[1] ? (fixed ? "ok" : "warn") : ""}>
            {badge[0] as string}
          </span>
        ))}
      </div>
      {step === 4 && (
        <p className="st-note">{tr ? "memcheck: a[N + 17] adresine yazma yakalandı — 'çalışıyor' ama belleği bozuyor." : "memcheck: write to a[N + 17] caught — it 'works' but corrupts memory."}</p>
      )}
      {step === 5 && (
        <p className="st-note">{tr ? "racecheck: iki thread aynı adrese __syncthreads() olmadan yazıyor." : "racecheck: two threads write the same address without __syncthreads()."}</p>
      )}
      {step === 6 && (
        <p className="st-note">{tr ? "Hatalar düzeltildi; tüm kapılar yeşil. Zincir artık her commit'te otomatik koşar." : "Bugs fixed; every gate is green. The chain now runs automatically on every commit."}</p>
      )}
    </div>
  );
}

function StageProfiling({ step, locale }: StageProps) {
  const tr = locale === "tr";
  const timeline: [string, number][] = tr
    ? [
        ["H2D kopya", 14],
        ["boşluk", 8],
        ["kernel A", 30],
        ["kernel B", 22],
        ["boşluk", 10],
        ["D2H", 16],
      ]
    : [
        ["H2D copy", 14],
        ["gap", 8],
        ["kernel A", 30],
        ["kernel B", 22],
        ["gap", 10],
        ["D2H", 16],
      ];
  const showTimeline = step >= 2;
  const overlap = step >= 3;
  const metersOn = step >= 4;
  const roofOn = step >= 5;
  const histOn = step >= 6;
  const bars = [42, 44, 41, 46, 43, 45, 62, 44];
  return (
    <div className="st-prof">
      <div className={`st-blockrow${showTimeline ? " on" : ""}`}>
        <div className="st-tl">
          <small>{tr ? "ZAMAN ÇİZELGESİ (Nsight Systems)" : "TIMELINE (Nsight Systems)"}</small>
          <div>
            {timeline.map((seg) => (
              <span key={seg[0]} style={{ flexGrow: seg[1] }} className={seg[0].startsWith("boş") || seg[0] === "gap" ? (overlap ? "gap fixed" : "gap") : ""}>
                {seg[1] >= 10 ? seg[0] : ""}
              </span>
            ))}
          </div>
          <div className={overlap ? "st-tl overlapped" : "st-tl overlapped off"}>
            {tr ? "kopya + kernel üst üste → boşluk yok" : "copy + kernel overlapped → no gaps"}
          </div>
        </div>
      </div>
      <div className={`st-blockrow${metersOn ? " on" : ""}`}>
        <div className="st-meters prof">
          <div>
            <small>{tr ? "SM kullanımı" : "SM throughput"}</small>
            <b>35%</b>
            <i style={{ width: "35%" }} />
          </div>
          <div>
            <small>{tr ? "bellek kullanımı" : "memory throughput"}</small>
            <b>92%</b>
            <i style={{ width: "92%" }} />
          </div>
          <div>
            <small>{tr ? "teşhis" : "verdict"}</small>
            <b className="bad">{tr ? "bellek bağımlı" : "memory-bound"}</b>
          </div>
        </div>
      </div>
      <div className={`st-blockrow${roofOn ? " on" : ""}`}>
        <div className="st-roof">
          <small>{tr ? "ÇATI ÇİZGİSİ (Nsight Compute)" : "ROOFLINE (Nsight Compute)"}</small>
          <svg viewBox="0 0 300 130" role="img" aria-label="roofline">
            <line x1="30" y1="115" x2="290" y2="115" className="axis" />
            <line x1="30" y1="115" x2="30" y2="8" className="axis" />
            <polyline points="30,60 130,60 290,10" className="roof" />
            <text x="150" y="126" className="lbl">{tr ? "iş yoğunluğu (FLOP/B)" : "arithmetic intensity (FLOP/B)"}</text>
            <text x="4" y="18" className="lbl">{tr ? "hız" : "speed"}</text>
            <g className={`pt${roofOn ? " show" : ""}`} style={{ transform: step >= 5 ? "translate(78px, 66px)" : "translate(16px, 100px)" }}>
              <circle r="5" />
              <text x="10" y="4">{step >= 6 ? (tr ? "iyileştirildi" : "improved") : tr ? "senin kernel'ın" : "your kernel"}</text>
            </g>
          </svg>
        </div>
      </div>
      <div className={`st-blockrow${histOn ? " on" : ""}`}>
        <div className="st-hist">
          <small>{tr ? "500 KOŞU · DAĞILIM" : "500 RUNS · DISTRIBUTION"}</small>
          <div>
            {bars.map((bar, index) => (
              <i key={index} style={{ height: `${bar}%` }} className={index === 6 ? "p99" : index === 2 ? "med" : ""} />
            ))}
          </div>
          <p>
            {tr ? "medyan 44 µs · p99 62 µs — ortalamayı değil dağılımı raporla" : "median 44 µs · p99 62 µs — report the distribution, not the mean"}
          </p>
        </div>
      </div>
    </div>
  );
}

function StageCutlass({ step, locale }: StageProps) {
  const tr = locale === "tr";
  const layers = tr
    ? [
        ["CUTLASS", "döşeme politikası · mainloop", "Gemm<128×128×64, TF32>"],
        ["CuTe", "koordinat → adres eşlemesi", "make_layout(shape, stride)"],
        ["cp.async", "global → shared akışı", "commit_group / wait_group"],
        ["ldmatrix", "shared → register fragment", "ldmatrix.x4.shared.b16"],
        ["PTX", "warp kolektif talimat", "mma.sync.m16n8k8"],
        ["SASS", "hedef mimarinin kodu", "HMMA.16816.F32"],
      ]
    : [
        ["CUTLASS", "tile policy · mainloop", "Gemm<128×128×64, TF32>"],
        ["CuTe", "coordinate → address map", "make_layout(shape, stride)"],
        ["cp.async", "global → shared stream", "commit_group / wait_group"],
        ["ldmatrix", "shared → register fragment", "ldmatrix.x4.shared.b16"],
        ["PTX", "warp-collective instruction", "mma.sync.m16n8k8"],
        ["SASS", "target-architecture code", "HMMA.16816.F32"],
      ];
  const activeLayer = Math.min(Math.max(step - 1, 0), 5);
  return (
    <div className="st-desc">
      <div className="st-desc-list">
        {layers.map((layer, index) => (
          <div key={layer[0]} className={`st-descl${index === activeLayer && step >= 1 ? " on" : ""}${index < activeLayer && step >= 1 ? " done" : ""}`}>
            <small>0{index + 1}</small>
            <div>
              <b>{layer[0]}</b>
              <span>{layer[1]}</span>
            </div>
            <code>{layer[2]}</code>
          </div>
        ))}
      </div>
      <i className="st-token" style={{ top: `calc(${(activeLayer + 0.5) * (100 / 6)}% - 6px)` }} aria-hidden="true" />
      {step === 0 && (
        <p className="st-note">{tr ? "D = α·A×B + β·C — veri paketiyle birlikte altı katmana iniyoruz." : "D = α·A×B + β·C — we descend six layers together with the data packet."}</p>
      )}
      {step === 6 && (
        <p className="st-note">{tr ? "Tensor Core talimatı beslenmeyi bekliyor: işi iyi kernel'da yapmak onu doyurmaktır." : "The Tensor Core waits to be fed: a good kernel is one that keeps it busy."}</p>
      )}
    </div>
  );
}

function StageInference({ step, locale }: StageProps) {
  const tr = locale === "tr";
  type Slot = { name: string; prompt: number; tokens: number; done: boolean };
  const slotsFor = (current: number): Slot[] => {
    const base: Slot[] = [
      { name: "A", prompt: 4, tokens: 0, done: false },
      { name: "B", prompt: 3, tokens: 0, done: false },
      { name: "C", prompt: 5, tokens: 0, done: false },
    ];
    const gen = (slot: Slot) => {
      if (current <= 1) return 0;
      return Math.max(0, Math.min(slot.name === "A" ? 5 : 4, current - 1));
    };
    const mapped = base.map((slot) => ({ ...slot, tokens: gen(slot) }));
    if (current >= 6 && mapped[0].tokens >= 5) {
      mapped[0] = { name: "D", prompt: 2, tokens: current >= 7 ? 1 : 0, done: false };
    }
    return mapped;
  };
  const slots = slotsFor(step);
  const kvPct = [8, 22, 30, 40, 50, 62, 66, 72][Math.min(step, 7)];
  return (
    <div className="st-serve">
      <div className="st-slots">
        {slots.map((slot) => (
          <div key={slot.name} className={`st-slot${slot.name === "D" ? " new" : ""}${step >= 1 ? " on" : ""}`}>
            <small>{tr ? "İSTEK" : "REQUEST"} {slot.name}</small>
            <div className="st-promptbars">
              {Array.from({ length: slot.prompt }, (_, index) => (
                <i key={index} className={step >= 1 ? "on" : ""} />
              ))}
            </div>
            <div className="st-tokenrow" aria-hidden="true">
              {Array.from({ length: 5 }, (_, index) => (
                <i key={index} className={index < slot.tokens ? "on" : ""} />
              ))}
            </div>
            <span>{slot.tokens > 0 ? `${slot.tokens} token` : step === 0 ? (tr ? "kuyrukta" : "queued") : step === 1 ? (tr ? "prefill…" : "prefill…") : "…"}</span>
          </div>
        ))}
      </div>
      <div className="st-kv">
        <div className="st-kv-head">
          <small>KV-CACHE · VRAM</small>
          <b>{kvPct}%</b>
        </div>
        <i>
          <b style={{ width: `${kvPct}%` }} />
        </i>
        <span>{tr ? "her token anahtar/değer çifti ekler" : "each token appends a key/value pair"}</span>
      </div>
      <div className="st-metrics">
        <span className={step >= 2 ? "on" : ""}>TTFT {step >= 2 ? (tr ? "· ilk token süresi" : "· time to first token") : ""}</span>
        <span className={step >= 3 ? "on" : ""}>ITL {step >= 3 ? (tr ? "· tokenlar arası süre" : "· inter-token latency") : ""}</span>
        <span className={step >= 6 ? "on" : ""}>{tr ? "İŞ HACMİ" : "THROUGHPUT"} {step >= 6 ? (tr ? "· eşzamanlı istek" : "· concurrent requests") : ""}</span>
      </div>
    </div>
  );
}

type RingState = { vals: number[][]; changed: number[] };

const ringStates: RingState[] = (() => {
  const N = 4;
  const states: RingState[] = [];
  let vals = Array.from({ length: N }, (_, g) => Array.from({ length: N }, (_, c) => (c === 0 ? g + 1 : 0)));
  for (let c = 1; c < N; c += 1) for (let g = 0; g < N; g += 1) vals[g][c] = vals[g][0];
  states.push({ vals: vals.map((row) => [...row]), changed: [] });
  const clone = () => vals.map((row) => [...row]);
  for (let h = 0; h < 3; h += 1) {
    const next = clone();
    const changed: number[] = [];
    for (let g = 0; g < N; g += 1) {
      const sender = (g + N - 1) % N;
      const chunk = (sender - h + N) % N;
      next[g][chunk] += vals[sender][chunk];
      changed.push(g * N + chunk);
    }
    vals = next;
    states.push({ vals: clone(), changed });
  }
  for (let h = 0; h < 3; h += 1) {
    const next = clone();
    const changed: number[] = [];
    for (let g = 0; g < N; g += 1) {
      const sender = (g + N - 1) % N;
      const chunk = (sender + 1 - h + N) % N;
      if (vals[sender][chunk] === 10) {
        next[g][chunk] = 10;
        changed.push(g * N + chunk);
      }
    }
    vals = next;
    states.push({ vals: clone(), changed });
  }
  return states;
})();

function StageNccl({ step, locale }: StageProps) {
  const tr = locale === "tr";
  const stateIndex = step <= 1 ? 0 : Math.min(step - 1, ringStates.length - 1);
  const state = ringStates[stateIndex];
  const phase = step <= 1 ? "idle" : step <= 4 ? "rs" : step <= 7 ? "ag" : "done";
  return (
    <div className="st-ring">
      <div className="st-ring-head">
        <span className={phase === "rs" ? "on rs" : ""}>REDUCE-SCATTER</span>
        <span className={phase === "ag" ? "on ag" : ""}>ALL-GATHER</span>
        <small>{tr ? "her hücre = bir chunk · 10 = tam toplanmış (1+2+3+4)" : "each cell = a chunk · 10 = fully reduced (1+2+3+4)"}</small>
      </div>
      <div className="st-ring-grid">
        {[0, 1, 3, 2].map((gpu, position) => (
          <div key={gpu} className={`st-gpu${position === 0 ? " tl" : ""}${position === 1 ? " tr" : ""}${position === 2 ? " bl" : ""}${position === 3 ? " br" : ""}`}>
            <small>GPU {gpu}</small>
            <div>
              {state.vals[gpu].map((value, chunk) => (
                <span
                  key={chunk}
                  className={`${value === 10 ? "full" : ""}${state.changed.includes(gpu * 4 + chunk) ? " move" : ""}`}
                >
                  {value}
                </span>
              ))}
            </div>
          </div>
        ))}
        <i className="st-ring-arrow a1" aria-hidden="true">→</i>
        <i className="st-ring-arrow a2" aria-hidden="true">↓</i>
        <i className="st-ring-arrow a3" aria-hidden="true">←</i>
        <i className="st-ring-arrow a4" aria-hidden="true">↑</i>
      </div>
      {step === 7 && (
        <p className="st-note">
          {tr
            ? "Toplam ≈ 2·(N−1)/N·veri baytı taşındı; her GPU artık ortak toplamla güncelleyebilir."
            : "Total ≈ 2·(N−1)/N × data bytes moved; every GPU can now update with the shared sum."}
        </p>
      )}
    </div>
  );
}

function StageSystems({ step, locale }: StageProps) {
  const tr = locale === "tr";
  const layers = tr
    ? [
        ["Framework", "PyTorch · dispatcher", "model(x)"],
        ["Derleyici", "Inductor · MLIR · Triton", "graph → PTX"],
        ["Çalışma zamanı", "CUDA driver · stream'ler", "cudaLaunchKernel"],
        ["ISA", "PTX → SASS", "sm_89"],
        ["Donanım", "SM · Tensor Core · HBM", "HMMA · LDS"],
      ]
    : [
        ["Framework", "PyTorch · dispatcher", "model(x)"],
        ["Compiler", "Inductor · MLIR · Triton", "graph → PTX"],
        ["Runtime", "CUDA driver · streams", "cudaLaunchKernel"],
        ["ISA", "PTX → SASS", "sm_89"],
        ["Hardware", "SM · Tensor Core · HBM", "HMMA · LDS"],
      ];
  const active = Math.min(step, 4);
  return (
    <div className="st-sys">
      <div className="st-sys-list">
        {layers.map((layer, index) => (
          <div key={layer[0]} className={`st-descl${index === active ? " on" : ""}${index < active ? " done" : ""}`}>
            <small>0{index + 1}</small>
            <div>
              <b>{layer[0]}</b>
              <span>{layer[1]}</span>
            </div>
            <code>{layer[2]}</code>
          </div>
        ))}
        <i className="st-token" style={{ top: `calc(${(active + 0.5) * 20}% - 6px)` }} aria-hidden="true" />
      </div>
      {step >= 4 && (
        <div className="st-alt">
          <small>{tr ? "ALTERNATİF YIĞINLAR" : "ALTERNATIVE STACKS"}</small>
          <span>ROCm / HIP</span>
          <span>TensorRT</span>
          <span>MLIR derleyicileri</span>
        </div>
      )}
      {step === 5 && (
        <p className="st-note">
          {tr
            ? "Her problem doğru katmanda çözülür: API değişikliği, kernel mı, derleyici bayrağı mı?"
            : "Each problem belongs to a layer: an API change, a kernel, or a compiler flag?"}
        </p>
      )}
    </div>
  );
}

function StageVisual({ step, locale }: StageProps) {
  const tr = locale === "tr";
  const cpuOn = step === 1;
  const gpuOn = step === 2;
  const anatomyOn = step >= 3;
  const lifeOn = step >= 4;
  const lifecycle = tr
    ? [["Yaz", "CUDA / Triton"], ["Derle", "nvcc / JIT"], ["Başlat", "<<<blocks, threads>>>"], ["Yürüt", "bloklar → SM'ler"], ["Yaz + kopyala", "HBM → host"]]
    : [["Write", "CUDA / Triton"], ["Compile", "nvcc / JIT"], ["Launch", "<<<blocks, threads>>>"], ["Execute", "blocks → SMs"], ["Write + copy", "HBM → host"]];
  return (
    <div className="st-visual">
      <div className="st-duel">
        <div className={`st-duel-side cpu${cpuOn ? " on" : ""}`}>
          <small>CPU · {tr ? "4 güçlü çekirdek" : "4 powerful cores"}</small>
          <div className="st-cores">
            {[0, 1, 2, 3].map((core) => (
              <div key={core} className="st-core">
                <b>{tr ? "çekirdek" : "core"} {core}</b>
                <div className="st-queue">
                  {[0, 1, 2].map((task) => (
                    <i key={task} style={{ animationDelay: `${core * 260 + task * 90}ms` }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <span>{tr ? "sırayla · gecikme odaklı" : "one by one · latency oriented"}</span>
        </div>
        <em>VS</em>
        <div className={`st-duel-side gpu${gpuOn ? " on" : ""}`}>
          <small>GPU · {tr ? "binlerce basit çekirdek" : "thousands of simple cores"}</small>
          <div className="st-smgrid">
            {Array.from({ length: 64 }, (_, index) => (
              <i key={index} style={{ animationDelay: `${(index % 8) * 90 + Math.floor(index / 8) * 45}ms` }} />
            ))}
          </div>
          <span>{tr ? "aynı anda · iş hacmi odaklı" : "all at once · throughput oriented"}</span>
        </div>
      </div>
      <div className={`st-anatomy${anatomyOn ? " on" : ""}`}>
        {[
          ["HBM", tr ? "geniş + hızlı bellek" : "large + fast memory"],
          ["L2", tr ? "ortak önbellek" : "shared cache"],
          ["SM ×N", tr ? "hesap birimleri" : "compute units"],
        ].map((part, index) => (
          <div key={part[0]} className="st-organ">
            <b>{part[0]}</b>
            <span>{part[1]}</span>
            {index < 2 && <i className="st-organ-arrow">→</i>}
          </div>
        ))}
      </div>
      <div className={`st-lifecycle${lifeOn ? " on" : ""}`}>
        {lifecycle.map((phase, index) => (
          <div key={phase[0]} className="st-phase" style={{ transitionDelay: `${index * 120}ms` }}>
            <small>0{index + 1}</small>
            <b>{phase[0]}</b>
            <span>{phase[1]}</span>
          </div>
        ))}
      </div>
      {step === 5 && (
        <code className="st-formula">out[i] = a[i] + b[i];&nbsp;&nbsp;{tr ? "// her lane kendi i'sini işler" : "// each lane works on its own i"}</code>
      )}
      {step === 6 && (
        <p className="st-note">
          {tr
            ? "Izgara → Bloklar → Warp (32 lane) → Sen'in thread'in. Zinciri hatırla; her şey bundan büyür."
            : "Grid → Blocks → Warps (32 lanes) → your thread. Remember the chain; everything grows from it."}
        </p>
      )}
    </div>
  );
}

const stages: Record<StudioKind, (props: StageProps) => React.ReactElement> = {
  visual: StageVisual,
  toolchain: StageToolchain,
  architecture: StageArchitecture,
  memory: StageMemory,
  triton: StageTriton,
  operators: StageOperators,
  correctness: StageCorrectness,
  profiling: StageProfiling,
  cutlass: StageCutlass,
  inference: StageInference,
  multigpu: StageNccl,
  systems: StageSystems,
};

export default function ConceptStudio({ kind, locale }: { kind: StudioKind; locale: Locale }) {
  const meta = scenarioMeta[kind][locale];
  const steps = stepCopy[kind][locale];
  const copy = studioUi[locale];
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [fast, setFast] = useState(false);
  const frameRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setStep((value) => (value + 1) % steps.length), fast ? 1700 : STEP_MS);
    return () => window.clearInterval(id);
  }, [playing, fast, steps.length]);

  const Stage = stages[kind];
  const go = (next: number) => setStep(((next % steps.length) + steps.length) % steps.length);

  return (
    <section className="concept-studio" aria-label={copy.kicker}>
      <div className="cs-head">
        <div>
          <p className="cs-kicker">{copy.kicker}</p>
          <h2>{meta.headline}</h2>
        </div>
        <p>{meta.intro}</p>
      </div>
      <div className="cs-frame">
        <div className="cs-stage" ref={frameRef}>
          <span className="cs-corner">{meta.label}</span>
          <Stage step={step} locale={locale} />
          <div className="cs-captionbar" aria-live="polite">
            <b>
              {copy.stepOf} {step + 1}/{steps.length} · {steps[step].title}
            </b>
            <p>{steps[step].caption}</p>
          </div>
        </div>
        <aside className="cs-side">
          <div className="cs-controls">
            <button onClick={() => go(step - 1)} aria-label={copy.prev}>◀</button>
            <button className="cs-play" onClick={() => setPlaying(!playing)} aria-label={playing ? copy.pause : copy.play}>
              {playing ? "❙❙" : "▶"}
            </button>
            <button onClick={() => go(step + 1)} aria-label={copy.next}>▶</button>
            <button onClick={() => { setStep(0); setPlaying(false); }} aria-label={copy.restart}>↺</button>
            <button className="cs-speed" onClick={() => setFast(!fast)} aria-label={`${copy.speedLabel}: ${fast ? "2×" : "1×"}`}>{fast ? "2×" : "1×"}</button>
          </div>
          <div className="cs-progress" aria-hidden="true">
            {steps.map((_, index) => (
              <i key={index} className={index === step ? "cur" : index < step ? "done" : ""} />
            ))}
          </div>
          <div className="cs-steps">
            <small>{copy.stepsLabel.toUpperCase()}</small>
            {steps.map((item, index) => (
              <button key={item.title} className={index === step ? "cur" : ""} onClick={() => { setStep(index); setPlaying(false); }}>
                <i>{String(index + 1).padStart(2, "0")}</i>
                <span>{item.title}</span>
              </button>
            ))}
          </div>
          <p className="cs-hint">{copy.hint}</p>
          <div className="cs-why">
            <span>{copy.whyLabel}</span>
            <p>{meta.why}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
