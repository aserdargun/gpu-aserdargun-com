"use client";

import { useMemo, useState } from "react";

type Tab = "overview" | "architecture" | "simt" | "memory" | "lab" | "latency" | "occupancy" | "quiz";
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
  { id: "latency", label: "6 · Gecikme gizleme" },
  { id: "occupancy", label: "7 · Doluluk" },
  { id: "quiz", label: "8 · Test" },
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

const simtVsSimd = [
  ["Yürütme modeli", "Kilitli adım (lockstep): tüm lane'ler aynı anda aynı işlemi yapar", "Bağımsız thread durumları: her lane kendi register'ı ve akışıyla ilerler"],
  ["Program sayacı", "Tüm vektör tek bir PC paylaşır", "Her thread kendi program sayacına sahiptir"],
  ["Dallanma", "Tüm vektör aynı yolu alır; ayrışma yok", "Lane başına maske ile yollar seri yürütülür"],
  ["Genişlik", "Sabit vektör genişliği (ör. 4/8/16 eleman)", "32 lane'lik warp (donanım birimi)"],
  ["Donanım", "CPU vektör birimi (AVX/NEON)", "GPU SM + warp scheduler"],
  ["Amaç", "Tek çekirdekte veri paralelliği", "Binlerce thread ile throughput"],
];

type QuizQuestion = { q: string; options: string[]; answer: number; explain: string };

