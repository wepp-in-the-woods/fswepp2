import { createFormField } from "./form-field.js";
import { createRadioGroup } from "./radio-group.js";

const VEGETATION_OPTIONS = [
  { value: "Forest", label: "Forest" },
  { value: "Range", label: "Range" },
  { value: "Chaparral", label: "Chaparral" },
];

const SEVERITY_OPTIONS = [
  { value: "High", label: "High" },
  { value: "Moderate", label: "Moderate" },
  { value: "Low", label: "Low" },
  { value: "Unburned", label: "Unburned" },
];

function createSection(title) {
  const section = document.createElement("section");
  section.className = "rounded-lg border border-border bg-card p-6 space-y-4";
  const heading = document.createElement("h2");
  heading.className = "text-base font-semibold";
  heading.textContent = title;
  section.appendChild(heading);
  return section;
}

function getDefaultCovers(vegetationType) {
  if (vegetationType === "Range") {
    return { shrub: 15, grass: 75, bare: 10 };
  }
  if (vegetationType === "Chaparral") {
    return { shrub: 80, grass: 0, bare: 20 };
  }
  return { shrub: null, grass: null, bare: null };
}

export function createVegetationBurnSeverity({ state, onChange, idPrefix = "ermit" } = {}) {
  const section = createSection("Vegetation & Burn Severity");

  const vegetationGroup = createRadioGroup({
    name: `${idPrefix}_vegetation`,
    label: "Vegetation Type",
    options: VEGETATION_OPTIONS,
    value: state.vegetation_type,
    onChange: (value) => setVegetation(value, true),
    columns: 3,
  });
  section.appendChild(vegetationGroup.wrapper);

  const prefireDescription = document.createElement("p");
  prefireDescription.className = "text-sm text-muted-foreground";
  prefireDescription.textContent =
    "Describe the pre-fire community composition for Range or Chaparral conditions.";
  section.appendChild(prefireDescription);

  const prefireGrid = document.createElement("div");
  prefireGrid.className = "grid gap-4 md:grid-cols-3";

  const shrubField = createFormField({
    id: `${idPrefix}_shrub_cover`,
    label: "Shrub Cover",
    type: "number",
    value: state.user_shrub_pct != null ? String(state.user_shrub_pct) : "",
    unitLabel: "%",
  });
  shrubField.input.step = "1";
  shrubField.input.min = "0";
  shrubField.input.max = "100";

  const grassField = createFormField({
    id: `${idPrefix}_grass_cover`,
    label: "Grass Cover",
    type: "number",
    value: state.user_grass_pct != null ? String(state.user_grass_pct) : "",
    unitLabel: "%",
  });
  grassField.input.step = "1";
  grassField.input.min = "0";
  grassField.input.max = "100";

  const bareField = createFormField({
    id: `${idPrefix}_bare_cover`,
    label: "Bare Ground",
    type: "number",
    value: state.user_bare_pct != null ? String(state.user_bare_pct) : "",
    unitLabel: "%",
  });
  bareField.input.step = "1";
  bareField.input.readOnly = true;
  bareField.input.setAttribute("aria-readonly", "true");
  bareField.input.classList.add("bg-muted/40");

  prefireGrid.appendChild(shrubField.wrapper);
  prefireGrid.appendChild(grassField.wrapper);
  prefireGrid.appendChild(bareField.wrapper);
  section.appendChild(prefireGrid);

  const severityFieldset = document.createElement("fieldset");
  severityFieldset.className = "space-y-2";
  const severityLegend = document.createElement("legend");
  severityLegend.className = "text-sm font-medium leading-none";
  severityLegend.textContent = "Soil Burn Severity";
  severityFieldset.appendChild(severityLegend);

  const severityGrid = document.createElement("div");
  severityGrid.className = "flex flex-wrap gap-2";
  const severityInputs = [];
  SEVERITY_OPTIONS.forEach((option) => {
    const id = `${idPrefix}_burn_${option.value}`;
    const label = document.createElement("label");
    label.className =
      "flex items-center gap-2 text-sm cursor-pointer";
    label.style.flex = "1 1 9rem";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = `${idPrefix}_burn_severity`;
    input.id = id;
    input.value = option.value;
    input.checked = option.value === state.burn_severity;
    input.addEventListener("change", () => {
      if (!input.checked) return;
      state.burn_severity = option.value;
      onChange?.({ burn_severity: state.burn_severity });
    });

    const text = document.createElement("span");
    text.textContent = option.label;

    label.appendChild(input);
    label.appendChild(text);
    severityGrid.appendChild(label);
    severityInputs.push(input);
  });

  severityFieldset.appendChild(severityGrid);
  section.appendChild(severityFieldset);

  function updateBareField() {
    const shrub = Number(shrubField.input.value);
    const grass = Number(grassField.input.value);
    if (Number.isFinite(shrub) && Number.isFinite(grass)) {
      const bare = 100 - shrub - grass;
      state.user_bare_pct = bare;
      bareField.input.value = String(bare);
    } else {
      state.user_bare_pct = null;
      bareField.input.value = "";
    }
  }

  function setPrefireVisibility(show) {
    prefireDescription.style.display = show ? "" : "none";
    prefireGrid.style.display = show ? "" : "none";
  }

  function setVegetation(value, applyDefaults) {
    state.vegetation_type = value;
    vegetationGroup.inputs.forEach((input) => {
      input.checked = input.value === value;
    });

    if (value === "Forest") {
      state.user_shrub_pct = null;
      state.user_grass_pct = null;
      state.user_bare_pct = null;
      shrubField.input.value = "";
      grassField.input.value = "";
      bareField.input.value = "";
      setPrefireVisibility(false);
    } else {
      setPrefireVisibility(true);
      if (applyDefaults) {
        const defaults = getDefaultCovers(value);
        state.user_shrub_pct = defaults.shrub;
        state.user_grass_pct = defaults.grass;
        state.user_bare_pct = defaults.bare;
        shrubField.input.value = defaults.shrub != null ? String(defaults.shrub) : "";
        grassField.input.value = defaults.grass != null ? String(defaults.grass) : "";
        bareField.input.value = defaults.bare != null ? String(defaults.bare) : "";
      }
    }

    onChange?.({
      vegetation_type: state.vegetation_type,
      user_shrub_pct: state.user_shrub_pct,
      user_grass_pct: state.user_grass_pct,
      user_bare_pct: state.user_bare_pct,
    });
  }

  shrubField.input.addEventListener("input", () => {
    if (state.vegetation_type === "Forest") return;
    const shrub = Number(shrubField.input.value);
    state.user_shrub_pct = Number.isFinite(shrub) ? shrub : null;
    updateBareField();
    onChange?.({
      user_shrub_pct: state.user_shrub_pct,
      user_bare_pct: state.user_bare_pct,
    });
  });

  grassField.input.addEventListener("input", () => {
    if (state.vegetation_type === "Forest") return;
    const grass = Number(grassField.input.value);
    state.user_grass_pct = Number.isFinite(grass) ? grass : null;
    updateBareField();
    onChange?.({
      user_grass_pct: state.user_grass_pct,
      user_bare_pct: state.user_bare_pct,
    });
  });

  setPrefireVisibility(state.vegetation_type !== "Forest");
  if (state.vegetation_type !== "Forest") {
    updateBareField();
  }

  return {
    wrapper: section,
    vegetationGroup,
    severityInputs,
    shrubField,
    grassField,
    bareField,
    setVegetation,
  };
}
