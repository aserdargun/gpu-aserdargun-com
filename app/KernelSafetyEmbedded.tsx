"use client";

import { useMemo, useState } from "react";

type Tool = "memcheck" | "racecheck" | "initcheck" | "synccheck";

const toolData: Record<Tool, { eyebrow: string; title: string; catches: string; misses: string; command: string; report: string[] }> = {
  memcheck: {
    eyebrow: "01 · önce bunu çalıştır",
    title: "memcheck",
    catches: "Global/local/shared bellek için sınır dışı ve hizasız erişimler; CUDA API hataları ve sızıntılar.",
    misses: "Thread'ler arası sıralama problemi veya yanlış ama geçerli sayısal sonuç.",
    command: "compute-sanitizer --tool memcheck ./build/vector_add",
    report: [
      "Invalid __global__ write of size 4 bytes",
      "at vector_add.cu:12 in vector_add(float*, ...)",
      "by thread (31,0,0) in block (4,0,0)",
      "Address 0x... is 4 bytes after a block of size 512",
    ],
  },
  racecheck: {
    eyebrow: "02 · veri yarışı",
    title: "racecheck",
    catches: "Shared memory üzerindeki RAW, WAR ve WAW hazard'ları; bazı asenkron kopya kullanım hataları.",
    misses: "Genel bellek sınır dışı erişimi. Bu nedenle önce memcheck çalıştırılır.",
    command: "compute-sanitizer --tool racecheck ./build/reduce",
    report: [
      "Race reported between Write access at reduce.cu:18",
      "and Read access at reduce.cu:21",
      "Current Value : 0x40000000, Incoming Value : 0x40400000",
      "Hazard: RAW · block (0,0,0)",
    ],
  },
  initcheck: {
    eyebrow: "03 · başlangıç durumu",
    title: "initcheck",
    catches: "Yazılmadan veya kopyalanmadan okunan aygıt genel belleği; isteğe bağlı olarak paylaşılan bellek.",
    misses: "Bellek sınırı hatası ve senkronizasyon ihlali. Önce memcheck ile temiz bir koşu gerekir.",
    command: "compute-sanitizer --tool initcheck ./build/stencil",
    report: [
      "Uninitialized __global__ memory read of size 4 bytes",
      "at stencil.cu:27 in update(float const*, float*)",
      "by thread (7,0,0) in block (2,0,0)",
      "Address 0x... is inside a 4096 byte allocation",
    ],
  },
  synccheck: {
    eyebrow: "04 · bariyer disiplini",
    title: "synccheck",
    catches: "__syncthreads(), __syncwarp() ve karşılık gelen Cooperative Groups ilkelinin geçersiz kullanımları.",
    misses: "Yanlış algoritma veya kayan nokta tolerans problemi. Bunları doğruluk testleri bulur.",
    command: "compute-sanitizer --tool synccheck ./build/scan",
    report: [
      "Barrier error detected. Divergent thread(s) in block",
      "at scan.cu:34 in block_scan(float*)",
      "by thread (17,0,0) in block (0,0,0)",
      "Barrier: __syncthreads() reached conditionally",
    ],
  },
};

const questions = [
  { q: "FP32 paralel reduction sonucu CPU referansından 2e-6 farklı. İlk doğru yaklaşım?", a: ["Bit-bit eşitlik istemek", "rtol/atol ile hata bütçesi tanımlamak", "memcheck çalıştırıp geçerse kabul etmek"], correct: 1 },
  { q: "Sınır dışı genel bellek yazımını hangi araç doğrudan yakalar?", a: ["racecheck", "synccheck", "memcheck"], correct: 2 },
  { q: "Kernel yalnızca N=1024 için doğru. En olası test açığı nedir?", a: ["Şekil ve sınır matrisi", "Daha düşük rtol", "Daha uzun benchmark"], correct: 0 },
  { q: "Koşullu __syncthreads() şüphesinde hangi sıra uygundur?", a: ["synccheck → profiler", "benchmark → initcheck", "racecheck → bit-bit kıyas"], correct: 0 },
];

const scenarios = [
  { name: "FP32 reduction", expected: 12.5, actual: 12.500012, atol: 1e-5, rtol: 1e-5 },
  { name: "Yanlış indeks", expected: 4, actual: 4.25, atol: 1e-5, rtol: 1e-5 },
  { name: "Sıfıra yakın", expected: 0.000001, actual: 0.000002, atol: 0.000002, rtol: 0 },
];

