import { createCollapsibleSection } from "./collapsible.js";
import { createFormField, createSelectField } from "./form-field.js";
import { createCheckboxField } from "./checkbox-field.js";
import { createButton } from "./button.js";
import { createModal, openModal, closeModal } from "./modal.js";
import { createPreformattedBlock } from "./preformatted.js";
import { createDropAndUpload } from "./drop-and-upload.js";
import { apiPost } from "../utils/api-client.js";
import { isLatitude, isLongitude } from "../utils/validators.js";
import {
  readClimateState,
  writeClimateState,
} from "../core/rockclim-state.js";

const STATION_LIMIT = 10;
const DATABASE_OPTIONS = [
  { value: "legacy", label: "Legacy" },
  { value: "2015", label: "2015" },
  { value: "au", label: "Australia" },
  { value: "ghcn", label: "GHCN" },
];
const CLIGEN_OPTIONS = [
  { value: "4.3", label: "4.3" },
  { value: "5.3.2", label: "5.3.2" },
];
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const PRISM_OVERLAY_OPACITY_DEFAULT = 0.15;
const PRISM_OVERLAY_MAX_WIDTH = 2048;
const PRISM_ALLOWED_DATABASES = new Set([null, "legacy", "2015", "ghcn"]);
const PRISM_PPT_COG_URL =
  "/prism_data/prism_ppt_us_30s_2020_avg_30y/prism_ppt_us_30s_2020_avg_30y_cog.tif";
const PRISM_PPT_LEGEND_BINS = [
  { min: -Infinity, max: 0, color: "#FFFFFF" },
  { min: 0, max: 4, color: "#660000" },
  { min: 4, max: 8, color: "#B33000" },
  { min: 8, max: 12, color: "#E65C00" },
  { min: 12, max: 16, color: "#FF9900" },
  { min: 16, max: 20, color: "#FFCC00" },
  { min: 20, max: 24, color: "#FFFF00" },
  { min: 24, max: 28, color: "#CCFF00" },
  { min: 28, max: 32, color: "#80FF00" },
  { min: 32, max: 36, color: "#00FF00" },
  { min: 36, max: 40, color: "#00FF80" },
  { min: 40, max: 50, color: "#00FFFF" },
  { min: 50, max: 60, color: "#33CCFF" },
  { min: 60, max: 70, color: "#3366FF" },
  { min: 70, max: 80, color: "#0000FF" },
  { min: 80, max: 100, color: "#7F00FF" },
  { min: 100, max: 120, color: "#FF00FF" },
  { min: 120, max: 140, color: "#FF66FF" },
  { min: 140, max: 160, color: "#FFB3FF" },
  { min: 160, max: Infinity, color: "#FFE6FF" },
];
const PRISM_PPT_COLOR_STOPS = [
  { min: -Infinity, max: 0, color: [255, 255, 255] },
  { min: 0, max: 4, color: [102, 0, 0] },
  { min: 4, max: 8, color: [179, 48, 0] },
  { min: 8, max: 12, color: [230, 92, 0] },
  { min: 12, max: 16, color: [255, 153, 0] },
  { min: 16, max: 20, color: [255, 204, 0] },
  { min: 20, max: 24, color: [255, 255, 0] },
  { min: 24, max: 28, color: [204, 255, 0] },
  { min: 28, max: 32, color: [128, 255, 0] },
  { min: 32, max: 36, color: [0, 255, 0] },
  { min: 36, max: 40, color: [0, 255, 128] },
  { min: 40, max: 50, color: [0, 255, 255] },
  { min: 50, max: 60, color: [51, 204, 255] },
  { min: 60, max: 70, color: [51, 102, 255] },
  { min: 70, max: 80, color: [0, 0, 255] },
  { min: 80, max: 100, color: [127, 0, 255] },
  { min: 100, max: 120, color: [255, 0, 255] },
  { min: 120, max: 140, color: [255, 102, 255] },
  { min: 140, max: 160, color: [255, 179, 255] },
  { min: 160, max: Infinity, color: [255, 230, 255] },
];

function colorForPrecipInches(value) {
  if (!Number.isFinite(value)) return [0, 0, 0, 0];
  for (const stop of PRISM_PPT_COLOR_STOPS) {
    if (value >= stop.min && value < stop.max) {
      return [...stop.color, 255];
    }
  }
  return [...PRISM_PPT_COLOR_STOPS[0].color, 255];
}

function renderCategoricalLegend(items) {
  const container = document.createElement("div");
  container.className = "gl-legend-categorical";
  for (const item of items) {
    const row = document.createElement("div");
    row.className = "gl-legend-categorical__item";
    const swatch = document.createElement("span");
    swatch.className = "gl-legend-categorical__swatch";
    swatch.style.backgroundColor = item.color;
    const label = document.createElement("span");
    label.textContent = item.label;
    row.appendChild(swatch);
    row.appendChild(label);
    container.appendChild(row);
  }
  return container;
}

function getLegendUnitKey() {
  const client = window.UnitizerClient?.getClientSync?.();
  if (client && typeof client.getPreferencePayload === "function") {
    const prefs = client.getPreferencePayload();
    if (prefs && prefs["xs-distance"]) {
      return prefs["xs-distance"];
    }
  }
  return "mm";
}

function formatLegendValue(valueInches, unitKey) {
  if (unitKey === "in") {
    const rounded = Math.round(valueInches);
    return Number.isFinite(rounded) ? `${rounded}` : "";
  }
  const mm = Math.round(valueInches * 25.4);
  return Number.isFinite(mm) ? `${mm}` : "";
}

function buildLegendItems(unitKey) {
  return PRISM_PPT_LEGEND_BINS.map((bin) => {
    if (!Number.isFinite(bin.min)) {
      return {
        color: bin.color,
        label: `< ${formatLegendValue(bin.max, unitKey)} ${unitKey}`,
      };
    }
    if (!Number.isFinite(bin.max)) {
      return {
        color: bin.color,
        label: `> ${formatLegendValue(bin.min, unitKey)} ${unitKey}`,
      };
    }
    return {
      color: bin.color,
      label: `${formatLegendValue(bin.min, unitKey)} - ${formatLegendValue(
        bin.max,
        unitKey
      )} ${unitKey}`,
    };
  });
}

function createDebounce(fn, delayMs) {
  let timer = null;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}

function formatStationLabel(station) {
  const name = station.desc || station.id || station.par || "Station";
  const distance = Number(station.distance_to_query_location);
  const elevation = Number(station.elevation);
  const parts = [name];
  if (Number.isFinite(distance)) {
    parts.push(`${distance.toFixed(1)} km`);
  }
  if (Number.isFinite(elevation)) {
    parts.push(`${Math.round(elevation)} m`);
  }
  return parts.length > 1 ? `${parts[0]} - ${parts.slice(1).join(", ")}` : parts[0];
}

function isPrismAllowed(database) {
  const normalized = database ?? "legacy";
  return PRISM_ALLOWED_DATABASES.has(normalized);
}

function hasValidLocation(state, lonInput, latInput) {
  if (state?.location && isLongitude(state.location.longitude) && isLatitude(state.location.latitude)) {
    return true;
  }
  return (
    isLongitude(lonInput?.value) &&
    isLatitude(latInput?.value)
  );
}

