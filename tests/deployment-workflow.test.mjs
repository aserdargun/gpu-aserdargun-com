import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workflows = resolve(root, ".github/workflows");
const expectedName = "deploy-swa-gpu-aserdargun-com.yml";

test("one immutable production workflow deploys the verified out artifact", async () => {
  const files = (await readdir(workflows)).filter((name) => /\.ya?ml$/.test(name));
  assert.deepEqual(files, [expectedName]);

  const workflow = await readFile(resolve(workflows, expectedName), "utf8");
  assert.match(workflow, /branches:\s*\n\s*- main/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /permissions:\s*\n\s*contents: read/);
  assert.match(workflow, /group: swa-gpu-aserdargun-com-production/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(workflow, /actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1/);
  assert.match(workflow, /actions\/setup-node@820762786026740c76f36085b0efc47a31fe5020/);
  assert.match(workflow, /Azure\/static-web-apps-deploy@1a947af9992250f3bc2e68ad0754c0b0c11566c9/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm run lint/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm run verify:azure/);
  assert.match(workflow, /AZURE_STATIC_WEB_APPS_API_TOKEN_SWA_GPU_ASERDARGUN_COM/);
  assert.match(workflow, /app_location: out/);
  assert.match(workflow, /skip_app_build: true/);
  assert.match(workflow, /output_location: ""/);
  assert.doesNotMatch(workflow, /uses:\s+[^\s]+@v\d/);
});
