"use client";
/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- Labelled overflow regions must remain keyboard-scrollable. */

import { useMemo, useState } from "react";

type ModuleId = "hierarchy" | "coalescing" | "banks" | "occupancy";
type MemoryArchitecture = "ada" | "hopper" | "blackwell";
type MemoryFeatureId = "asyncBulk" | "tensorDescriptor" | "dsmem" | "tmem";

export const MEMORY_ARCHITECTURES: ReadonlyArray<{ id: MemoryArchitecture; label: string; capability: string }> = [
  { id: "ada", label: "Ada", capability: "SM89" },
  { id: "hopper", label: "Hopper", capability: "SM90" },
  { id: "blackwell", label: "Blackwell", capability: "SM100 ailesi" },
];

const memoryArchitectureFeatures: ReadonlyArray<{ id: MemoryFeatureId; label: string; detail: string; introduced: MemoryArchitecture }> = [
  { id: "asyncBulk", label: "Asenkron bulk tensor kopyası", detail: "TMA ile büyük 1D veya çok boyutlu aktarımlar; tamamlanma bariyer/proxy kurallarıyla izlenir.", introduced: "hopper" },
  { id: "tensorDescriptor", label: "Tensor descriptor / tensör tanımlayıcı", detail: "Çok boyutlu bulk tensor kopyasında tensor map; şekil, stride ve düzen bilgisini adres üretiminden ayırır.", introduced: "hopper" },
  { id: "dsmem", label: "DSMEM", detail: "Aynı thread-block cluster içindeki blokların paylaşılan bellek bölümlerine cluster kapsamlı erişim.", introduced: "hopper" },
  { id: "tmem", label: "TMEM · Tensor Memory", detail: "Blackwell beşinci nesil Tensor Core işlemlerinin akümülatör yolu için uzmanlaşmış on-chip alan.", introduced: "blackwell" },
];

export function getMemoryFeatureSupport(architecture: MemoryArchitecture) {
  const rank: Record<MemoryArchitecture, number> = { ada: 0, hopper: 1, blackwell: 2 };
  return memoryArchitectureFeatures.map((feature) => {
    const enabled = rank[architecture] >= rank[feature.introduced];
    const reason = enabled ? null : feature.introduced === "blackwell"
      ? "TMEM bu atlas kapsamında Blackwell'e özgüdür; Ada veya Hopper için donanım sonucu üretilemez."
      : "Bu özellik Hopper / SM90 ve daha yeni bir compute capability gerektirir.";
    return { ...feature, enabled, reason };
  });
}

const modules: { id: ModuleId; number: string; label: string; short: string }[] = [
  { id: "hierarchy", number: "01", label: "Bellek hiyerarşisi", short: "Hiyerarşi" },
  { id: "coalescing", number: "02", label: "Birleşik erişim", short: "Birleşik erişim" },
  { id: "banks", number: "03", label: "Banka çakışması", short: "Banka çakışması" },
  { id: "occupancy", number: "04", label: "Doluluk", short: "Doluluk" },
];

