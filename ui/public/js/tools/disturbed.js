import { createFormField, createSelectField } from "../components/form-field.js";
import { createRunButton } from "../components/run-button.js";
import { createSoilProperties } from "../components/soil-properties.js";
import { createCollapsibleSection } from "../components/collapsible.js";
import { createAnnualAveragesTable } from "../components/annual-averages-table.js";
import { createPreformattedBlock } from "../components/preformatted.js";
import { createSimulationOptions } from "../components/simulation-options.js";
import { apiPost } from "../utils/api-client.js";
import { readClimateState } from "../core/rockclim-state.js";
import { readDisturbedState, writeDisturbedState } from "../core/disturbed-state.js";
import { createReturnPeriodTable } from "../components/return-period-table.js";
import { createOccurrenceProbabilities } from "../components/occurrence-probabilities.js";

const LANDUSE_OPTIONS = [
  { value: "OldForest", label: "Old Forest" },
  { value: "YoungForest", label: "Young Forest" },
  { value: "Shrub", label: "Shrub" },
  { value: "Bunchgrass", label: "Bunchgrass" },
  { value: "Sod", label: "Sod" },
  { value: "LowFire", label: "Low Severity Fire" },
  { value: "HighFire", label: "High Severity Fire" },
  { value: "Skid", label: "Skid Trail" },
];

