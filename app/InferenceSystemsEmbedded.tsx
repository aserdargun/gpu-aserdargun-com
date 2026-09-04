"use client";
/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- Labelled overflow regions must remain keyboard-scrollable. */

import { useMemo, useState } from "react";

type QuantGoal = "memory" | "latency" | "quality";
type Bottleneck = "ttft" | "itl" | "oom" | "gpu";

export const INFERENCE_DIAGNOSIS_IDS = ["scheduler", "kv-cache", "kernel", "network"] as const;
export const INFERENCE_GRAPH_IDS = ["cuda-piecewise", "cuda-full", "hip-piecewise", "hip-full"] as const;
export const INFERENCE_PARALLELISM_IDS = ["expert", "context"] as const;
export const INFERENCE_PRECISION_IDS = ["fp8", "mxfp8", "mxfp4", "nvfp4"] as const;
type InferenceDiagnosisId = typeof INFERENCE_DIAGNOSIS_IDS[number];
type InferenceGraphId = typeof INFERENCE_GRAPH_IDS[number];
type InferenceParallelismId = typeof INFERENCE_PARALLELISM_IDS[number];
type InferencePrecisionId = typeof INFERENCE_PRECISION_IDS[number];

const inferenceDiagnosis = {
  scheduler: { label: "Zamanlayıcı", bottleneck: "Zamanlayıcı kuyruğu", signals: ["kuyruk süresi / bekleyen istek", "toplu iş doluluğu / belirteç bütçesi"], action: "İstek gelişini, belirteç bütçesini ve öncelik kesme olaylarını birlikte incele." },
  "kv-cache": { label: "KV önbelleği", bottleneck: "KV önbelleği kapasitesi ve hareketi", signals: ["blok doluluğu / önbellek isabet oranı", "KV veri tipi / aktarım süresi"], action: "Ağırlık belleğini KV blok kapasitesiyle karıştırma; önek isabetini ve KV aktarımını ayrı ölç." },
  kernel: { label: "Kernel", bottleneck: "Kernel ve başlatma yolu", signals: ["GPU kernel süresi / doluluk", "başlatma boşlukları / grafik kapsamı"], action: "Dikkat, GEMM ve grafik kapsamını arka uç ile şekil dağılımına göre eşleştir." },
  network: { label: "Ağ", bottleneck: "Ağ ve KV aktarım yolu", signals: ["KV connector gecikmesi", "NIC/rail kullanımı ve kuyruk"], action: "Ayrıştırılmış encode → prefill → decode sınırlarında aktarım süresini ayrıca kaydet." },
} as const;

const inferenceGraphs = {
  "cuda-piecewise": { label: "CUDA parçalı", backend: "CUDA", capture: "piecewise", sourceId: "vllm-cuda-graph-modes", maturity: "current", mechanism: undefined, mechanismSourceId: undefined, note: "vLLM parça parça CUDA Graph yakalamayı destekler; uyumsuz attention parçaları eager kalabilir." },
  "cuda-full": { label: "CUDA tam", backend: "CUDA", capture: "full", sourceId: "vllm-cuda-graph-modes", maturity: "current", mechanism: undefined, mechanismSourceId: undefined, note: "vLLM tam CUDA Graph yakalamayı destekler; batch/shape ve backend uyumluluğu seçimi belirler." },
  "hip-piecewise": { label: "HIP parçalı", backend: "HIP", capture: "piecewise", sourceId: "vllm-stable", maturity: "current", mechanism: "stream-capture", mechanismSourceId: "amd-hip-graphs", note: "vLLM'nin kararlı yüzeyinde HIP parçalı graph modu seçilir; mekanizma katmanında AMD HIP stream capture API'si ayrıca gösterilir." },
  "hip-full": { label: "HIP tam", backend: "HIP", capture: "full", sourceId: "vllm-stable", maturity: "current", mechanism: "explicit-graph", mechanismSourceId: "amd-hip-graphs", note: "vLLM'nin kararlı yüzeyinde HIP tam graph modu seçilir; mekanizma katmanında AMD HIP açık graph API'si ayrıca gösterilir." },
} as const;

const inferenceParallelism = {
  expert: { label: "Uzman paralelliği", sourceId: "vllm-expert-parallel", maturity: "current", coreCompletion: true, note: "MoE uzmanlarını sıralara dağıtır; tümden tüme iletişim, arka uç ve topoloji maliyeti planın parçasıdır." },
  context: { label: "Bağlam paralelliği", sourceId: "vllm-context-parallel", maturity: "preview", coreCompletion: false, note: "Uzun bağlamı prefill ve decode için farklı biçimde böler; resmi belgede bazı prefill yolları hâlâ etkin geliştirmededir." },
} as const;

