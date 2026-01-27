import { createFormField } from "../components/form-field.js";
import { createSimulationOptions } from "../components/simulation-options.js";
import { createSoilProperties } from "../components/soil-properties.js";
import { createVegetationBurnSeverity } from "../components/vegetation-burn-severity.js";
import { createRunButton } from "../components/run-button.js";
import { createAnnualAveragesTable } from "../components/annual-averages-table.js";
import { createCanvasChart } from "../components/canvas-chart.js";
import { createCollapsibleSection } from "../components/collapsible.js";
import { createPreformattedBlock } from "../components/preformatted.js";
import { apiPost } from "../utils/api-client.js";
import { readClimateState } from "../core/rockclim-state.js";
import { readErmitState, writeErmitState } from "../core/ermit-state.js";

const SELECTED_RANKS = [5, 10, 20, 50, 75];
const LOG_WATTLE_WEIGHTS = new Map([
  [5, 0.075],
  [10, 0.075],
  [20, 0.2],
  [50, 0.275],
  [75, 0.375],
]);

function getUnitizerClient() {
  return window.UnitizerClient?.getClientSync?.() || null;
}

function getGlobalUnitOverride() {
  const toggle = document.getElementById("unit_toggle_input");
  if (!toggle) return null;
  return toggle.checked ? "english" : "metric";
}

function resolveUnitMeta(categoryKey, canonicalUnit) {
  const client = getUnitizerClient();
  const override = getGlobalUnitOverride();
  let unitKey = canonicalUnit;
  const manualCategories = new Set([
    "xs-distance",
    "sm-distance",
    "xs-distance-rate",
    "surface-density",
  ]);

  if (client) {
    const prefs = client.getPreferencePayload?.() || {};
    unitKey = prefs[categoryKey] || canonicalUnit;
  } else if (override && manualCategories.has(categoryKey)) {
    if (override === "english") {
      if (categoryKey === "xs-distance") unitKey = "in";
      if (categoryKey === "sm-distance") unitKey = "ft";
      if (categoryKey === "xs-distance-rate") unitKey = "in/hour";
      if (categoryKey === "surface-density") unitKey = "ton/acre";
    } else if (override === "metric") {
      if (categoryKey === "xs-distance") unitKey = "mm";
      if (categoryKey === "sm-distance") unitKey = "m";
      if (categoryKey === "xs-distance-rate") unitKey = "mm/hour";
      if (categoryKey === "surface-density") unitKey = "tonne/ha";
    }
  }

  if (!client) {
    return { unitKey, label: unitKey, precision: 2 };
  }
  const category = client.getCategory?.(categoryKey);
  const meta = category?.unitByKey?.get?.(unitKey);
  return {
    unitKey,
    label: meta?.label || unitKey,
    precision: meta?.precision ?? 2,
  };
}

function formatUnitValue(value, categoryKey, canonicalUnit, precisionOverrides) {
  if (!Number.isFinite(value)) {
    return { value: "—", unit: canonicalUnit };
  }
  const client = getUnitizerClient();
  const meta = resolveUnitMeta(categoryKey, canonicalUnit);
  let converted = value;
  if (client && meta.unitKey !== canonicalUnit) {
    try {
      converted = client.convert(value, canonicalUnit, meta.unitKey);
    } catch {
      converted = value;
    }
  } else if (!client && meta.unitKey !== canonicalUnit) {
    if (canonicalUnit === "mm" && meta.unitKey === "in") {
      converted = value / 25.4;
    }
    if (canonicalUnit === "mm/hour" && meta.unitKey === "in/hour") {
      converted = value / 25.4;
    }
    if (canonicalUnit === "m" && meta.unitKey === "ft") {
      converted = value * 3.28084;
    }
  }
  const precision =
    precisionOverrides && meta.unitKey in precisionOverrides
      ? precisionOverrides[meta.unitKey]
      : meta.precision;
  return {
    value: Number(converted).toFixed(precision),
    unit: meta.label,
  };
}

function formatSurfaceDensity(valueKgM2) {
  const client = getUnitizerClient();
  const override = getGlobalUnitOverride();
  const categoryKey = "surface-density";
  const canonicalUnit = "tonne/ha";
  const canonicalValue = Number(valueKgM2) * 10;
  let unitKey = canonicalUnit;

  if (client) {
    const prefs = client.getPreferencePayload?.() || {};
    unitKey = prefs[categoryKey] || canonicalUnit;
  } else if (override === "english") {
    unitKey = "ton/acre";
  } else if (override === "metric") {
    unitKey = "tonne/ha";
  }

  if (!client) {
    const fallbackValue =
      unitKey === "ton/acre" ? canonicalValue * 0.44609 : canonicalValue;
    return {
      value: Number.isFinite(valueKgM2) ? fallbackValue.toFixed(2) : "—",
      unit: unitKey,
      numeric: Number.isFinite(valueKgM2) ? fallbackValue : null,
    };
  }

  const category = client.getCategory?.(categoryKey);
  const meta = category?.unitByKey?.get?.(unitKey);
  let converted = canonicalValue;
  if (Number.isFinite(valueKgM2) && unitKey !== canonicalUnit) {
    try {
      converted = client.convert(canonicalValue, canonicalUnit, unitKey);
    } catch {
      converted = canonicalValue;
    }
  }
  const precision = meta?.precision ?? 2;
  return {
    value: Number.isFinite(valueKgM2)
      ? Number(converted).toFixed(precision)
      : "—",
    unit: meta?.label || unitKey,
    numeric: Number.isFinite(valueKgM2) ? Number(converted) : null,
  };
}

function getSelectedRunoffEvents(ebeEvents) {
  const events = Array.isArray(ebeEvents?.annual_maxima_events)
    ? ebeEvents.annual_maxima_events
    : [];
  const maxRank = ebeEvents?.num_years_with_runoff_event || events.length;
  const ranks = SELECTED_RANKS.filter((rank) => rank <= maxRank);
  return events
    .filter((event) => ranks.includes(event.runoff_rank))
    .sort((a, b) => a.runoff_rank - b.runoff_rank);
}

function computeWeightedI10(ebeEvents) {
  const selected = getSelectedRunoffEvents(ebeEvents);
  let weighted = 0;
  selected.forEach((event) => {
    const weight = LOG_WATTLE_WEIGHTS.get(event.runoff_rank);
    if (!weight) return;
    const peak10 = Number(
      event["10-min Peak Rainfall Intensity (mm/hour)"]
    );
    if (!Number.isFinite(peak10)) return;
    weighted += weight * peak10;
  });
  return Number.isFinite(weighted) ? weighted : 0;
}

function getLogWattleBounds() {
  const unitMeta = resolveUnitMeta("sm-distance", "m");
  const unitKey = unitMeta.unitKey;
  const isEnglish = unitKey === "ft";
  const toMeters = (value) => (isEnglish ? value * 0.3048 : value);
  return {
    unitKey,
    diameter: {
      min: toMeters(isEnglish ? 0.15 : 0.05),
      max: toMeters(isEnglish ? 3.5 : 1),
      default: toMeters(isEnglish ? 1 : 0.3),
    },
    spacing: {
      min: toMeters(isEnglish ? 5 : 1.5),
      max: toMeters(isEnglish ? 82 : 25),
      default: toMeters(isEnglish ? 20 : 5),
    },
  };
}

