export function getCookie(name) {
  if (typeof document === "undefined") return null;
  const value = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`));
  if (!value) return null;
  return decodeURIComponent(value.substring(name.length + 1));
}

export function setCookie(name, value, options = {}) {
  if (typeof document === "undefined") return;
  const maxAge = options.maxAge ?? 60 * 60 * 24 * 365;
  const path = options.path ?? "/";
  const sameSite = options.sameSite ?? "Lax";
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Max-Age=${maxAge}`,
    `Path=${path}`,
    `SameSite=${sameSite}`,
  ];
  if (options.secure) {
    parts.push("Secure");
  }
  document.cookie = parts.join("; ");
}

export function deleteCookie(name, options = {}) {
  setCookie(name, "", { ...options, maxAge: 0 });
}

export function readJsonCookie(name, fallback = null) {
  const raw = getCookie(name);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`[cookies] Failed to parse ${name}`, error);
    return fallback;
  }
}

export function writeJsonCookie(name, value, options = {}) {
  setCookie(name, JSON.stringify(value), options);
}