const inferencePrecisions = {
  fp8: { label: "FP8", hardware: "vLLM'nin desteklenen donanım ve nicemleme matrisiyle doğrulanacak GPU yolu", backend: "vLLM FP8 W8A8 / seçilen doğrusal veya MoE kerneli", scaleRepresentation: "E4M3 veri; statik veya dinamik ölçek", accumulation: "Arka ucun belgelediği birikim veri tipini seçilen kernel için ayrıca doğrula.", qualityGuardrail: "Eğitsel güvence: BF16 taban çizgisine karşı görev metriği ve duyarlı katman kontrolü.", sourceId: "vllm-online-quantization", sourceIds: ["vllm-online-quantization", "vllm-quantization-hardware"], maturity: "current" },
  mxfp8: { label: "MXFP8", hardware: "W8A8 için SM100+; diğer GPU'larda W8A16 yedek yolu kullanılabilir", backend: "Platformun seçtiği MXFP8 doğrusal veya MoE arka ucu", scaleRepresentation: "32 elemanlık blok başına E8M0 ölçek", accumulation: "Seçilen CUTLASS/vLLM arka ucunun birikim yolunu doğrula.", qualityGuardrail: "Eğitsel güvence: yedek veri tipini ve kalibrasyon ya da çıktı sapmasını raporla.", sourceId: "vllm-online-quantization", sourceIds: ["vllm-online-quantization", "cutlass-inference-formats"], maturity: "current" },
  mxfp4: { label: "MXFP4", hardware: "Arka uca bağlı Blackwell hızlandırması; platformun yedek veri tipi yolunu doğrula", backend: "Doğrusal ve MoE arka uçları aynı aktivasyon veri tipini garanti etmez", scaleRepresentation: "OCP MX FP4 E2M1 + 32 elemanlık blok başına E8M0", accumulation: "Yüksek hassasiyetli birikim seçeneğini seçilen arka uç belgesiyle doğrula.", qualityGuardrail: "Eğitsel güvence: dışarıda bırakılan katmanları ve kalite kaybı sınırını görev metriğiyle kontrol et.", sourceId: "vllm-online-quantization", sourceIds: ["vllm-online-quantization", "cutlass-inference-formats", "vllm-quantization-hardware"], maturity: "current" },
  nvfp4: { label: "NVFP4", hardware: "Blackwell SM100 özel hızlandırılmış yol", backend: "FlashInfer/TRTLLM veya uyumlu CUTLASS tabanlı kernel", scaleRepresentation: "NV FP4 E2M1 + 16 elemanlık blok ve UE4M3 ölçek", accumulation: "FP32 birikim desteğini yalnız seçilen backend belgeliyorsa kullan.", qualityGuardrail: "Eğitsel güvence: per-token activation ölçeği ve BF16 kalite karşılaştırması yap.", sourceId: "cutlass-inference-formats", sourceIds: ["cutlass-inference-formats", "vllm-quantization-hardware"], maturity: "preview" },
} as const;

export function getInferenceDiagnosis(id: InferenceDiagnosisId) { return { id, ...inferenceDiagnosis[id] }; }
export function getInferenceGraphPlan(id: InferenceGraphId) { return { id, ...inferenceGraphs[id], measuredHardwareEvidence: false }; }
export function getInferenceParallelismPlan(id: InferenceParallelismId) { return { id, ...inferenceParallelism[id] }; }
export function getInferencePrecisionPlan(id: InferencePrecisionId) { return { id, ...inferencePrecisions[id], measuredHardwareEvidence: false }; }
export function getInferenceSpeculativeBoundary() {
  return { sourceId: "vllm-speculative-acceptance", acceptanceSourceId: "vllm-speculative-acceptance", maturity: "preview" as const, acceptanceRate: "Kabul oranı = kabul edilen taslak token / önerilen taslak token", draftCost: "Eğitsel karar girdisi: taslak model çalışması + doğrulama + reddedilen token işi.", draftCostEvidenceKind: "educational" as const, measuredHardwareEvidence: false };
}

const modules = [
  ["01", "vLLM Motoru", "#vllm"],
  ["02", "CUDA Graphs", "#graphs"],
  ["03", "Quantization", "#quantization"],
  ["04", "Optimizasyon", "#optimization"],
  ["05", "Ölçüm", "#measurement"],
];

const quantData = {
  memory: {
    eyebrow: "BELLEK ÖNCELİKLİ",
    title: "INT4 / AWQ veya GPTQ ile başla",
    copy: "Ağırlık belleğini güçlü biçimde küçültür. KV cache ve çalışma alanı belleğini ayrıca bütçele; 4-bit ağırlıklar toplam VRAM'i dörtte bire indirme garantisi vermez.",
    accent: "lime",
  },
  latency: {
    eyebrow: "GECİKME ÖNCELİKLİ",
    title: "FP8 + optimize kernel yolunu dene",
    copy: "Uygun GPU'da Tensor Core yolunu ve daha küçük veri hareketini hedefler. Donanım, model mimarisi ve kernel desteğini ölçmeden kazanç varsayma.",
    accent: "cyan",
  },
  quality: {
    eyebrow: "KALİTE ÖNCELİKLİ",
    title: "BF16 taban çizgisini koru",
    copy: "Önce BF16 kalite ve performans taban çizgisini kaydet. Ardından weight-only veya FP8 adaylarını aynı istemler ve sabit örnekleme ayarlarıyla karşılaştır.",
    accent: "coral",
  },
};

