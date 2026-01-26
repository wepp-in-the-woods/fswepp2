import { createFormField, createSelectField } from "./form-field.js";
import { createCheckboxField } from "./checkbox-field.js";
import { readClimateState } from "../core/rockclim-state.js";

const SOIL_OPTIONS = [
  { value: "clay", label: "Clay loam" },
  { value: "silt", label: "Silt loam" },
  { value: "sand", label: "Sandy loam" },
  { value: "loam", label: "Loam" },
];

function simpleTexture(clay, sand) {
  const cs = clay + sand;
  if ((clay <= 27.0 && cs <= 50.0) || (clay > 27.0 && sand <= 20.0 && cs <= 50.0)) {
    return "silt loam";
  }
  if (clay >= 6.0 && clay <= 27.0 && cs > 50.0 && cs <= 72.0 && sand <= 52) {
    return "loam";
  }
  if ((sand > 52 || (cs > 50 && clay < 6)) && sand >= 50) {
    return "sand loam";
  }
  if ((cs > 72 && sand < 50) || (clay > 27 && sand > 20 && sand <= 45) || (sand <= 20 && cs > 50)) {
    return "clay loam";
  }

  const silt = 100 - clay - sand;
  if (sand >= 70) return "sand loam";
  if (clay >= 35) return "clay loam";
  if (silt >= 50) return "silt loam";
  return "loam";
}

function mapToSoilOption(label) {
  if (!label) return null;
  const lower = label.toLowerCase();
  if (lower.includes("silt")) return "silt";
  if (lower.includes("sand")) return "sand";
  if (lower.includes("clay")) return "clay";
  if (lower.includes("loam")) return "loam";
  return null;
}

