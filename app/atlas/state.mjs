export const COMPLETED_KEY = "kernel-atlas-completed";
export const LAST_VISITED_KEY = "kernel-atlas-last-visited";
export const LANGUAGE_KEY = "kernel-atlas-language";
export const LEGACY_LANGUAGE_KEY = "gpu-atlas-lang";

export function acquireLocalStorage(owner) {
  try {
    return owner.localStorage;
  } catch {
    return null;
  }
}

export function readLanguage(storage) {
  try {
    const value = storage?.getItem(LANGUAGE_KEY) ?? storage?.getItem(LEGACY_LANGUAGE_KEY);
    return value === "tr" || value === "en" ? value : null;
  } catch {
    return null;
  }
}

export function detectBrowserLanguage(owner) {
  try {
    const language = owner?.navigator?.language;
    if (typeof language !== "string") return null;
    return language.toLowerCase().startsWith("tr") ? "tr" : "en";
  } catch {
    return null;
  }
}

export function writeLanguage(storage, locale) {
  try {
    storage?.setItem(LANGUAGE_KEY, locale);
  } catch {
    // Storage may be unavailable or read-only; keep the in-memory locale.
  }
}

export function readCompleted(storage, validIds) {
  try {
    const parsed = JSON.parse(storage?.getItem(COMPLETED_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((id) => typeof id === "string" && validIds.has(id)))];
  } catch {
    try {
      storage?.removeItem(COMPLETED_KEY);
    } catch {
      // Storage may be unavailable or read-only; fail closed.
    }
    return [];
  }
}

export function writeCompleted(storage, ids) {
  try {
    storage?.setItem(COMPLETED_KEY, JSON.stringify([...new Set(ids)]));
  } catch {
    // Storage may be unavailable or read-only; keep the in-memory state.
  }
}

export function readLastVisited(storage, validIds) {
  try {
    const value = storage?.getItem(LAST_VISITED_KEY);
    return value && validIds.has(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeLastVisited(storage, id) {
  try {
    storage?.setItem(LAST_VISITED_KEY, id);
  } catch {
    // Storage may be unavailable or read-only; keep the in-memory state.
  }
}
