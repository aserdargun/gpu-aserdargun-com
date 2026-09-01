export function acquireStorage(owner) {
  try { return owner?.localStorage ?? null; } catch { return null; }
}

function repair(storage, key) {
  try { storage?.removeItem(key); } catch { /* Storage denial must not block the lab. */ }
}

export function readStringArray(storage, key, validValues) {
  try {
    const raw = storage?.getItem(key);
    if (raw === null || raw === undefined) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== "string" || !validValues.has(value))) {
      repair(storage, key);
      return [];
    }
    return [...new Set(parsed)];
  } catch {
    repair(storage, key);
    return [];
  }
}

export function readFiniteInteger(storage, key, { fallback, min, max }) {
  try {
    const raw = storage?.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    const value = Number(raw);
    if (!Number.isFinite(value) || !Number.isInteger(value) || value < min || value > max) {
      repair(storage, key);
      return fallback;
    }
    return value;
  } catch {
    repair(storage, key);
    return fallback;
  }
}

export function readText(storage, key, fallback = "") {
  try { return storage?.getItem(key) ?? fallback; } catch { return fallback; }
}

export function writeText(storage, key, value) {
  try { storage?.setItem(key, value); return Boolean(storage); } catch { return false; }
}

export function writeJson(storage, key, value) {
  return writeText(storage, key, JSON.stringify(value));
}
