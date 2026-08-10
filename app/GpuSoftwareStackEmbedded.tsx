"use client";

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
          "İş, block'lardan oluşan bir grid'e bölünür. Problem boyutu ile yürütme geometrisini ayrı düşün.",
      },
      {
        label: "Kernel",
        code: "__global__",
        detail:
          "Her thread aynı kernel kodunu farklı indekslerle yürütür; sınır kontrolü doğruluğun ilk kapısıdır.",
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
          "Block içindeki bağımlılıkları bariyerlerle yönet; block'lar arası global senkronizasyonu kernel sınırında düşün.",
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
      "Yüksek seviyeli tensor niyetini, yeniden yazılabilir dialect'ler ve pass pipeline'larıyla hedef koda indir.",
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
          "Tiling, fusion, canonicalization ve vectorization gibi pass'ler IR üzerinde kontrollü dönüşümler yapar.",
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
    note: "MLIR tek bir IR değildir; dialect'ler arası aşamalı dönüşümü yöneten bir altyapıdır. Pass sırası, hem legality hem performans için tasarım kararıdır.",
    pitfalls: ["Çok erken lowering", "Belirsiz pass sözleşmesi", "IR doğrulamasını atlamak", "Hedef maliyet modelini yok saymak"],
  },
  tensorrt: {
    eyebrow: "03 / ÇIKARIM OPTİMİZASYONU",
    title: "TensorRT",
    intro:
      "Eğitilmiş modeli NVIDIA GPU üzerinde düşük gecikme ve yüksek throughput için optimize edilmiş bir engine'e dönüştür.",
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
          "Seçimler serileştirilmiş engine'e dönüşür. Engine'i hedef ortam ve sürümle birlikte yönet.",
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
    body: "Kaynak semantiğini uygun dialect'te tut, pass sözleşmelerini belirle ve lowering sınırlarını hedef maliyet modeliyle birlikte yönet.",
  },
  inference: {
    tag: "Başlangıç noktası: TensorRT",
    title: "Servis SLO'sundan geriye çalış",
    body: "Gerçek shape dağılımını, batch politikasını ve kabul edilen doğruluk toleransını sabitle; engine'i bu sözleşmeye göre üret ve ölç.",
  },
} as const;

