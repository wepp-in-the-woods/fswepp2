export function createCheckboxField({ id, label, help }) {
  const wrapper = document.createElement("label");
  wrapper.className = "flex items-start gap-2 text-sm";
  wrapper.htmlFor = id;

  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = id;
  input.className = "mt-1 h-4 w-4 rounded border border-input";

  const text = document.createElement("div");
  const span = document.createElement("span");
  span.className = "font-medium";
  span.textContent = label || "";
  text.appendChild(span);

  if (help) {
    const helpEl = document.createElement("p");
    helpEl.className = "text-xs text-muted-foreground";
    helpEl.textContent = help;
    text.appendChild(helpEl);
  }

  wrapper.appendChild(input);
  wrapper.appendChild(text);
  return { wrapper, input };
}