const hierarchyLayers = [
  {
    id: "register",
    name: "Yazmaç",
    place: "SM üzerinde",
    scope: "Tek iş parçacığı",
    speed: "En düşük gecikme",
    capacity: "Çok küçük",
    color: "violet",
    note: "Derleyici skalerleri ve kısa ömürlü ara değerleri register'larda tutar. Fazla register kullanımı aynı SM'de kalabilen warp sayısını azaltabilir; taşma olursa veri, adına rağmen fiziksel olarak global bellekte bulunan local memory'ye gider.",
  },
  {
    id: "shared",
    name: "Paylaşılan bellek / L1",
    place: "SM üzerinde",
    scope: "İş parçacığı bloğu",
    speed: "Çok düşük gecikme",
    capacity: "Küçük, programlanabilir",
    color: "blue",
    note: "Bir block içindeki thread'lerin açıkça yönettiği ortak çalışma alanıdır. Veri tekrar kullanılacaksa global bellek trafiğini azaltır. Ancak senkronizasyon, bank conflict ve block başına kapasite maliyeti vardır.",
  },
  {
    id: "l2",
    name: "L2 önbelleği",
    place: "Tüm GPU'ya ortak",
    scope: "Bütün SM'ler",
    speed: "Orta gecikme",
    capacity: "MB mertebesi",
    color: "cyan",
    note: "Global ve local bellek trafiğinin ortak önbelleğidir. SM'ler arası veri tekrarından yararlanabilir. Kernel doğrudan L2'yi tahsis etmez; erişim düzeni ve veri çalışma kümesi hit oranını belirler.",
  },
  {
    id: "global",
    name: "Genel bellek",
    place: "GPU DRAM",
    scope: "Izgara ve ana sistem",
    speed: "Yüksek gecikme",
    capacity: "En büyük",
    color: "orange",
    note: "Büyük tensörlerin ana evidir. Bant genişliği yüksektir fakat tek erişimin gecikmesi büyüktür. Performans; coalescing, cache kullanımı, veri tekrarı ve gecikmeyi saklayacak hazır warp bulunmasına bağlıdır.",
  },
  {
    id: "host",
    name: "Ana sistem belleği",
    place: "CPU tarafı",
    scope: "Sistem",
    speed: "Bağlantı ile sınırlı",
    capacity: "Çok büyük",
    color: "slate",
    note: "Ayrık GPU'da PCIe veya benzeri bir bağlantının arkasındadır. Kernel'in sık sık host belleğine dönmesi pahalıdır. Toplu aktarım, pinned memory ve kopya–hesap örtüşmesi bu sınırı yönetmeye yardım eder.",
  },
] as const;

function Header({ active, setActive, visited }: { active: ModuleId; setActive: (id: ModuleId) => void; visited: Set<ModuleId> }) {
  return (
    <div className="topbar">
      <div className="module-nav" role="group" aria-label="Ders modülleri" tabIndex={0}>
        {modules.map((module) => (
          <button
            key={module.id}
            className={active === module.id ? "active" : ""}
            onClick={() => setActive(module.id)}
            aria-pressed={active === module.id}
          >
            <span>{module.number}</span>{module.short}
            {visited.has(module.id) && <b aria-label="ziyaret edildi">•</b>}
          </button>
        ))}
      </div>
    </div>
  );
}

