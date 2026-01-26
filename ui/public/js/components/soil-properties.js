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

function buildPropertiesUrl(lon, lat) {
  const params = new URLSearchParams();
  params.set("lon", String(lon));
  params.set("lat", String(lat));
  params.append("property", "clay");
  params.append("property", "sand");
  params.append("property", "cfvo");
  params.append("depth", "0-5cm");
  params.append("value", "Q0.5");
  return `https://rest.isric.org/soilgrids/v2.0/properties/query?${params.toString()}`;
}

function buildClassificationUrl(lon, lat) {
  const params = new URLSearchParams();
  params.set("lon", String(lon));
  params.set("lat", String(lat));
  params.set("number_classes", "1");
  return `https://rest.isric.org/soilgrids/v2.0/classification/query?${params.toString()}`;
}

function extractPropertyValue(layer, valueKey) {
  if (!layer?.depths?.length) return null;
  const depth = layer.depths.find((d) => d.label === "0-5cm") || layer.depths[0];
  if (!depth?.values) return null;
  const raw = depth.values[valueKey];
  if (!Number.isFinite(Number(raw))) return null;
  const dFactor = Number(layer.unit_measure?.d_factor || 1);
  if (!Number.isFinite(dFactor) || dFactor === 0) return Number(raw);
  return Number(raw) / dFactor;
}

export function createSoilProperties({ state, onChange }) {
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
    id: "wepproad_soil_texture",
    label: "Soil Texture",
    options: SOIL_OPTIONS,
  });
  soilField.select.value = current.soil_texture;
  soilField.select.addEventListener("change", () => {
    current.soil_texture = soilField.select.value;
    onChange?.({ soil_texture: current.soil_texture });
  });

  const rockField = createFormField({
    id: "wepproad_rock_fragments",
    label: "Rock Fragment Content",
    type: "number",
    value: String(current.rfg_pct),
    unitLabel: "%",
  });
  rockField.input.step = "1";
  rockField.input.min = "0";
  rockField.input.max = "50";
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
    if (value < 0 || value > 50) {
      rockField.setError("Rock fragment content must be between 0 and 50.");
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
    id: "wepproad_isric",
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
      const [propsResponse, classResponse] = await Promise.all([
        fetch(buildPropertiesUrl(lon, lat)),
        fetch(buildClassificationUrl(lon, lat)),
      ]);
      if (!propsResponse.ok) {
        throw new Error(`ISRIC properties request failed (${propsResponse.status})`);
      }
      if (!classResponse.ok) {
        throw new Error(`ISRIC classification request failed (${classResponse.status})`);
      }
      const propsData = await propsResponse.json();
      const classData = await classResponse.json();
      if (id !== requestId) return;

      const layers = propsData?.properties?.layers || [];
      const clayLayer = layers.find((layer) => layer.name === "clay");
      const sandLayer = layers.find((layer) => layer.name === "sand");
      const cfvoLayer = layers.find((layer) => layer.name === "cfvo");
      const clay = extractPropertyValue(clayLayer, "Q0.5");
      const sand = extractPropertyValue(sandLayer, "Q0.5");
      const cfvo = extractPropertyValue(cfvoLayer, "Q0.5");

      const textureLabel = Number.isFinite(clay) && Number.isFinite(sand)
        ? simpleTexture(clay, sand)
        : null;
      const mappedTexture = mapToSoilOption(textureLabel);

      if (Number.isFinite(cfvo)) {
        current.rfg_pct = Math.min(Math.max(cfvo, 0), 50);
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

      const wrbName = classData?.wrb_class_name;
      const wrbProb = Array.isArray(classData?.wrb_class_probability)
        ? classData.wrb_class_probability[0]?.[1]
        : null;
      const lines = [
        `Clay: ${formatPercent(clay)} • Sand: ${formatPercent(sand)} • Rock fragments: ${formatPercent(cfvo)}`,
        textureLabel ? `Derived texture: ${textureLabel}` : "Derived texture: —",
        wrbName
          ? `WRB: ${wrbName}${Number.isFinite(wrbProb) ? ` (${wrbProb}%)` : ""}`
          : "WRB: —",
      ];
      setSummary(lines, "ISRIC 0–5 cm median (Q0.5).");
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
