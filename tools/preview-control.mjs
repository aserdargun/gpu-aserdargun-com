import { spawnSync } from "node:child_process";

export const DEFAULT_PORT = 5173;

function runLsof(args) {
  return spawnSync("lsof", args, { encoding: "utf8" });
}

export function listenerPids(port) {
  const result = runLsof(["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"]);
  if (result.status === 1) return [];
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `Unable to inspect port ${port}`);
  }
  return [...new Set(result.stdout.split("\n").filter(Boolean).map(Number))].sort((a, b) => a - b);
}

export function processCwd(pid) {
  const result = runLsof(["-a", "-p", String(pid), "-d", "cwd", "-Fn"]);
  if (result.status !== 0) return null;
  const pathLine = result.stdout.split("\n").find((line) => line.startsWith("n"));
  return pathLine ? pathLine.slice(1) : null;
}

function belongsToCheckout(cwd, root) {
  return cwd === root || cwd?.startsWith(`${root}/`) === true;
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function stopOwnedListeners({ port = DEFAULT_PORT, root, timeoutMs = 5_000 }) {
  const pids = listenerPids(port);
  if (pids.length === 0) {
    console.log(`Port ${port} is already free; nothing to stop.`);
    return 0;
  }

  const ownership = pids.map((pid) => ({ pid, cwd: processCwd(pid) }));
  const foreign = ownership.filter(({ cwd }) => !belongsToCheckout(cwd, root));
  if (foreign.length > 0) {
    const details = foreign.map(({ pid, cwd }) => `PID ${pid} (cwd=${cwd ?? "unknown"})`).join(", ");
    console.error(`Refusing to stop port ${port}; listener is not owned by ${root}: ${details}`);
    return 2;
  }

  for (const pid of pids) {
    try {
      process.kill(pid, "SIGTERM");
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (listenerPids(port).every((pid) => !pids.includes(pid))) {
      console.log(`Stopped checkout-owned listener(s) on port ${port}: ${pids.join(", ")}`);
      return 0;
    }
    await wait(100);
  }

  const remaining = listenerPids(port).filter((pid) => pids.includes(pid));
  for (const pid of remaining) {
    if (!belongsToCheckout(processCwd(pid), root)) continue;
    try {
      process.kill(pid, "SIGKILL");
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
  }

  const killDeadline = Date.now() + 2_000;
  while (Date.now() < killDeadline) {
    if (listenerPids(port).every((pid) => !pids.includes(pid))) {
      console.log(`Stopped checkout-owned listener(s) on port ${port}: ${pids.join(", ")}`);
      return 0;
    }
    await wait(100);
  }

  console.error(`Failed to free port ${port} after stopping verified PIDs ${pids.join(", ")}`);
  return 1;
}
