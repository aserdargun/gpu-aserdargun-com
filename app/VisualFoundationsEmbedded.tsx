"use client";

/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- Labelled overflow regions remain keyboard-scrollable on narrow screens. */

import { useEffect, useMemo, useRef, useState } from "react";

type Section = "compare" | "anatomy" | "lifecycle" | "memory" | "pitfalls" | "quiz" | "map" | "recall" | "glossary" | "cheat" | "code" | "anim";
type AnatomyPart = "sm" | "l2" | "hbm" | "host";

const sections: Array<{ id: Section; number: string; short: string }> = [
  { id: "compare", number: "01", short: "CPU vs GPU" },
  { id: "anatomy", number: "02", short: "GPU Anatomisi" },
  { id: "lifecycle", number: "03", short: "Kernel Yaşamı" },
  { id: "memory", number: "04", short: "Kalıcı Bilgi" },
  { id: "pitfalls", number: "05", short: "Sık Hatalar" },
  { id: "quiz", number: "06", short: "Bilgi Testi" },
  { id: "map", number: "07", short: "Kavram Haritası" },
  { id: "recall", number: "08", short: "Geri Getirme" },
  { id: "glossary", number: "09", short: "Sözlük" },
  { id: "cheat", number: "10", short: "Cheat Sheet" },
  { id: "code", number: "11", short: "Kod Örnekleri" },
  { id: "anim", number: "12", short: "Animasyon" },
];

const knowledgeCards: Array<{
  badge: string;
  type: "mnemonic" | "analogy" | "contrast";
  title: string;
  body: string;
  hook: string;
}> = [
  {
    badge: "MNEMONIC",
    type: "mnemonic",
    title: "Bellek piramidi: RSL-D-H",
    body: "RSL-D-H",
    hook: "Register · Shared · L2 · DRAM · Host — yukarı çıktıkça hızlanır, aşağı indikçe büyür. 'Hızlı küçük, yavaş büyük' kuralını kodda her sorgula.",
  },
  {
    badge: "ANALOJİ",
    type: "analogy",
    title: "Warp = 32 kişilik bir sınıf",
    body: "Bir warp, 32 öğrencinin aynı soruyu çözmesine benzer. Zamanlayıcı bir warp talimatını etkin şeritlere gönderir; etkin olmayan şeritler maskelenir. Farklı yollara ayrılma, dallanma sapmasıdır (divergence).",
    hook: "Sınıftaki herkes aynı sayfada olduğunda verim en yüksek; biri ileri biri geri gidince sınıf yavaşlar.",
  },
  {
    badge: "ANALOJİ",
    type: "analogy",
    title: "Koalesing = toplu taşıma",
    body: "Komşu iş parçacıkları yakın adreslere eriştiğinde donanım istekleri az sayıda bellek işleminde birleştirebilir. Dağınık erişim ise daha fazla sektör taşıyabilir.",
    hook: "Adres düzenini sektör görünümünde incele; erişim aralığı büyüdükçe taşınan ama kullanılmayan veri artabilir.",
  },
  {
    badge: "KARŞILAŞTIR",
    type: "contrast",
    title: "Throughput vs Latency",
    body: "CPU tekil işlerde düşük gecikmeye odaklanır. GPU çok sayıda işi paralel yürütür ve hazır warplarla beklemeleri saklayarak iş hacmini artırır. Felsefe: 'Bekleme değil, hattı doldurma'.",
    hook: "Restoranda garson (CPU) tek müşteriye hızlı servis; aşçı (GPU) tüm siparişleri birlikte pişirir.",
  },
  {
    badge: "KARŞILAŞTIR",
    type: "contrast",
    title: "Coalesced ≠ Cached",
    body: "Coalesced: thread'ler aynı sektöre düşer, daha az bellek işlemi olur. Cached: tekrar erişim L1/L2'de tutulur, DRAM'e gidilmez. İlki yazma düzeniniz, ikincisi çalışma kümenizle ilgili.",
    hook: "Coalescing doğru adresleri ister; cache hit ise doğru çalışma kümesi ister. İkisi farklı kapılar.",
  },
  {
    badge: "MNEMONIC",
    type: "mnemonic",
    title: "Doğruluk üçgeni: R-T-S",
    body: "Referans · Tolerans · Sanitizer",
    hook: "Bir kernel ancak referans karşılaştırması + rtol/atol bütçesi + sanitizer temizliği ile 'doğru' sayılır. Üçünden biri eksikse iddia zayıftır.",
  },
];

const pitfalls: Array<{ topic: string; title: string; wrong: string; right: string }> = [
  {
    topic: "Bellek erişimi",
    title: "'Strided erişim de olur' yanılgısı",
    wrong: "Stride büyüdükçe erişimler daha fazla sektöre yayılabilir; kullanılmayan baytlar iş yüküne ve hizalamaya göre artar.",
    right: "Veriyi okumadan önce 'hangi sektörlere düşüyorum?' diye sor. Erişim düzenini ölç; gerekiyorsa paylaşımlı bellekle yeniden paketle.",
  },
  {
    topic: "Kernel başlatma",
    title: "'Çok blok = hızlı' yanılgısı",
    wrong: "1M blok başlatmak SM'leri doldurur; artan bloklar kuyrukta bekler ve ek yük getirir.",
    right: "İş yükünü SM sayısı × occupancy hedefine böl. 'Yeterli ve verimli' blok, 'mümkün olduğunca çok blok'tan iyidir.",
  },
  {
    topic: "Profil çıkarma",
    title: "'Tek koşu yeterli' yanılgısı",
    wrong: "Tek bir çalıştırmadaki ortalama süre, GPU saatinin gürültüsünü ölçer; gerçek hız değil.",
    right: "Isınma + yüzdelikler (p50/p95) + kontrollü taban çizgisi. Profil oluşturucu kanıtı olmadan hız iddiası kurulmaz.",
  },
  {
    topic: "Doğruluk",
    title: "'allclose(default) yeterli' yanılgısı",
    wrong: "Varsayılan rtol=1e-05 atol=1e-08, FP16 veya büyük indirgemelerde anlamsız hale gelir.",
    right: "Şekle, veri tipine ve operatörün hata birikimine göre tolerans matrisi yaz; büyük indirgemelerde ayrıca aralık denetimi uygula.",
  },
];

type QuizQuestion = {
  q: string;
  options: string[];
  correct: number;
  explain: string;
};

const quiz: QuizQuestion[] = [
  {
    q: "Bir GPU neden çok sayıda paralel yürütme birimi barındırır?",
    options: [
      "Daha az enerji harcadığı için",
      "Paralel iş yükünde iş hacmini artırmak ve beklemeleri başka warplarla örtmek için",
      "Saat hızını artırmak için",
      "Daha az ısı ürettiği için",
    ],
    correct: 1,
    explain: "GPU, bazı warplar bellek beklerken diğer çalıştırılabilir warpları ilerleterek paralel iş hacmini yükseltir; ayrıntılar mimariye ve iş yüküne bağlıdır.",
  },
  {
    q: "32 thread'in aynı 128 byte'lık sektöre ardışık erişmesine ne denir?",
    options: ["Bank conflict", "Warp divergence", "Coalesced access", "Shared broadcast"],
    correct: 2,
    explain: "Coalesced erişimde donanım 32 thread'in isteğini az sayıda bellek işleminde birleştirir. Divergence aynı warp içinde farklı yol demektir; bank conflict shared memory'de olur.",
  },
  {
    q: "Bellek hiyerarşisinde en hızlı katman hangisidir?",
    options: ["L2 önbellek", "DRAM (global bellek)", "Register", "Paylaşımlı bellek"],
    correct: 2,
    explain: "Yazmaçlar SM üzerindeki iş parçacığına özel, en düşük gecikmeli depolama alanıdır. Paylaşımlı bellek de hızlıdır ancak bir blok içindeki iş parçacıkları arasında paylaşılır.",
  },
  {
    q: "Doğru sayılan bir kernel için aşağıdakilerden hangisi zorunludur?",
    options: [
      "Sadece test verisi üzerinde çalışması",
      "Referans karşılaştırması, rtol/atol bütçesi ve sanitizer temizliği",
      "Sadece küçük şekillerde çalışması",
      "Sadece FP32'de çalışması",
    ],
    correct: 1,
    explain: "Üçlü kabul kapısı: referans (PyTorch/eager), sayısal bütçe (rtol+atol) ve compute-sanitizer (memcheck, racecheck). Bir tanesi eksikse iddia zayıf kalır.",
  },
  {
    q: "Nsight ölçümünde 'roofline' grafiği neyi gösterir?",
    options: [
      "GPU'nun anlık sıcaklığını",
      "Bellek bant genişliği ve compute kapasitesinin oluşturduğu tavan çizgisi — kernel nereye düşüyor?",
      "Çekirdek sayısı grafiğini",
      "PCIe veri yolu kullanımını",
    ],
    correct: 1,
    explain: "Roofline: x ekseni AI (aritmetik yoğunluk), y ekseni performans. Bellek-tavanlı mı, compute-tavanlı mı diye karar vermeni sağlar. Bu olmadan optimizasyon kör dövüşüdür.",
  },
];

function CpuSvg() {
  return (
    <svg className="vf-compare-svg" viewBox="0 0 320 180" role="img" aria-label="CPU 4 büyük çekirdek">
      <rect x="0" y="0" width="320" height="180" fill="#e9e3d3" />
      <rect x="20" y="20" width="280" height="140" fill="#fbf8f1" stroke="#4f5a6b" strokeWidth="1.5" />
      <text x="160" y="14" className="sub" textAnchor="middle" fill="#4f5a6b">CPU · 4 büyük çekirdek</text>
      <g>
        <rect x="40" y="40" width="50" height="100" fill="#4f5a6b" />
        <text x="65" y="85" className="label" fill="white">ALU</text>
        <text x="65" y="100" className="label" fill="white" fontSize="7">+cache</text>
      </g>
      <g>
        <rect x="100" y="40" width="50" height="100" fill="#4f5a6b" />
        <text x="125" y="85" className="label" fill="white">ALU</text>
        <text x="125" y="100" className="label" fill="white" fontSize="7">+cache</text>
      </g>
      <g>
        <rect x="160" y="40" width="50" height="100" fill="#4f5a6b" />
        <text x="185" y="85" className="label" fill="white">ALU</text>
        <text x="185" y="100" className="label" fill="white" fontSize="7">+cache</text>
      </g>
      <g>
        <rect x="220" y="40" width="50" height="100" fill="#4f5a6b" />
        <text x="245" y="85" className="label" fill="white">ALU</text>
        <text x="245" y="100" className="label" fill="white" fontSize="7">+cache</text>
      </g>
    </svg>
  );
}

