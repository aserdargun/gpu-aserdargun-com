import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const moduleIds = [
  "toolchain", "architecture", "memory", "triton", "operators", "correctness",
  "profiling", "cutlass", "inference", "multigpu", "systems",
];

test("atlas data lives in focused registry and copy modules", async () => {
  const [registry, copy, shell] = await Promise.all([
    readFile(new URL("../app/atlas/module-registry.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/atlas/copy.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/kernel-atlas.tsx", import.meta.url), "utf8"),
  ]);

  for (const id of moduleIds) assert.match(registry, new RegExp(`"${id}"`));
  assert.match(registry, /export const MODULE_IDS/);
  assert.match(registry, /export const modulesByLocale/);
  assert.match(registry, /export const roadmapByLocale/);
  assert.match(copy, /export const uiByLocale/);
  assert.doesNotMatch(shell, /const trModules|const enModules|const trWeeks|const enWeeks|const ui =/);
});

test("atlas shell is split into focused components", async () => {
  const files = ["AtlasShell", "AtlasNavigation", "Overview", "ArchitectureMatrix", "ModuleFrame"];
  for (const name of files) {
    const source = await readFile(new URL(`../app/atlas/${name}.tsx`, import.meta.url), "utf8");
    assert.match(source, new RegExp(`(?:export default function|export function) ${name}`));
  }
});

test("overview and module frame expose architecture and maturity context", async () => {
  const [matrix, frame, overview] = await Promise.all([
    readFile(new URL("../app/atlas/ArchitectureMatrix.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/atlas/ModuleFrame.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/atlas/Overview.tsx", import.meta.url), "utf8"),
  ]);
  for (const id of ["ada", "hopper", "blackwell", "rubin"]) assert.match(matrix, new RegExp(id));
  assert.match(matrix, /SM89/);
  assert.match(matrix, /SM90/);
  assert.match(matrix, /SM100/);
  assert.match(matrix, /SM120/);
  assert.match(matrix, /SM107/);
  assert.match(frame, /module\.maturity/);
  assert.match(overview, /lastVisitedId/);
  assert.doesNotMatch(overview, /sm_89/);
});

test("missing laboratory renderer has a localized recovery path", async () => {
  const shell = await readFile(new URL("../app/kernel-atlas.tsx", import.meta.url), "utf8");
  const copy = await readFile(new URL("../app/atlas/copy.ts", import.meta.url), "utf8");
  assert.match(shell, /lab == null/);
  assert.match(shell, /onShowOverview/);
  assert.match(copy, /moduleUnavailable/);
});

test("unavailable laboratory structurally suppresses completion actions", async () => {
  const [shell, frame] = await Promise.all([
    readFile(new URL("../app/kernel-atlas.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/atlas/ModuleFrame.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(shell, /showCompletionActions=\{lab != null\}/);
  const guardedActions = frame.match(/\{showCompletionActions \? \(([\s\S]*data-testid="atlas-complete"[\s\S]*data-testid="atlas-next"[\s\S]*?)\) : null\}/);
  assert.ok(guardedActions, "complete and next actions must share the unavailable-lab guard");
});

test("shell owns the content landmark and accessible drawer contract", async () => {
  const [shell, navigation] = await Promise.all([
    readFile(new URL("../app/atlas/AtlasShell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/atlas/AtlasNavigation.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(shell, /href="#atlas-content"/);
  assert.match(shell, /<main[^>]+id="atlas-content"/);
  assert.match(navigation, /aria-modal="true"/);
  assert.match(navigation, /role="dialog"/);
  assert.match(navigation, /event\.key === "Escape"/);
  assert.match(navigation, /document\.body\.style\.overflow/);
  assert.match(navigation, /menuButtonRef\.current\?\.focus\(\)/);
});

test("atlas state filters malformed and obsolete module ids", async () => {
  const { readCompleted, readLastVisited } = await import("../app/atlas/state.mjs");
  const values = new Map([
    ["kernel-atlas-completed", JSON.stringify(["toolchain", "obsolete", "toolchain", 7])],
    ["kernel-atlas-last-visited", "obsolete"],
  ]);
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const valid = new Set(["toolchain", "memory"]);
  assert.deepEqual(readCompleted(storage, valid), ["toolchain"]);
  assert.equal(readLastVisited(storage, valid), null);
});

test("atlas state writes stable completion and resume keys", async () => {
  const { writeCompleted, writeLastVisited } = await import("../app/atlas/state.mjs");
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  writeCompleted(storage, ["memory", "toolchain", "memory"]);
  writeLastVisited(storage, "memory");
  assert.equal(values.get("kernel-atlas-completed"), '["memory","toolchain"]');
  assert.equal(values.get("kernel-atlas-last-visited"), "memory");
});

test("atlas state fails closed when storage methods throw", async () => {
  const { readCompleted, readLastVisited, writeCompleted, writeLastVisited } = await import("../app/atlas/state.mjs");
  const storage = {
    getItem: () => { throw new Error("storage unavailable"); },
    setItem: () => { throw new Error("storage unavailable"); },
    removeItem: () => { throw new Error("storage unavailable"); },
  };
  const valid = new Set(["toolchain"]);
  assert.deepEqual(readCompleted(storage, valid), []);
  assert.equal(readLastVisited(storage, valid), null);
  assert.doesNotThrow(() => writeCompleted(storage, ["toolchain"]));
  assert.doesNotThrow(() => writeLastVisited(storage, "toolchain"));
});

test("atlas state safely acquires storage and persists locale", async () => {
  const {
    LANGUAGE_KEY,
    acquireLocalStorage,
    detectBrowserLanguage,
    readLanguage,
    writeLanguage,
  } = await import("../app/atlas/state.mjs");
  const deniedOwner = Object.defineProperty({}, "localStorage", {
    get() { throw new Error("storage denied"); },
  });
  const deniedStorage = {
    getItem: () => { throw new Error("storage denied"); },
    setItem: () => { throw new Error("storage denied"); },
  };

  assert.equal(LANGUAGE_KEY, "kernel-atlas-language");
  assert.equal(acquireLocalStorage(deniedOwner), null);
  assert.equal(readLanguage(deniedStorage), null);
  assert.doesNotThrow(() => writeLanguage(deniedStorage, "en"));
  assert.equal(detectBrowserLanguage(Object.defineProperty({}, "navigator", { get() { throw new Error("navigator denied"); } })), null);
  assert.equal(detectBrowserLanguage({ navigator: Object.defineProperty({}, "language", { get() { throw new Error("language denied"); } }) }), null);
  assert.equal(detectBrowserLanguage({ navigator: { language: "en-US" } }), "en");
  assert.equal(detectBrowserLanguage({ navigator: { language: "tr-TR" } }), "tr");

  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  writeLanguage(storage, "tr");
  assert.equal(readLanguage(storage), "tr");
  values.set(LANGUAGE_KEY, "invalid");
  assert.equal(readLanguage(storage), null);
  values.delete(LANGUAGE_KEY);
  values.set("gpu-atlas-lang", "en");
  assert.equal(readLanguage(storage), "en", "legacy stored locale remains consumable");
});