const bottlenecks: Record<Bottleneck, { label: string; diagnosis: string; actions: string[] }> = {
  ttft: {
    label: "TTFT yüksek",
    diagnosis: "Ön doldurma, kuyruk veya uzun istem yolu baskın olabilir.",
    actions: ["İstem uzunluğunu ve kuyruk süresini ayır", "Önek önbelleği isabetini ölç", "Parçalı ön doldurma bütçesini tara"],
  },
  itl: {
    label: "ITL yüksek",
    diagnosis: "Kod çözme adımları bellek bant genişliğine veya küçük toplu işlerin başlatma maliyetine takılıyor olabilir.",
    actions: ["CUDA Graphs kapsamını kontrol et", "Kod çözme toplu iş dağılımını ölç", "KV önbelleği veri tipini ve dikkat arka ucunu karşılaştır"],
  },
  oom: {
    label: "KV cache OOM",
    diagnosis: "Ağırlıklar değil, eşzamanlı token sayısı ve KV blokları sınır olabilir.",
    actions: ["max_model_len ve max_num_seqs değerlerini düşür", "KV önbelleği kapasitesini blok bazında izle", "KV önbelleği nicemleme uygunluğunu doğrula"],
  },
  gpu: {
    label: "GPU düşük kullanım",
    diagnosis: "İstek gelişi, CPU zamanlaması, ağ veya küçük toplu işler GPU'yu aç bırakıyor olabilir.",
    actions: ["Eşzamanlılık taraması yap", "CPU ve belirteçleştirici süresini profille", "Sürekli toplu işleme ile eşzamansız zamanlamayı incele"],
  },
};

const quiz = [
  {
    q: "CUDA Graphs en doğrudan hangi maliyeti azaltır?",
    options: ["Model ağırlık belleği", "Tekrarlanan CPU launch maliyeti", "KV cache doğruluğu"],
    answer: 1,
  },
  {
    q: "Uzun bir prompt için ilk token gecikmesini en çok hangi faz etkiler?",
    options: ["Prefill", "Decode", "Detokenization"],
    answer: 0,
  },
  {
    q: "4-bit ağırlıklar neyi garanti etmez?",
    options: ["Daha küçük weight footprint", "Toplam VRAM'in tam 4× azalması", "Daha az ağırlık verisi"],
    answer: 1,
  },
];

function ArrowIcon() {
  return <span aria-hidden="true">↗</span>;
}