function GpuSvg() {
  return (
    <svg className="vf-compare-svg" viewBox="0 0 320 180" role="img" aria-label="GPU paralel yürütme kaynakları">
      <rect x="0" y="0" width="320" height="180" fill="#f9e0ea" />
      <rect x="10" y="20" width="300" height="140" fill="#fbf8f1" stroke="#d8467c" strokeWidth="1.5" />
      <text x="160" y="14" className="sub" textAnchor="middle" fill="#d8467c">GPU · paralel yürütme kaynakları (SM × şerit)</text>
      {Array.from({ length: 8 }).map((_, row) =>
        Array.from({ length: 16 }).map((_, col) => {
          const x = 22 + col * 18;
          const y = 30 + row * 16;
          return <rect key={`${row}-${col}`} x={x} y={y} width="14" height="12" fill="#d8467c" opacity={0.85} />;
        })
      )}
    </svg>
  );
}

function AnatomySvg({ active, onSelect }: { active: AnatomyPart; onSelect: (p: AnatomyPart) => void }) {
  return (
    <svg viewBox="0 0 540 360" className="w-full" style={{ width: "100%", height: "auto" }} role="img" aria-label="GPU anatomisi">
      <rect x="0" y="0" width="540" height="360" fill="#fbf8f1" />
      {/* HOST (CPU) */}
      <g className="cursor" onClick={() => onSelect("host")}>
        <rect x="20" y="120" width="100" height="120" fill="var(--slate-soft)" stroke="var(--slate)" strokeWidth="1.5" />
        <text x="70" y="170" className="label" fill="#1a1614">CPU</text>
        <text x="70" y="184" className="label" fill="#1a1614" fontSize="7">Ana sistem</text>
        <text x="70" y="252" className="small-label" fill="#1a1614">Host DRAM</text>
      </g>
      {/* PCIe bus */}
      <line x1="120" y1="180" x2="180" y2="180" stroke="var(--ink)" strokeWidth="1.2" strokeDasharray="4 3" />
      <text x="150" y="172" className="small-label" fill="#1a1614">PCIe</text>
      {/* GPU DIE */}
      <g>
        <rect x="180" y="40" width="340" height="280" fill="#ffffff" stroke="var(--ink)" strokeWidth="1.5" />
        <text x="350" y="32" className="die-label" textAnchor="middle" fill="var(--ink)">GPU DIE</text>
        {/* HBM around */}
        <g className="cursor" onClick={() => onSelect("hbm")}>
          <rect x="190" y="50" width="320" height="38" fill="var(--teal-soft)" stroke="var(--teal)" strokeWidth="1" />
          <text x="350" y="74" className="label" fill="#1a1614">HBM · yüksek bant genişliği, yüksek gecikme</text>
        </g>
        {/* L2 */}
        <g className="cursor" onClick={() => onSelect("l2")}>
          <rect x="190" y="100" width="320" height="28" fill="var(--violet-soft)" stroke="var(--violet)" strokeWidth="1" />
          <text x="350" y="119" className="label" fill="#1a1614">L2 önbellek · SM'ler arası paylaşımlı</text>
        </g>
        {/* SMs grid */}
        {Array.from({ length: 4 }).map((_, row) =>
          Array.from({ length: 8 }).map((_, col) => {
            const x = 200 + col * 38;
            const y = 145 + row * 40;
            const isActive = active === "sm";
            return (
              <g key={`sm-${row}-${col}`} className="cursor" onClick={() => onSelect("sm")}>
                <rect x={x} y={y} width="32" height="32" fill={isActive ? "var(--rose)" : "var(--rose-soft)"} stroke="var(--rose)" strokeWidth="1" />
                <text x={x + 16} y={y + 20} className="label" fill={isActive ? "#fff" : "#1a1614"} fontSize="7">SM</text>
              </g>
            );
          })
        )}
        <text x="350" y="316" className="small-label" fill="#1a1614">SM × 32 (Streaming Multiprocessor)</text>
      </g>
    </svg>
  );
}

function Header({ active, setActive, visited }: { active: Section; setActive: (s: Section) => void; visited: Set<Section> }) {
  return (
    <header className="vf-topbar">
      <button className="vf-brand" onClick={() => setActive("compare")} aria-label="Görsel & Kalıcı Öğrenme ana sayfa">
        <span className="vf-brand-mark">G/Ö</span>
        <span><strong>GÖRSEL & KALICI</strong><small>ÖĞRENME ATLASI</small></span>
      </button>
      <nav className="vf-module-nav" aria-label="Bölümler" tabIndex={0}>
        {sections.map((s) => (
          <button
            key={s.id}
            className={active === s.id ? "active" : ""}
            onClick={() => setActive(s.id)}
            aria-current={active === s.id ? "page" : undefined}
          >
            <span>{s.number}</span>{s.short}
          </button>
        ))}
      </nav>
      <div className="vf-course-meta">
        <span>{visited.size}/12 BÖLÜM</span>
        <div className="vf-progress-track" aria-label={`İlerleme: ${visited.size} / 12`}><i style={{ width: `${(visited.size / 12) * 100}%` }} /></div>
      </div>
    </header>
  );
}

function SectionHead({ label, title, note }: { label: string; title: React.ReactNode; note: string }) {
  return (
    <div className="vf-section-head">
      <div>
        <div className="label">{label}</div>
        <h2>{title}</h2>
      </div>
      <p className="note">{note}</p>
    </div>
  );
}

function CompareSection() {
  return (
    <section className="vf-section">
      <SectionHead
        label="BÖLÜM 01 · İLK BAKIŞ"
        title={<>CPU <em>ile</em> GPU’nun öncelikleri: <em>tekil gecikme</em> ve <em>paralel iş hacmi</em>.</>}
        note="CPU karmaşık tekil işleri düşük gecikmeyle ilerletmeye, GPU ise çok sayıda benzer işi paralel yürütmeye odaklanır. Gerçek denge iş yüküne bağlıdır."
      />
      <div className="vf-compare">
        <article className="vf-compare-card cpu">
          <div className="tag">● CPU · Latency-Optimizer</div>
          <h3>Az çekirdek, derin cache</h3>
          <p className="lede">Kontrol akışı ağır, dallanma tahmini ve sıralı iş yükleri için optimize. Tek bir iş parçacığını olabildiğince hızlı bitirmeye odaklanır.</p>
          <CpuSvg />
          <dl className="vf-compare-grid">
            <dt>YÜRÜTME</dt><dd>Az sayıda güçlü, karmaşık genel amaçlı çekirdek</dd>
            <dt>CACHE</dt><dd>L1/L2/L3 derin; tahmin motorları</dd>
            <dt>GÜÇ</dt><dd>Yüksek saat × düşük çekirdek</dd>
            <dt>PARADİGMA</dt><dd>Gecikmeyi düşür, tekil işi hızlandır</dd>
          </dl>
        </article>
        <article className="vf-compare-card gpu">
          <div className="tag">● GPU · Throughput-Optimizer</div>
          <h3>Çok sayıda paralel yürütme kaynağı</h3>
          <p className="lede">SM’ler içindeki şeritler warplar hâlinde çalışır. Bazı warplar beklerken zamanlayıcı başka hazır warpları ilerletebilir.</p>
          <GpuSvg />
          <dl className="vf-compare-grid">
            <dt>YÜRÜTME</dt><dd>Şeritler 32 iş parçacıklı warplarda gruplanır; kaynak sayısı mimariye bağlıdır</dd>
            <dt>CACHE</dt><dd>L1/shared programlanabilir; L2 ortak</dd>
            <dt>PARADİGMA</dt><dd>Gecikmeyi sakla, throughput'u artır</dd>
            <dt>EN İYİSİ</dt><dd>SIMD iş yükleri, matris, evrişim, dikkat</dd>
          </dl>
        </article>
      </div>
    </section>
  );
}

const anatomyParts: Record<AnatomyPart, { title: string; desc: string; meta: Array<{ k: string; v: string }> }> = {
  sm: {
    title: "SM · Streaming Multiprocessor",
    desc: "GPU'nun asıl iş birimi. Bir SM içinde onlarca lane, register dosyası, shared memory ve özel fonksiyon birimleri bulunur. Bir kernel, SM'ler arasında bloklara bölünür. SM ne kadar fazla warp saklayabilirse (occupancy) o kadar fazla gecikmeyi saklayabilir.",
    meta: [
      { k: "KONUM", v: "GPU die üzerinde" },
      { k: "PAYLAŞIM", v: "Register + shared + L1" },
      { k: "SAYI", v: "Ada göre 80–140 arası" },
    ],
  },
  l2: {
    title: "L2 önbellek",
    desc: "Tüm SM'lerin ortak önbelleği. Global ve local bellek trafiğini azaltır. Kernel doğrudan L2'yi tahsis etmez; erişim düzeni ve çalışma kümesinin boyutu hit oranını belirler.",
    meta: [
      { k: "KAPSAM", v: "Bütün SM'ler" },
      { k: "BOYUT", v: "MB mertebesi" },
      { k: "GECİKME", v: "DRAM'den düşük, register'dan yüksek" },
    ],
  },
  hbm: {
    title: "HBM · High Bandwidth Memory",
    desc: "Büyük tensörlerin evidir. Bant genişliği yüksektir (TB/s seviyesi), fakat tek erişimin gecikmesi büyüktür. Coalesced erişim ve yeterli sayıda aktif warp, gecikmeyi saklar.",
    meta: [
      { k: "KONUM", v: "GPU paketinin dışında" },
      { k: "BOYUT", v: "40–80 GB tipik" },
      { k: "GECİKME", v: "Yüzlerce cycle" },
    ],
  },
  host: {
    title: "CPU & Host belleği",
    desc: "Ayrık GPU'da PCIe gibi bir bağlantının arkasında. Sık sık host'a dönmek pahalı; toplu aktarım, pinned memory ve kopya-hesap örtüşmesi (overlap) bu sınırı yönetir.",
    meta: [
      { k: "BAĞLANTI", v: "PCIe / NVLink" },
      { k: "BOYUT", v: "Sistem belleği" },
      { k: "KULLANIM", v: "Veri yükleme, init, sonuç" },
    ],
  },
};

