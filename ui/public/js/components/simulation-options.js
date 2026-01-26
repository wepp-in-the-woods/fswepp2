import { createFormField } from "./form-field.js";

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
} = {}) {
  const section = createSection(sectionTitle);
  const grid = document.createElement("div");
  grid.className = "grid gap-4 md:grid-cols-2";

  const field = createFormField({
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

  return {
    wrapper: section,
    field,
  };
}
