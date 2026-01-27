import { getLocalStorage, setLocalStorage } from "../utils/storage.js";
import { getConfigFromUrl } from "../utils/url.js";

const STORAGE_KEY = "fswepp_fume_state";

const FT_TO_M = 0.3048;
const TOTAL_LENGTH_MIN_M = 1.1 * FT_TO_M;
const TOTAL_LENGTH_MAX_M = 1500 * FT_TO_M;
const BUFFER_LENGTH_MIN_M = 1.0 * FT_TO_M;
const BUFFER_LENGTH_MAX_M = 1000 * FT_TO_M;
const SLOPE_MIN_PCT = 0.5;
const SLOPE_MAX_PCT = 90;
const ROAD_DENSITY_MAX_KM_PER_KM2 = 20 / 1.609344;
const BUFFER_DELTA_M = 0.1 * FT_TO_M;

const DEFAULT_STATE = Object.freeze({
  soil_texture: "clay",
  total_length_m: 200 * FT_TO_M,
  buffer_length_m: 50 * FT_TO_M,
  top_slope_pct: 0.5,
  mid_slope_pct: 30,
  bottom_slope_pct: 15,
  wildfire_cycle_years: 40,
  rx_fire_cycle_years: 20,
  thinning_cycle_years: 20,
  road_density_km_per_km2: 4 / 1.609344,
  simulation_years: 50,
  wepp_version: "wepp2010",
});

const SOIL_TEXTURES = new Set(["clay", "silt", "sand", "loam"]);
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

function normalizeState(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_STATE };
  const next = { ...DEFAULT_STATE, ...raw };

  if (!SOIL_TEXTURES.has(next.soil_texture)) {
    next.soil_texture = DEFAULT_STATE.soil_texture;
  }
  if (!WEPP_VERSIONS.has(next.wepp_version)) {
    next.wepp_version = DEFAULT_STATE.wepp_version;
  }

  next.total_length_m = normalizeRange(
    next.total_length_m,
    TOTAL_LENGTH_MIN_M,
    TOTAL_LENGTH_MAX_M,
    DEFAULT_STATE.total_length_m
  );
  next.buffer_length_m = normalizeRange(
    next.buffer_length_m,
    BUFFER_LENGTH_MIN_M,
    BUFFER_LENGTH_MAX_M,
    DEFAULT_STATE.buffer_length_m
  );

  if (next.buffer_length_m >= next.total_length_m) {
    let buffer = next.total_length_m - BUFFER_DELTA_M;
    if (buffer < BUFFER_LENGTH_MIN_M) {
      buffer = BUFFER_LENGTH_MIN_M;
      const minTotal = buffer + BUFFER_DELTA_M;
      if (next.total_length_m <= buffer) {
        next.total_length_m = Math.min(minTotal, TOTAL_LENGTH_MAX_M);
      }
    }
    next.buffer_length_m = buffer;
  }

  next.top_slope_pct = normalizeRange(
    next.top_slope_pct,
    SLOPE_MIN_PCT,
    SLOPE_MAX_PCT,
    DEFAULT_STATE.top_slope_pct
  );
  next.mid_slope_pct = normalizeRange(
    next.mid_slope_pct,
    SLOPE_MIN_PCT,
    SLOPE_MAX_PCT,
    DEFAULT_STATE.mid_slope_pct
  );
  next.bottom_slope_pct = normalizeRange(
    next.bottom_slope_pct,
    SLOPE_MIN_PCT,
    SLOPE_MAX_PCT,
    DEFAULT_STATE.bottom_slope_pct
  );

  next.wildfire_cycle_years = Math.round(
    normalizeRange(next.wildfire_cycle_years, 1, 400, DEFAULT_STATE.wildfire_cycle_years)
  );
  next.rx_fire_cycle_years = Math.round(
    normalizeRange(next.rx_fire_cycle_years, 1, 200, DEFAULT_STATE.rx_fire_cycle_years)
  );
  next.thinning_cycle_years = Math.round(
    normalizeRange(next.thinning_cycle_years, 1, 200, DEFAULT_STATE.thinning_cycle_years)
  );

  next.road_density_km_per_km2 = normalizeRange(
    next.road_density_km_per_km2,
    0,
    ROAD_DENSITY_MAX_KM_PER_KM2,
    DEFAULT_STATE.road_density_km_per_km2
  );

  next.simulation_years = Math.round(
    normalizeRange(next.simulation_years, 1, 100, DEFAULT_STATE.simulation_years)
  );

  return next;
}

export function readFumeState() {
  const stored = getLocalStorage(STORAGE_KEY, null);
  const config = getConfigFromUrl();
  let overrides = null;
  if (config && typeof config === "object") {
    if (config.fume_pars && typeof config.fume_pars === "object") {
      overrides = { ...config.fume_pars };
    } else if (config.fume_state && typeof config.fume_state === "object") {
      overrides = { ...config.fume_state };
    } else if (config.fume && typeof config.fume === "object") {
      overrides = { ...config.fume };
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

export function writeFumeState(state) {
  const normalized = normalizeState(state);
  setLocalStorage(STORAGE_KEY, normalized);
  return normalized;
}