export default function GpuSoftwareStackEmbedded() {
  const [activeTrack, setActiveTrack] = useState<TrackKey>("rocm");
  const [activeStep, setActiveStep] = useState(0);
  const [choice, setChoice] = useState<keyof typeof choiceMap>("kernel");
  const [precision, setPrecision] = useState("FP16");
  const [shapeMode, setShapeMode] = useState("Sabit");
  const [fusion, setFusion] = useState(true);
  const [query, setQuery] = useState("");

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
    <main className="gpu-software-stack-embed">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Kernel Atlas ana sayfa">
          <span className="brand-mark" aria-hidden="true">K</span>
          <span>KERNEL ATLAS</span>
        </a>
        <nav aria-label="Ana navigasyon">
          <a href="#harita">Harita</a>
          <a href="#workbench">Workbench</a>
          <a href="#rota">Rota</a>
          <a href="#sozluk">Sözlük</a>
        </nav>
        <a className="header-cta" href="#workbench">Keşfe başla <span>↘</span></a>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="kicker"><span /> GPU SYSTEMS / FIELD GUIDE</div>
          <h1>GPU yazılım<br />yığınının <em>içine</em> bak.</h1>
          <p className="hero-lead">
            Kernel kodundan compiler IR&apos;ına, optimize inference engine&apos;ine kadar üç kritik katmanı tek bir interaktif atlas üzerinde öğren.
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
          <div className="visual-topline"><span>STACK / 001</span><span className="live-dot">CANLI MODEL</span></div>
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
              <div><small>RUNTIME + KERNEL</small><strong>ROCm / HIP</strong><p>Grid · Memory · Synchronize</p></div>
              <b>GPU</b>
            </div>
          </div>
          <div className="signal-row">
            {[18, 42, 30, 68, 54, 86, 40, 72, 48, 62, 36, 80, 55, 91, 46].map((height, i) => (
              <i key={i} style={{ height: `${height}%` }} />
            ))}
          </div>
          <div className="visual-footer"><span>DATA MOVEMENT</span><span>→</span><span>EXECUTION</span><span>→</span><span>MEASUREMENT</span></div>
        </div>
      </section>

      <section className="decision-strip" aria-labelledby="decision-title">
        <div className="section-label">00 / BAŞLANGIÇ NOKTASI</div>
        <div className="decision-grid">
          <div>
            <h2 id="decision-title">Bugün neyi<br />optimize ediyorsun?</h2>
            <div className="segmented" role="group" aria-label="Optimizasyon hedefi">
              {([
                ["kernel", "Kernel"], ["compiler", "Compiler"], ["inference", "Inference"],
              ] as const).map(([key, label]) => (
                <button key={key} className={choice === key ? "active" : ""} onClick={() => setChoice(key)}>{label}</button>
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
          <div><div className="section-label light">02 / INTERAKTİF WORKBENCH</div><h2>Bir pipeline&apos;ı<br />parçalarına ayır.</h2></div>
          <div className="track-tabs" role="tablist" aria-label="Teknoloji modülleri">
            {(Object.keys(tracks) as TrackKey[]).map((key) => (
              <button key={key} role="tab" aria-selected={activeTrack === key} onClick={() => selectTrack(key)}>
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
          <div className="pipeline-steps" role="tablist" aria-label={`${track.title} pipeline adımları`}>
            {track.steps.map((step, index) => (
              <button key={step.label} role="tab" aria-selected={activeStep === index} onClick={() => setActiveStep(index)}>
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
            <div className="code-titlebar"><span><i /><i /><i /></span><b>{activeTrack === "rocm" ? "saxpy.hip" : activeTrack === "mlir" ? "matmul.mlir" : "build_engine.py"}</b><span>READ ONLY</span></div>
            <pre><code>{track.code}</code></pre>
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
        <div className="comparison-table" role="table" aria-label="Teknoloji karşılaştırması">
          <div className="comparison-row comparison-head" role="row"><span>KARŞILAŞTIR</span><b>ROCm / HIP</b><b>MLIR</b><b>TensorRT</b></div>
          {[
            ["Ana soru", "Kernel nasıl çalışıyor?", "Kod nasıl dönüşüyor?", "Model nasıl servis ediliyor?"],
            ["Kontrol yüzeyi", "Thread, bellek, stream", "IR, dialect, pass", "Graph, precision, profile"],
            ["Birincil ölçüm", "Bandwidth / kernel süresi", "IR kalite / compile time", "Latency / throughput"],
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
            <label>Shape
              <select value={shapeMode} onChange={(e) => setShapeMode(e.target.value)}><option>Sabit</option><option>Dinamik</option></select>
            </label>
            <label className="toggle-label">Fusion
              <button className={`toggle ${fusion ? "on" : ""}`} role="switch" aria-checked={fusion} onClick={() => setFusion(!fusion)}><span /></button>
            </label>
          </div>
        </div>
        <div className="lab-output" aria-live="polite">
          <div className="lab-screen-top"><span>MEASUREMENT PLAN</span><span>SCENARIO / A</span></div>
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

      <footer>
        <div className="footer-brand"><span className="brand-mark">K</span><div><b>KERNEL ATLAS</b><p>GPU sistemlerini katman katman öğren.</p></div></div>
        <div className="footer-sources">
          <span>BİRİNCİL KAYNAKLAR</span>
          <a href="https://rocm.docs.amd.com/projects/HIP/en/develop/index.html" target="_blank" rel="noreferrer">AMD HIP Docs ↗</a>
          <a href="https://mlir.llvm.org/docs/" target="_blank" rel="noreferrer">LLVM MLIR Docs ↗</a>
          <a href="https://docs.nvidia.com/deeplearning/tensorrt/latest/" target="_blank" rel="noreferrer">NVIDIA TensorRT Docs ↗</a>
        </div>
        <div className="footer-note"><span>NOT</span><p>Performans iddiaları donanım, veri ve ölçüm yöntemiyle birlikte doğrulanmalıdır.</p></div>
      </footer>
    </main>
  );
}

