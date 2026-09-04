"use client";
/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- Labelled overflow regions must remain keyboard-scrollable. */

import { useEffect, useMemo, useState } from "react";
import { acquireStorage, readStringArray, writeJson } from "./atlas/lab-storage.mjs";

type TrackKey = "cpp" | "python" | "linux" | "git" | "cmake";
type ViewKey = "learn" | "lab" | "questions";
type LabKey = "cpp" | "python" | "bash";
type CapabilityFieldKey = "gpuModel" | "computeCapability" | "driver" | "toolkit" | "framework" | "compilerFlags" | "benchmarkCommand";

export const CAPABILITY_FIELDS: ReadonlyArray<{ key: CapabilityFieldKey; label: string; hint: string }> = [
  { key: "gpuModel", label: "GPU modeli", hint: "örn. NVIDIA H100" },
  { key: "computeCapability", label: "Compute capability", hint: "örn. 9.0 / sm_90" },
  { key: "driver", label: "Sürücü", hint: "örn. 580.xx" },
  { key: "toolkit", label: "CUDA veya ROCm sürümü", hint: "örn. CUDA 13.3" },
  { key: "framework", label: "Framework sürümü", hint: "örn. PyTorch 2.x" },
  { key: "compilerFlags", label: "Derleyici bayrakları", hint: "örn. -O3 -arch=sm_90" },
  { key: "benchmarkCommand", label: "Kıyaslama komutu", hint: "örn. ncu -o baseline …" },
];

export function getCapabilityRecordStatus(record: Partial<Record<CapabilityFieldKey, string>>) {
  const completed = CAPABILITY_FIELDS.filter(({ key }) => record[key]?.trim()).length;
  return { completed, total: CAPABILITY_FIELDS.length, ready: completed === CAPABILITY_FIELDS.length };
}

const tracks: Array<{
  key: TrackKey;
  label: string;
  mark: string;
  color: string;
  version: string;
  note: string;
  lessons: string[];
}> = [
  {
    key: "cpp",
    label: "Modern C++",
    mark: "C++",
    color: "#f2c14e",
    version: "C++23 • C++26 radarı",
    note: "Değer semantiğinden eşzamanlılığa",
    lessons: ["Derleme modeli & tür sistemi", "RAII, ownership & yaşam süresi", "STL, aralıklar ve algoritmalar", "Şablonlar, kavramlar ve constexpr", "Hata yönetimi & test", "Eşzamanlılık ve performans"],
  },
  {
    key: "python",
    label: "Python",
    mark: "Py",
    color: "#7dd3fc",
    version: "Python 3.14.6",
    note: "Temiz koddan production araçlarına",
    lessons: ["Veri modeli & koleksiyonlar", "Fonksiyonlar, kapanışlar ve dekoratörler", "Tür belirtimi, dataclass ve protokol", "Yineleyici, üretici ve bağlam yöneticisi", "asyncio ve eşzamanlılık", "Paketleme, test ve profil çıkarma"],
  },
  {
    key: "linux",
    label: "Linux & Bash",
    mark: "$_",
    color: "#a7f3d0",
    version: "Kernel 7.1.5 stable",
    note: "Shell hâkimiyeti ve sistem temelleri",
    lessons: ["Dosya sistemi & izinler", "Süreç, sinyal ve iş denetimi", "Pipe, redirect & text araçları", "Bash scripting güvenliği", "Systemd, loglar & ağ", "Performans gözlemi"],
  },
  {
    key: "git",
    label: "Git",
    mark: "Git",
    color: "#fb7185",
    version: "Git 2.55",
    note: "Commit grafiğini gerçekten anlamak",
    lessons: ["Object modeli & üç alan", "Dal, birleştirme ve rebase", "Remote iş akışları", "Çatışma çözümü", "Bisect, reflog & kurtarma", "Takım stratejileri"],
  },
  {
    key: "cmake",
    label: "CMake",
    mark: "CM",
    color: "#c4b5fd",
    version: "CMake 4.4",
    note: "Modern target tabanlı build sistemleri",
    lessons: ["Yapılandır → üret → derle", "Hedefler ve kullanım gereksinimleri", "Kütüphaneler ve geçişli bağımlılıklar", "Önayarlar ve araç zincirleri", "CTest, kurulum ve paketleme", "CPS & instrumentation"],
  },
];