export default function KernelSafetyEmbedded() {
  const [tool, setTool] = useState<Tool>("memcheck");
  const [scenario, setScenario] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  const [lineInfo, setLineInfo] = useState(true);
  const [exitCode, setExitCode] = useState(true);
  const [copied, setCopied] = useState(false);
  const [menu, setMenu] = useState(false);

  const s = scenarios[scenario];
  const absoluteError = Math.abs(s.actual - s.expected);
  const threshold = s.atol + s.rtol * Math.abs(s.expected);
  const passes = absoluteError <= threshold;
  const score = useMemo(() => questions.reduce((sum, q, i) => sum + (answers[i] === q.correct ? 1 : 0), 0), [answers]);
  const command = `compute-sanitizer --tool ${tool}${lineInfo ? " --show-backtrace yes" : ""}${exitCode ? " --error-exitcode 99" : ""} ./build/kernel_tests`;

  const copyCommand = async () => {
    try { await navigator.clipboard.writeText(command); } catch { /* clipboard may be unavailable in preview */ }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <main className="kernel-safety-embed">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Kernel Güvenlik Laboratuvarı ana sayfa">
          <span className="brand-mark">K<span>✓</span></span>
          <span><b>KERNEL GÜVENLİK</b><small>doğruluk laboratuvarı</small></span>
        </a>
        <nav className={menu ? "nav open" : "nav"} aria-label="Ana menü">
          <a href="#dogruluk" onClick={() => setMenu(false)}>Doğruluk</a>
          <a href="#sanitizer" onClick={() => setMenu(false)}>Sanitizer</a>
          <a href="#is-akisi" onClick={() => setMenu(false)}>İş akışı</a>
          <a href="#sinav" onClick={() => setMenu(false)}>Sınav</a>
        </nav>
        <div className="top-actions">
          <span className="status"><i /> CUDA ARAÇ KİTİ</span>
          <button className="menu-button" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label="Menüyü aç">≡</button>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="kicker"><span>GPU KERNEL MÜHENDİSLİĞİ</span><i /> MODÜL 03</div>
          <h1>Hızlı olması yetmez.<br /><em>Doğru</em> olduğunu kanıtla.</h1>
          <p>GPU kernel doğruluğunu; referans uygulama, tolerans matrisi, uç durumlar ve NVIDIA Compute Sanitizer ile sistematik biçimde test etmeyi öğren.</p>
          <div className="hero-actions">
            <a className="primary" href="#dogruluk">Laboratuvara başla <span>↓</span></a>
            <a className="text-link" href="#is-akisi">7 adımlı kontrol listesi →</a>
          </div>
        </div>
        <div className="hero-terminal" aria-label="Örnek başarılı test çıktısı">
          <div className="terminal-head"><span><i /><i /><i /></span><code>kernel_tests — zsh</code><b>GEÇTİ</b></div>
          <pre><span className="muted">$</span> pytest tests/test_rmsnorm.py -q{`\n`}
<span className="cyan">test_forward_fp32</span>      <span className="green">GEÇTİ</span>{`\n`}
<span className="cyan">test_odd_shapes</span>         <span className="green">GEÇTİ</span>{`\n`}
<span className="cyan">test_noncontiguous</span>      <span className="green">GEÇTİ</span>{`\n`}
<span className="cyan">test_extreme_values</span>     <span className="green">GEÇTİ</span>{`\n\n`}
<span className="muted">$</span> compute-sanitizer --tool memcheck ...{`\n`}
========= <span className="green">ERROR SUMMARY: 0 errors</span></pre>
          <div className="terminal-foot"><span>14 test</span><span>0 hata</span><span>2.81s</span></div>
        </div>
      </section>

      <section className="concept-strip" aria-label="Üç doğruluk katmanı">
        <article><span>01</span><div><b>SAYISAL</b><p>Referansa yeterince yakın mı?</p></div></article>
        <article><span>02</span><div><b>BELLEK</b><p>Her erişim geçerli ve başlatılmış mı?</p></div></article>
        <article><span>03</span><div><b>EŞZAMANLILIK</b><p>Thread sırası sonucu değiştirebilir mi?</p></div></article>
      </section>

      <section className="section" id="dogruluk">
        <div className="section-title">
          <div><span className="chapter">BÖLÜM 01</span><h2>Doğruluk testi bir <em>karşılaştırma sözleşmesidir</em></h2></div>
          <p>“Çalıştı” yalnızca crash olmadığını söyler. “Doğru” demek için beklenen davranışı ve kabul sınırını önce tanımlarsın.</p>
        </div>

        <div className="contract-grid">
          <article className="lesson-card"><span className="card-no">A</span><h3>Referans</h3><p>Basit, okunabilir ve bağımsız bir CPU/PyTorch uygulaması. Performans değil güvenilirlik için yazılır.</p><code>expected = torch_rmsnorm(x, w)</code></article>
          <article className="lesson-card"><span className="card-no">B</span><h3>Gözlenen</h3><p>Aynı girdiyi, dtype’ı ve semantiği kullanan CUDA/Triton kernel çıktısı.</p><code>actual = custom_kernel(x, w)</code></article>
          <article className="lesson-card accent"><span className="card-no">C</span><h3>Karar kuralı</h3><p>Mutlak ve bağıl toleransı birlikte kullan. Büyük ve sıfıra yakın değerleri aynı sözleşme kapsar.</p><code>|a-b| ≤ atol + rtol × |b|</code></article>
        </div>

        <div className="lab-grid">
          <article className="tolerance-lab">
            <div className="lab-head"><div><span>ETKİLEŞİMLİ LAB</span><h3>Tolerans kararını gör</h3></div><b className={passes ? "pass-badge" : "fail-badge"}>{passes ? "PASS" : "FAIL"}</b></div>
            <div className="scenario-tabs" role="tablist" aria-label="Test senaryoları">
              {scenarios.map((item, i) => <button role="tab" aria-selected={scenario === i} className={scenario === i ? "active" : ""} key={item.name} onClick={() => setScenario(i)}>{item.name}</button>)}
            </div>
            <div className="number-pair">
              <label>REFERANS <output>{s.expected}</output></label>
              <label>KERNEL <output>{s.actual}</output></label>
            </div>
            <div className="error-track"><span style={{ width: `${Math.min(100, (absoluteError / Math.max(threshold, 1e-12)) * 50)}%` }} /></div>
            <div className="formula-row">
              <div><small>GÖZLENEN HATA</small><b>{absoluteError.toExponential(2)}</b></div>
              <span>{passes ? "≤" : ">"}</span>
              <div><small>İZİN VERİLEN</small><b>{threshold.toExponential(2)}</b></div>
            </div>
            <p className="lab-note">{passes ? "Fark, tanımlı hata bütçesinin içinde. Bu test geçer; yine de Sanitizer kontrolleri gerekir." : "Fark, toleransla açıklanamayacak kadar büyük. İndeksleme, reduction sırası veya dtype dönüşümünü incele."}</p>
          </article>

          <aside className="matrix-card">
            <span className="mini-label">MİNİMUM TEST MATRİSİ</span>
            <h3>Tek bir “mutlu yol” yetmez</h3>
            <ul>
              <li><b>Şekil:</b> 0/1, asal boyut, warp sınırı −1/+1</li>
              <li><b>Yerleşim:</b> contiguous, transposed, sliced</li>
              <li><b>Değer:</b> sıfır, negatif, çok küçük/büyük, NaN/Inf politikası</li>
              <li><b>Tip:</b> FP32, FP16/BF16 ve birikim dtype’ı</li>
              <li><b>Başlatma:</b> farklı seed’ler ve tekrar koşuları</li>
              <li><b>Koruma:</b> çıktı sentinel’ları, input değişmezliği</li>
            </ul>
            <div className="warning"><b>!</b><p><strong>Önemli ayrım</strong>allclose sonucu semantik doğruluğu ölçer; bellek güvenliğini kanıtlamaz.</p></div>
          </aside>
        </div>
      </section>

      <section className="sanitizer-section" id="sanitizer">
        <div className="section-title light">
          <div><span className="chapter">BÖLÜM 02</span><h2>Compute Sanitizer: <em>dört ayrı dedektör</em></h2></div>
          <p>Her araç farklı bir hata sınıfına bakar. Temiz bir memcheck koşusu, diğer araçların ön koşuludur; hepsinin temiz olması yine de matematiksel doğruluğu garanti etmez.</p>
        </div>
        <div className="tool-shell">
          <div className="tool-tabs" role="tablist" aria-label="Compute Sanitizer araçları">
            {(Object.keys(toolData) as Tool[]).map((key) => <button key={key} role="tab" aria-selected={tool === key} className={tool === key ? "active" : ""} onClick={() => setTool(key)}><span>{toolData[key].eyebrow}</span>{key}</button>)}
          </div>
          <div className="tool-body">
            <div className="tool-explain">
              <span className="mini-label">{toolData[tool].eyebrow}</span>
              <h3>{toolData[tool].title}</h3>
              <div className="explain-row"><b className="good">YAKALAR</b><p>{toolData[tool].catches}</p></div>
              <div className="explain-row"><b className="bad">YAKALAMAZ</b><p>{toolData[tool].misses}</p></div>
              <div className="code-line"><code>{toolData[tool].command}</code></div>
            </div>
            <div className="report-window">
              <div className="report-head"><span>compute-sanitizer report</span><b>örnek çıktı</b></div>
              <pre>{toolData[tool].report.map((line, i) => <span key={line} className={i === 0 ? "report-error" : ""}>========= {line}{`\n`}</span>)}</pre>
              <div className="report-summary">========= ERROR SUMMARY: <b>1 error</b></div>
            </div>
          </div>
        </div>

        <article className="command-builder">
          <div><span className="mini-label">KOMUT OLUŞTURUCU</span><h3>CI için tekrarlanabilir bir koşu üret</h3></div>
          <div className="toggles">
            <label><input type="checkbox" checked={lineInfo} onChange={(e) => setLineInfo(e.target.checked)} /><span /> Backtrace göster</label>
            <label><input type="checkbox" checked={exitCode} onChange={(e) => setExitCode(e.target.checked)} /><span /> Hatada exit 99</label>
          </div>
          <div className="generated-command"><code>{command}</code><button onClick={copyCommand}>{copied ? "Kopyalandı ✓" : "Kopyala"}</button></div>
          <p><b>Derleme notu:</b> Kaynak satırı eşlemesi için debug build yerine genellikle <code>-lineinfo</code> ekle; optimizasyon davranışını korurken raporu okunur kılar.</p>
        </article>
      </section>

      <section className="workflow section" id="is-akisi">
        <div className="section-title">
          <div><span className="chapter">BÖLÜM 03</span><h2>Bir kernel’i kabul etmeden önce <em>kanıt zinciri</em></h2></div>
          <p>Bu sıra hata ayıklama alanını daraltır: önce semantik sözleşme, sonra bellek ve eşzamanlılık, en son performans.</p>
        </div>
        <ol className="steps">
          {[
            ["Sözleşmeyi yaz", "Şekil, dtype, broadcasting, NaN/Inf ve aliasing davranışı açık olsun."],
            ["Bağımsız referans kur", "Yavaş ama anlaşılır CPU/PyTorch yolu; kernel kodunu kopyalama."],
            ["Test matrisini tara", "Sınırlar, asal boyutlar, farklı stride’lar, uç değerler ve seed’ler."],
            ["memcheck ile temizle", "Sınır dışı/hizasız erişim ve CUDA API hatalarını önce kaldır."],
            ["race + init + sync tara", "Shared hazard, başlatılmamış okuma ve bariyer ihlallerini ayır."],
            ["Tekrarlanabilirliği zorla", "Aynı girdiyi birçok kez çalıştır; nondeterministik sapmayı görünür yap."],
            ["Sonra benchmark et", "Isınma, senkronizasyon, dağılım ve farklı şekillerle performansı ölç."],
          ].map((step, i) => <li key={step[0]}><span>{String(i + 1).padStart(2, "0")}</span><div><b>{step[0]}</b><p>{step[1]}</p></div>{i < 6 && <i>↓</i>}</li>)}
        </ol>
        <div className="acceptance">
          <div><span>BİRLEŞTİRME KAPISI</span><h3>“Hızlandı” tek başına kabul ölçütü değildir.</h3></div>
          <div className="gate-list"><span>✓ referans karşılaştırması</span><span>✓ uç durum matrisi</span><span>✓ 0 sanitizer hatası</span><span>✓ performans dağılımı</span></div>
        </div>
      </section>

      <section className="quiz-section" id="sinav">
        <div className="quiz-intro"><span className="chapter">BÖLÜM 04</span><h2>Hazır mısın?<br /><em>Karar ver.</em></h2><p>Dört kısa senaryo. Amaç komut ezberlemek değil, doğru kanıt aracını seçmek.</p>{checked && <div className="score"><b>{score}/4</b><span>{score === 4 ? "Kernel reviewer modu açıldı." : "Yanıtları incele, sonra tekrar dene."}</span></div>}</div>
        <div className="questions">
          {questions.map((q, qi) => <fieldset key={q.q}><legend><span>{qi + 1}</span>{q.q}</legend>{q.a.map((answer, ai) => <label key={answer} className={checked ? (ai === q.correct ? "correct" : answers[qi] === ai ? "wrong" : "") : ""}><input type="radio" name={`q-${qi}`} checked={answers[qi] === ai} onChange={() => { setAnswers({ ...answers, [qi]: ai }); setChecked(false); }} /><i />{answer}</label>)}</fieldset>)}
          <button className="quiz-button" disabled={Object.keys(answers).length !== questions.length} onClick={() => setChecked(true)}>Yanıtları değerlendir <span>→</span></button>
        </div>
      </section>

      <footer>
        <div className="brand footer-brand"><span className="brand-mark">K<span>✓</span></span><span><b>KERNEL GÜVENLİK</b><small>doğruluk laboratuvarı</small></span></div>
        <p>Kaynak: <a href="https://docs.nvidia.com/compute-sanitizer/ComputeSanitizer/index.html" target="_blank" rel="noreferrer">NVIDIA Compute Sanitizer</a> · <a href="https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/" target="_blank" rel="noreferrer">CUDA Best Practices</a></p>
        <span className="footer-note">ÖĞREN · TEST ET · KANITLA</span>
      </footer>
    </main>
  );
}
