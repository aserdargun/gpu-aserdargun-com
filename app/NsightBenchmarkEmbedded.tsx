"use client";

import { useMemo, useState } from "react";

type Lens = "systems" | "compute" | "benchmark";
type Scenario = "launch" | "memory" | "noise";

const navItems = [
  ["00", "Zihinsel model", "#model"],
  ["01", "Nsight Systems", "#systems"],
  ["02", "Nsight Compute", "#compute"],
  ["03", "Benchmark", "#benchmark"],
  ["04", "Uygulama", "#practice"],
] as const;

const lensData: Record<Lens, { kicker: string; title: string; question: string; output: string; color: string }> = {
  systems: {
    kicker: "GENİŞ AÇI",
    title: "Nsight Systems",
    question: "Zaman nerede kayboluyor? CPU, GPU, kopya ve senkronizasyon nasıl üst üste geliyor?",
    output: ".nsys-rep · zaman çizelgesi",
    color: "cyan",
  },
  compute: {
    kicker: "MİKROSKOP",
    title: "Nsight Compute",
    question: "Seçtiğim kernel neden yavaş? Bellek, yürütme birimleri, occupancy veya instruction mix mi?",
    output: ".ncu-rep · kernel metrikleri",
    color: "lime",
  },
  benchmark: {
    kicker: "HAKEM",
    title: "Güvenilir benchmark",
    question: "Değişiklik gerçekten daha hızlı mı, yoksa ısınma, saat frekansı ve ölçüm gürültüsü mü?",
    output: "ham örnekler · medyan · dağılım",
    color: "orange",
  },
};

const scenarioData: Record<Scenario, { title: string; subtitle: string; cpu: number[]; gpu: number[]; copy: number[]; clues: string[]; verdict: string; next: string }> = {
  launch: {
    title: "Launch-bound",
    subtitle: "Çok sayıda küçük kernel",
    cpu: [8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74],
    gpu: [12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78],
    copy: [],
    clues: ["Kernel süreleri kısa", "CPU launch aralıkları görünür", "GPU üzerinde boşluklar var"],
    verdict: "Kernel tek başına değil, dispatch zinciri pahalı.",
    next: "Fusion, CUDA Graphs veya batch büyütmeyi dene; sonra yeniden ölç.",
  },
  memory: {
    title: "Transfer-bound",
    subtitle: "Kopya hesaplamayı bölüyor",
    cpu: [5, 46],
    gpu: [24, 57],
    copy: [10, 42, 69],
    clues: ["H2D/D2H baskın", "Kopya ve kernel örtüşmüyor", "Sık senkronizasyon var"],
    verdict: "Veri hareketi kritik yolu uzatıyor.",
    next: "Pinned memory, async kopya, stream örtüşmesi ve veri yerleşimini incele.",
  },
  noise: {
    title: "Gürültülü koşu",
    subtitle: "Tek ölçüm yanıltıyor",
    cpu: [7, 28, 63],
    gpu: [12, 34, 44, 72],
    copy: [54],
    clues: ["Çalıştırmalar arası fark yüksek", "İlk iterasyon aykırı", "Saat/ısı durumu değişiyor"],
    verdict: "Ölçüm protokolü sonucu açıklayamıyor.",
    next: "Önce benchmark koşullarını sabitle; profiler ile süre kıyaslama.",
  },
};

const computeModes = {
  memory: {
    tag: "BELLEK SINIRLI",
    title: "Veri besleme hızı sınırda",
    metric: "DRAM throughput %86",
    copy: "Arithmetic intensity düşük; nokta eğimli bellek tavanına yakın. Erişim birleştirme, veri tekrar kullanımı ve gereksiz trafik ilk adaylar.",
    checks: ["Memory Workload Analysis", "L1/L2 hit rate", "Bytes / useful element", "Global load efficiency"],
    point: [31, 64],
  },
  compute: {
    tag: "HESAPLAMA SINIRLI",
    title: "Yürütme tavanına yakın",
    metric: "SM throughput %91",
    copy: "Arithmetic intensity yüksek; nokta yatay compute tavanına yaklaşmış. Instruction mix, Tensor Core kullanımı ve hesap azaltma daha değerlidir.",
    checks: ["Speed of Light", "Instruction statistics", "Tensor pipe utilization", "Eligible warps"],
    point: [73, 24],
  },
  latency: {
    tag: "GECİKME / SCHEDULING",
    title: "Tavanların ikisinden de uzak",
    metric: "Eligible warps 0.7 / cycle",
    copy: "Bant genişliği ve compute dolu değilse bağımlılık, stall, düşük paralellik veya dengesiz iş olabilir. Yalnızca occupancy sayısına bakma.",
    checks: ["Warp State Statistics", "Scheduler Statistics", "Achieved occupancy", "Launch configuration"],
    point: [50, 76],
  },
} as const;