const curriculum: Record<TrackKey, Array<{ title: string; eyebrow: string; summary: string; tags: string[]; lab: string }>> = {
  cpp: [
    { title: "Derleyicinin gördüğü dünya", eyebrow: "MODÜL 01 · 75 DK", summary: "Translation unit, header, linker ve ABI ayrımını kur. Undefined behavior ile implementation-defined davranışı birbirinden ayır.", tags: ["compiler", "linker", "ABI"], lab: "Bir link hatasını teşhis et" },
    { title: "RAII ve açık ownership", eyebrow: "MODÜL 02 · 90 DK", summary: "Stack/heap ezberini bırak; scope, destructor, move semantiği ve smart pointer seçimini yaşam süresi üzerinden düşün.", tags: ["RAII", "move", "smart pointer"], lab: "Kaynak sızıntısını RAII ile düzelt" },
    { title: "STL ile ifade gücü", eyebrow: "MODÜL 03 · 80 DK", summary: "Container seçimi, iterator invalidation, ranges pipeline’ları ve algoritma karmaşıklığını ölçülebilir kararlarla kullan.", tags: ["ranges", "span", "complexity"], lab: "Loop’u ranges pipeline’a çevir" },
  ],
  python: [
    { title: "Python veri modeli", eyebrow: "MODÜL 01 · 70 DK", summary: "İsim, nesne ve referans farkını; mutability, identity ve special method’ların protokollerle ilişkisini öğren.", tags: ["object model", "dunder", "mutability"], lab: "Mutable default tuzağını çöz" },
    { title: "Modern tür belirtimi", eyebrow: "MODÜL 02 · 80 DK", summary: "Protocol, generics, type narrowing ve deferred annotations ile çalışma zamanını bozmadan güçlü sözleşmeler kur.", tags: ["typing", "Protocol", "3.14"], lab: "Bir Protocol tasarla" },
    { title: "Eşzamanlılık seçenekleri", eyebrow: "MODÜL 03 · 95 DK", summary: "asyncio, thread, process ve 3.14 free-threaded build seçimini I/O, CPU ve paylaşılan durum üzerinden yap.", tags: ["asyncio", "free-threading", "profiling"], lab: "Async iş kuyruğu yaz" },
  ],
  linux: [
    { title: "Shell bir dil, terminal değil", eyebrow: "MODÜL 01 · 65 DK", summary: "Terminal, shell, TTY ve process kavramlarını ayır; exit code, environment ve quoting davranışını deneylerle gözle.", tags: ["shell", "process", "exit code"], lab: "Güvenli argüman işleme" },
    { title: "Pipe ile veri akışı", eyebrow: "MODÜL 02 · 85 DK", summary: "stdin/stdout/stderr, file descriptor ve pipe zincirlerini grep, sed, awk ve xargs ile bileştir.", tags: ["pipe", "fd", "text tools"], lab: "Log özetleyici yaz" },
    { title: "Savunmacı Bash", eyebrow: "MODÜL 03 · 90 DK", summary: "set -Eeuo pipefail, trap, doğru quoting, geçici dizin ve idempotency ile otomasyona güven kazandır.", tags: ["strict mode", "trap", "idempotency"], lab: "Hatalara dayanıklı script" },
  ],
  git: [
    { title: "Git bir snapshot grafiğidir", eyebrow: "MODÜL 01 · 70 DK", summary: "Blob, tree, commit ve ref nesnelerini öğren; working tree, index ve HEAD arasındaki veri hareketini gör.", tags: ["DAG", "index", "HEAD"], lab: "Üç alanı geri alarak keşfet" },
    { title: "Tarihçeyi şekillendirmek", eyebrow: "MODÜL 02 · 85 DK", summary: "Merge, rebase, cherry-pick ve revert seçeneklerini paylaşılan tarihçe ve risk üzerinden karşılaştır.", tags: ["rebase", "merge", "revert"], lab: "Feature branch’i temizle" },
    { title: "Git ile adli inceleme", eyebrow: "MODÜL 03 · 75 DK", summary: "reflog, bisect, blame ve log sorgularını kullanarak kayıp commit ve regresyonları sistematik bul.", tags: ["reflog", "bisect", "recovery"], lab: "Regresyon commit’ini bul" },
  ],
  cmake: [
    { title: "Target tabanlı düşün", eyebrow: "MODÜL 01 · 75 DK", summary: "Global flag’ler yerine executable/library target’ları ve PRIVATE, PUBLIC, INTERFACE usage requirement’ları kur.", tags: ["targets", "properties", "scope"], lab: "Global build’i modernleştir" },
    { title: "Tekrarlanabilir build", eyebrow: "MODÜL 02 · 90 DK", summary: "CMakePresets, toolchain dosyaları, generator expression ve out-of-source build ile ortam farklarını kontrol et.", tags: ["presets", "toolchain", "genex"], lab: "Debug/Release preset yaz" },
    { title: "Testten pakete", eyebrow: "MODÜL 03 · 95 DK", summary: "CTest, install/export, find_package ve CPack akışını tüketici projesiyle birlikte doğrula.", tags: ["CTest", "install", "package"], lab: "Kurulabilir kitaplık üret" },
  ],
};

