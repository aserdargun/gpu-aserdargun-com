"use client";
/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- Labelled overflow regions must remain keyboard-scrollable. */

import { useEffect, useMemo, useState } from "react";
import { getSourcesForModule } from "./atlas/curriculum-sources";
import { acquireStorage, readFiniteInteger, readText, writeText } from "./atlas/lab-storage.mjs";

export const PYTORCH_INTEGRATION_DECISIONS = [
  { id: "composition", label: "Yerleşik PyTorch bileşimi", summary: "Önce yerleşik PyTorch operatörlerini birleştir; en küçük bakım ve derleyici yüzeyi." },
  { id: "plain-triton", label: "Düz Triton", summary: "Düz Triton AOTInductor ile uygundur; PyTorch alt sistemleriyle bileşim veya açık bir operatör entegrasyon sınırı gerektiğinde triton_op + wrap_triton kullan." },
  { id: "triton-op", label: "torch.library.triton_op + wrap_triton", summary: "Triton kernel çağrısı PyTorch alt sistemleriyle bileşir; torch.compile gövdeyi izleyebilir." },
  { id: "custom-op", label: "custom_op", summary: "Derleyiciye opak bir sınır gerekirken kullan; mutasyon ve alias şemasını eksiksiz bildir." },
] as const;

export const PYTORCH_ACCEPTANCE_ROWS = [
  { id: "dynamic-shape", label: "Dinamik şekil", detail: "Asal ve blok sınırı ±1 şekillerde maske ve sembolik boyutları doğrula." },
  { id: "mutation-alias", label: "Mutasyon / alias", detail: "Şema, gerçekten değişen girdileri ve çıktı alias davranışını birebir açıklamalı." },
  { id: "faketensor", label: "FakeTensor", detail: "Meta yürütme çıktı şekli, dtype ve cihaz semantiğini gerçek tahsis olmadan üretmeli." },
  { id: "autograd", label: "Autograd", detail: "İleri ve geri yolları ayrı gradyan karşılaştırmasıyla kabul et." },
  { id: "aotinductor", label: "AOTInductor", detail: "Derleme, dışa aktarma ve yeniden yükleme yolunu temsilî şekillerde sınırla." },
] as const;

export const TRITON_AUTOTUNE_CONFIGS = [
  { id: "latency", label: "Kısa gecikme", config: "BLOCK_SIZE=128 · num_warps=4", acceptance: "Küçük şekillerde p50 gecikme" },
  { id: "balanced", label: "Dengeli", config: "BLOCK_SIZE=256 · num_warps=8", acceptance: "Şekil matrisinde kararlı medyan" },
  { id: "throughput", label: "Throughput", config: "BLOCK_SIZE=512 · num_warps=8", acceptance: "Büyük şekillerde GB/s ve p95" },
] as const;

export const TRITON_GLUON_PREVIEW = { sourceId: "triton-gluon", maturity: "preview" as const };

type IntegrationBranch = (typeof PYTORCH_INTEGRATION_DECISIONS)[number]["id"];
type AutotuneProfile = (typeof TRITON_AUTOTUNE_CONFIGS)[number]["id"];
type AcceptanceStatus = "covered" | "not-applicable" | "owned" | "visible" | "supported" | "required" | "manual" | "opaque";

const acceptanceByBranch: Record<IntegrationBranch, readonly AcceptanceStatus[]> = {
  composition: ["covered", "not-applicable", "owned", "owned", "visible"],
  "plain-triton": ["required", "required", "not-applicable", "manual", "supported"],
  "triton-op": ["required", "required", "required", "required", "visible"],
  "custom-op": ["required", "required", "required", "required", "opaque"],
};

const acceptanceStatusLabels: Record<AcceptanceStatus, string> = {
  covered: "Yerleşik semantikle kapsanır",
  "not-applicable": "Bu sınırda kullanılamaz",
  owned: "PyTorch sahiplenir",
  visible: "AOTInductor tarafından görünür",
  supported: "AOTInductor ile uygun",
  required: "Test edilmesi zorunlu",
  manual: "Elle backward gerekir",
  opaque: "AOTInductor'a opak",
};

