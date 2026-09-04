"use client";
/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- Labelled overflow regions must remain keyboard-scrollable. */

import { useMemo, useState } from "react";

type TrackKey = "rocm" | "mlir" | "tensorrt";

const tracks = {
  rocm: {
    eyebrow: "01 / GPU PROGRAMLAMA",
    title: "ROCm & HIP",
    intro:
      "AMD GPU'larda kernel yazmayı, bellek hiyerarşisini ve CUDA benzeri bir yürütme modelini HIP üzerinden öğren.",
    accent: "#ff6b35",
    stats: [
      ["Soyutlama", "Runtime + kernel dili"],
      ["Hedef", "AMD / NVIDIA*"],
      ["Çıktı", "GPU ikilisi + host kodu"],
    ],
    steps: [
      {
        label: "Host",
        code: "C++",
        detail:
          "CPU tarafı cihazı seçer, belleği ayırır, veriyi taşır ve kernel başlatma sırasını yönetir.",
      },
      {
        label: "Grid",
        code: "dim3",
        detail:
          "İş, bloklardan oluşan bir ızgaraya bölünür. Problem boyutu ile yürütme geometrisini ayrı düşün.",
      },
      {
        label: "Kernel",
        code: "__global__",
        detail:
          "Her iş parçacığı aynı kernel kodunu farklı indekslerle yürütür; sınır kontrolü doğruluğun ilk kapısıdır.",
      },
      {
        label: "Bellek",
        code: "HBM → LDS",
        detail:
          "Global bellek yüksek kapasite, LDS/shared bellek düşük gecikmeli paylaşım alanıdır. Erişim örüntüsü belirleyicidir.",
      },
      {
        label: "Senkron",
        code: "barrier",
        detail:
          "Blok içindeki bağımlılıkları bariyerlerle yönet; bloklar arası global senkronizasyonu kernel sınırında düşün.",
      },
    ],
    code: `__global__ void saxpy(float a, const float* x,
                       float* y, int n) {
  int i = blockIdx.x * blockDim.x + threadIdx.x;
  if (i < n) y[i] = a * x[i] + y[i];
}

int blocks = (n + 255) / 256;
hipLaunchKernelGGL(saxpy, dim3(blocks), dim3(256),
                   0, 0, 2.0f, x, y, n);`,
    note: "* HIP kaynak taşınabilirliği, kullanılan API'lere ve bağımlılıklara bağlıdır; performans taşınabilirliği otomatik değildir.",
    pitfalls: ["Koalesmemiş erişim", "Wavefront ayrışması", "Gereksiz host-device kopyası", "Eksik hata kontrolü"],
  },
  mlir: {
    eyebrow: "02 / DERLEYİCİ ALTYAPISI",
    title: "Compiler & MLIR",
    intro:
      "Yüksek seviyeli tensör niyetini, yeniden yazılabilir lehçeler ve geçiş zincirleriyle hedef koda indir.",
    accent: "#b7f000",
    stats: [
      ["Soyutlama", "Çok seviyeli IR"],
      ["Hedef", "CPU / GPU / hızlandırıcı"],
      ["Çıktı", "Düşürülmüş hedef IR"],
    ],
    steps: [
      {
        label: "Frontend",
        code: "AST / Graph",
        detail:
          "Kaynak dil veya model grafiği, semantiğini kaybetmeden MLIR operasyonlarına çevrilir.",
      },
      {
        label: "Dialect",
        code: "linalg / tensor",
        detail:
          "Dialect; operasyon, tip ve attribute sözlüğüdür. Doğru soyutlama seviyesi optimizasyon alanını korur.",
      },
      {
        label: "Transform",
        code: "tile + fuse",
        detail:
          "Döşeme, füzyon, standartlaştırma ve vektörleştirme gibi geçişler IR üzerinde kontrollü dönüşümler yapar.",
      },
      {
        label: "Lowering",
        code: "scf → gpu",
        detail:
          "Dialect conversion ile yüksek seviyeli operasyonlar daha düşük seviyeli, hedefe yakın operasyonlara yasallaştırılır.",
      },
      {
        label: "Backend",
        code: "LLVM / ROCDL",
        detail:
          "Son temsil LLVM, NVVM, ROCDL veya SPIR-V gibi hedef yollarına çevrilerek makine koduna yaklaşır.",
      },
    ],
    code: `module {
  func.func @matmul(%a: tensor<128x64xf32>,
                    %b: tensor<64x128xf32>)
      -> tensor<128x128xf32> {
    %init = tensor.empty() : tensor<128x128xf32>
    %c = linalg.matmul
      ins(%a, %b : tensor<128x64xf32>, tensor<64x128xf32>)
      outs(%init : tensor<128x128xf32>)
    return %c : tensor<128x128xf32>
  }
}`, 
    note: "MLIR tek bir IR değildir; lehçeler arası aşamalı dönüşümü yöneten bir altyapıdır. Geçiş sırası, hem geçerlilik hem performans için tasarım kararıdır.",
    pitfalls: ["Çok erken lowering", "Belirsiz pass sözleşmesi", "IR doğrulamasını atlamak", "Hedef maliyet modelini yok saymak"],
  },
  tensorrt: {
    eyebrow: "03 / ÇIKARIM OPTİMİZASYONU",
    title: "TensorRT",
    intro:
      "Eğitilmiş modeli NVIDIA GPU üzerinde düşük gecikme ve yüksek iş hacmi için optimize edilmiş bir motora dönüştür.",
    accent: "#7c8cff",
    stats: [
      ["Soyutlama", "Model graph + runtime"],
      ["Hedef", "NVIDIA GPU"],
      ["Çıktı", "Serileştirilmiş engine"],
    ],
    steps: [
      {
        label: "Import",
        code: "ONNX",
        detail:
          "Model grafiği ayrıştırılır; desteklenmeyen operasyonlar plugin veya graph rewrite gerektirebilir.",
      },
      {
        label: "Analyze",
        code: "shape + layer",
        detail:
          "Builder, katmanları, boyutları, hassasiyet kısıtlarını ve çalışma alanını değerlendirir.",
      },
      {
        label: "Optimize",
        code: "fusion + tactics",
        detail:
          "Katmanlar birleştirilir ve aday kernel/tactic seçenekleri hedef donanım için profillenerek seçilir.",
      },
      {
        label: "Build",
        code: "engine.plan",
        detail:
          "Seçimler serileştirilmiş bir motora dönüşür. Motoru hedef ortam ve sürümle birlikte yönet.",
      },
      {
        label: "Execute",
        code: "enqueueV3",
        detail:
          "Execution context, gerçek input shape ve buffer adresleriyle asenkron çıkarım başlatır.",
      },
    ],
    code: `config = builder.create_builder_config()
profile = builder.create_optimization_profile()
profile.set_shape("tokens",
                  min=(1, 8), opt=(4, 128), max=(8, 512))
config.add_optimization_profile(profile)

serialized = builder.build_serialized_network(network, config)
engine = runtime.deserialize_cuda_engine(serialized)
context = engine.create_execution_context()`,
    note: "Dynamic shape için min/opt/max aralığı bir API ayrıntısı değil, performans sözleşmesidir. Ölçümü gerçek trafik dağılımıyla yap.",
    pitfalls: ["Yanlış opt shape", "P50'ye bakıp P99'u kaçırmak", "Hassasiyet kaybını ölçmemek", "Engine taşınabilirliğini varsaymak"],
  },
} as const;

