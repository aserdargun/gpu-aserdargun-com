"use client";

import { useMemo, useState } from "react";

type QuantGoal = "memory" | "latency" | "quality";
type Bottleneck = "ttft" | "itl" | "oom" | "gpu";

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
    diagnosis: "Prefill, kuyruk veya uzun prompt yolu baskın olabilir.",
    actions: ["Prompt uzunluğunu ve queue time'ı ayır", "Prefix cache isabetini ölç", "Chunked prefill bütçesini süpür"],
  },
  itl: {
    label: "ITL yüksek",
    diagnosis: "Decode adımları bellek bant genişliğine veya küçük-batch launch maliyetine takılıyor olabilir.",
    actions: ["CUDA Graphs kapsamını kontrol et", "Decode batch dağılımını ölç", "KV cache dtype ve attention backend'i karşılaştır"],
  },
  oom: {
    label: "KV cache OOM",
    diagnosis: "Ağırlıklar değil, eşzamanlı token sayısı ve KV blokları sınır olabilir.",
    actions: ["max_model_len ve max_num_seqs'i düşür", "KV cache kapasitesini blok bazında izle", "KV cache quantization uygunluğunu doğrula"],
  },
  gpu: {
    label: "GPU düşük kullanım",
    diagnosis: "İstek gelişi, CPU scheduling, ağ veya küçük batch GPU'yu aç bırakıyor olabilir.",
    actions: ["Concurrency süpürmesi yap", "CPU ve tokenizer zamanını profile et", "Continuous batching ve async scheduling'i incele"],
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
    <main className="inference-systems-embed">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Inference Systems Lab ana sayfa">
          <span className="brand-mark">IS</span>
          <span>INFERENCE SYSTEMS LAB</span>
        </a>
        <nav className="desktop-nav" aria-label="Ana navigasyon">
          <a href="#vllm">Konular</a>
          <a href="#labs">Laboratuvar</a>
          <a href="#measurement">Ölçüm</a>
        </nav>
        <a className="status-pill" href="#quiz"><span /> KENDİNİ TEST ET</a>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="kicker"><span>GPU INFERENCE / 2026</span><span>ETKİLEŞİMLİ REHBER</span></div>
          <h1>DAHA ÇOK<br />TOKEN.<br /><em>DAHA AZ</em><br />BEKLEME.</h1>
          <p className="hero-intro">vLLM'in scheduler'ından CUDA Graphs replay'e, 4-bit ağırlıklardan üretim benchmark'ına kadar modern LLM serving sistemini katman katman keşfet.</p>
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
          <div className="token-stream"><span>OUTPUT</span><b>▮</b><b>▮</b><b>▮</b><b className="hot">▮</b><small>+1 TOKEN</small></div>
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
              <p>vLLM, değişken uzunluktaki istekleri sürekli bir GPU iş akışına dönüştürür. Kazanç tek bir kernel'dan değil; scheduling, KV cache ve execution katmanlarının birlikte çalışmasından gelir.</p>
            </div>

            <div className="pipeline">
              <div className="pipe-node"><span>01</span><b>API SERVER</b><small>OpenAI uyumlu istek</small></div>
              <div className="pipe-arrow">→</div>
              <div className="pipe-node active"><span>02</span><b>SCHEDULER</b><small>Token bütçesi + sıra</small></div>
              <div className="pipe-arrow">→</div>
              <div className="pipe-node"><span>03</span><b>MODEL RUNNER</b><small>Forward + sampling</small></div>
              <div className="pipe-arrow">→</div>
              <div className="pipe-node"><span>04</span><b>STREAM</b><small>Token yanıtı</small></div>
            </div>

            <div className="concept-grid">
              <article><span className="concept-tag">PAGED ATTENTION</span><h3>KV cache'i bloklara ayırır</h3><p>Her isteğe büyük ve bitişik alan ayırmak yerine sabit boyutlu bloklarla çalışır. Böylece parçalanma azalır, istekler büyüdükçe bloklar eklenebilir.</p><div className="block-viz">{Array.from({ length: 18 }).map((_, i) => <i className={i % 5 === 4 ? "gap" : i < 13 ? "used" : ""} key={i} />)}</div></article>
              <article><span className="concept-tag">CONTINUOUS BATCHING</span><h3>Batch, istek bitmesini beklemez</h3><p>Her decode adımında tamamlanan istek çıkar, bekleyen istek girebilir. Statik batch'in “en yavaşı bekle” maliyetini azaltır.</p><div className="timeline-viz"><i style={{ width: "82%" }} /><i style={{ width: "48%" }} /><i style={{ width: "68%" }} /><i className="new" style={{ width: "31%" }} /></div></article>
              <article><span className="concept-tag">CHUNKED PREFILL</span><h3>Uzun prompt'u dilimler</h3><p>Compute-ağırlıklı prefill parçalarını memory-ağırlıklı decode işleriyle aynı adımda planlayabilir. Token bütçesi, TTFT–ITL dengesinin ana düğmelerinden biridir.</p><div className="chunk-viz"><i /><i /><i /><b>D</b><b>D</b><i /></div></article>
              <article><span className="concept-tag">PREFIX CACHING</span><h3>Ortak başlangıcı yeniden kullanır</h3><p>Aynı sistem prompt'u veya paylaşılan bağlam tekrar geldiğinde eşleşen KV blokları yeniden hesaplanmaz. En büyük değer tekrarlı prefix iş yüklerinde oluşur.</p><div className="prefix-viz"><span>SYSTEM</span><span>POLICY</span><b>USER A</b><b>USER B</b></div></article>
            </div>
          </section>

          <section className="lab-panel" id="labs">
            <div className="lab-header"><div><span>LAB / 01</span><h2>Serving kaldıracı simülatörü</h2></div><p>Pedagojik model · gerçek benchmark değildir</p></div>
            <div className="lab-body">
              <div className="controls">
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
                <div className="result-metric"><span>TAHMİNİ THROUGHPUT</span><b>{serving.throughput}</b><small>tok/s</small></div>
                <div className="result-metric"><span>TAHMİNİ TTFT</span><b>{serving.ttft}</b><small>ms</small></div>
                <div className="mini-bars"><span style={{ height: `${Math.min(100, serving.throughput)}%` }} /><span style={{ height: `${Math.min(100, serving.ttft / 12)}%` }} /></div>
                <p>Bu sonuç yalnızca yönü anlatır. Gerçek değer; model, GPU, prompt dağılımı, concurrency ve sürümle değişir.</p>
              </div>
            </div>
          </section>

          <section className="lesson graphs-section" id="graphs">
            <div className="section-index">02 / CUDA GRAPHS</div>
            <div className="section-heading"><h2>Bir kez yakala.<br />Defalarca replay et.</h2><p>Normal eager akışta CPU her kernel için hazırlık ve launch işi yapar. CUDA Graphs, tekrarlanan GPU operasyonlarını bağımlılıklarıyla kaydeder; instantiate eder ve tek bir replay çağrısıyla yeniden yürütür.</p></div>
            <div className="compare-board">
              <div className="compare-lane"><span>EAGER / HER ADIM</span><div className="kernel-row">{["LN", "QKV", "ATTN", "MLP", "SAMPLE"].map((k) => <b key={k}>{k}</b>)}</div><small>CPU → launch → CPU → launch → CPU → launch…</small></div>
              <div className="compare-lane graph"><span>GRAPH / REPLAY</span><div className="graph-capsule"><b>cudaGraphLaunch()</b><i>LN</i><i>QKV</i><i>ATTN</i><i>MLP</i><i>SAMPLE</i></div><small>Önceden tanımlı bağımlılık grafiği</small></div>
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
            <div className="section-heading"><h2>Az bit, tek başına hızlı demek değildir.</h2><p>Quantization ağırlıkların, aktivasyonların veya KV cache'in sayısal temsilini daraltır. Sonuç; daha az bellek ve veri hareketi olabilir. Hız ancak donanımın ve kernel yolunun bu formatı verimli çalıştırmasıyla gelir.</p></div>

            <div className="precision-stack">
              <div className="precision-head"><span>FORMAT</span><span>YAKLAŞIK WEIGHT BOYUTU*</span><span>ANA TRADE-OFF</span></div>
              {[
                ["BF16", "16 bit", "1.00×", "Güçlü taban çizgisi", "100%"],
                ["FP8", "8 bit", "0.50×", "Donanım + scale yolu", "50%"],
                ["INT8", "8 bit", "0.50×", "Kernel desteğine bağlı", "50%"],
                ["INT4", "4 bit", "0.25×", "Kalite ve dequant maliyeti", "25%"],
              ].map(([name, bit, ratio, note, width]) => <div className="precision-row" key={name}><b>{name}<small>{bit}</small></b><div><i style={{ width }} /></div><strong>{ratio}</strong><span>{note}</span></div>)}
              <small className="footnote">* Yalnızca ağırlıkların teorik ham boyutu; metadata, scale, padding, KV cache ve runtime workspace hariç.</small>
            </div>

            <div className="quant-tools">
              <div className="memory-calc">
                <span className="tool-label">LAB / 03 · WEIGHT HAFIZASI</span><h3>Modeli tart</h3>
                <label>PARAMETRE <b>{params}B</b></label><input type="range" min="1" max="70" value={params} onChange={(e) => setParams(Number(e.target.value))} />
                <label>PRECISION</label><div className="segmented">{[16, 8, 4].map((b) => <button type="button" className={bits === b ? "selected" : ""} onClick={() => setBits(b)} key={b}>{b}-BIT</button>)}</div>
                <div className="memory-output"><span>TEORİK WEIGHT BELLEĞİ</span><b>{weightMemory.toFixed(1)} <small>GB</small></b><p>GiB değil, ondalık GB yaklaşımıdır.</p></div>
              </div>
              <div className="decision-card">
                <span className="tool-label">KARAR ASİSTANI</span><h3>Önceliğin ne?</h3>
                <div className="goal-tabs">{(["memory", "latency", "quality"] as QuantGoal[]).map((g) => <button type="button" onClick={() => setGoal(g)} className={goal === g ? "selected" : ""} key={g}>{g === "memory" ? "BELLEK" : g === "latency" ? "GECİKME" : "KALİTE"}</button>)}</div>
                <div className={`recommendation ${quantData[goal].accent}`}><span>{quantData[goal].eyebrow}</span><h4>{quantData[goal].title}</h4><p>{quantData[goal].copy}</p></div>
              </div>
            </div>
          </section>

          <section className="lesson optimization" id="optimization">
            <div className="section-index">04 / INFERENCE OPTİMİZASYONU</div>
            <div className="section-heading"><h2>Önce darboğaz.<br />Sonra kaldıraç.</h2><p>En hızlı konfigürasyon evrensel değildir. Prefill compute-bound, decode memory-bound olabilir; düşük trafikte latency, yüksek trafikte throughput baskınlaşır. Her değişikliği hedef metriğe bağla.</p></div>

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
              <div className="detective-menu"><span>LAB / 04</span><h3>Darboğaz dedektifi</h3><p>Gözlemlediğin ana semptomu seç.</p>{(Object.keys(bottlenecks) as Bottleneck[]).map((key) => <button type="button" className={bottleneck === key ? "selected" : ""} onClick={() => setBottleneck(key)} key={key}>{bottlenecks[key].label}<span>→</span></button>)}</div>
              <div className="diagnosis"><span>OLASI TEŞHİS</span><h3>{bottlenecks[bottleneck].diagnosis}</h3><ol>{bottlenecks[bottleneck].actions.map((action) => <li key={action}>{action}</li>)}</ol><p>Tek bir metriğe bakarak kök neden ilan etme. GPU timeline, scheduler istatistikleri ve istem dağılımını birlikte incele.</p></div>
            </div>
          </section>

          <section className="lesson measurement" id="measurement">
            <div className="section-index">05 / ÖLÇÜM DİSİPLİNİ</div>
            <div className="section-heading"><h2>Benchmark, tek sayı değildir.</h2><p>Latency ve throughput aynı deneyde bile farklı hikâyeler anlatır. Warm-up, concurrency, prompt/output uzunluğu ve yüzdelikleri raporlanmayan sonuçlar taşınabilir değildir.</p></div>
            <div className="metric-grid">
              <article><span>TTFT</span><h3>Time to First Token</h3><p>Kuyruk + prefill + ilk decode. Kullanıcının “cevap başladı” algısı.</p></article>
              <article><span>ITL</span><h3>Inter-token Latency</h3><p>Streaming sırasında ardışık token'lar arasındaki süre.</p></article>
              <article><span>TPOT</span><h3>Time per Output Token</h3><p>İlk token sonrası üretim süresinin output token sayısına oranı.</p></article>
              <article><span>TOK/S</span><h3>Throughput</h3><p>Birim zamanda sistemin tamamladığı input/output token miktarı.</p></article>
            </div>
            <div className="benchmark-card">
              <div><span>ÜRETİM CHECKLIST</span><h3>Tekrarlanabilir koşu</h3><p>Aynı model revizyonu, tokenizer ve sampling ayarları olmadan önce/sonra karşılaştırması güvenilir değildir.</p></div>
              <ul>
                <li><b>01</b> Model + quant yöntemi + revizyon</li>
                <li><b>02</b> GPU, sürücü, CUDA ve serving sürümü</li>
                <li><b>03</b> Prompt/output uzunluğu dağılımı</li>
                <li><b>04</b> QPS veya concurrency süpürmesi</li>
                <li><b>05</b> Warm-up ve ölçüm penceresi</li>
                <li><b>06</b> p50 / p95 / p99 + hata oranı</li>
                <li><b>07</b> Kalite ve doğruluk guardrail'i</li>
              </ul>
            </div>
          </section>

          <section className="quiz" id="quiz">
            <div className="quiz-intro"><span>KNOWLEDGE CHECK</span><h2>Sistemi anladın mı?</h2><p>Üç kısa soruyla temel trade-off'ları doğrula.</p><div className="score"><b>{quizScore}</b><span>/ 3<br />DOĞRU</span></div></div>
            <div className="quiz-list">
              {quiz.map((item, qIndex) => <fieldset key={item.q}><legend><span>0{qIndex + 1}</span>{item.q}</legend>{item.options.map((option, oIndex) => {
                const selected = answers[qIndex] === oIndex;
                const answered = answers[qIndex] !== -1;
                const correct = oIndex === item.answer;
                return <button type="button" className={`${selected ? "selected" : ""} ${answered && selected ? (correct ? "correct" : "wrong") : ""}`} onClick={() => setAnswers((current) => current.map((a, i) => i === qIndex ? oIndex : a))} key={option}><span>{String.fromCharCode(65 + oIndex)}</span>{option}{answered && selected && <b>{correct ? "DOĞRU" : "TEKRAR DÜŞÜN"}</b>}</button>;
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
        </div>
      </div>

      <footer><a className="brand" href="#top"><span className="brand-mark">IS</span><span>INFERENCE SYSTEMS LAB</span></a><p>ÖLÇ → TEŞHİS ET → DEĞİŞTİR → TEKRAR ÖLÇ</p><a href="#top">BAŞA DÖN ↑</a></footer>
    </main>
  );
}

