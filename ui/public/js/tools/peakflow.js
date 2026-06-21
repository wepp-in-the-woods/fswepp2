import { createFormField } from "../components/form-field.js";
import { createRunButton } from "../components/run-button.js";
import { createButton } from "../components/button.js";
import { createCollapsibleSection } from "../components/collapsible.js";
import { createStatCard } from "../components/stat-card.js";
import {
  calculatePeakFlow,
  estimateCN,
  calculateTc,
  exampleData,
} from "./peakflow-calculations.js";
import {
  readPeakFlowState,
  writePeakFlowState,
  defaultPeakFlowState,
} from "../core/peakflow-state.js";

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
    if (categoryKey === "xs-distance") unitKey = "in";
    if (categoryKey === "sm-distance") unitKey = "ft";
    if (categoryKey === "area") unitKey = "acre";
    if (categoryKey === "flow") unitKey = "ft^3/s";
  } else if (override === "metric") {
    if (categoryKey === "xs-distance") unitKey = "mm";
    if (categoryKey === "sm-distance") unitKey = "m";
    if (categoryKey === "area") unitKey = "ha";
    if (categoryKey === "flow") unitKey = "m^3/s";
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

function formatUnitPeakFlowRate(value) {
  if (!Number.isFinite(value)) {
    return { value: "--", unit: "m^3/s per ha/mm x 10^-3" };
  }
  const override = getGlobalUnitOverride();
  if (override === "english") {
    const converted = value * 35.31 / 2.471 / 25.4;
    return {
      value: Number(converted).toFixed(4),
      unit: "ft^3/s per ac/in x 10^-3",
    };
  }
  return {
    value: Number(value).toFixed(2),
    unit: "m^3/s per ha/mm x 10^-3",
  };
}

function formatCulvertDiameter(valueCm) {
  if (!Number.isFinite(valueCm)) {
    return { value: "--", unit: "cm" };
  }
  const override = getGlobalUnitOverride();
  if (override === "english") {
    const inches = valueCm / 2.54;
    return { value: Number(inches).toFixed(2), unit: "in" };
  }
  return { value: Number(valueCm).toFixed(2), unit: "cm" };
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

function setUnitizedFieldValue(input, canonicalValue, categoryKey, canonicalUnit) {
  if (!Number.isFinite(canonicalValue)) return;
  input.dataset.unitizerCanonicalValue = String(canonicalValue);
  const client = getUnitizerClient();
  const meta = resolveUnitMeta(categoryKey, canonicalUnit);
  if (client && meta.unitKey !== canonicalUnit) {
    try {
      const converted = client.convert(canonicalValue, canonicalUnit, meta.unitKey);
      input.value = String(Number(converted).toFixed(meta.precision ?? 2));
      input.dataset.unitizerActiveUnit = meta.unitKey;
      return;
    } catch {
      // fall through to canonical
    }
  }
  input.value = String(canonicalValue);
  input.dataset.unitizerActiveUnit = canonicalUnit;
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

function attachNumericValidator(field, options) {
  const { input, setError, setValid } = field;
  const { min, max, label } = options;
  let touched = false;
  let timer = null;

  const validate = () => {
    const value = normalizeNumber(input.value);
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

function createSection(title) {
  const section = document.createElement("section");
  section.className = "rounded-lg border border-border bg-card p-6 space-y-4";
  const heading = document.createElement("h2");
  heading.className = "text-base font-semibold";
  heading.textContent = title;
  section.appendChild(heading);
  return section;
}

function createHelpBlock({ title, paragraphs = [], images = [] }) {
  const body = document.createElement("div");
  body.className = "space-y-2 text-sm text-muted-foreground";

  paragraphs.forEach((text) => {
    const p = document.createElement("p");
    p.textContent = text;
    body.appendChild(p);
  });

  images.forEach((img) => {
    const figure = document.createElement("figure");
    figure.className = "rounded-md border border-border bg-muted/20 p-2";
    const image = document.createElement("img");
    image.src = img.src;
    image.alt = img.alt;
    image.className = "w-full h-auto";
    figure.appendChild(image);
    if (img.caption) {
      const cap = document.createElement("figcaption");
      cap.className = "mt-2 text-xs text-muted-foreground";
      cap.textContent = img.caption;
      figure.appendChild(cap);
    }
    body.appendChild(figure);
  });

  return createCollapsibleSection({
    title,
    content: body,
    defaultOpen: false,
  });
}

export function mountPeakFlowTool(root) {
  if (!root) return;

  let state = readPeakFlowState();
  let lastResults = null;
  let cnEstimate = null;
  let tcEstimate = null;

  const container = document.createElement("div");
  container.className = "space-y-8";

  const header = document.createElement("div");
  header.className = "flex flex-col gap-3";
  const headerRow = document.createElement("div");
  headerRow.className = "flex flex-row items-start gap-3";
  const icon = document.createElement("img");
  icon.src = "/public/peak-flow-icon.svg";
  icon.alt = "Peak Flow calculator icon";
  icon.className = "h-12 w-12";
  const headingWrap = document.createElement("div");
  const title = document.createElement("h1");
  title.className = "text-foreground";
  title.textContent = "Forest Service Peak Flow Calculator";
  const subtitle = document.createElement("p");
  subtitle.className = "text-sm text-muted-foreground";
  subtitle.textContent =
    "Estimate peak flow for burned areas using Curve Number technology.";
  headingWrap.appendChild(title);
  headingWrap.appendChild(subtitle);
  headerRow.appendChild(icon);
  headerRow.appendChild(headingWrap);
  header.appendChild(headerRow);

  const about = createHelpBlock({
    title: "About this calculator",
    paragraphs: [
      "Based on the legacy Forest Service Peak Flow Calculator (2015.04.05).",
      "Elliot, William J.; Hall, David E.; Robichaud, Peter R. 2010. Forest Service Peak Flow Calculator. U.S. Department of Agriculture, Forest Service, Rocky Mountain Research Station.",
    ],
  });
  header.appendChild(about);

  const methods = createCollapsibleSection({
    title: "Methods",
    content: [
      "<p>To predict peak runoff from total storm runoff:</p>",
      "<ol class=\"list-decimal list-outside pl-6 space-y-1\">",
      "<li>Run ERMiT for climate and hillslope typical of the watershed.</li>",
      "<li>Note the return period runoff volume from ERMiT rainfall event rankings.</li>",
      "<li>Estimate the peak runoff rate using the TR-55 method.</li>",
      "</ol>",
      "<p>The TR-55 method is applicable to watersheds under ~900 ha with average slopes >0.5% and a dominant channel.</p>",
    ].join(""),
    defaultOpen: false,
  });

  const references = createCollapsibleSection({
    title: "References",
    content: [
      "<p>Elliot, W.J.; Robichaud, P.R. 2014. Wildfire Erosion Analysis with ERMiT and Peak Flow Calculator.</p>",
      "<p>Fangmeier, D.D.; Elliot, W.J.; Workman, S.R.; Huffman, R.L.; Schwab, G.O. 2006. Soil and Water Conservation Engineering.</p>",
      "<p>Foltz, R.B.; Robichaud, P.R.; Rhee, H. 2009. Post-Fire Peak Flow and Erosion Estimation.</p>",
      "<p>Soil Conservation Service, 1986. Urban Hydrology for Small Watersheds (TR-55).</p>",
    ].join(""),
    defaultOpen: false,
  });

  const form = document.createElement("form");
  form.className = "space-y-6";
  form.addEventListener("submit", (event) => event.preventDefault());

  const ermitSection = createSection("From ERMiT");
  const runoffField = createFormField({
    id: "peakflow_runoff",
    label: "Storm Runoff (Q)",
    type: "number",
    value: String(state.Q),
    unitLabel: "mm",
    help: "From ERMiT Rainfall Event Rankings (mm).",
  });
  runoffField.input.step = "any";
  runoffField.input.setAttribute("data-unitizer-category", "xs-distance");
  runoffField.input.setAttribute("data-unitizer-unit", "mm");
  runoffField.input.setAttribute("data-precision", "1");
  attachUnitLabel(runoffField, "xs-distance", "mm");
  runoffField.input.addEventListener("input", () => {
    const canonical = readCanonical(runoffField.input);
    if (canonical != null) {
      state.Q = canonical;
      writePeakFlowState(state);
      updateEstimates();
    }
  });
  const runoffValidator = attachCanonicalValidator(runoffField, {
    min: 0.1,
    max: 500,
    label: "Storm runoff",
  });

  const precipField = createFormField({
    id: "peakflow_precip",
    label: "Storm Precipitation (P)",
    type: "number",
    value: String(state.P),
    unitLabel: "mm",
    help: "If Q > P, use P ≈ 2Q.",
  });
  precipField.input.step = "any";
  precipField.input.setAttribute("data-unitizer-category", "xs-distance");
  precipField.input.setAttribute("data-unitizer-unit", "mm");
  precipField.input.setAttribute("data-precision", "1");
  attachUnitLabel(precipField, "xs-distance", "mm");
  precipField.input.addEventListener("input", () => {
    const canonical = readCanonical(precipField.input);
    if (canonical != null) {
      state.P = canonical;
      writePeakFlowState(state);
      updateEstimates();
    }
  });
  const precipValidator = attachCanonicalValidator(precipField, {
    min: 0.1,
    max: 500,
    label: "Storm precipitation",
  });

  ermitSection.appendChild(runoffField.wrapper);
  ermitSection.appendChild(precipField.wrapper);
  ermitSection.appendChild(
    createHelpBlock({
      title: "More info",
      paragraphs: [
        "Use ERMiT rainfall event rankings to identify a return interval runoff volume.",
        "If the event is rain-on-snow or soil is saturated, consider increasing runoff to account for lateral flow.",
        "A simple adjustment is to increase runoff by ~20% for post-fire watersheds.",
      ],
    })
  );

  const weppSection = createSection("From wepp.cloud");
  const areaField = createFormField({
    id: "peakflow_area",
    label: "Watershed Area (A)",
    type: "number",
    value: String(state.A),
    unitLabel: "ha",
    help: "Area above outlet/structure (ha).",
  });
  areaField.input.step = "any";
  areaField.input.setAttribute("data-unitizer-category", "area");
  areaField.input.setAttribute("data-unitizer-unit", "ha");
  areaField.input.setAttribute("data-precision", "2");
  attachUnitLabel(areaField, "area", "ha");
  areaField.input.addEventListener("input", () => {
    const canonical = readCanonical(areaField.input);
    if (canonical != null) {
      state.A = canonical;
      writePeakFlowState(state);
    }
  });
  const areaValidator = attachCanonicalValidator(areaField, {
    min: 0.1,
    max: 900,
    label: "Watershed area",
  });

  const lengthField = createFormField({
    id: "peakflow_length",
    label: "Watershed Flow Length (L)",
    type: "number",
    value: String(state.L),
    unitLabel: "m",
    help: "Flow length to outlet/structure (m).",
  });
  lengthField.input.step = "any";
  lengthField.input.setAttribute("data-unitizer-category", "sm-distance");
  lengthField.input.setAttribute("data-unitizer-unit", "m");
  lengthField.input.setAttribute("data-precision", "1");
  attachUnitLabel(lengthField, "sm-distance", "m");
  lengthField.input.addEventListener("input", () => {
    const canonical = readCanonical(lengthField.input);
    if (canonical != null) {
      state.L = canonical;
      writePeakFlowState(state);
      updateEstimates();
    }
  });
  const lengthValidator = attachCanonicalValidator(lengthField, {
    min: 1,
    max: 20000,
    label: "Flow length",
  });

  const slopeField = createFormField({
    id: "peakflow_gradient",
    label: "Average Watershed Gradient (Sg)",
    type: "number",
    value: String(state.Sg),
    unitLabel: "m/m",
    help: "Decimal slope (m/m), e.g. 0.13 = 13%.",
  });
  slopeField.input.step = "any";
  slopeField.input.addEventListener("input", () => {
    const value = normalizeNumber(slopeField.input.value);
    if (value != null) {
      state.Sg = value;
      writePeakFlowState(state);
      updateEstimates();
    }
  });
  const slopeValidator = attachNumericValidator(slopeField, {
    min: 0,
    max: 1,
    label: "Average watershed gradient",
  });

  weppSection.appendChild(areaField.wrapper);
  weppSection.appendChild(lengthField.wrapper);
  weppSection.appendChild(slopeField.wrapper);
  weppSection.appendChild(
    createHelpBlock({
      title: "More info",
      paragraphs: [
        "Watershed area can be estimated from maps or GIS (GeoWEPP is helpful).",
        "Flow length is the horizontal distance from watershed top to outlet or structure.",
        "Use decimal slope (m/m). For example, 13% slope = 0.13.",
      ],
    })
  );

  const manualSection = createSection("Manual Entry");
  const cnField = createFormField({
    id: "peakflow_cn",
    label: "Curve Number (CN)",
    type: "number",
    value: String(state.CN),
    help: "Curve number from wepp.cloud or estimate.",
  });
  cnField.input.step = "any";
  cnField.input.addEventListener("input", () => {
    const value = normalizeNumber(cnField.input.value);
    if (value != null) {
      state.CN = value;
      writePeakFlowState(state);
      updateEstimates();
    }
  });
  const cnValidator = attachNumericValidator(cnField, {
    min: 15,
    max: 100,
    label: "Curve number",
  });

  const cnEstimateRow = document.createElement("div");
  cnEstimateRow.className = "flex items-center gap-3 text-sm text-muted-foreground";
  const cnEstimateLabel = document.createElement("span");
  cnEstimateLabel.textContent = "CN estimate from ERMiT (forest):";
  const cnEstimateValue = document.createElement("span");
  cnEstimateValue.className = "font-semibold text-foreground";
  cnEstimateValue.textContent = "--";
  const cnEstimateButton = document.createElement("button");
  cnEstimateButton.type = "button";
  cnEstimateButton.className = "text-sm text-primary underline";
  cnEstimateButton.textContent = "Use estimate";
  cnEstimateButton.addEventListener("click", () => {
    if (cnEstimate != null) {
      cnField.input.value = String(cnEstimate);
      state.CN = cnEstimate;
      writePeakFlowState(state);
      updateEstimates();
    }
  });
  cnEstimateRow.appendChild(cnEstimateLabel);
  cnEstimateRow.appendChild(cnEstimateValue);
  cnEstimateRow.appendChild(cnEstimateButton);

  const tcField = createFormField({
    id: "peakflow_tc",
    label: "Time of Concentration (Tc)",
    type: "number",
    value: String(state.Tc),
    unitLabel: "hr",
    help: "Hours; typical range 0.1–10.",
  });
  tcField.input.step = "any";
  tcField.input.addEventListener("input", () => {
    const value = normalizeNumber(tcField.input.value);
    if (value != null) {
      state.Tc = value;
      writePeakFlowState(state);
      updateEstimates();
    }
  });
  const tcValidator = attachNumericValidator(tcField, {
    min: 0.1,
    max: 10,
    label: "Time of concentration",
  });

  const tcEstimateRow = document.createElement("div");
  tcEstimateRow.className = "flex items-center gap-3 text-sm text-muted-foreground";
  const tcEstimateLabel = document.createElement("span");
  tcEstimateLabel.textContent = "Tc estimate (flat watershed; dry soil):";
  const tcEstimateValue = document.createElement("span");
  tcEstimateValue.className = "font-semibold text-foreground";
  tcEstimateValue.textContent = "--";
  const tcEstimateButton = document.createElement("button");
  tcEstimateButton.type = "button";
  tcEstimateButton.className = "text-sm text-primary underline";
  tcEstimateButton.textContent = "Use estimate";
  tcEstimateButton.addEventListener("click", () => {
    if (tcEstimate != null) {
      tcField.input.value = String(tcEstimate);
      state.Tc = tcEstimate;
      writePeakFlowState(state);
      updateEstimates();
    }
  });
  tcEstimateRow.appendChild(tcEstimateLabel);
  tcEstimateRow.appendChild(tcEstimateValue);
  tcEstimateRow.appendChild(tcEstimateButton);

  const fpField = createFormField({
    id: "peakflow_fp",
    label: "Ponding Adjustment Factor (Fp)",
    type: "number",
    value: String(state.Fp),
    help: "0–1; 1.0 for no ponding.",
  });
  fpField.input.step = "any";
  fpField.input.addEventListener("input", () => {
    const value = normalizeNumber(fpField.input.value);
    if (value != null) {
      state.Fp = value;
      writePeakFlowState(state);
    }
  });
  const fpValidator = attachNumericValidator(fpField, {
    min: 0,
    max: 1,
    label: "Ponding adjustment factor",
  });

  const hField = createFormField({
    id: "peakflow_h",
    label: "Culvert Height (h)",
    type: "number",
    value: String(state.h),
    unitLabel: "m",
    help: "Distance from culvert center to 1 ft below road surface (m).",
  });
  hField.input.setAttribute("data-unitizer-category", "sm-distance");
  hField.input.setAttribute("data-unitizer-unit", "m");
  hField.input.setAttribute("data-precision", "2");
  hField.input.step = "any";
  attachUnitLabel(hField, "sm-distance", "m");
  hField.input.addEventListener("input", () => {
    const canonical = readCanonical(hField.input);
    if (canonical != null) {
      state.h = canonical;
      writePeakFlowState(state);
    }
  });
  const hValidator = attachCanonicalValidator(hField, {
    min: 0.3,
    max: 18.3,
    label: "Culvert height",
  });

  manualSection.appendChild(cnField.wrapper);
  manualSection.appendChild(cnEstimateRow);
  manualSection.appendChild(tcField.wrapper);
  manualSection.appendChild(tcEstimateRow);
  manualSection.appendChild(fpField.wrapper);
  manualSection.appendChild(hField.wrapper);
  manualSection.appendChild(
    createHelpBlock({
      title: "More info",
      paragraphs: [
        "Curve numbers can be estimated from ERMiT runoff and precipitation or from BAER guidance.",
        "The time of concentration regression is most relevant for flatter watersheds and dry soil.",
        "Ponding adjustment factor accounts for standing water (0.87 at 1% ponding, 0.72 at 5%).",
      ],
      images: [
        {
          src: "/public/culvertgraphic.png",
          alt: "Culvert height diagram",
          caption: "Culvert height definition.",
        },
      ],
    })
  );

  const inputSection = document.createElement("section");
  inputSection.className = "space-y-4";
  const inputHeading = document.createElement("h2");
  inputHeading.className = "text-lg font-semibold";
  inputHeading.textContent = "Inputs";
  inputSection.appendChild(inputHeading);
  inputSection.appendChild(ermitSection);
  inputSection.appendChild(weppSection);
  inputSection.appendChild(manualSection);

  const actions = document.createElement("div");
  actions.className = "flex flex-wrap gap-3";
  const runButton = createRunButton({ label: "Calculate" });
  const clearButton = createButton("Clear fields", "outline", {
    onClick: () => {
      state = { ...defaultPeakFlowState };
      writePeakFlowState(state);
      setUnitizedFieldValue(runoffField.input, state.Q, "xs-distance", "mm");
      setUnitizedFieldValue(precipField.input, state.P, "xs-distance", "mm");
      setUnitizedFieldValue(areaField.input, state.A, "area", "ha");
      setUnitizedFieldValue(lengthField.input, state.L, "sm-distance", "m");
      slopeField.input.value = String(state.Sg);
      cnField.input.value = String(state.CN);
      tcField.input.value = String(state.Tc);
      fpField.input.value = String(state.Fp);
      setUnitizedFieldValue(hField.input, state.h, "sm-distance", "m");
      updateEstimates();
      updateUnitizerInputs();
    },
  });
  const exampleButton = createButton("Use Mica Creek example", "secondary", {
    onClick: () => {
      state = { ...state, ...exampleData };
      writePeakFlowState(state);
      setUnitizedFieldValue(runoffField.input, state.Q, "xs-distance", "mm");
      setUnitizedFieldValue(precipField.input, state.P, "xs-distance", "mm");
      setUnitizedFieldValue(areaField.input, state.A, "area", "ha");
      setUnitizedFieldValue(lengthField.input, state.L, "sm-distance", "m");
      slopeField.input.value = String(state.Sg);
      cnField.input.value = String(state.CN);
      tcField.input.value = String(state.Tc);
      fpField.input.value = String(state.Fp);
      setUnitizedFieldValue(hField.input, state.h, "sm-distance", "m");
      updateEstimates();
      updateUnitizerInputs();
    },
  });
  actions.appendChild(runButton.wrapper);
  actions.appendChild(clearButton);
  actions.appendChild(exampleButton);

  inputSection.appendChild(actions);

  const resultsSection = document.createElement("section");
  resultsSection.className = "space-y-4";
  const resultsHeading = document.createElement("h2");
  resultsHeading.className = "text-lg font-semibold";
  resultsHeading.textContent = "Results";
  resultsSection.appendChild(resultsHeading);

  const resultsGrid = document.createElement("div");
  resultsGrid.className = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";

  const cards = {
    S: createStatCard({ label: "Surface storage (S)", value: "--", unit: "mm" }),
    Ia: createStatCard({ label: "Initial abstraction (Ia)", value: "--", unit: "mm" }),
    IaOnP: createStatCard({ label: "Ia/P ratio", value: "--", unit: "" }),
    qu: createStatCard({
      label: "Unit peak flow rate (qu)",
      value: "--",
      unit: "m^3/s per ha/mm x 10^-3",
    }),
    q: createStatCard({ label: "Estimated peak flow (q)", value: "--", unit: "m^3/s" }),
    D: createStatCard({ label: "Culvert diameter (D)", value: "--", unit: "cm" }),
  };

  Object.values(cards).forEach((card) => resultsGrid.appendChild(card));
  resultsSection.appendChild(resultsGrid);

  const unitPeakHelp = createHelpBlock({
    title: "Unit peak flow rate reference",
    paragraphs: [
      "Unit peak flow rate (qu) is estimated from time of concentration and Ia/P ratio.",
      "The graphs below provide the TR-55 reference curves used in the interpolation.",
    ],
    images: [
      {
        src: "/public/fangmeier.gif",
        alt: "Unit peak flow rate chart",
        caption: "Unit peak flow rate chart (Fangmeier 2006).",
      },
      {
        src: "/public/stormtypes.gif",
        alt: "SCS storm types",
        caption: "SCS 24-hour rainfall distributions.",
      },
    ],
  });
  resultsSection.appendChild(unitPeakHelp);

  form.appendChild(inputSection);
  container.appendChild(header);
  container.appendChild(methods);
  container.appendChild(references);
  container.appendChild(form);
  container.appendChild(resultsSection);
  root.innerHTML = "";
  root.appendChild(container);

  function updateEstimates() {
    const Q = state.Q;
    const P = state.P;
    if (Number.isFinite(Q) && Number.isFinite(P) && Q > 0 && P > 0) {
      const estimated = Math.round(estimateCN(Q, P));
      cnEstimate = estimated;
      cnEstimateValue.textContent = String(estimated);
      cnEstimateButton.disabled = false;
    } else {
      cnEstimate = null;
      cnEstimateValue.textContent = "--";
      cnEstimateButton.disabled = true;
    }

    if (state.Sg > 0 && state.CN > 0 && state.L > 0) {
      const tc = Number(calculateTc(state.Sg, state.CN, state.L).toFixed(2));
      tcEstimate = tc;
      tcEstimateValue.textContent = `${tc} hr`;
      tcEstimateButton.disabled = false;
    } else {
      tcEstimate = null;
      tcEstimateValue.textContent = "--";
      tcEstimateButton.disabled = true;
    }
  }

  function updateUnitizerInputs() {
    if (window.UnitizerClient?.ready) {
      window.UnitizerClient.ready().then((client) => {
        client.registerNumericInputs(root);
        client.updateNumericFields(root);
        client.updateUnitLabels(root);
      });
    }
  }

  function updateResultsUnits() {
    const setCard = (card, valueText, unitText) => {
      const valueEl = card.querySelector("span.text-2xl");
      if (valueEl) valueEl.textContent = valueText;
      const unitEl = card.querySelector("span.text-sm");
      if (unitEl && unitText !== undefined) {
        unitEl.textContent = unitText;
      }
    };

    if (!lastResults) {
      setCard(cards.S, "--", "mm");
      setCard(cards.Ia, "--", "mm");
      setCard(cards.IaOnP, "--");
      setCard(cards.qu, "--", "m^3/s per ha/mm x 10^-3");
      setCard(cards.q, "--", "m^3/s");
      setCard(cards.D, "--", "cm");
      return;
    }
    const S = formatUnitValue(lastResults.S, "xs-distance", "mm", { mm: 0, in: 2 });
    const Ia = formatUnitValue(lastResults.Ia, "xs-distance", "mm", { mm: 1, in: 2 });
    const q = formatUnitValue(lastResults.q, "flow", "m^3/s", { "m^3/s": 2, "ft^3/s": 2 });
    const qu = formatUnitPeakFlowRate(lastResults.qu);
    const D = formatCulvertDiameter(lastResults.D);

    setCard(cards.S, S.value, S.unit);
    setCard(cards.Ia, Ia.value, Ia.unit);
    setCard(cards.IaOnP, String(lastResults.IaOnP));
    setCard(cards.qu, qu.value, qu.unit);
    setCard(cards.q, q.value, q.unit);
    setCard(cards.D, D.value, D.unit);
  }

  function handleRun() {
    const validations = [
      runoffValidator,
      precipValidator,
      areaValidator,
      lengthValidator,
      slopeValidator,
      cnValidator,
      tcValidator,
      fpValidator,
      hValidator,
    ];
    const allValid = validations.every((v) => v.validate());
    if (!allValid) {
      runButton.setState("error", "Fix inputs", "Please correct the highlighted fields.");
      return;
    }
    try {
      lastResults = calculatePeakFlow({
        Q: state.Q,
        P: state.P,
        A: state.A,
        L: state.L,
        Sg: state.Sg,
        Tc: state.Tc,
        CN: state.CN,
        Fp: state.Fp,
        h: state.h,
      });
      updateResultsUnits();
      runButton.setState("success", "Calculated");
    } catch (error) {
      runButton.setState(
        "error",
        "Calculation failed",
        error?.message || "Unable to calculate results."
      );
      console.error("[peakflow] calculation failed", error);
    }
  }

  runButton.button.addEventListener("click", handleRun);

  updateEstimates();
  if (window.UnitizerClient?.ready) {
    window.UnitizerClient.ready().then((client) => {
      client.registerNumericInputs(root);
      client.updateNumericFields(root);
      client.updateUnitLabels(root);
      updateResultsUnits();
    });
  }

  document.addEventListener("unitizer:preferences-changed", () => {
    updateUnitizerInputs();
    updateResultsUnits();
  });
}
