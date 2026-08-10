"use client";

import { useMemo, useState } from "react";

type Tab = "overview" | "architecture" | "simt" | "memory" | "lab";
type ArchLevel = "grid" | "block" | "warp" | "thread" | "instruction";
type MemoryLevel = "register" | "shared" | "l2" | "global";
type Predicate = "cutoff" | "even" | "quarter" | "uniform";
type Pattern = "contiguous" | "stride2" | "stride4" | "broadcast";

const tabs: { id: Tab; label: string }[] = [
  { id: "overview", label: "1 · Büyük resim" },
  { id: "architecture", label: "2 · Hiyerarşi" },
  { id: "simt", label: "3 · SIMT" },
  { id: "memory", label: "4 · Bellek" },
  { id: "lab", label: "5 · Kernel Laboratuvarı" },
];

const archData: Record<ArchLevel, { label: string; code: string; title: string; body: string; owner: string; sharing: string; result: string }> = {
  grid: {
    label: "Grid", code: "kernel çalıştırma", title: "Grid · tüm problem uzayı",
    body: "Bir kernel çalıştırma’ın bütün thread block’larıdır. Block’lar uygun SM’lere dalgalar halinde dağıtılır.",
    owner: "Host tarafındaki kernel çalıştırma", sharing: "Block’lar global memory üzerinden haberleşebilir; normal kernel içinde genel grid bariyeri yoktur.",
    result: "Block sırasına güvenme; block’lar herhangi bir sırada çalışabilir.",
  },
  block: {
    label: "Block", code: "blockIdx", title: "Block · işbirliği ve kaynak tahsisi",
    body: "Thread’lerin birlikte schedule edilen grubudur. Bir block ömrü boyunca tek bir SM’de kalır ve warp’lara bölünür.",
    owner: "Izgara zamanlayıcısı → uygun bir SM", sharing: "Aynı block thread’leri shared memory kullanabilir ve __syncthreads() ile bariyer kurabilir.",
    result: "Register veya shared memory tüketimi yükselirse aynı SM’de eşzamanlı yaşayabilen block sayısı düşebilir.",
  },
  warp: {
    label: "Warp", code: "32 iş parçacığı", title: "Warp · temel gönderim / zamanlama grubu",
    body: "32 ardışık thread’den oluşur. Scheduler hazır warp’lardan instruction issue ederek bellek ve pipeline beklemelerini gizlemeye çalışır.",
    owner: "SM warp zamanlayıcısı", sharing: "Lane’ler warp-level primitives ile register verisi paylaşabilir; aktif maske önemlidir.",
    result: "Aynı warp içindeki branch ayrışması yolları maskelerle seri hale getirebilir.",
  },
  thread: {
    label: "Thread", code: "threadIdx", title: "Thread · bağımsız program durumu",
    body: "Kendi indeksleri, register’ları ve yerel verisi vardır; aynı kernel kodunu farklı veri üzerinde çalıştırır.",
    owner: "Bir warp içindeki lane kimliği", sharing: "Register’lar özeldir; shared memory block, global memory device kapsamındadır.",
    result: "Thread mantıksal bir program örneğidir; kalıcı fiziksel bir CUDA core değildir.",
  },
  instruction: {
    label: "Instruction", code: "şerit işlemi", title: "Instruction · execution pipeline işi",
    body: "Warp instruction’ı FP/INT, load-store, special function veya tensor pipeline’larından uygun olana issue edilir.",
    owner: "Warp zamanlayıcısı + gönderim", sharing: "Aktif lane maskesi hangi thread’lerin sonuç yazacağını belirler.",
    result: "Throughput; instruction karışımı, bağımlılıklar, hazır warp’lar ve execution-unit kapasitesiyle şekillenir.",
  },
};

const memoryData: Record<MemoryLevel, { title: string; scope: string; body: string; risk: string }> = {
  register: { title: "Registers", scope: "Thread", body: "Her thread’in özel çalışma alanı. Çok düşük gecikme ve yüksek bant genişliği; SM başına toplam bütçe sınırlıdır.", risk: "Register baskısı occupancy’yi azaltabilir; spill olursa local memory global memory yoluna düşer." },
  shared: { title: "Paylaşılan bellek / L1", scope: "Blok / SM", body: "On-chip kaynak. Shared memory block içi yeniden kullanım için yazılımcı; L1 erişimleri donanım tarafından yönetir.", risk: "Bank conflict erişimi serileştirebilir; yüksek tahsis resident block sayısını düşürebilir." },
  l2: { title: "L2 önbelleği", scope: "Tüm device", body: "Tüm SM’lerce paylaşılan device düzeyi cache; global memory trafiğini azaltır.", risk: "Çalışma seti büyük veya erişim düzensizse hit oranı düşebilir." },
  global: { title: "Genel bellek", scope: "Tüm device", body: "Yüksek kapasiteli GDDR/HBM. Yüksek gecikmesine karşın düzenli ve paralel erişimde yüksek bant genişliği sağlar.", risk: "Coalescing zayıfsa küçük faydalı veri için çok fazla sektör taşınır." },
};