const glossary = [
  ["Wavefront", "AMD GPU'da aynı komutu birlikte yürüten thread grubunun donanımsal yürütme birimi."],
  ["Occupancy", "Bir compute unit / SM üzerinde aktif olabilen wave veya warp oranı; tek başına performans değildir."],
  ["Dialect", "MLIR içinde belirli bir alanın operasyon, tip ve öznitelik sözlüğü."],
  ["Lowering", "Bir gösterimi daha düşük seviyeli veya hedefe daha yakın bir gösterime dönüştürme süreci."],
  ["Legality", "Dialect conversion sonunda hangi operasyonların izinli olduğuna ilişkin kural kümesi."],
  ["Tactic", "TensorRT builder'ın bir katmanı veya fusion'ı yürütmek için değerlendirdiği uygulama seçeneği."],
  ["Engine", "TensorRT'nin hedef çalışma ortamı için optimize edip serileştirdiği çıkarım planı."],
  ["Optimization profile", "Dynamic input'lar için kabul edilen min/opt/max shape aralığı."],
  ["Arithmetic intensity", "Taşınan veri başına yapılan hesap miktarı; roofline analizinin ana eksenlerinden biri."],
  ["Fusion", "Ara bellek trafiğini ve launch maliyetini azaltmak için operasyonları tek yürütme bölgesinde birleştirme."],
] as const;

