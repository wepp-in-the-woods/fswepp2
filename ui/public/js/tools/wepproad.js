import { createFormField } from "../components/form-field.js";
import { createRunButton } from "../components/run-button.js";
import { createRadioGroup } from "../components/radio-group.js";
import { createSoilProperties } from "../components/soil-properties.js";
import { createCollapsibleSection } from "../components/collapsible.js";
import { createPreformattedBlock } from "../components/preformatted.js";
import { apiPost } from "../utils/api-client.js";
import { readClimateState } from "../core/rockclim-state.js";
import { readWeppRoadState, writeWeppRoadState } from "../core/wepproad-state.js";

const DESIGN_OPTIONS = [
  { value: "inveg", label: "Insloped with vegetated ditch" },
  { value: "inbare", label: "Insloped with bare ditch" },
  { value: "outunrut", label: "Outsloped with unrutted surface" },
  { value: "outrut", label: "Outsloped with rutted surface" },
];

const SURFACE_OPTIONS = [
  { value: "native", label: "Native" },
  { value: "gravel", label: "Graveled" },
  { value: "paved", label: "Paved" },
];

const TRAFFIC_OPTIONS = [
  { value: "high", label: "High traffic" },
  { value: "low", label: "Low traffic" },
  { value: "none", label: "No traffic" },
];