function ModuleIntro({ eyebrow, title, lead, children }: { eyebrow: string; title: string; lead: string; children: React.ReactNode }) {
  return (
    <aside className="lesson-copy">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p className="lead">{lead}</p>
      </div>
      {children}
    </aside>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="fact"><span>{label}</span><p>{children}</p></div>;
}

function ArchitectureMemoryGate() {
  const [architecture, setArchitecture] = useState<MemoryArchitecture>("ada");
  const [selectedFeature, setSelectedFeature] = useState<MemoryFeatureId | null>(null);
  const features = getMemoryFeatureSupport(architecture);
  const selected = features.find((feature) => feature.id === selectedFeature && feature.enabled);
  return (
    <section className="architecture-memory-gate" aria-labelledby="memory-architecture-title">
      <div className="architecture-memory-heading">
        <div><span>MİMARİ UYGULANABİLİRLİĞİ</span><h2 id="memory-architecture-title">Ada → Hopper → Blackwell bellek yolları</h2><p>Kapasite, bant genişliği ve veri hareketi orkestrasyonu farklı sorulardır. GPU adından destek sonucu çıkarma; compute capability ve derleme hedefini doğrula.</p></div>
        <div className="architecture-selector" role="group" aria-label="GPU bellek mimarisi">
          {MEMORY_ARCHITECTURES.map((item) => <button key={item.id} type="button" aria-pressed={architecture === item.id} onClick={() => { setArchitecture(item.id); setSelectedFeature(null); }}><strong>{item.label}</strong><span>{item.capability}</span></button>)}
        </div>
      </div>
      <div className="memory-feature-grid">
        {features.map((feature) => (
          <div className={feature.enabled ? "available" : "unavailable"} key={feature.id}>
            <button
              type="button"
              disabled={!feature.enabled}
              aria-disabled={!feature.enabled}
              aria-describedby={`memory-feature-${feature.id}-reason`}
              aria-pressed={selectedFeature === feature.id}
              onClick={() => setSelectedFeature(feature.id)}
            >
              <span>{feature.enabled ? "KULLANILABİLİR" : "DESTEKLENMİYOR"}</span><strong>{feature.label}</strong>
            </button>
            <small id={`memory-feature-${feature.id}-reason`}>{feature.reason ?? feature.detail}</small>
          </div>
        ))}
      </div>
      <div className="memory-feature-detail" aria-live="polite">
        <strong>{selected ? selected.label : `${MEMORY_ARCHITECTURES.find((item) => item.id === architecture)?.label} yolu`}</strong>
        <p>{selected ? selected.detail : "Desteklenen bir özelliği seçerek programlama sorumluluğunu incele. Bu seçim ölçülmüş veya simüle edilmiş bir donanım sonucu üretmez."}</p>
      </div>
      <p className="tmem-boundary"><strong>TMEM sınırı:</strong> Tensor Memory, Blackwell Tensor Core akümülatör akışı için uzmanlaşmıştır; yazmaçların veya paylaşılan belleğin genel amaçlı yerine geçmez.</p>
    </section>
  );
}

function HierarchyLab() {
  const [selected, setSelected] = useState<(typeof hierarchyLayers)[number]["id"]>("shared");
  const current = hierarchyLayers.find((layer) => layer.id === selected)!;
  return (
    <section className="module-layout">
      <ModuleIntro eyebrow="MODÜL 01 · VERİ NEREDE?" title="Bellek hiyerarşisi" lead="GPU performansının büyük bölümü aritmetikten değil, veriyi doğru zamanda doğru yere taşımaktan gelir.">
        <Fact label="ANA FİKİR">Hızlı katmanlar küçük ve yereldir; büyük katmanlar uzak ve paylaşımlıdır. Kernel tasarımı, tekrar kullanılan veriyi daha yakına taşır.</Fact>
        <Fact label="YANLIŞ SEZGİ">“Shared memory her zaman hızlandırır” doğru değildir. Tekrar kullanım yoksa kopyalama ve bariyer maliyeti kazancı silebilir.</Fact>
        <div className="code-note"><span>Veri yolu</span><code>DRAM → L2 → L1/shared → register → ALU</code></div>
      </ModuleIntro>
      <div className="lab-surface hierarchy-lab">
        <div className="surface-heading">
          <div><span>ETKİLEŞİMLİ HARİTA</span><h2>Bir katman seç, maliyetini gör</h2></div>
          <div className="direction-key"><span>HIZ</span><i /><span>KAPASİTE</span></div>
        </div>
        <div className="hierarchy-stack">
          {hierarchyLayers.map((layer, index) => (
            <button
              key={layer.id}
              className={`memory-layer ${layer.color} ${selected === layer.id ? "selected" : ""}`}
              style={{ width: `${52 + index * 12}%` }}
              onClick={() => setSelected(layer.id)}
              aria-pressed={selected === layer.id}
            >
              <span className="layer-index">L{index}</span>
              <strong>{layer.name}</strong>
              <small>{layer.scope}</small>
              <i aria-hidden="true" />
            </button>
          ))}
        </div>
        <div className="selected-detail" aria-live="polite">
          <div className={`detail-index ${current.color}`}>{String(hierarchyLayers.findIndex((l) => l.id === current.id)).padStart(2, "0")}</div>
          <div><span>SEÇİLİ KATMAN</span><h3>{current.name}</h3><p>{current.note}</p></div>
          <dl>
            <div><dt>Konum</dt><dd>{current.place}</dd></div>
            <div><dt>Gecikme</dt><dd>{current.speed}</dd></div>
            <div><dt>Kapasite</dt><dd>{current.capacity}</dd></div>
          </dl>
        </div>
      </div>
    </section>
  );
}

const accessPatterns = {
  aligned: { label: "Ardışık", sub: "addr = lane × 4", address: (lane: number) => lane * 4 },
  offset: { label: "+4 byte ofset", sub: "addr = lane × 4 + 4", address: (lane: number) => lane * 4 + 4 },
  stride2: { label: "Stride 2", sub: "addr = lane × 8", address: (lane: number) => lane * 8 },
  stride8: { label: "Stride 8", sub: "addr = lane × 32", address: (lane: number) => lane * 32 },
} as const;

type AccessPattern = keyof typeof accessPatterns;

function CoalescingLab() {
  const [pattern, setPattern] = useState<AccessPattern>("aligned");
  const result = useMemo(() => {
    const addresses = Array.from({ length: 32 }, (_, lane) => accessPatterns[pattern].address(lane));
    const sectors = Array.from(new Set(addresses.map((address) => Math.floor(address / 32))));
    return { addresses, sectors, efficiency: Math.round((128 / (sectors.length * 32)) * 100) };
  }, [pattern]);
  const rating = result.efficiency === 100 ? "İdeal" : result.efficiency >= 50 ? "Kısmi" : "Dağınık";
  return (
    <section className="module-layout">
      <ModuleIntro eyebrow="MODÜL 02 · GENEL BELLEK" title="Birleşik erişim" lead="Bir warp'ın 32 iş parçacığı yakın adreslere eriştiğinde donanım bu istekleri az sayıda bellek işleminde birleştirir.">
        <Fact label="MODEL">Her iş parçacığı bir <code>float</code> (4 byte) okuyor. Compute capability 6.0+ için erişimler gereken 32-byte sektörler üzerinden gösteriliyor.</Fact>
        <Fact label="NEDEN ÖNEMLİ?">İstenen 128 byte aynı kalırken taşınan sektör sayısı büyüyebilir. Kullanılmayan byte'lar bant genişliğini tüketir.</Fact>
        <div className="formula"><span>Yararlılık</span><strong>istenen byte / taşınan byte</strong></div>
      </ModuleIntro>
      <div className="lab-surface coalescing-lab">
        <div className="surface-heading">
          <div><span>WARP ERİŞİM SİMÜLATÖRÜ</span><h2>32 thread, kaç bellek işlemi?</h2></div>
          <div className={`result-stamp ${result.efficiency === 100 ? "good" : result.efficiency >= 50 ? "mid" : "bad"}`}><strong>{result.efficiency}%</strong><span>{rating}</span></div>
        </div>
        <div className="segmented-control" role="group" aria-label="Erişim deseni">
          {(Object.keys(accessPatterns) as AccessPattern[]).map((key) => (
            <button key={key} className={pattern === key ? "active" : ""} onClick={() => setPattern(key)} aria-pressed={pattern === key}>
              <strong>{accessPatterns[key].label}</strong><small>{accessPatterns[key].sub}</small>
            </button>
          ))}
        </div>
        <div className="sim-label"><span>WARP · 32 İŞ PARÇACIĞI</span><span>Her kare 4-byte <code>float</code> erişimi</span></div>
        <div className="lane-grid">
          {result.addresses.map((address, lane) => <div key={lane} className="lane" title={`Thread ${lane}: byte ${address}`}><span>T{String(lane).padStart(2, "0")}</span><strong>{address}</strong></div>)}
        </div>
        <div className="transaction-map">
          <div className="transaction-summary" aria-live="polite"><span>BELLEK SEKTÖRLERİ</span><strong>{result.sectors.length} × 32 B</strong><small>{result.sectors.length * 32} byte taşındı · 128 byte istendi</small></div>
          <div className="sector-strip" aria-label={`${result.sectors.length} bellek sektörü kullanılıyor`}>
            {Array.from({ length: Math.min(32, Math.max(...result.sectors) + 1) }, (_, sector) => (
              <div key={sector} className={result.sectors.includes(sector) ? "used" : ""}><span>{sector}</span></div>
            ))}
          </div>
        </div>
        <p className="lab-caption"><b>Oku:</b> {pattern === "aligned" ? "Ardışık 32 float tam dört sektöre oturur. Bu, klasik coalesced erişimdir." : pattern === "offset" ? "Yalnızca 4 byte kayma, erişimi beş sektöre yayar. Komşu warp cache nedeniyle bir miktar yeniden kullanım görebilir; ilk erişim yine fazladan sektör ister." : pattern === "stride2" ? "Her ikinci float okununca her sektördeki byte'ların yarısı kullanılır. İşlem sayısı iki katına çıkar." : "Her thread farklı 32-byte sektöre düşer. 128 byte veri için 1 KB trafik oluşur; erişim düzeni bant genişliğini sekizde bire düşürür."}</p>
      </div>
    </section>
  );
}

type BankPattern = "1" | "2" | "4" | "8" | "16" | "32" | "broadcast";

function BankConflictLab() {
  const [pattern, setPattern] = useState<BankPattern>("1");
  const result = useMemo(() => {
    const addresses = Array.from({ length: 32 }, (_, lane) => pattern === "broadcast" ? 0 : lane * Number(pattern));
    const banks = addresses.map((word) => word % 32);
    const counts = Array.from({ length: 32 }, (_, bank) => banks.filter((value) => value === bank).length);
    const degree = pattern === "broadcast" ? 1 : Math.max(...counts);
    return { addresses, banks, counts, degree };
  }, [pattern]);
  return (
    <section className="module-layout">
      <ModuleIntro eyebrow="MODÜL 03 · SHARED MEMORY" title="Bank conflict" lead="Shared memory 32 bağımsız bank'a bölünür. Aynı warp farklı adreslerle aynı bank'a yığılırsa istekler seri hâle gelir.">
        <Fact label="EŞLEME KURALI">32-bit kelimeler için basitleştirilmiş eşleme: <code>bank = word_index mod 32</code>.</Fact>
        <Fact label="ÖZEL DURUM">Birden çok thread aynı adresi okuyorsa çatışma yerine broadcast yapılır. Aynı bank ama farklı adresler ise çatışmadır.</Fact>
        <div className="code-note"><span>Klasik çözüm</span><code>tile[32][32] → tile[32][33]</code></div>
      </ModuleIntro>
      <div className="lab-surface banks-lab">
        <div className="surface-heading">
          <div><span>BANK EŞLEME DENEYİ</span><h2>Stride değişince bank'lar nasıl dolar?</h2></div>
          <div className={`result-stamp ${result.degree === 1 ? "good" : result.degree <= 4 ? "mid" : "bad"}`}><strong>{result.degree}×</strong><span>{pattern === "broadcast" ? "Broadcast" : result.degree === 1 ? "Çatışmasız" : "Serileşme"}</span></div>
        </div>
        <div className="stride-control" role="group" aria-label="Shared memory erişim stride değeri" tabIndex={0}>
          {(["1", "2", "4", "8", "16", "32", "broadcast"] as BankPattern[]).map((value) => <button key={value} onClick={() => setPattern(value)} className={pattern === value ? "active" : ""} aria-pressed={pattern === value}>{value === "broadcast" ? "Aynı adres" : `Stride ${value}`}</button>)}
        </div>
        <div className="mapping-equation"><span>İŞ PARÇACIĞI <b>t</b></span><i>→</i><code>word[{pattern === "broadcast" ? "0" : `t × ${pattern}`}]</code><i>→</i><span>BANK <b>{pattern === "broadcast" ? "0" : `(t × ${pattern}) % 32`}</b></span></div>
        <div className="bank-grid" aria-label="32 shared memory bank doluluk haritası">
          {result.counts.map((count, bank) => (
            <div key={bank} className={count === 0 ? "empty" : count === 1 ? "single" : count <= 4 ? "warm" : "hot"}>
              <span>B{String(bank).padStart(2, "0")}</span>
              <strong>{count || "·"}</strong>
              {count > 0 && <small>{count === 1 ? `T${String(result.banks.indexOf(bank)).padStart(2, "0")}` : `${count} thread`}</small>}
            </div>
          ))}
        </div>
        <div className="bank-explanation" aria-live="polite">
          <div><span>AKTİF BANK</span><strong>{result.counts.filter(Boolean).length} / 32</strong></div>
          <p>{pattern === "broadcast" ? "Tüm thread'ler aynı kelimeyi okuyor: donanım değeri warp'a yayınlar, bank conflict oluşmaz." : result.degree === 1 ? "Her thread ayrı bir bank'a düşüyor. Warp isteği paralel olarak servis edilebilir." : `Her aktif bank ${result.degree} farklı adres isteği alıyor. Donanım erişimi yaklaşık ${result.degree} çatışmasız adıma böler.`}</p>
        </div>
      </div>
    </section>
  );
}

function Slider({ label, value, min, max, step, unit, onChange }: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (value: number) => void }) {
  const percent = ((value - min) / (max - min)) * 100;
  return (
    <div className="slider-row">
      <span><strong>{label}</strong><output>{value}{unit}</output></span>
      <input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} style={{ "--value": `${percent}%` } as React.CSSProperties} />
      <small><i>{min}{unit}</i><i>{max}{unit}</i></small>
    </div>
  );
}