const quiz = [
  {
    q: "Uygulama yavaşladı; hangi kernelin sorumlu olduğunu henüz bilmiyorsun.",
    options: ["Önce ncu --set full", "Önce nsys zaman çizelgesi", "Sadece time.time()"],
    answer: 1,
    why: "Önce geniş açıyla kritik yolu ve pahalı kernel/range'i bulmalısın.",
  },
  {
    q: "Nsight Compute altında host timer ile ölçülen süre uzadı. Ne sonuç çıkar?",
    options: ["Kernel kesin yavaşladı", "Profiler overhead'i süreyi bozabilir", "GPU bozuk"],
    answer: 1,
    why: "Metric toplama ve replay, profiler altındaki duvar saati ölçümünü benchmark olmaktan çıkarır.",
  },
  {
    q: "Optimize sürüm: 41.2 µs; baz sürüm: 42.0 µs; koşular arası sapma %4.",
    options: ["%1.9 kesin kazanç", "Anlamlı fark yok", "2× hızlanma"],
    answer: 1,
    why: "Gözlenen fark gürültü zemininden küçük; daha güçlü protokol ve daha çok örnek gerekir.",
  },
];

function CodeBlock({ children, label }: { children: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="code-block">
      <div className="code-head"><span>{label}</span><button onClick={copy} aria-label={`${label} komutunu kopyala`}>{copied ? "Kopyalandı" : "Kopyala"}</button></div>
      <pre><code>{children}</code></pre>
    </div>
  );
}

