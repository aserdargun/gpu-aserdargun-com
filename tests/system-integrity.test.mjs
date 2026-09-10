import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { modelMaskedLaunch } from "../app/atlas/mask-model.mjs";
import { readModuleFromUrl, updateModuleUrl } from "../app/atlas/navigation.mjs";
import { writeArtifactManifest, verifyArtifactManifest } from "../tools/artifact-contract.mjs";

test("mask model exposes unsafe tail lanes without inventing hardware measurements", () => {
  for (const size of [128, 256, 512]) {
    for (const n of [1, 257, 65_537, size, 2 * size]) {
      const unsafe = modelMaskedLaunch(n, size, false);
      const safe = modelMaskedLaunch(n, size, true);
      assert.equal(safe.outOfBounds, 0);
      assert.equal(unsafe.outOfBounds, (size - (n % size)) % size);
      assert.equal(safe.lanes - safe.inactive, n);
      assert.equal(safe.programs * size, safe.lanes);
      assert.equal("latency" in safe, false);
    }
  }
  for (const n of [0, -1, NaN, Infinity, 1.5, 1_000_001]) assert.throws(() => modelMaskedLaunch(n, 256, true));
  assert.throws(() => modelMaskedLaunch(257, 3, true));
  assert.throws(() => modelMaskedLaunch(257, 256, "true"));
});

test("lesson URLs preserve locale and unrelated parameters and reject unknown lessons", () => {
  const valid = new Set(["memory"]);
  assert.equal(readModuleFromUrl(new URL("https://example.com/en/?module=memory"), valid), "memory");
  assert.equal(readModuleFromUrl(new URL("https://example.com/?module=obsolete"), valid), null);
  const paths = [];
  const owner = { location: { href: "https://example.com/en/?from=map#lab" }, history: { pushState: (_state, _title, path) => paths.push(path) } };
  updateModuleUrl(owner, "memory");
  assert.deepEqual(paths, ["/en/?from=map&module=memory"]);
  owner.location.href = `https://example.com${paths[0]}`;
  updateModuleUrl(owner, "memory");
  assert.equal(paths.length, 1);
  updateModuleUrl(owner, null);
  assert.equal(paths[1], "/en/?from=map");
});

test("artifact verifier rejects tampering, missing assets, extra assets, and unsupported versions", async () => {
  const root = await mkdtemp(join(tmpdir(), "gpu-artifact-contract-"));
  try {
    await writeFile(join(root, "index.html"), "original");
    await writeArtifactManifest(root);
    await verifyArtifactManifest(root);
    await writeFile(join(root, "index.html"), "tampered");
    await assert.rejects(verifyArtifactManifest(root), /integrity/);
    await writeFile(join(root, "index.html"), "original");
    await writeFile(join(root, "unexpected.js"), "extra");
    await assert.rejects(verifyArtifactManifest(root), /integrity/);
    await unlink(join(root, "unexpected.js"));
    await unlink(join(root, "index.html"));
    await assert.rejects(verifyArtifactManifest(root), /integrity/);
    await writeFile(join(root, "index.html"), "original");
    const manifestPath = join(root, "artifact-manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.contracts.simulation = 999;
    await writeFile(manifestPath, JSON.stringify(manifest));
    await assert.rejects(verifyArtifactManifest(root), /Unsupported/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