function OccupancyLab() {
  const [threads, setThreads] = useState(256);
  const [registers, setRegisters] = useState(32);
  const [shared, setShared] = useState(16);
  const result = useMemo(() => {
    const warpsPerBlock = Math.ceil(threads / 32);
    const limits = {
      Threads: Math.floor(1536 / threads),
      Register: Math.floor(65536 / (threads * registers)),
      Shared: shared === 0 ? 24 : Math.floor(100 / shared),
      "Block sınırı": 24,
    };
    const activeBlocks = Math.max(0, Math.min(...Object.values(limits)));
    const activeWarps = Math.min(48, activeBlocks * warpsPerBlock);
    const occupancy = Math.round((activeWarps / 48) * 100);
    const minLimit = Math.min(...Object.values(limits));
    const bottlenecks = Object.entries(limits).filter(([, value]) => value === minLimit).map(([key]) => key);
    return { warpsPerBlock, limits, activeBlocks, activeWarps, occupancy, bottlenecks };
  }, [threads, registers, shared]);
  return (
    <section className="module-layout">
      <ModuleIntro eyebrow="MODÜL 04 · GECİKMEYİ SAKLAMAK" title="Occupancy" lead="Occupancy, bir SM'deki aktif warp sayısının donanımın desteklediği azami aktif warp sayısına oranıdır.">
        <Fact label="AMAÇ DEĞİL, ARAÇ">Daha çok hazır warp, bellek gecikmesini saklayabilir. Fakat daha yüksek occupancy tek başına daha yüksek performans garantisi değildir.</Fact>
        <Fact label="SINIRLAYICILAR">Block boyutu, thread başına register, block başına shared memory ve mimari block sınırı birlikte kaç block'un yerleşeceğini belirler.</Fact>
        <div className="model-note"><span>ÖĞRETİM MODELİ</span><p>1 SM · 1.536 thread · 48 warp · 65.536 register · 100 KB shared · 24 block. Tahsis yuvarlamaları hesaba katılmaz.</p></div>
      </ModuleIntro>
      <div className="lab-surface occupancy-lab">
        <div className="surface-heading">
          <div><span>KAYNAK HESAPLAYICI</span><h2>Kernel konfigürasyonunu değiştir</h2></div>
          <div className={`occupancy-ring ${result.occupancy >= 75 ? "good" : result.occupancy >= 40 ? "mid" : "bad"}`} style={{ "--occ": `${result.occupancy * 3.6}deg` } as React.CSSProperties}><div><strong>{result.occupancy}%</strong><span>DOLULUK</span></div></div>
        </div>
        <div className="occupancy-body">
          <div className="controls-panel">
            <Slider label="İş parçacığı / blok" value={threads} min={32} max={1024} step={32} unit="" onChange={setThreads} />
            <Slider label="Yazmaç / iş parçacığı" value={registers} min={8} max={128} step={8} unit="" onChange={setRegisters} />
            <Slider label="Paylaşılan bellek / blok" value={shared} min={0} max={100} step={4} unit=" KB" onChange={setShared} />
          </div>
          <div className="sm-visual">
            <div className="sm-label"><span>AKIŞ ÇOKLU İŞLEMCİSİ</span><strong>{result.activeBlocks} aktif block · {result.activeWarps} aktif warp</strong></div>
            <div className="block-slots">
              {Array.from({ length: 12 }, (_, index) => <div key={index} className={index < Math.min(result.activeBlocks, 12) ? "filled" : ""}><span>{index < result.activeBlocks ? `B${index}` : ""}</span></div>)}
            </div>
            {result.activeBlocks > 12 && <p className="more-blocks">+ {result.activeBlocks - 12} block daha</p>}
          </div>
        </div>
        <div className="limit-table">
          {Object.entries(result.limits).map(([name, limit]) => (
            <div key={name} className={result.bottlenecks.includes(name) ? "limiting" : ""}><span>{name}</span><strong>{limit} block</strong><i>{result.bottlenecks.includes(name) ? "SINIRLIYOR" : ""}</i></div>
          ))}
        </div>
        <p className="lab-caption"><b>Yorum:</b> Bu ayarda sınır, <strong>{result.bottlenecks.join(" + ")}</strong> kaynağı. {result.occupancy === 100 ? "Tüm teorik warp yuvaları dolu; şimdi gerçek performansı profiler ile doğrula." : result.occupancy === 0 ? "Bir block bile kaynak havuzuna sığmıyor; konfigürasyon geçersiz." : "Daha yüksek occupancy için sınırlayan kaynağı azaltabilirsin; fakat register taşması veya daha az veri tekrarı performansı tersine çevirebilir."}</p>
      </div>
    </section>
  );
}

