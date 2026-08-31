"use client";
/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- Labelled overflow regions must remain keyboard-scrollable. */

import { useEffect, useMemo, useState } from "react";
import { acquireStorage, readStringArray, writeJson } from "./atlas/lab-storage.mjs";

type TrackKey = "cpp" | "python" | "linux" | "git" | "cmake";
type ViewKey = "learn" | "lab" | "questions";
type LabKey = "cpp" | "python" | "bash";
type CapabilityFieldKey = "gpuModel" | "computeCapability" | "driver" | "toolkit" | "framework" | "compilerFlags" | "benchmarkCommand";

export const CAPABILITY_FIELDS: ReadonlyArray<{ key: CapabilityFieldKey; label: string; hint: string }> = [
  { key: "gpuModel", label: "GPU model", hint: "e.g. NVIDIA H100" },
  { key: "computeCapability", label: "Compute capability", hint: "e.g. 9.0 / sm_90" },
  { key: "driver", label: "Driver", hint: "e.g. 580.xx" },
  { key: "toolkit", label: "CUDA or ROCm version", hint: "e.g. CUDA 13.3" },
  { key: "framework", label: "Framework version", hint: "e.g. PyTorch 2.x" },
  { key: "compilerFlags", label: "Compiler flags", hint: "e.g. -O3 -arch=sm_90" },
  { key: "benchmarkCommand", label: "Benchmark command", hint: "e.g. ncu -o baseline …" },
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
    version: "C++23 • C++26 radar",
    note: "From value semantics to concurrency",
    lessons: ["Compilation model & type system", "RAII, ownership & lifespan", "STL, ranges & algorithms", "Templates, concepts & constexpr", "Error management & testing", "Concurrency & performance"],
  },
  {
    key: "python",
    label: "Python",
    mark: "Py",
    color: "#7dd3fc",
    version: "Python 3.14.6",
    note: "From clean code to production tools",
    lessons: ["Data model & collections", "Functions, closure & decorator", "Typing, dataclass & protocol", "Iterator, generator & context manager", "Asyncio & concurrency", "Packaging, testing & profiling"],
  },
  {
    key: "linux",
    label: "Linux & Bash",
    mark: "$_",
    color: "#a7f3d0",
    version: "Kernel 7.1.5 stable",
    note: "Shell dominance and system foundations",
    lessons: ["File system & permissions", "Process, signal & job control", "Pipe, redirect & text tools", "Bash scripting security", "Systemd, logs & network", "Performance observation"],
  },
  {
    key: "git",
    label: "Git",
    mark: "Git",
    color: "#fb7185",
    version: "Git 2.55",
    note: "Understand the commit graph for real",
    lessons: ["Object model & three trees", "Branch, merge & rebase", "Remote workflows", "Conflict resolution", "Bisect, reflog & recovery", "Team strategies"],
  },
  {
    key: "cmake",
    label: "CMake",
    mark: "CM",
    color: "#c4b5fd",
    version: "CMake 4.4",
    note: "Modern target based build systems",
    lessons: ["Configure → generate → build", "Targets & usage requirements", "Libraries & transitive deps", "Presets & toolchains", "CTest, install & package", "CPS & instrumentation"],
  },
];