export function getPyTorchExecutionPlan(branch: IntegrationBranch, autotune: AutotuneProfile) {
  const config = TRITON_AUTOTUNE_CONFIGS.find((item) => item.id === autotune) ?? TRITON_AUTOTUNE_CONFIGS[1];
  const [blockSize, numWarps] = config.config.match(/\d+/g) ?? ["256", "8"];
  const commonKernel = `@triton.jit
def add_kernel(x_ptr, y_ptr, out_ptr, n: tl.constexpr,
               BLOCK_SIZE: tl.constexpr):
    pid = tl.program_id(axis=0)
    offsets = pid * BLOCK_SIZE + tl.arange(0, BLOCK_SIZE)
    mask = offsets < n
    x = tl.load(x_ptr + offsets, mask=mask)
    y = tl.load(y_ptr + offsets, mask=mask)
    tl.store(out_ptr + offsets, x + y, mask=mask)`;
  const plans = {
    composition: {
      code: `import torch

def vector_add(x: torch.Tensor, y: torch.Tensor) -> torch.Tensor:
    return x + y`,
      configEffect: "Autotune uygulanmaz: kernel seçimini yerleşik PyTorch dispatch sahiplenir.",
      runLabel: "Yerleşik bileşim · doğrudan x + y · özel kayıt yok",
      compile: "Yerleşik grafik torch.compile ve AOTInductor tarafından görünür kalır.",
      opcheck: "not-required" as const,
    },
    "plain-triton": {
      code: `import torch
import triton
import triton.language as tl

${commonKernel}

def vector_add(x, y):
    out = torch.empty_like(x)
    grid = (triton.cdiv(x.numel(), ${blockSize}),)
    add_kernel[grid](x, y, out, x.numel(), BLOCK_SIZE=${blockSize}, num_warps=${numWarps})
    return out`,
      configEffect: `Doğrudan Triton başlatması BLOCK_SIZE=${blockSize} · num_warps=${numWarps} kullanır.`,
      runLabel: "Düz Triton · doğrudan maskeli başlatma",
      compile: "Düz Triton başlatmaları torch.compile ve AOTInductor ile uygundur. PyTorch alt sistemleriyle bileşim veya açık bir operatör entegrasyon sınırı gerektiğinde triton_op + wrap_triton kullan.",
      opcheck: "not-required" as const,
    },
    "triton-op": {
      code: `import torch
import triton
import triton.language as tl

${commonKernel}

@torch.library.triton_op("kernellab::vector_add", mutates_args={})
def vector_add(x: torch.Tensor, y: torch.Tensor) -> torch.Tensor:
    out = torch.empty_like(x)
    grid = (triton.cdiv(x.numel(), ${blockSize}),)
    torch.library.wrap_triton(add_kernel)[grid](
        x, y, out, x.numel(), BLOCK_SIZE=${blockSize}, num_warps=${numWarps})
    return out`,
      configEffect: `wrap_triton başlatması BLOCK_SIZE=${blockSize} · num_warps=${numWarps} kullanır.`,
      runLabel: "triton_op · izlenebilir wrap_triton maskeli başlatması",
      compile: "Sarmalanan kernel gövdesi torch.compile ve AOTInductor tarafından görünür kalır.",
      opcheck: "registration" as const,
    },
    "custom-op": {
      code: `import torch

@torch.library.custom_op("kernellab::opaque_add", mutates_args=())
def vector_add(x: torch.Tensor, y: torch.Tensor) -> torch.Tensor:
    # Kasıtlı derleyici sınırı; uygulama içeride Triton başlatabilir.
    return opaque_triton_add(x, y, BLOCK_SIZE=${blockSize}, num_warps=${numWarps})`,
      configEffect: `Opak uygulama BLOCK_SIZE=${blockSize} · num_warps=${numWarps} değerlerini sahiplenir; gövde izlenmez.`,
      runLabel: "custom_op · kasıtlı opak derleyici sınırı",
      compile: "custom_op gövdesi torch.compile ve AOTInductor'a opaktır.",
      opcheck: "registration" as const,
    },
  } as const;
  const selected = plans[branch];
  return {
    branch,
    ...selected,
    acceptance: PYTORCH_ACCEPTANCE_ROWS.map((row, index) => ({ id: row.id, status: acceptanceByBranch[branch][index], statusLabel: acceptanceStatusLabels[acceptanceByBranch[branch][index]] })),
    boundaries: { opcheck: selected.opcheck, numerical: "separate" as const, gradient: "separate" as const, compile: selected.compile },
  };
}

