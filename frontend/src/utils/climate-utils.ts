import { readJsonCookie, writeJsonCookie } from "@/utils/cookies";
import { getConfigFromUrl } from "@/utils/url";
import { DEFAULT_CLIMATE_STATE, ALLOWED_DATABASES, ALLOWED_CLIGEN, PRISM_DATABASES, CLIMATE_COOKIE_NAME } from "@/types/climate";

function normalizeLocation(value: { longitude: any; latitude: any; }) {
    if (!value || typeof value !== "object") return null;
    const lon = Number(value.longitude);
    const lat = Number(value.latitude);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
    if (lon < -180 || lon > 180 || lat < -90 || lat > 90) return null;
    return { longitude: lon, latitude: lat };
}

function normalizeClimateState(raw: any) {
    const defaults = DEFAULT_CLIMATE_STATE;
    if (!raw || typeof raw !== "object") return defaults;
    const next = { ...defaults, ...raw };
    if (!ALLOWED_DATABASES.has(next.database)) next.database = defaults.database;
    if (!ALLOWED_CLIGEN.has(next.cligenVersion)) {
        if (next.cligenVersion === "4.3") {
            next.cligenVersion = "4.31";
        } else {
            next.cligenVersion = defaults.cligenVersion;
        }
    }
    next.location = normalizeLocation(next.location);
    next.usePrism = Boolean(next.usePrism);
    if (!PRISM_DATABASES.has(next.database)) {
        next.usePrism = false;
    }
    if (!Number.isFinite(Number(next.inputYears))) {
        next.inputYears = defaults.inputYears;
    }
    if (!next.parId || typeof next.parId !== "string") {
        next.parId = null;
    }
    if (!next.userDefinedParMod || typeof next.userDefinedParMod !== "object") {
        next.userDefinedParMod = null;
    } else {
        const mod = next.userDefinedParMod;
        const hasArrays =
            Array.isArray(mod.ppts) &&
            Array.isArray(mod.tmaxs) &&
            Array.isArray(mod.tmins);
        const validLengths =
            hasArrays && mod.ppts.length === 12 && mod.tmaxs.length === 12 && mod.tmins.length === 12;
        if (!validLengths) {
            next.userDefinedParMod = null;
        }
    }
    return next;
}

function climateStatesEqual(
    first: ReturnType<typeof normalizeClimateState>,
    second: ReturnType<typeof normalizeClimateState>,
) {
    return JSON.stringify(first) === JSON.stringify(second);
}

export function readClimateState() {
    const fromCookie = readJsonCookie(CLIMATE_COOKIE_NAME, null);
    const normalized = normalizeClimateState(fromCookie);
    const urlConfig = getConfigFromUrl();
    if (urlConfig && typeof urlConfig === "object" && urlConfig.climate) {
        return normalizeClimateState({ ...normalized, ...urlConfig.climate });
    }
    return normalized;
}

export function writeClimateState(state: any) {
    const normalized = normalizeClimateState(state);
    const previous = normalizeClimateState(readJsonCookie(CLIMATE_COOKIE_NAME, null));
    if (climateStatesEqual(previous, normalized)) {
        return normalized;
    }

    writeJsonCookie(CLIMATE_COOKIE_NAME, normalized, {
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
    });
    if (typeof document !== "undefined") {
        document.dispatchEvent(
            new CustomEvent("fswepp:climate-changed", { detail: normalized })
        );
    }
    return normalized;
}

// User-defined climates are not stored separately; they live in fswepp_climate only.