function clampValue(value, min, max, fallback) {
  if (!Number.isFinite(value)) return fallback;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function getLogWattleDensity(soilTexture) {
  if (soilTexture === "clay") return 1.1;
  if (soilTexture === "silt") return 0.97;
  if (soilTexture === "sand") return 1.23;
  if (soilTexture === "loam") return 1.16;
  return 1;
}

function computeLogWattleSediments({
  untreatedKgM2,
  diameter_m,
  spacing_m,
  slope_pct,
  soil_texture,
  i10,
  spacingMin_m,
}) {
  if (!Array.isArray(untreatedKgM2) || untreatedKgM2.length !== 5) {
    return [null, null, null, null, null];
  }
  let slope = Number.isFinite(slope_pct) ? slope_pct : 10;
  if (slope > 100) slope = 100;
  if (slope < 0.05 || spacing_m < spacingMin_m) {
    return untreatedKgM2.slice();
  }

  const density = getLogWattleDensity(soil_texture);
  const diam_cm = diameter_m * 100;
  let capacityVol =
    1342 / slope + 0.0029 * diam_cm * diam_cm + 272 / spacing_m - 35.4;
  if (capacityVol < 0) capacityVol = 0;

  const capacityMgHa = capacityVol * density;
  const capacityKgM2 = capacityMgHa / 10;
  const i10Value = Number.isFinite(i10) ? i10 : 0;
  const eff0 = Math.min(Math.max(113.97 - 0.8425 * i10Value, 0), 100);
  const eff1 = Math.min(Math.max(116 - 1.4 * i10Value, 0), 100);
  const eff2 = eff1 * 0.75;
  const eff3 = eff2 * 0.55;
  const eff4 = eff3 * 0.45;
  const efficiencies = [eff0, eff1, eff2, eff3, eff4];

  return untreatedKgM2.map((sed, idx) => {
    if (!Number.isFinite(sed)) return null;
    const caught = Math.min((capacityKgM2 * efficiencies[idx]) / 100, sed);
    return sed - caught;
  });
}

function readCanonical(input) {
  const stored = input.dataset.unitizerCanonicalValue;
  if (stored != null && stored !== "") {
    const parsed = Number(stored);
    if (Number.isFinite(parsed)) return parsed;
  }
  const num = Number(input.value);
  return Number.isFinite(num) ? num : null;
}

function readCanonicalFromInput(input, categoryKey, canonicalUnit) {
  const raw = Number(input.value);
  if (!Number.isFinite(raw)) return null;
  const client = getUnitizerClient();
  const activeUnit =
    input.dataset.unitizerActiveUnit || canonicalUnit;
  if (client && activeUnit !== canonicalUnit) {
    try {
      return client.convert(raw, activeUnit, canonicalUnit);
    } catch {
      return raw;
    }
  }
  if (!client && activeUnit !== canonicalUnit) {
    if (canonicalUnit === "m" && activeUnit === "ft") {
      return raw * 0.3048;
    }
  }
  return raw;
}

function setFieldValue(input, value) {
  if (!Number.isFinite(value)) return;
  input.value = String(value);
  input.dataset.unitizerCanonicalValue = String(value);
}

function attachUnitLabel(field, category, unitKey) {
  const row = field.wrapper.querySelector("div.flex");
  if (!row) return;
  const unitSpan = row.querySelector("span.text-sm");
  if (!unitSpan) return;
  unitSpan.setAttribute("data-unitizer-label", "");
  unitSpan.setAttribute("data-unitizer-category", category);
  unitSpan.setAttribute("data-unitizer-unit", unitKey);
}

function createSection(title) {
  const section = document.createElement("section");
  section.className = "rounded-lg border border-border bg-card p-6 space-y-4";
  const heading = document.createElement("h2");
  heading.className = "text-base font-semibold";
  heading.textContent = title;
  section.appendChild(heading);
  return section;
}

function attachCanonicalValidator(field, options) {
  const { input, setError, setValid } = field;
  const { min, max, label } = options;
  let touched = false;
  let timer = null;

  const validate = () => {
    const value = readCanonical(input);
    if (!Number.isFinite(value)) {
      setError(`${label} must be a number.`);
      return false;
    }
    if (value < min || value > max) {
      setError(`${label} must be between ${min} and ${max}.`);
      return false;
    }
    setValid();
    return true;
  };

  input.addEventListener("blur", () => {
    touched = true;
    validate();
  });
  input.addEventListener("input", () => {
    if (!touched) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(validate, 300);
  });

  return validate;
}

function ordinalSuffix(value) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return `${value}st year`;
  if (mod10 === 2 && mod100 !== 12) return `${value}nd year`;
  if (mod10 === 3 && mod100 !== 13) return `${value}rd year`;
  return `${value}th year`;
}

function getSpatialSeverities(burnSeverity) {
  switch (burnSeverity) {
    case "High":
      return ["hhh", "lhh", "hlh", "hhl", "llh", "lhl", "hll", "lll"];
    case "Moderate":
      return ["hlh", "hhl", "llh", "lhl", "hll", "lll"];
    case "Low":
      return ["llh", "lhl", "hll", "lll"];
    case "Unburned":
      return ["uuu"];
    default:
      return ["lll"];
  }
}

function createSelectControl({ label, options = [], value, onChange } = {}) {
  const wrapper = document.createElement("label");
  wrapper.className = "flex flex-col gap-1 text-xs text-muted-foreground";
  const text = document.createElement("span");
  text.textContent = label || "";

  const select = document.createElement("select");
  select.className = "h-8 rounded-md border border-input bg-background px-2 text-xs";
  wrapper.appendChild(text);
  wrapper.appendChild(select);

  const setOptions = (nextOptions = [], nextValue) => {
    const currentValue = nextValue ?? select.value;
    select.innerHTML = "";
    nextOptions.forEach((option) => {
      const opt = document.createElement("option");
      if (option && typeof option === "object") {
        opt.value = String(option.value);
        opt.textContent = option.label ?? String(option.value);
      } else {
        opt.value = String(option);
        opt.textContent = String(option);
      }
      select.appendChild(opt);
    });
    if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
      select.value = currentValue;
    } else if (nextOptions.length) {
      const first = nextOptions[0];
      select.value =
        typeof first === "object" ? String(first.value) : String(first);
    }
  };

  setOptions(options, value);

  if (typeof onChange === "function") {
    select.addEventListener("change", () => onChange(select.value));
  }

  return { wrapper, select, setOptions };
}

