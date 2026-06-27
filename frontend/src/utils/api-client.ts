declare global {
    interface Window {
        FSWEPP?: {
            apiBase?: string;
        };
    }
}

interface ApiOptions {
    timeoutMs?: number;
}

export interface ApiError extends Error {
    status?: number;
    body?: string;
}

function resolveApiPath(path: string): string {
    if (!path || typeof path !== "string") return path;
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    if (typeof window === "undefined") return path;

    const base = window.FSWEPP?.apiBase || "";
    if (!base) return path;

    if (base.endsWith("/api") && path.startsWith("/api/")) {
        return `${base}${path.slice(4)}`;
    }
    if (base.endsWith("/") && path.startsWith("/")) {
        return `${base.slice(0, -1)}${path}`;
    }
    if (!base.endsWith("/") && !path.startsWith("/")) {
        return `${base}/${path}`;
    }
    return `${base}${path}`;
}

export async function apiPost<T = any>(
    path: string,
    payload: Record<string, any> | unknown,
    options: ApiOptions = {}
): Promise<T> {
    const controller = new AbortController();
    const timeoutMs = options.timeoutMs ?? 30000;
    const timeout = setTimeout(() => controller.abort("timeout"), timeoutMs);

    try {
        const response = await fetch(resolveApiPath(path), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload ?? {}),
            signal: controller.signal,
        });

        if (!response.ok) {
            const text = await response.text();
            const error = new Error(`API error ${response.status}`) as ApiError;
            error.status = response.status;
            error.body = text;
            throw error;
        }

        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            return await response.json();
        }

        return (await response.text()) as unknown as T;
    } finally {
        clearTimeout(timeout);
    }
}

export function createDebounce(fn: (...args: any[]) => void, delayMs: number | undefined) {
    let timer: ReturnType<typeof setTimeout> | null = null;
    return (...args: any[]) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delayMs);
    };
}