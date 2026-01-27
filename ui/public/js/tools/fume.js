import { createFormField, createSelectField } from "../components/form-field.js";
import { createRunButton } from "../components/run-button.js";
import { createSimulationOptions } from "../components/simulation-options.js";
import { createDataTable } from "../components/data-table.js";
import { createAlert } from "../components/alert.js";
import { createCollapsibleSection } from "../components/collapsible.js";
import { createPreformattedBlock } from "../components/preformatted.js";
import { apiPost } from "../utils/api-client.js";
import { readClimateState } from "../core/rockclim-state.js";
import { readFumeState, writeFumeState } from "../core/fume-state.js";

const FT_TO_M = 0.3048;
const BUFFER_DELTA_M = 0.1 * FT_TO_M;
const TOTAL_LENGTH_MIN_M = 1.1 * FT_TO_M;
const TOTAL_LENGTH_MAX_M = 1500 * FT_TO_M;
const BUFFER_LENGTH_MIN_M = 1.0 * FT_TO_M;
const BUFFER_LENGTH_MAX_M = 1000 * FT_TO_M;
const SLOPE_MIN_PCT = 0.5;
const SLOPE_MAX_PCT = 90;
const ROAD_DENSITY_MAX_KM_PER_KM2 = 20 / 1.609344;
const ROAD_DENSITY_SKIP_THRESHOLD_KM_PER_KM2 = 0.001 / 1.609344;

const SOIL_OPTIONS = [
  { value: "clay", label: "Clay loam" },
  { value: "silt", label: "Silt loam" },
  { value: "sand", label: "Sandy loam" },
  { value: "loam", label: "Loam" },
];

const DISTURBED_SCENARIOS = [
  { id: "undisturbed", label: "Undisturbed forest" },
  { id: "thinned", label: "Thinned forest" },
  { id: "prescribed_fire", label: "Prescribed burn" },
  { id: "wildfire", label: "Wildfire" },
  { id: "lower_thinning", label: "Lower thinning" },
  { id: "higher_rx_fire", label: "Higher Rx fire" },
  { id: "lower_rx_fire", label: "Lower Rx fire" },
  { id: "moderate_wildfire", label: "Moderate wildfire" },
  { id: "low_wildfire", label: "Low wildfire" },
];