const curriculum: Record<TrackKey, Array<{ title: string; eyebrow: string; summary: string; tags: string[]; lab: string }>> = {
  cpp: [
    { title: "The world the compiler sees", eyebrow: "MODULE 01 · 75 MIN", summary: "Establish translation unit, header, linker and ABI separation. Distinguish between undefined behavior and implementation-defined behavior.", tags: ["compiler", "linker", "ABI"], lab: "Diagnose a link error" },
    { title: "RAII and explicit ownership", eyebrow: "MODULE 02 · 90 MIN", summary: "Move beyond stack/heap memorization; reason about scope, destructors, move semantics, and smart-pointer choices through object lifetime.", tags: ["RAII", "move", "smart pointer"], lab: "Fix a resource leak with RAII" },
    { title: "Expressive power with STL", eyebrow: "MODULE 03 · 80 MIN", summary: "Use container selection, iterator invalidation, ranges pipelines and algorithm complexity with measurable decisions.", tags: ["ranges", "span", "complexity"], lab: "Convert loop to ranges pipeline" },
  ],
  python: [
    { title: "Python data model", eyebrow: "MODULE 01 · 70 MIN", summary: "Difference between name, object and reference; Learn the relationship between mutability, identity and special methods and protocols.", tags: ["object model", "dunder", "mutability"], lab: "Solve the mutable default trap" },
    { title: "Modern typing", eyebrow: "MODULE 02 · 80 MIN", summary: "Build strong contracts without breaking runtime behavior by using protocols, generics, type narrowing, and deferred annotations.", tags: ["typing", "Protocol", "3.14"], lab: "Design a Protocol" },
    { title: "Concurrency options", eyebrow: "MODULE 03 · 95 MIN", summary: "Choose asyncio, thread, process and 3.14 free-threaded build based on I/O, CPU and shared state.", tags: ["asyncio", "free-threading", "profiling"], lab: "Write async job queue" },
  ],
  linux: [
    { title: "Shell is a language, not a terminal", eyebrow: "MODULE 01 · 65 MIN", summary: "Separate the concepts of terminal, shell, TTY and process; Experiment with exit code, environment and quoting behavior.", tags: ["shell", "process", "exit code"], lab: "Safe argument handling" },
    { title: "Data flow through pipes", eyebrow: "MODULE 02 · 85 MIN", summary: "Combine stdin, stdout, stderr, file descriptors, and pipe chains with grep, sed, awk, and xargs.", tags: ["pipe", "fd", "text tools"], lab: "Write a log summarizer" },
    { title: "Defensive Bash", eyebrow: "MODULE 03 · 90 MIN", summary: "Make automation safer with set -Eeuo pipefail, traps, correct quoting, temporary directories, and idempotency.", tags: ["strict mode", "trap", "idempotency"], lab: "Write an error-tolerant script" },
  ],
  git: [
    { title: "Git is a snapshot graph", eyebrow: "MODULE 01 · 70 MIN", summary: "Learn blob, tree, commit, and ref objects; trace data movement between the working tree, index, and HEAD.", tags: ["DAG", "index", "HEAD"], lab: "Explore the three trees with restore" },
    { title: "Shape history deliberately", eyebrow: "MODULE 02 · 85 MIN", summary: "Compare merge, rebase, cherry-pick, and revert according to shared-history risk.", tags: ["rebase", "merge", "revert"], lab: "Clean up a feature branch" },
    { title: "Forensic analysis with Git", eyebrow: "MODULE 03 · 75 MIN", summary: "Systematically find missing commits and regressions using reflog, bisect, blame and log queries.", tags: ["reflog", "bisect", "recovery"], lab: "Find regression commit" },
  ],
  cmake: [
    { title: "Think in targets", eyebrow: "MODULE 01 · 75 MIN", summary: "Define executable and library targets plus PRIVATE, PUBLIC, and INTERFACE usage requirements instead of global flags.", tags: ["targets", "properties", "scope"], lab: "Modernize a global build" },
    { title: "Reproducible builds", eyebrow: "MODULE 02 · 90 MIN", summary: "Control environment differences with CMakePresets, toolchain files, generator expressions, and out-of-source builds.", tags: ["presets", "toolchain", "genex"], lab: "Write Debug and Release presets" },
    { title: "From test to package", eyebrow: "MODULE 03 · 95 MIN", summary: "Verify CTest, install/export, find_package and CPack flow with consumer project.", tags: ["CTest", "install", "package"], lab: "Generate installable library" },
  ],
};