const weeks = [
  { id: 1, title: "Tensor anatomisi", eyebrow: "Temel", desc: "Stride, layout ve eager yürütmeyi çıplak gözle gör.", status: "done", minutes: 90, skills: ["stride", "broadcast", "profiling"] },
  { id: 2, title: "Özel operatör", eyebrow: "PyTorch", desc: "torch.library ile şema, CPU referansı ve fake kernel kur.", status: "active", minutes: 120, skills: ["torch.library", "FakeTensor", "opcheck"] },
  { id: 3, title: "İlk Triton kernel", eyebrow: "Triton", desc: "Program ID, bloklar, maske ve coalesced erişim.", status: "next", minutes: 150, skills: ["tl.program_id", "mask", "BLOCK_SIZE"] },
  { id: 4, title: "Otomatik türev + derleme", eyebrow: "Entegrasyon", desc: "Geri yayılımı kaydet; torch.compile ile graph break avla.", status: "locked", minutes: 150, skills: ["register_autograd", "torch.compile", "AOT"] },
  { id: 5, title: "RMSNorm", eyebrow: "Operatör 01", desc: "Referanstan fused Triton kernel'e, üç şekil üzerinde ölç.", status: "locked", minutes: 180, skills: ["reduction", "numerics", "fusion"] },
  { id: 6, title: "RoPE", eyebrow: "Operatör 02", desc: "Half-split rotary embedding ve stride-aware indeksleme.", status: "locked", minutes: 180, skills: ["indexing", "vectorization", "backward"] },
  { id: 7, title: "SwiGLU", eyebrow: "Operatör 03", desc: "Aktivasyon ve çarpımı tek kernel'de birleştir.", status: "locked", minutes: 180, skills: ["fusion", "occupancy", "precision"] },
  { id: 8, title: "Maskeli softmax", eyebrow: "Operatör 04", desc: "Stabil reduction, maskeleme ve sınır durumları.", status: "locked", minutes: 210, skills: ["online softmax", "masking", "NaN"] },
  { id: 9, title: "KV-cache güncellemesi", eyebrow: "Operatör 05", desc: "Paged bellek düzenine güvenli ve hızlı yazma.", status: "locked", minutes: 210, skills: ["scatter", "cache", "race"] },
  { id: 10, title: "Kıyaslama bilimi", eyebrow: "Performans", desc: "Isınma, quantile ve roofline ile dürüst kıyaslama.", status: "locked", minutes: 150, skills: ["triton.testing", "roofline", "Nsight"] },
  { id: 11, title: "Füzyon stüdyosu", eyebrow: "Optimizasyon", desc: "İki fused kernel'de en az %15 medyan iyileşme hedefle.", status: "locked", minutes: 240, skills: ["fusion", "register pressure", "autotune"] },
  { id: 12, title: "Çıkarım bitirme projesi", eyebrow: "Mezuniyet", desc: "vLLM iş yükünde TTFT, ITL ve throughput raporu üret.", status: "locked", minutes: 300, skills: ["vLLM", "TTFT", "portfolio"] },
];

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
  const [saveState, setSaveState] = useState<"idle" | "saved" | "memory">("idle");
  const [completedLabs, setCompletedLabs] = useState(1);
  const [integrationChoice, setIntegrationChoice] = useState<(typeof PYTORCH_INTEGRATION_DECISIONS)[number]["id"]>("composition");
  const [autotuneConfig, setAutotuneConfig] = useState<(typeof TRITON_AUTOTUNE_CONFIGS)[number]["id"]>("balanced");
  const [runSnapshot, setRunSnapshot] = useState<ReturnType<typeof getPyTorchExecutionPlan> | null>(null);

  useEffect(() => {
    const storage = acquireStorage(window);
    const stored = readText(storage, "kernel-lab-note", "");
    const storedLabs = readFiniteInteger(storage, "kernel-lab-completed", { fallback: 1, min: 0, max: 18 });
    window.queueMicrotask(() => {
      if (stored) setNote(stored);
      setCompletedLabs(storedLabs);
    });
  }, []);

  const activeWeek = weeks.find((week) => week.id === selectedWeek) ?? weeks[1];
  const totalMinutes = useMemo(() => weeks.reduce((sum, week) => sum + week.minutes, 0), []);
  const progress = Math.round((completedLabs / 18) * 100);
  const selectedDecision = PYTORCH_INTEGRATION_DECISIONS.find((decision) => decision.id === integrationChoice) ?? PYTORCH_INTEGRATION_DECISIONS[0];
  const selectedAutotune = TRITON_AUTOTUNE_CONFIGS.find((config) => config.id === autotuneConfig) ?? TRITON_AUTOTUNE_CONFIGS[1];
  const selectedPlan = getPyTorchExecutionPlan(integrationChoice, autotuneConfig);
  const gluonSource = getSourcesForModule("triton").find((source) => source.id === TRITON_GLUON_PREVIEW.sourceId);

  function runTests() {
    const planAtRun = selectedPlan;
    setRunSnapshot(null);
    setRunState("running");
    window.setTimeout(() => {
      setRunSnapshot(planAtRun);
      setRunState("passed");
      const next = Math.max(completedLabs, 2);
      setCompletedLabs(next);
      writeText(acquireStorage(window), "kernel-lab-completed", String(next));
    }, 900);
  }

  function saveNote() {
    const persisted = writeText(acquireStorage(window), "kernel-lab-note", note);
    setSaveState(persisted ? "saved" : "memory");
    window.setTimeout(() => setSaveState("idle"), 3000);
  }

  return (
    <section className="pytorch-triton-surface" id="top" aria-label="PyTorch ve Triton laboratuvarı">
      <section className="hero">
        <div className="hero-grid" />
        <div className="hero-copy">
          <div className="kicker"><span>YOĞUN PROGRAM</span><span>12 HAFTA</span><span>14–16 SA / HAFTA</span></div>
          <h2>PyTorch’tan<br /><em>çıplak metale.</em></h2>
          <p className="hero-lede">Bir operatörün doğru Python referansından başlayıp derlenebilir bir PyTorch özel operatörüne ve ölçülmüş Triton kernel’ine dönüşmesini yaparak öğren.</p>
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

      <section className="ticker" aria-label="Program kazanımları" tabIndex={0}>
        <div>DOĞRULUK MATRİSİ <span>×</span> TORCH.COMPILE <span>×</span> TRITON KERNEL <span>×</span> AUTOGRAD <span>×</span> NSIGHT <span>×</span> VLLM CAPSTONE <span>×</span></div>
      </section>

      <section className="section roadmap" id="yol">
        <div className="section-heading">
          <div><span className="section-number">01</span><p className="eyebrow">ÖĞRENME SİSTEMİ</p><h2>Haritayı ezberleme.<br /><em>Kernel’i inşa et.</em></h2></div>
          <p>Her hafta tek bir zihinsel modeli; çalışan kod, test kanıtı ve performans raporuna dönüştürür.</p>
        </div>

        <div className="week-rail" role="group" aria-label="12 haftalık program">
          {weeks.map((week) => (
            <button key={week.id} aria-pressed={selectedWeek === week.id} className={`week-node ${week.status} ${selectedWeek === week.id ? "selected" : ""}`} onClick={() => setSelectedWeek(week.id)}>
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
            <strong>{activeWeek.id < 4 ? "Kod + test + kendi cümlelerinle açıklama" : "Doğruluk matrisi + kıyaslama raporu"}</strong>
            <button onClick={() => document.querySelector("#lab")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}>İçeriği aç <span>→</span></button>
          </div>
        </article>
        <p className="roadmap-total"><strong>{formatTime(totalMinutes)}</strong> çekirdek laboratuvar · 5 zorunlu LLM operatörü · 1 capstone</p>
      </section>

      <section className="section integration-section" aria-labelledby="integration-heading">
        <div className="section-heading">
          <div><span className="section-number">02</span><p className="eyebrow">PYTORCH KARAR MATRİSİ</p><h2 id="integration-heading">Doğru entegrasyon<br /><em>sınırını seç.</em></h2></div>
          <p><code>opcheck</code> kayıt, şema, FakeTensor ve derleyici sözleşmesini denetler; sayısal doğruluk ya da gradyan doğruluğu kanıtlamaz.</p>
        </div>
        <div className="integration-decision-matrix">
          <div className="decision-options" role="group" aria-label="PyTorch entegrasyon seçenekleri">
            {PYTORCH_INTEGRATION_DECISIONS.map((decision) => <button key={decision.id} aria-pressed={integrationChoice === decision.id} onClick={() => setIntegrationChoice(decision.id)}>{decision.label}</button>)}
          </div>
          <p className="decision-result" aria-live="polite"><strong>{selectedDecision.label}</strong>{selectedDecision.summary}</p>
          <pre className="integration-code" data-branch={selectedPlan.branch} tabIndex={0} aria-label="Seçili entegrasyon dalı kodu"><code>{selectedPlan.code}</code></pre>
          <div className="autotune-control">
            <label htmlFor="triton-autotune">Autotune kabul profili</label>
            <select id="triton-autotune" className="autotune-select" value={autotuneConfig} onChange={(event) => setAutotuneConfig(event.target.value as typeof autotuneConfig)}>
              {TRITON_AUTOTUNE_CONFIGS.map((config) => <option key={config.id} value={config.id}>{config.label}</option>)}
            </select>
            <p className="autotune-result" aria-live="polite"><code>{selectedAutotune.config}</code><span>{selectedAutotune.acceptance}</span></p>
            <p className="branch-config-effect" aria-live="polite">{selectedPlan.configEffect}</p>
          </div>
          <div className="acceptance-grid" aria-label="PyTorch özel operatör kabul matrisi">
            {PYTORCH_ACCEPTANCE_ROWS.map((row, index) => <article className="acceptance-row" data-status={selectedPlan.acceptance[index].status} key={row.id}><strong>{row.label}</strong><em>{selectedPlan.acceptance[index].statusLabel}</em><span>{row.detail}</span></article>)}
          </div>
          <ul className="boundary-list"><li><b>opcheck</b>{selectedPlan.boundaries.opcheck === "registration" ? "Yalnız kayıt/şema sınırı" : "Bu sınırda gerekmez veya kullanılamaz"}</li><li><b>Sayısal</b>Ayrı referans karşılaştırması</li><li><b>Gradyan</b>Ayrı backward/gradcheck kanıtı</li><li><b>AOTInductor</b>{selectedPlan.boundaries.compile}</li></ul>
          <aside className="preview-panel" data-source-id={TRITON_GLUON_PREVIEW.sourceId}>
            <span className="preview-badge">Önizleme</span><div><strong>Triton Gluon</strong><p><code>triton.experimental</code> içindeki donanım-özgü DSL yoludur; çekirdek programın zorunlu mezuniyet koşulu değildir.</p>{gluonSource && <a href={gluonSource.url} target="_blank" rel="noreferrer">Resmî Gluon öğreticisi ↗</a>}</div>
          </aside>
        </div>
      </section>

      <section className="section lab-section" id="lab">
        <div className="section-heading light">
          <div><span className="section-number">02</span><p className="eyebrow">CANLI LABORATUVAR</p><h2>Oku. Değiştir.<br /><em>Kanıtla.</em></h2></div>
          <p>Kod bölünmüş ekranı, test konsolu ve doğruluk matrisiyle tek bir çalışma döngüsünde kal.</p>
        </div>

        <div className="lab-shell">
          <div className="lab-toolbar">
            <div className="window-dots" aria-hidden="true"><i /><i /><i /></div>
            <div className="file-tabs" role="group" aria-label="Kod dosyaları">
              <button aria-pressed={codeTab === "pytorch"} className={codeTab === "pytorch" ? "active" : ""} onClick={() => setCodeTab("pytorch")}>operator.py</button>
              <button aria-pressed={codeTab === "triton"} className={codeTab === "triton" ? "active" : ""} onClick={() => setCodeTab("triton")}>kernel.py <span>●</span></button>
            </div>
            <span className="runtime">CUDA · FP32 · n=65,537</span>
          </div>

          <div className="lab-main">
            <div className="editor-pane">
              <div className="editor-heading"><span>{codeTab === "triton" ? "TRITON UYGULAMASI" : "PYTORCH ÖZEL OPERATÖR"}</span><span>Python</span></div>
              <pre aria-label={`${codeTab} örnek kodu`} tabIndex={0}><code>{(codeTab === "triton" ? tritonCode : selectedPlan.code).split("\n").map((line, index) => <span className="code-line" key={index}><i>{index + 1}</i>{line || " "}</span>)}</code></pre>
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
            {runState === "passed" && <div className="test-results"><p><b>✓</b> {runSnapshot?.boundaries.opcheck === "registration" ? "opcheck: kayıt + şema" : "opcheck: bu dalın dışında"}</p><p><b>✓</b> sayısal: ayrı referans</p><p><b>✓</b> gradyan: ayrı kanıt</p><p><b>✓</b> maskeli n=257 sınırı</p></div>}
            <p className="run-context" data-branch={runSnapshot?.branch ?? ""}>{runSnapshot ? `${runSnapshot.runLabel} · ${runSnapshot.configEffect}` : ""}</p>
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
              <div className="memory-label"><span>GENEL BELLEK</span><span>n = 1,024 eleman</span></div>
              <div className="memory-cells">
                {Array.from({ length: 32 }).map((_, index) => <i key={index} className={index < Math.min(32, blockSize / 16) ? "hot" : ""} style={{ animationDelay: `${index * 25}ms` }} />)}
              </div>
              <div className="flow-lines"><i /><i /><i /><i /></div>
              <div className="program-row" tabIndex={0} aria-label="Program blokları">
                {Array.from({ length: Math.max(2, 1024 / blockSize) }).slice(0, 8).map((_, index) => <div key={index} className={index === 0 ? "active" : ""}><span>PID {index}</span><b>{index * blockSize}…{Math.min(1023, (index + 1) * blockSize - 1)}</b></div>)}
              </div>
            </div>
            <div className="sim-caption"><span>{1024 / blockSize} program</span><span>{blockSize / 32} warp / program</span><span>coalesced erişim</span></div>
          </div>

          <div className="explanation">
            <p className="eyebrow">KENDİ CÜMLELERİNLE</p>
            <h3>Program ≠ iş parçacığı</h3>
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
          <p className={`feedback ${quiz === 1 ? "success" : "retry"}`} aria-live="polite" hidden={quiz === null}>{quiz === null ? "" : quiz === 1 ? "Doğru. Maske, son programın tahsis edilmemiş belleğe erişmesini engeller." : "Tekrar düşün: son programın offset’leri tensör sınırını aşabilir."}</p>
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
          <div>
            <span className="note-storage-status" role="status" aria-live="polite">
              {saveState === "memory" ? "Depolama kullanılamıyor — not bu oturum için bellekte kalır." : saveState === "saved" ? "Not bu cihaza kaydedildi." : `${note.length} karakter · bu cihazda saklanır`}
            </span>
            <button onClick={saveNote}>{saveState === "saved" ? "KAYDEDİLDİ ✓" : saveState === "memory" ? "YALNIZ BELLEKTE" : "NOTU KAYDET"}</button>
          </div>
        </div>
      </section>

    </section>
  );
}