const quizQuestions: QuizQuestion[] = [
  { q: "Bir warp kaç thread'den oluşur?", options: ["8", "16", "32", "64"], answer: 2, explain: "Warp, 32 ardışık thread'den oluşan temel gönderim/zamanlama birimidir." },
  { q: "Aynı warp içindeki lane'ler farklı branch alırsa ne olur?", options: ["Hiçbir şey; paralel çalışırlar", "Yollar maske ile seri yürütülür (divergence)", "Kernel hata verir", "Sadece ilk lane çalışır"], answer: 1, explain: "Warp önce A yolunu A-maskesiyle, sonra B yolunu B-maskesiyle yürütür; maskeli lane'ler sonuç yazmaz." },
  { q: "SIMT ile SIMD arasındaki temel fark nedir?", options: ["SIMT daha hızlıdır", "SIMT'de her thread bağımsız program durumuna sahiptir", "SIMD sadece GPU'da çalışır", "Aralarında fark yoktur"], answer: 1, explain: "SIMT'de her lane kendi register'ı ve program sayacına sahiptir; SIMD kilitli adımda tek PC paylaşır." },
  { q: "Global thread indeksi nasıl hesaplanır?", options: ["i = threadIdx.x", "i = blockIdx.x", "i = blockIdx.x * blockDim.x + threadIdx.x", "i = blockIdx.x + threadIdx.x"], answer: 2, explain: "blockIdx.x * blockDim.x + threadIdx.x, thread'in tüm grid içindeki benzersiz indeksidir." },
  { q: "Son block'ta sınır kontrolü (if (i < N)) neden gerekli?", options: ["Performansı artırmak için", "N, block boyutunun tam katı olmayabilir; fazla thread'ler bellek dışına yazar", "Derleyici zorunlu kılar", "Gerekli değildir"], answer: 1, explain: "Fazla thread'lerin dizi sınırı dışına yazmasını engeller." },
  { q: "Bellek gecikmesini gizlemek için ne gerekir?", options: ["Daha hızlı bellek", "Yeterli sayıda hazır warp (occupancy)", "Daha az thread", "Daha büyük block"], answer: 1, explain: "Bir warp bellek beklerken scheduler hazır başka warp'a geçer; yeterli warp yoksa SM boş kalır." },
  { q: "Occupancy'yi ne belirler?", options: ["Sadece thread sayısı", "En kısıtlı kaynak (register/shared/thread/block)", "Sadece register sayısı", "GPU sıcaklığı"], answer: 1, explain: "Doluluk, en kısıtlı kaynak tarafından belirlenir." },
  { q: "Coalescing (birleşik erişim) nedir?", options: ["Komşu lane'lerin komşu adreslere erişmesi", "Thread'lerin farklı kernel çalıştırması", "Bellek temizleme", "Register paylaşımı"], answer: 0, explain: "Komşu lane → komşu adres; erişim 32B sektörlerde toplanır ve gereksiz trafik azalır." },
];

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
  const [warps, setWarps] = useState(4);
  const [latency, setLatency] = useState(80);
  const [computeCycles, setComputeCycles] = useState(8);
  const [occBlockSize, setOccBlockSize] = useState(256);
  const [regsPerThread, setRegsPerThread] = useState(32);
  const [sharedPerBlock, setSharedPerBlock] = useState(0);

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

  const period = computeCycles + latency;
  const neededWarps = Math.ceil(period / computeCycles);
  const utilization = Math.min(1, (warps * computeCycles) / period);
  const warpComputing = (warp: number, t: number) => {
    const s = ((t - warp * computeCycles) % period + period) % period;
    return s < computeCycles;
  };
  const smBusy = (t: number) => Array.from({ length: warps }, (_, w) => warpComputing(w, t)).some(Boolean);

  const occWarpsPerBlock = Math.ceil(occBlockSize / 32);
  const blocksByThreads = Math.floor(2048 / occBlockSize);
  const regsPerBlock = regsPerThread * occBlockSize;
  const blocksByRegs = Math.floor(65536 / regsPerBlock);
  const sharedBytes = sharedPerBlock * 1024;
  const blocksByShared = sharedBytes === 0 ? 32 : Math.floor(49152 / sharedBytes);
  const blocksPerSM = Math.min(blocksByThreads, blocksByRegs, blocksByShared, 32);
  const warpsPerSM = blocksPerSM * occWarpsPerBlock;
  const occupancy = warpsPerSM / 64;
  const occLimits = [
    { name: "Thread sınırı", detail: "2048 / " + occBlockSize, blocks: blocksByThreads },
    { name: "Register sınırı", detail: "65536 / (" + regsPerThread + " × " + occBlockSize + ")", blocks: blocksByRegs },
    { name: "Shared memory", detail: sharedBytes === 0 ? "kullanılmıyor" : "49152 / " + sharedBytes, blocks: blocksByShared },
    { name: "Block sınırı", detail: "32", blocks: 32 },
  ];
  const occMinBlocks = Math.min(...occLimits.map((l) => l.blocks));

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
          <SimtVsSimd title="SIMD ile SIMT aynı şey değildir" rows={simtVsSimd} />
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
          <div className="kernel-code-block">
            <h3>Gerçek CUDA kodu</h3>
            <KernelCode n={n} blockSize={blockSize} blocks={blocks} />
          </div>
          <div className="checklist"><Fact label="Correctness" value="if (i < N) sınır koruması" /><Fact label="Coalescing" value="Komşu lane → komşu adres" /><Fact label="Occupancy" value="İş parçacığı + yazmaç + paylaşılan bellek + blok sınırları" /></div>
          <Lesson title="Blok boyutu tek başına cevap değildir" copy="128/256 thread iyi başlangıç deneyleridir; doğru seçim profiler, register kullanımı, shared memory, latency hiding ve bellek davranışıyla ölçülür." />
        </section>
      )}
      {tab === "latency" && (
        <section className="panel-stack" role="tabpanel">
          <SectionHead title="Latency hiding: bellek beklerken SM boş durmaz" subtitle="Bir warp bellekten veri beklerken scheduler hazır başka bir warp'a geçer; yeterli warp yoksa SM boş kalır." badge={"Periyot = " + computeCycles + " + " + latency + " = " + period + " çevrim"} />
          <div className="latency-controls">
            <Range label="Resident warp sayısı" value={warps} min={1} max={16} onChange={setWarps} />
            <Range label="Bellek gecikmesi" value={latency} suffix=" çevrim" min={20} max={200} step={10} onChange={setLatency} />
            <Range label="Compute süresi" value={computeCycles} suffix=" çevrim" min={4} max={32} step={4} onChange={setComputeCycles} />
          </div>
          <div className="stats">
            <Stat label="Kullanım" value={Math.round(utilization * 100) + "%"} />
            <Stat label="Tam gizleme için warp" value={String(neededWarps)} />
            <Stat label="Periyot" value={period + " çevrim"} />
          </div>
          <div className="latency-timeline">
            {Array.from({ length: warps }, (_, w) => (
              <div className="latency-row" key={w}>
                <span className="latency-label">W{w}</span>
                {Array.from({ length: 48 }, (_, t) => <div key={t} className={"latency-cell " + (warpComputing(w, t) ? "compute" : "memory")} />)}
              </div>
            ))}
            <div className="latency-row sm">
              <span className="latency-label">SM</span>
              {Array.from({ length: 48 }, (_, t) => <div key={t} className={"latency-cell " + (smBusy(t) ? "busy" : "idle")} />)}
            </div>
          </div>
          <div className="latency-legend">
            <span><i className="compute" /> Compute</span>
            <span><i className="memory" /> Bellek bekleme</span>
            <span><i className="busy" /> SM meşgul</span>
            <span><i className="idle" /> SM boş</span>
          </div>
          <Lesson title="Kritik eşik" copy={warps >= neededWarps ? "Yeterli warp var (" + warps + " ≥ " + neededWarps + "): bellek gecikmesi tamamen gizlenir ve SM her çevrimde meşgul kalır." : "Warp sayısı yetersiz (" + warps + " < " + neededWarps + "): tüm warp'lar bellek beklerken SM boş kalır. Tam gizleme için ceil((C+L)/C) = " + neededWarps + " warp gerekir."} />
        </section>
      )}
      {tab === "occupancy" && (
        <section className="panel-stack" role="tabpanel">
          <SectionHead title="Occupancy: bir SM'ye kaç warp sığar?" subtitle="Register, shared memory ve thread sınırları aynı anda geçerlidir; en kısıtlı kaynak doluluğu belirler." badge={"Occupancy = " + Math.round(occupancy * 100) + "%"} />
          <div className="occ-controls">
            <Range label="Blok boyutu" value={occBlockSize} suffix=" thread" min={32} max={1024} step={32} onChange={setOccBlockSize} />
            <Range label="Register / thread" value={regsPerThread} min={16} max={255} step={8} onChange={setRegsPerThread} />
            <Range label="Shared memory / block" value={sharedPerBlock} suffix=" KB" min={0} max={48} step={4} onChange={setSharedPerBlock} />
          </div>
          <div className="stats">
            <Stat label="Occupancy" value={Math.round(occupancy * 100) + "%"} />
            <Stat label="Block / SM" value={String(blocksPerSM)} />
            <Stat label="Warp / SM" value={warpsPerSM + " / 64"} />
          </div>
          <div className="occ-limits">
            {occLimits.map((l) => (
              <div key={l.name} className={l.blocks === occMinBlocks ? "occ-limit binding" : "occ-limit"}>
                <span>{l.name}</span>
                <code>{l.detail}</code>
                <b>{l.blocks} block</b>
              </div>
            ))}
          </div>
          <Lesson title="Kritik kural" copy="Doluluk en kısıtlı kaynak tarafından belirlenir. Register veya shared memory kullanımını düşürerek aynı SM'de daha fazla block yaşatabilirsin." />
        </section>
      )}
      {tab === "quiz" && (
        <section className="panel-stack" role="tabpanel">
          <SectionHead title="Bilgini test et" subtitle="8 soru; her cevaptan sonra açıklamayı gör." badge="Kontrol noktası" />
          <Quiz questions={quizQuestions} />
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
function SimtVsSimd({ title, rows }: { title: string; rows: string[][] }) { return <div className="simt-vs-block"><h3 className="simt-vs-title">{title}</h3><div className="simt-vs-simd"><div className="simt-vs-head"><span className="dim" aria-hidden /><span className="simd">SIMD</span><span className="simt">SIMT</span></div>{rows.map(([dim, simd, simt]) => <div className="simt-vs-row" key={dim}><span className="dim">{dim}</span><span className="simd">{simd}</span><span className="simt">{simt}</span></div>)}</div></div>; }
function KernelCode({ n, blockSize, blocks }: { n: number; blockSize: number; blocks: number }) {
  const segs: (string | { hl: string })[] = [
    "// 1) Kernel: her thread bir elementi işler\n",
    "__global__ void scale_kernel(const float* x, float* y, float alpha, int n) {\n",
    "    int i = blockIdx.x * blockDim.x + threadIdx.x;\n",
    "    if (i < n) {  // sınır koruması\n",
    "        y[i] = alpha * x[i];\n",
    "    }\n",
    "}\n",
    "\n",
    "// 2) Host: grid boyutunu hesapla ve başlat\n",
    "int blockSize = ", { hl: String(blockSize) }, ";\n",
    "int gridSize  = (", { hl: String(n) }, " + ", { hl: String(blockSize) }, " - 1) / ", { hl: String(blockSize) }, ";  // ceil(n / blockSize) = ", { hl: String(blocks) }, "\n",
    "\n",
    "scale_kernel<<<", { hl: String(blocks) }, ", ", { hl: String(blockSize) }, ">>>(d_x, d_y, 2.0f, ", { hl: String(n) }, ");\n",
  ];
  return <pre className="kernel-code"><code>{segs.map((seg, i) => typeof seg === "string" ? seg : <span key={i} className="hl">{seg.hl}</span>)}</code></pre>;
}
function Quiz({ questions }: { questions: QuizQuestion[] }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const answered = Object.keys(answers).length;
  const correct = questions.filter((q, i) => answers[i] === q.answer).length;
  return (
    <div className="quiz">
      <div className="quiz-score">
        <div><span>Skor</span><b>{correct} / {questions.length}</b></div>
        {answered === questions.length && <button type="button" onClick={() => setAnswers({})}>Tekrar dene</button>}
      </div>
      {questions.map((q, i) => {
        const chosen = answers[i];
        const isAnswered = chosen !== undefined;
        const isCorrect = chosen === q.answer;
        return (
          <div key={i} className={"quiz-q" + (isAnswered ? (isCorrect ? " correct" : " wrong") : "")}>
            <h3>{i + 1}. {q.q}</h3>
            <div className="quiz-options">
              {q.options.map((opt, j) => {
                const isChosen = chosen === j;
                const isAnswer = q.answer === j;
                let cls = "";
                if (isAnswered) {
                  if (isAnswer) cls = "answer";
                  else if (isChosen) cls = "chosen-wrong";
                }
                return <button key={j} type="button" disabled={isAnswered} onClick={() => setAnswers({ ...answers, [i]: j })} className={cls}>{opt}</button>;
              })}
            </div>
            {isAnswered && <p className="quiz-explain">{isCorrect ? "✓ Doğru" : "✗ Yanlış"} — {q.explain}</p>}
          </div>
        );
      })}
    </div>
  );
}
function Range({ label, value, suffix = "", min, max, step = 1, onChange }: { label: string; value: number; suffix?: string; min: number; max: number; step?: number; onChange: (value: number) => void }) { return <label className="range-label"><span>{label}: <strong>{value}{suffix}</strong></span><input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} /></label>; }