export default function InferenceSystemsEmbedded() {
  const [batching, setBatching] = useState(true);
  const [prefix, setPrefix] = useState(true);
  const [chunked, setChunked] = useState(true);
  const [replays, setReplays] = useState(100);
  const [params, setParams] = useState(8);
  const [bits, setBits] = useState(4);
  const [goal, setGoal] = useState<QuantGoal>("memory");
  const [bottleneck, setBottleneck] = useState<Bottleneck>("ttft");
  const [diagnosisId, setDiagnosisId] = useState<InferenceDiagnosisId>("scheduler");
  const [graphId, setGraphId] = useState<InferenceGraphId>("cuda-piecewise");
  const [parallelismId, setParallelismId] = useState<InferenceParallelismId>("expert");
  const [precisionId, setPrecisionId] = useState<InferencePrecisionId>("fp8");
  const [answers, setAnswers] = useState<number[]>([-1, -1, -1]);

  const serving = useMemo(() => {
    let throughput = 42;
    let ttft = 920;
    if (batching) {
      throughput += 31;
      ttft += 80;
    }
    if (prefix) {
      throughput += 11;
      ttft -= 270;
    }
    if (chunked) {
      throughput += 8;
      ttft -= 120;
    }
    return { throughput, ttft };
  }, [batching, prefix, chunked]);

  const eagerCost = replays * 24;
  const graphCost = 180 + replays * 3.2;
  const graphSaving = Math.max(0, Math.round((1 - graphCost / eagerCost) * 100));
  const weightMemory = (params * bits) / 8;
  const quizScore = answers.reduce((total, answer, index) => total + (answer === quiz[index].answer ? 1 : 0), 0);

  return (
    <section className="inference-systems-surface">
      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="kicker"><span>GPU INFERENCE / 2026</span><span>ETKİLEŞİMLİ REHBER</span></div>
          <h2>DAHA ÇOK<br />TOKEN.<br /><em>DAHA AZ</em><br />BEKLEME.</h2>
          <p className="hero-intro">vLLM zamanlayıcısından CUDA Graphs yeniden oynatmasına, 4 bit ağırlıklardan üretim kıyaslamasına kadar modern LLM sunum sistemini katman katman keşfet.</p>
          <div className="hero-actions">
            <a className="primary-cta" href="#vllm">SİSTEMİ AÇ <span>↓</span></a>
            <span className="read-time">≈ 25 dk okuma<br />4 interaktif lab</span>
          </div>
        </div>
        <div className="hero-visual" aria-label="İstekten tokene inference akışı">
          <div className="visual-label">CANLI AKIŞ / DECODE STEP 128</div>
          <div className="request request-a"><span>REQ 01</span><b>16 tok</b></div>
          <div className="request request-b"><span>REQ 02</span><b>1 tok</b></div>
          <div className="request request-c"><span>REQ 03</span><b>8 tok</b></div>
          <div className="scheduler-core">
            <span>SCHEDULER</span>
            <strong>CONTINUOUS<br />BATCH</strong>
            <small>25 TOKENS / STEP</small>
          </div>
          <div className="gpu-strip">
            <span>GPU</span>
            {Array.from({ length: 12 }).map((_, i) => <i key={i} style={{ opacity: 0.25 + i * 0.06 }} />)}
          </div>
          <div className="token-stream"><span>ÇIKTI</span><b>▮</b><b>▮</b><b>▮</b><b className="hot">▮</b><small>+1 BELİRTEÇ</small></div>
        </div>
      </section>

      <div className="content-shell">
        <aside className="module-rail" aria-label="Modüller">
          <p>MODÜLLER</p>
          {modules.map(([number, label, href]) => (
            <a href={href} key={number}><span>{number}</span>{label}</a>
          ))}
          <div className="rail-note"><b>AMAÇ</b><p>Bir bayrağı ezberlemek değil, darboğazı ölçüp doğru kaldıracı seçmek.</p></div>
        </aside>

        <div className="lesson-flow">
          <section className="lesson" id="vllm">
            <div className="section-index">01 / VLLM MOTORU</div>
            <div className="section-heading">
              <h2>Serving, bir model çağrısından fazlasıdır.</h2>
              <p>vLLM, değişken uzunluktaki istekleri sürekli bir GPU iş akışına dönüştürür. Kazanç tek bir kernelden değil; zamanlama, KV önbelleği ve yürütme katmanlarının birlikte çalışmasından gelir.</p>
            </div>

            <div className="pipeline" tabIndex={0} aria-label="İstek işleme hattı">
              <div className="pipe-node"><span>01</span><b>API SERVER</b><small>OpenAI uyumlu istek</small></div>
              <div className="pipe-arrow">→</div>
              <div className="pipe-node active"><span>02</span><b>SCHEDULER</b><small>Token bütçesi + sıra</small></div>
              <div className="pipe-arrow">→</div>
              <div className="pipe-node"><span>03</span><b>MODEL ÇALIŞTIRICI</b><small>İleri geçiş + örnekleme</small></div>
              <div className="pipe-arrow">→</div>
              <div className="pipe-node"><span>04</span><b>STREAM</b><small>Token yanıtı</small></div>
            </div>

            <div className="concept-grid">
              <article><span className="concept-tag">PAGED ATTENTION</span><h3>KV cache'i bloklara ayırır</h3><p>Her isteğe büyük ve bitişik alan ayırmak yerine sabit boyutlu bloklarla çalışır. Böylece parçalanma azalır, istekler büyüdükçe bloklar eklenebilir.</p><div className="block-viz">{Array.from({ length: 18 }).map((_, i) => <i className={i % 5 === 4 ? "gap" : i < 13 ? "used" : ""} key={i} />)}</div></article>
              <article><span className="concept-tag">SÜREKLİ TOPLU İŞLEME</span><h3>Batch, istek bitmesini beklemez</h3><p>Her decode adımında tamamlanan istek çıkar, bekleyen istek girebilir. Statik batch'in “en yavaşı bekle” maliyetini azaltır.</p><div className="timeline-viz"><i style={{ width: "82%" }} /><i style={{ width: "48%" }} /><i style={{ width: "68%" }} /><i className="new" style={{ width: "31%" }} /></div></article>
              <article><span className="concept-tag">PARÇALI ÖN DOLDURMA</span><h3>Uzun istemi dilimler</h3><p>Hesap ağırlıklı ön doldurma parçalarını bellek ağırlıklı kod çözme işleriyle aynı adımda planlayabilir. Belirteç bütçesi, TTFT–ITL dengesinin ana düğmelerinden biridir.</p><div className="chunk-viz"><i /><i /><i /><b>D</b><b>D</b><i /></div></article>
              <article><span className="concept-tag">ÖNEK ÖNBELLEĞİ</span><h3>Ortak başlangıcı yeniden kullanır</h3><p>Aynı sistem istemi veya paylaşılan bağlam tekrar geldiğinde eşleşen KV blokları yeniden hesaplanmaz. En büyük değer tekrarlanan öneklere sahip iş yüklerinde oluşur.</p><div className="prefix-viz"><span>SYSTEM</span><span>POLICY</span><b>USER A</b><b>USER B</b></div></article>
            </div>
          </section>

          <section className="lab-panel" id="labs">
            <div className="lab-header"><div><span>LAB / 01</span><h2>Serving kaldıracı simülatörü</h2></div><p>Pedagojik model · gerçek benchmark değildir</p></div>
            <div className="lab-body">
              <div className="controls" role="group" aria-label="Serving kaldıracı seçenekleri">
                {[
                  ["Continuous batching", "Adım başına daha dolu GPU işi", batching, setBatching],
                  ["Prefix caching", "Tekrarlı prefix prefill'ini atla", prefix, setPrefix],
                  ["Chunked prefill", "Prefill ve decode'u birlikte planla", chunked, setChunked],
                ].map(([label, note, value, setter]) => (
                  <button className="toggle-row" type="button" onClick={() => (setter as (v: boolean) => void)(!(value as boolean))} aria-pressed={value as boolean} key={label as string}>
                    <span><b>{label as string}</b><small>{note as string}</small></span><i className={value ? "on" : ""}><em /></i>
                  </button>
                ))}
              </div>
              <div className="result-board">
                <div className="result-metric"><span>TAHMİNİ İŞ HACMİ</span><b>{serving.throughput}</b><small>belirteç/sn</small></div>
                <div className="result-metric"><span>TAHMİNİ TTFT</span><b>{serving.ttft}</b><small>ms</small></div>
                <div className="mini-bars"><span style={{ height: `${Math.min(100, serving.throughput)}%` }} /><span style={{ height: `${Math.min(100, serving.ttft / 12)}%` }} /></div>
                <p>Bu sonuç yalnızca yönü anlatır. Gerçek değer; model, GPU, prompt dağılımı, concurrency ve sürümle değişir.</p>
              </div>
            </div>
          </section>

          <section className="inference-decision-lab" aria-labelledby="inference-decision-title">
            <div className="section-index">01.5 / KANITA BAĞLI KARAR LAB'I</div>
            <div className="section-heading"><h2 id="inference-decision-title">Kodlama → ön doldurma → kod çözme hattında katmanı seç.</h2><p>Ayrıştırılmış sunum, grafik, paralellik ve düşük hassasiyet kararları aynı şey değildir. Her seçim kaynak olgunluğunu, arka ucu ve donanım uygulanabilirliğini ayrı gösterir.</p></div>
            <div className="inference-decision-controls">
              <div data-control="diagnosis" role="group" aria-label="Darboğaz tanısı"><b>DARBOĞAZ</b>{INFERENCE_DIAGNOSIS_IDS.map((id) => <button type="button" aria-pressed={diagnosisId === id} onClick={() => setDiagnosisId(id)} key={id}>{inferenceDiagnosis[id].label}</button>)}</div>
              <div data-control="graph" role="group" aria-label="Graph backend ve kapsam"><b>GRAPH YOLU</b>{INFERENCE_GRAPH_IDS.map((id) => <button type="button" aria-pressed={graphId === id} onClick={() => setGraphId(id)} key={id}>{inferenceGraphs[id].label}</button>)}</div>
              <div data-control="parallelism" role="group" aria-label="Çıkarım paralelliği"><b>PARALELLİK</b>{INFERENCE_PARALLELISM_IDS.map((id) => <button type="button" aria-pressed={parallelismId === id} onClick={() => setParallelismId(id)} key={id}>{inferenceParallelism[id].label}</button>)}</div>
              <div data-control="precision" role="group" aria-label="Düşük hassasiyet formatı"><b>HASSASİYET</b>{INFERENCE_PRECISION_IDS.map((id) => <button type="button" aria-pressed={precisionId === id} onClick={() => setPrecisionId(id)} key={id}>{inferencePrecisions[id].label}</button>)}</div>
            </div>
            <article className="inference-decision-evidence" aria-live="polite" data-diagnosis={diagnosisId} data-graph={graphId} data-parallelism={parallelismId} data-precision={precisionId}>
              <div data-claim="diagnosis"><small>DARBOĞAZ AYRIMI</small><h3>{getInferenceDiagnosis(diagnosisId).bottleneck}</h3><p>{getInferenceDiagnosis(diagnosisId).signals.join(" · ")}</p><p>{getInferenceDiagnosis(diagnosisId).action}</p></div>
              <div data-claim="graph" data-source-id={getInferenceGraphPlan(graphId).sourceId} data-maturity={getInferenceGraphPlan(graphId).maturity}><small>{getInferenceGraphPlan(graphId).maturity === "current" ? "GÜNCEL" : "ÖNİZLEME"} · {getInferenceGraphPlan(graphId).backend} / {getInferenceGraphPlan(graphId).capture}</small><p>{getInferenceGraphPlan(graphId).note}</p></div>{getInferenceGraphPlan(graphId).mechanism && <div data-claim="graph-mechanism" data-source-id={getInferenceGraphPlan(graphId).mechanismSourceId} data-maturity="current"><small>ALT API MEKANİZMASI · AMD HIP</small><p>{getInferenceGraphPlan(graphId).mechanism}</p></div>}
              <div data-claim="parallelism" data-source-id={getInferenceParallelismPlan(parallelismId).sourceId} data-maturity={getInferenceParallelismPlan(parallelismId).maturity}><small>{getInferenceParallelismPlan(parallelismId).maturity === "preview" ? "ÖNİZLEME" : "GÜNCEL"}</small><p>{getInferenceParallelismPlan(parallelismId).note}</p>{!getInferenceParallelismPlan(parallelismId).coreCompletion && <p><b>Bu Önizleme yolu temel tamamlanma koşulu değildir.</b></p>}</div>
              <div data-claim="precision" data-source-id={getInferencePrecisionPlan(precisionId).sourceId} data-source-ids={getInferencePrecisionPlan(precisionId).sourceIds.join(" ")} data-maturity={getInferencePrecisionPlan(precisionId).maturity}><small>DONANIM · BACKEND · ÖLÇEK · BİRİKİM · KALİTE</small><p><b>Donanım:</b> {getInferencePrecisionPlan(precisionId).hardware}</p><p><b>Backend:</b> {getInferencePrecisionPlan(precisionId).backend}</p><p><b>Ölçek:</b> {getInferencePrecisionPlan(precisionId).scaleRepresentation}</p><p><b>Birikim:</b> {getInferencePrecisionPlan(precisionId).accumulation}</p><p><b>Kalite:</b> {getInferencePrecisionPlan(precisionId).qualityGuardrail}</p></div>
              <div data-source-id="vllm-disaggregated-encoder" data-maturity="current"><small>AYRIŞTIRILMIŞ SUNUM</small><p>Encode, prefill ve decode ayrı instance'larda ölçeklenebilir; KV/encoder aktarım süresi ağ tanısına aittir.</p></div>
              <div data-claim="speculative-acceptance" data-source-id={getInferenceSpeculativeBoundary().acceptanceSourceId} data-maturity="preview"><small>ÖNİZLEME · METRİK ŞEMASI DENEYSEL</small><p>Kabul oranı: {getInferenceSpeculativeBoundary().acceptanceRate}.</p></div><div data-claim="draft-cost" data-evidence-kind={getInferenceSpeculativeBoundary().draftCostEvidenceKind}><small>EĞİTSEL KARAR GİRDİSİ</small><p>Taslak maliyeti: {getInferenceSpeculativeBoundary().draftCost}</p></div>
            <p className="inference-evidence-caveat"><b>Bu karar modeli ölçülmüş donanım kanıtı değildir.</b> TTFT, ITL, iş hacmi ve VRAM sonuçlarını gerçek iş yüküyle yeniden ölç.</p>
          </article>
          <aside data-source-id="vllm-context-parallel" data-maturity="preview">Bağlam paralelliği · ÖNİZLEME · temel tamamlanma koşulu değildir.</aside>
        </section>

          <section className="lesson graphs-section" id="graphs">
            <div className="section-index">02 / CUDA GRAPHS</div>
            <div className="section-heading"><h2>Bir kez yakala.<br />Defalarca replay et.</h2><p>Normal eager akışta CPU her kernel için hazırlık ve launch işi yapar. CUDA Graphs, tekrarlanan GPU operasyonlarını bağımlılıklarıyla kaydeder; instantiate eder ve tek bir replay çağrısıyla yeniden yürütür.</p></div>
            <div className="compare-board">
              <div className="compare-lane"><span>ANLIK / HER ADIM</span><div className="kernel-row">{["LN", "QKV", "ATTN", "MLP", "SAMPLE"].map((k) => <b key={k}>{k}</b>)}</div><small>CPU → launch → CPU → launch → CPU → launch…</small></div>
              <div className="compare-lane graph"><span>GRAPH / YENİDEN OYNATMA</span><div className="graph-capsule"><b>cudaGraphLaunch()</b><i>LN</i><i>QKV</i><i>ATTN</i><i>MLP</i><i>SAMPLE</i></div><small>Önceden tanımlı bağımlılık grafiği</small></div>
            </div>
            <div className="rule-grid">
              <div><span>01</span><h3>Shape kararlı olmalı</h3><p>Captured graph belirli shape ve adres varsayımlarına bağlıdır. Serving sistemleri farklı batch boyutları için graph havuzu ve padding kullanabilir.</p></div>
              <div><span>02</span><h3>Adresler kararlı olmalı</h3><p>Girdi verisi static buffer'a kopyalanır; replay aynı sanal adresleri kullanır. Dynamic allocation capture sınırlarını zorlar.</p></div>
              <div><span>03</span><h3>Warm-up önce gelir</h3><p>Lazy init, autotune ve kütüphane hazırlıkları capture dışında tamamlanır. İlk çağrı maliyetini steady-state ile karıştırma.</p></div>
            </div>
            <div className="graph-lab">
              <div className="graph-lab-copy"><span>LAB / 02</span><h3>Amortismanı gör</h3><p>Replay sayısı yükseldikçe bir defalık capture/instantiate maliyeti daha çok çağrıya yayılır.</p><label htmlFor="replays">REPLAY SAYISI <b>{replays}</b></label><input id="replays" type="range" min="10" max="500" step="10" value={replays} onChange={(e) => setReplays(Number(e.target.value))} /></div>
              <div className="cost-chart" aria-label="Eager ve graph toplam launch maliyeti karşılaştırması">
                <div><span>EAGER</span><i style={{ width: `${Math.min(100, eagerCost / 120)}%` }} /><b>{eagerCost.toFixed(0)} birim</b></div>
                <div><span>GRAPH</span><i className="graph-bar" style={{ width: `${Math.min(100, graphCost / 120)}%` }} /><b>{graphCost.toFixed(0)} birim</b></div>
                <strong>≈ %{graphSaving} DAHA AZ LAUNCH MALİYETİ</strong>
              </div>
            </div>
          </section>

          <section className="lesson" id="quantization">
            <div className="section-index">03 / QUANTIZATION</div>
            <div className="section-heading"><h2>Az bit, tek başına hızlı demek değildir.</h2><p>Nicemleme; ağırlıkların, aktivasyonların veya KV önbelleğinin sayısal temsilini daraltır. Sonuç, daha az bellek ve veri hareketi olabilir. Hız ancak donanımın ve kernel yolunun bu biçimi verimli çalıştırmasıyla gelir.</p></div>

            <div className="precision-stack">
              <div className="precision-head"><span>FORMAT</span><span>YAKLAŞIK WEIGHT BOYUTU*</span><span>ANA ÖDÜNLEŞİM</span></div>
              {[
                ["BF16", "16 bit", "1.00×", "Güçlü taban çizgisi", "100%"],
                ["FP8", "8 bit", "0.50×", "Donanım + scale yolu", "50%"],
                ["INT8", "8 bit", "0.50×", "Kernel desteğine bağlı", "50%"],
                ["INT4", "4 bit", "0.25×", "Kalite ve dequant maliyeti", "25%"],
              ].map(([name, bit, ratio, note, width]) => <div className="precision-row" key={name}><b>{name}<small>{bit}</small></b><div><i style={{ width }} /></div><strong>{ratio}</strong><span>{note}</span></div>)}
              <small className="footnote">* Yalnızca ağırlıkların teorik ham boyutu; metaveri, ölçek, dolgu, KV önbelleği ve çalışma zamanı alanı hariç.</small>
            </div>

            <div className="quant-tools">
              <div className="memory-calc">
                <span className="tool-label">LAB / 03 · WEIGHT HAFIZASI</span><h3>Modeli tart</h3>
                <label htmlFor="parameter-count">PARAMETRE <b>{params}B</b></label><input id="parameter-count" type="range" min="1" max="70" value={params} onChange={(e) => setParams(Number(e.target.value))} />
                <span className="tool-label">HASSASİYET</span><div className="segmented" role="group" aria-label="Ağırlık hassasiyeti">{[16, 8, 4].map((b) => <button type="button" aria-pressed={bits === b} className={bits === b ? "selected" : ""} onClick={() => setBits(b)} key={b}>{b}-BIT</button>)}</div>
                <div className="memory-output"><span>TEORİK AĞIRLIK BELLEĞİ</span><b>{weightMemory.toFixed(1)} <small>GB</small></b><p>GiB değil, ondalık GB yaklaşımıdır.</p></div>
              </div>
              <div className="decision-card">
                <span className="tool-label">KARAR ASİSTANI</span><h3>Önceliğin ne?</h3>
                <div className="goal-tabs" role="group" aria-label="Optimizasyon önceliği">{(["memory", "latency", "quality"] as QuantGoal[]).map((g) => <button type="button" aria-pressed={goal === g} onClick={() => setGoal(g)} className={goal === g ? "selected" : ""} key={g}>{g === "memory" ? "BELLEK" : g === "latency" ? "GECİKME" : "KALİTE"}</button>)}</div>
                <div className={`recommendation ${quantData[goal].accent}`}><span>{quantData[goal].eyebrow}</span><h4>{quantData[goal].title}</h4><p>{quantData[goal].copy}</p></div>
              </div>
            </div>
          </section>

          <section className="lesson optimization" id="optimization">
            <div className="section-index">04 / INFERENCE OPTİMİZASYONU</div>
            <div className="section-heading"><h2>Önce darboğaz.<br />Sonra kaldıraç.</h2><p>En hızlı yapılandırma evrensel değildir. Ön doldurma hesaba, kod çözme belleğe takılabilir; düşük trafikte gecikme, yüksek trafikte iş hacmi baskınlaşır. Her değişikliği hedef ölçüme bağla.</p></div>

            <div className="roofline-card">
              <div className="roof-copy"><span>SİSTEM HARİTASI</span><h3>İki farklı sıcak yol</h3><p><b>Prefill</b> çok token'ı paralel işler; büyük matris çarpımları compute kapasitesini kullanabilir. <b>Decode</b> her adımda ağırlıkları okuyup az token üretir; veri hareketi baskın olabilir.</p></div>
              <div className="axis-chart"><span className="y-label">PERF ↑</span><i className="roof" /><i className="prefill-dot"><em>PREFILL</em></i><i className="decode-dot"><em>DECODE</em></i><span className="x-label">ARITHMETIC INTENSITY →</span></div>
            </div>

            <div className="lever-table">
              <div className="lever-head"><span>KALDIRAÇ</span><span>HEDEF</span><span>RİSK / ÖLÇÜM</span></div>
              {[
                ["Continuous batching", "GPU doluluğu + throughput", "Queue time ve tail latency"],
                ["CUDA Graphs", "CPU launch overhead + ITL", "Capture kapsamı, shape padding"],
                ["Quantization", "VRAM + bandwidth", "Kalite, kernel ve dequant"],
                ["Prefix caching", "Tekrarlı prefill", "Hit rate + cache baskısı"],
                ["Speculative decoding", "Düşük/orta QPS ITL", "Acceptance rate + draft maliyeti"],
                ["Tensor parallel", "Modeli dağıtmak", "İletişim ve ölçekleme verimi"],
              ].map((row, i) => <div className="lever-row" key={row[0]}><b><span>{String(i + 1).padStart(2, "0")}</span>{row[0]}</b><p>{row[1]}</p><p>{row[2]}</p></div>)}
            </div>

            <div className="detective">
              <div className="detective-menu" role="group" aria-label="Gözlemlenen darboğaz"><span>LAB / 04</span><h3>Darboğaz dedektifi</h3><p>Gözlemlediğin ana semptomu seç.</p>{(Object.keys(bottlenecks) as Bottleneck[]).map((key) => <button type="button" aria-pressed={bottleneck === key} className={bottleneck === key ? "selected" : ""} onClick={() => setBottleneck(key)} key={key}>{bottlenecks[key].label}<span>→</span></button>)}</div>
              <div className="diagnosis" aria-live="polite"><span>OLASI TEŞHİS</span><h3>{bottlenecks[bottleneck].diagnosis}</h3><ol>{bottlenecks[bottleneck].actions.map((action) => <li key={action}>{action}</li>)}</ol><p>Tek bir metriğe bakarak kök neden ilan etme. GPU timeline, scheduler istatistikleri ve istem dağılımını birlikte incele.</p></div>
            </div>
          </section>

          <section className="lesson measurement" id="measurement">
            <div className="section-index">05 / ÖLÇÜM DİSİPLİNİ</div>
            <div className="section-heading"><h2>Kıyaslama, tek sayı değildir.</h2><p>Gecikme ve iş hacmi aynı deneyde bile farklı hikâyeler anlatır. Isınma, eşzamanlılık, istem/çıktı uzunluğu ve yüzdelikleri raporlanmayan sonuçlar taşınabilir değildir.</p></div>
            <div className="metric-grid">
              <article><span>TTFT</span><h3>İlk Belirtece Kadar Süre</h3><p>Kuyruk + prefill + ilk decode. Kullanıcının “cevap başladı” algısı.</p></article>
              <article><span>ITL</span><h3>Belirteçler Arası Gecikme</h3><p>Akış sırasında ardışık belirteçler arasındaki süre.</p></article>
              <article><span>TPOT</span><h3>Çıktı Belirteci Başına Süre</h3><p>İlk belirteç sonrası üretim süresinin çıktı belirteci sayısına oranı.</p></article>
              <article><span>TOK/S</span><h3>İş hacmi</h3><p>Birim zamanda sistemin tamamladığı girdi ve çıktı belirteci miktarı.</p></article>
            </div>
            <div className="benchmark-card">
              <div><span>ÜRETİM KONTROL LİSTESİ</span><h3>Tekrarlanabilir koşu</h3><p>Aynı model revizyonu, tokenizer ve örnekleme ayarları olmadan önce/sonra karşılaştırması güvenilir değildir.</p></div>
              <ul>
                <li><b>01</b> Model + quant yöntemi + revizyon</li>
                <li><b>02</b> GPU, sürücü, CUDA ve serving sürümü</li>
                <li><b>03</b> İstem/çıktı uzunluğu dağılımı</li>
                <li><b>04</b> QPS veya concurrency süpürmesi</li>
                <li><b>05</b> Warm-up ve ölçüm penceresi</li>
                <li><b>06</b> p50 / p95 / p99 + hata oranı</li>
                <li><b>07</b> Kalite ve doğruluk guardrail'i</li>
              </ul>
            </div>
          </section>

          <section className="quiz" id="quiz">
            <div className="quiz-intro"><span>BİLGİ KONTROLÜ</span><h2>Sistemi anladın mı?</h2><p>Üç kısa soruyla temel trade-off'ları doğrula.</p><div className="score"><b>{quizScore}</b><span>/ 3<br />DOĞRU</span></div></div>
            <div className="quiz-list">
              {quiz.map((item, qIndex) => <fieldset key={item.q}><legend><span>0{qIndex + 1}</span>{item.q}</legend>{item.options.map((option, oIndex) => {
                const selected = answers[qIndex] === oIndex;
                const answered = answers[qIndex] !== -1;
                const correct = oIndex === item.answer;
                return <button type="button" aria-pressed={selected} className={`${selected ? "selected" : ""} ${answered && selected ? (correct ? "correct" : "wrong") : ""}`} onClick={() => setAnswers((current) => current.map((a, i) => i === qIndex ? oIndex : a))} key={option}><span>{String.fromCharCode(65 + oIndex)}</span>{option}<b className="quiz-feedback" aria-live="polite" hidden={!answered || !selected}>{answered && selected ? (correct ? "DOĞRU" : "TEKRAR DÜŞÜN") : ""}</b></button>;
              })}</fieldset>)}
            </div>
          </section>

          <section className="sources">
            <div><span>KAYNAK MASASI</span><h2>Derine in.</h2></div>
            <div className="source-links">
              <a href="https://docs.vllm.ai/en/latest/" target="_blank" rel="noreferrer"><span>01</span><b>vLLM Documentation</b><ArrowIcon /></a>
              <a href="https://docs.vllm.ai/en/latest/configuration/optimization/" target="_blank" rel="noreferrer"><span>02</span><b>Optimization & Tuning</b><ArrowIcon /></a>
              <a href="https://docs.nvidia.com/cuda/cuda-programming-guide/04-special-topics/cuda-graphs.html" target="_blank" rel="noreferrer"><span>03</span><b>NVIDIA CUDA Graphs</b><ArrowIcon /></a>
              <a href="https://docs.vllm.ai/en/latest/features/quantization/" target="_blank" rel="noreferrer"><span>04</span><b>vLLM Quantization</b><ArrowIcon /></a>
            </div>
          </section>
          <p className="closing-note">ÖLÇ → TEŞHİS ET → DEĞİŞTİR → TEKRAR ÖLÇ</p>
        </div>
      </div>

    </section>
  );
}
