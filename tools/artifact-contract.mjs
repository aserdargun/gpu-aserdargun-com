import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CONTRACT_VERSIONS } from "../app/atlas/contracts.mjs";

const manifestName = "artifact-manifest.json";
async function inventory(root, relative = "") {
  const entries = await readdir(join(root, relative), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = relative ? `${relative}/${entry.name}` : entry.name;
    if (path === manifestName) continue;
    if (entry.isDirectory()) files.push(...await inventory(root, path));
    else if (entry.isFile()) files.push(path);
    else throw new Error(`Unsupported artifact entry: ${path}`);
  }
  return files.sort();
}

async function hashes(root) {
  const files = await inventory(root);
  return Object.fromEntries(await Promise.all(files.map(async (path) => [
    path, createHash("sha256").update(await readFile(join(root, path))).digest("hex"),
  ])));
}

export async function writeArtifactManifest(root) {
  const manifest = { schemaVersion: 1, contracts: CONTRACT_VERSIONS, files: await hashes(root) };
  await writeFile(join(root, manifestName), `${JSON.stringify(manifest, null, 2)}\n`);
}

export async function verifyArtifactManifest(root) {
  const manifest = JSON.parse(await readFile(join(root, manifestName), "utf8"));
  if (manifest.schemaVersion !== 1 ||
      JSON.stringify(manifest.contracts) !== JSON.stringify(CONTRACT_VERSIONS)) {
    throw new Error("Unsupported artifact contract versions");
  }
  const actual = await hashes(root);
  if (JSON.stringify(manifest.files) !== JSON.stringify(actual)) {
    throw new Error("Artifact integrity mismatch: missing, changed, or unexpected files");
  }
  return manifest;
}