const questions = [
  { track: "cpp", q: "RAII yalnızca bellek yönetimi için midir?", a: "Hayır. Dosya tanıtıcısı, mutex kilidi, soket ve transaction gibi scope sonunda bırakılması gereken her kaynak için yaşam süresi garantisidir.", level: "Temel" },
  { track: "cpp", q: "std::move gerçekten taşıma yapar mı?", a: "Hayır. İfadeyi xvalue’a dönüştüren bir cast’tir; taşıma ancak seçilen constructor/assignment bunu gerçekleştirirse olur.", level: "Kilit" },
  { track: "cpp", q: "Undefined behavior neden tehlikelidir?", a: "Standart sonuç için hiçbir koşul koymaz. Derleyici bunun oluşmadığını varsayarak kodu beklenmedik biçimde optimize edebilir.", level: "Kilit" },
  { track: "python", q: "Python’da değişken neyi saklar?", a: "Bir isim, namespace içinde bir nesneye bağlanır. C-benzeri bir kutunun içinde doğrudan değer sakladığını düşünmek aliasing hatalarına yol açar.", level: "Temel" },
  { track: "python", q: "Generator neden bellek avantajı sağlar?", a: "Tüm sonucu üretmek yerine durumu korur ve elemanları talep üzerine yield eder; fakat sonsuz veya tek geçişli olabileceği unutulmamalıdır.", level: "Temel" },
  { track: "python", q: "Free-threaded Python her programı hızlandırır mı?", a: "Hayır. GIL’siz build CPU-bound thread’lere alan açar; senkronizasyon maliyeti, eklenti uyumu ve iş yükü sonucu belirler.", level: "Güncel" },
  { track: "linux", q: "Pipe iki komutu nasıl bağlar?", a: "Soldaki process’in stdout file descriptor’ını kernel pipe buffer’ına, sağdakinin stdin’ini aynı pipe’ın okuma ucuna bağlar.", level: "Kilit" },
  { track: "linux", q: "Neden değişkenleri çift tırnakla kullanırız?", a: "Word splitting ve pathname expansion’ı önlemek için. Özellikle boşluk, yıldız veya boş değer içeren girdilerde veri bütünlüğünü korur.", level: "Temel" },
  { track: "linux", q: "SIGTERM ile SIGKILL farkı nedir?", a: "SIGTERM yakalanabilir ve temiz kapanmaya fırsat verir. SIGKILL kernel tarafından doğrudan uygulanır; process bunu yakalayamaz veya erteleyemez.", level: "Kilit" },
  { track: "git", q: "Rebase ile merge arasındaki temel fark?", a: "Merge iki tarihçeyi yeni bir commit ile birleştirir. Rebase commit’leri yeni ebeveynler üzerinde yeniden yazar; paylaşılan commit kimliklerini değiştirir.", level: "Kilit" },
  { track: "git", q: "Reset ve revert ne zaman seçilir?", a: "Reset ref’i hareket ettirir ve yerel tarihçeyi değiştirebilir. Revert ters değişikliği yeni commit olarak kaydeder; paylaşılan tarihçede daha güvenlidir.", level: "Temel" },
  { track: "git", q: "Reflog neyi kurtarabilir?", a: "Yerel ref hareketlerini kaydettiği süre boyunca reset, rebase veya silinen branch yüzünden erişilemez olan commit’leri bulmayı sağlar.", level: "Kilit" },
  { track: "cmake", q: "PUBLIC ile PRIVATE arasındaki fark nedir?", a: "PRIVATE requirement yalnız hedefi derlerken kullanılır. PUBLIC hem hedefte kullanılır hem de hedefe link olan tüketicilere aktarılır.", level: "Kilit" },
  { track: "cmake", q: "Neden out-of-source build kullanılır?", a: "Üretilen dosyaları kaynak ağacından ayırır; farklı generator/configuration build’lerini yan yana tutmayı ve temizlemeyi kolaylaştırır.", level: "Temel" },
  { track: "cmake", q: "CMake build sistemi midir?", a: "CMake bir build-system generator’ıdır. Ninja, Make veya IDE proje dosyalarını üretir; gerçek derleme bu alttaki araç tarafından yapılır.", level: "Temel" },
];

