"use client";
/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- Labelled overflow regions must remain keyboard-scrollable. */

import { useMemo, useRef, useState } from "react";
import { getSourcesForModule } from "./atlas/curriculum-sources";

export const LLM_TOPIC_IDS = ["gemm", "reduction", "softmax", "normalization", "attention", "grouped", "precision"] as const;
type TopicId = (typeof LLM_TOPIC_IDS)[number];
type OperatorArchitecture = "ada" | "hopper" | "blackwell";

export const OPERATOR_TUTORIALS_CURRENT = { sourceId: "triton-operator-tutorials", maturity: "current" as const };
export const BLOCK_SCALED_TUTORIAL = { sourceId: "triton-block-scaled", maturity: "current" as const };
export const PAGED_ATTENTION_SOURCE = { sourceId: "vllm-paged-attention-design", maturity: "current" as const };
export const GQA_SOURCE = { sourceId: "pytorch-sdpa-gqa", maturity: "preview" as const };
export function getOperatorArchitectureSupport(architecture: OperatorArchitecture) {
  return [
    { id: "grouped", label: "Gruplu GEMM / MoE", maturity: "current", enabled: true, reason: null },
    { id: "persistent", label: "Persistent matmul", maturity: "current", enabled: true, reason: null },
    { id: "block-scaled", label: "Block-scaled FP4 / FP8", maturity: "current", enabled: architecture === "blackwell", reason: architecture === "blackwell" ? null : "Resmî öğretici günceldir; hızlandırılmış FP4/FP8 yolu bu Atlas'ta Blackwell · SM100 ailesi gibi desteklenen bir hedef gerektirir." },
  ] as const;
}

const topics: { id: TopicId; index: string; name: string; eyebrow: string; color: string }[] = [
  { id: "gemm", index: "01", name: "GEMM", eyebrow: "MATRİS ÇARPIMI", color: "cyan" },
  { id: "reduction", index: "02", name: "İndirgeme", eyebrow: "TOPLAMA", color: "violet" },
  { id: "softmax", index: "03", name: "Softmax", eyebrow: "OLASILIK", color: "orange" },
  { id: "normalization", index: "04", name: "Normalleştirme", eyebrow: "KARARLILIK", color: "pink" },
  { id: "attention", index: "05", name: "Dikkat", eyebrow: "DİZİ", color: "lime" },
  { id: "grouped", index: "06", name: "Gruplu GEMM / MoE (Grouped GEMM)", eyebrow: "YÖNLENDİRME", color: "amber" },
  { id: "precision", index: "07", name: "Block-scaled FP4 / FP8", eyebrow: "HASSASİYET", color: "blue" },
];

