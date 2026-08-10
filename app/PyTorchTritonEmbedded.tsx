"use client";

import { useEffect, useMemo, useState } from "react";

const weeks = [
  { id: 1, title: "Tensor anatomisi", eyebrow: "Temel", desc: "Stride, layout ve eager yürütmeyi çıplak gözle gör.", status: "done", minutes: 90, skills: ["stride", "broadcast", "profiling"] },
  { id: 2, title: "Custom operator", eyebrow: "PyTorch", desc: "torch.library ile şema, CPU referansı ve fake kernel kur.", status: "active", minutes: 120, skills: ["torch.library", "FakeTensor", "opcheck"] },
  { id: 3, title: "İlk Triton kernel", eyebrow: "Triton", desc: "Program ID, bloklar, maske ve coalesced erişim.", status: "next", minutes: 150, skills: ["tl.program_id", "mask", "BLOCK_SIZE"] },
  { id: 4, title: "Autograd + compile", eyebrow: "Entegrasyon", desc: "Geri yayılımı kaydet; torch.compile ile graph break avla.", status: "locked", minutes: 150, skills: ["register_autograd", "torch.compile", "AOT"] },
  { id: 5, title: "RMSNorm", eyebrow: "Operatör 01", desc: "Referanstan fused Triton kernel'e, üç şekil üzerinde ölç.", status: "locked", minutes: 180, skills: ["reduction", "numerics", "fusion"] },
  { id: 6, title: "RoPE", eyebrow: "Operatör 02", desc: "Half-split rotary embedding ve stride-aware indeksleme.", status: "locked", minutes: 180, skills: ["indexing", "vectorization", "backward"] },
  { id: 7, title: "SwiGLU", eyebrow: "Operatör 03", desc: "Aktivasyon ve çarpımı tek kernel'de birleştir.", status: "locked", minutes: 180, skills: ["fusion", "occupancy", "precision"] },
  { id: 8, title: "Masked softmax", eyebrow: "Operatör 04", desc: "Stabil reduction, maskeleme ve sınır durumları.", status: "locked", minutes: 210, skills: ["online softmax", "masking", "NaN"] },
  { id: 9, title: "KV-cache update", eyebrow: "Operatör 05", desc: "Paged bellek düzenine güvenli ve hızlı yazma.", status: "locked", minutes: 210, skills: ["scatter", "cache", "race"] },
  { id: 10, title: "Benchmark bilimi", eyebrow: "Performans", desc: "Isınma, quantile ve roofline ile dürüst kıyaslama.", status: "locked", minutes: 150, skills: ["triton.testing", "roofline", "Nsight"] },
  { id: 11, title: "Füzyon stüdyosu", eyebrow: "Optimizasyon", desc: "İki fused kernel'de en az %15 medyan iyileşme hedefle.", status: "locked", minutes: 240, skills: ["fusion", "register pressure", "autotune"] },
  { id: 12, title: "Inference capstone", eyebrow: "Mezuniyet", desc: "vLLM iş yükünde TTFT, ITL ve throughput raporu üret.", status: "locked", minutes: 300, skills: ["vLLM", "TTFT", "portfolio"] },
];

const customOpCode = `import torch
from torch.library import custom_op

@custom_op("kernellab::add", mutates_args=())
def vector_add(x: torch.Tensor, y: torch.Tensor) -> torch.Tensor:
    """CPU/CUDA referansı: önce doğruluk."""
    return x + y

@vector_add.register_fake
def _(x, y):
    torch._check(x.shape == y.shape)
    return torch.empty_like(x)

# Derleyici ve alt sistem kontrolleri
torch.library.opcheck(
    vector_add,
    (torch.randn(128), torch.randn(128)),
)`;