const LANDUSE_COVER_DEFAULTS = {
  OldForest: 100,
  YoungForest: 100,
  Shrub: 80,
  Bunchgrass: 40,
  Sod: 60,
  LowFire: 85,
  HighFire: 45,
  Skid: 10,
};

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
  const manualCategories = new Set(["xs-distance", "sm-distance"]);
  if (override && manualCategories.has(categoryKey)) {
    if (override === "english") {
      if (categoryKey === "xs-distance") unitKey = "in";
      if (categoryKey === "sm-distance") unitKey = "ft";
    } else if (override === "metric") {
      if (categoryKey === "xs-distance") unitKey = "mm";
      if (categoryKey === "sm-distance") unitKey = "m";
    }
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

function formatUnitValue(value, categoryKey, canonicalUnit, precisionOverrides) {
  if (!Number.isFinite(value)) {
    return { value: "--", unit: canonicalUnit };
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
  if (!Number.isFinite(valueKgM2)) {
    return { value: "--", unit: "tonne/ha" };
  }
  const override = getGlobalUnitOverride();
  const useEnglish = override === "english";
  if (useEnglish) {
    const tonPerAcre = Number(valueKgM2) * 4.460895;
    return { value: tonPerAcre.toFixed(2), unit: "ton/acre" };
  }
  const tonnePerHa = Number(valueKgM2) * 10;
  return { value: tonnePerHa.toFixed(2), unit: "tonne/ha" };
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

  return { validate };
}

function applyLanduseCover(landuseValue, coverField, coverValidator) {
  const cover = LANDUSE_COVER_DEFAULTS[landuseValue];
  if (!Number.isFinite(cover)) return null;
  coverField.input.value = String(cover);
  coverField.input.dataset.unitizerCanonicalValue = String(cover);
  coverValidator?.validate?.();
  return cover;
}

export function mountDisturbedTool(root) {
  if (!root) return;

  let state = readDisturbedState();
  let lastResults = null;
  let lastYears = null;

  const container = document.createElement("div");
  container.className = "space-y-8";

  const form = document.createElement("form");
  form.className = "space-y-8";
  form.addEventListener("submit", (event) => event.preventDefault());

  const soilSection = createSoilProperties({
    state,
    idPrefix: "disturbed",
    rfgMax: 75,
    onChange: (patch) => {
      const next = { ...state, ...patch };
      if (patch.rfg_pct != null) {
        next.upper_ofe = { ...next.upper_ofe, rfg_pct: patch.rfg_pct };
        next.lower_ofe = { ...next.lower_ofe, rfg_pct: patch.rfg_pct };
      }
      state = next;
      writeDisturbedState(state);
    },
  });

  const upperSection = createSection("Upper Slope Element (OFE 1)");
  const upperGrid = document.createElement("div");
  upperGrid.className = "grid gap-6 md:grid-cols-2";
  const upperLeft = document.createElement("div");
  upperLeft.className = "space-y-4";
  const upperRight = document.createElement("div");
  upperRight.className = "space-y-4";

  const upperLanduseField = createSelectField({
    id: "disturbed_upper_landuse",
    label: "Treatment/Vegetation",
    options: LANDUSE_OPTIONS,
  });
  upperLanduseField.select.value = state.upper_ofe.landuse;

  const upperSlope1Field = createFormField({
    id: "disturbed_upper_slope_top",
    label: "Upper Slope",
    type: "number",
    value: String(state.upper_ofe.slope_point1_pct),
    unitLabel: "%",
  });
  upperSlope1Field.input.step = "0.1";
  upperSlope1Field.input.addEventListener("input", () => {
    const canonical = readCanonical(upperSlope1Field.input);
    if (canonical != null) {
      state.upper_ofe.slope_point1_pct = canonical;
      writeDisturbedState(state);
    }
  });
  const upperSlope1Validator = attachCanonicalValidator(upperSlope1Field, {
    min: 0,
    max: 1000,
    label: "Top slope gradient",
  });

  const upperSlope2Field = createFormField({
    id: "disturbed_upper_slope_mid",
    label: "Lower Slope",
    type: "number",
    value: String(state.upper_ofe.slope_point2_pct),
    unitLabel: "%",
  });
  upperSlope2Field.input.step = "0.1";
  upperSlope2Field.input.addEventListener("input", () => {
    const canonical = readCanonical(upperSlope2Field.input);
    if (canonical != null) {
      state.upper_ofe.slope_point2_pct = canonical;
      writeDisturbedState(state);
    }
  });
  const upperSlope2Validator = attachCanonicalValidator(upperSlope2Field, {
    min: 0,
    max: 1000,
    label: "Mid slope gradient",
  });

  const upperLengthField = createFormField({
    id: "disturbed_upper_length",
    label: "Length",
    type: "number",
    value: String(state.upper_ofe.length_m),
    unitLabel: "m",
  });
  upperLengthField.input.step = "0.1";
  upperLengthField.input.setAttribute("data-unitizer-category", "sm-distance");
  upperLengthField.input.setAttribute("data-unitizer-unit", "m");
  upperLengthField.input.setAttribute("data-precision", "2");
  attachUnitLabel(upperLengthField, "sm-distance", "m");
  upperLengthField.input.addEventListener("input", () => {
    const canonical = readCanonical(upperLengthField.input);
    if (canonical != null) {
      state.upper_ofe.length_m = canonical;
      writeDisturbedState(state);
    }
  });
  const upperLengthValidator = attachCanonicalValidator(upperLengthField, {
    min: 0,
    max: 3000,
    label: "Upper length",
  });

  const upperCoverField = createFormField({
    id: "disturbed_upper_cover",
    label: "Ground Cover",
    type: "number",
    value: String(state.upper_ofe.cover_pct),
    unitLabel: "%",
  });
  upperCoverField.input.step = "1";
  upperCoverField.input.addEventListener("input", () => {
    const canonical = readCanonical(upperCoverField.input);
    if (canonical != null) {
      state.upper_ofe.cover_pct = canonical;
      writeDisturbedState(state);
    }
  });
  const upperCoverValidator = attachCanonicalValidator(upperCoverField, {
    min: 0,
    max: 150,
    label: "Plant cover",
  });

  const upperCoverDefault = applyLanduseCover(
    state.upper_ofe.landuse,
    upperCoverField,
    upperCoverValidator
  );
  if (upperCoverDefault != null && upperCoverDefault !== state.upper_ofe.cover_pct) {
    state.upper_ofe.cover_pct = upperCoverDefault;
  }

  upperLanduseField.select.addEventListener("change", () => {
    state.upper_ofe.landuse = upperLanduseField.select.value;
    const cover = applyLanduseCover(
      state.upper_ofe.landuse,
      upperCoverField,
      upperCoverValidator
    );
    if (cover != null) {
      state.upper_ofe.cover_pct = cover;
    }
    writeDisturbedState(state);
  });

  upperLeft.appendChild(upperLanduseField.wrapper);
  upperLeft.appendChild(upperCoverField.wrapper);
  upperRight.appendChild(upperSlope1Field.wrapper);
  upperRight.appendChild(upperSlope2Field.wrapper);
  upperRight.appendChild(upperLengthField.wrapper);
  upperGrid.appendChild(upperLeft);
  upperGrid.appendChild(upperRight);
  upperSection.appendChild(upperGrid);

  const lowerSection = createSection("Lower Slope Element (OFE 2)");
  const lowerGrid = document.createElement("div");
  lowerGrid.className = "grid gap-6 md:grid-cols-2";
  const lowerLeft = document.createElement("div");
  lowerLeft.className = "space-y-4";
  const lowerRight = document.createElement("div");
  lowerRight.className = "space-y-4";

  const lowerLanduseField = createSelectField({
    id: "disturbed_lower_landuse",
    label: "Treatment/Vegetation",
    options: LANDUSE_OPTIONS,
  });
  lowerLanduseField.select.value = state.lower_ofe.landuse;

  const lowerSlope1Field = createFormField({
    id: "disturbed_lower_slope_mid",
    label: "Upper Slope",
    type: "number",
    value: String(state.lower_ofe.slope_point1_pct),
    unitLabel: "%",
  });
  lowerSlope1Field.input.step = "0.1";
  lowerSlope1Field.input.addEventListener("input", () => {
    const canonical = readCanonical(lowerSlope1Field.input);
    if (canonical != null) {
      state.lower_ofe.slope_point1_pct = canonical;
      writeDisturbedState(state);
    }
  });
  const lowerSlope1Validator = attachCanonicalValidator(lowerSlope1Field, {
    min: 0,
    max: 1000,
    label: "Mid slope gradient",
  });

  const lowerSlope2Field = createFormField({
    id: "disturbed_lower_slope_bottom",
    label: "Lower Slope",
    type: "number",
    value: String(state.lower_ofe.slope_point2_pct),
    unitLabel: "%",
  });
  lowerSlope2Field.input.step = "0.1";
  lowerSlope2Field.input.addEventListener("input", () => {
    const canonical = readCanonical(lowerSlope2Field.input);
    if (canonical != null) {
      state.lower_ofe.slope_point2_pct = canonical;
      writeDisturbedState(state);
    }
  });
  const lowerSlope2Validator = attachCanonicalValidator(lowerSlope2Field, {
    min: 0,
    max: 1000,
    label: "Bottom slope gradient",
  });

  const lowerLengthField = createFormField({
    id: "disturbed_lower_length",
    label: "Length",
    type: "number",
    value: String(state.lower_ofe.length_m),
    unitLabel: "m",
  });
  lowerLengthField.input.step = "0.1";
  lowerLengthField.input.setAttribute("data-unitizer-category", "sm-distance");
  lowerLengthField.input.setAttribute("data-unitizer-unit", "m");
  lowerLengthField.input.setAttribute("data-precision", "2");
  attachUnitLabel(lowerLengthField, "sm-distance", "m");
  lowerLengthField.input.addEventListener("input", () => {
    const canonical = readCanonical(lowerLengthField.input);
    if (canonical != null) {
      state.lower_ofe.length_m = canonical;
      writeDisturbedState(state);
    }
  });
  const lowerLengthValidator = attachCanonicalValidator(lowerLengthField, {
    min: 0,
    max: 3000,
    label: "Lower length",
  });

  const lowerCoverField = createFormField({
    id: "disturbed_lower_cover",
    label: "Ground Cover",
    type: "number",
    value: String(state.lower_ofe.cover_pct),
    unitLabel: "%",
  });
  lowerCoverField.input.step = "1";
  lowerCoverField.input.addEventListener("input", () => {
    const canonical = readCanonical(lowerCoverField.input);
    if (canonical != null) {
      state.lower_ofe.cover_pct = canonical;
      writeDisturbedState(state);
    }
  });
  const lowerCoverValidator = attachCanonicalValidator(lowerCoverField, {
    min: 0,
    max: 150,
    label: "Plant cover",
  });

  const lowerCoverDefault = applyLanduseCover(
    state.lower_ofe.landuse,
    lowerCoverField,
    lowerCoverValidator
  );
  if (lowerCoverDefault != null && lowerCoverDefault !== state.lower_ofe.cover_pct) {
    state.lower_ofe.cover_pct = lowerCoverDefault;
  }

  lowerLanduseField.select.addEventListener("change", () => {
    state.lower_ofe.landuse = lowerLanduseField.select.value;
    const cover = applyLanduseCover(
      state.lower_ofe.landuse,
      lowerCoverField,
      lowerCoverValidator
    );
    if (cover != null) {
      state.lower_ofe.cover_pct = cover;
    }
    writeDisturbedState(state);
  });

  lowerLeft.appendChild(lowerLanduseField.wrapper);
  lowerLeft.appendChild(lowerCoverField.wrapper);
  lowerRight.appendChild(lowerSlope1Field.wrapper);
  lowerRight.appendChild(lowerSlope2Field.wrapper);
  lowerRight.appendChild(lowerLengthField.wrapper);
  lowerGrid.appendChild(lowerLeft);
  lowerGrid.appendChild(lowerRight);
  lowerSection.appendChild(lowerGrid);

  writeDisturbedState(state);

  const hillslopeSection = createSimulationOptions({
    id: "disturbed_sim_years",
    value: String(state.simulation_years),
    onInput: (input) => {
      const canonical = readCanonical(input);
      if (canonical != null) {
        state.simulation_years = canonical;
        writeDisturbedState(state);
      }
    },
  });
  const yearsValidator = attachCanonicalValidator(hillslopeSection.field, {
    min: 1,
    max: 200,
    label: "Simulation years",
  });


  const runSection = document.createElement("div");
  runSection.className = "space-y-3";
  const runButton = createRunButton({ label: "Run Disturbed WEPP Model" });
  runSection.appendChild(runButton.wrapper);

  const details = document.createElement("details");
  details.className = "rounded-md border border-border bg-muted/30 px-3 py-2 text-sm hidden";
  const summary = document.createElement("summary");
  summary.className = "cursor-pointer font-medium";
  summary.textContent = "Error details";
  const detailBody = document.createElement("pre");
  detailBody.className = "mt-2 whitespace-pre-wrap text-xs text-muted-foreground";
  details.appendChild(summary);
  details.appendChild(detailBody);
  runSection.appendChild(details);

  form.appendChild(soilSection.wrapper);
  form.appendChild(upperSection);
  form.appendChild(lowerSection);
  form.appendChild(hillslopeSection.wrapper);
  form.appendChild(runSection);

  const resultsSection = createSection("Results");
  resultsSection.id = "disturbed-results";
  resultsSection.style.display = "none";

  const annualTable = createAnnualAveragesTable({ idPrefix: "disturbed" });
  resultsSection.appendChild(annualTable.table);

  const returnPeriodTable = createReturnPeriodTable({ idPrefix: "disturbed" });
  const occurrenceTable = createOccurrenceProbabilities({ idPrefix: "disturbed" });
  resultsSection.appendChild(returnPeriodTable.wrapper);
  resultsSection.appendChild(occurrenceTable.wrapper);
  const { tableBody } = annualTable;

  const filesContainer = document.createElement("div");
  filesContainer.className = "space-y-4";

  function createFileSection({
    id,
    title,
    description,
    downloadLabel,
    filename,
    persistKey,
  }) {
    const content = document.createElement("div");
    content.className = "space-y-3";
    const meta = document.createElement("div");
    meta.className = "flex flex-wrap items-center justify-between gap-2";
    const status = document.createElement("p");
    status.className = "text-sm text-muted-foreground";
    const download = document.createElement("a");
    download.className =
      "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-base font-medium transition-all border border-border bg-background hover:bg-accent";
    download.textContent = downloadLabel;
    download.href = "#";
    download.setAttribute("aria-disabled", "true");
    download.addEventListener("click", (event) => {
      if (download.getAttribute("aria-disabled") === "true") {
        event.preventDefault();
      }
    });
    meta.appendChild(status);
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

    return { section, setStatus, setText, clearText };
  }

  const fileSections = [
    {
      key: "management",
      endpoint: "/api/disturbed/GET/management",
      title: "Management File",
      description: "Generated management (.man) file used by WEPP.",
      downloadLabel: "Download .man",
      filename: "disturbed-management.man",
      persistKey: "fswepp2_disturbed_man_open",
    },
    {
      key: "soil",
      endpoint: "/api/disturbed/GET/soil",
      title: "Soil File",
      description: "Generated soil (.sol) file used by WEPP.",
      downloadLabel: "Download .sol",
      filename: "disturbed-soil.sol",
      persistKey: "fswepp2_disturbed_sol_open",
    },
    {
      key: "slope",
      endpoint: "/api/disturbed/GET/slope",
      title: "Slope File",
      description: "Generated slope (.slp) file used by WEPP.",
      downloadLabel: "Download .slp",
      filename: "disturbed-slope.slp",
      persistKey: "fswepp2_disturbed_slp_open",
    },
    {
      key: "run",
      endpoint: "/api/disturbed/GET/run_file",
      title: "Run File",
      description: "Generated WEPP run (.run) file.",
      downloadLabel: "Download .run",
      filename: "disturbed-run.run",
      persistKey: "fswepp2_disturbed_run_open",
    },
    {
      key: "output",
      endpoint: "/api/disturbedwepp/GET/wepp_output",
      title: "WEPP Output",
      description: "Raw WEPP output file.",
      downloadLabel: "Download .out",
      filename: "disturbed-output.out",
      persistKey: "fswepp2_disturbed_out_open",
    },
    {
      key: "ebe",
      endpoint: "/api/disturbedwepp/GET/wepp_ebe",
      title: "WEPP EBE Output",
      description: "Event-by-event WEPP output file.",
      downloadLabel: "Download .ebe",
      filename: "disturbed-events.ebe",
      persistKey: "fswepp2_disturbed_ebe_open",
    },
  ].map((config) => ({
    ...config,
    ui: createFileSection(config),
  }));

  fileSections.forEach((entry) => filesContainer.appendChild(entry.ui.section));
  resultsSection.appendChild(filesContainer);

  function renderResults(response, years) {
    const annual = response?.annual_averages || response;
    if (!annual) return;
    const precipMeta = formatUnitValue(
      annual.precip_mm,
      "xs-distance",
      "mm",
      { mm: 0, in: 2 }
    );
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
    const erosionRate = formatSurfaceDensity(annual.soil_loss_mean_kg_m2);
    const sedimentYield = formatSurfaceDensity(annual.sediment_yield_kg_m2);

    annualTable.setHeader(years);

    const rows = [
      {
        value: precipMeta.value,
        unit: precipMeta.unit,
        text: "precipitation from",
        count: annual.storms,
        countLabel: "storms",
      },
      {
        value: runoffRainMeta.value,
        unit: runoffRainMeta.unit,
        text: "runoff from rainfall from",
        count: annual.rainevents,
        countLabel: "events",
      },
      {
        value: runoffSnowMeta.value,
        unit: runoffSnowMeta.unit,
        text: "runoff from snowmelt or winter rainstorm from",
        count: annual.snowevents,
        countLabel: "events",
      },
      {
        value: erosionRate.value,
        unit: erosionRate.unit,
        text: "upland erosion rate",
        count: null,
        countLabel: null,
      },
      {
        value: sedimentYield.value,
        unit: sedimentYield.unit,
        text: "sediment leaving profile",
        count: null,
        countLabel: null,
      },
    ];

    tableBody.innerHTML = "";
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
      tableBody.appendChild(tr);
    });

    const returnPeriods = response?.return_periods;
    if (returnPeriods && returnPeriods.recurrence_intervals) {
      const intervals = returnPeriods.recurrence_intervals;
      const rows = intervals.map((interval) => {
        const key = String(interval);
        const precipValue = returnPeriods.precip_mm?.[key];
        const runoffValue = returnPeriods.runoff_mm?.[key];
        const erosionValue = returnPeriods.soil_loss_mean_kg_m2?.[key];
        const sedimentValue = returnPeriods.sediment_yield_kg_m2?.[key];
        const precipMeta = formatUnitValue(
          precipValue,
          "xs-distance",
          "mm",
          { mm: 0, in: 2 }
        );
        const runoffMeta = formatUnitValue(
          runoffValue,
          "xs-distance",
          "mm",
          { mm: 0, in: 2 }
        );
        const erosionMeta = formatSurfaceDensity(erosionValue);
        const sedimentMeta = formatSurfaceDensity(sedimentValue);
        return {
          label: `${interval} year`,
          precip: precipMeta.value,
          runoff: runoffMeta.value,
          erosion: erosionMeta.value,
          sediment: sedimentMeta.value,
        };
      });

      const average = {
        precip: precipMeta.value,
        runoff: formatUnitValue(
          annual.runoff_from_rain_mm + annual.runoff_from_snow_mm,
          "xs-distance",
          "mm",
          { mm: 0, in: 2 }
        ).value,
        erosion: erosionRate.value,
        sediment: sedimentYield.value,
      };

      returnPeriodTable.setData({
        years,
        rows,
        average,
        units: {
          precip: precipMeta.unit,
          runoff: runoffRainMeta.unit,
          erosion: erosionRate.unit,
          sediment: sedimentYield.unit,
        },
      });
    } else {
      returnPeriodTable.setData();
    }

    const probabilities = response?.occurrence_probabilities;
    if (probabilities) {
      const rows = [
        {
          label: "Probability there is runoff",
          percent: probabilities.runoff?.probability != null
            ? probabilities.runoff.probability * 100
            : null,
        },
        {
          label: "Probability there is erosion",
          percent: probabilities.erosion?.probability != null
            ? probabilities.erosion.probability * 100
            : null,
        },
        {
          label: "Probability there is sediment delivery",
          percent: probabilities.sediment_delivery?.probability != null
            ? probabilities.sediment_delivery.probability * 100
            : null,
        },
      ];
      occurrenceTable.setData({ years, rows });
    } else {
      occurrenceTable.setData();
    }
  }

  async function prefetchFile(entry, payload) {
    entry.ui.clearText();
    entry.ui.setStatus("Loading file...");
    try {
      const response = await apiPost(entry.endpoint, payload, {
        timeoutMs: 60000,
      });
      const text = typeof response === "string" ? response : "";
      if (!text) {
        entry.ui.setStatus("File is not available yet.");
        return;
      }
      entry.ui.setText(text, entry.filename);
    } catch (error) {
      console.error(`[disturbed] Failed to load ${entry.key} file`, error);
      entry.ui.setStatus("Unable to load file.");
    }
  }

  function prefetchFiles(payload) {
    if (!payload) return;
    fileSections.forEach((entry) => {
      prefetchFile(entry, payload);
    });
  }

  function updateResultsUnits() {
    if (!lastResults || !lastYears) return;
    renderResults(lastResults, lastYears);
  }

  function setFormDisabled(disabled) {
    const fields = form.querySelectorAll("input, select, button");
    fields.forEach((el) => {
      if (el === runButton.button) return;
      el.disabled = disabled;
    });
  }

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

  function validateAll() {
    const validators = [
      ...(soilSection.validators || []),
      upperSlope1Validator,
      upperSlope2Validator,
      upperLengthValidator,
      upperCoverValidator,
      lowerSlope1Validator,
      lowerSlope2Validator,
      lowerLengthValidator,
      lowerCoverValidator,
      yearsValidator,
    ];
    return validators.every((validator) => {
      if (typeof validator === "function") return validator();
      if (validator && typeof validator.validate === "function") {
        return validator.validate();
      }
      return true;
    });
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
      disturbedwepp_pars: {
        soil_texture: state.soil_texture,
        width_m: state.width_m,
        upper_ofe: {
          landuse: state.upper_ofe.landuse,
          slope_point1_pct: state.upper_ofe.slope_point1_pct,
          slope_point2_pct: state.upper_ofe.slope_point2_pct,
          length_m: state.upper_ofe.length_m,
          cover_pct: state.upper_ofe.cover_pct,
          rfg_pct: state.upper_ofe.rfg_pct,
        },
        lower_ofe: {
          landuse: state.lower_ofe.landuse,
          slope_point1_pct: state.lower_ofe.slope_point1_pct,
          slope_point2_pct: state.lower_ofe.slope_point2_pct,
          length_m: state.lower_ofe.length_m,
          cover_pct: state.lower_ofe.cover_pct,
          rfg_pct: state.lower_ofe.rfg_pct,
        },
      },
      wepp_version: "wepp2010",
    };

    try {
      const response = await apiPost("/api/disturbedwepp/RUN/wepp", payload, {
        timeoutMs: 60000,
      });
      lastResults = response;
      lastYears = payload.climate.input_years;
      renderResults(response, lastYears);
      resultsSection.style.display = "";
      prefetchFiles(payload);
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
      console.error("[disturbed] run failed", error);
    } finally {
      setFormDisabled(false);
    }
  }

  runButton.button.addEventListener("click", handleRun);

  container.appendChild(form);
  container.appendChild(resultsSection);
  root.innerHTML = "";
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
