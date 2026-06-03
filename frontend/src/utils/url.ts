function base64UrlEncode(input: string | number | boolean) {
  const encoded = btoa(unescape(encodeURIComponent(input)));
  return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "===".slice((normalized.length + 3) % 4);
  const decoded = atob(padded);
  return decodeURIComponent(escape(decoded));
}

export function encodeConfig(config: any) {
  return base64UrlEncode(JSON.stringify(config));
}

export function decodeConfig(encoded: string) {
  try {
    const json = base64UrlDecode(encoded);
    return JSON.parse(json);
  } catch (error) {
    console.warn("[url] Failed to decode config", error);
    return null;
  }
}

export function getConfigFromUrl() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const config = params.get("config");
  if (!config) return null;
  return decodeConfig(config);
}

export function setConfigInUrl(config: any) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  params.set("config", encodeConfig(config));
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, "", newUrl);
}