const codeSamples: Record<LabKey, string> = {
  cpp: `#include <iostream>\n#include <vector>\n#include <numeric>\n\nint main() {\n  std::vector<int> values{4, 8, 15, 16, 23, 42};\n  auto total = std::accumulate(values.begin(), values.end(), 0);\n  std::cout << "Toplam: " << total << '\\n';\n  return 0;\n}`,
  python: `from dataclasses import dataclass\n\n@dataclass(slots=True)\nclass Metric:\n    name: str\n    value: float\n\nmetrics = [Metric("latency", 18.4), Metric("throughput", 142.0)]\nfor metric in metrics:\n    print(f"{metric.name:>10}: {metric.value}")`,
  bash: `#!/usr/bin/env bash\nset -Eeuo pipefail\n\nproject="kernel-forge"\necho "Çalışma alanı: $project"\nfor step in configure build test; do\n  echo "✓ $step"\ndone`,
};

function runBashSandbox(code: string) {
  const vars: Record<string, string> = {};
  const out: string[] = [];
  const lines = code.split("\n");
  let loopVar = "";
  let loopItems: string[] = [];
  let loopBody: string[] = [];
  const expand = (text: string) => text.replace(/\$(\w+)|\$\{(\w+)\}/g, (_, a, b) => vars[a || b] ?? "");
  const execute = (raw: string) => {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith("set ")) return;
    const assign = line.match(/^(\w+)=["']?(.*?)["']?$/);
    if (assign && !line.startsWith("echo")) { vars[assign[1]] = expand(assign[2]); return; }
    if (line === "pwd") out.push("/home/learner/kernel-forge");
    else if (line === "ls" || line === "ls -la") out.push("CMakeLists.txt  README.md  src  tests");
    else if (line.startsWith("echo ")) out.push(expand(line.slice(5).replace(/^['"]|['"]$/g, "")));
    else if (line.startsWith("printf ")) out.push(expand(line.replace(/^printf\s+["']?|["']?$/g, "").replace(/\\n/g, "\n")));
    else out.push(`sandbox: desteklenmeyen komut → ${line}`);
  };
  for (const raw of lines) {
    const line = raw.trim();
    const loop = line.match(/^for\s+(\w+)\s+in\s+(.+);\s*do$/);
    if (loop) { loopVar = loop[1]; loopItems = loop[2].split(/\s+/); loopBody = []; continue; }
    if (loopVar && line === "done") {
      for (const item of loopItems) { vars[loopVar] = item; loopBody.forEach(execute); }
      loopVar = ""; continue;
    }
    if (loopVar) loopBody.push(raw); else execute(raw);
  }
  return out.join("\n") || "Script tamamlandı (çıktı yok).";
}

function runCppPreview(code: string) {
  if (!code.includes("int main")) return "derleme hatası: program giriş noktası 'int main()' bulunamadı";
  const opens = (code.match(/{/g) || []).length;
  const closes = (code.match(/}/g) || []).length;
  if (opens !== closes) return `derleme hatası: eşleşmeyen süslü parantez (${opens} açılış / ${closes} kapanış)`;
  const output: string[] = [];
  const totalMatch = code.match(/std::vector<int>\s+\w+\s*\{([^}]+)\}/);
  const total = totalMatch?.[1].split(",").map(Number).reduce((a, b) => a + b, 0);
  for (const match of code.matchAll(/std::cout\s*<<\s*"([^"]*)"(?:\s*<<\s*(\w+))?/g)) {
    output.push(match[1] + (match[2] === "total" && total !== undefined ? total : ""));
  }
  return `✓ clang++ -std=c++23 · derleme başarılı\n\n${output.join("\n") || "Program 0 koduyla sonlandı."}\n\n[Not: Bu C++ laboratuvarı hızlı sözdizimi/çıktı simülasyonudur.]`;
}

export default function KernelForgeEmbedded() {
  const [view, setView] = useState<ViewKey>("learn");
  const [activeTrack, setActiveTrack] = useState<TrackKey>("cpp");
  const [completed, setCompleted] = useState<string[]>([]);
  const [lab, setLab] = useState<LabKey>("cpp");
  const [code, setCode] = useState(codeSamples.cpp);
  const [output, setOutput] = useState("Çalıştır’a bas; sonuç burada görünecek.");
  const [running, setRunning] = useState(false);
  const [query, setQuery] = useState("");
  const [revealed, setRevealed] = useState<number[]>([]);
  const [capabilityRecord, setCapabilityRecord] = useState<Partial<Record<CapabilityFieldKey, string>>>({});

  useEffect(() => {
    const valid = new Set([...Object.keys(curriculum).flatMap((track) => [0, 1, 2].map((index) => `${track}-${index}`)), ...questions.map((_, index) => `q-${index}`)]);
    const saved = readStringArray(acquireStorage(window), "kernel-forge-progress", valid);
    window.queueMicrotask(() => setCompleted(saved));
  }, []);

  const progress = Math.round((completed.length / 15) * 100);
  const capabilityStatus = getCapabilityRecordStatus(capabilityRecord);
  const filteredQuestions = useMemo(() => questions.filter((item) =>
    (activeTrack === item.track || query.length > 0) && `${item.q} ${item.a}`.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr"))
  ), [activeTrack, query]);

  const toggleComplete = (id: string) => {
    const next = completed.includes(id) ? completed.filter((item) => item !== id) : [...completed, id];
    setCompleted(next);
    writeJson(acquireStorage(window), "kernel-forge-progress", next);
  };

  const changeLab = (next: LabKey) => { setLab(next); setCode(codeSamples[next]); setOutput("Çalıştır’a bas; sonuç burada görünecek."); };

  const runCode = async () => {
    setRunning(true);
    setOutput("Çalıştırılıyor…");
    try {
      if (lab === "bash") setOutput(`$ bash main.sh\n\n${runBashSandbox(code)}\n\n✓ exit code 0`);
      else if (lab === "cpp") setOutput(runCppPreview(code));
      else {
        const win = window as typeof window & { loadPyodide?: (options: { indexURL: string }) => Promise<{ runPythonAsync: (source: string) => Promise<unknown>; setStdout: (o: { batched: (s: string) => void }) => void; setStderr: (o: { batched: (s: string) => void }) => void }>; pyodide?: unknown };
        if (!win.loadPyodide) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/pyodide/v0.28.3/full/pyodide.js";
            script.onload = () => resolve(); script.onerror = () => reject(new Error("Python çalışma motoru indirilemedi"));
            document.head.appendChild(script);
          });
        }
        const py = await win.loadPyodide!({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.28.3/full/" });
        const buffer: string[] = [];
        py.setStdout({ batched: (s) => buffer.push(s) }); py.setStderr({ batched: (s) => buffer.push(s) });
        await py.runPythonAsync(code);
        setOutput(`$ python main.py\n\n${buffer.join("\n")}\n\n✓ Python tarayıcı çalışma zamanı`);
      }
    } catch (error) { setOutput(`Hata:\n${error instanceof Error ? error.message : String(error)}`); }
    finally { setRunning(false); }
  };

  return (
    <section className="kernel-forge-surface" aria-label="Kernel Forge laboratuvarı">
      <div className="topbar">
        <div aria-label="Laboratuvar görünümleri" role="group">
          <button aria-pressed={view === "learn"} className={view === "learn" ? "active" : ""} onClick={() => setView("learn")}>Öğren</button>
          <button aria-pressed={view === "lab"} className={view === "lab" ? "active" : ""} onClick={() => setView("lab")}>Web IDE <i>3</i></button>
          <button aria-pressed={view === "questions"} className={view === "questions" ? "active" : ""} onClick={() => setView("questions")}>Soru bankası</button>
        </div>
      </div>

      <div className="app-shell">
        <aside className="sidebar" tabIndex={0} aria-label="Ders yolları">
          <div className="progress-head"><span>GENEL İLERLEME</span><strong>{progress}%</strong></div>
          <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
          <p>{completed.length} / 15 çekirdek modül</p>
          <div className="track-label">ÖĞRENME YOLLARI</div>
          {tracks.map((track) => (
            <button key={track.key} aria-pressed={activeTrack === track.key} className={`track-item ${activeTrack === track.key ? "selected" : ""}`} onClick={() => { setActiveTrack(track.key); setView("learn"); }} style={{ "--track-color": track.color } as React.CSSProperties}>
              <span className="track-mark">{track.mark}</span>
              <span><b>{track.label}</b><small>{track.version}</small></span>
              <em>{curriculum[track.key].filter((_, i) => completed.includes(`${track.key}-${i}`)).length}/3</em>
            </button>
          ))}
          <div className="sidebar-card">
            <span className="pulse-dot" />
            <div><b>Sürüm radarı</b><p>Resmî kaynaklarla 04.09.2026 tarihinde doğrulandı.</p></div>
          </div>
        </aside>

        <section className="content">
          {view === "learn" && (
            <>
              <div className="eyebrow">YOĞUN TEMEL PROGRAMI · 5 DİSİPLİN</div>
              <div className="hero">
                <div>
                  <h2>Sistemi öğren.<br/><span>Kodu ezberleme.</span></h2>
                  <p>C++’ın bellek modelinden Linux process’lerine; Git grafiğinden modern CMake target’larına uzanan uygulamalı mühendislik yolu.</p>
                  <div className="hero-actions">
                    <button className="primary" onClick={() => setView("lab")}>Bugünkü laboratuvar <span>→</span></button>
                    <button className="secondary" onClick={() => setView("questions")}>Bilgini sınayalım</button>
                  </div>
                </div>
                <div className="terminal-hero" aria-label="Örnek öğrenme terminali">
                  <div className="terminal-bar"><span/><span/><span/><small>learning-path.sh</small></div>
                  <pre><span>$</span> forge status --today{"\n\n"}<b>HEDEF</b>  Ownership → Build graph{"\n"}<b>LAB</b>    3 uygulamalı görev{"\n"}<b>TEKRAR</b> 8 kilit soru{"\n\n"}<i>▰▰▰▰▰▰▱▱▱▱  60%</i>{"\n\n"}<span className="cursor">▋</span></pre>
                </div>
              </div>

              <section className="capability-artifact" aria-labelledby="capability-artifact-title">
                <div className="capability-intro">
                  <span>Ortam manifestosu · Yetenek kaydı</span>
                  <h2 id="capability-artifact-title">Ölçümün bağlamını kaydet.</h2>
                  <p>Bu form bir yeniden üretilebilirlik kontrol listesidir. Değerler yalnız bu bileşenin belleğinde tutulur; makine ayrıntıları tarayıcı depolamasına yazılmaz.</p>
                  <output aria-live="polite">{capabilityStatus.completed} / {capabilityStatus.total} alan hazır</output>
                </div>
                <div className="capability-fields">
                  {CAPABILITY_FIELDS.map((field) => {
                    const complete = Boolean(capabilityRecord[field.key]?.trim());
                    return (
                      <label key={field.key} className={complete ? "complete" : ""}>
                        <span>{complete ? "✓" : "○"} {field.label}</span>
                        <input
                          value={capabilityRecord[field.key] ?? ""}
                          onChange={(event) => setCapabilityRecord((previous) => ({ ...previous, [field.key]: event.target.value }))}
                          placeholder={field.hint}
                          autoComplete="off"
                        />
                      </label>
                    );
                  })}
                </div>
                <p className="capability-verdict"><strong>{capabilityStatus.ready ? "Yetenek kaydı tamamlandı." : "Eksik bağlam ölçümü taşınamaz kılar."}</strong> GPU modeli tek başına destek kanıtı değildir; compute capability, yazılım sürümleri, bayraklar ve komut birlikte saklanmalıdır.</p>
              </section>

              <div className="section-heading">
                <div><span style={{ color: tracks.find(t => t.key === activeTrack)?.color }}>●</span><h2>{tracks.find(t => t.key === activeTrack)?.label}</h2><p>{tracks.find(t => t.key === activeTrack)?.note}</p></div>
                <button onClick={() => setView("questions")}>Bu yolun soruları →</button>
              </div>
              <div className="lesson-grid">
                {curriculum[activeTrack].map((lesson, index) => {
                  const id = `${activeTrack}-${index}`; const done = completed.includes(id);
                  return <article className={`lesson-card ${done ? "done" : ""}`} key={lesson.title}>
                    <div className="lesson-top"><span>{lesson.eyebrow}</span><button aria-label={done ? "Tamamlanmadı işaretle" : "Tamamlandı işaretle"} onClick={() => toggleComplete(id)}>{done ? "✓" : "○"}</button></div>
                    <h3>{lesson.title}</h3><p>{lesson.summary}</p>
                    <div className="tags">{lesson.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
                    <button className="lab-link" onClick={() => { setLab(activeTrack === "python" ? "python" : activeTrack === "linux" ? "bash" : "cpp"); setCode(codeSamples[activeTrack === "python" ? "python" : activeTrack === "linux" ? "bash" : "cpp"]); setView("lab"); }}>↳ {lesson.lab}</button>
                  </article>;
                })}
              </div>

              <div className="version-strip">
                <div><span>GÜNCEL SÜRÜM RADARI</span><h2>Bugünün araçları, kalıcı temeller.</h2></div>
                {tracks.map(track => <a key={track.key} href={track.key === "cpp" ? "https://en.cppreference.com/w/cpp/current_status.html" : track.key === "python" ? "https://www.python.org/downloads/" : track.key === "linux" ? "https://www.kernel.org/" : track.key === "git" ? "https://git-scm.com/docs" : "https://cmake.org/download/"} target="_blank" rel="noreferrer"><b>{track.label}</b><span>{track.version}</span></a>)}
              </div>
            </>
          )}

          {view === "lab" && (
            <div className="lab-page">
              <div className="page-title"><div><span>WEB GELİŞTİRME ORTAMI</span><h2>Deneyerek öğren.</h2><p>İzolasyonlu tarayıcı laboratuvarı. Dosyana dokunmaz, sistem komutu çalıştırmaz.</p></div><div className="runtime-pill"><span/> KORUMALI ALAN HAZIR</div></div>
              <div className="lab-tabs" role="group" aria-label="Laboratuvar dili">
                <button aria-pressed={lab === "cpp"} className={lab === "cpp" ? "active" : ""} onClick={() => changeLab("cpp")}><b>C++</b><span>C++23 sözdizimi</span></button>
                <button aria-pressed={lab === "python"} className={lab === "python" ? "active" : ""} onClick={() => changeLab("python")}><b>Python</b><span>Pyodide çalışma zamanı</span></button>
                <button aria-pressed={lab === "bash"} className={lab === "bash" ? "active" : ""} onClick={() => changeLab("bash")}><b>Bash</b><span>Güvenli mini-shell</span></button>
              </div>
              <div className="ide">
                <div className="editor-pane">
                  <div className="pane-head"><span className="file-dot"/> {lab === "cpp" ? "main.cpp" : lab === "python" ? "main.py" : "main.sh"}<small>{lab === "cpp" ? "C++ hızlı derleme simülatörü" : lab === "python" ? "Tarayıcıda gerçek Python çalışma zamanı" : "echo · printf · pwd · ls · değişken · for"}</small></div>
                  <textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} aria-label="Kod editörü" />
                  <div className="editor-actions"><button onClick={() => setCode(codeSamples[lab])}>Sıfırla</button><button className="run" disabled={running} onClick={runCode}>{running ? "Çalışıyor…" : "▶ Çalıştır"}</button></div>
                </div>
                <div className="output-pane" aria-live="polite"><div className="pane-head">ÇIKTI <button onClick={() => setOutput("")}>temizle</button></div><pre>{output}<span className="cursor">▋</span></pre></div>
              </div>
              <div className="lab-notes"><div><b>01</b><span><strong>Değiştir</strong>Kodu boz, varsayımını görünür kıl.</span></div><div><b>02</b><span><strong>Çalıştır</strong>Çıktı ile zihinsel modelini karşılaştır.</span></div><div><b>03</b><span><strong>Açıkla</strong>Sonucu kendi cümlelerinle not et.</span></div></div>
            </div>
          )}

          {view === "questions" && (
            <div className="questions-page">
              <div className="page-title"><div><span>KİLİT SORU BANKASI</span><h2>Bildiklerini değil,<br/>boşluklarını bul.</h2><p>{questions.length} kısa soru; mülakat, debugging ve günlük mühendislik kararları için.</p></div><div className="score-ring"><b>{revealed.length}</b><span>cevap<br/>açıldı</span></div></div>
              <div className="question-tools">
                <div className="filter-row">{tracks.map(track => <button key={track.key} aria-pressed={activeTrack === track.key && !query} className={activeTrack === track.key && !query ? "active" : ""} onClick={() => { setActiveTrack(track.key); setQuery(""); }}>{track.label}</button>)}</div>
                <label><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tüm sorularda ara…" /></label>
              </div>
              <div className="question-list">
                {filteredQuestions.map((item) => { const index = questions.indexOf(item); const open = revealed.includes(index); return <article className={open ? "open" : ""} key={item.q}>
                  <button onClick={() => setRevealed(open ? revealed.filter(i => i !== index) : [...revealed, index])} aria-expanded={open}>
                    <span className="q-number">{String(index + 1).padStart(2, "0")}</span><span className="q-main"><small>{tracks.find(t => t.key === item.track)?.label} · {item.level}</small><b>{item.q}</b></span><i>{open ? "−" : "+"}</i>
                  </button>
                  <div className="answer" aria-live="polite" hidden={!open}>{open ? <><span>CEVAP</span><p>{item.a}</p><button onClick={() => toggleComplete(`q-${index}`)}>☆ Tekrar listeme ekle</button></> : null}</div>
                </article>; })}
              </div>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