function formatLocationSummary(location) {
  if (!location) return null;
  const lat = Number(location.latitude);
  const lon = Number(location.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
}

export function mountRockClimControl(root) {
  if (!root) return;

  let climateState = readClimateState();
  let stations = [];
  let stationsGeojson = null;
  let mapInstance = null;
  let mapViewState = null;
  let stationParKey = null;
  let stationParBlobKey = null;
  let stationParText = "";
  let stationParFilename = "";
  let stationParBlobUrl = "";
  let stationParLoading = false;
  let stationParError = null;
  let stationParRequestId = 0;
  let climateFileKey = null;
  let climateFileBlobKey = null;
  let climateFileText = "";
  let climateFileFilename = "";
  let climateFileBlobUrl = "";
  let climateFileLoading = false;
  let climateFileError = null;
  let climateFileRequestId = 0;
  let prismOverlayOpacity = PRISM_OVERLAY_OPACITY_DEFAULT;
  const prismOverlay = {
    status: "idle",
    canvas: null,
    bounds: null,
    promise: null,
    error: null,
  };


  const databaseField = createSelectField({
    id: "rockclim_database",
    label: "Climate Database",
    options: DATABASE_OPTIONS,
  });

  const cligenField = createSelectField({
    id: "rockclim_cligen",
    label: "CLIGEN Version",
    options: CLIGEN_OPTIONS,
  });

  const lonField = createFormField({
    id: "rockclim_longitude",
    label: "Longitude",
    type: "number",
    placeholder: "-116.0000",
    help: "Decimal degrees.",
    validator: (value) =>
      isLongitude(value) ? true : "Enter longitude between -180 and 180.",
  });
  lonField.input.step = "0.0001";

  const latField = createFormField({
    id: "rockclim_latitude",
    label: "Latitude",
    type: "number",
    placeholder: "47.0000",
    help: "Decimal degrees.",
    validator: (value) =>
      isLatitude(value) ? true : "Enter latitude between -90 and 90.",
  });
  latField.input.step = "0.0001";

  const stationField = createSelectField({
    id: "rockclim_station",
    label: "Nearest Station",
    options: [{ value: "", label: "Set location to load stations" }],
  });

  const prismField = createCheckboxField({
    id: "rockclim_prism",
    label: "Use PRISM adjustment for this location",
    help: "Only available after setting location.",
  });

  const customizeButton = createButton("Customize Climate", "default");
  const deleteClimateButton = createButton("Delete Climate", "destructive");

  const climateUpload = createDropAndUpload({
    id: "rockclim-climate-upload",
    buttonText: "Drop or Upload RockClim Climate (.json)",
    helper: "",
    height: 50,
    accept: ".json,application/json",
    onFile: handleClimateImport,
  });

  const mapShell = document.createElement("div");
  mapShell.className =
    "relative h-[500px] w-full overflow-hidden rounded-md border border-border";
  const mapContainer = document.createElement("div");
  mapContainer.id = "rockclim-map";
  mapContainer.className = "absolute inset-0";
  mapShell.appendChild(mapContainer);
  const overlayControls = document.createElement("div");
  overlayControls.className = "flex flex-wrap items-center gap-3 text-sm";
  overlayControls.style.display = "none";
  const overlaySummary = document.createElement("div");
  overlaySummary.className = "flex items-center gap-2";
  const overlaySummaryLabel = document.createElement("span");
  overlaySummaryLabel.className = "font-medium text-foreground";
  overlaySummaryLabel.textContent = "PRISM Annual Precip";
  const overlaySummaryValue = document.createElement("span");
  overlaySummaryValue.className = "min-w-[64px] text-right tabular-nums text-foreground";
  overlaySummaryValue.textContent = "--";
  const overlaySummaryUnit = document.createElement("span");
  overlaySummaryUnit.className = "text-muted-foreground";
  overlaySummaryUnit.textContent = "mm";
  overlaySummary.appendChild(overlaySummaryLabel);
  overlaySummary.appendChild(overlaySummaryValue);
  overlaySummary.appendChild(overlaySummaryUnit);

  const overlayOpacityLabel = document.createElement("span");
  overlayOpacityLabel.className = "font-medium text-foreground";
  overlayOpacityLabel.textContent = "Map Opacity";
  const overlayRange = document.createElement("input");
  overlayRange.type = "range";
  overlayRange.min = "0";
  overlayRange.max = "1";
  overlayRange.step = "0.05";
  overlayRange.value = PRISM_OVERLAY_OPACITY_DEFAULT.toString();
  overlayRange.className = "flex-1 min-w-[140px]";
  const overlayValue = document.createElement("span");
  overlayValue.className = "tabular-nums text-muted-foreground";
  overlayValue.textContent = `${Math.round(PRISM_OVERLAY_OPACITY_DEFAULT * 100)}%`;
  overlayControls.appendChild(overlaySummary);
  overlayControls.appendChild(overlayOpacityLabel);
  overlayControls.appendChild(overlayRange);
  overlayControls.appendChild(overlayValue);
  const overlayLegend = document.createElement("div");
  overlayLegend.className =
    "absolute right-3 top-3 rounded-md border border-border bg-background/90 px-3 py-2 shadow-sm";
  overlayLegend.style.display = "none";
  const overlayLegendSection = document.createElement("div");
  overlayLegendSection.className = "gl-legend-section";
  const overlayLegendTitle = document.createElement("h5");
  overlayLegendTitle.className = "gl-legend-section__title";
  overlayLegendTitle.textContent = "PRISM Annual Precip";
  overlayLegendSection.appendChild(overlayLegendTitle);
  const overlayLegendBody = document.createElement("div");
  overlayLegendSection.appendChild(overlayLegendBody);
  overlayLegend.appendChild(overlayLegendSection);
  mapShell.appendChild(overlayLegend);
  const mapContent = document.createElement("div");
  mapContent.className = "space-y-3";
  mapContent.appendChild(mapShell);
  mapContent.appendChild(overlayControls);
  const mapSection = createCollapsibleSection({
    id: "rockclim-map-section",
    title: "Map Location",
    description: "Pick a location to set latitude/longitude and view stations.",
    content: mapContent,
    persistKey: "fswepp2_rockclim_map_open",
    defaultOpen: false,
  });

  const stationParContent = document.createElement("div");
  stationParContent.className = "space-y-3";
  const stationParMeta = document.createElement("div");
  stationParMeta.className = "flex flex-wrap items-center justify-between gap-2";
  const stationParStatus = document.createElement("p");
  stationParStatus.className = "text-sm text-muted-foreground";
  const stationParDownload = document.createElement("a");
  stationParDownload.className =
    "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-base font-medium transition-all border border-border bg-background hover:bg-accent";
  stationParDownload.textContent = "Download .par";
  stationParDownload.href = "#";
  stationParDownload.setAttribute("aria-disabled", "true");
  stationParDownload.addEventListener("click", (event) => {
    if (stationParDownload.getAttribute("aria-disabled") === "true") {
      event.preventDefault();
    }
  });
  stationParMeta.appendChild(stationParStatus);
  stationParMeta.appendChild(stationParDownload);
  const stationParBlock = createPreformattedBlock({
    id: "rockclim-station-par",
    className: "max-h-80 overflow-y-auto",
  });
  stationParContent.appendChild(stationParMeta);
  stationParContent.appendChild(stationParBlock.pre);
  const stationParSection = createCollapsibleSection({
    id: "rockclim-station-par-section",
    title: "Station Par File",
    description: "Prefetch and download the current station .par file.",
    content: stationParContent,
    persistKey: "fswepp2_rockclim_par_open",
    defaultOpen: false,
  });

  const climateFileContent = document.createElement("div");
  climateFileContent.className = "space-y-3";
  const climateFileMeta = document.createElement("div");
  climateFileMeta.className = "flex flex-wrap items-center justify-between gap-2";
  const climateFileStatus = document.createElement("p");
  climateFileStatus.className = "text-sm text-muted-foreground";
  const climateFileDownload = document.createElement("a");
  climateFileDownload.className =
    "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-base font-medium transition-all border border-border bg-background hover:bg-accent";
  climateFileDownload.textContent = "Download .cli";
  climateFileDownload.href = "#";
  climateFileDownload.setAttribute("aria-disabled", "true");
  climateFileDownload.addEventListener("click", (event) => {
    if (climateFileDownload.getAttribute("aria-disabled") === "true") {
      event.preventDefault();
    }
  });
  climateFileMeta.appendChild(climateFileStatus);
  climateFileMeta.appendChild(climateFileDownload);
  const climateFileBlock = createPreformattedBlock({
    id: "rockclim-climate-file",
    className: "max-h-80 overflow-y-auto",
  });
  climateFileContent.appendChild(climateFileMeta);
  climateFileContent.appendChild(climateFileBlock.pre);
  const climateFileSection = createCollapsibleSection({
    id: "rockclim-climate-file-section",
    title: "Climate File",
    description: "Prefetch and download the generated climate .cli file.",
    content: climateFileContent,
    persistKey: "fswepp2_rockclim_cli_open",
    defaultOpen: false,
  });

  const leftCol = document.createElement("div");
  leftCol.className = "space-y-4";
  leftCol.appendChild(databaseField.wrapper);
  leftCol.appendChild(cligenField.wrapper);
  const coordRow = document.createElement("div");
  coordRow.className = "grid gap-3 sm:grid-cols-2";
  coordRow.appendChild(lonField.wrapper);
  coordRow.appendChild(latField.wrapper);
  leftCol.appendChild(coordRow);

  const rightCol = document.createElement("div");
  rightCol.className = "space-y-4";
  rightCol.appendChild(stationField.wrapper);
  rightCol.appendChild(prismField.wrapper);
  const customizeRow = document.createElement("div");
  customizeRow.className = "grid grid-cols-2 gap-2";
  deleteClimateButton.style.display = "none";
  customizeRow.appendChild(customizeButton);
  customizeRow.appendChild(deleteClimateButton);
  rightCol.appendChild(customizeRow);
  rightCol.appendChild(climateUpload.wrapper);

  const controlGrid = document.createElement("div");
  controlGrid.className = "grid gap-6 lg:grid-cols-2";
  controlGrid.appendChild(leftCol);
  controlGrid.appendChild(rightCol);

  const content = document.createElement("div");
  content.className = "space-y-4";
  content.appendChild(controlGrid);
  content.appendChild(mapSection);
  content.appendChild(stationParSection);
  content.appendChild(climateFileSection);

  const section = createCollapsibleSection({
    id: "rockclim-control",
    title: "Rock Climate Control",
    description: "Climate: Not set",
    content,
    persistKey: "fswepp2_rockclim_open",
    defaultOpen: false,
  });
  root.appendChild(section);

  function updateClimateBadge() {
    const station = stations.find((s) => s.id === climateState.par_id);
    const stationName = station ? station.desc || station.id : climateState.par_id;
    const locationSummary = formatLocationSummary(climateState.location);
    let prefix = "";
    let summary = "";
    if (climateState.user_defined_par_mod) {
      const desc =
        climateState.user_defined_par_mod.description ||
        stationName ||
        "Custom climate";
      prefix = "Customized ";
      summary = `Climate: ${prefix}${desc}`;
    } else if (climateState.use_prism) {
      prefix = "PRISM modified ";
    }
    summary =
      summary ||
      (stationName ? `Climate: ${prefix}${stationName}` : "Climate: Not set");
    if (locationSummary) summary += ` (${locationSummary})`;
    if (section.setDescription) section.setDescription(summary);
  }

  function sanitizeFilename(value) {
    if (!value) return "station";
    const cleaned = String(value)
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9._-]/gi, "");
    if (!cleaned) return "station";
    return cleaned;
  }

  function buildStationParFilename() {
    let baseId = sanitizeFilename(climateState.par_id);
    if (baseId.toLowerCase().endsWith(".par")) {
      baseId = baseId.slice(0, -4);
    }
    const parts = [];
    if (climateState.user_defined_par_mod) parts.push("customized");
    if (climateState.use_prism) parts.push("prism-modified");
    const prefix = parts.length ? `${parts.join("-")}-` : "";
    return `${prefix}${baseId || "station"}.par`;
  }

  function buildClimateFileFilename() {
    let baseId = sanitizeFilename(climateState.par_id);
    if (baseId.toLowerCase().endsWith(".par")) {
      baseId = baseId.slice(0, -4);
    }
    const parts = [];
    if (climateState.user_defined_par_mod) parts.push("customized");
    if (climateState.use_prism) parts.push("prism-modified");
    const prefix = parts.length ? `${parts.join("-")}-` : "";
    return `${prefix}${baseId || "station"}.cli`;
  }

  function resetStationParState() {
    stationParKey = null;
    stationParBlobKey = null;
    stationParText = "";
    stationParError = null;
    stationParLoading = false;
    clearStationParDownload();
    updateStationParUi();
  }

  function resetClimateFileState() {
    climateFileKey = null;
    climateFileBlobKey = null;
    climateFileText = "";
    climateFileError = null;
    climateFileLoading = false;
    clearClimateFileDownload();
    updateClimateFileUi();
  }

  function applyImportedClimateState(payload) {
    climateState = writeClimateState(payload);
    databaseField.select.value = climateState.database;
    cligenField.select.value = climateState.cligen_version;
    if (climateState.location) {
      setLocationFields(climateState.location.longitude, climateState.location.latitude);
    } else {
      lonField.input.value = "";
      latField.input.value = "";
    }
    stationField.setOptions([
      {
        value: "",
        label: climateState.par_id
          ? climateState.par_id
          : climateState.location
            ? "Imported location (no station list)"
            : "Set location to load stations",
      },
    ]);
    if (climateState.par_id) {
      ensureStationOption(climateState.par_id, climateState.par_id);
      stationField.select.value = climateState.par_id;
    }
    prismField.input.checked = Boolean(climateState.use_prism);
    syncPrismOverlayControls();
    resetStationParState();
    resetClimateFileState();
    persistState({ skipPrefetch: true });
    if (mapInstance && climateState.location) {
      mapViewState = {
        ...mapViewState,
        longitude: climateState.location.longitude,
        latitude: climateState.location.latitude,
      };
      mapInstance.setProps({ viewState: mapViewState });
      updateMapLayers();
    }
    maybeLoadPrismOverlay();
  }

  async function handleClimateImport(file, { setStatus } = {}) {
    if (!file) return;
    if (Number.isFinite(file.size) && file.size > 3072) {
      setStatus?.("File too large. Max size is 3KB.", true);
      return;
    }
    setStatus?.("Importing...");
    try {
      const text = await file.text();
      let payload = JSON.parse(text);
      if (payload && typeof payload === "object" && payload.climate) {
        payload = payload.climate;
      }
      if (!payload || typeof payload !== "object") {
        setStatus?.("Invalid climate JSON.", true);
        return;
      }
      if (!isValidClimateImport(payload)) {
        setStatus?.("Climate JSON failed validation.", true);
        return;
      }
      applyImportedClimateState(payload);
      setStatus?.(`Imported ${file.name || "climate.json"}`);
    } catch (error) {
      console.error("[rockclim] Failed to import climate JSON", error);
      setStatus?.("Unable to import climate file.", true);
    }
  }

  function isValidClimateImport(payload) {
    const allowedDatabases = new Set(["legacy", "2015", "au", "ghcn"]);
    const allowedCligen = new Set(["4.3", "5.3.2"]);

    if (
      payload.database &&
      (!allowedDatabases.has(payload.database) || typeof payload.database !== "string")
    ) {
      return false;
    }
    if (
      payload.cligen_version &&
      (!allowedCligen.has(payload.cligen_version) ||
        typeof payload.cligen_version !== "string")
    ) {
      return false;
    }
    if (payload.location) {
      const lon = Number(payload.location.longitude);
      const lat = Number(payload.location.latitude);
      if (!isLongitude(lon) || !isLatitude(lat)) return false;
    }
    if (payload.par_id && typeof payload.par_id !== "string") return false;
    if (payload.input_years != null) {
      const years = Number(payload.input_years);
      if (!Number.isFinite(years) || years < 1 || years > 200) return false;
    }
    if (payload.use_prism != null && typeof payload.use_prism !== "boolean") {
      return false;
    }
    if (payload.user_defined_par_mod != null) {
      const mod = payload.user_defined_par_mod;
      if (!mod || typeof mod !== "object") return false;
      if (mod.description != null && typeof mod.description !== "string") {
        return false;
      }
      const isNumberArray = (arr) =>
        Array.isArray(arr) &&
        arr.length === 12 &&
        arr.every((value) => Number.isFinite(Number(value)));
      if (
        !isNumberArray(mod.ppts) ||
        !isNumberArray(mod.tmaxs) ||
        !isNumberArray(mod.tmins)
      ) {
        return false;
      }
    }
    return true;
  }

  function setStationParDownloadEnabled(enabled) {
    stationParDownload.setAttribute("aria-disabled", enabled ? "false" : "true");
    stationParDownload.tabIndex = enabled ? 0 : -1;
    stationParDownload.classList.toggle("opacity-60", !enabled);
    stationParDownload.classList.toggle("pointer-events-none", !enabled);
    if (!enabled) {
      stationParDownload.removeAttribute("href");
      stationParDownload.removeAttribute("download");
    }
  }

  function clearStationParDownload() {
    if (stationParBlobUrl) {
      URL.revokeObjectURL(stationParBlobUrl);
    }
    stationParBlobUrl = "";
    stationParFilename = "";
    stationParKey = null;
    stationParBlobKey = null;
    setStationParDownloadEnabled(false);
  }

  function setClimateFileDownloadEnabled(enabled) {
    climateFileDownload.setAttribute("aria-disabled", enabled ? "false" : "true");
    climateFileDownload.tabIndex = enabled ? 0 : -1;
    climateFileDownload.classList.toggle("opacity-60", !enabled);
    climateFileDownload.classList.toggle("pointer-events-none", !enabled);
    if (!enabled) {
      climateFileDownload.removeAttribute("href");
      climateFileDownload.removeAttribute("download");
    }
  }

  function clearClimateFileDownload() {
    if (climateFileBlobUrl) {
      URL.revokeObjectURL(climateFileBlobUrl);
    }
    climateFileBlobUrl = "";
    climateFileFilename = "";
    climateFileKey = null;
    climateFileBlobKey = null;
    setClimateFileDownloadEnabled(false);
  }

  function ensureClimateFileDownload(filename) {
    if (!climateFileText || !climateFileKey) {
      clearClimateFileDownload();
      return;
    }
    if (
      climateFileBlobUrl &&
      climateFileKey === climateFileBlobKey &&
      climateFileDownload.getAttribute("download") === filename
    ) {
      setClimateFileDownloadEnabled(true);
      return;
    }
    if (climateFileBlobUrl) {
      URL.revokeObjectURL(climateFileBlobUrl);
    }
    const blob = new Blob([climateFileText], {
      type: "text/plain;charset=utf-8",
    });
    climateFileBlobUrl = URL.createObjectURL(blob);
    climateFileBlobKey = climateFileKey;
    climateFileFilename = filename;
    climateFileDownload.href = climateFileBlobUrl;
    climateFileDownload.download = filename;
    setClimateFileDownloadEnabled(true);
  }

  function ensureStationParDownload(filename) {
    if (!stationParText || !stationParKey) {
      clearStationParDownload();
      return;
    }
    if (
      stationParBlobUrl &&
      stationParKey === stationParBlobKey &&
      stationParDownload.getAttribute("download") === filename
    ) {
      setStationParDownloadEnabled(true);
      return;
    }
    if (stationParBlobUrl) {
      URL.revokeObjectURL(stationParBlobUrl);
    }
    const blob = new Blob([stationParText], {
      type: "text/plain;charset=utf-8",
    });
    stationParBlobUrl = URL.createObjectURL(blob);
    stationParBlobKey = stationParKey;
    stationParFilename = filename;
    stationParDownload.href = stationParBlobUrl;
    stationParDownload.download = filename;
    setStationParDownloadEnabled(true);
  }

  function updateStationParUi() {
    if (!climateState.par_id) {
      stationParStatus.textContent = "Select a station to load the .par file.";
      stationParBlock.setText("");
      clearStationParDownload();
      return;
    }
    if (stationParLoading) {
      stationParStatus.textContent = "Loading station .par file...";
      stationParBlock.setText(stationParText || "");
      setStationParDownloadEnabled(false);
      return;
    }
    if (stationParError) {
      stationParStatus.textContent = stationParError;
      stationParBlock.setText("");
      setStationParDownloadEnabled(false);
      return;
    }
    if (stationParText) {
      const filename = stationParFilename || buildStationParFilename();
      stationParStatus.textContent = `Loaded ${filename}`;
      stationParBlock.setText(stationParText);
      ensureStationParDownload(filename);
      return;
    }
    stationParStatus.textContent = "Station .par file is not available yet.";
    stationParBlock.setText("");
    setStationParDownloadEnabled(false);
  }

  function updateClimateFileUi() {
    if (!climateState.par_id) {
      climateFileStatus.textContent = "Select a station to load the climate file.";
      climateFileBlock.setText("");
      clearClimateFileDownload();
      return;
    }
    if (climateFileLoading) {
      climateFileStatus.textContent = "Loading climate file...";
      climateFileBlock.setText(climateFileText || "");
      setClimateFileDownloadEnabled(false);
      return;
    }
    if (climateFileError) {
      climateFileStatus.textContent = climateFileError;
      climateFileBlock.setText("");
      setClimateFileDownloadEnabled(false);
      return;
    }
    if (climateFileText) {
      const filename = climateFileFilename || buildClimateFileFilename();
      climateFileStatus.textContent = `Loaded ${filename}`;
      climateFileBlock.setText(climateFileText);
      ensureClimateFileDownload(filename);
      return;
    }
    climateFileStatus.textContent = "Climate file is not available yet.";
    climateFileBlock.setText("");
    setClimateFileDownloadEnabled(false);
  }

  function buildStationParKey() {
    if (!climateState.par_id) return null;
    const locationKey = climateState.location
      ? `${climateState.location.longitude},${climateState.location.latitude}`
      : "";
    const mod = climateState.user_defined_par_mod;
    const modKey = mod
      ? `${mod.ppts.join(",")}|${mod.tmaxs.join(",")}|${mod.tmins.join(",")}`
      : "";
    const prismKey = climateState.use_prism ? "prism" : "base";
    return [
      climateState.database || "legacy",
      climateState.par_id,
      prismKey,
      locationKey,
      modKey,
    ].join("|");
  }

  function buildClimateFileKey() {
    if (!climateState.par_id) return null;
    const locationKey = climateState.location
      ? `${climateState.location.longitude},${climateState.location.latitude}`
      : "";
    const mod = climateState.user_defined_par_mod;
    const modKey = mod
      ? `${mod.ppts.join(",")}|${mod.tmaxs.join(",")}|${mod.tmins.join(",")}`
      : "";
    const prismKey = climateState.use_prism ? "prism" : "base";
    const yearsKey = Number.isFinite(Number(climateState.input_years))
      ? Number(climateState.input_years)
      : "";
    return [
      climateState.database || "legacy",
      climateState.par_id,
      prismKey,
      locationKey,
      modKey,
      climateState.cligen_version || "",
      yearsKey,
    ].join("|");
  }

  async function prefetchStationPar() {
    const key = buildStationParKey();
    if (!key) {
      stationParLoading = false;
      stationParError = null;
      stationParText = "";
      clearStationParDownload();
      updateStationParUi();
      return;
    }
    if (stationParKey === key && stationParText) {
      updateStationParUi();
      return;
    }
    stationParLoading = true;
    stationParError = null;
    stationParText = "";
    clearStationParDownload();
    updateStationParUi();
    const requestId = ++stationParRequestId;
    try {
      const payload = {
        par_id: climateState.par_id,
        database: climateState.database,
        use_prism: Boolean(climateState.use_prism),
      };
      if (climateState.location) payload.location = climateState.location;
      if (climateState.user_defined_par_mod) {
        payload.user_defined_par_mod = climateState.user_defined_par_mod;
      }
      const response = await apiPost(
        "/api/rockclim/GET/station_par",
        payload,
        { timeoutMs: 20000 }
      );
      if (requestId !== stationParRequestId) return;
      stationParKey = key;
      stationParText = typeof response === "string" ? response : "";
      stationParFilename = buildStationParFilename();
      stationParLoading = false;
      stationParError = null;
      updateStationParUi();
    } catch (error) {
      if (requestId !== stationParRequestId) return;
      stationParLoading = false;
      stationParError = "Unable to load station .par file.";
      stationParText = "";
      clearStationParDownload();
      updateStationParUi();
      console.error("[rockclim] Failed to load station par file", error);
    }
  }

  async function prefetchClimateFile() {
    const key = buildClimateFileKey();
    if (!key) {
      climateFileLoading = false;
      climateFileError = null;
      climateFileText = "";
      clearClimateFileDownload();
      updateClimateFileUi();
      return;
    }
    if (climateFileKey === key && climateFileText) {
      updateClimateFileUi();
      return;
    }
    climateFileLoading = true;
    climateFileError = null;
    climateFileText = "";
    clearClimateFileDownload();
    updateClimateFileUi();
    const requestId = ++climateFileRequestId;
    try {
      const payload = {
        par_id: climateState.par_id,
        database: climateState.database,
        use_prism: Boolean(climateState.use_prism),
        cligen_version: climateState.cligen_version,
        input_years: climateState.input_years,
      };
      if (climateState.location) payload.location = climateState.location;
      if (climateState.user_defined_par_mod) {
        payload.user_defined_par_mod = climateState.user_defined_par_mod;
      }
      const response = await apiPost(
        "/api/rockclim/GET/climate",
        payload,
        { timeoutMs: 20000 }
      );
      if (requestId !== climateFileRequestId) return;
      climateFileKey = key;
      climateFileText = typeof response === "string" ? response : "";
      climateFileFilename = buildClimateFileFilename();
      climateFileLoading = false;
      climateFileError = null;
      updateClimateFileUi();
    } catch (error) {
      if (requestId !== climateFileRequestId) return;
      climateFileLoading = false;
      climateFileError = "Unable to load climate file.";
      climateFileText = "";
      clearClimateFileDownload();
      updateClimateFileUi();
      console.error("[rockclim] Failed to load climate file", error);
    }
  }

  const debouncedStationParPrefetch = createDebounce(prefetchStationPar, 450);
  const debouncedClimateFilePrefetch = createDebounce(prefetchClimateFile, 450);

  function persistState(options = {}) {
    const { skipPrefetch = false } = options;
    const prismAllowed = isPrismAllowed(climateState.database);
    const locationAvailable = hasValidLocation(climateState, lonField.input, latField.input);
    if (!locationAvailable) {
      climateState.use_prism = false;
      prismField.input.checked = false;
    }
    if (!prismAllowed) {
      climateState.use_prism = false;
      prismField.input.checked = false;
    }
    prismField.input.disabled =
      !locationAvailable ||
      !prismAllowed ||
      Boolean(climateState.user_defined_par_mod);
    stationField.select.disabled = !climateState.location;
    customizeButton.disabled = !climateState.par_id;
    deleteClimateButton.style.display = climateState.user_defined_par_mod
      ? ""
      : "none";
    climateState = writeClimateState(climateState);
    updateClimateBadge();
    const station = stations.find((s) => s.id === climateState.par_id);
    const stationName = station ? station.desc || station.id : climateState.par_id;
    const locationSummary = formatLocationSummary(climateState.location);
    let prefix = "";
    if (climateState.user_defined_par_mod) {
      prefix = "Customized ";
    } else if (climateState.use_prism) {
      prefix = "PRISM modified ";
    }
    let summary = stationName
      ? `Climate: ${prefix}${stationName}`
      : "Climate: Not set";
    if (locationSummary) summary += ` (${locationSummary})`;
    if (!skipPrefetch) {
      debouncedStationParPrefetch();
      debouncedClimateFilePrefetch();
    }
    syncPrismOverlayControls();
  }

  function setLocationFields(lon, lat) {
    if (Number.isFinite(lon)) lonField.input.value = lon.toFixed(5);
    if (Number.isFinite(lat)) latField.input.value = lat.toFixed(5);
  }

  function ensureStationOption(id, label) {
    const existing = Array.from(stationField.select.options).find(
      (opt) => opt.value === id
    );
    if (existing) return;
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = label || id;
    stationField.select.appendChild(opt);
  }

  async function fetchClosestStations() {
    if (!climateState.location) return;
    try {
      const payload = {
        database: climateState.database,
        location: climateState.location,
      };
      const response = await apiPost(
        "/api/rockclim/GET/closest_stations",
        payload,
        { timeoutMs: 20000 }
      );
      stations = Array.isArray(response) ? response.slice(0, STATION_LIMIT) : [];
      const options = stations.length
        ? stations.map((station) => ({
            value: station.id,
            label: formatStationLabel(station),
          }))
        : [{ value: "", label: "No stations found" }];
      stationField.setOptions(options);
      if (!stations.length) {
        climateState.par_id = null;
        persistState();
        return;
      }
      const hasCurrent = stations.find((s) => s.id === climateState.par_id);
      if (!hasCurrent && climateState.par_id) {
        ensureStationOption(climateState.par_id, climateState.par_id);
      } else if (!hasCurrent) {
        climateState.par_id = stations[0].id;
        climateState.user_defined_par_mod = null;
      }
      stationField.select.value = climateState.par_id || stations[0].id;
      persistState();
    } catch (error) {
      stationField.setOptions([
        { value: "", label: "Unable to load stations" },
      ]);
      console.error("[rockclim] Failed to load closest stations", error);
    }
  }

  const debouncedClosestStations = createDebounce(fetchClosestStations, 450);

  function getViewBounds() {
    if (!mapViewState || !mapContainer) return null;
    if (!window.deck || !window.deck.WebMercatorViewport) return null;
    const viewport = new window.deck.WebMercatorViewport({
      longitude: mapViewState.longitude,
      latitude: mapViewState.latitude,
      zoom: mapViewState.zoom,
      bearing: mapViewState.bearing || 0,
      pitch: mapViewState.pitch || 0,
      width: mapContainer.clientWidth || 1,
      height: mapContainer.clientHeight || 1,
    });
    const bounds = viewport.getBounds();
    if (!bounds || bounds.length < 4) return null;
    const [minLng, minLat, maxLng, maxLat] = bounds;
    return [minLng, maxLat, maxLng, minLat];
  }

  async function fetchStationsGeojson() {
    const bbox = getViewBounds();
    if (!bbox) return;
    try {
      const response = await apiPost("/api/rockclim/GET/stations_geojson", {
        database: climateState.database,
        bbox,
      });
      stationsGeojson = response;
      updateMapLayers();
    } catch (error) {
      console.error("[rockclim] Failed to load stations geojson", error);
    }
  }

  const debouncedStationsGeo = createDebounce(fetchStationsGeojson, 400);

  function updateOverlayLegend() {
    const unitKey = getLegendUnitKey();
    const unitLabel = unitKey === "in" ? "in." : "mm";
    overlayLegendTitle.textContent = `PRISM Annual Precip (${unitLabel})`;
    overlayLegendBody.replaceChildren(
      renderCategoricalLegend(buildLegendItems(unitKey))
    );
  }

  function updatePrecipSummary() {
    if (!climateState.location || !prismOverlay.raster || !prismOverlay.bounds) {
      overlaySummaryValue.textContent = "--";
      overlaySummaryUnit.textContent = getLegendUnitKey() === "in" ? "in" : "mm";
      return;
    }
    const [minX, minY, maxX, maxY] = prismOverlay.bounds;
    const { longitude, latitude } = climateState.location;
    const width = prismOverlay.width;
    const height = prismOverlay.height;
    if (!width || !height) {
      overlaySummaryValue.textContent = "--";
      return;
    }
    const xRatio = (longitude - minX) / (maxX - minX);
    const yRatio = (maxY - latitude) / (maxY - minY);
    const col = Math.round(xRatio * (width - 1));
    const row = Math.round(yRatio * (height - 1));
    if (col < 0 || row < 0 || col >= width || row >= height) {
      overlaySummaryValue.textContent = "--";
      overlaySummaryUnit.textContent = getLegendUnitKey() === "in" ? "in" : "mm";
      return;
    }
    const idx = row * width + col;
    const valueMm = prismOverlay.raster[idx];
    if (!Number.isFinite(valueMm) || valueMm <= -9990) {
      overlaySummaryValue.textContent = "--";
      overlaySummaryUnit.textContent = getLegendUnitKey() === "in" ? "in" : "mm";
      return;
    }
    const unitKey = getLegendUnitKey();
    if (unitKey === "in") {
      const inches = valueMm * 0.0393701;
      overlaySummaryValue.textContent = inches.toFixed(2);
      overlaySummaryUnit.textContent = "in";
    } else {
      overlaySummaryValue.textContent = `${Math.round(valueMm)}`;
      overlaySummaryUnit.textContent = "mm";
    }
  }

  function syncPrismOverlayControls() {
    const enabled = Boolean(climateState.use_prism);
    overlayControls.style.display = enabled ? "flex" : "none";
    if (!enabled) {
      overlayLegend.style.display = "none";
      return;
    }
    updateOverlayLegend();
    updatePrecipSummary();
    overlayLegend.style.display = prismOverlay.canvas ? "block" : "none";
  }

  async function loadPrismOverlay() {
    if (prismOverlay.canvas || prismOverlay.promise) return prismOverlay.promise;
    if (!window.GeoTIFF || !window.GeoTIFF.fromUrl) {
      console.warn("[rockclim] GeoTIFF library not available.");
      return null;
    }

    prismOverlay.status = "loading";
    prismOverlay.promise = (async () => {
      const tiff = await window.GeoTIFF.fromUrl(PRISM_PPT_COG_URL);
      const image = await tiff.getImage();
      const width = image.getWidth();
      const height = image.getHeight();
      const targetWidth = Math.min(PRISM_OVERLAY_MAX_WIDTH, width);
      const targetHeight = Math.max(
        1,
        Math.round((height / width) * targetWidth)
      );
      const raster = await image.readRasters({
        width: targetWidth,
        height: targetHeight,
        interleave: true,
      });
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Canvas 2D context unavailable.");
      }
      const imageData = ctx.createImageData(targetWidth, targetHeight);
      const rgba = imageData.data;
      for (let i = 0; i < raster.length; i += 1) {
        const value = raster[i];
        const offset = i * 4;
        if (!Number.isFinite(value) || value <= -9990) {
          rgba[offset + 3] = 0;
          continue;
        }
        const inches = value / 25.4;
        const [r, g, b, a] = colorForPrecipInches(inches);
        rgba[offset] = r;
        rgba[offset + 1] = g;
        rgba[offset + 2] = b;
        rgba[offset + 3] = a;
      }
      ctx.putImageData(imageData, 0, 0);
      const bounds = image.getBoundingBox();
      prismOverlay.canvas = canvas;
      prismOverlay.bounds = bounds;
      prismOverlay.raster = raster;
      prismOverlay.width = targetWidth;
      prismOverlay.height = targetHeight;
      prismOverlay.status = "ready";
      prismOverlay.error = null;
      syncPrismOverlayControls();
      updateMapLayers();
    })().catch((error) => {
      prismOverlay.status = "error";
      prismOverlay.error = error;
      console.error("[rockclim] Failed to load PRISM overlay", error);
    });

    return prismOverlay.promise;
  }

  function maybeLoadPrismOverlay() {
    if (!climateState.use_prism || !mapSection.isOpen()) return;
    if (!mapInstance) return;
    if (prismOverlay.canvas) {
      syncPrismOverlayControls();
      updateMapLayers();
      updatePrecipSummary();
      return;
    }
    void loadPrismOverlay();
  }

  function updateMapLayers() {
    if (!mapInstance || !window.deck) return;
    const layers = [];
    if (window.deck.TileLayer && window.deck.BitmapLayer) {
      layers.push(
        new window.deck.TileLayer({
          id: "osm-tiles",
          data: null,
          minZoom: 0,
          maxZoom: 19,
          tileSize: 256,
          loadOptions: {
            image: {
              crossOrigin: "anonymous",
            },
          },
          getTileData: ({ index }) => {
            const { x, y, z } = index || {};
            if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
              return null;
            }
            return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
          },
          renderSubLayers: (props) => {
            let bounds = null;
            const tile = props.tile;
            if (tile?.boundingBox && Array.isArray(tile.boundingBox)) {
              const [[minX, minY], [maxX, maxY]] = tile.boundingBox;
              bounds = [minX, minY, maxX, maxY];
            } else if (tile?.bbox && typeof tile.bbox === "object") {
              const b = tile.bbox;
              const west = b.west ?? b.left;
              const east = b.east ?? b.right;
              const south = b.south ?? b.bottom;
              const north = b.north ?? b.top;
              if ([west, east, south, north].every(Number.isFinite)) {
                bounds = [west, south, east, north];
              }
            }
            if (!bounds) return null;
            return new window.deck.BitmapLayer({
              id: `${props.id}-bitmap`,
              bounds,
              image: props.data,
            });
          },
        })
      );
    }

    if (
      climateState.use_prism &&
      prismOverlay.canvas &&
      prismOverlay.bounds &&
      window.deck.BitmapLayer
    ) {
      layers.push(
        new window.deck.BitmapLayer({
          id: "prism-annual-ppt",
          bounds: prismOverlay.bounds,
          image: prismOverlay.canvas,
          opacity: prismOverlayOpacity,
          pickable: false,
        })
      );
    }

    const features = stationsGeojson?.features || [];
    if (window.deck.GeoJsonLayer && features.length) {
      layers.push(
        new window.deck.GeoJsonLayer({
          id: "stations",
          data: stationsGeojson,
          pointRadiusMinPixels: 3,
          pointRadiusMaxPixels: 6,
          getPointRadius: 80,
          getFillColor: [33, 102, 172, 180],
          pickable: true,
        })
      );
    } else if (window.deck.ScatterplotLayer && features.length) {
      layers.push(
        new window.deck.ScatterplotLayer({
          id: "stations",
          data: features,
          getPosition: (d) => d.geometry.coordinates,
          getRadius: 120,
          radiusMinPixels: 3,
          radiusMaxPixels: 6,
          getFillColor: [33, 102, 172, 180],
          pickable: true,
        })
      );
    }

    if (window.deck.ScatterplotLayer && climateState.location) {
      layers.push(
        new window.deck.ScatterplotLayer({
          id: "selected-location",
          data: [climateState.location],
          getPosition: (d) => [d.longitude, d.latitude],
          getRadius: 250,
          radiusMinPixels: 6,
          radiusMaxPixels: 12,
          getFillColor: [239, 68, 68, 200],
          pickable: false,
        })
      );
    }

    mapInstance.setProps({ layers });
  }

  function initMap() {
    if (mapInstance) return;
    if (!window.deck || !window.deck.DeckGL) {
      mapContainer.innerHTML =
        "<div class='flex h-full items-center justify-center text-sm text-muted-foreground'>WebGL is unavailable in this browser.</div>";
      return;
    }
    const initial = climateState.location
      ? {
          longitude: climateState.location.longitude,
          latitude: climateState.location.latitude,
          zoom: 7,
        }
      : { longitude: -116, latitude: 47, zoom: 5 };
    mapViewState = { ...initial, bearing: 0, pitch: 0 };
    mapInstance = new window.deck.DeckGL({
      container: mapContainer,
      controller: true,
      initialViewState: mapViewState,
      getTooltip: ({ object }) => {
        if (!object) return null;
        const props = object.properties || object;
        if (!props) return null;
        const name = props.desc || props.id || "Station";
        const elevation = props.elevation ? `${Math.round(props.elevation)} m` : "";
        return {
          text: [name, elevation].filter(Boolean).join(" • "),
        };
      },
      onViewStateChange: ({ viewState }) => {
        mapViewState = viewState;
        debouncedStationsGeo();
      },
      onClick: (info) => {
        if (!info || !info.coordinate) return;
        const [lon, lat] = info.coordinate;
        setLocationFromMap(lon, lat);
      },
    });
    updateMapLayers();
    debouncedStationsGeo();
  }

  function setLocationFromMap(lon, lat) {
    if (!isLongitude(lon) || !isLatitude(lat)) return;
    setLocationFields(lon, lat);
    climateState.location = { longitude: Number(lon), latitude: Number(lat) };
    climateState.user_defined_par_mod = null;
    prismField.input.disabled = false;
    persistState();
    debouncedClosestStations();
    updateMapLayers();
    updatePrecipSummary();
  }

  function setLocationFromInputs() {
    const lon = Number(lonField.input.value);
    const lat = Number(latField.input.value);
    if (!isLongitude(lon) || !isLatitude(lat)) return;
    climateState.location = { longitude: lon, latitude: lat };
    climateState.user_defined_par_mod = null;
    prismField.input.disabled = false;
    persistState();
    if (mapInstance) {
      mapViewState = { ...mapViewState, longitude: lon, latitude: lat };
      mapInstance.setProps({ viewState: mapViewState });
      updateMapLayers();
    }
    debouncedClosestStations();
    updatePrecipSummary();
  }

  function syncMapOpenState() {
    if (!mapSection.isOpen()) return;
    initMap();
    if (mapInstance) {
      mapInstance.setProps({
        width: mapContainer.clientWidth,
        height: mapContainer.clientHeight,
      });
      updateMapLayers();
    }
    maybeLoadPrismOverlay();
  }


  async function openCustomizeModal() {
    if (!climateState.par_id) return;
    try {
      customizeButton.disabled = true;
      customizeButton.textContent = "Loading...";
      const payload = {
        par_id: climateState.par_id,
        database: climateState.database,
        use_prism: Boolean(climateState.use_prism),
      };
      if (climateState.location) payload.location = climateState.location;
      const monthlies = await apiPost(
        "/api/rockclim/GET/station_par_monthlies",
        payload,
        { timeoutMs: 20000 }
      );
      buildCustomizeModal(monthlies);
      openModal("rockclim-customize-modal");
    } catch (error) {
      console.error("[rockclim] Failed to load station monthlies", error);
    } finally {
      customizeButton.disabled = false;
      customizeButton.textContent = "Customize Climate";
    }
  }

  function buildCustomizeModal(monthlies) {
    const modal = document.getElementById("rockclim-customize-modal");
    if (modal) modal.remove();

    let unitizerClient = null;

    const station = stations.find((s) => s.id === climateState.par_id);
    const stationLabel = station ? station.desc || station.id : climateState.par_id;
    const descriptionValue =
      climateState.user_defined_par_mod?.description || stationLabel || "";

    const header = document.createElement("div");
    header.className = "space-y-1 mb-4";
    const stationInfo = document.createElement("p");
    stationInfo.className = "text-sm text-muted-foreground";
    stationInfo.textContent = `Station: ${stationLabel || "Unknown"}`;
    header.appendChild(stationInfo);

    const descField = createFormField({
      id: "rockclim_custom_desc",
      label: "Custom Climate Name",
      value: descriptionValue,
      placeholder: "My custom climate",
    });
    header.appendChild(descField.wrapper);

    const unitToggle = document.createElement("div");
    unitToggle.className = "flex items-center pt-2 justify-end";
    unitToggle.innerHTML = `
      <div class="ml-auto flex items-center gap-2 text-sm" data-unit-toggle-modal>
        <button type="button" class="text-muted-foreground px-1 py-1" data-unit-label="metric">Metric</button>
        <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" class="sr-only peer" id="unit_toggle_modal_input" />
          <div class="h-5 w-9 rounded-full bg-primary transition-colors"></div>
          <div class="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-background shadow peer-checked:translate-x-4 transition-transform"></div>
        </label>
        <button type="button" class="text-muted-foreground px-1 py-1" data-unit-label="english">English</button>
      </div>
    `;
    header.appendChild(unitToggle);

    const original = {
      ppts: Array.isArray(monthlies?.ppts) ? monthlies.ppts : [],
      tmaxs: Array.isArray(monthlies?.tmaxs) ? monthlies.tmaxs : [],
      tmins: Array.isArray(monthlies?.tmins) ? monthlies.tmins : [],
    };
    const current = climateState.user_defined_par_mod
      ? {
          ppts: climateState.user_defined_par_mod.ppts,
          tmaxs: climateState.user_defined_par_mod.tmaxs,
          tmins: climateState.user_defined_par_mod.tmins,
        }
      : original;

    let modalEl = null;

    function readCanonicalValue(input) {
      const stored = input.dataset.unitizerCanonicalValue;
      if (stored && stored !== "") {
        const parsed = Number(stored);
        if (Number.isFinite(parsed)) return parsed;
      }
      const raw = Number(input.value);
      return Number.isFinite(raw) ? raw : null;
    }

    function getActiveUnit(category, fallback) {
      if (unitizerClient) {
        const prefs = unitizerClient.getPreferencePayload();
        if (prefs && prefs[category]) {
          return prefs[category];
        }
      }
      return fallback;
    }

    function updateInputs(inputs, values) {
      inputs.forEach((input, i) => {
        const value = Number(values[i]);
        if (!Number.isFinite(value)) return;
        input.value = value.toFixed(2);
        input.dataset.unitizerCanonicalValue = value.toFixed(2);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      if (unitizerClient && modalEl) {
        unitizerClient.updateNumericFields(modalEl);
      }
    }

    function createMonthTable(
      title,
      unit,
      values,
      currentValues = values,
      unitizerCategory = null,
      unitizerUnit = null,
      adjustKind = null,
      adjustCategory = null
    ) {
      const table = document.createElement("table");
      table.className =
        "w-full text-sm border border-border rounded-md table-fixed";
      const thead = document.createElement("thead");
      const colgroup = document.createElement("colgroup");
      colgroup.innerHTML = `
        <col style="width:32%" />
        <col style="width:34%" />
        <col style="width:34%" />
      `;
      table.appendChild(colgroup);
      const unitLabel = unitizerCategory
        ? `<span data-unitizer-label data-unitizer-category="${unitizerCategory}" data-unitizer-unit="${unitizerUnit || unit}">${unit}</span>`
        : unit;
      thead.innerHTML = `<tr class="bg-muted text-left">
        <th class="px-3 py-2 align-middle h-12 whitespace-nowrap">Month</th>
        <th class="px-3 py-2 align-middle h-12 whitespace-nowrap">Original (${unitLabel})</th>
        <th class="px-3 py-2 align-middle h-12 whitespace-nowrap">Custom (${unitLabel})</th>
      </tr>`;
      table.appendChild(thead);
      const tbody = document.createElement("tbody");
      const inputs = [];
      MONTH_NAMES.forEach((month, index) => {
        const row = document.createElement("tr");
        row.className = "border-t border-border";
        const originalValue = Number(values[index] ?? 0);
        const currentValue = Number(currentValues[index] ?? originalValue);
        row.innerHTML = `
          <td class="px-3 py-2">${month}</td>
          <td class="px-3 py-2 text-muted-foreground">
            <span class="unitizer-value" data-unitizer-original="true" data-unitizer-unit="${unitizerUnit || ""}" data-unitizer-value="${originalValue.toFixed(2)}">
              ${originalValue.toFixed(2)}
            </span>
          </td>
          <td class="px-3 py-2"></td>
        `;
        const input = document.createElement("input");
        input.type = "number";
        input.step = "0.01";
        input.value = currentValue.toFixed(2);
        if (unitizerCategory && unitizerUnit) {
          input.setAttribute("data-unitizer-category", unitizerCategory);
          input.setAttribute("data-unitizer-unit", unitizerUnit);
          input.setAttribute("data-precision", "2");
        }
        input.className =
          "w-full rounded-md border border-input bg-background px-2 py-1 text-sm";
        row.children[2].appendChild(input);
        inputs.push(input);
        tbody.appendChild(row);
      });
      table.appendChild(tbody);

      if (adjustKind) {
        const tfoot = document.createElement("tfoot");
        const adjustRow = document.createElement("tr");
        adjustRow.className = "border-t border-border bg-muted/40";
        adjustRow.innerHTML = `
          <td class="px-3 py-2 text-xs text-muted-foreground">Adjust all</td>
          <td class="px-3 py-2"></td>
          <td class="px-3 py-2"></td>
        `;
        const adjustCell = adjustRow.children[2];
        const adjustWrap = document.createElement("div");
        adjustWrap.className = "flex items-center justify-end gap-2";
        const adjustLabel = document.createElement("span");
        adjustLabel.className = "text-sm font-semibold";
        adjustLabel.textContent = "+/-";
        const adjustInput = document.createElement("input");
        adjustInput.type = "number";
        adjustInput.step = adjustKind === "percent" ? "1" : "0.1";
        adjustInput.placeholder = "0";
        adjustInput.className =
          "w-24 rounded-md border border-input bg-background px-2 py-1 text-sm text-right";
        const adjustUnit = document.createElement("span");
        adjustUnit.className = "text-xs text-muted-foreground";
        if (adjustKind === "percent") {
          adjustUnit.textContent = "%";
        } else {
          adjustUnit.textContent = unit;
          if (unitizerCategory && unitizerUnit) {
            adjustUnit.setAttribute("data-unitizer-label", "");
            adjustUnit.setAttribute("data-unitizer-category", unitizerCategory);
            adjustUnit.setAttribute("data-unitizer-unit", unitizerUnit);
          }
        }
        const applyAdjustment = () => {
          const raw = Number(adjustInput.value);
          if (!Number.isFinite(raw)) return;
          const baseValues = inputs.map((input) => readCanonicalValue(input));
          if (baseValues.some((v) => !Number.isFinite(v))) return;
          if (adjustKind === "percent") {
            const factor = 1 + raw / 100;
            updateInputs(inputs, baseValues.map((v) => v * factor));
            return;
          }
          let delta = raw;
          const activeUnit = getActiveUnit(
            adjustCategory || unitizerCategory,
            unitizerUnit || unit
          );
          if (adjustCategory === "temperature" && activeUnit === "degf") {
            delta = raw * (5 / 9);
          }
          if (adjustCategory === "xs-distance" && activeUnit === "in") {
            delta = raw * 25.4;
          }
          updateInputs(inputs, baseValues.map((v) => v + delta));
        };
        adjustInput.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            applyAdjustment();
          }
        });
        adjustInput.addEventListener("blur", applyAdjustment);
        adjustWrap.appendChild(adjustLabel);
        adjustWrap.appendChild(adjustInput);
        adjustWrap.appendChild(adjustUnit);
        adjustCell.appendChild(adjustWrap);
        tfoot.appendChild(adjustRow);
        table.appendChild(tfoot);
      }
      return { table, inputs };
    }

    const pptTable = createMonthTable(
      "Monthly Precipitation (per wet day)",
      "mm",
      original.ppts,
      current.ppts,
      "xs-distance",
      "mm",
      "percent",
      "xs-distance"
    );
    const tmaxTable = createMonthTable(
      "Monthly Max Temperature (°C)",
      "°C",
      original.tmaxs,
      current.tmaxs,
      "temperature",
      "degc",
      "offset",
      "temperature"
    );
    const tminTable = createMonthTable(
      "Monthly Min Temperature (°C)",
      "°C",
      original.tmins,
      current.tmins,
      "temperature",
      "degc",
      "offset",
      "temperature"
    );

    const tablesWrap = document.createElement("div");
    tablesWrap.className = "grid gap-4 lg:grid-cols-3";
    const pptCard = document.createElement("div");
    pptCard.className = "space-y-2 min-w-0";
    pptCard.innerHTML = "<h4 class='font-medium'>Monthly Precipitation (per wet day)</h4>";
    const pptWrap = document.createElement("div");
    pptWrap.className = "overflow-x-auto";
    pptWrap.appendChild(pptTable.table);
    pptCard.appendChild(pptWrap);
    const tmaxCard = document.createElement("div");
    tmaxCard.className = "space-y-2 min-w-0";
    tmaxCard.innerHTML = "<h4 class='font-medium'>Monthly Max Temp (°C)</h4>";
    const tmaxWrap = document.createElement("div");
    tmaxWrap.className = "overflow-x-auto";
    tmaxWrap.appendChild(tmaxTable.table);
    tmaxCard.appendChild(tmaxWrap);
    const tminCard = document.createElement("div");
    tminCard.className = "space-y-2 min-w-0";
    tminCard.innerHTML = "<h4 class='font-medium'>Monthly Min Temp (°C)</h4>";
    const tminWrap = document.createElement("div");
    tminWrap.className = "overflow-x-auto";
    tminWrap.appendChild(tminTable.table);
    tminCard.appendChild(tminWrap);
    tablesWrap.appendChild(pptCard);
    tablesWrap.appendChild(tmaxCard);
    tablesWrap.appendChild(tminCard);

    const body = document.createElement("div");
    body.className = "space-y-4";
    body.appendChild(header);
    body.appendChild(tablesWrap);

    function collectInputs() {
      const ppts = pptTable.inputs.map((input) => readCanonicalValue(input));
      const tmaxs = tmaxTable.inputs.map((input) => readCanonicalValue(input));
      const tmins = tminTable.inputs.map((input) => readCanonicalValue(input));
      if (ppts.some((v) => !Number.isFinite(v))) return null;
      if (tmaxs.some((v) => !Number.isFinite(v))) return null;
      if (tmins.some((v) => !Number.isFinite(v))) return null;
      return { ppts, tmaxs, tmins };
    }

    function resetInputs(inputs, originals) {
      const values = originals.map((value) => Number(value ?? 0));
      updateInputs(inputs, values);
    }

    const resetButton = createButton("Reset to Original", "outline", {
      onClick: () => {
        resetInputs(pptTable.inputs, original.ppts);
        resetInputs(tmaxTable.inputs, original.tmaxs);
        resetInputs(tminTable.inputs, original.tmins);
      },
    });

    const exportButton = createButton("Export to JSON", "outline", {
      onClick: () => {
        const payload = collectInputs();
        if (!payload) return;
        const description = descField.input.value.trim() || "Custom Climate";
        const exportPayload = {
          database: climateState.database,
          cligen_version: climateState.cligen_version,
          location: climateState.location,
          par_id: climateState.par_id,
          input_years: climateState.input_years,
          use_prism: climateState.use_prism,
          user_defined_par_mod: {
            description,
            ...payload,
          },
        };
        const json = JSON.stringify(exportPayload, null, 2);
        const filenameBase = sanitizeFilename(description || climateState.par_id);
        const filename = `rockclim-${filenameBase || "climate"}.json`;
        const blob = new Blob([json], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      },
    });

    const applyButton = createButton("Apply", "default", {
      onClick: () => {
        const payload = collectInputs();
        if (!payload) return;
        climateState.user_defined_par_mod = {
          description: descField.input.value.trim() || "Custom Climate",
          ...payload,
        };
        persistState();
        closeModal("rockclim-customize-modal");
      },
    });

    const cancelButton = createButton("Cancel", "outline", {
      onClick: () => closeModal("rockclim-customize-modal"),
    });

    const footer = document.createElement("div");
    footer.className = "flex w-full items-center justify-between gap-2";
    const footerLeft = document.createElement("div");
    footerLeft.className = "flex items-center gap-2";
    footerLeft.appendChild(exportButton);
    const footerRight = document.createElement("div");
    footerRight.className = "flex items-center gap-2";
    footerRight.appendChild(resetButton);
    footerRight.appendChild(applyButton);
    footerRight.appendChild(cancelButton);
    footer.appendChild(footerLeft);
    footer.appendChild(footerRight);

    modalEl = createModal({
      id: "rockclim-customize-modal",
      title: "Customize Climate Parameters",
      content: body,
      actions: [footer],
    });
    document.body.appendChild(modalEl);
    if (window.UnitizerClient && window.UnitizerClient.ready) {
      window.UnitizerClient.ready().then((client) => {
        unitizerClient = client;
        const updateOriginals = () => {
          const originals = modalEl.querySelectorAll("[data-unitizer-original]");
          originals.forEach((el) => {
            const value = el.getAttribute("data-unitizer-value");
            const unitKey = el.getAttribute("data-unitizer-unit");
            if (!unitKey) return;
            el.innerHTML = client.renderValue(value, unitKey, { precision: 2 });
          });
        };

        client.registerNumericInputs(modalEl);
        client.updateNumericFields(modalEl);
        client.updateUnitLabels(modalEl);
        updateOriginals();
        const modalToggle = modalEl.querySelector("#unit_toggle_modal_input");
        const modalMetric = modalEl.querySelector('[data-unit-toggle-modal] [data-unit-label="metric"]');
        const modalEnglish = modalEl.querySelector('[data-unit-toggle-modal] [data-unit-label="english"]');
        const headerToggle = document.getElementById("unit_toggle_input");
        const headerMetric = document.querySelector('[data-unit-toggle] [data-unit-label="metric"]');
        const headerEnglish = document.querySelector('[data-unit-toggle] [data-unit-label="english"]');

        const setToggleUi = (isEnglish) => {
          if (modalToggle) modalToggle.checked = Boolean(isEnglish);
          if (modalMetric) modalMetric.classList.toggle("font-semibold", !isEnglish);
          if (modalEnglish) modalEnglish.classList.toggle("font-semibold", isEnglish);
        };

        const syncHeaderToggle = (isEnglish) => {
          if (headerToggle) headerToggle.checked = Boolean(isEnglish);
          if (headerMetric) headerMetric.classList.toggle("font-semibold", !isEnglish);
          if (headerEnglish) headerEnglish.classList.toggle("font-semibold", isEnglish);
        };

        const applyGlobalPreference = (isEnglish) => {
          client.setGlobalPreference(isEnglish ? 1 : 0);
          client.updateNumericFields(document);
          client.updateUnitLabels(document);
          client.dispatchPreferenceChange();
          setToggleUi(isEnglish);
          syncHeaderToggle(isEnglish);
        };

        const getIsEnglish = () => {
          const prefs = client.getPreferencePayload();
          return prefs.temperature === "degf";
        };

        setToggleUi(getIsEnglish());

        if (modalToggle) {
          modalToggle.addEventListener("change", () => {
            applyGlobalPreference(modalToggle.checked);
          });
        }
        if (modalMetric) {
          modalMetric.addEventListener("click", () => applyGlobalPreference(false));
        }
        if (modalEnglish) {
          modalEnglish.addEventListener("click", () => applyGlobalPreference(true));
        }

        document.addEventListener("unitizer:preferences-changed", () => {
          setToggleUi(getIsEnglish());
          updateOriginals();
        });
      });
    }
  }

  databaseField.select.value = climateState.database;
  cligenField.select.value = climateState.cligen_version;
  if (climateState.location) {
    setLocationFields(climateState.location.longitude, climateState.location.latitude);
  }
  if (climateState.par_id) {
    ensureStationOption(climateState.par_id, climateState.par_id);
    stationField.select.value = climateState.par_id;
  }
  prismField.input.checked = Boolean(climateState.use_prism);
  prismField.input.disabled = !climateState.location;
  syncPrismOverlayControls();
  updateClimateBadge();
  persistState();
  updateStationParUi();
  updateClimateFileUi();

  if (climateState.location) {
    debouncedClosestStations();
  }

  databaseField.select.addEventListener("change", () => {
    climateState.database = databaseField.select.value;
    climateState.par_id = null;
    climateState.user_defined_par_mod = null;
    persistState();
    if (mapSection.isOpen()) {
      debouncedStationsGeo();
    }
    if (climateState.location) {
      debouncedClosestStations();
    }
  });

  cligenField.select.addEventListener("change", () => {
    climateState.cligen_version = cligenField.select.value;
    persistState();
  });

  mapSection.header.addEventListener("click", () => {
    if (mapSection.isOpen()) {
      syncMapOpenState();
    }
  });

  const debouncedInputLocation = createDebounce(setLocationFromInputs, 400);
  lonField.input.addEventListener("input", debouncedInputLocation);
  latField.input.addEventListener("input", debouncedInputLocation);

  stationField.select.addEventListener("change", () => {
    climateState.par_id = stationField.select.value || null;
    climateState.user_defined_par_mod = null;
    persistState();
  });

  prismField.input.addEventListener("change", () => {
    if (prismField.input.checked && !climateState.location) {
      setLocationFromInputs();
    }
    const prismAllowed = isPrismAllowed(climateState.database);
    const locationAvailable = hasValidLocation(climateState, lonField.input, latField.input);
    climateState.use_prism = prismField.input.checked && prismAllowed && locationAvailable;
    prismField.input.checked = climateState.use_prism;
    persistState();
    syncPrismOverlayControls();
    if (climateState.use_prism) {
      maybeLoadPrismOverlay();
    } else {
      updateMapLayers();
    }
  });

  overlayRange.addEventListener("input", () => {
    prismOverlayOpacity = Number(overlayRange.value);
    overlayValue.textContent = `${Math.round(prismOverlayOpacity * 100)}%`;
    updateMapLayers();
  });

  document.addEventListener("unitizer:preferences-changed", () => {
    if (!climateState.use_prism) return;
    updateOverlayLegend();
    updatePrecipSummary();
  });

  customizeButton.addEventListener("click", openCustomizeModal);
  deleteClimateButton.addEventListener("click", () => {
    const modal = document.getElementById("rockclim-delete-modal");
    if (modal) modal.remove();
    const body = document.createElement("div");
    body.innerHTML =
      "<p class='text-sm text-muted-foreground'>Remove the custom climate adjustments and revert to the base station values?</p>";
    const confirmButton = createButton("Delete", "destructive", {
      onClick: () => {
        climateState.user_defined_par_mod = null;
        persistState();
        closeModal("rockclim-delete-modal");
      },
    });
    const cancelButton = createButton("Cancel", "outline", {
      onClick: () => closeModal("rockclim-delete-modal"),
    });
    const confirmModal = createModal({
      id: "rockclim-delete-modal",
      title: "Delete Custom Climate",
      content: body,
      actions: [cancelButton, confirmButton],
    });
    document.body.appendChild(confirmModal);
    openModal("rockclim-delete-modal");
  });

  window.addEventListener("resize", () => {
    if (mapInstance && mapSection.isOpen()) {
      mapInstance.setProps({
        width: mapContainer.clientWidth,
        height: mapContainer.clientHeight,
      });
    }
  });

  if (mapSection.isOpen()) {
    syncMapOpenState();
  }
  maybeLoadPrismOverlay();
}
