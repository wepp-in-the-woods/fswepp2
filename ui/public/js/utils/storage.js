export function getLocalStorage(key, fallback = null) {
  if (typeof localStorage === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`[storage] Failed to parse ${key}`, error);
    return fallback;
  }
}

export function setLocalStorage(key, value) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeLocalStorage(key) {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(key);
}