function hasValidLocation(state) {
  const lon = Number(state?.location?.longitude);
  const lat = Number(state?.location?.latitude);
  return Number.isFinite(lon) && Number.isFinite(lat);
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}%`;
}

const ISRIC_WMS_ENDPOINT = "https://maps.isric.org/mapserv";
const ISRIC_WMS_VERSION = "1.3.0";
const ISRIC_WMS_CRS = "EPSG:4326";
const ISRIC_WMS_SIZE = 256;
const ISRIC_WMS_BBOX_BUFFER = 0.05;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function buildWmsFeatureInfoUrl({ map, layer, lon, lat }) {
  const safeLon = clamp(Number(lon), -180, 180);
  const safeLat = clamp(Number(lat), -89.9999, 89.9999);
  const delta = ISRIC_WMS_BBOX_BUFFER;
  let minLon = safeLon - delta;
  let maxLon = safeLon + delta;
  let minLat = safeLat - delta;
  let maxLat = safeLat + delta;
  minLon = clamp(minLon, -180, 180);
  maxLon = clamp(maxLon, -180, 180);
  minLat = clamp(minLat, -89.9999, 89.9999);
  maxLat = clamp(maxLat, -89.9999, 89.9999);

  const width = ISRIC_WMS_SIZE;
  const height = ISRIC_WMS_SIZE;
  const bboxWidth = Math.max(maxLon - minLon, 1e-9);
  const bboxHeight = Math.max(maxLat - minLat, 1e-9);
  const i = Math.round(((safeLon - minLon) / bboxWidth) * (width - 1));
  const j = Math.round(((maxLat - safeLat) / bboxHeight) * (height - 1));
  const bbox =
    ISRIC_WMS_VERSION === "1.3.0" && ISRIC_WMS_CRS === "EPSG:4326"
      ? `${minLat},${minLon},${maxLat},${maxLon}`
      : `${minLon},${minLat},${maxLon},${maxLat}`;

  const params = new URLSearchParams();
  params.set("map", `/map/${map}.map`);
  params.set("REQUEST", "GetFeatureInfo");
  params.set("SERVICE", "WMS");
  params.set("VERSION", ISRIC_WMS_VERSION);
  params.set("FORMAT", "image/png");
  params.set("STYLES", "");
  params.set("TRANSPARENT", "TRUE");
  params.set("LAYERS", layer);
  params.set("QUERY_LAYERS", layer);
  params.set("INFO_FORMAT", "application/geo+json");
  params.set("WIDTH", String(width));
  params.set("HEIGHT", String(height));
  params.set("CRS", ISRIC_WMS_CRS);
  params.set("BBOX", bbox);
  params.set("I", String(clamp(i, 0, width - 1)));
  params.set("J", String(clamp(j, 0, height - 1)));

  return `${ISRIC_WMS_ENDPOINT}?${params.toString()}`;
}

function parseWmsFeatureValue(payload) {
  const feature = payload?.features?.[0];
  const props = feature?.properties;
  if (!props) return { value: null, unit: null };
  const raw =
    props.pixel_value ??
    props.GRAY_INDEX ??
    props.value ??
    props.VALUE ??
    null;
  const unit = typeof props.unit === "string" ? props.unit : null;
  return { value: raw, unit };
}

function normalizeWmsValue(value, unit) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  if (!unit) return numeric;
  const normalized = unit.toLowerCase();
  if (normalized === "g/kg" || normalized === "gkg") return numeric / 10;
  if (normalized.includes("cm") && normalized.includes("dm")) return numeric / 10;
  if (normalized.includes("%")) return numeric;
  return numeric;
}

async function fetchWmsValue({ map, layer, lon, lat }) {
  const url = buildWmsFeatureInfoUrl({ map, layer, lon, lat });
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`ISRIC WMS request failed (${response.status})`);
  }
  const payload = await response.json();
  const { value, unit } = parseWmsFeatureValue(payload);
  return { value: normalizeWmsValue(value, unit), unit };
}

export function createSoilProperties({
  state,
  onChange,
  idPrefix = "wepproad",
  rfgMin = 0,
  rfgMax = 50,
  rfgStep = 1,
} = {}) {
  let current = { ...state };
  let requestId = 0;
  let lastLocationKey = null;
  let rockTouched = false;
  let rockTimer = null;

  const section = document.createElement("section");
  section.className = "rounded-lg border border-border bg-card p-6 space-y-4";
  const heading = document.createElement("h2");
  heading.className = "text-base font-semibold";
  heading.textContent = "Soil Properties";
  section.appendChild(heading);

  const soilGrid = document.createElement("div");
  soilGrid.className = "grid gap-4 md:grid-cols-2";

  const soilField = createSelectField({
    id: `${idPrefix}_soil_texture`,
    label: "Soil Texture",
    options: SOIL_OPTIONS,
  });
  soilField.select.value = current.soil_texture;
  soilField.select.addEventListener("change", () => {
    current.soil_texture = soilField.select.value;
    onChange?.({ soil_texture: current.soil_texture });
  });

  const rockField = createFormField({
    id: `${idPrefix}_rock_fragments`,
    label: "Rock Fragment Content",
    type: "number",
    value: String(current.rfg_pct),
    unitLabel: "%",
  });
  rockField.input.step = String(rfgStep);
  rockField.input.min = String(rfgMin);
  rockField.input.max = String(rfgMax);
  rockField.input.addEventListener("input", () => {
    const value = Number(rockField.input.value);
    if (Number.isFinite(value)) {
      current.rfg_pct = value;
      onChange?.({ rfg_pct: current.rfg_pct });
    }
  });
  const rockValidator = () => {
    const value = Number(rockField.input.value);
    if (!Number.isFinite(value)) {
      rockField.setError("Rock fragment content must be a number.");
      return false;
    }
    if (value < rfgMin || value > rfgMax) {
      rockField.setError(
        `Rock fragment content must be between ${rfgMin} and ${rfgMax}.`
      );
      return false;
    }
    rockField.setValid();
    return true;
  };
  rockField.input.addEventListener("blur", () => {
    rockTouched = true;
    rockValidator();
  });
  rockField.input.addEventListener("input", () => {
    if (!rockTouched) return;
    if (rockTimer) clearTimeout(rockTimer);
    rockTimer = setTimeout(rockValidator, 300);
  });

  soilGrid.appendChild(soilField.wrapper);
  soilGrid.appendChild(rockField.wrapper);

  const isricField = createCheckboxField({
    id: `${idPrefix}_isric`,
    label: "Determine Soil Texture and Rock from ISRIC",
    help: "Requires latitude/longitude from Rock Climate Control.",
  });
  isricField.input.checked = Boolean(current.isric_enabled);

  const summary = document.createElement("div");
  summary.className = "text-sm text-muted-foreground space-y-1";
  const summaryStatus = document.createElement("p");
  const summaryValues = document.createElement("div");
  summaryValues.className = "grid gap-1";
  summary.appendChild(summaryStatus);
  summary.appendChild(summaryValues);

  function setSummary(lines, status) {
    summaryStatus.textContent = status || "";
    summaryValues.innerHTML = "";
    (lines || []).forEach((line) => {
      const p = document.createElement("p");
      p.textContent = line;
      summaryValues.appendChild(p);
    });
  }

  async function fetchIsric(lon, lat) {
    const id = ++requestId;
    setSummary([], "Fetching ISRIC soil data…");
    try {
      const [clayResult, sandResult, cfvoResult, wrbResult] = await Promise.all([
        fetchWmsValue({
          map: "clay",
          layer: "clay_0-5cm_mean",
          lon,
          lat,
        }),
        fetchWmsValue({
          map: "sand",
          layer: "sand_0-5cm_mean",
          lon,
          lat,
        }),
        fetchWmsValue({
          map: "cfvo",
          layer: "cfvo_0-5cm_mean",
          lon,
          lat,
        }),
        fetchWmsValue({
          map: "wrb",
          layer: "MostProbable",
          lon,
          lat,
        }),
      ]);
      if (id !== requestId) return;
      const clay = clayResult?.value;
      const sand = sandResult?.value;
      const cfvo = cfvoResult?.value;

      const textureLabel = Number.isFinite(clay) && Number.isFinite(sand)
        ? simpleTexture(clay, sand)
        : null;
      const mappedTexture = mapToSoilOption(textureLabel);

      if (Number.isFinite(cfvo)) {
        current.rfg_pct = Math.min(Math.max(cfvo, rfgMin), rfgMax);
        rockField.input.value = String(Math.round(current.rfg_pct));
      }
      if (mappedTexture) {
        current.soil_texture = mappedTexture;
        soilField.select.value = mappedTexture;
      }

      onChange?.({
        soil_texture: current.soil_texture,
        rfg_pct: current.rfg_pct,
      });

      const wrbName = typeof wrbResult?.value === "string" ? wrbResult.value : null;
      const lines = [
        `Clay: ${formatPercent(clay)} • Sand: ${formatPercent(sand)} • Rock fragments: ${formatPercent(cfvo)}`,
        textureLabel ? `Derived texture: ${textureLabel}` : "Derived texture: —",
        wrbName ? `WRB: ${wrbName}` : "WRB: —",
      ];
      setSummary(lines, "ISRIC WMS 0–5 cm mean.");
    } catch (error) {
      if (id !== requestId) return;
      console.error("[wepproad] ISRIC fetch failed", error);
      setSummary([], "Unable to load ISRIC soil data.");
    }
  }

  function updateIsricAvailability() {
    const climateState = readClimateState();
    const hasLocation = hasValidLocation(climateState);
    isricField.input.disabled = !hasLocation;
    if (!hasLocation) {
      setSummary([], "Set a Rock Climate location to query ISRIC.");
    }
  }

  function handleIsricToggle() {
    current.isric_enabled = isricField.input.checked;
    onChange?.({ isric_enabled: current.isric_enabled });
    if (!current.isric_enabled) {
      setSummary([], "");
      return;
    }
    const climateState = readClimateState();
    if (!hasValidLocation(climateState)) {
      setSummary([], "Set a Rock Climate location to query ISRIC.");
      return;
    }
    const key = `${climateState.location.longitude},${climateState.location.latitude}`;
    lastLocationKey = key;
    fetchIsric(climateState.location.longitude, climateState.location.latitude);
  }

  isricField.input.addEventListener("change", handleIsricToggle);

  document.addEventListener("fswepp:climate-changed", (event) => {
    const climateState = event?.detail || readClimateState();
    updateIsricAvailability();
    if (!current.isric_enabled) return;
    if (!hasValidLocation(climateState)) return;
    const key = `${climateState.location.longitude},${climateState.location.latitude}`;
    if (key === lastLocationKey) return;
    lastLocationKey = key;
    fetchIsric(climateState.location.longitude, climateState.location.latitude);
  });

  updateIsricAvailability();
  if (current.isric_enabled) {
    handleIsricToggle();
  }

  section.appendChild(soilGrid);
  section.appendChild(isricField.wrapper);
  section.appendChild(summary);

  return {
    wrapper: section,
    validators: [rockValidator],
    setState(next) {
      current = { ...current, ...next };
      soilField.select.value = current.soil_texture;
      rockField.input.value = String(current.rfg_pct);
      isricField.input.checked = Boolean(current.isric_enabled);
    },
  };
}
