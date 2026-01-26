import { getLocalStorage, setLocalStorage } from "../utils/storage.js";
import { getConfigFromUrl } from "../utils/url.js";

const STORAGE_KEY = "fswepp_wepproad_state";

const DEFAULT_STATE = Object.freeze({
  soil_texture: "clay",
  rfg_pct: 20,
  road: {
    slope_pct: 4,
    length_m: 60,
    width_m: 4,
    surface: "gravel",
    design: "inveg",
    traffic: "high",
  },
  fill: {
    slope_pct: 50,
    length_m: 5,
  },
  buffer: {
    slope_pct: 25,
    length_m: 40,
  },
  simulation_years: 100,
  isric_enabled: false,
});

const SOIL_TEXTURES = new Set(["clay", "silt", "sand", "loam"]);
const SURFACES = new Set(["native", "gravel", "graveled", "paved"]);
const DESIGNS = new Set(["inveg", "inbare", "outunrut", "outrut"]);
const TRAFFIC = new Set(["high", "low", "none"]);

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
  const next = {
    ...DEFAULT_STATE,
    ...raw,
    road: { ...DEFAULT_STATE.road, ...(raw.road || {}) },
    fill: { ...DEFAULT_STATE.fill, ...(raw.fill || {}) },
    buffer: { ...DEFAULT_STATE.buffer, ...(raw.buffer || {}) },
  };

  if (!SOIL_TEXTURES.has(next.soil_texture)) {
    next.soil_texture = DEFAULT_STATE.soil_texture;
  }
  if (!SURFACES.has(next.road.surface)) {
    next.road.surface = DEFAULT_STATE.road.surface;
  }
  if (!DESIGNS.has(next.road.design)) {
    next.road.design = DEFAULT_STATE.road.design;
  }
  if (!TRAFFIC.has(next.road.traffic)) {
    next.road.traffic = DEFAULT_STATE.road.traffic;
  }
  next.isric_enabled = Boolean(next.isric_enabled);

  next.rfg_pct = normalizeRange(next.rfg_pct, 0, 50, DEFAULT_STATE.rfg_pct);
  next.road.slope_pct = normalizeRange(
    next.road.slope_pct,
    0.1,
    40,
    DEFAULT_STATE.road.slope_pct
  );
  next.road.length_m = normalizeRange(
    next.road.length_m,
    1,
    300,
    DEFAULT_STATE.road.length_m
  );
  next.road.width_m = normalizeRange(
    next.road.width_m,
    0.3,
    100,
    DEFAULT_STATE.road.width_m
  );
  next.fill.slope_pct = normalizeRange(
    next.fill.slope_pct,
    0.1,
    150,
    DEFAULT_STATE.fill.slope_pct
  );
  next.fill.length_m = normalizeRange(
    next.fill.length_m,
    0.3,
    100,
    DEFAULT_STATE.fill.length_m
  );
  next.buffer.slope_pct = normalizeRange(
    next.buffer.slope_pct,
    0.1,
    100,
    DEFAULT_STATE.buffer.slope_pct
  );
  next.buffer.length_m = normalizeRange(
    next.buffer.length_m,
    0.3,
    300,
    DEFAULT_STATE.buffer.length_m
  );
  next.simulation_years = Math.round(
    normalizeRange(next.simulation_years, 1, 200, DEFAULT_STATE.simulation_years)
  );

  return next;
}

export function readWeppRoadState() {
  const stored = getLocalStorage(STORAGE_KEY, null);
  const config = getConfigFromUrl();
  let overrides = null;
  if (config && typeof config === "object") {
    if (config.wepproad_pars && typeof config.wepproad_pars === "object") {
      overrides = { ...config.wepproad_pars };
    } else if (config.wepproad && typeof config.wepproad === "object") {
      overrides = { ...config.wepproad };
    } else if (config.wepproad_state && typeof config.wepproad_state === "object") {
      overrides = { ...config.wepproad_state };
    }
    if (overrides) {
      if (config.simulation_years != null) {
        overrides.simulation_years = config.simulation_years;
      }
    }
  }
  if (overrides) {
    return normalizeState({ ...(stored || {}), ...overrides });
  }
  return normalizeState(stored);
}

export function writeWeppRoadState(state) {
  const normalized = normalizeState(state);
  setLocalStorage(STORAGE_KEY, normalized);
  return normalized;
}
