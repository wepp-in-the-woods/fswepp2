/**
 * BAER Burned Area Reports DB
 *
 * A page to view database containing post-fire assessment information from four decades of US Forest Service Burned Area Reports.
 *
 */

import { createFormField, createMultiSelectField } from "../components/form-field.js";
import { createRunButton } from "../components/run-button.js";
import { createCollapsibleSection } from "../components/collapsible.js";
import { createPreformattedBlock } from "../components/preformatted.js";
import { apiPost } from "../utils/api-client.js";
import { createButton } from "../components/button.js";
import { createTabPanel } from "../components/tabs.js";
import { createDataTable } from "../components/data-table.js";
import { createElement, Funnel, RotateCcw } from 'lucide';

/**
 * Unitizer helper functions
 * Handle unit conversions and preferences
 */

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

  if (client) {
    const prefs = client.getPreferencePayload?.() || {};
    unitKey = prefs[categoryKey] || canonicalUnit;
  } else if (override === "english") {
    // Add English unit mappings as needed
    if (categoryKey === "xs-distance") unitKey = "in";
    if (categoryKey === "sm-distance") unitKey = "ft";
  } else if (override === "metric") {
    // Add metric unit mappings as needed
    if (categoryKey === "xs-distance") unitKey = "mm";
    if (categoryKey === "sm-distance") unitKey = "m";
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

/**
 * Helper to create form sections with headings
 */
function createSection(title) {
  const section = document.createElement("fieldset");
  section.className = "space-y-4 border-l-2 border-primary pl-4";
  const legend = document.createElement("legend");
  legend.className = "text-lg font-semibold text-foreground";
  legend.textContent = title;
  section.appendChild(legend);
  return section;
}

/**
 * Main mount function
 * Called from app.js with the root DOM element
 */
export function mountBurnedAreaReports(root) {
  if (!root) return;

  // Filter states
  const filterState = {
    region: [],
    state: [],
    nationalForest: [],
    treatmentType: [],
    fromDate: null,
    toDate: null,
  }

  let lastResults = null;

  // Map
  let mapInstance = null;
  let mapViewState = null;

  root.innerHTML = "";
  const container = document.createElement("div");
  container.className = "space-y-8";

  // ===== HEADER SECTION =====
  const header = document.createElement("div");
  header.className = "flex flex-col gap-3";

  const headerRow = document.createElement("div");
  headerRow.className = "flex flex-row items-start gap-3";

  const icon = document.createElement("img");
  icon.src = "/public/baer-reports.svg"; // Update with actual icon path
  icon.alt = "BAER Burned Area Reports DB icon";
  icon.className = "h-12 w-12";

  const headingWrap = document.createElement("div");
  const title = document.createElement("h1");
  title.className = "text-foreground";
  title.textContent = "BAER Burned Area Reports DB";

  const subtitle = document.createElement("p");
  subtitle.className = "text-sm text-muted-foreground";
  subtitle.textContent = "Database containing post-fire assessment information from four decades of US Forest Service Burned Area Reports.";

  headingWrap.appendChild(title);
  headingWrap.appendChild(subtitle);
  headerRow.appendChild(icon);
  headerRow.appendChild(headingWrap);
  header.appendChild(headerRow);

  container.appendChild(header);

  // ===== FORM SECTION =====
  const form = document.createElement("form");
  form.className = "space-y-6";
  form.addEventListener("submit", (event) => event.preventDefault());

  const filterSectionContent = document.createElement("div");
  filterSectionContent.className = "grid grid-flow-row grid-cols-1 lg:grid-cols-3 gap-4";

  const locationFiltersDiv = document.createElement("div");
  locationFiltersDiv.className = "grid grid-cols-1 lg:grid-cols-3 gap-4 lg:col-span-3";

  const usfsRegionField = createMultiSelectField({
    id: "region-filter",
    label: "By USFS Region",
    required: false,
    options: [
      { value: "1", label: "Region 1 (Northern)" },
      { value: "2", label: "Region 2 (Rocky Mountain)" },
      { value: "3", label: "Region 3 (Southwestern)" },
      { value: "4", label: "Region 4 (Intermountain)" },
      { value: "5", label: "Region 5 (Pacific Southwest)" },
      { value: "6", label: "Region 6 (Pacific Northwest)" },
      { value: "8", label: "Region 8 (Southern)" },
      { value: "9", label: "Region 9 (Eastern)" },
      { value: "10", label: "Region 10 (Alaska/others)" },
      { value: "11", label: "Region 0 (Westwide Info)"}
    ],
    placeholder: "Select region/s",
    help: "",
    onChange: (selected) => {
      filterState.region = selected;
    },
  });

  const stateField = createMultiSelectField({
    id: "state-filter",
    label: "By state",
    required: false,
    options: [
      { value: "AL", label: "Alabama" },
      { value: "AK", label: "Alaska" },
      { value: "AZ", label: "Arizona" },
      { value: "AR", label: "Arkansas" },
      { value: "CA", label: "California" },
      { value: "CO", label: "Colorado" },
      { value: "CT", label: "Connecticut" },
      { value: "DE", label: "Delaware" },
      { value: "FL", label: "Florida" },
      { value: "GA", label: "Georgia" },
      { value: "HI", label: "Hawaii" },
      { value: "ID", label: "Idaho" },
      { value: "IL", label: "Illinois" },
      { value: "IN", label: "Indiana" },
      { value: "IA", label: "Iowa" },
      { value: "KS", label: "Kansas" },
      { value: "KY", label: "Kentucky" },
      { value: "LA", label: "Louisiana" },
      { value: "ME", label: "Maine" },
      { value: "MD", label: "Maryland" },
      { value: "MA", label: "Massachusetts" },
      { value: "MI", label: "Michigan" },
      { value: "MN", label: "Minnesota" },
      { value: "MS", label: "Mississippi" },
      { value: "MO", label: "Missouri" },
      { value: "MT", label: "Montana" },
      { value: "NE", label: "Nebraska" },
      { value: "NV", label: "Nevada" },
      { value: "NH", label: "New Hampshire" },
      { value: "NJ", label: "New Jersey" },
      { value: "NM", label: "New Mexico" },
      { value: "NY", label: "New York" },
      { value: "NC", label: "North Carolina" },
      { value: "ND", label: "North Dakota" },
      { value: "OH", label: "Ohio" },
      { value: "OK", label: "Oklahoma" },
      { value: "OR", label: "Oregon" },
      { value: "PA", label: "Pennsylvania" },
      { value: "RI", label: "Rhode Island" },
      { value: "SC", label: "South Carolina" },
      { value: "SD", label: "South Dakota" },
      { value: "TN", label: "Tennessee" },
      { value: "TX", label: "Texas" },
      { value: "UT", label: "Utah" },
      { value: "VT", label: "Vermont" },
      { value: "VA", label: "Virginia" },
      { value: "WA", label: "Washington" },
      { value: "WV", label: "West Virginia" },
      { value: "WI", label: "Wisconsin" },
      { value: "WY", label: "Wyoming" },
    ],
    placeholder: "Select state/s",
    help: "",
    onChange: (selected) => {
      filterState.state = selected;
    },
  });

  const nationalForestField = createMultiSelectField({
    id: "national-forest-filter",
    label: "By national forest",
    required: false,
    options: [
      { value: "Allegheny", label: "Allegheny" },
      { value: "Angeles", label: "Angeles" },
      { value: "Angelina", label: "Angelina" },
      { value: "Apache-Sitgreaves", label: "Apache-Sitgreaves" },
      { value: "Apalachicola", label: "Apalachicola" },
      { value: "Arapaho-Roosevelt", label: "Arapaho-Roosevelt" },
      { value: "Ashley", label: "Ashley" },
      { value: "Beaverhead-Deerlodge", label: "Beaverhead-Deerlodge" },
      { value: "Bienville", label: "Bienville" },
      { value: "Bighorn", label: "Bighorn" },
      { value: "Bitterroot", label: "Bitterroot" },
      { value: "Black Hills", label: "Black Hills" },
      { value: "Boise", label: "Boise" },
      { value: "Bridger-Teton", label: "Bridger-Teton" },
      { value: "Caribou", label: "Caribou" },
      { value: "Caribou-Targhee", label: "Caribou-Targhee" },
      { value: "Carson", label: "Carson" },
      { value: "Chattahoochee-Oconee", label: "Chattahoochee-Oconee" },
      { value: "Chequamegon-Nicolet", label: "Chequamegon-Nicolet" },
      { value: "Cherokee", label: "Cherokee" },
      { value: "Chippewa", label: "Chippewa" },
      { value: "Chugach", label: "Chugach" },
      { value: "Cibola", label: "Cibola" },
      { value: "Clearwater", label: "Clearwater" },
      { value: "Cleveland", label: "Cleveland" },
      { value: "Coconino", label: "Coconino" },
      { value: "Colville", label: "Colville" },
      { value: "Conecuh", label: "Conecuh" },
      { value: "Coronado", label: "Coronado" },
      { value: "Croatan", label: "Croatan" },
      { value: "Custer", label: "Custer" },
      { value: "Dakota Prairie Grasslands", label: "Dakota Prairie Grasslands" },
      { value: "Daniel Boone", label: "Daniel Boone" },
      { value: "Davy Crockett", label: "Davy Crockett" },
      { value: "De Soto", label: "De Soto" },
      { value: "Delta", label: "Delta" },
      { value: "Deschutes", label: "Deschutes" },
      { value: "Dixie", label: "Dixie" },
      { value: "El Yunque", label: "El Yunque" },
      { value: "Eldorado", label: "Eldorado" },
      { value: "Finger Lakes", label: "Finger Lakes" },
      { value: "Fishlake", label: "Fishlake" },
      { value: "Flathead", label: "Flathead" },
      { value: "Francis Marion", label: "Francis Marion" },
      { value: "Fremont", label: "Fremont" },
      { value: "Fremont-Winema", label: "Fremont-Winema" },
      { value: "Gallatin", label: "Gallatin" },
      { value: "George Washington", label: "George Washington" },
      { value: "George Washington-Jefferson", label: "George Washington-Jefferson" },
      { value: "Gifford Pinchot", label: "Gifford Pinchot" },
      { value: "Gila", label: "Gila" },
      { value: "Grand Mesa-Uncompahgre", label: "Grand Mesa-Uncompahgre" },
      { value: "Green Mountain", label: "Green Mountain" },
      { value: "Gunnison", label: "Gunnison" },
      { value: "Helena", label: "Helena" },
      { value: "Hiawatha", label: "Hiawatha" },
      { value: "Holly Springs", label: "Holly Springs" },
      { value: "Homochitto", label: "Homochitto" },
      { value: "Hoosier", label: "Hoosier" },
      { value: "Humboldt-Toiyabe", label: "Humboldt-Toiyabe" },
      { value: "Huron-Manistee", label: "Huron-Manistee" },
      { value: "Idaho Panhandle", label: "Idaho Panhandle" },
      { value: "Inyo", label: "Inyo" },
      { value: "Kaibab", label: "Kaibab" },
      { value: "Kisatchie", label: "Kisatchie" },
      { value: "Klamath", label: "Klamath" },
      { value: "Kootenai", label: "Kootenai" },
      { value: "Lake Tahoe Basin Mu", label: "Lake Tahoe Basin Mu" },
      { value: "Land Between The Lakes", label: "Land Between The Lakes" },
      { value: "Lassen", label: "Lassen" },
      { value: "Lewis And Clark", label: "Lewis And Clark" },
      { value: "Lincoln", label: "Lincoln" },
      { value: "Lolo", label: "Lolo" },
      { value: "Los Padres", label: "Los Padres" },
      { value: "Malheur", label: "Malheur" },
      { value: "Manti-Lasal", label: "Manti-Lasal" },
      { value: "Mark Twain", label: "Mark Twain" },
      { value: "Medicine Bow-Routt", label: "Medicine Bow-Routt" },
      { value: "Mendocino", label: "Mendocino" },
      { value: "Mississippi Nfs", label: "Mississippi Nfs" },
      { value: "Modoc", label: "Modoc" },
      { value: "Monongahela", label: "Monongahela" },
      { value: "Mount Hood", label: "Mount Hood" },
      { value: "Mt Baker-Snoqualmie", label: "Mt Baker-Snoqualmie" },
      { value: "Nantahala", label: "Nantahala" },
      { value: "Nebraska", label: "Nebraska" },
      { value: "Nez Perce", label: "Nez Perce" },
      { value: "Ocala", label: "Ocala" },
      { value: "Ochoco", label: "Ochoco" },
      { value: "Okanogan", label: "Okanogan" },
      { value: "Okanogan-Wenatchee", label: "Okanogan-Wenatchee" },
      { value: "Olympic", label: "Olympic" },
      { value: "Osceola", label: "Osceola" },
      { value: "Ottawa", label: "Ottawa" },
      { value: "Ouachita", label: "Ouachita" },
      { value: "Ozark-St Francis", label: "Ozark-St Francis" },
      { value: "Payette", label: "Payette" },
      { value: "Pike", label: "Pike" },
      { value: "Pike-San Isabel", label: "Pike-San Isabel" },
      { value: "Pisgah", label: "Pisgah" },
      { value: "Plumas", label: "Plumas" },
      { value: "Prescott", label: "Prescott" },
      { value: "Region1", label: "Region1" },
      { value: "Region2", label: "Region2" },
      { value: "Region3", label: "Region3" },
      { value: "Region4", label: "Region4" },
      { value: "Region5", label: "Region5" },
      { value: "Region6", label: "Region6" },
      { value: "Rio Grande", label: "Rio Grande" },
      { value: "Rogue River", label: "Rogue River" },
      { value: "Rogue River-Siskiyou", label: "Rogue River-Siskiyou" },
      { value: "Roosevelt", label: "Roosevelt" },
      { value: "Sabine", label: "Sabine" },
      { value: "Salmon-Challis", label: "Salmon-Challis" },
      { value: "Sam Houston", label: "Sam Houston" },
      { value: "Samuel R Mckelvie", label: "Samuel R Mckelvie" },
      { value: "San Bernardino", label: "San Bernardino" },
      { value: "San Isabel", label: "San Isabel" },
      { value: "San Juan", label: "San Juan" },
      { value: "San Juan-Rio Grande", label: "San Juan-Rio Grande" },
      { value: "Santa Fe", label: "Santa Fe" },
      { value: "Sawtooth", label: "Sawtooth" },
      { value: "Sequoia", label: "Sequoia" },
      { value: "Shasta-Trinity", label: "Shasta-Trinity" },
      { value: "Shoshone", label: "Shoshone" },
      { value: "Sierra", label: "Sierra" },
      { value: "Siskiyou", label: "Siskiyou" },
      { value: "Siuslaw", label: "Siuslaw" },
      { value: "Six Rivers", label: "Six Rivers" },
      { value: "Stanislaus", label: "Stanislaus" },
      { value: "Sumter", label: "Sumter" },
      { value: "Superior", label: "Superior" },
      { value: "Tahoe", label: "Tahoe" },
      { value: "Talladega", label: "Talladega" },
      { value: "Targhee", label: "Targhee" },
      { value: "Tombigbee", label: "Tombigbee" },
      { value: "Tongass", label: "Tongass" },
      { value: "Tonto", label: "Tonto" },
      { value: "Tuskegee", label: "Tuskegee" },
      { value: "Uinta", label: "Uinta" },
      { value: "Uinta-Wasatch-Cache", label: "Uinta-Wasatch-Cache" },
      { value: "Umatilla", label: "Umatilla" },
      { value: "Umpqua", label: "Umpqua" },
      { value: "Uncompahgre", label: "Uncompahgre" },
      { value: "Uwharrie", label: "Uwharrie" },
      { value: "Wallowa-Whitman", label: "Wallowa-Whitman" },
      { value: "Wasatch-Cache", label: "Wasatch-Cache" },
      { value: "Wayne", label: "Wayne" },
      { value: "Wenatchee", label: "Wenatchee" },
      { value: "Westwide Info", label: "Westwide Info" },
      { value: "White Mountain", label: "White Mountain" },
      { value: "White River", label: "White River" },
      { value: "Willamette", label: "Willamette" },
      { value: "William B Bankhead", label: "William B Bankhead" },
      { value: "Winema", label: "Winema" }
    ],
    placeholder: "Select national forest/s",
    help: "",
    onChange: (selected) => {
      filterState.nationalForest = selected;
    },
  });

  locationFiltersDiv.appendChild(usfsRegionField.wrapper);
  locationFiltersDiv.appendChild(stateField.wrapper);
  locationFiltersDiv.appendChild(nationalForestField.wrapper);

  const treatmentTypeField = createMultiSelectField({
    id: "treatment-type-filter",
    label: "By treatment type",
    required: false,
    options: [
      { value: "armored ford crossing", label: "armored ford crossing" },
      { value: "channel debris clearing", label: "channel debris clearing" },
      { value: "channel deflectors", label: "channel deflectors" },
      { value: "closures", label: "closures" },
      { value: "contour felling", label: "contour felling" },
      { value: "contour trenching", label: "contour trenching" },
      { value: "cross drain ditches", label: "cross drain ditches" },
      { value: "cultural protection", label: "cultural protection" },
      { value: "culvert cleaning", label: "culvert cleaning" },
      { value: "culvert inlet/outlet armoring", label: "culvert inlet/outlet armoring" },
      { value: "culvert overflow bypass", label: "culvert overflow bypass" },
      { value: "culvert removal", label: "culvert removal" },
      { value: "culvert risers", label: "culvert risers" },
      { value: "culvert upgrading", label: "culvert upgrading" },
      { value: "debris basins", label: "debris basins" },
      { value: "ditch cleaning, armoring", label: "ditch cleaning, armoring" },
      { value: "early warning system", label: "early warning system" },
      { value: "geotextile fabrics/ geowebbing", label: "geotextile fabrics/ geowebbing" },
      { value: "hazard trees/unstable rock", label: "hazard trees/unstable rock" },
      { value: "herbicide", label: "herbicide" },
      { value: "hydromulch,aerial", label: "hydromulch,aerial" },
      { value: "hydromulch,ground", label: "hydromulch,ground" },
      { value: "in-channel felling", label: "in-channel felling" },
      { value: "log dams", label: "log dams" },
      { value: "log grade stabilizers", label: "log grade stabilizers" },
      { value: "mulching", label: "mulching" },
      { value: "other", label: "other" },
      { value: "outsloping road", label: "outsloping road" },
      { value: "plantings (trees and riparian)", label: "plantings (trees and riparian)" },
      { value: "road rip, drain, and stabilize", label: "road rip, drain, and stabilize" },
      { value: "road work, other", label: "road work, other" },
      { value: "rock cage (gabion) dams", label: "rock cage (gabion) dams" },
      { value: "rock grade stabilizers", label: "rock grade stabilizers" },
      { value: "rolling dips/water bars", label: "rolling dips/water bars" },
      { value: "sand, soil, or gravel bags", label: "sand, soil, or gravel bags" },
      { value: "seeding - aerial", label: "seeding - aerial" },
      { value: "seeding - ground", label: "seeding - ground" },
      { value: "seeding and fertilizer", label: "seeding and fertilizer" },
      { value: "silt fence", label: "silt fence" },
      { value: "slash spreading", label: "slash spreading" },
      { value: "soil scarification", label: "soil scarification" },
      { value: "storm patrol", label: "storm patrol" },
      { value: "straw bale check dams", label: "straw bale check dams" },
      { value: "straw mulch, aerial", label: "straw mulch, aerial" },
      { value: "straw mulch, ground", label: "straw mulch, ground" },
      { value: "straw wattle dams", label: "straw wattle dams" },
      { value: "straw wattles", label: "straw wattles" },
      { value: "stream bank/channel armoring", label: "stream bank/channel armoring" },
      { value: "temporary fencing/ cattle exclusion", label: "temporary fencing/ cattle exclusion" },
      { value: "tilling/ripping", label: "tilling/ripping" },
      { value: "trail work", label: "trail work" },
      { value: "trash racks", label: "trash racks" },
      { value: "warning signs", label: "warning signs" },
      { value: "weed survey/treatment", label: "weed survey/treatment" },
      { value: "wood shreds", label: "wood shreds" },
      { value: "woodstraw", label: "woodstraw" },
    ],
    placeholder: "Select treatment type/s",
    help: "",
    onChange: (selected) => {
      filterState.treatmentType = selected;
    },
  });

  treatmentTypeField.wrapper.classList.add("col-span-1", "lg:col-span-1");

  const dateRangeFilter = document.createElement("div");
  dateRangeFilter.className = "flex flex-col gap-2 col-span-1 lg:col-span-1";

  const dateRangeLabel = document.createElement("label");
  dateRangeLabel.className = "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70";
  dateRangeLabel.textContent = "By date range";
  dateRangeFilter.appendChild(dateRangeLabel);

  const dateRangeFields = document.createElement("div");
  dateRangeFields.className = "flex flex-row items-center gap-3 w-full";

  const fromDateField = createFormField({
    id: "from-date",
    type: "date",
    label: "",
    required: false,
  });
  fromDateField.input.addEventListener("change", () => {
    filterState.fromDate = fromDateField.input.value || null;
  });
  fromDateField.wrapper.classList.add("flex-1");
  dateRangeFields.appendChild(fromDateField.wrapper);
  dateRangeFields.appendChild(document.createTextNode("to"));
  const toDateField = createFormField({
    id: "to-date",
    type: "date",
    label: "",
    required: false,
  });
  toDateField.input.addEventListener("change", () => {
    filterState.toDate = toDateField.input.value || null;
  });
  toDateField.wrapper.classList.add("flex-1");
  dateRangeFields.appendChild(toDateField.wrapper);

  // Add cross-field validation logic
  fromDateField.input.addEventListener("change", () => {
    if (fromDateField.input.value) {
      toDateField.input.min = fromDateField.input.value;
      // Clear end date if it's before the new start date
      if (toDateField.input.value && toDateField.input.value < fromDateField.input.value) {
        toDateField.input.value = "";
      }
    }
  });

  toDateField.input.addEventListener("change", () => {
    if (toDateField.input.value) {
      fromDateField.input.max = toDateField.input.value;
      // Clear start date if it's after the new end date
      if (fromDateField.input.value && fromDateField.input.value > toDateField.input.value) {
        fromDateField.input.value = "";
      }
    }
  });

  dateRangeFilter.appendChild(dateRangeFields);

  const buttonGroup = document.createElement("div");
  buttonGroup.className = "flex flex-col lg:flex-row items-stretch lg:items-center gap-2";

  const filterIcon = createElement(Funnel);
  const applyFiltersButton = createButton("Apply Filters", "default", {
    onClick: () => {
      applyFilters();
    },
  }, filterIcon);

  const resetIcon = createElement(RotateCcw);
  const resetFiltersButton = createButton("Reset Filters", "outline", {
    onClick: () => {
      usfsRegionField.setSelectedValues([]);
      stateField.setSelectedValues([]);
      nationalForestField.setSelectedValues([]);
      treatmentTypeField.setSelectedValues([]);
      fromDateField.input.value = "";
      fromDateField.input.min = "";
      fromDateField.input.max = "";
      toDateField.input.value = "";
      toDateField.input.min = "";
      toDateField.input.max = "";

      filterState.region = [];
      filterState.state = [];
      filterState.nationalForest = [];
      filterState.treatmentType = [];
      filterState.fromDate = null;
      filterState.toDate = null;
      applyFilters();
    },
  }, resetIcon);

  buttonGroup.appendChild(applyFiltersButton);
  buttonGroup.appendChild(resetFiltersButton);

  filterSectionContent.appendChild(locationFiltersDiv);
  filterSectionContent.appendChild(treatmentTypeField.wrapper);
  filterSectionContent.appendChild(dateRangeFilter);
  filterSectionContent.appendChild(buttonGroup);

  const filterSection = createCollapsibleSection({
    id: "filters-section",
    title: "Filters",
    description: "",
    content: filterSectionContent,
    persistKey: "baer_reports_open",
    defaultOpen: false,
  });

  form.appendChild(filterSection);

  // form.appendChild(inputSection);

  // Table section
  const reportsSection = document.createElement("div");
  reportsSection.className = "flex flex-col gap-2";

  const totalReportsInfo = document.createElement("h2");
  totalReportsInfo.className = "text-bold text-lg";
  totalReportsInfo.textContent = "Found {n} BAER reports";

  const reportsTableSection = document.createElement("div");
  reportsTableSection.className = "flex flex-col gap-2";

  // Store all BAER report data
  let allReports = [
    {
      sn: 1,
      fire: "Fire A",
      forest: "Forest A",
      state: "CA",
      region: "5",
      start_date: "2023-01-01",
      area: 1000,
      treatment_type: "culvert risers",
      row_action: "<button class='px-3 py-1 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90'>View</button>"
    },
    {
      sn: 2,
      fire: "Fire B",
      forest: "Forest B",
      state: "OR",
      region: "6",
      start_date: "2023-02-01",
      area: 2000,
      treatment_type: "debris basins",
      row_action: "<button class='px-3 py-1 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90'>View</button>"
    },
  ];

  let filteredReports = [...allReports];

  // Helper function to apply filters
  function applyFilters() {
    filteredReports = allReports.filter(report => {
      console.log("Applying filters:", filterState);
      // Region filter
      if (filterState.region.length > 0 && !filterState.region.includes(report.region)) {
        return false;
      }

      // State filter
      if (filterState.state.length > 0 && !filterState.state.includes(report.state)) {
        return false;
      }

      // National Forest filter
      if (filterState.nationalForest.length > 0 && !filterState.nationalForest.includes(report.forest)) {
        return false;
      }

      // Treatment Type filter (would need additional data field in reports)
      if (filterState.treatmentType.length > 0 && !filterState.treatmentType.includes(report.treatment_type)) {
        return false;
      }

      // Date range filter
      if (filterState.fromDate && report.start_date < filterState.fromDate) {
        return false;
      }
      if (filterState.toDate && report.start_date > filterState.toDate) {
        return false;
      }

      return true;
    });
    console.log("Filtered reports:", filteredReports);
    // Update table and UI
    updateReportsTable();
    updateTotalReportsInfo();
  }

  function updateReportsTable() {
    // Remove the old table
    reportsTableSection.innerHTML = "";

    // Create a new table with filtered data
    const newReportsTable = createDataTable({
      columns: [
        { key: "sn", label: "#" },
        { key: "fire", label: "Fire" },
        { key: "forest", label: "Forest" },
        { key: "state", label: "State" },
        { key: "region", label: "Region" },
        { key: "start_date", label: "Start Date" },
        { key: "area", label: "Area (ac)" },
        { key: "treatment_type", label: "Treatment Type" },
        { key: "row_action", label: "Report Action"}
      ],
      rows: filteredReports, // Use filtered data
    });

    reportsTableSection.appendChild(newReportsTable);

    // Post-process table cells to render HTML in row_action column
    const tbody = newReportsTable.querySelector("tbody");
    if (tbody) {
      tbody.querySelectorAll("tr").forEach((tr, rowIndex) => {
        const cells = tr.querySelectorAll("td");
        const lastCell = cells[cells.length - 1]; // row_action is the last column
        if (lastCell && filteredReports[rowIndex]?.row_action) {
          lastCell.innerHTML = filteredReports[rowIndex].row_action;
        }
      });
    }

    // Re-apply data-contrast-id attributes
    newReportsTable.querySelectorAll("th").forEach((th, index) => {
      th.setAttribute("data-contrast-id", `table-header-${index + 1}`);
    });
    newReportsTable
        .querySelector('button[type="button"]')
        ?.setAttribute("data-contrast-id", "table-export");
    newReportsTable
        .querySelector("summary")
        ?.setAttribute("data-contrast-id", "table-columns-toggle");
    newReportsTable
        .querySelector("select")
        ?.setAttribute("data-contrast-id", "table-page-size");
    newReportsTable
        .querySelector('input[type="number"]')
        ?.setAttribute("data-contrast-id", "table-page-jump");
  }

  function updateTotalReportsInfo() {
    totalReportsInfo.textContent = `Found ${filteredReports.length} BAER reports`;
  }

  const reportsTable = createDataTable({
    columns: [
      { key: "sn", label: "#" },
      { key: "fire", label: "Fire" },
      { key: "forest", label: "Forest" },
      { key: "state", label: "State" },
      { key: "region", label: "Region" },
      { key: "start_date", label: "Start Date" },
      { key: "area", label: "Area (ac)" },
      { key: "treatment_type", label: "Treatment Type" },
      { key: "row_action", label: "Report Action"}
    ],
    rows: [
        { sn: 1, fire: "Fire A", forest: "Forest A", state: "CA", region: "5", start_date: "2023-01-01", area: 1000, treatment_type: "culvert risers", row_action: "<button class='btn btn-sm'>View</button>" },
        { sn: 2, fire: "Fire B", forest: "Forest B", state: "OR", region: "6", start_date: "2023-02-01", area: 2000, treatment_type: "debris basins", row_action: "<button class='btn btn-sm'>View</button>" },
    ],
  });
  reportsTableSection.appendChild(reportsTable);
  reportsTable.querySelectorAll("th").forEach((th, index) => {
    th.setAttribute("data-contrast-id", `table-header-${index + 1}`);
  });
  reportsTable
      .querySelector('button[type="button"]')
      ?.setAttribute("data-contrast-id", "table-export");
  reportsTable
      .querySelector("summary")
      ?.setAttribute("data-contrast-id", "table-columns-toggle");
  reportsTable
      .querySelector("select")
      ?.setAttribute("data-contrast-id", "table-page-size");
  reportsTable
      .querySelector('input[type="number"]')
      ?.setAttribute("data-contrast-id", "table-page-jump");

  // Map Section
  const mapSection = document.createElement("div");
  mapSection.className = "relative h-[500px] w-full overflow-hidden rounded-md border border-border";
  const mapContainer = document.createElement("div");
  mapContainer.id = "baer-reports-map";
  mapContainer.className = "absolute inset-0";
  mapSection.appendChild(mapContainer);


  // Helper functions
  function initMap() {
    if (mapInstance) return;
    if (!window.deck || !window.deck.DeckGL) {
      mapContainer.innerHTML =
          "<div class='flex h-full items-center justify-center text-sm text-muted-foreground'>WebGL is unavailable in this browser.</div>";
      return;
    }
    const initial = { longitude: -116, latitude: 47, zoom: 5 };
    mapViewState = { ...initial, bearing: 0, pitch: 0 };
    mapInstance = new window.deck.DeckGL({
      container: mapContainer,
      controller: true,
      initialViewState: mapViewState,
      // getTooltip: ({ object }) => {
      //   if (!object) return null;
      //   const props = object.properties || object;
      //   if (!props) return null;
      //   const name = props.desc || props.id || "Station";
      //   const elevation = props.elevation ? `${Math.round(props.elevation)} m` : "";
      //   return {
      //     text: [name, elevation].filter(Boolean).join(" • "),
      //   };
      // },
      onViewStateChange: ({ viewState }) => {
        mapViewState = viewState;
      },
      onClick: (info) => {
        if (!info || !info.coordinate) return;
        const [lon, lat] = info.coordinate;
      },
    });
    updateMapLayers();
    addMapAttribution();
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
            getTileData: ({index}) => {
              const {x, y, z} = index || {};
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

    mapInstance.setProps({ layers });
  }

  function addMapAttribution() {
    const existingAttribution = mapSection.querySelector('[data-attribution="osm"]');
    if (existingAttribution) {
      existingAttribution.remove();
    }

    const attributionDiv = document.createElement("div");
    attributionDiv.setAttribute("data-attribution", "osm");
    attributionDiv.style.cssText = `    position: absolute;
    bottom: 0px;
    right: 0px;
    background-color: rgba(255, 255, 255, 0.85);
    padding: '0 5px',
    font: '12px Helvetica Neue,Arial,Helvetica,sans-serif'
  `;

    const link = document.createElement("a");
    link.href = "http://www.openstreetmap.org/copyright";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.style.cssText = "color: #0078a8; text-decoration: none; cursor: pointer;";
    link.textContent = "© OpenStreetMap contributors";
    link.addEventListener("mouseenter", () => link.style.textDecoration = "underline");
    link.addEventListener("mouseleave", () => link.style.textDecoration = "none");

    attributionDiv.appendChild(link);
    mapSection.appendChild(attributionDiv);
  }

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

  const reportsViewModeTabs = createTabPanel({
    tabs: [
      { label: "Table View", content: reportsTableSection, active: true },
      { label: "Map View", content: mapSection },
    ],
  });

  // When Map View tab is clicked, initialize/resize the map
  const mapViewButton = reportsViewModeTabs.querySelector('[role="tab"]:nth-child(2)');
  if (mapViewButton) {
    mapViewButton.addEventListener("click", () => {
      console.log("Map View button clicked");
      initMap();
      setTimeout(() => {
        if (mapInstance) {
          // Update DeckGL with new dimensions
          mapInstance.setProps({
            width: mapContainer.clientWidth,
            height: mapContainer.clientHeight,
          });
        }
      }, 100);
    });
  }

  reportsSection.appendChild(totalReportsInfo);
  reportsSection.appendChild(reportsViewModeTabs);

  form.appendChild(reportsSection);
  // Run button
  // const runButton = createRunButton({
  //   label: "Run Report",
  //   onClick: handleRun,
  // });
  // form.appendChild(runButton.wrapper);

  container.appendChild(form);

  // ===== RESULTS SECTION =====
  const resultsSection = document.createElement("div");
  resultsSection.className = "space-y-6";
  resultsSection.style.display = "none";

  const resultsHeading = document.createElement("h2");
  resultsHeading.className = "text-lg font-semibold";
  resultsHeading.textContent = "Results";
  resultsSection.appendChild(resultsHeading);

  // Results display area
  const resultsDisplay = document.createElement("div");
  resultsDisplay.className = "space-y-4";
  resultsSection.appendChild(resultsDisplay);

  // Error display area
  const errorSection = document.createElement("div");
  errorSection.className = "hidden space-y-4";
  errorSection.id = "error-details";
  resultsSection.appendChild(errorSection);

  container.appendChild(resultsSection);

  root.appendChild(container);

  // ===== UNITIZER INTEGRATION =====

  if (window.UnitizerClient?.ready) {
    window.UnitizerClient.ready().then((client) => {
      client.registerNumericInputs(root);
      client.updateNumericFields(root);
      client.updateUnitLabels(root);
    });
  }

  document.addEventListener("unitizer:preferences-changed", () => {
    if (lastResults) {
      renderResults(lastResults);
    }
  });

  applyFilters();

  // Initialize map
  const observer = new MutationObserver(() => {
    if (mapSection.style.display === "block" && mapContainer.clientHeight > 0) {
      if (mapInstance && mapInstance.canvas) {
        mapInstance.canvas.width = mapContainer.clientWidth;
        mapInstance.canvas.height = mapContainer.clientHeight;
        mapInstance.resize();
      }
    }
  });

  observer.observe(mapSection, { attributes: true, attributeFilter: ['style'] });
}