const choiceMap = {
  kernel: {
    tag: "Başlangıç noktası: ROCm / HIP",
    title: "Kernel davranışını görünür kıl",
    body: "Önce indeksleme, bellek erişimi ve senkronizasyonu doğru kur. Ardından profiler ile bant genişliği, occupancy ve divergence hipotezlerini test et.",
  },
  compiler: {
    tag: "Başlangıç noktası: MLIR",
    title: "Dönüşümü IR seviyesinde tasarla",
    body: "Kaynak semantiğini uygun lehçede tut, geçiş sözleşmelerini belirle ve alt gösterime indirme sınırlarını hedef maliyet modeliyle birlikte yönet.",
  },
  inference: {
    tag: "Başlangıç noktası: TensorRT",
    title: "Servis SLO'sundan geriye çalış",
    body: "Gerçek şekil dağılımını, batch politikasını ve kabul edilen doğruluk toleransını sabitle; motoru bu sözleşmeye göre üret ve ölç.",
  },
} as const;

export const GPU_STACK_LAYER_IDS = ["graph-compiler", "kernel-dsl", "kernel-library", "runtime", "serving-system"] as const;
export const GPU_STACK_PATH_IDS = ["rocm10", "cuda-tile", "triton-tileir", "rubin"] as const;
export const GPU_STACK_TECHNOLOGIES = [
  { name: "MLIR", layer: "graph-compiler", role: "Çok seviyeli dönüştürme altyapısı", sourceId: "mlir-dialect-conversion", maturity: "current" },
  { name: "CUDA Tile IR", layer: "graph-compiler", role: "Derleyici IR'si ve CUDA arka uç hedefi", sourceId: "cuda-tile-ir", maturity: "current" },
  { name: "cuTile", layer: "kernel-dsl", role: "Python döşeme düzeyi kernel DSL", sourceId: "cutile-tileir", maturity: "current" },
  { name: "CuTe DSL", layer: "kernel-dsl", role: "Kernel yazımı için herkese açık beta DSL", sourceId: "cute-dsl-stack", maturity: "preview" },
  { name: "CUTLASS", layer: "kernel-library", role: "Yeniden kullanılabilir CUDA kernel kütüphanesi", sourceId: "cutlass-kernel-library", maturity: "current" },
  { name: "ROCm 10", layer: "runtime", role: "AMD hesap çalışma zamanı SDK'sı", sourceId: "rocm-10-core", maturity: "current" },
  { name: "ROCprofiler-SDK", layer: "runtime", role: "ROCm performans gözlemlenebilirlik SDK'sı", sourceId: "rocprofiler-sdk-rocm10", maturity: "current" },
  { name: "HIP", layer: "runtime", role: "GPU programlama çalışma zamanı API'si", sourceId: "hip-programming-rocm10", maturity: "current" },
  { name: "TensorRT", layer: "serving-system", role: "Engine builder ve çalışma zamanı", sourceId: "tensorrt-how-it-works", maturity: "current" },
  { name: "vLLM", layer: "serving-system", role: "Sürekli toplu işleme serving sistemi", sourceId: "vllm-stable", maturity: "current" },
] as const;
export function getGpuStackLayer(id: (typeof GPU_STACK_LAYER_IDS)[number]) { return { id, cards: GPU_STACK_TECHNOLOGIES.filter((item) => item.layer === id) }; }
const gpuStackPaths = {
  rocm10: { sourceIds: ["rocm-10-core", "rocprofiler-sdk-rocm10", "hip-programming-rocm10"], sourceId: "rocm-10-core", maturity: "current", coreCompletion: true, title: "ROCm 10", note: "ROCm 10, HIP ve ROCprofiler-SDK aynı güncel AMD yolunun ayrı parçalarıdır." },
  "cuda-tile": { sourceId: "cuda-tile-ir", maturity: "current", coreCompletion: true, title: "CUDA Tile IR", note: "CUDA Tile IR ve cuTile, döşeme düzeyinde güncel bir programlama yoludur." },
  "triton-tileir": { sourceId: "triton-tileir-incubator", maturity: "preview", coreCompletion: false, title: "Triton → Tile IR", note: "PREVIEW inkübatör yoludur; temel tamamlanma koşulu değildir." },
  rubin: { sourceId: "systems-rubin-sm107", maturity: "preview", coreCompletion: false, title: "Rubin / SM107", note: "PREVIEW hedefidir; temel tamamlanma koşulu değildir." },
} as const;
export function getGpuStackPath(id: (typeof GPU_STACK_PATH_IDS)[number]) { return { id, ...gpuStackPaths[id] }; }

