import { createHash } from "node:crypto";

/**
 * Names the inline scripts a page carries by their content hash.
 *
 * The framework emits its hydration bootstrap as inline scripts, and the
 * published policy keeps `script-src 'self'` strict. Without a hash for each
 * of those scripts the browser refuses to run them: the page renders its
 * server-rendered markup, but the application never hydrates and no control
 * on the page responds. The policy therefore has to name exactly these
 * scripts, and nothing else.
 */
export function inlineScriptHashes(html) {
  const hashes = new Set();
  for (const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    const [, attributes, body] = match;
    if (/(^|\s)src\s*=/.test(attributes)) continue;
    const type = attributes.match(/(^|\s)type\s*=\s*"([^"]*)"/)?.[2] ?? "classic";
    if (type !== "classic" && type !== "module") continue;
    hashes.add(`'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`);
  }
  return hashes;
}

/** The `script-src` tokens of a published policy. */
export function scriptSourceTokens(policy) {
  return /script-src ([^;]*);/.exec(policy)?.[1]?.trim().split(/\s+/) ?? [];
}
