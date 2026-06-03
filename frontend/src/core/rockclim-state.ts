import { readJsonCookie, writeJsonCookie } from "@/utils/cookies";
import { getConfigFromUrl } from "@/utils/url";

const CLIMATE_COOKIE = "fswepp_climate";

const ALLOWED_DATABASES = new Set(["legacy", "2015", "au", "ghcn"]);
const ALLOWED_CLIGEN = new Set(["4.31", "4.30", "5.3.2"]);
const PRISM_DATABASES = new Set([null, "legacy", "2015", "ghcn"]);

export function getDefaultClimateState() {
    return {
        database: "legacy",
        cligen_version: "5.3.2",
        location: null,
        par_id: null,
        input_years: 100,
        use_prism: false,
        user_defined_par_mod: null,
    };
}

function normalizeLocation(value: { longitude: any; latitude: any; }) {
    if (!value || typeof value !== "object") return null;
    const lon = Number(value.longitude);
    const lat = Number(value.latitude);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
    if (lon < -180 || lon > 180 || lat < -90 || lat > 90) return null;
    return { longitude: lon, latitude: lat };
}

function normalizeClimateState(raw: any) {
    const defaults = getDefaultClimateState();
    if (!raw || typeof raw !== "object") return defaults;
    const next = { ...defaults, ...raw };
    if (!ALLOWED_DATABASES.has(next.database)) next.database = defaults.database;
    if (!ALLOWED_CLIGEN.has(next.cligen_version)) {
        if (next.cligen_version === "4.3") {
            next.cligen_version = "4.31";
        } else {
            next.cligen_version = defaults.cligen_version;
        }
    }
    next.location = normalizeLocation(next.location);
    next.use_prism = Boolean(next.use_prism);
    if (!PRISM_DATABASES.has(next.database)) {
        next.use_prism = false;
    }
    if (!Number.isFinite(Number(next.input_years))) {
        next.input_years = defaults.input_years;
    }
    if (!next.par_id || typeof next.par_id !== "string") {
        next.par_id = null;
    }
    if (!next.user_defined_par_mod || typeof next.user_defined_par_mod !== "object") {
        next.user_defined_par_mod = null;
    } else {
        const mod = next.user_defined_par_mod;
        const hasArrays =
            Array.isArray(mod.ppts) &&
            Array.isArray(mod.tmaxs) &&
            Array.isArray(mod.tmins);
        const validLengths =
            hasArrays && mod.ppts.length === 12 && mod.tmaxs.length === 12 && mod.tmins.length === 12;
        if (!validLengths) {
            next.user_defined_par_mod = null;
        }
    }
    return next;
}

export function readClimateState() {
    const fromCookie = readJsonCookie(CLIMATE_COOKIE, null);
    const normalized = normalizeClimateState(fromCookie);
    const urlConfig = getConfigFromUrl();
    if (urlConfig && typeof urlConfig === "object" && urlConfig.climate) {
        return normalizeClimateState({ ...normalized, ...urlConfig.climate });
    }
    return normalized;
}

export function writeClimateState(state: any) {
    const normalized = normalizeClimateState(state);
    writeJsonCookie(CLIMATE_COOKIE, normalized, {
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