export default function NsightBenchmarkEmbedded() {
  const [lens, setLens] = useState<Lens>("systems");
  const [scenario, setScenario] = useState<Scenario>("launch");
  const [computeMode, setComputeMode] = useState<keyof typeof computeModes>("memory");
  const [baseline, setBaseline] = useState(42.8);
  const [optimized, setOptimized] = useState(35.6);
  const [jitter, setJitter] = useState(1.2);
  const [protocol, setProtocol] = useState({ warmup: true, sync: true, repeats: true, environment: false, raw: true });
  const [answers, setAnswers] = useState<number[]>([-1, -1, -1]);
  const [commandTab, setCommandTab] = useState<"systems" | "compute" | "pytorch">("systems");

  const bench = useMemo(() => {
    const delta = baseline - optimized;
    const speedup = baseline / optimized;
    const pct = (delta / baseline) * 100;
    const enabled = Object.values(protocol).filter(Boolean).length;
    const signal = Math.abs(pct) / Math.max(jitter, 0.1);
    const grade = enabled === 5 && signal >= 3 ? "A" : enabled >= 4 && signal >= 2 ? "B" : enabled >= 3 ? "C" : "D";
    return { delta, speedup, pct, enabled, signal, grade };
  }, [baseline, optimized, jitter, protocol]);

  const quizScore = answers.reduce((sum, answer, i) => sum + (answer === quiz[i].answer ? 1 : 0), 0);
  const activeScenario = scenarioData[scenario];
  const activeCompute = computeModes[computeMode];

  return (
    <main className="nsight-benchmark-embed">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Kernel Ölçüm Laboratuvarı ana sayfa">
          <span className="brand-mark">K</span>
          <span>KERNEL / LAB</span>
        </a>
        <div className="top-status"><span className="pulse" /> ETKİLEŞİMLİ REHBER <span className="version">TR · 01</span></div>
      </header>

      <div className="shell" id="top">
        <aside className="rail" aria-label="Bölümler">
          <div className="rail-label">LAB NOTLARI</div>
          <nav>
            {navItems.map(([n, title, href]) => (
              <a href={href} key={href}><span>{n}</span>{title}</a>
            ))}
          </nav>
          <div className="rail-card">
            <div className="mini-label">ALTIN KURAL</div>
            <p>Profiler teşhis eder.<br />Benchmark hüküm verir.</p>
          </div>
        </aside>

        <div className="content">
          <section className="hero" id="model">
            <div className="eyebrow"><span>GPU PERFORMANCE FIELD GUIDE</span><i /></div>
            <div className="hero-grid">
              <div>
                <h1>Hız tahmin edilmez.<br /><em>Kanıtlanır.</em></h1>
                <p className="hero-copy">Nsight Systems ile kritik yolu bul. Nsight Compute ile kernelin içini aç. Kontrollü benchmark ile değişikliğin gerçekten işe yarayıp yaramadığını kanıtla.</p>
                <div className="hero-actions">
                  <a className="primary-button" href="#systems">Laboratuvara gir <span>↓</span></a>
                  <span className="read-time">45 dk · uygulamalı okuma</span>
                </div>
              </div>
              <div className="scope-card" aria-label="Profiling zihinsel modeli">
                <div className="scope-grid" />
                <div className="scope-ring ring-one" />
                <div className="scope-ring ring-two" />
                <div className="scope-ring ring-three" />
                <div className="scope-core">?</div>
                <div className="scope-note note-a"><b>01</b> NEREDE?</div>
                <div className="scope-note note-b"><b>02</b> NEDEN?</div>
                <div className="scope-note note-c"><b>03</b> GERÇEK Mİ?</div>
              </div>
            </div>
            <div className="principle-strip">
              <span>ÖLÇÜM SORUSU</span><b>→</b><span>DOĞRU ARAÇ</span><b>→</b><span>DAR KAPSAM</span><b>→</b><span>TEKRARLANABİLİR KANIT</span>
            </div>
          </section>

          <section className="section lens-section" aria-labelledby="lens-title">
            <div className="section-number">00 / ZİHİNSEL MODEL</div>
            <div className="section-title-row">
              <div><h2 id="lens-title">Üç araç, üç farklı soru</h2><p>Aynı koşuyu üç araçla ölçmek yerine, belirsizliği sırayla azalt.</p></div>
              <div className="corner-note">GENİŞ AÇI → MİKROSKOP → HAKEM</div>
            </div>
            <div className="lens-switch" role="tablist" aria-label="Ölçüm aracı seçimi">
              {(Object.keys(lensData) as Lens[]).map((key, i) => (
                <button key={key} role="tab" aria-selected={lens === key} onClick={() => setLens(key)} className={lens === key ? "active" : ""}>
                  <span>0{i + 1}</span>{lensData[key].title}
                </button>
              ))}
            </div>
            <div className={`lens-display ${lensData[lens].color}`}>
              <div className="lens-index">{lens === "systems" ? "S" : lens === "compute" ? "C" : "B"}</div>
              <div><div className="mini-label">{lensData[lens].kicker}</div><h3>{lensData[lens].question}</h3><p>{lensData[lens].output}</p></div>
              <div className="lens-rule">
                <span>YANLIŞ KULLANIM</span>
                <p>{lens === "systems" ? "Tek kernelin instruction-level darboğazını aramak" : lens === "compute" ? "Uygulamanın uçtan uca süresini kıyaslamak" : "Profiler açıkken çıkan süreyi performans sonucu saymak"}</p>
              </div>
            </div>
          </section>

          <section className="section" id="systems" aria-labelledby="systems-title">
            <div className="section-number cyan-text">01 / NSIGHT SYSTEMS</div>
            <div className="section-title-row">
              <div><h2 id="systems-title">Önce zaman çizelgesini oku</h2><p>Systems sana “hangi kernel yavaş?”tan önce “uygulama neden bekliyor?” sorusunu cevaplatır.</p></div>
              <span className="tool-pill cyan-pill">NSYS · SYSTEM-WIDE</span>
            </div>

            <div className="scenario-tabs" role="tablist" aria-label="Zaman çizelgesi senaryoları">
              {(Object.keys(scenarioData) as Scenario[]).map((key) => (
                <button key={key} onClick={() => setScenario(key)} className={scenario === key ? "active" : ""}>
                  <span>{scenarioData[key].title}</span><small>{scenarioData[key].subtitle}</small>
                </button>
              ))}
            </div>

            <div className="timeline-card">
              <div className="timeline-head">
                <div><span className="live-dot" /> CAPTURE / inference_step</div>
                <div>0 µs <span>············</span> 100 µs</div>
              </div>
              <div className="timeline-ruler">{[0, 20, 40, 60, 80, 100].map(n => <span key={n} style={{ left: `${n}%` }}>{n}</span>)}</div>
              <div className="track"><label>CPU / CUDA API</label><div className="track-line cpu-line">{activeScenario.cpu.map((x, i) => <i key={i} style={{ left: `${x}%`, width: scenario === "launch" ? "4%" : "13%" }} />)}</div></div>
              <div className="track"><label>GPU / STREAM 7</label><div className="track-line gpu-line">{activeScenario.gpu.map((x, i) => <i key={i} style={{ left: `${x}%`, width: scenario === "launch" ? "4.6%" : "18%" }} />)}</div></div>
              <div className="track"><label>MEMCPY</label><div className="track-line copy-line">{activeScenario.copy.map((x, i) => <i key={i} style={{ left: `${x}%`, width: "18%" }} />)}</div></div>
              <div className="timeline-analysis">
                <div><span>GÖZLEM</span><strong>{activeScenario.verdict}</strong></div>
                <ul>{activeScenario.clues.map(clue => <li key={clue}>{clue}</li>)}</ul>
                <div className="next-action"><span>SONRAKİ HAREKET</span>{activeScenario.next}</div>
              </div>
            </div>

            <div className="two-col content-cards">
              <article className="info-card">
                <span className="card-index">A / YAKALA</span>
                <h3>Minimum iz, net soru</h3>
                <p>Önce CUDA ve NVTX izlerini topla. Kısa, temsilî bir pencere seç. Gereksiz CPU sampling ve uzun capture, dosyayı büyütür ve sinyali gömer.</p>
                <CodeBlock label="Sistem izi" children={'nsys profile --trace=cuda,nvtx \\\n  --sample=none --cpuctxsw=none \\\n  -o reports/step ./your_app'} />
              </article>
              <article className="info-card">
                <span className="card-index">B / ÖZETLE</span>
                <h3>GUI’den önce sayısal özet</h3>
                <p>Toplam GPU zamanını, kernel örnek sayısını, medyanı ve API maliyetini tara. “% Time”, uygulama duvar saatinin yüzdesi olmayabilir; rapor paydasını oku.</p>
                <CodeBlock label="Rapor özeti" children={'nsys stats --report cuda_gpu_sum \\\n  --report cuda_api_sum \\\n  reports/step.nsys-rep'} />
              </article>
            </div>

            <div className="check-grid">
              {[
                ["GPU boşlukları", "CPU gecikmesi, senkronizasyon veya veri hazırlama mı?"],
                ["Memcpy örtüşmesi", "Kopyalar kernel yürütmesiyle aynı anda ilerliyor mu?"],
                ["Kernel granülaritesi", "Binlerce küçük launch mı, birkaç uzun kernel mi?"],
                ["Kritik NVTX range", "Optimize edeceğin bölge uçtan uca süreyi etkiliyor mu?"],
              ].map(([title, copy], i) => <div key={title}><b>0{i + 1}</b><span>{title}</span><p>{copy}</p></div>)}
            </div>
          </section>

          <section className="section" id="compute" aria-labelledby="compute-title">
            <div className="section-number lime-text">02 / NSIGHT COMPUTE</div>
            <div className="section-title-row">
              <div><h2 id="compute-title">Sonra tek kerneli mikroskoba al</h2><p>Systems’ta kanıtlanan sıcak kerneli filtrele. Her metriği değil, hipotezini test eden section’ları topla.</p></div>
              <span className="tool-pill lime-pill">NCU · KERNEL-SCOPE</span>
            </div>

            <div className="compute-layout">
              <div className="roofline-card">
                <div className="chart-head"><div><span>ROOFLINE / ŞEMATİK</span><b>PERFORMANCE</b></div><small>yukarı daha iyi</small></div>
                <div className="roofline-chart" aria-label="Şematik Roofline grafiği">
                  <div className="y-label">FLOP/s</div><div className="x-label">Arithmetic intensity →</div>
                  <div className="roof-slope" /><div className="roof-flat" />
                  <div className="roof-label memory-label">memory roof</div><div className="roof-label compute-label">compute roof</div>
                  <div className={`chart-point ${computeMode}`} style={{ left: `${activeCompute.point[0]}%`, top: `${activeCompute.point[1]}%` }}><span /></div>
                </div>
                <p className="chart-caveat">Roofline bir hüküm değil, yön bulma aracıdır. Noktanın hangi tavana yakın olduğu sonraki metriği seçtirir.</p>
              </div>

              <div className="diagnosis-panel">
                <div className="mode-buttons">
                  {(Object.keys(computeModes) as (keyof typeof computeModes)[]).map(key => <button key={key} className={computeMode === key ? "active" : ""} onClick={() => setComputeMode(key)}>{key === "memory" ? "Bellek" : key === "compute" ? "Compute" : "Latency"}</button>)}
                </div>
                <div className="diagnosis-content">
                  <span className="signal-tag">{activeCompute.tag}</span>
                  <h3>{activeCompute.title}</h3>
                  <div className="hero-metric">{activeCompute.metric}</div>
                  <p>{activeCompute.copy}</p>
                  <div className="metric-list"><span>İNCELE</span>{activeCompute.checks.map((x, i) => <div key={x}><b>0{i + 1}</b>{x}</div>)}</div>
                </div>
              </div>
            </div>

            <div className="decision-flow" aria-label="Kernel teşhis karar akışı">
              <div className="flow-start">SOL düşük mü?<small>SM + Memory utilization</small></div><i>→</i>
              <div><b>Evet</b> launch, paralellik, stall</div><i>↘</i>
              <div><b>Hayır</b> hangi tavan yakın?</div><i>→</i>
              <div className="flow-end"><span>MEM</span> trafik / cache <em>·</em> <span>SM</span> instruction / pipe</div>
            </div>

            <div className="two-col content-cards">
              <article className="info-card lime-border">
                <span className="card-index">A / DARALT</span>
                <h3>Bir kernel, birkaç launch</h3>
                <p><code>--set full</code> ile tüm uygulamayı profillemek çok sayıda replay ve yüksek overhead üretir. Önce isim filtresi, sonra launch sayısı.</p>
                <CodeBlock label="Hedefli kernel profili" children={'ncu --set basic \\\n  --kernel-name regex:".*rmsnorm.*" \\\n  --launch-skip 5 --launch-count 3 \\\n  -o reports/rmsnorm ./your_app'} />
              </article>
              <article className="info-card lime-border">
                <span className="card-index">B / HİPOTEZ</span>
                <h3>Section seç, ezber metrik değil</h3>
                <p>İlk bakış için SpeedOfLight ve LaunchStats; ardından yalnızca işaret edilen MemoryWorkloadAnalysis, SchedulerStats veya SourceCounters.</p>
                <CodeBlock label="Seçili section'lar" children={'ncu --section SpeedOfLight \\\n  --section LaunchStats \\\n  --section MemoryWorkloadAnalysis \\\n  --kernel-name regex:".*rmsnorm.*" ./your_app'} />
              </article>
            </div>

            <div className="warning-band"><b>PROFILER TUZAĞI</b><span>Nsight Compute replay ve metric toplama overhead’i ekler. NCU altında host timer veya CUDA event ile çıkan uçtan uca süreyi benchmark sonucu olarak kullanma.</span></div>
          </section>

          <section className="section" id="benchmark" aria-labelledby="benchmark-title">
            <div className="section-number orange-text">03 / GÜVENİLİR BENCHMARK</div>
            <div className="section-title-row">
              <div><h2 id="benchmark-title">Kazancı gürültüden ayır</h2><p>Benchmark bir kronometre değil; iki sürümü aynı koşullarda karşılaştıran küçük bir deneydir.</p></div>
              <span className="tool-pill orange-pill">UNPROFILED · REPEATED</span>
            </div>

            <div className="bench-lab">
              <div className="bench-inputs">
                <div className="mini-label">DENEY GİRDİLERİ</div>
                <label>Baz medyan <span>{baseline.toFixed(1)} µs</span><input type="range" min="10" max="100" step="0.1" value={baseline} onChange={e => setBaseline(Number(e.target.value))} /></label>
                <label>Optimize medyan <span>{optimized.toFixed(1)} µs</span><input type="range" min="10" max="100" step="0.1" value={optimized} onChange={e => setOptimized(Number(e.target.value))} /></label>
                <label>Koşular arası gürültü <span>±{jitter.toFixed(1)}%</span><input type="range" min="0.1" max="10" step="0.1" value={jitter} onChange={e => setJitter(Number(e.target.value))} /></label>
                <div className="protocol-list">
                  {[
                    ["warmup", "Isınma / lazy init"], ["sync", "GPU senkronizasyonu"], ["repeats", "Çoklu tekrar + medyan"], ["environment", "Sabit ortam / saat / güç"], ["raw", "Ham örnekleri sakla"],
                  ].map(([key, label]) => <label key={key} className="toggle-row"><input type="checkbox" checked={protocol[key as keyof typeof protocol]} onChange={() => setProtocol(p => ({ ...p, [key]: !p[key as keyof typeof p] }))} /><span className="toggle" /><b>{label}</b></label>)}
                </div>
              </div>
              <div className="bench-result">
                <div className="grade-ring"><span>GÜVEN</span><b>{bench.grade}</b><small>{bench.enabled}/5 kontrol</small></div>
                <div className="result-grid">
                  <div><span>HIZLANMA</span><b>{bench.speedup.toFixed(2)}×</b></div>
                  <div><span>FARK</span><b>{bench.pct.toFixed(1)}%</b></div>
                  <div><span>SİNYAL / GÜRÜLTÜ</span><b>{bench.signal.toFixed(1)}</b></div>
                </div>
                <div className={`verdict ${bench.grade.toLowerCase()}`}>
                  <span>{bench.grade === "A" ? "GÜÇLÜ KANIT" : bench.grade === "B" ? "MAKUL KANIT" : "YETERSİZ KANIT"}</span>
                  <p>{bench.grade === "A" ? "Fark, gürültüden belirgin biçimde büyük ve protokol eksiksiz." : bench.grade === "B" ? "Sonuç umut verici; eksik kontrolü tamamlayıp tekrarla." : "Bu koşullarda hızlanma iddiası güvenilir değil."}</p>
                </div>
              </div>
            </div>

            <div className="benchmark-rules">
              {[
                ["01", "Doğruluk önce", "Baz ve optimize sürüm aynı sonucu tolerans içinde üretmeli."],
                ["02", "Warmup ayrı", "Context oluşturma, JIT ve cache dolumu ölçüm dışına alınmalı."],
                ["03", "Async farkındalık", "CPU timer GPU işi bitmeden durmasın; doğru senkronizasyon kullan."],
                ["04", "Dağılımı göster", "Tek sayı yerine medyan, örnek sayısı, yayılım ve aykırı değerleri raporla."],
                ["05", "Şekil matrisi", "Tek shape zaferi genellenemez; küçük/orta/büyük ve gerçekçi şekilleri ölç."],
                ["06", "Ortam kaydı", "GPU, driver, CUDA, güç modu, saat, dtype ve derleme bayraklarını sakla."],
              ].map(([n, title, copy]) => <article key={n}><span>{n}</span><div><h3>{title}</h3><p>{copy}</p></div></article>)}
            </div>

            <CodeBlock label="PyTorch benchmark iskeleti" children={'from torch.utils.benchmark import Timer\n\nt = Timer(\n    stmt="optimized(x)",\n    setup="from __main__ import optimized, x",\n    num_threads=1,\n)\nresult = t.blocked_autorange(min_run_time=1.0)\nprint(result)  # median, IQR, tekrar sayısı'} />
          </section>

          <section className="section" id="practice" aria-labelledby="practice-title">
            <div className="section-number">04 / UYGULAMA</div>
            <div className="section-title-row"><div><h2 id="practice-title">Uçtan uca inceleme reçetesi</h2><p>Her optimizasyonda aynı kanıt zincirini üret. Araç çıktısı değil, karar kaydı bırak.</p></div></div>
            <div className="recipe">
              {[
                ["1", "BASELINE", "Doğruluk + temsilî shape matrisi + ham süreler"],
                ["2", "SYSTEMS", "Kritik NVTX range, boşluklar, kopyalar, pahalı kernel"],
                ["3", "COMPUTE", "Tek kernel, açık hipotez, seçili section, kök neden"],
                ["4", "DEĞİŞİKLİK", "Bir seferde tek fikir; beklenen metriği önceden yaz"],
                ["5", "YENİDEN ÖLÇ", "Aynı benchmark protokolü + doğruluk kapısı"],
                ["6", "RAPORLA", "Medyan speedup, yayılım, şekiller, ortam, profiler kanıtı"],
              ].map(([n, title, copy]) => <div key={n}><b>{n}</b><span>{title}</span><p>{copy}</p></div>)}
            </div>

            <div className="command-center">
              <div className="command-tabs">
                {(["systems", "compute", "pytorch"] as const).map(key => <button key={key} className={commandTab === key ? "active" : ""} onClick={() => setCommandTab(key)}>{key === "systems" ? "NSYS" : key === "compute" ? "NCU" : "PYTORCH"}</button>)}
              </div>
              <div className="command-body">
                <div><span className="mini-label">KOMUT HARİTASI</span><h3>{commandTab === "systems" ? "Kritik yolu bul" : commandTab === "compute" ? "Sıcak kerneli açıkla" : "İddiayı ölç"}</h3></div>
                <pre>{commandTab === "systems" ? `# kısa ve isimlendirilmiş capture\nnsys profile --trace=cuda,nvtx -o run ./app\n\n# kernel + API özetleri\nnsys stats --report cuda_gpu_sum --report cuda_api_sum run.nsys-rep` : commandTab === "compute" ? `# önce mevcut setleri gör\nncu --list-sets\n\n# dar kapsamlı toplama\nncu --set basic -k regex:".*kernel.*" -c 3 -o kernel ./app` : `# warmup ve accelerator sync yerleşik\nTimer(stmt="kernel(x)", globals=globals()) \\\n  .blocked_autorange(min_run_time=1.0)`}</pre>
              </div>
            </div>

            <div className="quiz-card">
              <div className="quiz-head"><div><span className="mini-label">KENDİNİ TEST ET</span><h3>Profiling muhakemesi</h3></div><div className="score">{quizScore}<span>/ {quiz.length}</span></div></div>
              {quiz.map((item, qi) => (
                <div className="question" key={item.q}>
                  <p><b>0{qi + 1}</b>{item.q}</p>
                  <div>{item.options.map((option, oi) => <button key={option} onClick={() => setAnswers(a => a.map((x, i) => i === qi ? oi : x))} className={answers[qi] === oi ? (oi === item.answer ? "correct" : "wrong") : ""}>{option}</button>)}</div>
                  {answers[qi] >= 0 && <small className={answers[qi] === item.answer ? "ok" : "no"}>{answers[qi] === item.answer ? "Doğru — " : "Tekrar düşün — "}{item.why}</small>}
                </div>
              ))}
            </div>
          </section>

          <section className="source-section" aria-labelledby="sources-title">
            <span className="mini-label">KAYNAKLAR / GÜNCEL DOKÜMANTASYON</span>
            <h2 id="sources-title">Daha derine in</h2>
            <div>
              <a href="https://docs.nvidia.com/nsight-systems/UserGuide/index.html" target="_blank" rel="noreferrer"><b>01</b><span>Nsight Systems User Guide<small>Capture, trace ve CLI</small></span><i>↗</i></a>
              <a href="https://docs.nvidia.com/nsight-systems/AnalysisGuide/index.html" target="_blank" rel="noreferrer"><b>02</b><span>Systems Analysis Guide<small>Raporlar ve istatistikler</small></span><i>↗</i></a>
              <a href="https://docs.nvidia.com/nsight-compute/ProfilingGuide/index.html" target="_blank" rel="noreferrer"><b>03</b><span>Nsight Compute Profiling Guide<small>Replay, overhead, Roofline</small></span><i>↗</i></a>
              <a href="https://docs.pytorch.org/docs/stable/benchmark_utils.html" target="_blank" rel="noreferrer"><b>04</b><span>PyTorch Benchmark Utils<small>Timer ve blocked_autorange</small></span><i>↗</i></a>
            </div>
          </section>
        </div>
      </div>

      <footer><div className="brand"><span className="brand-mark">K</span><span>KERNEL / LAB</span></div><p>Ölç. Açıkla. Kanıtla.</p><a href="#top">BAŞA DÖN ↑</a></footer>
    </main>
  );
}

