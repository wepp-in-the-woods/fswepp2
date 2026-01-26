import { getLocalStorage, setLocalStorage } from "../utils/storage.js";
import { getConfigFromUrl } from "../utils/url.js";

const STORAGE_KEY = "fswepp_disturbed_state";

const DEFAULT_STATE = Object.freeze({
  soil_texture: "clay",
  rfg_pct: 20,
  upper_ofe: {
    landuse: "OldForest",
    slope_point1_pct: 0,
    slope_point2_pct: 30,
    length_m: 100,
    cover_pct: 80,
    rfg_pct: 20,
  },
  lower_ofe: {
    landuse: "HighFire",
    slope_point1_pct: 32,
    slope_point2_pct: 5,
    length_m: 200,
    cover_pct: 10,
    rfg_pct: 20,
  },
  width_m: 90,
  simulation_years: 100,
  isric_enabled: false,
});

const SOIL_TEXTURES = new Set(["clay", "silt", "sand", "loam"]);
const LANDUSES = new Set([
  "OldForest",
  "YoungForest",
  "Shrub",
  "Bunchgrass",
  "Sod",
  "LowFire",
  "HighFire",
  "Skid",
]);

function normalizeNumber(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeRange(value, min, max, fallback) {
  const num = normalizeNumber(value, fallback);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function normalizeOfe(raw, defaults, sharedRfg) {
  const next = { ...defaults, ...(raw || {}) };
  if (!LANDUSES.has(next.landuse)) {
    next.landuse = defaults.landuse;
  }
  next.slope_point1_pct = normalizeRange(
    next.slope_point1_pct,
    0,
    1000,
    defaults.slope_point1_pct
  );
  next.slope_point2_pct = normalizeRange(
    next.slope_point2_pct,
    0,
    1000,
    defaults.slope_point2_pct
  );
  next.length_m = normalizeRange(next.length_m, 0, 3000, defaults.length_m);
  next.cover_pct = normalizeRange(next.cover_pct, 0, 150, defaults.cover_pct);
  next.rfg_pct = normalizeRange(
    sharedRfg,
    0,
    75,
    defaults.rfg_pct
  );
  return next;
}

function resolveSharedRfg(raw) {
  const rawRfg = normalizeNumber(raw?.rfg_pct, null);
  const upperRfg = normalizeNumber(raw?.upper_ofe?.rfg_pct, null);
  const lowerRfg = normalizeNumber(raw?.lower_ofe?.rfg_pct, null);
  let next = rawRfg;
  if (!Number.isFinite(next)) next = upperRfg;
  if (!Number.isFinite(next)) next = lowerRfg;
  if (!Number.isFinite(next)) next = DEFAULT_STATE.rfg_pct;
  return normalizeRange(next, 0, 75, DEFAULT_STATE.rfg_pct);
}

function normalizeState(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_STATE };
  const sharedRfg = resolveSharedRfg(raw);
  const next = {
    ...DEFAULT_STATE,
    ...raw,
    rfg_pct: sharedRfg,
    upper_ofe: normalizeOfe(raw.upper_ofe, DEFAULT_STATE.upper_ofe, sharedRfg),
    lower_ofe: normalizeOfe(raw.lower_ofe, DEFAULT_STATE.lower_ofe, sharedRfg),
  };

  if (!SOIL_TEXTURES.has(next.soil_texture)) {
    next.soil_texture = DEFAULT_STATE.soil_texture;
  }
  next.isric_enabled = Boolean(next.isric_enabled);

  next.width_m = normalizeRange(next.width_m, 0.1, 10000, DEFAULT_STATE.width_m);
  next.simulation_years = Math.round(
    normalizeRange(next.simulation_years, 1, 200, DEFAULT_STATE.simulation_years)
  );

  return next;
}

export function readDisturbedState() {
  const stored = getLocalStorage(STORAGE_KEY, null);
  const config = getConfigFromUrl();
  let overrides = null;
  if (config && typeof config === "object") {
    if (config.disturbedwepp_pars && typeof config.disturbedwepp_pars === "object") {
      overrides = { ...config.disturbedwepp_pars };
    } else if (config.disturbedwepp && typeof config.disturbedwepp === "object") {
      overrides = { ...config.disturbedwepp };
    } else if (config.disturbed_state && typeof config.disturbed_state === "object") {
      overrides = { ...config.disturbed_state };
    } else if (config.disturbed && typeof config.disturbed === "object") {
      overrides = { ...config.disturbed };
    }
    if (overrides && config.simulation_years != null) {
      overrides.simulation_years = config.simulation_years;
    }
  }
  if (overrides) {
    return normalizeState({ ...(stored || {}), ...overrides });
  }
  return normalizeState(stored);
}

export function writeDisturbedState(state) {
  const normalized = normalizeState(state);
  setLocalStorage(STORAGE_KEY, normalized);
  return normalized;
}