const tritonCode = `import torch
import triton
import triton.language as tl

@triton.jit
def add_kernel(x_ptr, y_ptr, out_ptr, n: tl.constexpr,
               BLOCK_SIZE: tl.constexpr):
    pid = tl.program_id(axis=0)
    offsets = pid * BLOCK_SIZE + tl.arange(0, BLOCK_SIZE)
    mask = offsets < n

    x = tl.load(x_ptr + offsets, mask=mask)
    y = tl.load(y_ptr + offsets, mask=mask)
    tl.store(out_ptr + offsets, x + y, mask=mask)

def triton_add(x, y):
    out = torch.empty_like(x)
    grid = (triton.cdiv(x.numel(), 256),)
    add_kernel[grid](x, y, out, x.numel(), BLOCK_SIZE=256)
    return out`;

const quizOptions = [
  "Her program bütün tensörü işler; maske sadece hızı artırır.",
  "Programlar sabit bloklar işler; son blok taşarsa maske geçersiz adresleri kapatır.",
  "Maske yalnızca backward kernel'inde gerekir.",
];

function formatTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} sa ${m ? `${m} dk` : ""}` : `${m} dk`;
}

export default function PyTorchTritonEmbedded() {
  const [selectedWeek, setSelectedWeek] = useState(2);
  const [codeTab, setCodeTab] = useState<"pytorch" | "triton">("triton");
  const [runState, setRunState] = useState<"idle" | "running" | "passed">("idle");
  const [blockSize, setBlockSize] = useState(256);
  const [quiz, setQuiz] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [completedLabs, setCompletedLabs] = useState(1);

  useEffect(() => {
    const stored = window.localStorage.getItem("kernel-lab-note");
    const storedLabs = window.localStorage.getItem("kernel-lab-completed");
    if (stored) setNote(stored);
    if (storedLabs) setCompletedLabs(Number(storedLabs));
  }, []);

  const activeWeek = weeks.find((week) => week.id === selectedWeek) ?? weeks[1];
  const totalMinutes = useMemo(() => weeks.reduce((sum, week) => sum + week.minutes, 0), []);
  const progress = Math.round((completedLabs / 18) * 100);

  function runTests() {
    setRunState("running");
    window.setTimeout(() => {
      setRunState("passed");
      const next = Math.max(completedLabs, 2);
      setCompletedLabs(next);
      window.localStorage.setItem("kernel-lab-completed", String(next));
    }, 900);
  }

  function saveNote() {
    window.localStorage.setItem("kernel-lab-note", note);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }

  return (
    <main className="pytorch-triton-embed">
      <nav className="topbar" aria-label="Ana navigasyon">
        <a className="brand" href="#top" aria-label="Kernel Lab ana sayfa">
          <span className="brand-mark">K//</span>
          <span>KERNEL LAB</span>
        </a>
        <div className="nav-links">
          <a href="#yol">Yol haritası</a>
          <a href="#lab">Kod laboratuvarı</a>
          <a href="#model">Zihinsel model</a>
        </div>
        <div className="nav-status" aria-label="Öğrenme serisi">
          <span className="pulse-dot" /> 3 günlük seri
        </div>
      </nav>

      <section className="hero" id="top">
        <div className="hero-grid" />
        <div className="hero-copy">
          <div className="kicker"><span>YOĞUN PROGRAM</span><span>12 HAFTA</span><span>14–16 SA / HAFTA</span></div>
          <h1>PyTorch’tan<br /><em>çıplak metale.</em></h1>
          <p className="hero-lede">Bir operatörün doğru Python referansından başlayıp, derlenebilir PyTorch custom op’a ve ölçülmüş Triton kernel’e dönüşmesini yaparak öğren.</p>
          <div className="hero-actions">
            <a className="primary-button" href="#lab">Aktif laboratuvara gir <span>↗</span></a>
            <a className="text-link" href="#yol">Programı incele <span>↓</span></a>
          </div>
        </div>
        <aside className="current-mission" aria-label="Sıradaki görev">
          <div className="mission-topline"><span>ŞİMDİKİ GÖREV</span><span>02 / 18</span></div>
          <div className="mission-glyph" aria-hidden="true"><span>π</span><i /></div>
          <p className="mission-label">MODÜL 02 · CUSTOM OP</p>
          <h2>Vektör toplama:<br />şemadan kernel’e</h2>
          <div className="mission-meta"><span>◷ 35 dk</span><span>◆ Orta</span><span>⌁ GPU</span></div>
          <div className="progress-track"><i style={{ width: `${progress}%` }} /></div>
          <div className="progress-label"><span>Toplam ilerleme</span><strong>%{progress}</strong></div>
        </aside>
        <div className="hero-index" aria-hidden="true">01</div>
      </section>

      <section className="ticker" aria-label="Program kazanımları">
        <div>DOĞRULUK MATRİSİ <span>×</span> TORCH.COMPILE <span>×</span> TRITON KERNEL <span>×</span> AUTOGRAD <span>×</span> NSIGHT <span>×</span> VLLM CAPSTONE <span>×</span></div>
      </section>

      <section className="section roadmap" id="yol">
        <div className="section-heading">
          <div><span className="section-number">01</span><p className="eyebrow">ÖĞRENME SİSTEMİ</p><h2>Haritayı ezberleme.<br /><em>Kernel’i inşa et.</em></h2></div>
          <p>Her hafta tek bir zihinsel modeli; çalışan kod, test kanıtı ve performans raporuna dönüştürür.</p>
        </div>

        <div className="week-rail" role="tablist" aria-label="12 haftalık program">
          {weeks.map((week) => (
            <button key={week.id} role="tab" aria-selected={selectedWeek === week.id} className={`week-node ${week.status} ${selectedWeek === week.id ? "selected" : ""}`} onClick={() => setSelectedWeek(week.id)}>
              <span>{String(week.id).padStart(2, "0")}</span>
              <i />
            </button>
          ))}
        </div>

        <article className="week-detail">
          <div className="week-title-block">
            <p>{activeWeek.eyebrow} · HAFTA {String(activeWeek.id).padStart(2, "0")}</p>
            <h3>{activeWeek.title}</h3>
            <span>{formatTime(activeWeek.minutes)} odaklı çalışma</span>
          </div>
          <div className="week-description">
            <p>{activeWeek.desc}</p>
            <div className="skill-list">{activeWeek.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
          </div>
          <div className="week-gate">
            <p>HAFTA ÇIKIŞ KAPISI</p>
            <strong>{activeWeek.id < 4 ? "Kod + test + kendi cümlelerinle açıklama" : "Correctness matrisi + benchmark raporu"}</strong>
            <button onClick={() => document.querySelector("#lab")?.scrollIntoView({ behavior: "smooth" })}>İçeriği aç <span>→</span></button>
          </div>
        </article>
        <p className="roadmap-total"><strong>{formatTime(totalMinutes)}</strong> çekirdek laboratuvar · 5 zorunlu LLM operatörü · 1 capstone</p>
      </section>

      <section className="section lab-section" id="lab">
        <div className="section-heading light">
          <div><span className="section-number">02</span><p className="eyebrow">CANLI LABORATUVAR</p><h2>Oku. Değiştir.<br /><em>Kanıtla.</em></h2></div>
          <p>Kod bölünmüş ekranı, test konsolu ve doğruluk matrisiyle tek bir çalışma döngüsünde kal.</p>
        </div>

        <div className="lab-shell">
          <div className="lab-toolbar">
            <div className="window-dots" aria-hidden="true"><i /><i /><i /></div>
            <div className="file-tabs" role="tablist">
              <button className={codeTab === "pytorch" ? "active" : ""} onClick={() => setCodeTab("pytorch")}>operator.py</button>
              <button className={codeTab === "triton" ? "active" : ""} onClick={() => setCodeTab("triton")}>kernel.py <span>●</span></button>
            </div>
            <span className="runtime">CUDA · FP32 · n=65,537</span>
          </div>

          <div className="lab-main">
            <div className="editor-pane">
              <div className="editor-heading"><span>{codeTab === "triton" ? "TRITON UYGULAMASI" : "PYTORCH CUSTOM OP"}</span><span>Python</span></div>
              <pre aria-label={`${codeTab} örnek kodu`}><code>{(codeTab === "triton" ? tritonCode : customOpCode).split("\n").map((line, index) => <span className="code-line" key={index}><i>{index + 1}</i>{line || " "}</span>)}</code></pre>
            </div>
            <aside className="task-pane">
              <p className="task-kicker">GÖREV 02.3</p>
              <h3>Sınırları güvenli yükle</h3>
              <p><code>n</code>, blok boyutunun katı olmadığında son program tensörün dışına taşar. Yükleme ve yazmayı aynı maskeyle koru.</p>
              <div className="checks">
                <label><input type="checkbox" defaultChecked /><span>Program kimliğini al</span></label>
                <label><input type="checkbox" defaultChecked /><span>Offset vektörünü üret</span></label>
                <label><input type="checkbox" /><span>Sınır maskesini uygula</span></label>
              </div>
              <div className="hint"><span>İPUCU</span><p>Her program bir blok işler. Geçerli elemanlar için <code>offsets &lt; n</code> ifadesini kullan.</p></div>
              <button className={`run-button ${runState}`} onClick={runTests} disabled={runState === "running"}>
                <span>{runState === "running" ? "TESTLER ÇALIŞIYOR" : runState === "passed" ? "TEKRAR ÇALIŞTIR" : "TESTLERİ ÇALIŞTIR"}</span><b>{runState === "running" ? "···" : "▶"}</b>
              </button>
            </aside>
          </div>

          <div className={`console ${runState}`} aria-live="polite">
            <div className="console-title"><span>TEST KONSOLU</span><span>{runState === "passed" ? "4/4 GEÇTİ" : runState === "running" ? "ÇALIŞIYOR" : "HAZIR"}</span></div>
            {runState === "idle" && <p><span className="prompt">$</span> opcheck ve correctness matrisini başlatmaya hazır.</p>}
            {runState === "running" && <p><span className="prompt">›</span> n ∈ [1, 257, 65_537] · fp32/fp16 karşılaştırılıyor…</p>}
            {runState === "passed" && <div className="test-results"><p><b>✓</b> opcheck: schema + fake tensor</p><p><b>✓</b> n=1 / sınır</p><p><b>✓</b> n=257 / mask</p><p><b>✓</b> max |Δ| = 0.00e+00</p></div>}
          </div>
        </div>

        <div className="evidence-strip">
          <div><span>DOĞRULUK</span><strong>{runState === "passed" ? "4 / 4" : "— / 4"}</strong><small>şekil × dtype</small></div>
          <div><span>MEDYAN</span><strong>{runState === "passed" ? "18.7 µs" : "— µs"}</strong><small>100 tekrar</small></div>
          <div><span>BANT GENİŞLİĞİ</span><strong>{runState === "passed" ? "612 GB/s" : "— GB/s"}</strong><small>temsili sonuç</small></div>
          <div className="proof-note"><i>!</i><p>Performans sayıları öğretim amaçlıdır. Kendi GPU’nda ölçmeden portföy kanıtı sayılmaz.</p></div>
        </div>
      </section>

      <section className="section model-section" id="model">
        <div className="section-heading">
          <div><span className="section-number">03</span><p className="eyebrow">ZİHİNSEL MODEL</p><h2>Bir kernel nasıl<br /><em>düşünür?</em></h2></div>
          <p>Parametreyi oynat; grid, program ve bellek erişimi arasındaki ilişkiyi gör.</p>
        </div>

        <div className="model-grid">
          <div className="simulator">
            <div className="sim-toolbar">
              <label htmlFor="block-size">BLOCK_SIZE</label>
              <input id="block-size" type="range" min="64" max="512" step="64" value={blockSize} onChange={(event) => setBlockSize(Number(event.target.value))} />
              <output>{blockSize}</output>
            </div>
            <div className="memory-visual">
              <div className="memory-label"><span>GLOBAL MEMORY</span><span>n = 1,024 eleman</span></div>
              <div className="memory-cells">
                {Array.from({ length: 32 }).map((_, index) => <i key={index} className={index < Math.min(32, blockSize / 16) ? "hot" : ""} style={{ animationDelay: `${index * 25}ms` }} />)}
              </div>
              <div className="flow-lines"><i /><i /><i /><i /></div>
              <div className="program-row">
                {Array.from({ length: Math.max(2, 1024 / blockSize) }).slice(0, 8).map((_, index) => <div key={index} className={index === 0 ? "active" : ""}><span>PID {index}</span><b>{index * blockSize}…{Math.min(1023, (index + 1) * blockSize - 1)}</b></div>)}
              </div>
            </div>
            <div className="sim-caption"><span>{1024 / blockSize} program</span><span>{blockSize / 32} warp / program</span><span>coalesced erişim</span></div>
          </div>

          <div className="explanation">
            <p className="eyebrow">KENDİ CÜMLELERİNLE</p>
            <h3>Program ≠ thread</h3>
            <p>Triton’da tek bir program, bir veri bloğu üzerinde vektör halinde çalışır. <code>tl.arange</code> tek tek thread numarası değil, programın işleyeceği offset vektörüdür.</p>
            <ol>
              <li><b>Grid</b><span>Kaç program örneği çalışacak?</span></li>
              <li><b>Program ID</b><span>Bu örnek hangi bloğu sahipleniyor?</span></li>
              <li><b>Offsets</b><span>Blok içindeki hangi elemanlar işlenecek?</span></li>
              <li><b>Mask</b><span>Hangileri gerçekten geçerli?</span></li>
            </ol>
          </div>
        </div>
      </section>

      <section className="section checkpoint">
        <div className="checkpoint-copy">
          <span className="section-number">04</span>
          <p className="eyebrow">HIZLI KONTROL</p>
          <h2>Anladığını<br /><em>kanıtla.</em></h2>
          <p>Notlarına bakmadan yanıtla. Yanlış cevap, öğrenme döngüsünün verisidir.</p>
        </div>
        <div className="quiz-card">
          <div className="quiz-top"><span>SORU 1 / 3</span><span>TEK SEÇİM</span></div>
          <h3>Vektör uzunluğu BLOCK_SIZE’ın katı değilse neden bir maskeye ihtiyaç duyarız?</h3>
          <div className="quiz-options">
            {quizOptions.map((option, index) => (
              <button key={option} className={`${quiz === index ? "selected" : ""} ${quiz !== null && index === 1 ? "correct" : ""} ${quiz === index && index !== 1 ? "wrong" : ""}`} onClick={() => setQuiz(index)}>
                <span>{String.fromCharCode(65 + index)}</span><p>{option}</p><i>{quiz !== null && index === 1 ? "✓" : ""}</i>
              </button>
            ))}
          </div>
          {quiz !== null && <p className={`feedback ${quiz === 1 ? "success" : "retry"}`}>{quiz === 1 ? "Doğru. Maske, son programın tahsis edilmemiş belleğe erişmesini engeller." : "Tekrar düşün: son programın offset’leri tensör sınırını aşabilir."}</p>}
        </div>
      </section>

      <section className="section journal">
        <div>
          <p className="eyebrow">MÜHENDİS NOTLUĞU</p>
          <h2>Bugün neyi<br /><em>gerçekten öğrendin?</em></h2>
          <p>Önce kendi açıklamanı yaz. Doğrulanmış özet ancak test ve gözden geçirmeden sonra gelir.</p>
        </div>
        <div className="note-area">
          <label htmlFor="learning-note">“Mask” kavramını, ilk kez duyan birine iki cümlede açıkla.</label>
          <textarea id="learning-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Kendi cümlelerinle…" />
          <div><span>{note.length} karakter · bu cihazda saklanır</span><button onClick={saveNote}>{saved ? "KAYDEDİLDİ ✓" : "NOTU KAYDET"}</button></div>
        </div>
      </section>

      <footer>
        <div className="footer-brand"><span className="brand-mark">K//</span><h2>Ölçmediğin hız,<br />kanıt değildir.</h2></div>
        <div className="footer-stats"><div><strong>12</strong><span>hafta</span></div><div><strong>18</strong><span>laboratuvar</span></div><div><strong>05</strong><span>LLM operatörü</span></div></div>
        <a href="#top">YUKARI DÖN ↑</a>
      </footer>
    </main>
  );
}

