import { createFormField, createSelectField } from "./form-field.js";
import { createCheckboxField } from "./checkbox-field.js";

function createSection(title) {
  const section = document.createElement("section");
  section.className = "rounded-lg border border-border bg-card p-6 space-y-4";
  const heading = document.createElement("h2");
  heading.className = "text-base font-semibold";
  heading.textContent = title;
  section.appendChild(heading);
  return section;
}

export function createSimulationOptions({
  id,
  value = "",
  onInput,
  sectionTitle = "Simulation Options",
  fieldLabel = "Simulation Years",
  showYearsField = true,
  checkbox,
  weppVersion,
} = {}) {
  const section = createSection(sectionTitle);
  let field = null;
  if (showYearsField) {
    const grid = document.createElement("div");
    grid.className = "grid gap-4 md:grid-cols-2";
    field = createFormField({
      id,
      label: fieldLabel,
      type: "number",
      value,
    });
    field.input.step = "1";
    field.input.addEventListener("input", () => {
      onInput?.(field.input);
    });
    grid.appendChild(field.wrapper);
    section.appendChild(grid);
  }

  let weppVersionField = null;
  if (weppVersion) {
    weppVersionField = createSelectField({
      id: weppVersion.id,
      label: weppVersion.label,
      help: weppVersion.help,
      options: weppVersion.options,
    });
    if (weppVersion.value != null) {
      weppVersionField.select.value = weppVersion.value;
    }
    weppVersionField.select.addEventListener("change", () => {
      weppVersion.onInput?.(weppVersionField.select);
    });
    weppVersionField.wrapper.classList.add(
      "w-full",
      "md:max-w-[calc(50%-0.5rem)]"
    );
  }
  let checkboxField = null;
  if (checkbox) {
    checkboxField = createCheckboxField({
      id: checkbox.id,
      label: checkbox.label,
      help: checkbox.help,
    });
    checkboxField.input.checked = Boolean(checkbox.checked);
    checkboxField.input.addEventListener("change", () => {
      checkbox.onInput?.(checkboxField.input);
    });
  }
  if (checkboxField) {
    section.appendChild(checkboxField.wrapper);
  }
  if (weppVersionField) {
    section.appendChild(weppVersionField.wrapper);
  }

  return {
    wrapper: section,
    field,
    checkbox: checkboxField,
    weppVersion: weppVersionField,
  };
}
