import type { UnitizerClient } from "@/types/unitizer";

export function getUnitizerClientSync(): UnitizerClient | null {
    return window.UnitizerClient?.getClientSync?.() ?? null;
}

export function onUnitizerReady(
    callback: (client: UnitizerClient) => void
): void {
    const ready = window.UnitizerClient?.ready;
    if (!ready) return;

    ready()
        .then(callback)
        .catch((error) => {
            console.error("[unitizer] Failed to initialize", error);
        });
}

export function getPreferredUnit(category: string, fallback: string): string {
    const client = getUnitizerClientSync();
    const prefs = client?.getPreferencePayload?.();
    return prefs?.[category] || fallback;
}