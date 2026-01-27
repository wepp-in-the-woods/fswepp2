import { getLocalStorage, setLocalStorage } from "../utils/storage.js";
import { getConfigFromUrl } from "../utils/url.js";

const STORAGE_KEY = "fswepp_ermit_state";

const DEFAULT_STATE = Object.freeze({
  soil_texture: "clay",
  rfg_pct: 20,
  top_slope_pct: 0.001,
  middle_slope_pct: 50,
  bottom_slope_pct: 30,
  length_m: 91.44,
  vegetation_type: "Chaparral",
  burn_severity: "Low",
  user_shrub_pct: 80,
  user_grass_pct: 0,
  user_bare_pct: 20,
  simulation_years: 100,
  wepp_version: "wepp2010",
});

const SOIL_TEXTURES = new Set(["clay", "silt", "sand", "loam"]);
const VEGETATION_TYPES = new Set(["Forest", "Range", "Chaparral"]);
const BURN_SEVERITIES = new Set(["High", "Moderate", "Low", "Unburned"]);
const WEPP_VERSIONS = new Set(["wepp2010", "wepp_dcc52a6_hill"]);

function normalizeNumber(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeRange(value, min, max, fallback) {
  const num = normalizeNumber(value, fallback);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function coverDefaults(vegetationType) {
  if (vegetationType === "Range") {
    return { shrub: 15, grass: 75, bare: 10 };
  }
  if (vegetationType === "Chaparral") {
    return { shrub: 80, grass: 0, bare: 20 };
  }
  return { shrub: null, grass: null, bare: null };
}

function normalizeState(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_STATE };
  const next = { ...DEFAULT_STATE, ...raw };

  if (!SOIL_TEXTURES.has(next.soil_texture)) {
    next.soil_texture = DEFAULT_STATE.soil_texture;
  }
  if (!VEGETATION_TYPES.has(next.vegetation_type)) {
    next.vegetation_type = DEFAULT_STATE.vegetation_type;
  }
  if (!BURN_SEVERITIES.has(next.burn_severity)) {
    next.burn_severity = DEFAULT_STATE.burn_severity;
  }
  if (!WEPP_VERSIONS.has(next.wepp_version)) {
    next.wepp_version = DEFAULT_STATE.wepp_version;
  }

  next.rfg_pct = normalizeRange(next.rfg_pct, 5, 85, DEFAULT_STATE.rfg_pct);
  next.top_slope_pct = normalizeRange(
    next.top_slope_pct,
    0.001,
    100,
    DEFAULT_STATE.top_slope_pct
  );
  next.middle_slope_pct = normalizeRange(
    next.middle_slope_pct,
    0.001,
    100,
    DEFAULT_STATE.middle_slope_pct
  );
  next.bottom_slope_pct = normalizeRange(
    next.bottom_slope_pct,
    0.001,
    100,
    DEFAULT_STATE.bottom_slope_pct
  );
  next.length_m = normalizeRange(next.length_m, 0, 300, DEFAULT_STATE.length_m);

  const defaults = coverDefaults(next.vegetation_type);
  if (next.vegetation_type === "Forest") {
    next.user_shrub_pct = null;
    next.user_grass_pct = null;
    next.user_bare_pct = null;
  } else {
    next.user_shrub_pct = normalizeRange(
      next.user_shrub_pct,
      0,
      100,
      defaults.shrub
    );
    next.user_grass_pct = normalizeRange(
      next.user_grass_pct,
      0,
      100,
      defaults.grass
    );
    next.user_bare_pct = normalizeRange(
      next.user_bare_pct,
      0,
      100,
      defaults.bare
    );
  }

  next.simulation_years = Math.round(
    normalizeRange(next.simulation_years, 1, 200, DEFAULT_STATE.simulation_years)
  );

  return next;
}

export function readErmitState() {
  const stored = getLocalStorage(STORAGE_KEY, null);
  const config = getConfigFromUrl();
  let overrides = null;
  if (config && typeof config === "object") {
    if (config.ermit_pars && typeof config.ermit_pars === "object") {
      overrides = { ...config.ermit_pars };
    } else if (config.ermit && typeof config.ermit === "object") {
      overrides = { ...config.ermit };
    } else if (config.ermit_state && typeof config.ermit_state === "object") {
      overrides = { ...config.ermit_state };
    }
    if (overrides) {
      if (config.simulation_years != null) {
        overrides.simulation_years = config.simulation_years;
      }
      if (config.wepp_version != null) {
        overrides.wepp_version = config.wepp_version;
      }
    }
  }
  if (overrides) {
    return normalizeState({ ...(stored || {}), ...overrides });
  }
  return normalizeState(stored);
}

export function writeErmitState(state) {
  const normalized = normalizeState(state);
  setLocalStorage(STORAGE_KEY, normalized);
  return normalized;
}