const topicCopy: Record<TopicId, { kicker: string; title: string; lead: string; formula: string }> = {
  gemm: {
    kicker: "BÖLÜM 01 · HESAPLAMANIN MOTORU",
    title: "GEMM: veriyi değil, hesaplamayı taşı",
    lead: "Genel matris çarpımı, C = A × B, modern yapay zekâ iş yüklerinin omurgasıdır. İyi bir kernel her A ve B elemanını tekrar tekrar global bellekten istemek yerine, tile’ları hızlı bellekte paylaşır.",
    formula: "Cᵢⱼ = Σₖ Aᵢₖ · Bₖⱼ",
  },
  reduction: {
    kicker: "BÖLÜM 02 · ÇOKTAN TEKE",
    title: "Reduction: binlerce değeri güvenli biçimde birleştir",
    lead: "Toplam, maksimum ve ortalama gibi işlemler birçok girdiyi tek bir çıktıya indirger. Hedef yalnızca paralellik değil; az senkronizasyon, düzenli bellek erişimi ve sayısal olarak kontrollü bir birleşim ağacıdır.",
    formula: "y = x₀ ⊕ x₁ ⊕ … ⊕ xₙ₋₁",
  },
  softmax: {
    kicker: "BÖLÜM 03 · SKORDAN OLASILIĞA",
    title: "Softmax: kararlı, çevrimiçi ve birleştirilebilir",
    lead: "Softmax skorları pozitif ve toplamı 1 olan bir dağılıma dönüştürür. Naif exp(x) büyük girdilerde taşabilir; doğru kernel önce satır maksimumunu çıkarır, sonra üstel toplamı hesaplar.",
    formula: "pᵢ = exp(xᵢ − m) / Σⱼ exp(xⱼ − m)",
  },
  normalization: {
    kicker: "BÖLÜM 04 · ÖLÇEĞİ KONTROL ET",
    title: "Normalleştirme: aktivasyonları çalışılabilir aralıkta tut",
    lead: "LayerNorm ortalama ve varyansı, RMSNorm ise yalnızca kareler ortalamasını kullanır. Kernel açısından ikisi de indirgeme, yayınlama ve eleman bazlı dönüşümün iyi bir füzyon adayıdır.",
    formula: "RMSNorm(x) = γ ⊙ x / √(mean(x²) + ε)",
  },
  attention: {
    kicker: "BÖLÜM 05 · BAĞLAMI EŞLEŞTİR",
    title: "Dikkat: matris çarpımı ile çevrimiçi softmax'ı birleştir",
    lead: "Dikkat; QKᵀ skorlarını, ölçeklemeyi, maskelemeyi, softmax'ı ve V ile ağırlıklı toplamı birleştirir. Flash tarzı kerneller, tam skor matrisini belleğe yazmadan döşemeler üzerinde çevrimiçi softmax yürütür.",
    formula: "O = softmax(QKᵀ / √d + mask) · V",
  },
  grouped: { kicker: "BÖLÜM 06 · UZMAN YÖNLENDİRME", title: "Gruplu GEMM / MoE: düzensiz işi tek başlatmada topla", lead: "Grouped GEMM değişken boyutlu uzman matrislerini toplu çalıştırır; persistent matmul çalışma döngüsünü GPU üzerinde tutarak başlatma ve planlama maliyetini azaltır.", formula: "Yₑ = XₑWₑ · e ∈ selected experts" },
  precision: { kicker: "BÖLÜM 07 · ÖLÇEKLİ DÜŞÜK HASSASİYET", title: "Block-scaled FP4 / FP8: veri kadar ölçek de düzendir", lead: "FP4 ve FP8 bloklarının ölçek metaverisi operand düzeniyle eşleşmeli; çarpım düşük hassasiyetteyken birikim daha yüksek hassasiyette tutulur.", formula: "C = accumulate((A · sₐ) × (B · sᵦ))" },
};

const quiz: Record<TopicId, { q: string; options: string[]; answer: number; note: string }> = {
  gemm: { q: "GEMM'de döşemenin ana kazancı nedir?", options: ["Daha fazla iş parçacığı başlatmak", "Global bellekten yüklenen veriyi yeniden kullanmak", "K boyutunu kaldırmak"], answer: 1, note: "Bir döşeme paylaşımlı bellek veya yazmaçlarda kaldığı sürece birçok FMA'yı besleyebilir." },
  reduction: { q: "16 elemanlı dengeli bir reduction ağacı kaç birleşim aşaması ister?", options: ["4", "8", "16"], answer: 0, note: "Her aşama aktif değer sayısını yarıya indirir: log₂(16) = 4." },
  softmax: { q: "max(x) neden üstel işlemden önce çıkarılır?", options: ["Toplamı sıfırlamak için", "Sıralamayı değiştirmek için", "Taşmayı önlemek için"], answer: 2, note: "Sabit bir değeri tüm skorlardan çıkarmak dağılımı değiştirmez; en büyük üstel değeri 1 yapar." },
  normalization: { q: "RMSNorm, LayerNorm’dan hangi istatistiği çıkarır?", options: ["Ortalama merkezleme", "Kareler ortalaması", "Öğrenilen γ"], answer: 0, note: "RMSNorm girdiyi merkezlemez; RMS ölçeğini hesaplar ve öğrenilen γ ile çarpar." },
  attention: { q: "Flash tarzı dikkatin temel bellek avantajı nedir?", options: ["Q, K ve V'yi silmek", "S×S skor matrisini HBM'e yazmamak", "Softmax'ı atlamak"], answer: 1, note: "Skor döşemeleri çevrimiçi softmax ile işlenir; ara skor matrisi global bellekte oluşturulmaz." },
  grouped: { q: "Grouped GEMM MoE iş yükünde neyi korur?", options: ["Değişken uzman boyutlarını tek plan içinde", "Her uzmana aynı token sayısını", "Yalnız tek bir matrisi"], answer: 0, note: "Gruplu başlatma, farklı uzman matrislerini ve token gruplarını tek plan içinde taşır." },
  precision: { q: "Block-scaled FP4 / FP8 yolunda hangi sözleşme zorunludur?", options: ["Ölçek metaverisi düzeni", "Yalnız çıktı rengi", "Sabit GQA grup sayısı"], answer: 0, note: "Ölçek metaverisi, operand blokları ve daha yüksek hassasiyetli birikim birlikte doğrulanır." },
};