const phases = ["Predicate", "Path A", "Path B", "Reconverge"];

export default function CudaSimtEmbedded() {
  const [tab, setTab] = useState<Tab>("overview");
  const [arch, setArch] = useState<ArchLevel>("grid");
  const [memory, setMemory] = useState<MemoryLevel>("register");
  const [predicate, setPredicate] = useState<Predicate>("cutoff");
  const [cutoff, setCutoff] = useState(16);
  const [phase, setPhase] = useState(0);
  const [selectedLane, setSelectedLane] = useState(0);
  const [pattern, setPattern] = useState<Pattern>("contiguous");
  const [n, setN] = useState(1000);
  const [blockSize, setBlockSize] = useState(256);
  const [smCount, setSmCount] = useState(4);

  const laneTakesA = (lane: number) => {
    if (predicate === "cutoff") return lane < cutoff;
    if (predicate === "even") return lane % 2 === 0;
    if (predicate === "quarter") return lane % 4 === 0;
    return true;
  };
  const aCount = Array.from({ length: 32 }, (_, lane) => laneTakesA(lane)).filter(Boolean).length;
  const serialPaths = aCount > 0 && aCount < 32 ? 2 : 1;

  const addresses = useMemo(() => {
    if (pattern === "stride2") return Array.from({ length: 32 }, (_, lane) => lane * 2);
    if (pattern === "stride4") return Array.from({ length: 32 }, (_, lane) => lane * 4);
    if (pattern === "broadcast") return Array(32).fill(0);
    return Array.from({ length: 32 }, (_, lane) => lane);
  }, [pattern]);
  const sectors = useMemo(() => [...new Set(addresses.map((address) => Math.floor(address / 8)))], [addresses]);

  const blocks = Math.ceil(n / blockSize);
  const warpsPerBlock = Math.ceil(blockSize / 32);
  const totalWarps = blocks * warpsPerBlock;
  const extraThreads = blocks * blockSize - n;
  const validThreadsInLastBlock = n - (blocks - 1) * blockSize;
  const lastWarpStart = (warpsPerBlock - 1) * 32;
  const lastWarpActive = Math.max(0, Math.min(32, validThreadsInLastBlock - lastWarpStart));

  return (
    <main className="cuda-simt-embed atlas-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">ETKİLEŞİMLİ GPU ZİHİNSEL MODELİ</p>
          <h1>Bilgisayar Mimarisi <span>→</span> SIMT <span>→</span> CUDA</h1>
          <p className="hero-copy">Bir kernel çağrısının CPU’dan başlayıp warp, bellek ve SM zamanlayıcısına uzanan yolculuğu.</p>
        </div>
        <div className="hero-chip" aria-label="Öğrenme rotası">
          <span>ANA SİSTEM</span><i>→</i><span>IZGARA</span><i>→</i><span>WARP</span><i>→</i><span>ŞERİT</span>
        </div>
      </header>

      <div className="tabs" role="tablist" aria-label="CUDA öğrenme bölümleri">
        {tabs.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)}>{item.label}</button>
        ))}
      </div>

      {tab === "overview" && (
        <section className="panel-stack" role="tabpanel">
          <SectionHead title="Heterojen sistem: kontrol CPU’da, paralel iş GPU’da" subtitle="Host kodu kernel’i başlatır; device kodu binlerce thread olarak çalışır." badge="Ana sistem + Aygıt" />
          <div className="flow" aria-label="CPU'dan GPU'ya yürütme akışı">
            <FlowNode tone="blue" title="CPU · Ana sistem" copy="Seri kontrol, I/O, kernel çalıştırma, bellek orkestrasyonu" />
            <b aria-hidden>→</b>
            <FlowNode tone="amber" title="CUDA Runtime + Driver" copy="Grid yapılandırması, komut kuyruğu, veri hareketi" />
            <b aria-hidden>→</b>
            <FlowNode tone="cyan" title="GPU · Device" copy="SM’ler, warp scheduler’lar, execution unit’ler, GDDR/HBM" />
          </div>
          <div className="launch-strip">
            {[ ["Allocate", "Device belleği ayır"], ["Kopyala H→D", "Girdiyi GPU’ya taşı"], ["Launch", "<<<grid, block>>>"], ["Execute", "Izgara → blok → warp"], ["Kopyala D→H", "Sonucu CPU’ya al"] ].map(([title, copy], index) => (
              <div className="launch-step" key={title}><em>{index + 1}</em><div><strong>{title}</strong><span>{copy}</span></div></div>
            ))}
          </div>
          <div className="compare-grid">
            <Compare title="CPU tasarım önceliği" rows={[["Amaç", "Düşük gecikme"], ["Çekirdek", "Az sayıda, karmaşık"], ["Kontrol", "Branch prediction + out-of-order"], ["İdeal iş", "Seri akış, düzensiz kontrol, OS / I/O"]]} />
            <Compare title="GPU tasarım önceliği" rows={[["Amaç", "Yüksek throughput"], ["Çekirdek", "Çok sayıda paralel yürütme kaynağı"], ["Kontrol", "Warp çokluğu ile latency hiding"], ["İdeal iş", "Düzenli, veri-paralel, aritmetik yoğun"]]} />
          </div>
          <Lesson title="Ana ayrım" copy="CPU tek bir işi hızlı bitirmeye; GPU çok sayıda benzer işi birlikte ilerletmeye optimize edilir." />
        </section>
      )}

      {tab === "architecture" && (
        <section className="panel-stack" role="tabpanel">
          <SectionHead title="Programlama hiyerarşisi donanıma nasıl oturur?" subtitle="Bir düzeyi seç; kapsamı, çalışma birimini ve donanım karşılığını izle." badge={`Seçili: ${archData[arch].label}`} />
          <div className="arch-layout">
            <div className="choice-rail">
              {(Object.keys(archData) as ArchLevel[]).map((key) => <button key={key} type="button" aria-pressed={arch === key} onClick={() => setArch(key)}><span>{archData[key].label}</span><code>{archData[key].code}</code></button>)}
            </div>
            <div className="arch-stage">
              <div className="hierarchy">
                {(Object.keys(archData) as ArchLevel[]).map((key) => <div className={arch === key ? "hier-node active" : "hier-node"} key={key}><strong>{archData[key].label}</strong><span>{archData[key].code}</span></div>)}
              </div>
              <div className="mapping-grid">
                <Fact label="Grid" value="Tüm GPU / birden çok SM" />
                <Fact label="Block" value="Tek SM; bitene dek göç etmez" />
                <Fact label="Warp" value="SM warp zamanlayıcısı" />
                <Fact label="Thread" value="Yazmaç durumu + şerit" />
              </div>
              <DetailCard title={archData[arch].title} body={archData[arch].body} facts={[["Kim yönetir?", archData[arch].owner], ["Paylaşım", archData[arch].sharing], ["Önemli sonuç", archData[arch].result]]} />
            </div>
          </div>
          <Lesson title="Yanlış mental model" copy="Bir CUDA core, ömrü boyunca tek bir thread değildir. Warp instruction’ları execution unit’lere çevrimler boyunca issue edilir; thread durumu register’larda korunur." />
        </section>
      )}

      {tab === "simt" && (
        <section className="panel-stack" role="tabpanel">
          <SectionHead title="SIMT: tek instruction, 32 bağımsız thread durumu" subtitle="Her lane farklı veriye ve register durumuna sahip; warp ortak instruction akışını issue eder." badge="Warp = 32 iş parçacığı" />
          <div className="controls">
            <label>Predicate<select value={predicate} onChange={(e) => { setPredicate(e.target.value as Predicate); setPhase(0); }}><option value="cutoff">lane &lt; eşik</option><option value="even">lane % 2 == 0</option><option value="quarter">lane % 4 == 0</option><option value="uniform">tüm lane’ler true</option></select></label>
            {predicate === "cutoff" && <label>Eşik: <strong>{cutoff}</strong><input type="range" min="1" max="31" value={cutoff} onChange={(e) => { setCutoff(Number(e.target.value)); setPhase(0); }} /></label>}
            <button className="primary" type="button" onClick={() => setPhase((phase + 1) % phases.length)}>Sonraki aşama →</button>
          </div>
          <div className="simt-layout">
            <div className="warp-stage">
              <div className="stage-title"><strong>Warp 0 · şerit 0…31</strong><b>{phases[phase]}</b></div>
              <div className="lane-grid">
                {Array.from({ length: 32 }, (_, lane) => {
                  const pathA = laneTakesA(lane);
                  const masked = (phase === 1 && !pathA) || (phase === 2 && pathA);
                  return <button type="button" key={lane} onClick={() => setSelectedLane(lane)} className={`lane ${pathA ? "path-a" : "path-b"} ${masked ? "masked" : ""} ${selectedLane === lane ? "selected" : ""}`} aria-label={`Lane ${lane}, ${pathA ? "Path A" : "Path B"}`}>{lane}</button>;
                })}
              </div>
              <div className="path-strip"><Path title="Path A · if" value={`${aCount} aktif lane`} tone="blue" /><Path title="Path B · else" value={`${32 - aCount} aktif lane`} tone="amber" /><Path title="Reconverge" value="Warp yeniden birleşir" tone="cyan" /></div>
            </div>
            <DetailCard title="Dallanma maliyeti" body={serialPaths === 1 ? "Tüm aktif lane’ler aynı yolu aldığı için warp-level branch divergence oluşmaz." : "Warp önce A yolunu A-maskesiyle, sonra B yolunu B-maskesiyle yürütür. Maskeli lane’ler sonuç yazmaz."} facts={[["Path A", `${aCount} / 32`], ["Path B", `${32 - aCount} / 32`], ["Ardışık yollar", String(serialPaths)], ["Seçili lane", `Lane ${selectedLane} → ${laneTakesA(selectedLane) ? "Path A" : "Path B"}`]]} />
          </div>
          <Lesson title="Kritik sınır" copy="Farklı warp’ların farklı branch alması divergence değildir. Maliyet, aynı warp içindeki lane’lerin ayrışmasıyla doğar." />
        </section>
      )}

      {tab === "memory" && (
        <section className="panel-stack" role="tabpanel">
          <SectionHead title="Bellek hiyerarşisi + coalescing" subtitle="Hız kadar kapsam, kapasite, erişim düzeni ve yeniden kullanım da önemlidir." badge="Yakın → uzak" />
          <div className="memory-layout">
            <div className="memory-stack">
              {(Object.keys(memoryData) as MemoryLevel[]).map((key) => <button type="button" key={key} aria-pressed={memory === key} onClick={() => setMemory(key)}><span>{memoryData[key].title}</span><small>{memoryData[key].scope}</small></button>)}
              <DetailCard title={memoryData[memory].title} body={memoryData[memory].body} facts={[["Yaşam alanı", memoryData[memory].scope], ["Risk", memoryData[memory].risk]]} />
            </div>
            <div className="coalesce-stage">
              <label className="select-label">Warp erişim deseni<select value={pattern} onChange={(e) => setPattern(e.target.value as Pattern)}><option value="contiguous">Ardışık: base + lane</option><option value="stride2">Stride 2: base + 2×lane</option><option value="stride4">Stride 4: base + 4×lane</option><option value="broadcast">Broadcast: tüm lane → base</option></select></label>
              <div className="stats"><Stat label="Element" value="4 B int" /><Stat label="Dokunulan sektör" value={`${sectors.length} × 32 B`} /><Stat label="Adres yayılımı" value={`${Math.min(...addresses)}…${Math.max(...addresses)}`} /></div>
              <div><h3>Şerit → eleman indisi</h3><div className="address-grid">{addresses.map((address, lane) => <div key={lane}><strong>{lane}</strong><span>→{address}</span></div>)}</div></div>
              <div><h3>32 B sektör görünümü</h3><div className="sector-grid">{Array.from({ length: Math.min(Math.max(...sectors) + 1, 16) }, (_, sector) => <div key={sector} className={sectors.includes(sector) ? "hit" : ""}>S{sector}</div>)}</div></div>
              <p className="muted">{pattern === "contiguous" ? "Hizalı ardışık erişim 128 B veriyi 4 sektörde toplar." : pattern === "stride2" ? "Stride 2 erişimi 8 sektöre yayar; sektörlerin yaklaşık yarısı kullanılmaz." : pattern === "stride4" ? "Stride 4 erişimi 16 sektöre yayar; sektör başına faydalı veri azalır." : "Tüm lane’ler aynı kelimeyi hedefler; cache/broadcast davranışı tekrarları azaltabilir."}</p>
            </div>
          </div>
          <Lesson title="Modelin sınırı" copy="Bu görünüm hizalı 4 B erişim ve 32 B sektörleri öğretmek için basitleştirilmiştir; gerçek trafik cache durumu ve GPU nesline göre değişebilir." />
        </section>
      )}

      {tab === "lab" && (
        <section className="panel-stack" role="tabpanel">
          <SectionHead title="Kernel Lab: problem boyutunu grid’e dönüştür" subtitle="1D örnek: her thread bir elementi işler; sınır kontrolü son block’u güvenli tutar." badge="i = blockIdx.x × blockDim.x + threadIdx.x" />
          <div className="lab-layout">
            <div className="lab-controls">
              <Range label="Problem boyutu N" value={n} min={1} max={4096} onChange={setN} />
              <Range label="Blok boyutu" value={blockSize} suffix=" thread" min={32} max={1024} step={32} onChange={setBlockSize} />
              <Range label="Örnek SM sayısı" value={smCount} min={1} max={8} onChange={setSmCount} />
              <div className="formula"><code>ızgara = ceil(N / blockDim)</code><strong>ceil({n} / {blockSize}) = {blocks} block</strong></div>
              <p className="muted">SM sayısı yalnız dağıtımı gösterir; gerçek eşzamanlılık kaynak limitlerine bağlıdır.</p>
            </div>
            <div className="lab-stage">
              <div className="stats"><Stat label="Grid" value={`${blocks} block`} /><Stat label="Toplam warp" value={String(totalWarps)} /><Stat label="Fazladan iş parçacığı" value={String(extraThreads)} /></div>
              <div><h3>Block’ların SM’lere olası dalga dağılımı</h3><div className="sm-grid" style={{ gridTemplateColumns: `repeat(${Math.min(smCount, 4)}, minmax(0, 1fr))` }}>{Array.from({ length: smCount }, (_, sm) => { const owned = Array.from({ length: blocks }, (_, block) => block).filter((block) => block % smCount === sm); return <div className="sm-column" key={sm}><strong>SM {sm}</strong>{owned.slice(0, 8).map((block) => <span key={block} className={block === blocks - 1 ? "last" : ""}>Block {block}</span>)}{owned.length === 0 && <small>bekliyor</small>}{owned.length > 8 && <small>+{owned.length - 8} block</small>}</div>; })}</div></div>
              <div><div className="stage-title"><strong>Son blok · son warp</strong><span>{lastWarpActive} aktif, {32 - lastWarpActive} guard ile kapalı lane</span></div><div className="lane-grid">{Array.from({ length: 32 }, (_, lane) => <div key={lane} className={`lane ${lane < lastWarpActive ? "path-a" : "masked"}`}>{lane}</div>)}</div></div>
            </div>
          </div>
          <div className="checklist"><Fact label="Correctness" value="if (i < N) sınır koruması" /><Fact label="Coalescing" value="Komşu lane → komşu adres" /><Fact label="Occupancy" value="İş parçacığı + yazmaç + paylaşılan bellek + blok sınırları" /></div>
          <Lesson title="Blok boyutu tek başına cevap değildir" copy="128/256 thread iyi başlangıç deneyleridir; doğru seçim profiler, register kullanımı, shared memory, latency hiding ve bellek davranışıyla ölçülür." />
        </section>
      )}
    </main>
  );
}