const questions = [
  { track: "cpp", q: "Is RAII only for memory management?", a: "No. It is a lifetime guarantee for every resource released at the end of a scope, such as a file handle, mutex lock, socket, or transaction.", level: "Foundation" },
  { track: "cpp", q: "Does std::move actually move?", a: "No. It casts an expression to an xvalue; a move happens only if the selected constructor or assignment operator performs one.", level: "Key" },
  { track: "cpp", q: "Why is undefined behavior dangerous?", a: "The standard places no requirements on the result. The compiler may assume it never occurs and optimize the program in unexpected ways.", level: "Key" },
  { track: "python", q: "What does a variable store in Python?", a: "A name is bound to an object in a namespace. Treating it like a C-style value box leads to aliasing mistakes.", level: "Foundation" },
  { track: "python", q: "Why can a generator use less memory?", a: "It preserves state and yields elements on demand instead of producing the full result. A generator may also be infinite or single-pass.", level: "Foundation" },
  { track: "python", q: "Does free-threaded Python speed up every program?", a: "No. A build without the GIL creates room for CPU-bound threads, but synchronization cost, extension compatibility, and workload shape determine the result.", level: "Current" },
  { track: "linux", q: "How does a pipe connect two commands?", a: "It connects the left process's stdout to a kernel pipe buffer and the right process's stdin to the read end of that pipe.", level: "Key" },
  { track: "linux", q: "Why do we double-quote variables?", a: "To prevent word splitting and pathname expansion, especially when values contain spaces, asterisks, or empty strings.", level: "Foundation" },
  { track: "linux", q: "What is the difference between SIGTERM and SIGKILL?", a: "SIGTERM can be caught and allows a clean shutdown. SIGKILL is enforced directly by the kernel; the process cannot catch or defer it.", level: "Key" },
  { track: "git", q: "What is the main difference between rebase and merge?", a: "Merge joins two histories with a new commit. Rebase rewrites commits onto new parents, changing commit IDs.", level: "Key" },
  { track: "git", q: "When should you choose reset or revert?", a: "Reset moves a ref and may rewrite local history. Revert records the inverse change as a new commit, making it safer for shared history.", level: "Foundation" },
  { track: "git", q: "What can reflog recover?", a: "Because it records local ref updates, it can find commits made unreachable by reset, rebase, or deleting a branch.", level: "Key" },
  { track: "cmake", q: "What is the difference between PUBLIC and PRIVATE?", a: "A PRIVATE requirement is used only to compile the target. A PUBLIC requirement is also propagated to consumers that link against it.", level: "Key" },
  { track: "cmake", q: "Why use an out-of-source build?", a: "It separates generated files from the source tree, making side-by-side configurations easier to keep and clean.", level: "Foundation" },
  { track: "cmake", q: "Is CMake a build system?", a: "CMake is a build-system generator. It produces Ninja, Make, or IDE project files; the selected backend performs the actual build.", level: "Foundation" },
];

