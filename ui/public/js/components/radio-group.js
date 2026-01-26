export function createRadioGroup({
  name,
  label,
  options = [],
  value = null,
  onChange = () => {},
  columns = 2,
  help = "",
} = {}) {
  const wrapper = document.createElement("fieldset");
  wrapper.className = "space-y-2";

  const legend = document.createElement("legend");
  legend.className = "text-sm font-medium leading-none";
  legend.textContent = label || "";
  wrapper.appendChild(legend);

  const grid = document.createElement("div");
  grid.className = columns === 1 ? "grid gap-2" : "grid gap-2 sm:grid-cols-2";

  const inputs = [];
  options.forEach((option) => {
    const id = `${name}_${option.value}`;
    const labelEl = document.createElement("label");
    labelEl.className =
      "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm cursor-pointer hover:bg-accent";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = name;
    input.id = id;
    input.value = option.value;
    input.checked = option.value === value;
    input.className = "";
    input.addEventListener("change", () => {
      if (input.checked) onChange(option.value);
    });
    const text = document.createElement("span");
    text.textContent = option.label;
    labelEl.appendChild(input);
    labelEl.appendChild(text);
    grid.appendChild(labelEl);
    inputs.push(input);
  });

  wrapper.appendChild(grid);

  if (help) {
    const helpEl = document.createElement("p");
    helpEl.className = "text-sm text-muted-foreground";
    helpEl.textContent = help;
    wrapper.appendChild(helpEl);
  }

  return { wrapper, inputs };
}