export default function GpuSoftwareStackEmbedded() {
  const [activeTrack, setActiveTrack] = useState<TrackKey>("rocm");
  const [activeStep, setActiveStep] = useState(0);
  const [choice, setChoice] = useState<keyof typeof choiceMap>("kernel");
  const [precision, setPrecision] = useState("FP16");
  const [shapeMode, setShapeMode] = useState("Sabit");
  const [fusion, setFusion] = useState(true);
  const [query, setQuery] = useState("");
  const [stackLayer, setStackLayer] = useState<(typeof GPU_STACK_LAYER_IDS)[number]>("graph-compiler");
  const [stackPath, setStackPath] = useState<(typeof GPU_STACK_PATH_IDS)[number]>("rocm10");
  const stackLayerPlan = getGpuStackLayer(stackLayer);

  const track = tracks[activeTrack];
  const decision = choiceMap[choice];
  const filteredGlossary = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("tr-TR");
    if (!normalized) return glossary;
    return glossary.filter(([term, description]) =>
      `${term} ${description}`.toLocaleLowerCase("tr-TR").includes(normalized),
    );
  }, [query]);

  function selectTrack(key: TrackKey) {
    setActiveTrack(key);
    setActiveStep(0);
  }

  return (
    <section className="gpu-software-stack-surface">
      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="kicker"><span /> GPU SİSTEMLERİ / SAHA KILAVUZU</div>
          <h2>GPU yazılım<br />yığınının <em>içine</em> bak.</h2>
          <p className="hero-lead">
            Kernel kodundan derleyici IR&apos;ına, optimize edilmiş çıkarım motoruna kadar üç kritik katmanı tek bir etkileşimli atlas üzerinde öğren.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#harita">Sistemi aç <span>↓</span></a>
            <a className="text-link" href="#rota">Öğrenme rotasını gör <span>→</span></a>
          </div>
          <div className="hero-meta">
            <span><b>3</b> uzmanlık alanı</span>
            <span><b>15</b> mimari adım</span>
            <span><b>1</b> birleşik zihinsel model</span>
          </div>
        </div>

        <div className="stack-visual" aria-label="GPU yazılım yığını şeması">
          <div className="visual-topline"><span>YIĞIN / 001</span><span className="live-dot">CANLI MODEL</span></div>
          <div className="stack-grid">
            <div className="stack-layer layer-app">
              <span className="layer-index">L3</span>
              <div><small>ÇIKARIM</small><strong>TensorRT</strong><p>Graph · Precision · Engine</p></div>
              <b>TRT</b>
            </div>
            <div className="flow-mark">↓ <span>optimize edilmiş graph</span></div>
            <div className="stack-layer layer-compiler">
              <span className="layer-index">L2</span>
              <div><small>DERLEYİCİ</small><strong>MLIR</strong><p>Dialect · Pass · Lowering</p></div>
              <b>IR</b>
            </div>
            <div className="flow-mark">↓ <span>hedefe özgü kod</span></div>
            <div className="stack-layer layer-runtime">
              <span className="layer-index">L1</span>
              <div><small>ÇALIŞMA ZAMANI + KERNEL</small><strong>ROCm / HIP</strong><p>Izgara · Bellek · Eşzamanla</p></div>
              <b>GPU</b>
            </div>
          </div>
          <div className="signal-row">
            {[18, 42, 30, 68, 54, 86, 40, 72, 48, 62, 36, 80, 55, 91, 46].map((height, i) => (
              <i key={i} style={{ height: `${height}%` }} />
            ))}
          </div>
          <div className="visual-footer"><span>VERİ HAREKETİ</span><span>→</span><span>YÜRÜTME</span><span>→</span><span>ÖLÇÜM</span></div>
        </div>
      </section>

      <section className="decision-strip" aria-labelledby="decision-title">
        <div className="section-label">00 / BAŞLANGIÇ NOKTASI</div>
        <div className="decision-grid">
          <div>
            <h2 id="decision-title">Bugün neyi<br />optimize ediyorsun?</h2>
            <div className="segmented" role="group" aria-label="Optimizasyon hedefi">
              {([
                ["kernel", "Kernel"], ["compiler", "Derleyici"], ["inference", "Çıkarım"],
              ] as const).map(([key, label]) => (
                <button type="button" key={key} aria-pressed={choice === key} className={choice === key ? "active" : ""} onClick={() => setChoice(key)}>{label}</button>
              ))}
            </div>
          </div>
          <div className="decision-output" aria-live="polite">
            <span>{decision.tag}</span>
            <h3>{decision.title}</h3>
            <p>{decision.body}</p>
            <a href="#workbench" onClick={() => selectTrack(choice === "kernel" ? "rocm" : choice === "compiler" ? "mlir" : "tensorrt")}>İlgili modülü aç <b>↗</b></a>
          </div>
        </div>
      </section>

      <section className="map-section" id="harita">
        <div className="stack-layer-lab" aria-labelledby="stack-layer-title"><div className="section-heading"><div><div className="section-label">01 / YIĞIN KARAR LABI</div><h2 id="stack-layer-title">Katmanları <em>karıştırma.</em></h2></div><p>graf derleyici → kernel DSL → kernel kütüphanesi → çalışma zamanı → sunum sistemi</p></div><div className="stack-controls"><div data-control="stack-layer" role="group" aria-label="Yığın katmanı"><b>KATMAN</b>{GPU_STACK_LAYER_IDS.map((id) => <button type="button" key={id} aria-pressed={stackLayer === id} onClick={() => setStackLayer(id)}>{({ "graph-compiler": "Graf derleyici", "kernel-dsl": "Kernel DSL", "kernel-library": "Kernel kütüphanesi", runtime: "Çalışma zamanı", "serving-system": "Sunum sistemi" } as const)[id]}</button>)}</div><div data-control="stack-path" role="group" aria-label="Yığın yolu"><b>YOL</b>{GPU_STACK_PATH_IDS.map((id) => <button type="button" key={id} aria-pressed={stackPath === id} onClick={() => setStackPath(id)}>{gpuStackPaths[id].title}</button>)}</div></div><div className="stack-layer-evidence" aria-live="polite" data-layer={stackLayer} data-path={stackPath}><div data-claim="layer" data-layer={stackLayer}><b>{stackLayer}</b><div className="stack-technology-cards">{stackLayerPlan.cards.map((item) => <article className="stack-technology-card" key={item.name} data-technology={item.name} data-source-id={item.sourceId} data-maturity={item.maturity}><b>{item.name}</b><p>{item.role}</p><small>{item.maturity === "current" ? "GÜNCEL" : "ÖNİZLEME / PUBLIC BETA"}</small></article>)}</div></div><article data-claim="path" data-source-id={gpuStackPaths[stackPath].sourceId} data-maturity={gpuStackPaths[stackPath].maturity}><b>{gpuStackPaths[stackPath].title} · {gpuStackPaths[stackPath].maturity.toUpperCase()}</b><p>{gpuStackPaths[stackPath].note}</p></article></div><div className="stack-preview-register"><span data-source-id="triton-tileir-incubator" data-maturity="preview">Triton → Tile IR · Preview · temel tamamlanma koşulu değildir.</span><span data-source-id="systems-rubin-sm107" data-maturity="preview">Rubin / SM107 · Preview · temel tamamlanma koşulu değildir.</span></div></div>
        <div className="section-heading">
          <div><div className="section-label">01 / ALAN HARİTASI</div><h2>Üç katman.<br /><em>Tek sistem.</em></h2></div>
          <p>Her teknoloji farklı bir problemi çözer. Birlikte düşünüldüklerinde yüksek seviyeli model niyetinden gerçek GPU yürütmesine kadar uçtan uca bir optimizasyon zinciri oluştururlar.</p>
        </div>
        <div className="track-cards">
          {(Object.keys(tracks) as TrackKey[]).map((key, index) => {
            const item = tracks[key];
            return (
              <article key={key} className={`track-card card-${key}`}>
                <div className="card-top"><span>0{index + 1}</span><span className="card-symbol" aria-hidden="true">{key === "rocm" ? "⌁" : key === "mlir" ? "◇" : "▱"}</span></div>
                <div className="card-tag">{item.eyebrow.split(" / ")[1]}</div>
                <h3>{item.title}</h3>
                <p>{item.intro}</p>
                <ul>
                  {item.stats.map(([label, value]) => <li key={label}><span>{label}</span><b>{value}</b></li>)}
                </ul>
                <a href="#workbench" onClick={() => selectTrack(key)}>Modülü incele <span>↘</span></a>
              </article>
            );
          })}
        </div>
      </section>

      <section className="workbench" id="workbench">
        <div className="workbench-header">
          <div><div className="section-label light">02 / ETKİLEŞİMLİ ÇALIŞMA TEZGÂHI</div><h2>Bir işlem hattını<br />parçalarına ayır.</h2></div>
          <div className="track-tabs" role="group" aria-label="Teknoloji modülleri" tabIndex={0}>
            {(Object.keys(tracks) as TrackKey[]).map((key) => (
              <button type="button" key={key} aria-pressed={activeTrack === key} onClick={() => selectTrack(key)}>
                <span style={{ background: tracks[key].accent }} />{tracks[key].title}
              </button>
            ))}
          </div>
        </div>

        <div className="track-intro" style={{ "--track-accent": track.accent } as React.CSSProperties}>
          <div><span>{track.eyebrow}</span><h3>{track.title}</h3><p>{track.intro}</p></div>
          <div className="stat-pills">{track.stats.map(([label, value]) => <span key={label}><small>{label}</small>{value}</span>)}</div>
        </div>

        <div className="pipeline-panel" style={{ "--track-accent": track.accent } as React.CSSProperties}>
          <div className="pipeline-steps" role="group" aria-label={`${track.title} pipeline adımları`}>
            {track.steps.map((step, index) => (
              <button type="button" key={step.label} aria-pressed={activeStep === index} onClick={() => setActiveStep(index)}>
                <span>0{index + 1}</span><strong>{step.label}</strong><code>{step.code}</code>
              </button>
            ))}
          </div>
          <div className="step-detail" aria-live="polite">
            <div className="detail-number">0{activeStep + 1}</div>
            <div><span>SEÇİLİ KATMAN</span><h4>{track.steps[activeStep].label}</h4><p>{track.steps[activeStep].detail}</p></div>
          </div>
        </div>

        <div className="code-and-risks">
          <div className="code-window">
            <div className="code-titlebar"><span><i /><i /><i /></span><b>{activeTrack === "rocm" ? "saxpy.hip" : activeTrack === "mlir" ? "matmul.mlir" : "build_engine.py"}</b><span>SALT OKUNUR</span></div>
            <pre tabIndex={0} aria-label="Teknoloji kod örneği"><code>{track.code}</code></pre>
          </div>
          <aside className="risk-panel">
            <span>SAHADA DİKKAT</span>
            <h4>Yaygın kırılma noktaları</h4>
            <ol>{track.pitfalls.map((pitfall, index) => <li key={pitfall}><span>0{index + 1}</span>{pitfall}</li>)}</ol>
            <p className="field-note">{track.note}</p>
          </aside>
        </div>
      </section>

      <section className="compare-section">
        <div className="section-heading compact">
          <div><div className="section-label">03 / KARAR MATRİSİ</div><h2>Doğru aracı,<br /><em>doğru katmanda</em> kullan.</h2></div>
          <p>Bu araçlar birbirinin alternatifi değildir. Sorunun yerini belirlemek, optimizasyon çabasını doğru soyutlama seviyesine taşır.</p>
        </div>
        <div className="comparison-table" role="table" aria-label="Teknoloji karşılaştırması" tabIndex={0}>
          <div className="comparison-row comparison-head" role="row"><span>KARŞILAŞTIR</span><b>ROCm / HIP</b><b>MLIR</b><b>TensorRT</b></div>
          {[
            ["Temel soru", "Kernel nasıl çalışıyor?", "Kod nasıl dönüşüyor?", "Model nasıl servis ediliyor?"],
            ["Kontrol yüzeyi", "Thread, bellek, stream", "IR, dialect, pass", "Graph, precision, profile"],
            ["Birincil ölçüm", "Bandwidth / kernel süresi", "IR kalitesi / derleme süresi", "Gecikme / iş hacmi"],
            ["Hata tipi", "Race / invalid access", "Illegal IR / miscompile", "Unsupported op / accuracy drift"],
            ["Başlangıç artefaktı", ".hip / C++ kaynak", "Dialect veya frontend IR", "ONNX / network definition"],
          ].map((row) => <div className="comparison-row" role="row" key={row[0]}>{row.map((cell, i) => i === 0 ? <span key={cell}>{cell}</span> : <b key={cell}>{cell}</b>)}</div>)}
        </div>
      </section>

      <section className="lab-section" aria-labelledby="lab-title">
        <div className="lab-copy">
          <div className="section-label light">04 / OPTİMİZASYON LAB'I</div>
          <h2 id="lab-title">Hızlı olmak<br />bir <em>ayar</em> değil.</h2>
          <p>Her optimizasyon bir varsayım taşır. Aşağıdaki seçimlerle TensorRT senaryosunun ölçüm planının nasıl değiştiğini gör.</p>
          <div className="lab-controls">
            <label>Hassasiyet
              <select value={precision} onChange={(e) => setPrecision(e.target.value)}><option>FP32</option><option>FP16</option><option>INT8</option></select>
            </label>
            <label>Şekil
              <select value={shapeMode} onChange={(e) => setShapeMode(e.target.value)}><option>Sabit</option><option>Dinamik</option></select>
            </label>
            <div className="toggle-label"><span>Birleştirme</span>
              <button type="button" className={`toggle ${fusion ? "on" : ""}`} role="switch" aria-label="Birleştirme" aria-checked={fusion} onClick={() => setFusion(!fusion)}><span /></button>
            </div>
          </div>
        </div>
        <div className="lab-output" aria-live="polite">
          <div className="lab-screen-top"><span>ÖLÇÜM PLANI</span><span>SENARYO / A</span></div>
          <div className="metric-grid">
            <div><span>ÖNCELİKLİ METRİK</span><strong>{shapeMode === "Dinamik" ? "P99 latency / shape" : "Latency + throughput"}</strong></div>
            <div><span>DOĞRULUK KAPISI</span><strong>{precision === "INT8" ? "Kalibrasyon + görev metriği" : precision === "FP16" ? "FP32 parity kontrolü" : "Referans çıktı farkı"}</strong></div>
            <div><span>PROFİL TASARIMI</span><strong>{shapeMode === "Dinamik" ? "Min / opt / max kümeleri" : "Tek shape, gerçek batch"}</strong></div>
            <div><span>GRAPH KONTROLÜ</span><strong>{fusion ? "Fusion katmanlarını doğrula" : "Ara tensor trafiğini ölç"}</strong></div>
          </div>
          <div className="lab-warning"><b>!</b><p><strong>Bu bir performans tahmini değildir.</strong> Donanım, model, shape dağılımı ve runtime koşulları olmadan hızlanma yüzdesi üretmek güvenilir değildir.</p></div>
        </div>
      </section>

      <section className="roadmap" id="rota">
        <div className="section-heading">
          <div><div className="section-label">05 / ÖĞRENME ROTASI</div><h2>Okuma değil,<br /><em>üretme</em> rotası.</h2></div>
          <p>Her aşamayı ölçülebilir bir artefaktla kapat. Süreler yaklaşık çalışma bloklarıdır; gerçek ilerleme doğruluk ve profil kanıtıyla belirlenir.</p>
        </div>
        <div className="roadmap-grid">
          {[
            ["01", "Temel", "6–8 saat", "GPU yürütme modeli", "SAXPY + doğruluk testi", ["grid / block / thread", "bellek yaşam döngüsü", "senkronizasyon"]],
            ["02", "Kernel", "10–14 saat", "HIP optimizasyon döngüsü", "Naif → tiled matmul", ["koalesme", "LDS kullanımı", "profiler hipotezi"]],
            ["03", "Compiler", "12–16 saat", "MLIR dönüşüm hattı", "Özel pass + IR testi", ["dialect tasarımı", "rewrite pattern", "partial lowering"]],
            ["04", "Inference", "10–14 saat", "TensorRT deployment", "Ölçülmüş engine raporu", ["ONNX inceleme", "dynamic profile", "accuracy / latency kapısı"]],
          ].map(([num, tag, duration, title, artifact, bullets]) => (
            <article className="roadmap-card" key={num as string}>
              <div><span>{num as string}</span><b>{tag as string}</b><small>{duration as string}</small></div>
              <h3>{title as string}</h3>
              <p><span>ÇIKIŞ ARTEFAKTI</span>{artifact as string}</p>
              <ul>{(bullets as string[]).map((bullet) => <li key={bullet}>↳ {bullet}</li>)}</ul>
            </article>
          ))}
        </div>
      </section>

      <section className="glossary-section" id="sozluk">
        <div className="glossary-head">
          <div><div className="section-label light">06 / HIZLI SÖZLÜK</div><h2>Terimi bul,<br />bağlamı kur.</h2></div>
          <label className="search-box"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="wavefront, lowering, tactic..." aria-label="Sözlükte ara" /><small>{filteredGlossary.length} SONUÇ</small></label>
        </div>
        <div className="glossary-list">
          {filteredGlossary.map(([term, description], index) => (
            <article key={term}><span>{String(index + 1).padStart(2, "0")}</span><h3>{term}</h3><p>{description}</p></article>
          ))}
          {filteredGlossary.length === 0 && <p className="empty-state">Bu aramayla eşleşen terim yok.</p>}
        </div>
      </section>

      <section className="sources-section" aria-label="Birincil kaynaklar ve performans notu">
        <div className="footer-sources">
          <span>BİRİNCİL KAYNAKLAR</span>
          <a href="https://rocm.docs.amd.com/projects/HIP/en/develop/index.html" target="_blank" rel="noreferrer">AMD HIP Docs ↗</a>
          <a href="https://mlir.llvm.org/docs/" target="_blank" rel="noreferrer">LLVM MLIR Docs ↗</a>
          <a href="https://docs.nvidia.com/deeplearning/tensorrt/latest/" target="_blank" rel="noreferrer">NVIDIA TensorRT Docs ↗</a>
        </div>
        <div className="footer-note"><span>NOT</span><p>GPU sistemlerini katman katman öğren. Performans iddiaları donanım, veri ve ölçüm yöntemiyle birlikte doğrulanmalıdır.</p></div>
      </section>
    </section>
  );
}