function SectionHead({ title, subtitle, badge }: { title: string; subtitle: string; badge: string }) { return <div className="section-head"><div><h2>{title}</h2><p>{subtitle}</p></div><span>{badge}</span></div>; }
function FlowNode({ title, copy, tone }: { title: string; copy: string; tone: string }) { return <div className={`flow-node ${tone}`}><strong>{title}</strong><span>{copy}</span></div>; }
function Compare({ title, rows }: { title: string; rows: string[][] }) { return <div className="compare"><h3>{title}</h3>{rows.map(([label, value]) => <Fact key={label} label={label} value={value} />)}</div>; }
function Fact({ label, value }: { label: string; value: string }) { return <div className="fact"><span>{label}</span><strong>{value}</strong></div>; }
function Lesson({ title, copy }: { title: string; copy: string }) { return <div className="lesson"><span>◇</span><p><strong>{title}:</strong> {copy}</p></div>; }
function DetailCard({ title, body, facts }: { title: string; body: string; facts: string[][] }) { return <article className="detail-card"><h3>{title}</h3><p>{body}</p>{facts.map(([label, value]) => <Fact key={label} label={label} value={value} />)}</article>; }
function Path({ title, value, tone }: { title: string; value: string; tone: string }) { return <div className={`path ${tone}`}><strong>{title}</strong><span>{value}</span></div>; }
function Stat({ label, value }: { label: string; value: string }) { return <div className="stat"><span>{label}</span><strong>{value}</strong></div>; }
function Range({ label, value, suffix = "", min, max, step = 1, onChange }: { label: string; value: number; suffix?: string; min: number; max: number; step?: number; onChange: (value: number) => void }) { return <label className="range-label"><span>{label}: <strong>{value}{suffix}</strong></span><input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} /></label>; }
