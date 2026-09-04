import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const stopScript = resolve(root, "tools/stop-local.mjs");
const environmentPath = resolve(root, ".codex/environments/environment.toml");

async function reservePort() {
  const server = createServer();
  await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address();
  assert.notEqual(address, null);
  const port = address.port;
  await new Promise((resolveClose) => server.close(resolveClose));
  return port;
}

async function waitForListener(port) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const result = spawnSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"], {
      encoding: "utf8",
    });
    if (result.status === 0 && result.stdout.trim()) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 50));
  }
  throw new Error(`listener on port ${port} did not become ready`);
}

async function startListener(port, cwd) {
  const source = [
    'import { createServer } from "node:http";',
    `createServer((_request, response) => response.end("ok")).listen(${port}, "127.0.0.1");`,
  ].join("\n");
  const child = spawn(process.execPath, ["--input-type=module", "--eval", source], {
    cwd,
    stdio: "ignore",
  });
  await waitForListener(port);
  return child;
}

function runStop(port) {
  return spawnSync(process.execPath, [stopScript, "--port", String(port), "--root", root], {
    cwd: root,
    encoding: "utf8",
    timeout: 10_000,
  });
}

async function terminate(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGTERM");
  await waitForExit(child);
}

async function waitForExit(child) {
  const deadline = Date.now() + 5_000;
  while (child.exitCode === null && child.signalCode === null && Date.now() < deadline) {
    await new Promise((resolveWait) => setTimeout(resolveWait, 20));
  }
  assert.equal(child.exitCode !== null || child.signalCode !== null, true, "listener stayed alive");
}

test("Stop terminates a listener owned by this checkout", async () => {
  const port = await reservePort();
  const listener = await startListener(port, root);
  try {
    const result = runStop(port);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Stopped/);
    await waitForExit(listener);
  } finally {
    await terminate(listener);
  }
});

test("Stop refuses a listener owned by another directory", async () => {
  const foreignRoot = await mkdtemp(resolve(tmpdir(), "gpu-atlas-foreign-"));
  const port = await reservePort();
  const listener = await startListener(port, foreignRoot);
  try {
    const result = runStop(port);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Refusing/);
    assert.equal(listener.exitCode, null);
    assert.equal(listener.signalCode, null);
  } finally {
    await terminate(listener);
    await rm(foreignRoot, { recursive: true, force: true });
  }
});

test("Codex environment delegates ordered actions to package scripts", async () => {
  const [environment, packageText, runner, viteConfig] = await Promise.all([
    readFile(environmentPath, "utf8"),
    readFile(resolve(root, "package.json"), "utf8"),
    readFile(resolve(root, "tools/run-local.mjs"), "utf8"),
    readFile(resolve(root, "vite.config.ts"), "utf8"),
  ]);
  const packageJson = JSON.parse(packageText);

  assert.match(environment, /version = 1/);
  assert.match(environment, /name = "GPU Kernel Atlas"/);
  assert.match(environment, /script = "npm ci"/);
  assert.deepEqual(
    [...environment.matchAll(/name = "(Run|Validate|Stop)"[\s\S]*?command = "([^"]+)"/g)].map(
      ([, name, command]) => [name, command],
    ),
    [
      ["Run", "npm run dev:codex"],
      ["Validate", "npm run validate:codex"],
      ["Stop", "npm run stop:local"],
    ],
  );
  assert.equal(packageJson.scripts["dev:codex"], "node tools/run-local.mjs");
  assert.equal(packageJson.scripts["validate:codex"], "node tools/validate-local.mjs");
  assert.equal(packageJson.scripts["stop:local"], "node tools/stop-local.mjs");
  assert.match(runner, /"--hostname", "127\.0\.0\.1"/);
  assert.doesNotMatch(runner, /"--host"/);
  assert.match(viteConfig, /strictPort: true/);
});

test("lint excludes repository-owned worktrees and generated output", async () => {
  const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  const lintScript = packageJson.scripts.lint;

  assert.match(lintScript, /--ignore-pattern (?:\.\/)?\.worktrees(?:\/\*\*)?/);
  assert.match(lintScript, /--ignore-pattern dist/);
  assert.match(lintScript, /--ignore-pattern \.next/);
});