const ROAD_SCENARIOS = [
  { id: "no_traffic", label: "No traffic" },
  { id: "low_traffic", label: "Low traffic" },
  { id: "high_traffic", label: "High traffic" },
];

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
  if (override === "english") {
    if (categoryKey === "sm-distance") unitKey = "ft";
    if (categoryKey === "surface-density") unitKey = "ton/acre";
    if (categoryKey === "surface-density-annual") unitKey = "ton/acre/yr";
    if (categoryKey === "road-density") unitKey = "mi/mi^2";
  } else if (override === "metric") {
    if (categoryKey === "sm-distance") unitKey = "m";
    if (categoryKey === "surface-density") unitKey = "tonne/ha";
    if (categoryKey === "surface-density-annual") unitKey = "tonne/ha/yr";
    if (categoryKey === "road-density") unitKey = "km/km^2";
  } else if (client) {
    const prefs = client.getPreferencePayload?.() || {};
    unitKey = prefs[categoryKey] || canonicalUnit;
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

function formatSurfaceDensity(valueKgM2, { annual = false } = {}) {
  const categoryKey = annual ? "surface-density-annual" : "surface-density";
  const canonicalUnit = annual ? "tonne/ha/yr" : "tonne/ha";
  const canonicalValue = Number(valueKgM2) * 10;
  const client = getUnitizerClient();
  const meta = resolveUnitMeta(categoryKey, canonicalUnit);
  let converted = canonicalValue;
  if (client && meta.unitKey !== canonicalUnit) {
    try {
      converted = client.convert(canonicalValue, canonicalUnit, meta.unitKey);
    } catch {
      converted = canonicalValue;
    }
  } else if (!client && meta.unitKey !== canonicalUnit) {
    if (meta.unitKey === "ton/acre") {
      converted = canonicalValue * 0.44609;
    }
  }
  if (!Number.isFinite(valueKgM2)) {
    return { value: "—", unit: meta.label };
  }
  return {
    value: Number(converted).toFixed(meta.precision),
    unit: meta.label,
  };
}

function formatSurfaceDensityRange(range, { annual = false } = {}) {
  if (!range || range.min == null || range.max == null) return "—";
  const min = formatSurfaceDensity(range.min, { annual });
  const max = formatSurfaceDensity(range.max, { annual });
  return `${min.value} to ${max.value}`;
}

function formatDistance(valueM) {
  const categoryKey = "sm-distance";
  const canonicalUnit = "m";
  const client = getUnitizerClient();
  const meta = resolveUnitMeta(categoryKey, canonicalUnit);
  let converted = valueM;
  if (client && meta.unitKey !== canonicalUnit) {
    try {
      converted = client.convert(valueM, canonicalUnit, meta.unitKey);
    } catch {
      converted = valueM;
    }
  } else if (!client && meta.unitKey === "ft") {
    converted = valueM * 3.28084;
  }
  if (!Number.isFinite(valueM)) return "—";
  return Number(converted).toFixed(meta.precision);
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

function normalizeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function readCanonical(input) {
  const stored = input.dataset.unitizerCanonicalValue;
  if (stored != null && stored !== "") {
    const parsed = Number(stored);
    if (Number.isFinite(parsed)) return parsed;
  }
  return normalizeNumber(input.value);
}

function setFieldValue(input, value) {
  if (!Number.isFinite(value)) return;
  input.value = String(value);
  input.dataset.unitizerCanonicalValue = String(value);
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

  return { validate };
}

function attachNumberValidator(field, options) {
  const { input, setError, setValid } = field;
  const { min, max, label, integer } = options;
  let touched = false;
  let timer = null;

  const validate = () => {
    const value = normalizeNumber(input.value);
    if (!Number.isFinite(value)) {
      setError(`${label} must be a number.`);
      return false;
    }
    if (integer && !Number.isInteger(value)) {
      setError(`${label} must be a whole number.`);
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

  return { validate };
}

export function mountFumeTool(root) {
  if (!root) return;

  let state = readFumeState();
  let lastResults = null;
  let lastPayload = null;
  let lastYears = null;

  const container = document.createElement("div");
  container.className = "space-y-8";

  const form = document.createElement("form");
  form.className = "space-y-8";
  form.addEventListener("submit", (event) => event.preventDefault());

  const soilSection = createSection("Soil & Road Context");
  const soilGrid = document.createElement("div");
  soilGrid.className = "grid gap-4 md:grid-cols-2";
  const soilField = createSelectField({
    id: "fume_soil_texture",
    label: "Soil Texture",
    options: SOIL_OPTIONS,
  });
  soilField.select.value = state.soil_texture;
  soilField.select.addEventListener("change", () => {
    state.soil_texture = soilField.select.value;
    writeFumeState(state);
  });

  const roadDensityField = createFormField({
    id: "fume_road_density",
    label: "Road density",
    type: "number",
    value: String(state.road_density_km_per_km2),
    unitLabel: "km/km^2",
  });
  roadDensityField.input.step = "0.001";
  roadDensityField.input.setAttribute("data-unitizer-category", "road-density");
  roadDensityField.input.setAttribute("data-unitizer-unit", "km/km^2");
  setFieldValue(roadDensityField.input, state.road_density_km_per_km2);
  attachUnitLabel(roadDensityField, "road-density", "km/km^2");
  roadDensityField.input.addEventListener("input", () => {
    const value = readCanonical(roadDensityField.input);
    if (value != null) {
      state.road_density_km_per_km2 = value;
      writeFumeState(state);
    }
  });
  const roadDensityValidator = attachCanonicalValidator(roadDensityField, {
    min: 0,
    max: Number(ROAD_DENSITY_MAX_KM_PER_KM2.toFixed(4)),
    label: "Road density",
  });

  soilGrid.appendChild(soilField.wrapper);
  soilGrid.appendChild(roadDensityField.wrapper);
  soilSection.appendChild(soilGrid);

  const geometrySection = createSection("Hillslope Geometry");
  const geometryGrid = document.createElement("div");
  geometryGrid.className = "grid gap-4 md:grid-cols-2";

  const totalLengthField = createFormField({
    id: "fume_total_length",
    label: "Total hillslope length",
    type: "number",
    value: String(state.total_length_m),
    unitLabel: "m",
  });
  totalLengthField.input.step = "0.01";
  totalLengthField.input.setAttribute("data-unitizer-category", "sm-distance");
  totalLengthField.input.setAttribute("data-unitizer-unit", "m");
  setFieldValue(totalLengthField.input, state.total_length_m);
  attachUnitLabel(totalLengthField, "sm-distance", "m");

  const bufferLengthField = createFormField({
    id: "fume_buffer_length",
    label: "Buffer length",
    type: "number",
    value: String(state.buffer_length_m),
    unitLabel: "m",
  });
  bufferLengthField.input.step = "0.01";
  bufferLengthField.input.setAttribute("data-unitizer-category", "sm-distance");
  bufferLengthField.input.setAttribute("data-unitizer-unit", "m");
  setFieldValue(bufferLengthField.input, state.buffer_length_m);
  attachUnitLabel(bufferLengthField, "sm-distance", "m");

  const treatedLengthField = createFormField({
    id: "fume_treated_length",
    label: "Treated hillslope length",
    type: "number",
    value: String(state.total_length_m - state.buffer_length_m),
    unitLabel: "m",
  });
  treatedLengthField.input.readOnly = true;
  treatedLengthField.input.classList.add("bg-muted/30");
  treatedLengthField.input.setAttribute("data-unitizer-category", "sm-distance");
  treatedLengthField.input.setAttribute("data-unitizer-unit", "m");
  setFieldValue(
    treatedLengthField.input,
    state.total_length_m - state.buffer_length_m
  );
  attachUnitLabel(treatedLengthField, "sm-distance", "m");

  function updateDerivedLength() {
    const total = readCanonical(totalLengthField.input);
    const buffer = readCanonical(bufferLengthField.input);
    if (!Number.isFinite(total) || !Number.isFinite(buffer)) return;
    const treated = Math.max(0, total - buffer);
    setFieldValue(treatedLengthField.input, treated);
  }

  function coerceBufferAndTotal() {
    let total = readCanonical(totalLengthField.input);
    let buffer = readCanonical(bufferLengthField.input);
    if (!Number.isFinite(total) || !Number.isFinite(buffer)) return;
    if (buffer >= total) {
      buffer = total - BUFFER_DELTA_M;
      if (buffer < BUFFER_LENGTH_MIN_M) {
        buffer = BUFFER_LENGTH_MIN_M;
        const minTotal = buffer + BUFFER_DELTA_M;
        if (total <= buffer) {
          total = Math.min(minTotal, TOTAL_LENGTH_MAX_M);
        }
      }
      setFieldValue(totalLengthField.input, total);
      setFieldValue(bufferLengthField.input, buffer);
      state.total_length_m = total;
      state.buffer_length_m = buffer;
      writeFumeState(state);
    }
    updateDerivedLength();
  }

  totalLengthField.input.addEventListener("input", () => {
    const value = readCanonical(totalLengthField.input);
    if (value != null) {
      state.total_length_m = value;
      writeFumeState(state);
      updateDerivedLength();
    }
  });
  totalLengthField.input.addEventListener("blur", coerceBufferAndTotal);

  bufferLengthField.input.addEventListener("input", () => {
    const value = readCanonical(bufferLengthField.input);
    if (value != null) {
      state.buffer_length_m = value;
      writeFumeState(state);
      updateDerivedLength();
    }
  });
  bufferLengthField.input.addEventListener("blur", coerceBufferAndTotal);

  const totalLengthValidator = attachCanonicalValidator(totalLengthField, {
    min: Number(TOTAL_LENGTH_MIN_M.toFixed(4)),
    max: Number(TOTAL_LENGTH_MAX_M.toFixed(1)),
    label: "Total hillslope length",
  });
  const bufferLengthValidator = attachCanonicalValidator(bufferLengthField, {
    min: Number(BUFFER_LENGTH_MIN_M.toFixed(4)),
    max: Number(BUFFER_LENGTH_MAX_M.toFixed(1)),
    label: "Buffer length",
  });

  geometryGrid.appendChild(totalLengthField.wrapper);
  geometryGrid.appendChild(bufferLengthField.wrapper);
  geometryGrid.appendChild(treatedLengthField.wrapper);

  const slopeGrid = document.createElement("div");
  slopeGrid.className = "grid gap-4 md:grid-cols-3";
  const topSlopeField = createFormField({
    id: "fume_top_slope",
    label: "Top slope",
    type: "number",
    value: String(state.top_slope_pct),
    unitLabel: "%",
  });
  const midSlopeField = createFormField({
    id: "fume_mid_slope",
    label: "Middle slope",
    type: "number",
    value: String(state.mid_slope_pct),
    unitLabel: "%",
  });
  const bottomSlopeField = createFormField({
    id: "fume_bottom_slope",
    label: "Bottom slope",
    type: "number",
    value: String(state.bottom_slope_pct),
    unitLabel: "%",
  });

  const slopeWarning = createAlert({
    variant: "warning",
    title: "Steep slope warning",
    message: "Hillslopes with greater than 50% gradient may be prone to mass failure.",
  });
  slopeWarning.classList.add("hidden");

  function updateSlopeWarning() {
    const top = normalizeNumber(topSlopeField.input.value);
    const mid = normalizeNumber(midSlopeField.input.value);
    const bottom = normalizeNumber(bottomSlopeField.input.value);
    const show =
      (Number.isFinite(top) && top > 50) ||
      (Number.isFinite(mid) && mid > 50) ||
      (Number.isFinite(bottom) && bottom > 50);
    slopeWarning.classList.toggle("hidden", !show);
  }

  [topSlopeField, midSlopeField, bottomSlopeField].forEach((field, index) => {
    field.input.step = "0.1";
    field.input.addEventListener("input", () => {
      const value = normalizeNumber(field.input.value);
      if (value != null) {
        if (index === 0) state.top_slope_pct = value;
        if (index === 1) state.mid_slope_pct = value;
        if (index === 2) state.bottom_slope_pct = value;
        writeFumeState(state);
      }
      updateSlopeWarning();
    });
  });

  const slopeValidators = [
    attachNumberValidator(topSlopeField, {
      min: SLOPE_MIN_PCT,
      max: SLOPE_MAX_PCT,
      label: "Top slope",
    }),
    attachNumberValidator(midSlopeField, {
      min: SLOPE_MIN_PCT,
      max: SLOPE_MAX_PCT,
      label: "Middle slope",
    }),
    attachNumberValidator(bottomSlopeField, {
      min: SLOPE_MIN_PCT,
      max: SLOPE_MAX_PCT,
      label: "Bottom slope",
    }),
  ];

  slopeGrid.appendChild(topSlopeField.wrapper);
  slopeGrid.appendChild(midSlopeField.wrapper);
  slopeGrid.appendChild(bottomSlopeField.wrapper);

  geometrySection.appendChild(geometryGrid);
  geometrySection.appendChild(slopeGrid);
  geometrySection.appendChild(slopeWarning);

  const cycleSection = createSection("Disturbance Return Periods");
  const cycleGrid = document.createElement("div");
  cycleGrid.className = "grid gap-4 md:grid-cols-3";
  const wildfireField = createFormField({
    id: "fume_wildfire_cycle",
    label: "Wildfire cycle",
    type: "number",
    value: String(state.wildfire_cycle_years),
    unitLabel: "years",
  });
  const rxField = createFormField({
    id: "fume_rx_cycle",
    label: "Prescribed fire cycle",
    type: "number",
    value: String(state.rx_fire_cycle_years),
    unitLabel: "years",
  });
  const thinningField = createFormField({
    id: "fume_thinning_cycle",
    label: "Thinning cycle",
    type: "number",
    value: String(state.thinning_cycle_years),
    unitLabel: "years",
  });

  wildfireField.input.step = "1";
  rxField.input.step = "1";
  thinningField.input.step = "1";

  wildfireField.input.addEventListener("input", () => {
    const value = normalizeNumber(wildfireField.input.value);
    if (value != null) {
      state.wildfire_cycle_years = value;
      writeFumeState(state);
    }
  });
  rxField.input.addEventListener("input", () => {
    const value = normalizeNumber(rxField.input.value);
    if (value != null) {
      state.rx_fire_cycle_years = value;
      writeFumeState(state);
    }
  });
  thinningField.input.addEventListener("input", () => {
    const value = normalizeNumber(thinningField.input.value);
    if (value != null) {
      state.thinning_cycle_years = value;
      writeFumeState(state);
    }
  });

  const wildfireValidator = attachNumberValidator(wildfireField, {
    min: 1,
    max: 400,
    label: "Wildfire cycle",
    integer: true,
  });
  const rxValidator = attachNumberValidator(rxField, {
    min: 1,
    max: 200,
    label: "Prescribed fire cycle",
    integer: true,
  });
  const thinningValidator = attachNumberValidator(thinningField, {
    min: 1,
    max: 200,
    label: "Thinning cycle",
    integer: true,
  });

  cycleGrid.appendChild(wildfireField.wrapper);
  cycleGrid.appendChild(rxField.wrapper);
  cycleGrid.appendChild(thinningField.wrapper);
  cycleSection.appendChild(cycleGrid);

  const simulationSection = createSimulationOptions({
    id: "fume_sim_years",
    value: String(state.simulation_years),
    onInput: (input) => {
      const canonical = readCanonical(input);
      if (canonical != null) {
        state.simulation_years = canonical;
        writeFumeState(state);
      }
    },
    weppVersion: {
      id: "fume_wepp_version",
      label: "WEPP Version",
      options: [
        { value: "wepp2010", label: "WEPP 2010" },
        { value: "wepp_dcc52a6_hill", label: "WEPP dcc52a6 hill" },
      ],
      value: state.wepp_version,
      onInput: (select) => {
        state.wepp_version = select.value;
        writeFumeState(state);
      },
    },
  });
  const simYearsValidator = attachCanonicalValidator(simulationSection.field, {
    min: 1,
    max: 100,
    label: "Simulation years",
  });

  const runSection = document.createElement("div");
  runSection.className = "space-y-3";
  const runButton = createRunButton({ label: "Run FuME Model" });
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

  form.appendChild(soilSection);
  form.appendChild(geometrySection);
  form.appendChild(cycleSection);
  form.appendChild(simulationSection.wrapper);
  form.appendChild(runSection);

  const resultsSection = createSection("Results");
  resultsSection.id = "fume-results";
  resultsSection.style.display = "none";

  const warningsContainer = document.createElement("div");
  warningsContainer.className = "space-y-2";
  const summaryContainer = document.createElement("div");
  summaryContainer.className = "space-y-3";
  const narrativeContainer = document.createElement("div");
  narrativeContainer.className = "space-y-3 text-sm text-muted-foreground";
  const detailContainer = document.createElement("div");
  detailContainer.className = "space-y-6";
  const filesContainer = document.createElement("div");
  filesContainer.className = "space-y-4";

  resultsSection.appendChild(warningsContainer);
  resultsSection.appendChild(summaryContainer);
  resultsSection.appendChild(narrativeContainer);
  resultsSection.appendChild(detailContainer);
  resultsSection.appendChild(filesContainer);

  container.appendChild(form);
  container.appendChild(resultsSection);
  root.appendChild(container);

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

  function setFormDisabled(disabled) {
    const fields = form.querySelectorAll("input, select, button");
    fields.forEach((el) => {
      if (el === runButton.button) return;
      el.disabled = disabled;
    });
  }

  function validateAll() {
    const validators = [
      totalLengthValidator,
      bufferLengthValidator,
      roadDensityValidator,
      ...slopeValidators,
      wildfireValidator,
      rxValidator,
      thinningValidator,
      simYearsValidator,
    ];
    return validators.every((validator) => {
      if (validator && typeof validator.validate === "function") {
        return validator.validate();
      }
      return true;
    });
  }

  function renderWarnings(warnings) {
    warningsContainer.innerHTML = "";
    if (!warnings || warnings.length === 0) return;
    warnings.forEach((message) => {
      warningsContainer.appendChild(
        createAlert({ variant: "warning", message })
      );
    });
  }

  function renderSummaryTable(payload, roadEnabled) {
    summaryContainer.innerHTML = "";
    const summary = payload.summary_table || [];
    const unitLabel = formatSurfaceDensity(0).unit;
    const annualUnitLabel = formatSurfaceDensity(0, { annual: true }).unit;

    const table = document.createElement("table");
    table.className =
      "min-w-full text-sm border border-border rounded-lg overflow-hidden";
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    [
      "Line",
      "Source",
      `Year of Disturbance (${unitLabel})`,
      "Return Period (yrs)",
      `Average Annual (${annualUnitLabel})`,
    ].forEach((label) => {
      const th = document.createElement("th");
      th.className = "text-left px-3 py-2 bg-muted";
      th.textContent = label;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    const tbody = document.createElement("tbody");

    summary.forEach((row) => {
      if (!roadEnabled && row.line >= 5) return;
      const tr = document.createElement("tr");
      tr.className = "border-t border-border";

      const cells = [];
      cells.push(row.line);
      cells.push(row.source);

      if (row.year_of_disturbance_range_kg_m2) {
        cells.push(
          formatSurfaceDensityRange(row.year_of_disturbance_range_kg_m2, {
            annual: false,
          })
        );
      } else if (row.year_of_disturbance_kg_m2 != null) {
        cells.push(
          formatSurfaceDensity(row.year_of_disturbance_kg_m2, {
            annual: false,
          }).value
        );
      } else {
        cells.push("—");
      }

      cells.push(row.return_period_years ?? "—");

      if (row.average_annual_range_kg_m2_yr) {
        cells.push(
          formatSurfaceDensityRange(row.average_annual_range_kg_m2_yr, {
            annual: true,
          })
        );
      } else if (row.average_annual_kg_m2_yr != null) {
        cells.push(
          formatSurfaceDensity(row.average_annual_kg_m2_yr, {
            annual: true,
          }).value
        );
      } else {
        cells.push("—");
      }

      cells.forEach((value) => {
        const td = document.createElement("td");
        td.className = "px-3 py-2";
        td.textContent = value ?? "—";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    const heading = document.createElement("h3");
    heading.className = "text-base font-semibold";
    heading.textContent = "Summary Table";
    summaryContainer.appendChild(heading);
    summaryContainer.appendChild(table);
  }

  function renderNarrative(payload, roadEnabled) {
    narrativeContainer.innerHTML = "";
    const analysis = payload.analysis || {};
    const annualUnitLabel = formatSurfaceDensity(0, { annual: true }).unit;

    const undisturbed = formatSurfaceDensity(analysis.undisturbed_kg_m2_yr, {
      annual: true,
    }).value;
    const wildfire = formatSurfaceDensity(analysis.wildfire_kg_m2_yr, {
      annual: true,
    }).value;
    const thinning = formatSurfaceDensity(analysis.thinning_kg_m2_yr, {
      annual: true,
    }).value;
    const prescribe = formatSurfaceDensity(analysis.prescribe_kg_m2_yr, {
      annual: true,
    }).value;

    const para1 = document.createElement("p");
    para1.textContent = `Background sedimentation combines undisturbed forest (${undisturbed} ${annualUnitLabel}) with wildfire (${wildfire} ${annualUnitLabel}).`;
    narrativeContainer.appendChild(para1);

    const para2 = document.createElement("p");
    para2.textContent = `Thinning contributes ${thinning} ${annualUnitLabel} and prescribed fire contributes ${prescribe} ${annualUnitLabel}.`;
    narrativeContainer.appendChild(para2);

    if (analysis.thin_over_back_pct != null) {
      const para3 = document.createElement("p");
      const thinPct =
        analysis.thin_over_back_pct === "N/A"
          ? "N/A"
          : `${analysis.thin_over_back_pct}%`;
      const rxPct =
        analysis.rx_over_back_pct === "N/A"
          ? "N/A"
          : `${analysis.rx_over_back_pct}%`;
      para3.textContent = `Relative to background (undisturbed + wildfire), thinning is ${thinPct} and prescribed fire is ${rxPct} above background.`;
      narrativeContainer.appendChild(para3);
    }

    if (roadEnabled) {
      const noRoadRange = formatSurfaceDensityRange(
        {
          min: analysis.no_road_min_kg_m2_yr,
          max: analysis.no_road_max_kg_m2_yr,
        },
        { annual: true }
      );
      const hiRoadRange = formatSurfaceDensityRange(
        {
          min: analysis.tr_road_min_kg_m2_yr,
          max: analysis.tr_road_max_kg_m2_yr,
        },
        { annual: true }
      );
      const para4 = document.createElement("p");
      para4.textContent = `Road sediment yields range from ${noRoadRange} ${annualUnitLabel} (low access) to ${hiRoadRange} ${annualUnitLabel} (high access), depending on traffic and connectivity.`;
      narrativeContainer.appendChild(para4);
    } else {
      const para4 = document.createElement("p");
      para4.textContent =
        "Road sedimentation is disabled because the specified road density is below the legacy threshold.";
      narrativeContainer.appendChild(para4);
    }
  }

  function renderDisturbedTable(payload) {
    const runs = payload.disturbed_runs || [];
    const lengthLabel = resolveUnitMeta("sm-distance", "m").label;
    const sedLabel = formatSurfaceDensity(0, { annual: true }).unit;

    const rows = runs.map((run) => ({
      scenario: run.label || run.scenario_id,
      treatments: `${run.upper_treatment} / ${run.lower_treatment}`,
      covers: `${run.upper_cover_pct}% / ${run.lower_cover_pct}%`,
      slope_length: formatDistance(run.slope_length_m),
      sediment_yield: formatSurfaceDensity(run.sediment_yield_kg_m2_yr, {
        annual: true,
      }).value,
    }));

    const table = createDataTable({
      columns: [
        { key: "scenario", label: "Scenario" },
        { key: "treatments", label: "Treatments (upper/lower)" },
        { key: "covers", label: "Cover (upper/lower)" },
        { key: "slope_length", label: `Slope Length (${lengthLabel})` },
        { key: "sediment_yield", label: `Sediment Yield (${sedLabel})` },
      ],
      rows,
      defaultPageSize: 10,
      filename: "fume_disturbed_runs.csv",
    });

    const wrapper = document.createElement("div");
    const heading = document.createElement("h3");
    heading.className = "text-base font-semibold";
    heading.textContent = "Disturbed WEPP Runs";
    wrapper.appendChild(heading);
    wrapper.appendChild(table);
    return wrapper;
  }

  function renderRoadTable(payload) {
    const runs = payload.wepproad_runs || [];
    const lengthLabel = resolveUnitMeta("sm-distance", "m").label;
    const sedLabel = formatSurfaceDensity(0, { annual: true }).unit;

    const rows = runs.map((run) => ({
      scenario: run.label || run.road_scenario_id,
      design: `${run.inputs?.design || ""} / ${run.inputs?.surface || ""} / ${
        run.inputs?.traffic || ""
      }`,
      road: `${formatDistance(run.inputs?.road_length_m)} x ${formatDistance(
        run.inputs?.road_width_m
      )}`,
      road_slope: run.inputs?.road_slope_pct ?? "—",
      fill: `${formatDistance(run.inputs?.fill_length_m)} @ ${
        run.inputs?.fill_slope_pct ?? "—"
      }%`,
      buffer: `${formatDistance(run.inputs?.buffer_length_m)} @ ${
        run.inputs?.buffer_slope_pct ?? "—"
      }%`,
      road_yield: formatSurfaceDensity(run.sediment_yield_road_kg_m2_yr, {
        annual: true,
      }).value,
      buffer_yield: formatSurfaceDensity(run.sediment_yield_buffer_kg_m2_yr, {
        annual: true,
      }).value,
    }));

    const table = createDataTable({
      columns: [
        { key: "scenario", label: "Scenario" },
        { key: "design", label: "Design / Surface / Traffic" },
        { key: "road", label: `Road L x W (${lengthLabel})` },
        { key: "road_slope", label: "Road Slope (%)" },
        { key: "fill", label: "Fill (length @ slope)" },
        { key: "buffer", label: "Buffer (length @ slope)" },
        { key: "road_yield", label: `Road Yield (${sedLabel})` },
        { key: "buffer_yield", label: `Buffer Yield (${sedLabel})` },
      ],
      rows,
      defaultPageSize: 10,
      filename: "fume_wepproad_runs.csv",
    });

    const wrapper = document.createElement("div");
    const heading = document.createElement("h3");
    heading.className = "text-base font-semibold";
    heading.textContent = "WEPP:Road Runs";
    wrapper.appendChild(heading);
    wrapper.appendChild(table);
    return wrapper;
  }

  function buildPayload({ scenarioKey, scenarioId } = {}) {
    const climateState = readClimateState();
    if (!climateState.par_id) {
      throw new Error("Select a climate station in Rock Climate Control.");
    }
    if (climateState.use_prism && !climateState.location) {
      throw new Error("PRISM mode requires a location. Set latitude and longitude first.");
    }

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
      fume_pars: {
        soil_texture: state.soil_texture,
        total_length_m: state.total_length_m,
        buffer_length_m: state.buffer_length_m,
        top_slope_pct: state.top_slope_pct,
        mid_slope_pct: state.mid_slope_pct,
        bottom_slope_pct: state.bottom_slope_pct,
        wildfire_cycle_years: state.wildfire_cycle_years,
        rx_fire_cycle_years: state.rx_fire_cycle_years,
        thinning_cycle_years: state.thinning_cycle_years,
        road_density_km_per_km2: state.road_density_km_per_km2,
      },
      wepp_version: state.wepp_version,
    };

    if (scenarioKey && scenarioId) {
      payload[scenarioKey] = scenarioId;
    }
    return payload;
  }

  function renderFilesSection() {
    filesContainer.innerHTML = "";

    function createFileSection({
      title,
      description,
      scenarioKey,
      scenarioOptions,
      buttons,
    }) {
      const content = document.createElement("div");
      content.className = "space-y-3";

      const controlRow = document.createElement("div");
      controlRow.className = "flex flex-wrap items-center gap-3";
      const scenarioSelect = document.createElement("select");
      scenarioSelect.className =
        "h-9 rounded-md border border-input bg-background px-2 text-sm";
      scenarioOptions.forEach((option) => {
        const opt = document.createElement("option");
        opt.value = option.id;
        opt.textContent = option.label;
        scenarioSelect.appendChild(opt);
      });

      const status = document.createElement("p");
      status.className = "text-sm text-muted-foreground";

      const download = document.createElement("a");
      download.className =
        "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium border border-border bg-background hover:bg-accent";
      download.textContent = "Download file";
      download.href = "#";
      download.setAttribute("aria-disabled", "true");
      download.addEventListener("click", (event) => {
        if (download.getAttribute("aria-disabled") === "true") {
          event.preventDefault();
        }
      });

      const actions = document.createElement("div");
      actions.className = "flex flex-wrap items-center gap-2";
      buttons.forEach((button) => actions.appendChild(button));

      controlRow.appendChild(scenarioSelect);
      controlRow.appendChild(actions);
      content.appendChild(controlRow);
      content.appendChild(status);
      content.appendChild(download);

      const preBlock = createPreformattedBlock({ className: "max-h-80 overflow-y-auto" });
      content.appendChild(preBlock.pre);

      const section = createCollapsibleSection({
        title,
        description,
        content,
        defaultOpen: false,
      });

      let blobUrl = "";
      function setDownloadEnabled(enabled, filename, text) {
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
        download.download = filename;
      }

      async function loadFile(endpoint, filename) {
        status.textContent = `Loading ${filename}...`;
        try {
          const payload = buildPayload({
            scenarioKey,
            scenarioId: scenarioSelect.value,
          });
          const text = await apiPost(endpoint, payload, { timeoutMs: 60000 });
          preBlock.setText(text || "");
          status.textContent = `Loaded ${filename}`;
          setDownloadEnabled(true, filename, text || "");
        } catch (error) {
          const detail = error?.body || error?.message || String(error);
          preBlock.setText(detail);
          status.textContent = "Unable to load file.";
          setDownloadEnabled(false, "", "");
        }
      }

      buttons.forEach((button) => {
        button.addEventListener("click", () => {
          const endpoint = button.dataset.endpoint;
          const filename = button.dataset.filename;
          if (endpoint && filename) {
            loadFile(endpoint, filename);
          }
        });
      });

      return section;
    }

    function fileButton(label, endpoint, filename) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.className =
        "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium border border-border bg-background hover:bg-accent";
      button.dataset.endpoint = endpoint;
      button.dataset.filename = filename;
      return button;
    }

    const disturbedButtons = [
      fileButton(
        "Soil file",
        "/api/fume/GET/disturbed/soil",
        "fume_disturbed.sol"
      ),
      fileButton(
        "Management file",
        "/api/fume/GET/disturbed/management",
        "fume_disturbed.man"
      ),
      fileButton(
        "Slope file",
        "/api/fume/GET/disturbed/slope",
        "fume_disturbed.slp"
      ),
      fileButton(
        "Run file",
        "/api/fume/GET/disturbed/run_file",
        "fume_disturbed.run"
      ),
      fileButton(
        "WEPP output",
        "/api/fume/GET/disturbed/wepp_output",
        "fume_disturbed.dat"
      ),
    ];

    const roadButtons = [
      fileButton(
        "Run file",
        "/api/fume/GET/wepproad/run_file",
        "fume_wepproad.run"
      ),
      fileButton(
        "WEPP output",
        "/api/fume/GET/wepproad/wepp_output",
        "fume_wepproad.dat"
      ),
    ];

    const disturbedSection = createFileSection({
      title: "Disturbed WEPP Files",
      description: "Generate input and output files for disturbed scenarios.",
      scenarioKey: "scenario_id",
      scenarioOptions: DISTURBED_SCENARIOS,
      buttons: disturbedButtons,
    });

    const roadSection = createFileSection({
      title: "WEPP:Road Files",
      description: "Generate input and output files for road scenarios.",
      scenarioKey: "road_scenario_id",
      scenarioOptions: ROAD_SCENARIOS,
      buttons: roadButtons,
    });

    filesContainer.appendChild(disturbedSection);
    filesContainer.appendChild(roadSection);
  }

  function renderResults(payload) {
    const roadDensity = payload?.inputs?.fume_pars?.road_density_km_per_km2;
    const roadEnabled =
      Number.isFinite(Number(roadDensity)) &&
      roadDensity >= ROAD_DENSITY_SKIP_THRESHOLD_KM_PER_KM2 &&
      roadDensity > 0;

    renderWarnings(payload.warnings);
    renderSummaryTable(payload, roadEnabled);
    renderNarrative(payload, roadEnabled);

    detailContainer.innerHTML = "";
    detailContainer.appendChild(renderDisturbedTable(payload));
    if (roadEnabled) {
      detailContainer.appendChild(renderRoadTable(payload));
    } else {
      const note = document.createElement("p");
      note.className = "text-sm text-muted-foreground";
      note.textContent =
        "Road density is below the legacy threshold; road results are omitted.";
      detailContainer.appendChild(note);
    }

    renderFilesSection();
  }

  async function handleRun() {
    clearErrorDetails();
    coerceBufferAndTotal();
    updateSlopeWarning();

    if (!validateAll()) {
      runButton.setState("error", "Retry", "Fix validation errors and retry.");
      return;
    }

    runButton.setState("running", "Running...");
    setFormDisabled(true);

    try {
      const payload = buildPayload();
      const response = await apiPost("/api/fume/RUN/wepp", payload, {
        timeoutMs: 60000,
      });
      lastResults = response;
      lastPayload = payload;
      lastYears = payload.climate.input_years;
      renderResults(response);
      resultsSection.style.display = "";
      runButton.setState("success", "Run complete");
      resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      let message = "An unexpected error occurred.";
      let detail = error?.body || error?.message || String(error);
      if (error?.status === 400) {
        message = "Invalid request parameters.";
      } else if (error?.status === 422) {
        message = "Unable to process this configuration.";
      } else if (error?.status === 500) {
        message = "Server error occurred. Please try again.";
      } else if (error?.status === 503) {
        message = "Service temporarily unavailable. Please try again shortly.";
      } else if (error?.name === "AbortError") {
        message = "Request timed out. Please try again.";
      }
      showErrorDetails(detail);
      runButton.setState("error", "Retry", message);
    } finally {
      setFormDisabled(false);
    }
  }

  runButton.button.addEventListener("click", handleRun);

  function updateResultsUnits() {
    if (!lastResults || !lastPayload) return;
    renderResults(lastResults);
  }

  document.addEventListener("unitizer:preferences-changed", updateResultsUnits);
}