const codeSamples: Record<LabKey, string> = {
  cpp: `#include <iostream>\n#include <vector>\n#include <numeric>\n\nint main() {\n  std::vector<int> values{4, 8, 15, 16, 23, 42};\n  auto total = std::accumulate(values.begin(), values.end(), 0);\n  std::cout << "Total: " << total << '\\n';\n  return 0;\n}`,
  python: `from dataclasses import dataclass\n\n@dataclass(slots=True)\nclass Metric:\n    name: str\n    value: float\n\nmetrics = [Metric("latency", 18.4), Metric("throughput", 142.0)]\nfor metric in metrics:\n    print(f"{metric.name:>10}: {metric.value}")`,
  bash: `#!/usr/bin/env bash\nset -Eeuo pipefail\n\nproject="kernel-forge"\necho "Workspace: $project"\nfor step in configure build test; do\n  echo "✓ $step"\ndone`,
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
    else if (line === "ls" || line === "ls -la") out.push("CMakeLists.txt README.md src tests");
    else if (line.startsWith("echo ")) out.push(expand(line.slice(5).replace(/^['"]|['"]$/g, "")));
    else if (line.startsWith("printf ")) out.push(expand(line.replace(/^printf\s+["']?|["']?$/g, "").replace(/\\n/g, "\n")));
    else out.push(`sandbox: unsupported command → ${line}`);
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
  return out.join("\n") || "Script completed (no output).";
}

function runCppPreview(code: string) {
  if (!code.includes("int main")) return "compilation error: program entry point 'int main()' not found";
  const opens = (code.match(/{/g) || []).length;
  const closes = (code.match(/}/g) || []).length;
  if (opens !== closes) return `compilation error: mismatched braces (${opens} opening / ${closes} closing)`;
  const output: string[] = [];
  const totalMatch = code.match(/std::vector<int>\s+\w+\s*\{([^}]+)\}/);
  const total = totalMatch?.[1].split(",").map(Number).reduce((a, b) => a + b, 0);
  for (const match of code.matchAll(/std::cout\s*<<\s*"([^"]*)"(?:\s*<<\s*(\w+))?/g)) {
    output.push(match[1] + (match[2] === "total" && total !== undefined ? total : ""));
  }
  return `✓ clang++ -std=c++23 · build succeeded\n\n${output.join("\n") || "The program exited with code 0."}\n\n[Note: This C++ lab is a lightweight syntax and output simulation.]`;
}

export default function KernelForgeEmbedded() {
  const [view, setView] = useState<ViewKey>("learn");
  const [activeTrack, setActiveTrack] = useState<TrackKey>("cpp");
  const [completed, setCompleted] = useState<string[]>([]);
  const [lab, setLab] = useState<LabKey>("cpp");
  const [code, setCode] = useState(codeSamples.cpp);
  const [output, setOutput] = useState("Press Run; the result will appear here.");
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

  const changeLab = (next: LabKey) => { setLab(next); setCode(codeSamples[next]); setOutput("Press Run; the result will appear here."); };

  const runCode = async () => {
    setRunning(true);
    setOutput("Running…");
    try {
      if (lab === "bash") setOutput(`$ bash main.sh\n\n${runBashSandbox(code)}\n\n✓ exit code 0`);
      else if (lab === "cpp") setOutput(runCppPreview(code));
      else {
        const win = window as typeof window & { loadPyodide?: (options: { indexURL: string }) => Promise<{ runPythonAsync: (source: string) => Promise<unknown>; setStdout: (o: { batched: (s: string) => void }) => void; setStderr: (o: { batched: (s: string) => void }) => void }>; pyodide?: unknown };
        if (!win.loadPyodide) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/pyodide/v0.28.3/full/pyodide.js";
            script.onload = () => resolve(); script.onerror = () => reject(new Error("Python runtime engine failed to download"));
            document.head.appendChild(script);
          });
        }
        const py = await win.loadPyodide!({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.28.3/full/" });
        const buffer: string[] = [];
        py.setStdout({ batched: (s) => buffer.push(s) }); py.setStderr({ batched: (s) => buffer.push(s) });
        await py.runPythonAsync(code);
        setOutput(`$ python main.py\n\n${buffer.join("\n")}\n\n✓ Python browser runtime`);
      }
    } catch (error) { setOutput(`Error:\n${error instanceof Error ? error.message : String(error)}`); }
    finally { setRunning(false); }
  };

  return (
    <section className="kernel-forge-surface" aria-label="Kernel Forge laboratory">
      <div className="topbar">
        <div aria-label="Laboratory views" role="group">
          <button aria-pressed={view === "learn"} className={view === "learn" ? "active" : ""} onClick={() => setView("learn")}>Learn</button>
          <button aria-pressed={view === "lab"} className={view === "lab" ? "active" : ""} onClick={() => setView("lab")}>Web IDE <i>3</i></button>
          <button aria-pressed={view === "questions"} className={view === "questions" ? "active" : ""} onClick={() => setView("questions")}>Question bank</button>
        </div>
      </div>

      <div className="app-shell">
        <aside className="sidebar" tabIndex={0} aria-label="Learning tracks">
          <div className="progress-head"><span>GENERAL PROGRESS</span><strong>{progress}%</strong></div>
          <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
          <p>{completed.length} / 15 core modules</p>
          <div className="track-label">LEARNING WAYS</div>
          {tracks.map((track) => (
            <button key={track.key} aria-pressed={activeTrack === track.key} className={`track-item ${activeTrack === track.key ? "selected" : ""}`} onClick={() => { setActiveTrack(track.key); setView("learn"); }} style={{ "--track-color": track.color } as React.CSSProperties}>
              <span className="track-mark">{track.mark}</span>
              <span><b>{track.label}</b><small>{track.version}</small></span>
              <em>{curriculum[track.key].filter((_, i) => completed.includes(`${track.key}-${i}`)).length}/3</em>
            </button>
          ))}
          <div className="sidebar-card">
            <span className="pulse-dot" />
            <div><b>Version radar</b><p>It was confirmed by official sources on 09.08.2026.</p></div>
          </div>
        </aside>

        <section className="content">
          {view === "learn" && (
            <>
              <div className="eyebrow">INTENSIVE FOUNDATION PROGRAM · 5 DISCIPLINES</div>
              <div className="hero">
                <div>
                  <h2>Learn the system.<br/><span>Don't memorize the code.</span></h2>
                  <p>From C++'s memory model to Linux processes; A hands-on engineering path from Git graph to modern CMake targets.</p>
                  <div className="hero-actions">
                    <button className="primary" onClick={() => setView("lab")}>today's laboratory <span>→</span></button>
                    <button className="secondary" onClick={() => setView("questions")}>Let's test your knowledge</button>
                  </div>
                </div>
                <div className="terminal-hero" aria-label="Sample learning terminal">
                  <div className="terminal-bar"><span/><span/><span/><small>learning-path.sh</small></div>
                  <pre><span>$</span> forge status --today{"\n\n"}<b>AIM</b>  Ownership → Build graph{"\n"}<b>LAB</b>    3 hands-on missions{"\n"}<b>AGAIN</b> 8 key questions{"\n\n"}<i>▰▰▰▰▰▰▱▱▱▱  60%</i>{"\n\n"}<span className="cursor">▋</span></pre>
                </div>
              </div>

              <section className="capability-artifact" aria-labelledby="capability-artifact-title">
                <div className="capability-intro">
                  <span>ENVIRONMENT MANIFEST · CAPABILITY RECORD</span>
                  <h2 id="capability-artifact-title">Record the context of the measurement.</h2>
                  <p>This form is a reproducibility checklist. Values live only in component state; machine details are not written to browser storage.</p>
                  <output aria-live="polite">{capabilityStatus.completed} / {capabilityStatus.total} fields ready</output>
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
                <p className="capability-verdict"><strong>{capabilityStatus.ready ? "Capability record complete." : "Missing context makes a measurement non-portable."}</strong> A GPU model alone is not support evidence; preserve compute capability, software versions, flags, and the command together.</p>
              </section>

              <div className="section-heading">
                <div><span style={{ color: tracks.find(t => t.key === activeTrack)?.color }}>●</span><h2>{tracks.find(t => t.key === activeTrack)?.label}</h2><p>{tracks.find(t => t.key === activeTrack)?.note}</p></div>
                <button onClick={() => setView("questions")}>Questions of this path →</button>
              </div>
              <div className="lesson-grid">
                {curriculum[activeTrack].map((lesson, index) => {
                  const id = `${activeTrack}-${index}`; const done = completed.includes(id);
                  return <article className={`lesson-card ${done ? "done" : ""}`} key={lesson.title}>
                    <div className="lesson-top"><span>{lesson.eyebrow}</span><button aria-label={done ? "Mark as not completed" : "Mark complete"} onClick={() => toggleComplete(id)}>{done ? "✓" : "○"}</button></div>
                    <h3>{lesson.title}</h3><p>{lesson.summary}</p>
                    <div className="tags">{lesson.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
                    <button className="lab-link" onClick={() => { setLab(activeTrack === "python" ? "python" : activeTrack === "linux" ? "bash" : "cpp"); setCode(codeSamples[activeTrack === "python" ? "python" : activeTrack === "linux" ? "bash" : "cpp"]); setView("lab"); }}>↳ {lesson.lab}</button>
                  </article>;
                })}
              </div>

              <div className="version-strip">
                <div><span>CURRENT RELEASE RADAR</span><h2>Today's tools, enduring foundations.</h2></div>
                {tracks.map(track => <a key={track.key} href={track.key === "cpp" ? "https://en.cppreference.com/w/cpp/current_status.html" : track.key === "python" ? "https://www.python.org/downloads/" : track.key === "linux" ? "https://www.kernel.org/" : track.key === "git" ? "https://git-scm.com/docs" : "https://cmake.org/download/"} target="_blank" rel="noreferrer"><b>{track.label}</b><span>{track.version}</span></a>)}
              </div>
            </>
          )}

          {view === "lab" && (
            <div className="lab-page">
              <div className="page-title"><div><span>WEB IDE</span><h2>Learn by trying.</h2><p>A sandboxed browser lab that does not modify your files or run system commands.</p></div><div className="runtime-pill"><span/> SANDBOX READY</div></div>
              <div className="lab-tabs" role="group" aria-label="Laboratory language">
                <button aria-pressed={lab === "cpp"} className={lab === "cpp" ? "active" : ""} onClick={() => changeLab("cpp")}><b>C++</b><span>C++23 syntax</span></button>
                <button aria-pressed={lab === "python"} className={lab === "python" ? "active" : ""} onClick={() => changeLab("python")}><b>Python</b><span>Pyodide runtime</span></button>
                <button aria-pressed={lab === "bash"} className={lab === "bash" ? "active" : ""} onClick={() => changeLab("bash")}><b>bash</b><span>Secure mini-shell</span></button>
              </div>
              <div className="ide">
                <div className="editor-pane">
                  <div className="pane-head"><span className="file-dot"/> {lab === "cpp" ? "main.cpp" : lab === "python" ? "main.py" : "main.sh"}<small>{lab === "cpp" ? "C++ rapid compilation simulator" : lab === "python" ? "Real Python runtime in browser" : "echo · printf · pwd · ls · variable · for"}</small></div>
                  <textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} aria-label="Code editor" />
                  <div className="editor-actions"><button onClick={() => setCode(codeSamples[lab])}>reset</button><button className="run" disabled={running} onClick={runCode}>{running ? "It works…" : "▶ Run"}</button></div>
                </div>
                <div className="output-pane" aria-live="polite"><div className="pane-head">OUTPUT <button onClick={() => setOutput("")}>clear</button></div><pre>{output}<span className="cursor">▋</span></pre></div>
              </div>
              <div className="lab-notes"><div><b>01</b><span><strong>Change</strong>Break the code, make your assumption visible.</span></div><div><b>02</b><span><strong>run</strong>Compare the output with your mental model.</span></div><div><b>03</b><span><strong>explain</strong>Write down the result in your own words.</span></div></div>
            </div>
          )}

          {view === "questions" && (
            <div className="questions-page">
              <div className="page-title"><div><span>KEY QUESTION BANK</span><h2>Find the gaps,<br/>not just what you know.</h2><p>{questions.length} short questions for interviews, debugging, and everyday engineering decisions.</p></div><div className="score-ring"><b>{revealed.length}</b><span>answers<br/>opened</span></div></div>
              <div className="question-tools">
                <div className="filter-row">{tracks.map(track => <button key={track.key} aria-pressed={activeTrack === track.key && !query} className={activeTrack === track.key && !query ? "active" : ""} onClick={() => { setActiveTrack(track.key); setQuery(""); }}>{track.label}</button>)}</div>
                <label><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search all questions…" /></label>
              </div>
              <div className="question-list">
                {filteredQuestions.map((item) => { const index = questions.indexOf(item); const open = revealed.includes(index); return <article className={open ? "open" : ""} key={item.q}>
                  <button onClick={() => setRevealed(open ? revealed.filter(i => i !== index) : [...revealed, index])} aria-expanded={open}>
                    <span className="q-number">{String(index + 1).padStart(2, "0")}</span><span className="q-main"><small>{tracks.find(t => t.key === item.track)?.label} · {item.level}</small><b>{item.q}</b></span><i>{open ? "−" : "+"}</i>
                  </button>
                  <div className="answer" aria-live="polite" hidden={!open}>{open ? <><span>REPLY</span><p>{item.a}</p><button onClick={() => toggleComplete(`q-${index}`)}>☆ Add to my list again</button></> : null}</div>
                </article>; })}
              </div>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