const PRECIP_UNIT_METRIC = "mm";
const PRECIP_UNIT_ENGLISH = "in";
const SED_UNIT_METRIC = "kg";
const SED_UNIT_ENGLISH = "lb";

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
    if (categoryKey === "sm-weight") unitKey = "lb";
  } else if (override === "metric") {
    if (categoryKey === "xs-distance") unitKey = "mm";
    if (categoryKey === "sm-weight") unitKey = "kg";
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

function mapSurfaceToApi(surface) {
  if (surface === "native") return "native";
  if (surface === "paved") return "paved";
  if (surface === "gravel" || surface === "graveled") {
    return "gravel";
  }
  return "gravel";
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

export function mountWeppRoadTool(root) {
  if (!root) return;

  let state = readWeppRoadState();
  let lastResults = null;
  let lastYears = null;

  const container = document.createElement("div");
  container.className = "space-y-8";

  const form = document.createElement("form");
  form.className = "space-y-8";
  form.addEventListener("submit", (event) => event.preventDefault());

  const soilSection = createSoilProperties({
    state,
    onChange: (patch) => {
      state = { ...state, ...patch };
      writeWeppRoadState(state);
    },
  });

  const roadSection = createSection("Road Geometry");
  const designGroup = createRadioGroup({
    name: "wepproad_design",
    label: "Road Design",
    options: DESIGN_OPTIONS,
    value: state.road.design,
    onChange: (value) => {
      setDesignValue(value);
    },
  });
  function setDesignValue(value) {
    state.road.design = value;
    designGroup.inputs.forEach((input) => {
      input.checked = input.value === value;
    });
    writeWeppRoadState(state);
  }
  roadSection.appendChild(designGroup.wrapper);
  roadSection.appendChild(
    createRadioGroup({
      name: "wepproad_surface",
      label: "Road Surface",
      options: SURFACE_OPTIONS,
      value: state.road.surface,
      onChange: (value) => {
        state.road.surface = value;
        writeWeppRoadState(state);
      },
      help:
        "Paving reduces road-surface erosion but increases runoff that can erode fillslopes, ditches, and flow paths.",
    }).wrapper
  );
  roadSection.appendChild(
    createRadioGroup({
      name: "wepproad_traffic",
      label: "Traffic Level",
      options: TRAFFIC_OPTIONS,
      value: state.road.traffic,
      onChange: (value) => {
        state.road.traffic = value;
        writeWeppRoadState(state);
      },
      help:
        "Traffic affects fine sediment exposure, vegetation cover, and rut formation; low/no traffic reduces rill erodibility.",
    }).wrapper
  );

  const roadHelp = document.createElement("details");
  roadHelp.className = "text-sm text-muted-foreground";
  const roadHelpSummary = document.createElement("summary");
  roadHelpSummary.className = "cursor-pointer text-sm text-muted-foreground";
  roadHelpSummary.textContent = "More Info";
  const roadHelpBody = document.createElement("div");
  roadHelpBody.className = "mt-2 space-y-2";
  const roadHelpTexts = [
    "Paved roads are most beneficial on outsloped designs or where buffers are minimal, and least beneficial on insloped roads or when moderate buffers can absorb runoff. Far from streams, treatment choice matters less because forest buffers absorb runoff.",
    "High traffic is typically rutted; low traffic may or may not rut depending on maintenance and season. To reduce sediment on low/no traffic roads, outsloping and wet-season restrictions help.",
    "No-traffic roads assume more vegetation. To model fully vegetated road surfaces, keep road length minimal and move the remaining length into fill/buffer values.",
  ];
  roadHelpTexts.forEach((text) => {
    const p = document.createElement("p");
    p.className = "text-sm text-muted-foreground";
    p.textContent = text;
    roadHelpBody.appendChild(p);
  });
  roadHelp.appendChild(roadHelpSummary);
  roadHelp.appendChild(roadHelpBody);
  roadSection.appendChild(roadHelp);

  const roadGrid = document.createElement("div");
  roadGrid.className = "grid gap-4 md:grid-cols-3";

  const roadSlopeField = createFormField({
    id: "wepproad_road_slope",
    label: "Road Gradient",
    type: "number",
    value: String(state.road.slope_pct),
    unitLabel: "%",
    help: "Percent slope of the water flow path along the road surface.",
  });
  roadSlopeField.input.step = "0.1";
  roadSlopeField.input.addEventListener("input", () => {
    const canonical = readCanonical(roadSlopeField.input);
    if (canonical != null) {
      state.road.slope_pct = canonical;
      writeWeppRoadState(state);
    }
  });
  const roadSlopeValidator = attachCanonicalValidator(roadSlopeField, {
    min: 0.1,
    max: 40,
    label: "Road gradient",
  });

  const roadLengthField = createFormField({
    id: "wepproad_road_length",
    label: "Road Length",
    type: "number",
    value: String(state.road.length_m),
    unitLabel: "m",
    help: "Horizontal length of the road segment between drainage locations.",
  });
  roadLengthField.input.step = "0.1";
  roadLengthField.input.setAttribute("data-unitizer-category", "sm-distance");
  roadLengthField.input.setAttribute("data-unitizer-unit", "m");
  roadLengthField.input.setAttribute("data-precision", "2");
  attachUnitLabel(roadLengthField, "sm-distance", "m");
  roadLengthField.input.addEventListener("input", () => {
    const canonical = readCanonical(roadLengthField.input);
    if (canonical != null) {
      state.road.length_m = canonical;
      writeWeppRoadState(state);
    }
  });
  const roadLengthValidator = attachCanonicalValidator(roadLengthField, {
    min: 1,
    max: 300,
    label: "Road length",
  });

  const roadWidthField = createFormField({
    id: "wepproad_road_width",
    label: "Road Width",
    type: "number",
    value: String(state.road.width_m),
    unitLabel: "m",
    help:
      "Insloped: ditch + travelway. Outsloped/unrutted: travelway. Outsloped/rutted: rut spacing + rut width.",
  });
  roadWidthField.input.step = "0.1";
  roadWidthField.input.setAttribute("data-unitizer-category", "sm-distance");
  roadWidthField.input.setAttribute("data-unitizer-unit", "m");
  roadWidthField.input.setAttribute("data-precision", "2");
  attachUnitLabel(roadWidthField, "sm-distance", "m");
  roadWidthField.input.addEventListener("input", () => {
    const canonical = readCanonical(roadWidthField.input);
    if (canonical != null) {
      state.road.width_m = canonical;
      writeWeppRoadState(state);
    }
  });
  const roadWidthValidator = attachCanonicalValidator(roadWidthField, {
    min: 0.3,
    max: 100,
    label: "Road width",
  });

  roadGrid.appendChild(roadSlopeField.wrapper);
  roadGrid.appendChild(roadLengthField.wrapper);
  roadGrid.appendChild(roadWidthField.wrapper);
  roadSection.appendChild(roadGrid);

  const fillSection = createSection("Fill Slope");
  const fillGrid = document.createElement("div");
  fillGrid.className = "grid gap-4 md:grid-cols-2";

  const fillSlopeField = createFormField({
    id: "wepproad_fill_slope",
    label: "Fill Gradient",
    type: "number",
    value: String(state.fill.slope_pct),
    unitLabel: "%",
    help: "Percent slope of the fill slope surface.",
  });
  fillSlopeField.input.step = "0.1";
  fillSlopeField.input.addEventListener("input", () => {
    const canonical = readCanonical(fillSlopeField.input);
    if (canonical != null) {
      state.fill.slope_pct = canonical;
      writeWeppRoadState(state);
    }
  });
  const fillSlopeValidator = attachCanonicalValidator(fillSlopeField, {
    min: 0.1,
    max: 150,
    label: "Fill gradient",
  });

  const fillLengthField = createFormField({
    id: "wepproad_fill_length",
    label: "Fill Length",
    type: "number",
    value: String(state.fill.length_m),
    unitLabel: "m",
    help: "Horizontal length of the fill slope.",
  });
  fillLengthField.input.step = "0.1";
  fillLengthField.input.setAttribute("data-unitizer-category", "sm-distance");
  fillLengthField.input.setAttribute("data-unitizer-unit", "m");
  fillLengthField.input.setAttribute("data-precision", "2");
  attachUnitLabel(fillLengthField, "sm-distance", "m");
  fillLengthField.input.addEventListener("input", () => {
    const canonical = readCanonical(fillLengthField.input);
    if (canonical != null) {
      state.fill.length_m = canonical;
      writeWeppRoadState(state);
    }
  });
  const fillLengthValidator = attachCanonicalValidator(fillLengthField, {
    min: 0.3,
    max: 100,
    label: "Fill length",
  });

  fillGrid.appendChild(fillSlopeField.wrapper);
  fillGrid.appendChild(fillLengthField.wrapper);
  fillSection.appendChild(fillGrid);

  const bufferSection = createSection("Buffer Slope");
  const bufferGrid = document.createElement("div");
  bufferGrid.className = "grid gap-4 md:grid-cols-2";

  const bufferSlopeField = createFormField({
    id: "wepproad_buffer_slope",
    label: "Buffer Gradient",
    type: "number",
    value: String(state.buffer.slope_pct),
    unitLabel: "%",
    help: "Percent slope of the buffer surface.",
  });
  bufferSlopeField.input.step = "0.1";
  bufferSlopeField.input.addEventListener("input", () => {
    const canonical = readCanonical(bufferSlopeField.input);
    if (canonical != null) {
      state.buffer.slope_pct = canonical;
      writeWeppRoadState(state);
    }
  });
  const bufferSlopeValidator = attachCanonicalValidator(bufferSlopeField, {
    min: 0.1,
    max: 100,
    label: "Buffer gradient",
  });

  const bufferLengthField = createFormField({
    id: "wepproad_buffer_length",
    label: "Buffer Length",
    type: "number",
    value: String(state.buffer.length_m),
    unitLabel: "m",
    help: "Horizontal length of the buffer.",
  });
  bufferLengthField.input.step = "0.1";
  bufferLengthField.input.setAttribute("data-unitizer-category", "sm-distance");
  bufferLengthField.input.setAttribute("data-unitizer-unit", "m");
  bufferLengthField.input.setAttribute("data-precision", "2");
  attachUnitLabel(bufferLengthField, "sm-distance", "m");
  bufferLengthField.input.addEventListener("input", () => {
    const canonical = readCanonical(bufferLengthField.input);
    if (canonical != null) {
      state.buffer.length_m = canonical;
      writeWeppRoadState(state);
    }
  });
  const bufferLengthValidator = attachCanonicalValidator(bufferLengthField, {
    min: 0.3,
    max: 300,
    label: "Buffer length",
  });

  bufferGrid.appendChild(bufferSlopeField.wrapper);
  bufferGrid.appendChild(bufferLengthField.wrapper);
  bufferSection.appendChild(bufferGrid);

  const simSection = createSection("Simulation Options");
  const simField = createFormField({
    id: "wepproad_sim_years",
    label: "Simulation Years",
    type: "number",
    value: String(state.simulation_years),
  });
  simField.input.step = "1";
  simField.input.addEventListener("input", () => {
    const canonical = readCanonical(simField.input);
    if (canonical != null) {
      state.simulation_years = canonical;
      writeWeppRoadState(state);
    }
  });
  const simValidator = attachCanonicalValidator(simField, {
    min: 1,
    max: 200,
    label: "Simulation years",
  });
  simSection.appendChild(simField.wrapper);

  const runSection = document.createElement("div");
  runSection.className = "space-y-3";
  const runButton = createRunButton({ label: "Run WEPP Road Model" });
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
  form.appendChild(roadSection);
  form.appendChild(fillSection);
  form.appendChild(bufferSection);
  form.appendChild(simSection);
  form.appendChild(runSection);

  const resultsSection = createSection("Results");
  resultsSection.id = "wepproad-results";
  resultsSection.style.display = "none";

  const table = document.createElement("table");
  table.className = "w-full text-sm border border-border rounded-md table-fixed";
  table.innerHTML = `
    <colgroup>
      <col style="width:16%" />
      <col style="width:10%" />
      <col style="width:44%" />
      <col style="width:15%" />
      <col style="width:15%" />
    </colgroup>
    <thead class="bg-muted text-left">
      <tr>
        <th colspan="5" class="px-3 py-2" id="wepproad-results-title"></th>
      </tr>
      <tr>
        <th colspan="3" class="px-3 py-2"></th>
        <th colspan="2" class="px-3 py-2 text-xs font-medium text-muted-foreground" id="wepproad-results-total"></th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  resultsSection.appendChild(table);

  const titleCell = table.querySelector("#wepproad-results-title");
  const totalCell = table.querySelector("#wepproad-results-total");
  const tableBody = table.querySelector("tbody");

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
      endpoint: "/api/wepproad/GET/management",
      title: "Management File",
      description: "Generated management (.man) file used by WEPP.",
      downloadLabel: "Download .man",
      filename: "wepproad-management.man",
      persistKey: "fswepp2_wepproad_man_open",
    },
    {
      key: "soil",
      endpoint: "/api/wepproad/GET/soil",
      title: "Soil File",
      description: "Generated soil (.sol) file used by WEPP.",
      downloadLabel: "Download .sol",
      filename: "wepproad-soil.sol",
      persistKey: "fswepp2_wepproad_sol_open",
    },
    {
      key: "slope",
      endpoint: "/api/wepproad/GET/slope",
      title: "Slope File",
      description: "Generated slope (.slp) file used by WEPP.",
      downloadLabel: "Download .slp",
      filename: "wepproad-slope.slp",
      persistKey: "fswepp2_wepproad_slp_open",
    },
    {
      key: "run",
      endpoint: "/api/wepproad/GET/run_file",
      title: "Run File",
      description: "Generated WEPP run (.run) file.",
      downloadLabel: "Download .run",
      filename: "wepproad-run.run",
      persistKey: "fswepp2_wepproad_run_open",
    },
    {
      key: "output",
      endpoint: "/api/wepproad/GET/wepp_output",
      title: "WEPP Output",
      description: "Raw WEPP output file.",
      downloadLabel: "Download .out",
      filename: "wepproad-output.out",
      persistKey: "fswepp2_wepproad_out_open",
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
    const roadSedMeta = formatUnitValue(
      annual.road_prism_erosion_kg,
      "sm-weight",
      "kg"
    );
    const bufferSedMeta = formatUnitValue(
      annual.sediment_leaving_buffer_kg,
      "sm-weight",
      "kg"
    );
    titleCell.textContent = `${years} - YEAR MEAN ANNUAL AVERAGES`;
    totalCell.textContent = `Total in ${years} years`;

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
        value: roadSedMeta.value,
        unit: roadSedMeta.unit,
        text: "road prism erosion",
        count: null,
        countLabel: null,
      },
      {
        value: bufferSedMeta.value,
        unit: bufferSedMeta.unit,
        text: "sediment leaving buffer",
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
      console.error(`[wepproad] Failed to load ${entry.key} file`, error);
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
      roadSlopeValidator,
      roadLengthValidator,
      roadWidthValidator,
      fillSlopeValidator,
      fillLengthValidator,
      bufferSlopeValidator,
      bufferLengthValidator,
      simValidator,
    ];
    return validators.every((validator) => {
      if (typeof validator === "function") return validator();
      if (validator && typeof validator.validate === "function") {
        return validator.validate();
      }
      return true;
    });
  }

  function enforceHighTrafficOutunrutRule() {
    if (
      state.road.traffic === "high" &&
      state.road.design === "outunrut" &&
      state.road.surface === "native"
    ) {
      const proceed = window.confirm(
        "High traffic unrutted not allowed -- selecting rutted"
      );
      if (!proceed) return false;
      setDesignValue("outrut");
    }
    return true;
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

    if (!enforceHighTrafficOutunrutRule()) {
      runButton.setState(
        "error",
        "Retry",
        "High traffic unrutted is not allowed for native surfaces."
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
      wepproad_pars: {
        soil_texture: state.soil_texture,
        rfg_pct: state.rfg_pct,
        road: {
          slope_pct: state.road.slope_pct,
          length_m: state.road.length_m,
          width_m: state.road.width_m,
          surface: mapSurfaceToApi(state.road.surface),
          design: state.road.design,
          traffic: state.road.traffic,
        },
        fill: {
          slope_pct: state.fill.slope_pct,
          length_m: state.fill.length_m,
        },
        buffer: {
          slope_pct: state.buffer.slope_pct,
          length_m: state.buffer.length_m,
        },
      },
      wepp_version: "wepp2010",
    };

    try {
      const response = await apiPost("/api/wepproad/RUN/wepp", payload, {
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
      console.error("[wepproad] run failed", error);
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
