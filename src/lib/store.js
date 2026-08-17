// Plain localStorage, namespaced. Every call is guarded: Safari private mode
// and full quotas throw, and a game must never break because a save failed.

const PREFIX = "edu:";

export function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(PREFIX + key);
    return true;
  } catch {
    return false;
  }
}

/** True when writes actually stick — used to warn before a long round. */
export function storageWorks() {
  try {
    const probe = PREFIX + "__probe";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}