function fmt(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}G`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}

function DotGrid({ active = 18 }: { active?: number }) {
  return (
    <div className="dot-grid" aria-label="Matris tile görselleştirmesi">
      {Array.from({ length: 64 }, (_, i) => <span key={i} className={i < active ? "on" : ""} />)}
    </div>
  );
}

function GemmLab() {
  const [m, setM] = useState(1024);
  const [n, setN] = useState(1024);
  const [k, setK] = useState(1024);
  const flops = 2 * m * n * k;
  const bytes = 4 * (m * k + k * n + m * n);
  const intensity = flops / bytes;

  return (
    <div className="lab-grid">
      <section className="panel visual-panel">
        <div className="panel-label"><span>Tile yürüyüşü</span><b>BLOCK 32×32</b></div>
        <div className="gemm-visual">
          <div><small>A · M×K</small><DotGrid active={32} /></div>
          <strong>×</strong>
          <div><small>B · K×N</small><DotGrid active={24} /></div>
          <strong>=</strong>
          <div><small>C · M×N</small><DotGrid active={16} /></div>
        </div>
        <p className="visual-caption"><i /> Her blok A ve B döşemelerini hızlı belleğe alır; iş parçacıkları K ekseni boyunca yazmaç birikimlerini günceller.</p>
      </section>
      <section className="panel controls-panel">
        <div className="panel-label"><span>Roofline sezgisi</span><b>FP32</b></div>
        {[["M", m, setM], ["N", n, setN], ["K", k, setK]].map(([label, value, setter]) => (
          <label className="range-row" key={label as string}><span>{label as string}</span><input type="range" min="256" max="4096" step="256" value={value as number} onChange={e => (setter as (v: number) => void)(+e.target.value)} /><output>{value as number}</output></label>
        ))}
        <div className="metric-strip">
          <div><span>İş</span><b>{fmt(flops)} FLOP</b></div>
          <div><span>En az trafik</span><b>{fmt(bytes)}B</b></div>
          <div><span>Yoğunluk</span><b>{intensity.toFixed(1)} F/B</b></div>
        </div>
      </section>
    </div>
  );
}

function ReductionLab() {
  const [op, setOp] = useState<"SUM" | "MAX">("SUM");
  const values = [4, 7, 2, 9, 1, 5, 8, 3];
  const stages: number[][] = [values];
  while (stages[stages.length - 1].length > 1) {
    const prev = stages[stages.length - 1];
    const next = [];
    for (let i = 0; i < prev.length; i += 2) next.push(op === "SUM" ? prev[i] + prev[i + 1] : Math.max(prev[i], prev[i + 1]));
    stages.push(next);
  }
  return (
    <div className="lab-grid">
      <section className="panel visual-panel">
        <div className="panel-label"><span>Paralel birleşim ağacı</span><b>{stages.length - 1} AŞAMA</b></div>
        <div className="tree">
          {stages.map((stage, i) => <div className="tree-row" key={i}>{stage.map((v, j) => <span key={j}>{v}</span>)}</div>)}
        </div>
      </section>
      <section className="panel controls-panel">
        <div className="panel-label"><span>Operatör</span><b>ASSOCIATIVE</b></div>
        <div className="segmented" role="group" aria-label="Reduction operatörü"><button aria-pressed={op === "SUM"} className={op === "SUM" ? "active" : ""} onClick={() => setOp("SUM")}>SUM</button><button aria-pressed={op === "MAX"} className={op === "MAX" ? "active" : ""} onClick={() => setOp("MAX")}>MAX</button></div>
        <div className="callout"><b>Warp → Block → Grid</b><p>Önce warp shuffle, sonra blok başına küçük bir shared-memory reduction. Çok bloklu durumda ikinci kernel veya atomik sonlandırma gerekir.</p></div>
        <div className="metric-strip"><div><span>Girdi</span><b>8 değer</b></div><div><span>Birleşim</span><b>7 işlem</b></div><div><span>Sonuç</span><b>{stages.at(-1)?.[0]}</b></div></div>
      </section>
    </div>
  );
}

const softmaxScores = [2.1, 0.8, -0.4, 1.6, 3.2, 0.2];

function SoftmaxLab() {
  const [temp, setTemp] = useState(1);
  const probs = useMemo(() => {
    const scaled = softmaxScores.map(v => v / temp);
    const max = Math.max(...scaled);
    const exps = scaled.map(v => Math.exp(v - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(v => v / sum);
  }, [temp]);
  return (
    <div className="lab-grid">
      <section className="panel visual-panel">
        <div className="panel-label"><span>Dağılım</span><b>Σp = {probs.reduce((a, b) => a + b, 0).toFixed(3)}</b></div>
        <div className="bar-chart">{probs.map((p, i) => <div key={i} className="bar-item"><span style={{ height: `${Math.max(6, p * 190)}px` }}><b>{(p * 100).toFixed(1)}%</b></span><small>x{i}</small></div>)}</div>
      </section>
      <section className="panel controls-panel">
        <div className="panel-label"><span>Sıcaklık deneyi</span><b>T = {temp.toFixed(1)}</b></div>
        <label className="range-row wide"><span>keskin</span><input type="range" min="0.4" max="2.5" step="0.1" value={temp} onChange={e => setTemp(+e.target.value)} /><output>yumuşak</output></label>
        <ol className="algorithm-steps"><li><b>m = max(x)</b><span>taşmayı engelle</span></li><li><b>l = Σ exp(x − m)</b><span>paydayı indirgeme ile bul</span></li><li><b>p = exp(x − m) / l</b><span>normalize edip yaz</span></li></ol>
      </section>
    </div>
  );
}

function NormalizationLab() {
  const [kind, setKind] = useState<"RMS" | "LAYER">("RMS");
  const raw = [1.8, -0.4, 2.7, 0.3, -1.5, 0.9, 2.1, -0.8];
  const mean = raw.reduce((a, b) => a + b, 0) / raw.length;
  const centered = kind === "LAYER" ? raw.map(v => v - mean) : raw;
  const scale = Math.sqrt(centered.reduce((a, b) => a + b * b, 0) / raw.length + 1e-5);
  const output = centered.map(v => v / scale);
  return (
    <div className="lab-grid">
      <section className="panel visual-panel">
        <div className="panel-label"><span>Aktivasyon profili</span><b>{kind}NORM</b></div>
        <div className="norm-chart"><div className="zero-line" />{raw.map((v, i) => <div className="norm-pair" key={i}><span className="raw" style={{ height: `${Math.abs(v) * 28}px`, transform: v < 0 ? "translateY(100%)" : "translateY(0)" }} /><span className="normalized" style={{ height: `${Math.abs(output[i]) * 28}px`, transform: output[i] < 0 ? "translateY(100%)" : "translateY(0)" }} /></div>)}</div>
        <div className="legend"><span><i className="raw-dot" />girdi</span><span><i className="norm-dot" />normalize</span></div>
      </section>
      <section className="panel controls-panel">
        <div className="segmented" role="group" aria-label="Normalleştirme türü"><button aria-pressed={kind === "RMS"} className={kind === "RMS" ? "active" : ""} onClick={() => setKind("RMS")}>RMSNorm</button><button aria-pressed={kind === "LAYER"} className={kind === "LAYER" ? "active" : ""} onClick={() => setKind("LAYER")}>LayerNorm</button></div>
        <div className="compare-grid"><div><span>Merkezleme</span><b>{kind === "LAYER" ? "Evet, μ çıkar" : "Hayır"}</b></div><div><span>Reduction</span><b>{kind === "LAYER" ? "Σx + Σx²" : "Σx²"}</b></div><div><span>Ölçek</span><b>{scale.toFixed(3)}</b></div><div><span>Füzyon</span><b>γ + residual</b></div></div>
        <div className="callout compact"><b>Kernel deseni</b><p>Satırı yükle → istatistiği reduce et → değeri register’dan normalize et → γ ile çarp → tek geçişte yaz.</p></div>
      </section>
    </div>
  );
}

function AttentionLab() {
  const [seq, setSeq] = useState(2048);
  const [causal, setCausal] = useState(true);
  const naiveMB = (seq * seq * 2) / 1024 / 1024;
  return (
    <div className="lab-grid">
      <section className="panel visual-panel">
        <div className="panel-label"><span>Causal maske</span><b>{causal ? "GEÇMİŞ AÇIK" : "TAM ERİŞİM"}</b></div>
        <div className="attention-matrix" aria-label="Attention mask matrisi">{Array.from({ length: 64 }, (_, i) => { const r = Math.floor(i / 8), c = i % 8; const open = !causal || c <= r; return <span key={i} className={open ? "open" : "masked"} style={{ opacity: open ? 0.35 + (8 - Math.abs(r - c)) / 14 : 1 }} />; })}</div>
        <button className="toggle-row" onClick={() => setCausal(!causal)} aria-pressed={causal}><span>Gelecek token’ları maskele</span><i className={causal ? "on" : ""}><b /></i></button>
      </section>
      <section className="panel controls-panel">
        <div className="panel-label"><span>Bellek maliyeti</span><b>FP16 · 1 HEAD</b></div>
        <label className="range-row"><span>S</span><input type="range" min="256" max="8192" step="256" value={seq} onChange={e => setSeq(+e.target.value)} /><output>{seq}</output></label>
        <div className="memory-compare"><div className="bad"><span>Naif skor matrisi</span><b>{naiveMB.toFixed(1)} MB</b><small>O(S²) ara bellek</small></div><div className="good"><span>Tiled / online</span><b>Tile ölçeğinde</b><small>skorlar HBM’e yazılmaz</small></div></div>
        <div className="pipeline" tabIndex={0} aria-label="Dikkat işlem hattı"><span>QKᵀ</span><i>→</i><span>÷√d</span><i>→</i><span>mask</span><i>→</i><span>softmax</span><i>→</i><span>×V</span></div>
      </section>
    </div>
  );
}

function GroupedGemmLab() {
  return <div className="lab-grid"><section className="panel visual-panel"><div className="panel-label"><span>MoE yönlendirmesi</span><b>GROUPED GEMM</b></div><div className="operator-static"><strong>token grupları → uzman matrisleri</strong><p>Değişken M boyutlarını tek başlatmada sırala; boş uzmanları güvenle atla.</p></div></section><section className="panel controls-panel"><div className="panel-label"><span>Çalışma modeli</span><b>PERSISTENT MATMUL</b></div><div className="callout"><b>Kalıcı zamanlayıcı</b><p>Programlar iş kuyruğundan birden fazla döşeme alır; adalet, kuyruk sonu ve dal boyutları kabul matrisine girer.</p></div></section></div>;
}

function BlockScaledLab() {
  const [architecture, setArchitecture] = useState<OperatorArchitecture>("ada");
  const [feature, setFeature] = useState("grouped");
  const support = getOperatorArchitectureSupport(architecture);
  const selected = support.find((item) => item.id === feature) ?? support[0];
  const source = getSourcesForModule("operators").find((item) => item.id === BLOCK_SCALED_TUTORIAL.sourceId);
  return <div className="operator-architecture-gate">
    <div className="architecture-selector" role="group" aria-label="Operatör mimarisi">{([['ada','Ada · SM89'],['hopper','Hopper · SM90'],['blackwell','Blackwell · SM100 ailesi']] as const).map(([id,label]) => <button key={id} aria-pressed={architecture === id} onClick={() => { setArchitecture(id); setFeature("grouped"); }}>{label}</button>)}</div>
    <div className="operator-feature-grid">{support.map((item) => <button key={item.id} disabled={!item.enabled} aria-disabled={!item.enabled} aria-pressed={feature === item.id} aria-describedby={!item.enabled ? `operator-${item.id}-reason` : undefined} onClick={() => setFeature(item.id)}>{item.label}</button>)}</div>
    {support.filter((item) => !item.enabled).map((item) => <p className="operator-feature-reason" id={`operator-${item.id}-reason`} key={item.id}>{item.reason}</p>)}
    <p className="operator-feature-detail" aria-live="polite"><strong>{selected.label}</strong>{selected.id === "block-scaled" ? "FP4 / FP8 ölçek metaverisi düzenini ve daha yüksek hassasiyetli birikim yolunu birlikte doğrula." : "Bu yol tüm üç mimaride kavramsal olarak uygulanabilir; gerçek donanım sonucu üretilmez."}</p>
    <aside className="maturity-panel" data-source-id={BLOCK_SCALED_TUTORIAL.sourceId}><span>Güncel</span><p><strong>Donanım uygulanabilirliği:</strong> resmî öğretici desteklenen güncel içeriktir; hızlandırılmış FP4/FP8 yürütmesi hedefe özgüdür ve burada yalnız Blackwell · SM100 ailesi yolu için etkinleştirilir. {source && <a href={source.url} target="_blank" rel="noreferrer">Resmî öğretici ↗</a>}</p></aside>
  </div>;
}

function DecodeSourceEvidence() {
  const sources = getSourcesForModule("operators");
  const paged = sources.find((source) => source.id === PAGED_ATTENTION_SOURCE.sourceId);
  const gqa = sources.find((source) => source.id === GQA_SOURCE.sourceId);
  return <section className="decode-source-evidence" aria-label="Paged KV-cache ve GQA kanıtı">
    {paged && <article data-source-id={paged.id} data-maturity={paged.maturity}><span>Güncel</span><h3><a href={paged.url} target="_blank" rel="noreferrer">{paged.title} ↗</a></h3><p><strong>Tarihsel tasarım özeti.</strong> vLLM bu sayfanın güncel kodu açıklamaz diye uyarır; paged KV-cache blok düzeni ile fiziksel blok adreslemeyi öğrenmek için kullan, ardından etkin uygulamayı doğrula.</p></article>}
    {gqa && <article data-source-id={gqa.id} data-maturity={gqa.maturity}><span>Önizleme</span><h3><a href={gqa.url} target="_blank" rel="noreferrer">{gqa.title} ↗</a></h3><p><strong>Özellik olgunluğu.</strong> Bağlı API sayfası günceldir; ancak PyTorch <code>enable_gqa=True</code> yolunu backend kısıtları ve <code>Hq % Hkv == 0</code> koşulu olan deneysel özellik olarak belgeler. Bu Önizleme yolu temel tamamlanma koşulu değildir.</p></article>}
  </section>;
}

const labs: Record<TopicId, () => React.ReactNode> = { gemm: GemmLab, reduction: ReductionLab, softmax: SoftmaxLab, normalization: NormalizationLab, attention: AttentionLab, grouped: GroupedGemmLab, precision: BlockScaledLab };

function KernelPattern({ topic }: { topic: TopicId }) {
  const content: Record<TopicId, { title: string; items: { n: string; h: string; p: string }[]; code: string[] }> = {
    gemm: { title: "Döşemeli GEMM veri yolu", items: [{ n: "01", h: "Birleşik yükleme", p: "Komşu iş parçacıkları komşu A/B adreslerini okur." }, { n: "02", h: "Paylaşılan döşeme", p: "Blok, yüklediği parçayı bütün warplarla paylaşır." }, { n: "03", h: "Yazmaçta biriktirme", p: "Her iş parçacığı küçük bir C parçasını FMA ile biriktirir." }], code: ["for k_tile in range(0, K, BK):", "  a = load(A[m, k_tile:k_tile+BK])", "  b = load(B[k_tile:k_tile+BK, n])", "  acc += dot(a, b)", "store(C[m, n], acc)"] },
    reduction: { title: "Hiyerarşik indirgeme", items: [{ n: "01", h: "İş parçacığına özel", p: "Her iş parçacığı aralıklı girdilerden yerel bir sonuç üretir." }, { n: "02", h: "Warp birleştirmesi", p: "Karıştırma işlemleriyle yazmaçlar arası birleşim yapılır." }, { n: "03", h: "Blok sonlandırma", p: "Warp sonuçları küçük bir paylaşımlı bellek alanında birleştirilir." }], code: ["acc = identity", "for i in thread_strided_indices:", "  acc = op(acc, x[i])", "acc = warp_reduce(acc)", "if lane == 0: partial[warp] = acc"] },
    softmax: { title: "Üç geçişten tek kernele", items: [{ n: "01", h: "Satır maksimumu", p: "Satırın maksimumu paralel indirgemeyle bulunur." }, { n: "02", h: "Üstel + toplam", p: "Kaydırılmış üsteller ve toplam aynı döşemede üretilir." }, { n: "03", h: "Normalleştir + yaz", p: "Yazmaçlardaki değerler paydaya bölünüp yazılır." }], code: ["x = load(row, mask=cols < N)", "m = max(x, axis=0)", "z = exp(x - m)", "l = sum(z, axis=0)", "store(out, z / l)"] },
    normalization: { title: "Reduction + pointwise füzyonu", items: [{ n: "01", h: "Bir kez yükle", p: "Aktivasyon satırı coalesced olarak bir kez yüklenir." }, { n: "02", h: "İstatistikleri hesapla", p: "μ/σ² veya RMS ölçeği blok içinde hesaplanır." }, { n: "03", h: "Doğrusal dönüşüm + artık bağlantı", p: "γ, β ve residual mümkünse aynı yazımda birleşir." }], code: ["x = load(row)", "rms = sqrt(mean(x * x) + eps)", "y = x * rsqrt(rms * rms)", "y = y * gamma", "store(out, y)"] },
    attention: { title: "IO-aware attention", items: [{ n: "01", h: "Q tile sabit", p: "Q parçası register/shared memory’de tutulur." }, { n: "02", h: "K/V akışı", p: "K ve V blokları sırayla hızlı bellekten geçirilir." }, { n: "03", h: "Online softmax", p: "Koşan max ve toplam, yeni tile geldikçe yeniden ölçeklenir." }], code: ["for kv_tile in sequence:", "  scores = dot(q, k.T) * scale", "  m_new = max(m, max(scores))", "  l = l * exp(m-m_new) + sum(exp(scores-m_new))", "  out = rescale(out) + exp(scores-m_new) @ v"] },
    grouped: { title: "Grouped GEMM ve persistent matmul", items: [{ n: "01", h: "Token grupları", p: "MoE router çıktısını uzman başına kompaktlaştır." }, { n: "02", h: "Düzensiz matrisler", p: "Her uzman için bağımsız M/N/K ve stride sözleşmesi taşı." }, { n: "03", h: "Persistent kuyruk", p: "Programları birden fazla döşeme boyunca GPU üzerinde tut." }], code: ["for tile in persistent_queue:", "  expert = routing[tile]", "  x = load(grouped_x[expert])", "  w = load(grouped_w[expert])", "  store(y, dot(x, w))"] },
    precision: { title: "Block-scaled hassasiyet sözleşmesi", items: [{ n: "01", h: "FP4 / FP8 blokları", p: "Operand bloklama ile ölçek bloklamasını birlikte tanımla." }, { n: "02", h: "Ölçek metaverisi", p: "Scale metadata düzenini donanım yolunun beklediği biçime dönüştür." }, { n: "03", h: "Birikim", p: "Düşük hassasiyetli çarpımı daha yüksek hassasiyette biriktir." }], code: ["a = load_fp4(a_blocks)", "sa = load(scale_metadata_a)", "b = load_fp8(b_blocks)", "sb = load(scale_metadata_b)", "acc_fp32 += dot(a * sa, b * sb)"] },
  };
  const c = content[topic];
  return (
    <div className="pattern-section">
      <div className="section-heading"><div><span>KERNEL DESENİ</span><h2>{c.title}</h2></div><p>Performans çoğu zaman algoritmadan değil, veri hareketini nasıl düzenlediğinizden gelir.</p></div>
      <div className="pattern-grid">
        <div className="pattern-list">{c.items.map(item => <article key={item.n}><span>{item.n}</span><div><h3>{item.h}</h3><p>{item.p}</p></div></article>)}</div>
        <pre className="code-card"><div><i /><i /><i /><span>kernel.py</span></div><code>{c.code.map((line, i) => <span key={i}><b>{String(i + 1).padStart(2, "0")}</b>{line}</span>)}</code></pre>
      </div>
    </div>
  );
}

function Quiz({ topic, onComplete }: { topic: TopicId; onComplete: () => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const q = quiz[topic];
  return (
    <section className="quiz-card" key={topic}>
      <div><span>BİLGİ KONTROLÜ</span><h2>{q.q}</h2></div>
      <div className="quiz-options" role="group" aria-label="Yanıt seçenekleri">{q.options.map((o, i) => <button key={o} aria-pressed={selected === i} className={selected === i ? (i === q.answer ? "correct" : "wrong") : ""} onClick={() => { setSelected(i); if (i === q.answer) onComplete(); }}><i>{String.fromCharCode(65 + i)}</i>{o}<b>{selected === i ? (i === q.answer ? "✓" : "×") : ""}</b></button>)}</div>
      <p className="quiz-note" aria-live="polite" hidden={selected === null}>{selected === null ? null : <><b>{selected === q.answer ? "Doğru." : "Tekrar düşün."}</b> {q.note}</>}</p>
    </section>
  );
}

export default function LlmKernelPatternsEmbedded() {
  const surfaceRef = useRef<HTMLElement>(null);
  const [topic, setTopic] = useState<TopicId>("gemm");
  const [completed, setCompleted] = useState<TopicId[]>([]);
  const current = topicCopy[topic];
  const Lab = labs[topic];
  const selectTopic = (id: TopicId) => {
    setTopic(id);

    const surface = surfaceRef.current;
    if (!surface || typeof surface.scrollIntoView !== "function") return;

    let behavior: ScrollBehavior = "smooth";
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      try {
        behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
      } catch {
        behavior = "smooth";
      }
    }

    surface.scrollIntoView({ behavior, block: "start" });
  };

  return (
    <section ref={surfaceRef} className="llm-kernel-patterns-surface" aria-label="LLM kernel desenleri laboratuvarı">
      <section className={`hero theme-${topic}`}>
        <div className="hero-grid" />
        <div className="hero-content">
          <div className="hero-copy"><span className="kicker">{current.kicker}</span><h2>{current.title}</h2><p>{current.lead}</p><div className="formula"><span>Temel ifade</span><code>{current.formula}</code></div></div>
          <aside className="topic-rail" role="group" aria-labelledby="llm-learning-route" tabIndex={0}><span id="llm-learning-route">ÖĞRENME ROTASI</span>{topics.map(t => <button key={t.id} aria-pressed={topic === t.id} className={`${topic === t.id ? "active" : ""} ${completed.includes(t.id) ? "done" : ""}`} onClick={() => selectTopic(t.id)}><i>{t.index}</i><span><small>{t.eyebrow}</small><b>{t.name}</b></span><em>{completed.includes(t.id) ? "✓" : "→"}</em></button>)}</aside>
        </div>
      </section>

      <div className="content-wrap">
        <section className="lab-heading"><div><span>CANLI LAB</span><h2>Sayılarla oyna, deseni gör.</h2></div><p>Kontrolleri değiştir; iş miktarının, bellek trafiğinin ve sayısal davranışın nasıl değiştiğini izle.</p></section>
        <Lab />
        <aside className="operator-current-scope" data-source-id={OPERATOR_TUTORIALS_CURRENT.sourceId}><strong>Güncel operatör öğreticileri.</strong> Gruplu GEMM / MoE ve persistent matmul güncel resmî öğretici aileleridir. <span data-source-id={BLOCK_SCALED_TUTORIAL.sourceId}>Güncel block-scaled öğretici, FP4 / FP8 ölçek metaverisi ile daha yüksek hassasiyetli birikimi ayrı donanım uygulanabilirliği altında kapsar.</span></aside>
        <DecodeSourceEvidence />
        <KernelPattern topic={topic} />
        <section className="principles">
          <article><span>01</span><h3>Doğruluk önce</h3><p>Reference çıktıyla toleranslı karşılaştırma; uç şekiller, maskeler ve dtypes ayrı test edilir.</p></article>
          <article><span>02</span><h3>Ölçmeden karar verme</h3><p>Warm-up sonrası median süreyi, efektif bant genişliğini ve FLOP/s değerini raporla.</p></article>
          <article><span>03</span><h3>Darboğazı adlandır</h3><p>Kernel compute-bound mı, memory-bound mı? Occupancy, register ve erişim düzeniyle kanıtla.</p></article>
        </section>
        <Quiz key={topic} topic={topic} onComplete={() => setCompleted(c => c.includes(topic) ? c : [...c, topic])} />
        <div className="next-row"><div><span>SONRAKİ BÖLÜM</span><b>{topics[(topics.findIndex(t => t.id === topic) + 1) % topics.length].name}</b></div><button onClick={() => selectTopic(topics[(topics.findIndex(t => t.id === topic) + 1) % topics.length].id)}>Rotada ilerle <span>→</span></button></div>
      </div>
    </section>
  );
}
