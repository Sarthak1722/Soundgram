const STORAGE_KEY = "jamify-home-continuity";

function readStore() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStore(store) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore storage quota errors for this non-critical UX layer
  }
}

export function readHomeContinuity(userId) {
  if (!userId) return null;
  const store = readStore();
  return store[String(userId)] || null;
}

export function writeHomeContinuity(userId, patch) {
  if (!userId) return null;
  const store = readStore();
  const key = String(userId);
  const next = {
    ...(store[key] || {}),
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  store[key] = next;
  writeStore(store);
  return next;
}