export default function GpuMemoryEmbedded() {
  const [active, setActiveState] = useState<ModuleId>("hierarchy");
  const [visited, setVisited] = useState<Set<ModuleId>>(new Set(["hierarchy"]));
  const setActive = (id: ModuleId) => { setActiveState(id); setVisited((previous) => new Set(previous).add(id)); };
  return (
    <section className="gpu-memory-surface" aria-label="GPU bellek laboratuvarı">
      <Header active={active} setActive={setActive} visited={visited} />
      <div className="page-shell">
        <ArchitectureMemoryGate />
        {active === "hierarchy" && <HierarchyLab />}
        {active === "coalescing" && <CoalescingLab />}
        {active === "banks" && <BankConflictLab />}
        {active === "occupancy" && <OccupancyLab />}
        <aside className="resource-links" aria-label="GPU bellek kaynakları">
          <p>Simülasyonlar kavramsal öğrenme içindir; gerçek kernel için ölçüm yap.</p>
          <div><a href="https://docs.nvidia.com/cuda/cuda-programming-guide/02-basics/writing-cuda-kernels.html#memory-performance" target="_blank" rel="noreferrer">CUDA Programming Guide ↗</a><a href="https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/" target="_blank" rel="noreferrer">Best Practices ↗</a></div>
        </aside>
      </div>
    </section>
  );
}