function AnatomySection() {
  const [active, setActive] = useState<AnatomyPart>("sm");
  return (
    <section className="vf-section">
      <SectionHead
        label="BÖLÜM 02 · İÇ YAPI"
        title={<>GPU'nun <em>içinde</em> neler var? Bir parçaya tıkla, ne işe yaradığını öğren.</>}
        note="Her parça farklı bir hız/kapasite dengesine sahip. Kernel tasarımı, sık erişilen veriyi en yakın katmana taşımaktır."
      />
      <div className="vf-anatomy">
        <div className="vf-anatomy-canvas">
          <AnatomySvg active={active} onSelect={setActive} />
        </div>
        <div className="vf-anatomy-side">
          {(Object.keys(anatomyParts) as AnatomyPart[]).map((key) => {
            const part = anatomyParts[key];
            return (
              <button key={key} className={`part ${active === key ? "active" : ""}`} onClick={() => setActive(key)}>
                <h4>{part.title}</h4>
                <p>{part.desc}</p>
                <div className="meta">{part.meta.map((m) => <span key={m.k}>{m.k}: {m.v}</span>)}</div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const lifecycleSteps = [
  {
    num: "01",
    title: "Host → Device",
    where: "CPU tarafı",
    time: "μs – ms",
    desc: "Veriyi host belleğinden GPU belleğine taşırsın. Toplu ve pinned bellek bu adımı hızlandırır. Kernel bundan önce başlayamaz.",
    glyph: (
      <svg viewBox="0 0 56 56" width="56" height="56" aria-hidden="true">
        <rect x="2" y="14" width="20" height="28" fill="var(--slate-soft)" stroke="var(--slate)" />
        <text x="12" y="32" fontSize="6" textAnchor="middle" fontWeight="800" fill="var(--ink)">CPU</text>
        <line x1="22" y1="28" x2="36" y2="28" stroke="var(--rose)" strokeWidth="2" strokeDasharray="3 2" />
        <polygon points="36,28 32,25 32,31" fill="var(--rose)" />
        <rect x="36" y="14" width="18" height="28" fill="var(--rose-soft)" stroke="var(--rose)" />
        <text x="45" y="32" fontSize="6" textAnchor="middle" fontWeight="800" fill="var(--ink)">GPU</text>
      </svg>
    ),
  },
  {
    num: "02",
    title: "Kernel başlat",
    where: "Driver · grid × block",
    time: "5–20 μs başlatma",
    desc: "CPU, grid ve blok boyutlarıyla kernel'i başlatır. Parametreler GPU'nun komut kuyruğuna yazılır. Bu adım pahalıdır; küçük işler için sık başlatma yapma.",
    glyph: (
      <svg viewBox="0 0 56 56" width="56" height="56" aria-hidden="true">
        <circle cx="28" cy="28" r="22" fill="var(--rose-soft)" stroke="var(--rose)" strokeWidth="1.5" />
        <path d="M 28 12 L 28 28 L 40 36" stroke="var(--rose)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <circle cx="28" cy="28" r="2" fill="var(--rose)" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Yürütme",
    where: "SM × warp × lane",
    time: "ns – μs",
    desc: "Bloklar SM’lere atanır. Zamanlayıcı, çalıştırılabilir warplardan talimat gönderir; bellek bekleyen bir warp yerine başka bir hazır warp ilerleyebilir. Gecikme saklama burada oluşur.",
    glyph: (
      <svg viewBox="0 0 56 56" width="56" height="56" aria-hidden="true">
        <rect x="6" y="10" width="44" height="36" fill="var(--rose-soft)" stroke="var(--rose)" />
        {Array.from({ length: 8 }).map((_, i) => (
          <rect key={i} x={10 + i * 5} y={20 + (i % 2) * 4} width="3" height={20 - (i % 2) * 4} fill="var(--rose)" />
        ))}
        <text x="28" y="54" fontSize="6" textAnchor="middle" fontWeight="800" fill="var(--ink)">SM</text>
      </svg>
    ),
  },
  {
    num: "04",
    title: "Sonuç & senkron",
    where: "Device → Host",
    time: "μs – ms",
    desc: "Yürütme biter, senkronizasyon veya async geri alım yapılır. Pinned bellek ve CUDA Graph burada tekrar tekrar başlatma maliyetini düşürür.",
    glyph: (
      <svg viewBox="0 0 56 56" width="56" height="56" aria-hidden="true">
        <rect x="2" y="14" width="20" height="28" fill="var(--rose-soft)" stroke="var(--rose)" />
        <text x="12" y="32" fontSize="6" textAnchor="middle" fontWeight="800" fill="var(--ink)">GPU</text>
        <line x1="22" y1="28" x2="36" y2="28" stroke="var(--teal)" strokeWidth="2" strokeDasharray="3 2" />
        <polygon points="36,28 32,25 32,31" fill="var(--teal)" />
        <rect x="36" y="14" width="18" height="28" fill="var(--teal-soft)" stroke="var(--teal)" />
        <text x="45" y="32" fontSize="6" textAnchor="middle" fontWeight="800" fill="var(--ink)">CPU</text>
      </svg>
    ),
  },
];

function LifecycleSection() {
  return (
    <section className="vf-section">
      <SectionHead
        label="BÖLÜM 03 · YAŞAM DÖNGÜSÜ"
        title={<>Bir kernel nasıl <em>yaşar</em>? Dört adım, dört maliyet.</>}
        note="Çoğu optimizasyon bu dört adımdan birinde yapılır. Adımları ezberle: yükleme, başlatma, yürütme, geri alım."
      />
      <div className="vf-lifecycle">
        {lifecycleSteps.map((step) => (
          <article key={step.num} className="vf-lifecycle-step">
            <div className="time">{step.time}</div>
            <div className="glyph">{step.glyph}</div>
            <div className="num">{step.num}</div>
            <div>
              <h4>{step.title}</h4>
              <div className="where">📍 {step.where}</div>
            </div>
            <p>{step.desc}</p>
          </article>
        ))}
      </div>
      <div className="vf-technique-strip">
        <div className="cell">
          <div className="num">TEKNİK 01</div>
          <h5>Çift Kodlama</h5>
          <p>Görsel + sözel birlikte öğren. Diyagrama bak, cümleyi oku, kendi cümlenle ifade et.</p>
        </div>
        <div className="cell">
          <div className="num">TEKNİK 02</div>
          <h5>Geri Getirme</h5>
          <p>Bölümü kapattıktan 1 gün sonra, sadece başlığa bakarak içeriği anlatmaya çalış.</p>
        </div>
        <div className="cell">
          <div className="num">TEKNİK 03</div>
          <h5>Aralıklı Tekrar</h5>
          <p>Bugün, yarın, 1 hafta, 2 hafta. Her seferinde bağlamı zorla, hatırlama süresi uzasın.</p>
        </div>
        <div className="cell">
          <div className="num">TEKNİK 04</div>
          <h5>Mnemonics & Analoji</h5>
          <p>Teknik terimleri günlük hayat benzetmesiyle eşleştir. 'RSL-D-H' gibi kısaltmalar kullan.</p>
        </div>
      </div>
    </section>
  );
}

function MemorySection() {
  return (
    <section className="vf-section">
      <SectionHead
        label="BÖLÜM 04 · KALICI BİLGİ"
        title={<>Her atlas için <em>kalıcı</em> bilgi kartları.</>}
        note="Ezberlemek yerine 'çağrışım kur'. Bu kartlar, terimleri 1 yıl sonra bile hatırlamanı sağlayacak çengeller içerir."
      />
      <div className="vf-knowledge">
        {knowledgeCards.map((card) => (
          <article key={card.title} className={`vf-knowledge-card ${card.type}`}>
            <span className="badge">{card.badge}</span>
            <h4>{card.title}</h4>
            {card.type === "mnemonic" && <div className="term">{card.body}</div>}
            {card.type === "analogy" && <div className="analogy-line">{card.body}</div>}
            {card.type === "contrast" && <div className="contrast-line">{card.body}</div>}
            <p className="memory-hook">{card.hook}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function PitfallsSection() {
  return (
    <section className="vf-section">
      <SectionHead
        label="BÖLÜM 05 · SIK YAPILAN HATALAR"
        title={<>Dört <em>yanlış</em> sezgi, dört doğru cevap.</>}
        note="Üniversite öğrencilerinin en sık düştüğü yanılgılar. Her biri, doğru modelin nasıl düşünüleceğini öğretir."
      />
      <div className="vf-pitfalls">
        {pitfalls.map((p) => (
          <article key={p.title} className="vf-pitfall">
            <span className="topic">{p.topic.toUpperCase()}</span>
            <h4>{p.title}</h4>
            <p className="wrong">{p.wrong}</p>
            <p className="right">{p.right}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function QuizSection({ onScore }: { onScore: (s: number) => void }) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  const question = quiz[step];
  const isCorrect = selected === question.correct;

  const handleCheck = () => {
    if (selected === null) return;
    setRevealed(true);
    if (isCorrect) setScore((s) => s + 1);
  };
  const handleNext = () => {
    if (step + 1 >= quiz.length) {
      const finalScore = score + (isCorrect ? 1 : 0);
      onScore(finalScore);
      setCompleted(true);
    } else {
      setStep(step + 1);
      setSelected(null);
      setRevealed(false);
    }
  };
  const handleReset = () => {
    setStep(0);
    setSelected(null);
    setRevealed(false);
    setScore(0);
    setCompleted(false);
  };

  if (completed) {
    const finalScore = score;
    return (
      <section className="vf-section">
        <SectionHead
          label="BÖLÜM 06 · BİLGİ TESTİ"
          title={<>Test tamamlandı — <em>sonuç:</em> {finalScore} / {quiz.length}.</>}
          note="Her doğru cevap, bir kavramı uzun süreli belleğe taşır. Hatalı sorulara geri dön, nedenini tekrar oku."
        />
        <div className="vf-quiz">
          <p className="vf-quiz-question">
            {finalScore === quiz.length
              ? "Mükemmel. Bu beş soru atlas boyunca tekrar kullanılan temel kavramları kapsıyor. Bir hafta sonra yeniden dene."
              : finalScore >= 3
              ? "İyi. Yanlış sorulara geri dön ve ilgili atlası yeniden aç. Tekrar etmeden kalıcı olmaz."
              : "Bunlar temel kavramlar. Atlasları sırayla aç ve her bölümün 'kalıcı bilgi' kartlarına geri dön."}
          </p>
          <div className="vf-quiz-actions">
            <div className="vf-quiz-score">{finalScore}<span className="total"> / {quiz.length}</span></div>
            <button className="vf-quiz-btn" onClick={handleReset}>Testi Yeniden Başlat</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="vf-section">
      <SectionHead
        label="BÖLÜM 06 · BİLGİ TESTİ"
        title={<>Sorgula: <em>öğrendin mi?</em></>}
        note="Beş soru, beş temel kavram. Her cevap bir bilgiyi uzun süreli belleğe taşır. Yanlış cevap da öğretir."
      />
      <div className="vf-quiz">
        <div className="quiz-head">
          <h3>Soru {step + 1} / {quiz.length}</h3>
          <div className="progress">SKOR · {score}</div>
        </div>
        <p className="vf-quiz-question">{question.q}</p>
        <div className="vf-quiz-options">
          {question.options.map((opt, i) => {
            let cls = "vf-quiz-option";
            if (selected === i) cls += " selected";
            if (revealed) {
              if (i === question.correct) cls += " correct";
              else if (selected === i) cls += " wrong";
            }
            return (
              <button
                key={i}
                className={cls}
                onClick={() => !revealed && setSelected(i)}
                disabled={revealed}
              >
                <span className="letter">{String.fromCharCode(65 + i)}</span>
                <span className="text">{opt}</span>
              </button>
            );
          })}
        </div>
        {revealed && <div className="vf-quiz-explain">{question.explain}</div>}
        <div className="vf-quiz-actions">
          <div className="vf-quiz-score">{score}<span className="total"> / {quiz.length}</span></div>
          {!revealed ? (
            <button className="vf-quiz-btn" onClick={handleCheck} disabled={selected === null}>Cevabı Kontrol Et</button>
          ) : (
            <button className="vf-quiz-btn" onClick={handleNext}>{step + 1 >= quiz.length ? "Testi Bitir" : "Sonraki Soru →"}</button>
          )}
        </div>
      </div>
    </section>
  );
}

const conceptMapNodes = [
  { id: "visual", idx: "01", title: "Görsel & Kalıcı", x: 50, y: 50, color: "var(--rose)" },
  { id: "toolchain", idx: "02", title: "Mühendislik Temelleri", x: 220, y: 50, color: "var(--gold)" },
  { id: "architecture", idx: "03", title: "Mimari → SIMT", x: 390, y: 50, color: "var(--lime)" },
  { id: "memory", idx: "04", title: "GPU Belleği", x: 560, y: 50, color: "var(--cyan)" },
  { id: "triton", idx: "05", title: "Triton Lab", x: 730, y: 50, color: "var(--violet)" },
  { id: "operators", idx: "06", title: "LLM Kernel Desenleri", x: 50, y: 250, color: "var(--coral)" },
  { id: "correctness", idx: "07", title: "Doğruluk & Güvenlik", x: 220, y: 250, color: "var(--green)" },
  { id: "profiling", idx: "08", title: "Nsight & Kıyaslama", x: 390, y: 250, color: "var(--blue)" },
  { id: "cutlass", idx: "09", title: "CUTLASS · CuTe", x: 560, y: 250, color: "var(--pink)" },
  { id: "inference", idx: "10", title: "Çıkarım Lab", x: 730, y: 250, color: "var(--lime)" },
  { id: "multigpu", idx: "11", title: "NCCL & Çoklu GPU", x: 130, y: 450, color: "var(--cyan)" },
  { id: "systems", idx: "12", title: "GPU Yazılım Yığını", x: 460, y: 450, color: "var(--orange)" },
];

const conceptMapEdges = [
  { from: "visual", to: "architecture", kind: "prereq" as const },
  { from: "toolchain", to: "architecture", kind: "prereq" as const },
  { from: "architecture", to: "memory", kind: "prereq" as const },
  { from: "architecture", to: "triton", kind: "prereq" as const },
  { from: "memory", to: "operators", kind: "prereq" as const },
  { from: "triton", to: "operators", kind: "prereq" as const },
  { from: "operators", to: "correctness", kind: "feeds" as const },
  { from: "correctness", to: "profiling", kind: "prereq" as const },
  { from: "profiling", to: "cutlass", kind: "feeds" as const },
  { from: "cutlass", to: "inference", kind: "prereq" as const },
  { from: "inference", to: "multigpu", kind: "prereq" as const },
  { from: "multigpu", to: "systems", kind: "feeds" as const },
];

const conceptMapDetails: Record<string, { title: string; desc: string; prereq: string[]; feeds: string[] }> = {
  visual: {
    title: "Görsel & Kalıcı Öğrenme",
    desc: "Tüm atlasları bağlayan meta-öğrenme katmanı. GPU 101, anatomisi, kalıcı bilgi kartları ve geri getirme pratiği.",
    prereq: [],
    feeds: ["architecture", "memory", "operators", "profiling"],
  },
  toolchain: {
    title: "Mühendislik Temelleri",
    desc: "C++, Linux, Git ve CMake ile kernel geliştirme ortamı. Tüm atlasların altyapısı.",
    prereq: [],
    feeds: ["architecture", "triton"],
  },
  architecture: {
    title: "Mimari → SIMT → CUDA",
    desc: "Izgara, blok, warp, şerit. Zihinsel modelin çekirdeği. Bellek ve operatör atlaslarına temel.",
    prereq: ["visual", "toolchain"],
    feeds: ["memory", "triton"],
  },
  memory: {
    title: "GPU Bellek Laboratuvarı",
    desc: "Birleşik erişim, banka çakışması, doluluk. Operatör performansının temel belirleyicisi.",
    prereq: ["architecture"],
    feeds: ["operators"],
  },
  triton: {
    title: "PyTorch + Triton Lab",
    desc: "torch.library, masked kernel, opcheck, torch.compile. Operatör yazmanın pratik yolu.",
    prereq: ["architecture"],
    feeds: ["operators"],
  },
  operators: {
    title: "LLM Kernel Desenleri",
    desc: "GEMM, indirgeme, softmax, RMSNorm ve dikkat gibi sık kullanılan operatör desenleri burada.",
    prereq: ["memory", "triton"],
    feeds: ["correctness", "cutlass"],
  },
  correctness: {
    title: "Doğruluk & Güvenlik",
    desc: "Referans, tolerans, sanitizer. 'Çalıştı' ile 'doğru' arasındaki farkı kapatır.",
    prereq: ["operators"],
    feeds: ["profiling"],
  },
  profiling: {
    title: "Nsight & Kıyaslama",
    desc: "Zaman çizelgesi, çatı çizgisi, yüzdelikler. Optimizasyonun kanıtı burada başlar.",
    prereq: ["correctness"],
    feeds: ["cutlass", "inference"],
  },
  cutlass: {
    title: "CUTLASS · CuTe · Tensor Core",
    desc: "Soyutlamadan silikona. GEMM'in tüm katmanlarını soyup yerleşim cebrini gör.",
    prereq: ["operators", "profiling"],
    feeds: ["inference"],
  },
  inference: {
    title: "Çıkarım Sistemleri",
    desc: "vLLM, CUDA Graphs, nicemleme. TTFT/ITL/throughput üçlüsü burada dengelenir.",
    prereq: ["cutlass", "profiling"],
    feeds: ["multigpu"],
  },
  multigpu: {
    title: "NCCL & Çoklu GPU",
    desc: "Kolektifler, paralellik stratejileri, RDMA. Dağıtım gerçeği.",
    prereq: ["inference"],
    feeds: ["systems"],
  },
  systems: {
    title: "GPU Yazılım Yığını",
    desc: "ROCm, HIP, MLIR, TensorRT. Taşınabilirlik ve ekosistem burada.",
    prereq: ["multigpu"],
    feeds: [],
  },
};

function MapSection() {
  const [active, setActive] = useState<string>("visual");
  const detail = conceptMapDetails[active];
  const nodeMap: Record<string, typeof conceptMapNodes[number]> = Object.fromEntries(conceptMapNodes.map((n) => [n.id, n]));
  return (
    <section className="vf-section">
      <SectionHead
        label="BÖLÜM 07 · BÜYÜK RESİM"
        title={<>12 atlası <em>tek haritada</em> gör: kim kimi besler, kim kime önkoşul.</>}
        note="Düz çizgili kenar = 'besler' (bu atlası bilmek şunu kolaylaştırır). Kesikli kenar = 'önkoşul' (şunu bitirmeden buraya girme)."
      />
      <div className="vf-map-legend">
        <span className="item"><span className="swatch" style={{ background: "var(--rose-soft)", borderColor: "var(--rose)" }} /> ATLAS DÜĞÜMÜ</span>
        <span className="item"><span className="swatch" style={{ background: "transparent", borderColor: "var(--teal)" }} /> BESLER (FEEDS)</span>
        <span className="item"><span className="swatch" style={{ background: "transparent", borderColor: "var(--rose)", borderStyle: "dashed" }} /> ÖNKOŞUL (PREREQ)</span>
      </div>
      <div className="vf-map-canvas">
        <svg viewBox="0 0 910 540" role="img" aria-label="Atlas kavram haritası">
          {conceptMapEdges.map((edge) => {
            const from = nodeMap[edge.from];
            const to = nodeMap[edge.to];
            if (!from || !to) return null;
            return (
              <line
                key={`${edge.from}-${edge.to}`}
                className={`vf-map-edge ${edge.kind}`}
                x1={from.x + 65}
                y1={from.y + 22}
                x2={to.x + 65}
                y2={to.y + 22}
              />
            );
          })}
          {conceptMapNodes.map((node) => (
            <g
              key={node.id}
              className="vf-map-node"
              onClick={() => setActive(node.id)}
              transform={`translate(${node.x}, ${node.y})`}
            >
              <rect
                x="0"
                y="0"
                width="130"
                height="44"
                rx="4"
                fill={node.color}
                stroke={active === node.id ? "#1a1614" : "transparent"}
                strokeWidth={active === node.id ? "2" : "0"}
              />
              <text className="idx" x="14" y="17">{node.idx}</text>
              <text className="title" x="65" y="29">{node.title}</text>
            </g>
          ))}
        </svg>
      </div>
      <div className="vf-map-detail">
        <div className="badge" style={{ background: nodeMap[active]?.color, color: "#fff" }}>{nodeMap[active]?.idx}</div>
        <div>
          <h4>{detail.title}</h4>
          <p>{detail.desc}</p>
          <div className="rel">
            {detail.prereq.length > 0 && <span>ÖNKOŞUL → {detail.prereq.map((p) => conceptMapDetails[p]?.title).join(" · ")}</span>}
            {detail.feeds.length > 0 && <span>BESLER → {detail.feeds.map((p) => conceptMapDetails[p]?.title).join(" · ")}</span>}
            {detail.prereq.length === 0 && detail.feeds.length === 0 && <span>BAĞIMSIZ GİRİŞ NOKTASI</span>}
          </div>
        </div>
      </div>
    </section>
  );
}

const recallCards = [
  { atlas: "Görsel & Kalıcı", idx: "01", prompt: "Bir warp'ı bir sınıfa benzet: öğretmen ne verir, öğrenciler ne yapar? Dallanma ne zaman olur?", answer: "Öğretmen (issue unit) tek bir komut verir; 32 öğrenci aynı anda aynı komutu çalıştırır. Farklı yola sapan = dallanma (divergence)." },
  { atlas: "Mühendislik Temelleri", idx: "02", prompt: "Modern C++'ta 'kaynak yönetimi' için hangi prensibi kullanıyorsun? Neden?", answer: "RAII: nesne yaşam süresi ile kaynak yaşam süresini eşleştir. Scope biterken destructor otomatik çalışır; sızıntı ve çift serbest bırakma yok." },
  { atlas: "Mimari → SIMT", idx: "03", prompt: "32 thread aynı komutu çalıştırırken bellekten ne olur? İki terim: coalescing ve divergence.", answer: "Bellek istekleri aynı sektöre düşüyorsa coalesced → az işlem. Aynı warp içinde farklı yol varsa divergence → seri yürütme." },
  { atlas: "GPU Bellek", idx: "04", prompt: "Bellek hiyerarşisini hızdan büyüklüğe sırala. En hızlı ve en yavaş katman?", answer: "Register (en hızlı) → Shared → L2 → DRAM (HBM) → Host. Her katman daha büyük ve daha yavaş." },
  { atlas: "Triton", idx: "05", prompt: "torch.library ne işe yarar? Opcheck neden kritik?", answer: "torch.library: PyTorch'a özel operatörü sözleşmeyle (schema, autograd) kaydeder. Opcheck: şekil/dtype/grad testleri, autograd'ı doğrular." },
  { atlas: "LLM Kernel Desenleri", idx: "06", prompt: "Softmax'i 'sayısal olarak kararlı' yapmak için hangi numarayı kullanırsın?", answer: "Maksimumu çıkar: x - max(x), sonra exp ve toplam. Büyük değerlerde exp taşmasını engeller. Çevrimiçi softmax ise bunu tek geçişte yapar." },
  { atlas: "Doğruluk", idx: "07", prompt: "Bir kernel'ı 'doğru' saymak için üç şart ne? (R-T-S üçgeni)", answer: "R: referans karşılaştırması. T: rtol + atol bütçesi. S: Compute Sanitizer (memcheck, racecheck) temiz." },
  { atlas: "Nsight & Kıyaslama", idx: "08", prompt: "Roofline grafiği ne anlatır? İki tavan (ceiling) hangileri?", answer: "AI (aritmetik yoğunluk) x-ekseninde, performans y-ekseninde. Bellek bant genişliği tavanı + compute kapasitesi tavanı. Kernel bu iki tavan arasında bir noktaya düşer." },
  { atlas: "CUTLASS · CuTe", idx: "09", prompt: "CUTLASS'ta 'tile' ne? Neden önemli?", answer: "Tile: bir CTA'nın bir seferde işlediği blok boyutu. Bellek yeniden kullanımı için kritik — büyük tile = daha fazla veri paylaşımda, küçük tile = daha az doluluk." },
  { atlas: "Çıkarım", idx: "10", prompt: "TTFT ve ITL ne ölçer? Hangisi daha kritik, iş yüküne göre nasıl değişir?", answer: "TTFT (Time To First Token): ilk token gelene kadar geçen süre. ITL (Inter-Token Latency): sonraki token'lar arası süre. Sohbet iş yükünde TTFT, toplu üretimde ITL daha kritik." },
  { atlas: "NCCL & Çoklu GPU", idx: "11", prompt: "AllReduce maliyeti neye bağlı? Halka kolektifinde neden 2(N-1)/N adım var?", answer: "Band genişliği ve latency. Halka: her link aynı anda tek parça taşır; N-1 reduce-scatter + N-1 all-gather = 2(N-1)/N. Küçük N'de link sayısı sınırlayıcı." },
  { atlas: "GPU Yazılım Yığını", idx: "12", prompt: "ROCm ve CUDA yığını arasındaki temel taşınabilirlik katmanı ne? HIP ne sağlar?", answer: "HIP: kaynak düzeyinde taşınabilirlik. Aynı kaynak kodu AMD ve NVIDIA'da derlenir. Sınırlar: çekirdek özellikleri ve mimari detaylar için el yazması gerekebilir." },
];

function RecallSection() {
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [reviewed, setReviewed] = useState<Set<number>>(new Set());

  const toggle = (i: number) => {
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
    setReviewed((prev) => new Set(prev).add(i));
  };

  const flipAll = () => {
    setFlipped((prev) => (prev.size === recallCards.length ? new Set() : new Set(recallCards.map((_, i) => i))));
  };
  const markAllReviewed = () => {
    setReviewed(new Set(recallCards.map((_, i) => i)));
  };
  const reset = () => {
    setFlipped(new Set());
    setReviewed(new Set());
  };

  const pct = Math.round((reviewed.size / recallCards.length) * 100);

  return (
    <section className="vf-section">
      <SectionHead
        label="BÖLÜM 08 · GERİ GETİRME"
        title={<>12 atlasın <em>tek cümlelik</em> özeti. Kartı çevir, hatırlamaya çalış.</>}
        note="Aktif geri getirme, yalnızca yeniden okumak yerine bilgiyi hatırlamayı denetler. Karta tıkla → cevabı gör → zihnindekiyle karşılaştır. Tüm kartları gözden geçirene kadar bölümü kapatma."
      />
      <div className="vf-card-grid">
        {recallCards.map((card, i) => {
          const isFlipped = flipped.has(i);
          return (
            <button
              key={i}
              className={`vf-card ${isFlipped ? "flipped" : ""}`}
              onClick={() => toggle(i)}
              aria-label={`${card.atlas} — kart ${i + 1}`}
            >
              <div className="vf-card-face vf-card-front">
                <div className="top">
                  <span className="label">{card.atlas.toUpperCase()}</span>
                  <span className="num">{card.idx}</span>
                </div>
                <div className="prompt">{card.prompt}</div>
                <div className="flip-hint">{isFlipped ? "CEVAP ↓" : "CEVAP İÇİN TIKLA →"}</div>
              </div>
              <div className="vf-card-face vf-card-back">
                <div className="top">
                  <span className="label">{card.atlas.toUpperCase()}</span>
                  <span className="num">{card.idx}</span>
                </div>
                <div className="answer-label">CEVAP · KISA ÖZET</div>
                <div className="answer">{card.answer}</div>
                <div className="flip-hint">SORUYA DÖN ↑</div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="vf-card-stats">
        <b>{reviewed.size}<small style={{ fontWeight: 600, opacity: 0.7, fontSize: "10px", marginLeft: "4px" }}> / {recallCards.length}</small></b>
        <div className="progress-track" aria-label={`Gözden geçirildi: ${reviewed.size} / ${recallCards.length}`}>
          <i style={{ width: `${pct}%` }} />
        </div>
        <small>{pct}% GÖZDEN GEÇİRİLDİ</small>
      </div>
      <div className="vf-card-actions">
        <button onClick={flipAll} className={flipped.size === recallCards.length ? "active" : ""}>
          {flipped.size === recallCards.length ? "TÜMÜNÜ ÇEVİR (KAPAT)" : "TÜMÜNÜ ÇEVİR"}
        </button>
        <button onClick={markAllReviewed} className={reviewed.size === recallCards.length ? "active" : ""}>
          {reviewed.size === recallCards.length ? "TÜMÜ İŞARETLENDİ" : "TÜMÜNÜ İŞARETLE"}
        </button>
        <button onClick={reset} className="secondary" style={{ borderColor: "var(--line)", color: "var(--muted)" }}>
          SIFIRLA
        </button>
      </div>
    </section>
  );
}

const glossaryTerms: Array<{ term: string; def: string; analogy: string; cat: string }> = [
  { term: "Kernel", def: "GPU'da binlerce thread tarafından paralel çalıştırılan fonksiyon. __global__ ile işaretlenir.", analogy: "Bir sahne yönetmeni (host) sahneye (GPU) tek bir senaryo (kernel) gönderir; yüzlerce oyuncu (thread) aynı senaryoyu canlandırır.", cat: "Architecture" },
  { term: "Thread", def: "Kernel'in bir örneğini çalıştıran en küçük iş parçacığı. Her thread'in kendi register'ı vardır.", analogy: "Sınıftaki tek bir öğrenci. Her biri kendi defterine (register) yazar.", cat: "Architecture" },
  { term: "Warp", def: "32 iş parçacığından oluşan SIMT yürütme grubudur. Zamanlayıcı, çalıştırılabilir warplardan talimat gönderir.", analogy: "Sınıftaki 32 kişilik sıra. Etkin öğrenciler aynı yönergeyi izler.", cat: "Architecture" },
  { term: "Block (CTA)", def: "Bir SM üzerinde birlikte çalışan thread grubu (max 1024). Shared memory'yi paylaşır.", analogy: "Bir sınıf (32 sıra = warp'lar, sınıf = block). Aynı tahtayı (shared memory) kullanırlar.", cat: "Architecture" },
  { term: "Grid", def: "Tüm block'ları içeren yapı. Bir kernel çağrısı = bir grid.", analogy: "Tüm okul. Her sınıf (block) kendi işini yapar; müdür (driver) sadece başlatır.", cat: "Architecture" },
  { term: "SM (Streaming Multiprocessor)", def: "Warpları zamanlayan; yürütme birimlerini, yazmaç dosyasını ve paylaşımlı belleği barındıran çok işlemcili GPU bloğudur.", analogy: "Bir atölye: zamanlayıcı, hazır iş gruplarını uygun tezgâhlara yönlendirir.", cat: "Architecture" },
  { term: "Register", def: "SM üzerindeki iş parçacığına özel, düşük gecikmeli ve kapasitesi sınırlı depolama alanıdır.", analogy: "Cebindeki not kâğıdı. Hızlıca bakarsın, ama az yer vardır.", cat: "Memory" },
  { term: "Shared Memory", def: "Bir block'un thread'lerinin ortak alanı. Bant genişliği yüksek, programlanabilir.", analogy: "Sınıf tahtası. Herkes yazıp silebilir; ortak kullanılır.", cat: "Memory" },
  { term: "L2 Cache", def: "Tüm SM'lerin paylaştığı önbellek. MB mertebesinde.", analogy: "Okul kütüphanesi. Herkes erişebilir; her sınıf ayrı kitap getirmez.", cat: "Memory" },
  { term: "HBM", def: "GPU DRAM. Yüksek bant genişliği, yüksek gecikme. Büyük tensörler burada yaşar.", analogy: "Şehir deposu. Büyük, uzak, ama toplu taşıma hızlı (otobüs = sektör).", cat: "Memory" },
  { term: "Coalesced Access", def: "32 thread aynı sektöre (128 B) düşünce donanım istekleri birleştirir.", analogy: "32 kişi aynı otobüse biniyor. 4 koltuk × 8 sıra = tek sefer.", cat: "Memory" },
  { term: "Bank Conflict", def: "Shared memory'de aynı bank'a birden fazla thread yazarsa erişim serileşir.", analogy: "32 yazar, 32 kalem olsa sorun yok. Ama 32 yazar 1 kaleme yazmaya kalksa sıra olur.", cat: "Memory" },
  { term: "Occupancy", def: "Bir SM'de aynı anda yaşayan warp sayısı / max warp sayısı oranı.", analogy: "Bir asansörün doluluk oranı. Çok yüksek = durur, çok düşük = israf.", cat: "Memory" },
  { term: "Divergence", def: "Aynı warp'ta farklı branch'lere düşen thread'ler. Yürütme seriye düşer.", analogy: "Sınıfta 32 öğrenciden 16'sı 'sayfa 5', 16'sı 'sayfa 7' istiyor. Öğretmen 5'i, sonra 7'yi anlatır.", cat: "Architecture" },
  { term: "GEMM", def: "General Matrix Multiply. Y = A × B. Modern GPU kernel'larının kalbi.", analogy: "İki Excel tablosunu çarpıyor. Hücre × sütun = yeni hücre.", cat: "Operators" },
  { term: "Softmax", def: "Sayıları 0-1 arası olasılığa çevirir. x → exp(x) / sum(exp(x)).", analogy: "Bir sınıftaki notları yüzdeye çevirip 'şans sıralaması' yapmak. Max çıkarma = hile yapmamak (taşmayı önler).", cat: "Operators" },
  { term: "RMSNorm", def: "Layer normalization'ın hafif versiyonu. Ortalama yerine RMS kullanır.", analogy: "Sınıfın boy ortalamasını almak yerine 'karesel ortalama' almak. Daha hızlı, daha hafif.", cat: "Operators" },
  { term: "Füzyon", def: "İki ardışık operasyonu tek kernel'da birleştirmek. Bellek trafiğini yarıya indirir.", analogy: "İki ayrı markete gitmek yerine birine tüm alışverişi vermek. Yol bir, sepet bir.", cat: "Operators" },
  { term: "rtol / atol", def: "allclose'daki iki tolerans: göreceli ve mutlak. FP16 için ~1e-2, FP32 için ~1e-5.", analogy: "Bir ölçüde 'tam doğru' yok. 'Yeterince yakın' bir bütçe belirlersin.", cat: "Correctness" },
  { term: "Sanitizer", def: "Bellek ve yarış hatalarını yakalayan araç. memcheck, racecheck.", analogy: "Yemek yaparken 'gıda güvenliği kontrolü'. Hataları müşteriye ulaşmadan yakalar.", cat: "Correctness" },
  { term: "Nsight Systems", def: "Zaman çizelgesi profili. Hangi kernel ne zaman çalışıyor, GPU-CPU arası bekleme.", analogy: "Bir günün saatlik planı. Hangi ders ne kadar sürüyor, teneffüste ne yapıyorsun.", cat: "Profiling" },
  { term: "Nsight Compute", def: "Tek bir kernel'in detaylı profili. Roofline, bellek analizi, occupancy.", analogy: "Tek bir sınavın analizi. Hangi soruda ne kadar süre harcadın, nerede zorlandın.", cat: "Profiling" },
  { term: "Roofline", def: "Performans tavan grafiği. Bellek ve compute sınırlarını gösterir.", analogy: "Bir arabanın tavan hızı. Gerçek hızını ölçüp tavana ne kadar yakın olduğuna bakarsın.", cat: "Profiling" },
  { term: "Tensor Core", def: "Desteklenen veri tipleri ve mimariye özgü döşeme şekilleri üzerinde matris çarpma-biriktirme işlemlerini hızlandıran özel yürütme birimidir.", analogy: "Genel amaçlı işlem yerine belirli matris işlemleri için tasarlanmış uzman bir hesap makinesi.", cat: "Hardware" },
  { term: "CUDA Graph", def: "Bir dizi kernel çağrısını kaydedip tekrar tekrar ucuza oynatma.", analogy: "Bir orkestra şefinin partisyonu kaydetmesi. Her çalış için baştan okumaya gerek yok.", cat: "Inference" },
  { term: "AllReduce", def: "Tüm GPU'lardaki tensörleri topla ve sonucu her birine dağıt.", analogy: "Sınıftaki notları topla, ortalamasını al, sonucu herkesle paylaş.", cat: "Multi-GPU" },
  { term: "NCCL", def: "NVIDIA Collective Communications Library. Çoklu GPU arası kolektifler için.", analogy: "Postane. Her şehir (GPU) paketi alır, birleştirir, geri yollar.", cat: "Multi-GPU" },
  { term: "TTFT", def: "Time To First Token. Model ilk token'ı üretmesi için geçen süre.", analogy: "Restorana oturduktan sonra ilk yemeğin gelme süresi. Çorba = ilk token.", cat: "Inference" },
  { term: "ITL", def: "Inter-Token Latency. Sonraki token'lar arası süre.", analogy: "Çorbadan sonra ana yemek, tatlı, kahve arasındaki süre. Akıcı olmalı.", cat: "Inference" },
  { term: "Triton", def: "Python benzeri GPU kernel dili. PyTorch ile doğal entegrasyon.", analogy: "Fransızca yerine İspanyolca öğrenmek. CUDA'ya benzer, ama Python'a daha yakın.", cat: "Tools" },
];

function GlossarySection() {
  const [filter, setFilter] = useState<string>("Tümü");
  const cats = useMemo(() => ["Tümü", ...Array.from(new Set(glossaryTerms.map((t) => t.cat)))], []);
  const filtered = filter === "Tümü" ? glossaryTerms : glossaryTerms.filter((t) => t.cat === filter);
  return (
    <section className="vf-section">
      <SectionHead
        label="BÖLÜM 09 · SÖZLÜK"
        title={<>30 <em>terim</em>, 30 günlük hayat analojisi. Tıkla, hatırla.</>}
        note="Her atlasın içinde geçen teknik terimler burada toplandı. Analoji kısmı terimi günlük hayata taşır — 'neden?' sorusunu cevaplar."
      />
      <div className="vf-glossary-filter" role="group" aria-label="Kategori filtresi">
        {cats.map((cat) => (
          <button key={cat} className={filter === cat ? "active" : ""} onClick={() => setFilter(cat)} aria-pressed={filter === cat}>
            {cat.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="vf-glossary-grid">
        {filtered.map((t) => (
          <article key={t.term} className="vf-glossary-term">
            <strong className="term">{t.term}</strong>
            <p className="def">{t.def}</p>
            <p className="analogy">💡 {t.analogy}</p>
            <span className="cat">{t.cat.toUpperCase()}</span>
          </article>
        ))}
      </div>
      <div className="vf-glossary-stats">
        <span>GÖSTERİLEN · <b>{filtered.length}</b> / {glossaryTerms.length} TERİM</span>
        <span>KATEGORİLER · <b>{cats.length - 1}</b></span>
      </div>
    </section>
  );
}

const cheatSheets: Array<{ idx: string; name: string; atlas: string; points: string[]; tag: string }> = [
  {
    idx: "01", name: "Görsel & Kalıcı", atlas: "Görsel & Kalıcı Öğrenme",
    points: [
      "GPU, çok sayıda yürütme birimi ve hazır warplarla beklemeleri örterek paralel iş hacmini artırır.",
      "Bellek: Register → Shared → L2 → DRAM (HBM) → Host. Hız azalır, kapasite artar.",
      "Birleşik erişim, komşu iş parçacıklarının isteklerini az sayıda bellek işleminde toplar; sonucu erişim düzeni ve hizalamayla ölç.",
      "Bir kernel doğru sayılır: referans + rtol/atol + sanitizer (R-T-S üçgeni).",
      "Roofline: bellek mi compute mu tavanlı? Önce sor, sonra optimize et.",
    ],
    tag: "META",
  },
  {
    idx: "02", name: "Mühendislik Temelleri", atlas: "Mühendislik Temelleri",
    points: [
      "Modern C++ (C++17/20/23) + hedef tabanlı CMake ile derle.",
      "Git: küçük commit + anlamlı mesaj + rebase ile temiz history.",
      "RAII: scope bitince destructor. Sızıntı ve çift free'yi kökünden çözer.",
      "Test: pytest, smoke, integration. Coverage yüzdesi değil, kritik yol sayısı.",
      "CMake target-based: add_library/ add_executable değil, target_link_libraries kullan.",
    ],
    tag: "TOOLCHAIN",
  },
  {
    idx: "03", name: "Mimari → SIMT", atlas: "Mimari → SIMT → CUDA",
    points: [
      "Grid → Block → Warp → Lane. 32 lane = 1 warp.",
      "Warp hizalı blok boyutları sık kullanılan bir başlangıçtır; üst sınırı ve kaynak baskısını hedef aygıtta sorgula.",
      "Bir block = bir SM. SM, block'u parçalara ayırmaz; aynı anda birden fazla block tutabilir.",
      "Shared memory: block içi, programlanabilir. Hızlı ama sınırlı.",
      "Divergence: aynı warp farklı yol = seri yürütme. Veriyi branch öncesi ayır.",
    ],
    tag: "CUDA",
  },
  {
    idx: "04", name: "GPU Bellek", atlas: "GPU Bellek Laboratuvarı",
    points: [
      "Bellek hiyerarşisi: Register > Shared > L2 > HBM > Host.",
      "Coalesced erişimde 128 B istek 4 sektöre düşer (32 B × 4).",
      "Geniş stride daha fazla sektör taşıyabilir; erişim verimliliğini ve hizalamayı ölç.",
      "Banka çakışması erişim düzenine ve bank genişliğine bağlıdır; transpoz döşemelerinde uygun padding bir çözüm olabilir.",
      "Occupancy = aktif warp / max warp. Yüksek olması gerekmez; latency saklamaya yeterli.",
    ],
    tag: "MEMORY",
  },
  {
    idx: "05", name: "Triton", atlas: "PyTorch + Triton Kernel Lab",
    points: [
      "torch.library ile op'u kaydet. schema, forward, backward ayrı yaz.",
      "Triton: @triton.jit, program_id(axis) ile blok indeksi.",
      "Mask: boyut tile'ın katı değilse sınır dışı erişimi engelle.",
      "Opcheck: shape/dtype/grad testleri. Autograd'ı doğrular.",
      "torch.compile: pattern-match ile otomatik fusion. Önce eager, sonra compile.",
    ],
    tag: "PYTORCH",
  },
  {
    idx: "06", name: "LLM Kernel Desenleri", atlas: "LLM Kernel Desenleri",
    points: [
      "GEMM: M×K × K×N = M×N. Tensor Core talimat şekilleri veri tipine ve GPU mimarisine bağlıdır.",
      "Softmax: x - max(x) ile taşmayı önle. Online softmax = tek geçiş.",
      "RMSNorm: ortalama yerine RMS. LayerNorm'un hafif versiyonu.",
      "FlashAttention: dikkat için füzyon. Bellek O(N) yerine O(N²) değil.",
      "KV-cache: dikkat için önceden hesaplanmış anahtar/değer. Bellek bütçesi planla.",
    ],
    tag: "OPERATORS",
  },
  {
    idx: "07", name: "Doğruluk", atlas: "Kernel Doğruluğu ve Güvenliği",
    points: [
      "R-T-S üçgeni: Reference, Tolerance, Sanitizer.",
      "rtol/atol bütçesini veri tipi, şekil, değer aralığı ve indirgeme derinliğine göre belirle.",
      "Edge case matrisi: boş, tek eleman, NaN/Inf, büyük/düşük batch.",
      "Compute Sanitizer: memcheck (sızıntı), racecheck (veri yarışı).",
      "Bitwise deterministic değilse seed'leri sabitle. Bf16'da atomik toplam sırası önemli.",
    ],
    tag: "CORRECTNESS",
  },
  {
    idx: "08", name: "Nsight & Kıyaslama", atlas: "Nsight ve Kıyaslama Rehberi",
    points: [
      "Isınmayı kararlı duruma ulaşana kadar sürdür ve durdurma ölçütünü raporla.",
      "Medyanı, kuyruk yüzdeliklerini ve dağılımı birlikte raporla.",
      "Nsight Systems: önce zaman çizelgesi. Hangi kernel ne kadar sürüyor?",
      "Nsight Compute: tek kernel. Roofline + bottleneck görselleştirmesi.",
      "Baseline: aynı şekil/dtype, aynı donanım, aynı sürücü. Aksi halde iddia zayıf.",
    ],
    tag: "PROFILING",
  },
  {
    idx: "09", name: "CUTLASS · CuTe", atlas: "CUTLASS · CuTe · Tensor Core · PTX",
    points: [
      "CUTLASS: döşeme politikası seç. TileShape, ClusterShape, PipelineStage.",
      "CuTe: yerleşim (layout) cebiri. make_layout, local_partition.",
      "Tensor Core: 16×8×16 (mma.m16n8k16) FP16, BF16, TF32 seçenekleri.",
      "PTX: mma.sync komutu. SASS: SASS'ı kontrol et, sürücü beklenmedik şey yapabilir.",
      "Füzyon ara bellek trafiğini azaltabilir; kayıt baskısı ve yeniden hesaplama maliyetini ölç.",
    ],
    tag: "DEEP",
  },
  {
    idx: "10", name: "Çıkarım", atlas: "Çıkarım Sistemleri Laboratuvarı",
    points: [
      "vLLM PagedAttention, KV önbelleğinin bloklu yönetimiyle parçalanmayı azaltmayı hedefler.",
      "Sürekli toplu işleme, istekleri dinamik planlar; kazancı gerçek trafik ve taban çizgisiyle ölç.",
      "CUDA Graph, uygun sabit akışlarda başlatma ek yükünü azaltabilir; hızlanma iş yüküne bağlıdır.",
      "Nicemleme bellek ve veri hareketini azaltabilir; hız ve kalite donanım ile kernel desteğine bağlıdır.",
      "TTFT, ITL ve iş hacmini aynı deney tanımıyla birlikte raporla; her biri farklı darboğazları gösterebilir.",
    ],
    tag: "INFERENCE",
  },
  {
    idx: "11", name: "NCCL & Çoklu GPU", atlas: "NCCL ve Çoklu GPU Sistemleri",
    points: [
      "AllReduce maliyeti = 2(N-1)/N. 8 GPU ≈ 1.75 adım, 64 GPU ≈ 1.97 adım.",
      "NVLink > PCIe. Mümkünse NVLink/Switch üzerinden haberleş.",
      "DP (data parallel): gradyanları topla. TP (tensor): büyük matrisleri böl.",
      "PP (pipeline): katmanları dağıt. EP (expert): mixture of experts için.",
      "RDMA: GPUDirect ile CPU'ya uğramadan GPU-to-GPU. NVSwitch'le en iyisi.",
    ],
    tag: "MULTI-GPU",
  },
  {
    idx: "12", name: "GPU Yazılım Yığını", atlas: "GPU Yazılım Yığını",
    points: [
      "ROCm: AMD GPU yığını. CUDA'ya API seviyesinde benzer.",
      "HIP: kaynak taşınabilirliği. Aynı kod, iki platformda derlenir.",
      "MLIR: çok seviyeli IR. Triton, IREE, JAX hepsi MLIR kullanır.",
      "TensorRT: NVIDIA inference motoru. Tactic seçimi + kalibrasyon.",
      "HIP kaynak taşınabilirliği desteklenen API kümesine bağlıdır; mimariye özgü warp ve eşzamansız kopya yollarını ayrıca doğrula.",
    ],
    tag: "STACK",
  },
];

function CheatSection() {
  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };
  return (
    <section className="vf-section">
      <SectionHead
        label="BÖLÜM 10 · CHEAT SHEETS"
        title={<>12 atlasın <em>tek sayfalık</em> özeti. Yazdır, masanın başında kalsın.</>}
        note="Her atlas için 5 maddelik mini-cheat-sheet. Yazdırma dostu — bu bölümü PDF olarak dışa aktarabilir veya Ctrl+P ile basabilirsin."
      />
      <div className="vf-print-strip">
        <button onClick={handlePrint}>🖨️ YAZDIR / PDF OLARAK KAYDET</button>
        <button disabled style={{ opacity: 0.5 }}>📋 PANO (yakında)</button>
      </div>
      <div className="vf-cheat-grid">
        {cheatSheets.map((sheet) => (
          <article key={sheet.idx} className="vf-cheat-card">
            <div className="vf-cheat-card-head">
              <div className="left">
                <span className="atlas">{sheet.atlas.toUpperCase()}</span>
                <span className="name">{sheet.name}</span>
              </div>
              <span className="num">{sheet.idx}</span>
            </div>
            <span className="tag">{sheet.tag}</span>
            <ul>
              {sheet.points.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

const codePatterns = [
  {
    title: "Coalesced Global Memory Access (float4 vectorized)",
    tag: "BELLEK",
    code: [
      { type: "kw", text: "__global__ " },
      { type: "ty", text: "void " },
      { type: "fn", text: "vecAdd" },
      { type: "st", text: "(" },
      { type: "ty", text: "float4" },
      { type: "st", text: "* " },
      { type: "nm", text: "A" },
      { type: "st", text: ", " },
      { type: "ty", text: "float4" },
      { type: "st", text: "* " },
      { type: "nm", text: "B" },
      { type: "st", text: ", " },
      { type: "ty", text: "float4" },
      { type: "st", text: "* " },
      { type: "nm", text: "C" },
      { type: "st", text: ", " },
      { type: "ty", text: "int " },
      { type: "nm", text: "N" },
      { type: "st", text: ") {" },
    ],
    annotations: [
      "float4 (16 byte) oku: 32 thread × 16 B = 512 B = 4 sektör. Tam coalesced.",
      "Erişim aralığı veya rastgele indeksleme sektör kullanımını düşürebilir; gerçek verimliliği profiler ile ölç.",
    ],
  },
  {
    title: "Shared Memory Tiling (matris transpoz)",
    tag: "PAYLAŞIMLI",
    code: [
      { type: "kw", text: "__shared__ " },
      { type: "ty", text: "float " },
      { type: "nm", text: "tile" },
      { type: "st", text: "[" },
      { type: "nm", text: "32" },
      { type: "st", text: "][" },
      { type: "nm", text: "33" },
      { type: "st", text: "];" },
      { type: "cm", text: "  // 33 = padding, bank conflict'i önler" },
    ],
    annotations: [
      "Bu transpoz örneğinde 32 yerine 33 sütunlu padding, aynı sütuna erişen iş parçacıklarının bank eşlemesini dağıtır; sonuç veri tipi ve bank düzenine bağlıdır.",
      "__syncthreads() her yazmadan sonra. Tüm thread'ler paylaşıma yazmayı bitirmeden okumaya geçmesin.",
    ],
  },
  {
    title: "Warp-level Reduction (sum)",
    tag: "REDUCTION",
    code: [
      { type: "ty", text: "int " },
      { type: "nm", text: "val" },
      { type: "st", text: " = " },
      { type: "fn", text: "__shfl_xor_sync" },
      { type: "st", text: "(" },
      { type: "nm", text: "0xffffffff" },
      { type: "st", text: ", " },
      { type: "nm", text: "val" },
      { type: "st", text: ", " },
      { type: "nm", text: "16" },
      { type: "st", text: ");" },
    ],
    annotations: [
      "__shfl_xor_sync: lane'ler arası kayıt aktarımı. Shared memory'ye yazmadan toplama.",
      "Stride 16, 8, 4, 2, 1 ile 5 adım = 32 değerin toplamı. Shared memory'ye gerek yok.",
    ],
  },
  {
    title: "Masked Boundary (Triton)",
    tag: "TRITON",
    code: [
      { type: "kw", text: "@triton.jit" },
      { type: "st", text: "\n" },
      { type: "kw", text: "def " },
      { type: "fn", text: "add_kernel" },
      { type: "st", text: "(" },
      { type: "nm", text: "x_ptr" },
      { type: "st", text: ", " },
      { type: "nm", text: "y_ptr" },
      { type: "st", text: ", " },
      { type: "nm", text: "n" },
      { type: "st", text: ", " },
      { type: "nm", text: "BLOCK" },
      { type: "st", text: ": " },
      { type: "ty", text: "tl.constexpr" },
      { type: "st", text: "):" },
    ],
    annotations: [
      "pid = tl.program_id(0): blok indeksi. Hangi dilimi işlediğini söyler.",
      "offsets = pid*BLOCK + tl.arange(0, BLOCK): bu dilimin indeksleri.",
      "mask = offsets < n: son blok sınırı aşabilir. Maskesiz okuma = undefined behavior.",
    ],
  },
];

function CodeSection() {
  return (
    <section className="vf-section">
      <SectionHead
        label="BÖLÜM 11 · KOD ÖRNEKLERİ"
        title={<>4 <em>kalıp</em>, 4 kritik performans numarası.</>}
        note="Bu dört kalıp, atlas boyunca tekrar kullanılan temel yapı taşlarını gösterir. Her kalıbın yanında 'neden bu şekilde?' açıklaması var."
      />
      <div className="vf-code-grid">
        {codePatterns.map((p, i) => (
          <article key={p.title} className="vf-code-pattern">
            <div className="vf-code-pattern-head">
              <h4>{p.title}</h4>
              <span className="tag">{p.tag}</span>
            </div>
            <div className="vf-code-pattern-body">
              <pre className="vf-code-block" tabIndex={0} aria-label={`${p.title} kod örneği`}>
                {p.code.map((tok, j) => (
                  <span key={j} className={tok.type === "st" ? "" : tok.type}>
                    {j === 0 ? <span className="ln">{i + 1}</span> : null}
                    {tok.text}
                  </span>
                ))}
              </pre>
              <div className="vf-code-annotations">
                {p.annotations.map((a, j) => (
                  <div key={j} className="item">
                    <span className="num">{String(j + 1).padStart(2, "0")}</span>
                    <span className="text">{a}</span>
                  </div>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AnimSection() {
  const totalCycles = 32;
  const [cycle, setCycle] = useState(0);
  const [playing, setPlaying] = useState(false);
  const reqRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!playing) return;
    const step = (time: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      const delta = time - lastTimeRef.current;
      if (delta > 200) {
        setCycle((c) => (c + 1) % totalCycles);
        lastTimeRef.current = time;
      }
      reqRef.current = requestAnimationFrame(step);
    };
    reqRef.current = requestAnimationFrame(step);
    return () => {
      if (reqRef.current !== null) cancelAnimationFrame(reqRef.current);
      lastTimeRef.current = 0;
    };
  }, [playing]);

  const warpState = (warpId: number) => {
    const phase = (cycle + warpId * 4) % totalCycles;
    if (phase < 8) return "issue";
    if (phase < 16) return "execute";
    if (phase < 24) return "memory";
    return "stall";
  };

  const stateColor = (state: string) => {
    if (state === "issue") return "var(--lime)";
    if (state === "execute") return "var(--rose)";
    if (state === "memory") return "var(--violet)";
    return "var(--muted)";
  };

  const stateLabel: Record<string, string> = {
    issue: "ISSUE", execute: "EXEC", memory: "MEM", stall: "STALL",
  };

  const currentStep = cycle < 8
    ? "ISSUE: Zamanlayıcı, çalıştırılabilir bir warptan talimat seçip uygun yürütme birimine gönderir. Gönderim kapasitesi mimariye bağlıdır."
    : cycle < 16
    ? "EXECUTE: ALU veya Tensor Core, 32 lane üzerinde komutu çalıştırır. Tek cycle'da biter."
    : cycle < 24
    ? "MEMORY: Global veya shared bellekten veri beklenir. Yüzlerce cycle sürebilir. Bu sırada scheduler başka warp'lara geçer."
    : "STALL: Bellek bağımlılığı veya senkronizasyon nedeniyle warp durur. SM'in occupancy'si yeterliyse diğer warp'lar ilerler.";

  return (
    <section className="vf-section">
      <SectionHead
        label="BÖLÜM 12 · ANİMASYON"
        title={<>Bir SM'in içinde <em>4 warp</em> 32 cycle boyunca ne yapar?</>}
        note="Her warp dört durumdan geçer: ISSUE → EXECUTE → MEMORY → STALL. Scheduler, MEMORY/STALL'daki warp'ları bekletir, hazır olana EXECUTE verir. Bu döngü 'gecikmeyi saklama' denen sihirdir."
      />
      <div className="vf-anim-stage">
        <div className="vf-anim-canvas">
          <svg viewBox="0 0 800 320" role="img" aria-label="Kernel çalıştırma animasyonu">
            <rect x="0" y="0" width="800" height="320" fill="#fbf8f1" />
            <text x="400" y="22" className="die-label" textAnchor="middle" fill="var(--ink)">SM · 4 WARP · 32 CYCLE</text>
            {Array.from({ length: 4 }).map((_, warpId) => (
              <g key={warpId} transform={`translate(40, ${60 + warpId * 60})`}>
                <text x="-10" y="14" className="label" textAnchor="end" fill="var(--ink)">W{warpId}</text>
                {Array.from({ length: totalCycles }).map((_, c) => {
                  const phase = (c + warpId * 4) % totalCycles;
                  let state = "stall";
                  if (phase < 8) state = "issue";
                  else if (phase < 16) state = "execute";
                  else if (phase < 24) state = "memory";
                  const isPast = c <= cycle;
                  return (
                    <rect
                      key={c}
                      x={c * 18}
                      y="0"
                      width="16"
                      height="34"
                      fill={stateColor(state)}
                      opacity={isPast ? 1 : 0.15}
                      stroke={c === cycle ? "var(--ink)" : "transparent"}
                      strokeWidth={c === cycle ? "2" : "0"}
                    />
                  );
                })}
              </g>
            ))}
            <line x1="40" y1="0" x2="40" y2="320" stroke="var(--muted)" strokeWidth="1" />
          </svg>
        </div>
        <div className="vf-anim-legend">
          <span className="item"><span className="swatch" style={{ background: "var(--lime)" }} /> ISSUE</span>
          <span className="item"><span className="swatch" style={{ background: "var(--rose)" }} /> EXECUTE</span>
          <span className="item"><span className="swatch" style={{ background: "var(--violet)" }} /> MEMORY</span>
          <span className="item"><span className="swatch" style={{ background: "var(--muted)" }} /> STALL</span>
          <span className="item">▮▮ GEÇMİŞ · ▯▯ GELECEK</span>
        </div>
        <div className="vf-anim-controls">
          <button onClick={() => setPlaying(!playing)} aria-pressed={playing}>
            {playing ? "⏸ DURAKLAT" : "▶ OYNAT"}
          </button>
          <button onClick={() => setCycle((c) => (c - 1 + totalCycles) % totalCycles)} disabled={playing}>◀ ADIM</button>
          <button onClick={() => setCycle((c) => (c + 1) % totalCycles)} disabled={playing}>ADIM ▶</button>
          <button onClick={() => { setPlaying(false); setCycle(0); }}>↺ SIFIRLA</button>
          <div
            className="timeline"
            role="slider"
            tabIndex={0}
            aria-valuemin={0}
            aria-valuemax={totalCycles - 1}
            aria-valuenow={cycle}
            aria-label="Cycle scrubber"
            onClick={(e) => {
              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              setCycle(Math.floor(pct * totalCycles));
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                setCycle((c) => (c - 1 + totalCycles) % totalCycles);
              } else if (e.key === "ArrowRight") {
                e.preventDefault();
                setCycle((c) => (c + 1) % totalCycles);
              } else if (e.key === "Home") {
                e.preventDefault();
                setCycle(0);
              } else if (e.key === "End") {
                e.preventDefault();
                setCycle(totalCycles - 1);
              }
            }}
          >
            <i style={{ width: `${(cycle / (totalCycles - 1)) * 100}%` }} />
          </div>
          <span className="cycle">CYCLE {cycle + 1} / {totalCycles}</span>
        </div>
        <div className="vf-anim-step">
          <b>{stateLabel[warpState(0)]}:</b> {currentStep}
        </div>
      </div>
    </section>
  );
}

export default function VisualFoundationsEmbedded() {
  const [active, setActiveRaw] = useState<Section>("compare");
  const [visited, setVisitedRaw] = useState<Set<Section>>(() => new Set(["compare"]));
  const [bestScore, setBestScore] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = window.localStorage.getItem("vf-quiz-best");
      return saved ? Number(saved) : null;
    } catch {
      return null;
    }
  });

  const setActive = (next: Section) => {
    setActiveRaw(next);
    setVisitedRaw((prev) => {
      if (prev.has(next)) return prev;
      const nextSet = new Set(prev);
      nextSet.add(next);
      return nextSet;
    });
  };

  const handleScore = (score: number) => {
    setBestScore((prev) => {
      const next = prev === null ? score : Math.max(prev, score);
      if (typeof window !== "undefined") {
        try { window.localStorage.setItem("vf-quiz-best", String(next)); } catch { /* Device storage can be unavailable. */ }
      }
      return next;
    });
  };

  return (
    <section className="visual-foundations-embed" aria-label="Görsel ve kalıcı GPU öğrenme laboratuvarı">
      <Header active={active} setActive={setActive} visited={visited} />
      <div className="vf-page-shell">
        {active === "compare" && <CompareSection />}
        {active === "anatomy" && <AnatomySection />}
        {active === "lifecycle" && <LifecycleSection />}
        {active === "memory" && <MemorySection />}
        {active === "pitfalls" && <PitfallsSection />}
        {active === "quiz" && <QuizSection onScore={handleScore} />}
        {active === "map" && <MapSection />}
        {active === "recall" && <RecallSection />}
        {active === "glossary" && <GlossarySection />}
        {active === "cheat" && <CheatSection />}
        {active === "code" && <CodeSection />}
        {active === "anim" && <AnimSection />}
        <div className="vf-foot">
          <div>
            <b>Kalıcı Öğrenme Üçgeni</b>
            <p>Görsel · Sözel · Geri-getirme. Üçü birlikte uygulanınca bilgi 1 yıl değil, 5 yıl kalıcı olur.</p>
          </div>
          <div>
            <b>EN İYİ SKOR · {bestScore ?? "—"} / 5</b>
            <p>Bu skor yalnızca bu cihazda saklanır. Tekrar ettikçe yükselir.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