export function mountErmitTool(root) {
  if (!root) return;
  const state = readErmitState();
  writeErmitState(state);

  let lastResults = null;
  let lastYears = null;
  let lastRunState = null;
  let lastClimateState = null;
  let lastFilePayload = null;
  const logsWattlesState = {
    diameter_m: null,
    spacing_m: null,
    userSet: false,
  };

  root.innerHTML = "";
  const container = document.createElement("div");
  container.className = "space-y-8";

  const form = document.createElement("form");
  form.className = "space-y-6";
  form.addEventListener("submit", (event) => event.preventDefault());

  const updateState = (patch) => {
    Object.assign(state, patch);
    writeErmitState(state);
  };

  // 2) Soil properties
  const soilSection = createSoilProperties({
    state,
    onChange: updateState,
    idPrefix: "ermit",
    rfgMin: 5,
    rfgMax: 85,
  });
  form.appendChild(soilSection.wrapper);

  // 3) Vegetation/Burn Severity
  const vegetationSection = createVegetationBurnSeverity({
    state,
    onChange: updateState,
    idPrefix: "ermit",
  });
  form.appendChild(vegetationSection.wrapper);

  // 4) Hillslope
  const hillslopeSection = createSection("Hillslope");
  const hillslopeGrid = document.createElement("div");
  hillslopeGrid.className = "grid gap-4 md:grid-cols-2";

  const topSlopeField = createFormField({
    id: "ermit_top_slope",
    label: "Top Gradient",
    type: "number",
    value: String(state.top_slope_pct),
    unitLabel: "%",
  });
  topSlopeField.input.step = "0.001";
  topSlopeField.input.min = "0.001";
  topSlopeField.input.max = "100";
  topSlopeField.input.addEventListener("input", () => {
    const canonical = readCanonical(topSlopeField.input);
    if (canonical != null) updateState({ top_slope_pct: canonical });
  });

  const middleSlopeField = createFormField({
    id: "ermit_middle_slope",
    label: "Middle Gradient",
    type: "number",
    value: String(state.middle_slope_pct),
    unitLabel: "%",
  });
  middleSlopeField.input.step = "0.001";
  middleSlopeField.input.min = "0.001";
  middleSlopeField.input.max = "100";
  middleSlopeField.input.addEventListener("input", () => {
    const canonical = readCanonical(middleSlopeField.input);
    if (canonical != null) updateState({ middle_slope_pct: canonical });
  });

  const bottomSlopeField = createFormField({
    id: "ermit_bottom_slope",
    label: "Bottom Gradient",
    type: "number",
    value: String(state.bottom_slope_pct),
    unitLabel: "%",
  });
  bottomSlopeField.input.step = "0.001";
  bottomSlopeField.input.min = "0.001";
  bottomSlopeField.input.max = "100";
  bottomSlopeField.input.addEventListener("input", () => {
    const canonical = readCanonical(bottomSlopeField.input);
    if (canonical != null) updateState({ bottom_slope_pct: canonical });
  });

  const lengthField = createFormField({
    id: "ermit_hillslope_length",
    label: "Horizontal Length",
    type: "number",
    value: String(state.length_m),
    unitLabel: "m",
  });
  lengthField.input.step = "0.1";
  lengthField.input.min = "0";
  lengthField.input.max = "300";
  lengthField.input.setAttribute("data-unitizer-category", "sm-distance");
  lengthField.input.setAttribute("data-unitizer-unit", "m");
  lengthField.input.setAttribute("data-precision", "2");
  attachUnitLabel(lengthField, "sm-distance", "m");
  setFieldValue(lengthField.input, state.length_m);
  lengthField.input.addEventListener("input", () => {
    const canonical = readCanonical(lengthField.input);
    if (canonical != null) updateState({ length_m: canonical });
  });

  hillslopeGrid.appendChild(topSlopeField.wrapper);
  hillslopeGrid.appendChild(middleSlopeField.wrapper);
  hillslopeGrid.appendChild(bottomSlopeField.wrapper);
  hillslopeGrid.appendChild(lengthField.wrapper);
  hillslopeSection.appendChild(hillslopeGrid);
  form.appendChild(hillslopeSection);

  // 5) Simulation options
  const simSection = createSimulationOptions({
    id: "ermit_sim_years",
    value: String(state.simulation_years),
    onInput: (input) => {
      const canonical = readCanonical(input);
      if (canonical != null) updateState({ simulation_years: canonical });
    },
    weppVersion: {
      id: "ermit_wepp_version",
      label: "WEPP Version",
      options: [
        { value: "wepp2010", label: "WEPP 2010" },
        { value: "wepp_dcc52a6_hill", label: "WEPP dcc52a6 hill" },
      ],
      value: state.wepp_version,
      onInput: (select) => updateState({ wepp_version: select.value }),
    },
  });
  form.appendChild(simSection.wrapper);

  const runSection = document.createElement("div");
  runSection.className = "space-y-3";
  const runButton = createRunButton({ label: "Run ERMiT Model" });
  runSection.appendChild(runButton.wrapper);

  const details = document.createElement("details");
  details.className =
    "rounded-md border border-border bg-muted/30 px-3 py-2 text-sm hidden";
  const summary = document.createElement("summary");
  summary.className = "cursor-pointer font-medium";
  summary.textContent = "Error details";
  const detailBody = document.createElement("pre");
  detailBody.className = "mt-2 whitespace-pre-wrap text-xs text-muted-foreground";
  details.appendChild(summary);
  details.appendChild(detailBody);
  runSection.appendChild(details);
  form.appendChild(runSection);

  const resultsSection = createSection("Results");
  resultsSection.id = "ermit-results";
  resultsSection.style.display = "none";

  const inputsSummaryHeading = document.createElement("h3");
  inputsSummaryHeading.className = "text-sm font-semibold";
  inputsSummaryHeading.textContent = "Inputs Summary";
  const inputsSummaryTable = document.createElement("table");
  inputsSummaryTable.className =
    "w-full text-sm border border-border rounded-md table-fixed";
  inputsSummaryTable.innerHTML = `
    <thead class="bg-muted text-left">
      <tr>
        <th class="px-3 py-2">Input</th>
        <th class="px-3 py-2">Value</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const inputsSummaryBody = inputsSummaryTable.querySelector("tbody");

  const annualTable = createAnnualAveragesTable({ idPrefix: "ermit" });
  const annualTableBody = annualTable.tableBody;

  const rainfallHeading = document.createElement("h3");
  rainfallHeading.className = "text-sm font-semibold";
  rainfallHeading.textContent =
    "Rainfall Event Rankings and Characteristics from the Selected Storms";
  const rainfallTable = document.createElement("table");
  rainfallTable.className =
    "w-full text-sm border border-border rounded-md table-fixed";
  rainfallTable.innerHTML = `
    <thead class="bg-muted text-left">
      <tr>
        <th class="px-3 py-2" id="ermit-rainfall-rank"></th>
        <th class="px-3 py-2 text-right" id="ermit-rainfall-runoff"></th>
        <th class="px-3 py-2 text-right" id="ermit-rainfall-precip"></th>
        <th class="px-3 py-2 text-right" id="ermit-rainfall-duration"></th>
        <th class="px-3 py-2 text-right" id="ermit-rainfall-peak10"></th>
        <th class="px-3 py-2 text-right" id="ermit-rainfall-peak30"></th>
        <th class="px-3 py-2">Date</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const rainfallBody = rainfallTable.querySelector("tbody");
  const rainfallHeaders = {
    rank: rainfallTable.querySelector("#ermit-rainfall-rank"),
    runoff: rainfallTable.querySelector("#ermit-rainfall-runoff"),
    precip: rainfallTable.querySelector("#ermit-rainfall-precip"),
    duration: rainfallTable.querySelector("#ermit-rainfall-duration"),
    peak10: rainfallTable.querySelector("#ermit-rainfall-peak10"),
    peak30: rainfallTable.querySelector("#ermit-rainfall-peak30"),
  };

  const plotHeading = document.createElement("h3");
  plotHeading.className = "text-sm font-semibold";
  plotHeading.textContent = "Sediment Delivery Exceedance Probability";
  const exceedanceChart = createCanvasChart({
    type: "exceedance",
    options: {
      minHeight: 640,
      margins: { bottom: 60 },
      tooltip: { portal: true },
      xAxis: { label: "Sediment Delivery", labelOffset: 32 },
      yAxis: { label: "Probability (%)", domain: [0, 100] },
    },
  });

  const sedimentHeading = document.createElement("h3");
  sedimentHeading.className = "text-sm font-semibold";
  sedimentHeading.textContent = "Sediment Delivery";

  const sedimentControl = document.createElement("div");
  sedimentControl.className = "flex flex-wrap items-center gap-3 text-sm";
  const probLabel = document.createElement("label");
  probLabel.className = "font-medium";
  probLabel.textContent = "Target exceedance probability (%)";
  const probInput = document.createElement("input");
  probInput.type = "number";
  probInput.min = "1";
  probInput.max = "99";
  probInput.step = "1";
  probInput.value = "20";
  probInput.className =
    "h-9 w-20 rounded-md border border-input bg-background px-3 py-1 text-sm";
  const probHint = document.createElement("span");
  probHint.className = "text-muted-foreground";
  probHint.textContent = "Default 20%";
  probLabel.appendChild(probInput);
  sedimentControl.appendChild(probLabel);
  sedimentControl.appendChild(probHint);

  const sedimentTable = document.createElement("table");
  sedimentTable.className =
    "w-full text-sm border border-border rounded-md table-fixed";
  sedimentTable.innerHTML = `
    <thead class="bg-muted text-left">
      <tr>
        <th class="px-3 py-2">Treatment</th>
        <th class="px-3 py-2 text-right" id="ermit-sediment-year-1"></th>
        <th class="px-3 py-2 text-right" id="ermit-sediment-year-2"></th>
        <th class="px-3 py-2 text-right" id="ermit-sediment-year-3"></th>
        <th class="px-3 py-2 text-right" id="ermit-sediment-year-4"></th>
        <th class="px-3 py-2 text-right" id="ermit-sediment-year-5"></th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const sedimentBody = sedimentTable.querySelector("tbody");
  const sedimentYearHeaders = [
    sedimentTable.querySelector("#ermit-sediment-year-1"),
    sedimentTable.querySelector("#ermit-sediment-year-2"),
    sedimentTable.querySelector("#ermit-sediment-year-3"),
    sedimentTable.querySelector("#ermit-sediment-year-4"),
    sedimentTable.querySelector("#ermit-sediment-year-5"),
  ];

  const filesContainer = document.createElement("div");
  filesContainer.className = "space-y-4";

  function createFileSection({
    id,
    title,
    description,
    downloadLabel,
    filename,
    persistKey,
    includeSeverity,
    includeSoilIndex,
  }) {
    const content = document.createElement("div");
    content.className = "space-y-3";
    const meta = document.createElement("div");
    meta.className = "flex flex-wrap items-center gap-3";
    const status = document.createElement("p");
    status.className = "text-xs text-muted-foreground";

    const controls = document.createElement("div");
    controls.className = "flex flex-wrap items-center gap-3";

    let severitySelect = null;
    if (includeSeverity) {
      severitySelect = createSelectControl({
        label: "Spatial severity",
        options: [],
      });
      controls.appendChild(severitySelect.wrapper);
    }

    let soilIndexSelect = null;
    if (includeSoilIndex) {
      soilIndexSelect = createSelectControl({
        label: "Soil set",
        options: [
          { value: 0, label: "Set 1" },
          { value: 1, label: "Set 2" },
          { value: 2, label: "Set 3" },
          { value: 3, label: "Set 4" },
          { value: 4, label: "Set 5" },
        ],
      });
      controls.appendChild(soilIndexSelect.wrapper);
    }

    const download = document.createElement("a");
    download.className =
      "ml-auto inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-base font-medium transition-all border border-border bg-background hover:bg-accent";
    download.textContent = downloadLabel;
    download.href = "#";
    download.setAttribute("aria-disabled", "true");
    download.addEventListener("click", (event) => {
      if (download.getAttribute("aria-disabled") === "true") {
        event.preventDefault();
      }
    });

    meta.appendChild(status);
    if (controls.childNodes.length) {
      meta.appendChild(controls);
    }
    meta.appendChild(download);

    const block = createPreformattedBlock({
      id,
      className: "max-h-80 overflow-y-auto",
    });
    content.appendChild(meta);
    content.appendChild(block.pre);
    const section = createCollapsibleSection({
      id: `${id}-section`,
      title,
      description,
      content,
      persistKey,
      defaultOpen: false,
    });

    let blobUrl = "";
    function setDownloadEnabled(enabled, nextFilename, text) {
      download.setAttribute("aria-disabled", enabled ? "false" : "true");
      download.tabIndex = enabled ? 0 : -1;
      download.classList.toggle("opacity-60", !enabled);
      download.classList.toggle("pointer-events-none", !enabled);
      if (!enabled) {
        download.removeAttribute("href");
        download.removeAttribute("download");
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
          blobUrl = "";
        }
        return;
      }
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
      const blob = new Blob([text || ""], { type: "application/text" });
      blobUrl = URL.createObjectURL(blob);
      download.href = blobUrl;
      download.download = nextFilename || filename;
    }

    function setStatus(message) {
      status.textContent = message || "";
    }

    function setText(text, nextFilename) {
      block.setText(text || "");
      if (text) {
        const label = nextFilename || filename;
        setStatus(`Loaded ${label}`);
        setDownloadEnabled(true, label, text);
      } else {
        setStatus("File is not available yet.");
        setDownloadEnabled(false, "", "");
      }
    }

    function clearText() {
      block.setText("");
      setDownloadEnabled(false, "", "");
    }

    return {
      section,
      setStatus,
      setText,
      clearText,
      severitySelect,
      soilIndexSelect,
    };
  }

  const fileSections = [
    {
      key: "management",
      title: "Management File",
      description: "Generated management (.man) file used by WEPP.",
      downloadLabel: "Download .man",
      filename: "ermit-management.man",
      persistKey: "fswepp2_ermit_man_open",
      includeSeverity: true,
      endpoint: ({ spatialSeverity }) =>
        `/api/ermit/GET/management/${spatialSeverity}`,
      buildFilename: ({ spatialSeverity }) =>
        `ermit-management-${spatialSeverity}.man`,
    },
    {
      key: "soil",
      title: "Soil File",
      description: "Generated soil (.sol) file used by WEPP.",
      downloadLabel: "Download .sol",
      filename: "ermit-soil.sol",
      persistKey: "fswepp2_ermit_sol_open",
      includeSeverity: true,
      includeSoilIndex: true,
      endpoint: ({ spatialSeverity, soilIndex }) =>
        `/api/ermit/GET/soil/${spatialSeverity}/${soilIndex}`,
      buildFilename: ({ spatialSeverity, soilIndex }) =>
        `ermit-soil-${spatialSeverity}-set-${Number(soilIndex) + 1}.sol`,
    },
    {
      key: "slope",
      title: "Slope File",
      description: "Generated slope (.slp) file used by WEPP.",
      downloadLabel: "Download .slp",
      filename: "ermit-slope.slp",
      persistKey: "fswepp2_ermit_slp_open",
      includeSeverity: true,
      endpoint: ({ spatialSeverity }) =>
        `/api/ermit/GET/slope/${spatialSeverity}`,
      buildFilename: ({ spatialSeverity }) =>
        `ermit-slope-${spatialSeverity}.slp`,
    },
    {
      key: "wepp_output",
      title: "WEPP Output",
      description: "Raw WEPP output file.",
      downloadLabel: "Download .dat",
      filename: "ermit-wepp-output.dat",
      persistKey: "fswepp2_ermit_wepp_out_open",
      endpoint: () => "/api/ermit/GET/wepp_output",
    },
    {
      key: "wepp_ebe",
      title: "WEPP EBE Output",
      description: "Event-by-event WEPP output file.",
      downloadLabel: "Download .ebe",
      filename: "ermit-wepp-output.ebe",
      persistKey: "fswepp2_ermit_wepp_ebe_open",
      endpoint: () => "/api/ermit/GET/wepp_ebe",
    },
  ].map((config) => ({
    ...config,
    ui: createFileSection(config),
  }));

  fileSections.forEach((entry) => {
    if (entry.ui.severitySelect) {
      entry.ui.severitySelect.select.addEventListener("change", () => {
        if (!lastFilePayload) return;
        prefetchFile(entry, lastFilePayload);
      });
    }
    if (entry.ui.soilIndexSelect) {
      entry.ui.soilIndexSelect.select.addEventListener("change", () => {
        if (!lastFilePayload) return;
        prefetchFile(entry, lastFilePayload);
      });
    }
    entry.ui.setStatus("Run the model to generate files.");
  });

  fileSections.forEach((entry) => filesContainer.appendChild(entry.ui.section));

  const resultsContent = document.createElement("div");
  resultsContent.className = "space-y-6";
  resultsContent.appendChild(inputsSummaryHeading);
  resultsContent.appendChild(inputsSummaryTable);
  resultsContent.appendChild(annualTable.table);
  resultsContent.appendChild(rainfallHeading);
  resultsContent.appendChild(rainfallTable);
  resultsContent.appendChild(plotHeading);
  resultsContent.appendChild(exceedanceChart.wrapper);
  resultsContent.appendChild(sedimentHeading);
  resultsContent.appendChild(sedimentControl);
  resultsContent.appendChild(sedimentTable);
  resultsContent.appendChild(filesContainer);
  resultsSection.appendChild(resultsContent);

  function showErrorDetails(text) {
    if (!text) {
      details.classList.add("hidden");
      detailBody.textContent = "";
      return;
    }
    detailBody.textContent = text;
    details.classList.remove("hidden");
  }

  function clearErrorDetails() {
    details.classList.add("hidden");
    detailBody.textContent = "";
  }

  function getFileSelection(entry) {
    const spatialSeverity = entry.ui.severitySelect
      ? entry.ui.severitySelect.select.value
      : "uuu";
    const soilIndex = entry.ui.soilIndexSelect
      ? Number(entry.ui.soilIndexSelect.select.value)
      : null;
    return { spatialSeverity, soilIndex };
  }

  async function prefetchFile(entry, payload) {
    if (!payload) return;
    const { spatialSeverity, soilIndex } = getFileSelection(entry);
    if (!spatialSeverity) return;
    const endpoint = entry.endpoint({ spatialSeverity, soilIndex });
    const downloadName = entry.buildFilename
      ? entry.buildFilename({ spatialSeverity, soilIndex })
      : entry.filename;

    entry.ui.clearText();
    entry.ui.setStatus("Loading file...");
    try {
      const response = await apiPost(endpoint, payload, { timeoutMs: 60000 });
      const text = typeof response === "string" ? response : "";
      if (!text) {
        entry.ui.setStatus("File is not available yet.");
        return;
      }
      entry.ui.setText(text, downloadName);
    } catch (error) {
      console.error(`[ermit] Failed to load ${entry.key} file`, error);
      entry.ui.setStatus("Unable to load file.");
    }
  }

  function prefetchFiles(payload) {
    if (!payload) return;
    fileSections.forEach((entry) => {
      prefetchFile(entry, payload);
    });
  }

  function configureFileSections(currentState, payload) {
    lastFilePayload = payload;
    const severities = getSpatialSeverities(currentState.burn_severity).map(
      (value) => ({ value, label: value.toUpperCase() })
    );
    fileSections.forEach((entry) => {
      if (entry.ui.severitySelect) {
        entry.ui.severitySelect.setOptions(severities);
      }
      if (entry.ui.soilIndexSelect) {
        entry.ui.soilIndexSelect.setOptions([
          { value: 0, label: "Set 1" },
          { value: 1, label: "Set 2" },
          { value: 2, label: "Set 3" },
          { value: 3, label: "Set 4" },
          { value: 4, label: "Set 5" },
        ]);
      }
    });
    prefetchFiles(payload);
  }

  function setFormDisabled(disabled) {
    const fields = form.querySelectorAll("input, select, button");
    fields.forEach((el) => {
      if (el === runButton.button) return;
      el.disabled = disabled;
    });
  }

  const topSlopeValidator = attachCanonicalValidator(topSlopeField, {
    min: 0.001,
    max: 100,
    label: "Top gradient",
  });
  const middleSlopeValidator = attachCanonicalValidator(middleSlopeField, {
    min: 0.001,
    max: 100,
    label: "Middle gradient",
  });
  const bottomSlopeValidator = attachCanonicalValidator(bottomSlopeField, {
    min: 0.001,
    max: 100,
    label: "Bottom gradient",
  });
  const lengthValidator = attachCanonicalValidator(lengthField, {
    min: 0,
    max: 300,
    label: "Hillslope length",
  });
  const simValidator = attachCanonicalValidator(simSection.field, {
    min: 1,
    max: 200,
    label: "Simulation years",
  });

  let shrubTouched = false;
  let grassTouched = false;
  let coverTimer = null;

  function clearCoverErrors() {
    vegetationSection.shrubField.setError("");
    vegetationSection.grassField.setError("");
    vegetationSection.bareField.setError("");
  }

  function validateCoverFields() {
    if (state.vegetation_type === "Forest") {
      clearCoverErrors();
      return true;
    }
    const shrubValue = Number(vegetationSection.shrubField.input.value);
    const grassValue = Number(vegetationSection.grassField.input.value);

    let ok = true;
    if (!Number.isFinite(shrubValue)) {
      vegetationSection.shrubField.setError("Shrub cover must be a number.");
      ok = false;
    } else if (shrubValue < 0 || shrubValue > 100) {
      vegetationSection.shrubField.setError(
        "Shrub cover must be between 0 and 100."
      );
      ok = false;
    } else {
      vegetationSection.shrubField.setValid();
    }

    if (!Number.isFinite(grassValue)) {
      vegetationSection.grassField.setError("Grass cover must be a number.");
      ok = false;
    } else if (grassValue < 0 || grassValue > 100) {
      vegetationSection.grassField.setError(
        "Grass cover must be between 0 and 100."
      );
      ok = false;
    } else {
      vegetationSection.grassField.setValid();
    }

    if (Number.isFinite(shrubValue) && Number.isFinite(grassValue)) {
      const total = shrubValue + grassValue;
      if (total > 100) {
        const msg = "Shrub + grass cover cannot exceed 100%.";
        vegetationSection.shrubField.setError(msg);
        vegetationSection.grassField.setError(msg);
        vegetationSection.bareField.setError(msg);
        ok = false;
      } else {
        vegetationSection.bareField.setValid();
      }
    }

    return ok;
  }

  vegetationSection.shrubField.input.addEventListener("blur", () => {
    shrubTouched = true;
    validateCoverFields();
  });
  vegetationSection.shrubField.input.addEventListener("input", () => {
    if (!shrubTouched) return;
    if (coverTimer) clearTimeout(coverTimer);
    coverTimer = setTimeout(validateCoverFields, 300);
  });

  vegetationSection.grassField.input.addEventListener("blur", () => {
    grassTouched = true;
    validateCoverFields();
  });
  vegetationSection.grassField.input.addEventListener("input", () => {
    if (!grassTouched) return;
    if (coverTimer) clearTimeout(coverTimer);
    coverTimer = setTimeout(validateCoverFields, 300);
  });

  vegetationSection.vegetationGroup.inputs.forEach((input) => {
    input.addEventListener("change", () => {
      clearCoverErrors();
      if (state.vegetation_type !== "Forest") {
        validateCoverFields();
      }
    });
  });

  function validateAll() {
    const validators = [
      ...(soilSection.validators || []),
      topSlopeValidator,
      middleSlopeValidator,
      bottomSlopeValidator,
      lengthValidator,
      simValidator,
      validateCoverFields,
    ];
    return validators.every((validator) => {
      if (typeof validator === "function") return validator();
      if (validator && typeof validator.validate === "function") {
        return validator.validate();
      }
      return true;
    });
  }

  function renderInputSummary(runState, climateState) {
    if (!runState) return;
    const rows = [];
    const climateLabel = climateState?.par_id
      ? `Station ${climateState.par_id}`
      : "Not selected";
    rows.push({ label: "Climate", value: climateLabel });

    rows.push({
      label: "Soil texture",
      value: `${runState.soil_texture}, ${runState.rfg_pct}% rock fragments`,
    });

    const lengthMeta = formatUnitValue(runState.length_m, "sm-distance", "m", {
      m: 2,
      ft: 2,
    });
    rows.push({
      label: "Hillslope",
      value: `Top ${runState.top_slope_pct}%, Middle ${runState.middle_slope_pct}%, Bottom ${runState.bottom_slope_pct}%, Length ${lengthMeta.value} ${lengthMeta.unit}`,
    });

    rows.push({
      label: "Vegetation",
      value: `${runState.vegetation_type} (${runState.burn_severity})`,
    });

    if (runState.vegetation_type !== "Forest") {
      rows.push({
        label: "Pre-fire community",
        value: `${runState.user_shrub_pct}% shrub, ${runState.user_grass_pct}% grass, ${runState.user_bare_pct}% bare`,
      });
    }

    inputsSummaryBody.innerHTML = "";
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      tr.className = "border-t border-border";
      tr.innerHTML = `
        <td class="px-3 py-2 font-medium">${row.label}</td>
        <td class="px-3 py-2">${row.value}</td>
      `;
      inputsSummaryBody.appendChild(tr);
    });
  }

  function renderAnnualAverages(annual, years) {
    if (!annual) return;
    const precipMeta = formatUnitValue(annual.precip_mm, "xs-distance", "mm", {
      mm: 0,
      in: 2,
    });
    const runoffRainMeta = formatUnitValue(
      annual.runoff_from_rain_mm,
      "xs-distance",
      "mm",
      { mm: 0, in: 2 }
    );
    const runoffSnowMeta = formatUnitValue(
      annual.runoff_from_snow_mm,
      "xs-distance",
      "mm",
      { mm: 0, in: 2 }
    );

    annualTable.setHeader(years);

    const rows = [
      {
        value: precipMeta.value,
        unit: precipMeta.unit,
        text: "annual precipitation from",
        count: annual.storms,
        countLabel: "storms",
      },
      {
        value: runoffRainMeta.value,
        unit: runoffRainMeta.unit,
        text: "annual runoff from rainfall from",
        count: annual.rainevents,
        countLabel: "events",
      },
      {
        value: runoffSnowMeta.value,
        unit: runoffSnowMeta.unit,
        text: "annual runoff from snowmelt or winter rainstorm from",
        count: annual.snowevents,
        countLabel: "events",
      },
    ];

    annualTableBody.innerHTML = "";
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      tr.className = "border-t border-border";
      tr.innerHTML = `
        <td class="px-3 py-2 text-right font-medium">${row.value}</td>
        <td class="px-3 py-2">${row.unit}</td>
        <td class="px-3 py-2">${row.text}</td>
        <td class="px-3 py-2 text-right">${row.count ?? ""}</td>
        <td class="px-3 py-2">${row.countLabel ?? ""}</td>
      `;
      annualTableBody.appendChild(tr);
    });
  }

  function renderRainfallEvents(ebeEvents) {
    const runoffUnit = resolveUnitMeta("xs-distance", "mm").label;
    const precipUnit = resolveUnitMeta("xs-distance", "mm").label;
    const intensityUnit = resolveUnitMeta("xs-distance-rate", "mm/hour").label;
    if (rainfallHeaders.rank) {
      rainfallHeaders.rank.innerHTML =
        'Storm Rank<span class="block text-xs font-normal text-muted-foreground">based on runoff (return interval)</span>';
    }
    if (rainfallHeaders.runoff) {
      rainfallHeaders.runoff.textContent = `Storm Runoff (${runoffUnit})`;
    }
    if (rainfallHeaders.precip) {
      rainfallHeaders.precip.textContent = `Storm Precipitation (${precipUnit})`;
    }
    if (rainfallHeaders.duration) {
      rainfallHeaders.duration.textContent = "Duration (hr)";
    }
    if (rainfallHeaders.peak10) {
      rainfallHeaders.peak10.textContent = `10-min Peak (${intensityUnit})`;
    }
    if (rainfallHeaders.peak30) {
      rainfallHeaders.peak30.textContent = `30-min Peak (${intensityUnit})`;
    }

    const maxRank =
      ebeEvents?.num_years_with_runoff_event ||
      ebeEvents?.annual_maxima_events?.length ||
      0;
    const selected = getSelectedRunoffEvents(ebeEvents);

    rainfallBody.innerHTML = "";
    if (!selected.length) {
      const tr = document.createElement("tr");
      tr.className = "border-t border-border";
      tr.innerHTML =
        '<td class="px-3 py-2" colspan="7">No runoff events available.</td>';
      rainfallBody.appendChild(tr);
      return;
    }

    selected.forEach((event) => {
      let returnIntervalLabel = null;
      if (Number.isFinite(maxRank) && maxRank > 0 && event.runoff_rank) {
        const returnInterval = maxRank / event.runoff_rank;
        if (Number.isFinite(returnInterval) && returnInterval > 0) {
          const rounded = Math.round(returnInterval);
          const display =
            Math.abs(returnInterval - rounded) < 0.05
              ? String(rounded)
              : returnInterval.toFixed(1);
          returnIntervalLabel = `(${display}-year)`;
        }
      }
      const runoffMeta = formatUnitValue(
        event.runoff_mm,
        "xs-distance",
        "mm",
        { mm: 1, in: 2 }
      );
      const precipMeta = formatUnitValue(
        event.precip_mm,
        "xs-distance",
        "mm",
        { mm: 1, in: 2 }
      );
      const peak10 = formatUnitValue(
        event["10-min Peak Rainfall Intensity (mm/hour)"],
        "xs-distance-rate",
        "mm/hour",
        { "mm/hour": 1, "in/hour": 2 }
      );
      const peak30 = formatUnitValue(
        event["30-min Peak Rainfall Intensity (mm/hour)"],
        "xs-distance-rate",
        "mm/hour",
        { "mm/hour": 1, "in/hour": 2 }
      );
      const duration = Number.isFinite(event.duration)
        ? event.duration.toFixed(2)
        : Number.isFinite(event.dur)
        ? event.dur.toFixed(2)
        : "—";
      const date = `${event.month}/${event.day}/${event.year}`;
      const rankLabel = returnIntervalLabel
        ? `${event.runoff_rank}<span class="block text-xs text-muted-foreground">${returnIntervalLabel}</span>`
        : String(event.runoff_rank);

      const tr = document.createElement("tr");
      tr.className = "border-t border-border";
      tr.innerHTML = `
        <td class="px-3 py-2">${rankLabel}</td>
        <td class="px-3 py-2 text-right">${runoffMeta.value}</td>
        <td class="px-3 py-2 text-right">${precipMeta.value}</td>
        <td class="px-3 py-2 text-right">${duration}</td>
        <td class="px-3 py-2 text-right">${peak10.value}</td>
        <td class="px-3 py-2 text-right">${peak30.value}</td>
        <td class="px-3 py-2">${date}</td>
      `;
      rainfallBody.appendChild(tr);
    });
  }

  function buildExceedanceSeries(response) {
    const sedResults = Array.isArray(response?.sed_results)
      ? response.sed_results
      : [];
    const probabilities = response?.probabilities || {};
    const treatmentKey = "untreated";
    const treatmentProbs = probabilities[treatmentKey] || [];

    const series = [];
    for (let yearIndex = 0; yearIndex < 5; yearIndex += 1) {
      const probList = treatmentProbs[yearIndex] || [];
      const values = [];
      sedResults.forEach((event, idx) => {
        const prob = probList[idx + 1];
        if (!Number.isFinite(prob)) return;
        const meta = formatSurfaceDensity(event.sed_del_kg_m2);
        if (!Number.isFinite(meta.numeric)) return;
        values.push({ x: meta.numeric, y: prob * 100 });
      });
      if (values.length) {
        series.push({
          id: `year-${yearIndex + 1}`,
          label: ordinalSuffix(yearIndex + 1),
          values,
        });
      }
    }

    const unitLabel = resolveUnitMeta("surface-density", "tonne/ha").label;
    return {
      data: { series },
      xLabel: `Sediment Delivery (${unitLabel})`,
      unitLabel,
    };
  }

  function formatExceedanceTooltip(hit) {
    const index = hit?.index;
    const series = exceedanceChart.chart.series.filter((item) => !item.hidden);
    if (index == null || !series.length) return "";

    const unitLabel = resolveUnitMeta("surface-density", "tonne/ha").label;
    const xValue = series[0]?.values?.[index]?.x;
    const xText = Number.isFinite(xValue) ? xValue.toFixed(2) : "—";
    const title = `Sediment Delivery: ${xText} ${unitLabel}`.trim();

    const lines = series
      .map((item) => {
        const point = item.values[index];
        const yText =
          point && Number.isFinite(point.y) ? `${point.y.toFixed(1)}%` : "—";
        return `<div style="display:flex;gap:6px;align-items:center;">
          <span style="display:inline-block;width:8px;height:8px;border-radius:999px;background:${item.color};"></span>
          <span>${item.label}: ${yText}</span>
        </div>`;
      })
      .join("");

    return `<div style="font-weight:600;margin-bottom:4px;">${title}</div>${lines}`;
  }

  function renderSedimentTable(response, targetPercent) {
    const sedResults = Array.isArray(response?.sed_results)
      ? response.sed_results
      : [];
    const probabilities = response?.probabilities || {};
    const target = Number(targetPercent) / 100;
    const unitLabel = resolveUnitMeta("surface-density", "tonne/ha").label;
    sedimentYearHeaders.forEach((header, index) => {
      if (!header) return;
      header.textContent = `Year ${index + 1} (${unitLabel})`;
    });

    const treatments = state.burn_severity === "Unburned"
      ? [
          { key: "untreated", label: "Unburned" },
        ]
      : [
          { key: "untreated", label: "Untreated" },
          { key: "seeding", label: "Seeding" },
          { key: "mulching_47", label: "Mulch 47% cover" },
          { key: "mulching_72", label: "Mulch 72% cover" },
          { key: "mulching_89", label: "Mulch 89% cover" },
          { key: "mulching_94", label: "Mulch 94% cover" },
        ];

    sedimentBody.innerHTML = "";

    const findSedimentAtProb = (probList) => {
      if (!Array.isArray(probList) || probList.length < 2) return null;
      for (let i = 1; i < probList.length; i += 1) {
        if (probList[i] >= target) {
          return sedResults[i - 1]?.sed_del_kg_m2 ?? null;
        }
      }
      return null;
    };

    const untreatedByYear = [];

    treatments.forEach((treatment) => {
      const row = document.createElement("tr");
      row.className = "border-t border-border";
      const cells = [`<td class="px-3 py-2 font-medium">${treatment.label}</td>`];

      const yearly = probabilities[treatment.key] || [];
      for (let yearIndex = 0; yearIndex < 5; yearIndex += 1) {
        const sedValue = findSedimentAtProb(yearly[yearIndex]);
        if (treatment.key === "untreated") {
          untreatedByYear[yearIndex] = sedValue;
        }
        const meta = formatSurfaceDensity(sedValue);
        cells.push(
          `<td class="px-3 py-2 text-right">${meta.value}</td>`
        );
      }
      row.innerHTML = cells.join("");
      sedimentBody.appendChild(row);
    });

    if (state.burn_severity !== "Unburned") {
      const bounds = getLogWattleBounds();
      const distanceLabel = resolveUnitMeta("sm-distance", "m").label;
      const defaultDiameter = bounds.diameter.default;
      const defaultSpacing = bounds.spacing.default;
      const diameterValue = logsWattlesState.userSet
        ? logsWattlesState.diameter_m
        : defaultDiameter;
      const spacingValue = logsWattlesState.userSet
        ? logsWattlesState.spacing_m
        : defaultSpacing;
      logsWattlesState.diameter_m = clampValue(
        diameterValue,
        bounds.diameter.min,
        bounds.diameter.max,
        defaultDiameter
      );
      logsWattlesState.spacing_m = clampValue(
        spacingValue,
        bounds.spacing.min,
        bounds.spacing.max,
        defaultSpacing
      );

      const i10Weighted = computeWeightedI10(response?.ebe_events);
      const treatedValues = computeLogWattleSediments({
        untreatedKgM2: untreatedByYear,
        diameter_m: logsWattlesState.diameter_m,
        spacing_m: logsWattlesState.spacing_m,
        slope_pct: state.middle_slope_pct,
        soil_texture: state.soil_texture,
        i10: i10Weighted,
        spacingMin_m: bounds.spacing.min,
      });

      const logsRow = document.createElement("tr");
      logsRow.className = "border-t border-border";
      const logsCell = document.createElement("td");
      logsCell.className = "px-3 py-2 font-medium";
      logsCell.textContent = "Logs & Wattles";

      const inputWrap = document.createElement("div");
      inputWrap.className = "mt-2 grid gap-3";
      const diameterField = createFormField({
        id: "ermit_logs_diameter",
        label: "Diameter",
        type: "number",
        value: "",
        unitLabel: distanceLabel,
      });
      const spacingField = createFormField({
        id: "ermit_logs_spacing",
        label: "Spacing",
        type: "number",
        value: "",
        unitLabel: distanceLabel,
      });
      diameterField.input.setAttribute("data-unitizer-category", "sm-distance");
      diameterField.input.setAttribute("data-unitizer-unit", "m");
      spacingField.input.setAttribute("data-unitizer-category", "sm-distance");
      spacingField.input.setAttribute("data-unitizer-unit", "m");
      attachUnitLabel(diameterField, "sm-distance", "m");
      attachUnitLabel(spacingField, "sm-distance", "m");
      setFieldValue(diameterField.input, logsWattlesState.diameter_m);
      setFieldValue(spacingField.input, logsWattlesState.spacing_m);
      diameterField.input.addEventListener("change", () => {
        const boundsNext = getLogWattleBounds();
        const updated = clampValue(
          readCanonicalFromInput(diameterField.input, "sm-distance", "m"),
          boundsNext.diameter.min,
          boundsNext.diameter.max,
          boundsNext.diameter.default
        );
        logsWattlesState.diameter_m = updated;
        logsWattlesState.userSet = true;
        setFieldValue(diameterField.input, updated);
        if (lastResults) renderSedimentTable(lastResults, probInput.value);
      });
      spacingField.input.addEventListener("change", () => {
        const boundsNext = getLogWattleBounds();
        const updated = clampValue(
          readCanonicalFromInput(spacingField.input, "sm-distance", "m"),
          boundsNext.spacing.min,
          boundsNext.spacing.max,
          boundsNext.spacing.default
        );
        logsWattlesState.spacing_m = updated;
        logsWattlesState.userSet = true;
        setFieldValue(spacingField.input, updated);
        if (lastResults) renderSedimentTable(lastResults, probInput.value);
      });
      inputWrap.appendChild(diameterField.wrapper);
      inputWrap.appendChild(spacingField.wrapper);
      logsCell.appendChild(inputWrap);

      logsRow.appendChild(logsCell);
      for (let i = 0; i < 5; i += 1) {
        const td = document.createElement("td");
        td.className = "px-3 py-2 text-right";
        const treated = treatedValues[i];
        const meta = formatSurfaceDensity(treated);
        td.textContent = meta.value;
        logsRow.appendChild(td);
      }
      sedimentBody.appendChild(logsRow);

      const client = getUnitizerClient();
      if (client) {
        client.registerNumericInputs(logsRow);
        client.updateNumericFields(logsRow);
        client.updateUnitLabels(logsRow);
      }
    }
  }

  function renderResults(response, years) {
    const summary = response?.summary || {};
    const annual = summary.annual_averages || summary;
    renderInputSummary(lastRunState, lastClimateState);
    renderAnnualAverages(annual, years);
    renderRainfallEvents(response?.ebe_events);
    const seriesMeta = buildExceedanceSeries(response);
    exceedanceChart.setData(seriesMeta.data);
    if (seriesMeta.xLabel) {
      exceedanceChart.chart.options.xAxis = {
        ...(exceedanceChart.chart.options.xAxis || {}),
        label: seriesMeta.xLabel,
      };
      exceedanceChart.chart.options.yAxis = {
        ...(exceedanceChart.chart.options.yAxis || {}),
        label: "Probability (%)",
        domain: [0, 100],
      };
      exceedanceChart.chart.formatTooltip = formatExceedanceTooltip;
      exceedanceChart.chart.hitTest = function hitExceedance(point) {
        if (!this._xScale || !Array.isArray(this.xValues) || !this.xValues.length) {
          return null;
        }
        let bestIndex = null;
        let bestDistance = Infinity;
        this.xValues.forEach((value, index) => {
          const scaledValue =
            this._xIsNumeric && value instanceof Date ? value.getTime() : value;
          const xValue = this._xScale(scaledValue);
          if (!Number.isFinite(xValue)) return;
          const distance = Math.abs(point.x - xValue);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = index;
          }
        });
        if (bestIndex === null) return null;
        const hoverX = this._xScale(
          this._xIsNumeric && this.xValues[bestIndex] instanceof Date
            ? this.xValues[bestIndex].getTime()
            : this.xValues[bestIndex]
        );
        return { index: bestIndex, x: hoverX, y: point.y };
      };
      exceedanceChart.chart.render();
    }
    renderSedimentTable(response, probInput.value);
  }

  function updateResultsUnits() {
    if (!lastResults || !lastYears) return;
    renderResults(lastResults, lastYears);
    const client = getUnitizerClient();
    if (client) {
      client.registerNumericInputs(resultsSection);
      client.updateNumericFields(resultsSection);
      client.updateUnitLabels(resultsSection);
    }
  }

  async function handleRun() {
    clearErrorDetails();
    const climateState = readClimateState();
    if (!climateState.par_id) {
      runButton.setState(
        "error",
        "Retry",
        "Select a climate station in Rock Climate Control."
      );
      return;
    }
    if (climateState.use_prism && !climateState.location) {
      runButton.setState(
        "error",
        "Retry",
        "PRISM mode requires a location. Set latitude and longitude first."
      );
      return;
    }

    if (!validateAll()) {
      runButton.setState("error", "Retry", "Fix validation errors and retry.");
      return;
    }

    runButton.setState("running", "Running...");
    setFormDisabled(true);

    const payload = {
      climate: {
        database: climateState.database,
        par_id: climateState.par_id,
        input_years: Math.round(Number(state.simulation_years)),
        cligen_version: climateState.cligen_version,
        location: climateState.location,
        use_prism: climateState.use_prism,
        user_defined_par_mod: climateState.user_defined_par_mod,
      },
      ermit_pars: {
        top_slope_pct: state.top_slope_pct,
        middle_slope_pct: state.middle_slope_pct,
        bottom_slope_pct: state.bottom_slope_pct,
        length_m: state.length_m,
        soil_texture: state.soil_texture,
        rfg_pct: state.rfg_pct,
        vegetation_type: state.vegetation_type,
        burn_severity: state.burn_severity,
        user_shrub_pct:
          state.vegetation_type === "Forest" ? null : state.user_shrub_pct,
        user_grass_pct:
          state.vegetation_type === "Forest" ? null : state.user_grass_pct,
        user_bare_pct:
          state.vegetation_type === "Forest" ? null : state.user_bare_pct,
      },
      wepp_version: state.wepp_version,
    };

    try {
      const response = await apiPost("/api/ermit/RUN/wepp", payload, {
        timeoutMs: 60000,
      });
      lastResults = response;
      lastYears = payload.climate.input_years;
      lastRunState = { ...state };
      lastClimateState = { ...climateState };
      resultsSection.style.display = "";
      renderResults(response, lastYears);
      configureFileSections(state, payload);
      runButton.setState("success", "Completed");
    } catch (error) {
      let message = "Unable to run ERMiT. Please try again.";
      let detail = error?.body || error?.message || null;
      if (error?.status === 400) {
        message = "Check inputs and try again.";
      } else if (error?.name === "AbortError") {
        message = "Request timed out. The server may be busy.";
        detail = "Try reducing simulation years if the problem persists.";
      }

      if (detail && typeof detail !== "string") {
        try {
          detail = JSON.stringify(detail, null, 2);
        } catch {
          detail = String(detail);
        }
      }

      runButton.setState("error", "Retry", message);
      showErrorDetails(detail);
      console.error("[ermit] run failed", error);
      lastFilePayload = null;
      fileSections.forEach((entry) => {
        entry.ui.setStatus("Run the model to generate files.");
        entry.ui.clearText();
      });
    } finally {
      setFormDisabled(false);
    }
  }

  probInput.addEventListener("input", () => {
    if (!lastResults) return;
    const value = Number(probInput.value);
    if (!Number.isFinite(value)) return;
    if (value < 1) probInput.value = "1";
    if (value > 99) probInput.value = "99";
    renderSedimentTable(lastResults, probInput.value);
  });

  runButton.button.addEventListener("click", handleRun);

  container.appendChild(form);
  container.appendChild(resultsSection);
  root.appendChild(container);

  if (window.UnitizerClient?.ready) {
    window.UnitizerClient.ready().then((client) => {
      client.registerNumericInputs(root);
      client.updateNumericFields(root);
      client.updateUnitLabels(root);
      updateResultsUnits();
    });
  }

  document.addEventListener("unitizer:preferences-changed", updateResultsUnits);
}
