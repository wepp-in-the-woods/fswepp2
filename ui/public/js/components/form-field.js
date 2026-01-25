export function createFormField({
  id,
  label,
  type = "text",
  value = "",
  placeholder = "",
  help = "",
  error = "",
  required = false,
  unitLabel = "",
  validator = null,
  debounceMs = 300,
} = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = "space-y-2";

  const labelRow = document.createElement("label");
  labelRow.className = "text-sm font-medium leading-none mb-2";
  labelRow.htmlFor = id;
  labelRow.textContent = label || "";
  if (required) {
    const req = document.createElement("span");
    req.className = "text-destructive ml-1";
    req.textContent = "*";
    labelRow.appendChild(req);
  }

  const inputRow = document.createElement("div");
  inputRow.className = "flex items-center gap-2 mt-2";

  const input = document.createElement("input");
  input.id = id;
  input.type = type;
  input.value = value;
  input.placeholder = placeholder;
  input.className =
    "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:ring-ring/50 focus-visible:ring-[3px]";

  inputRow.appendChild(input);

  if (unitLabel) {
    const unit = document.createElement("span");
    unit.className = "text-sm text-muted-foreground";
    unit.textContent = unitLabel;
    inputRow.appendChild(unit);
  }

  if (help) {
    const helpEl = document.createElement("p");
    helpEl.className = "text-sm text-muted-foreground";
    helpEl.textContent = help;
    wrapper.appendChild(labelRow);
    wrapper.appendChild(inputRow);
    wrapper.appendChild(helpEl);
  } else {
    wrapper.appendChild(labelRow);
    wrapper.appendChild(inputRow);
  }

  const errorEl = document.createElement("p");
  errorEl.className = "text-sm font-medium text-destructive hidden";
  wrapper.appendChild(errorEl);

  function setError(message) {
    if (!message) {
      errorEl.textContent = "";
      errorEl.classList.add("hidden");
      input.classList.remove("border-destructive");
      return;
    }
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
    input.classList.add("border-destructive");
  }

  function setValid() {
    setError("");
    input.classList.add("border-primary");
    setTimeout(() => input.classList.remove("border-primary"), 800);
  }

  if (error) setError(error);

  if (validator) {
    let touched = false;
    let timer = null;
    const runValidation = () => {
      const result = validator(input.value);
      if (result === true) {
        setValid();
      } else {
        setError(result || "Invalid value.");
      }
    };
    input.addEventListener("blur", () => {
      touched = true;
      runValidation();
    });
    input.addEventListener("input", () => {
      if (!touched) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(runValidation, debounceMs);
    });
  }

  return { wrapper, input, setError, setValid };
}

export function createSelectField({
  id,
  label,
  help = "",
  options = [],
} = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = "space-y-2";

  const labelRow = document.createElement("label");
  labelRow.className = "text-sm font-medium leading-none mb-2";
  labelRow.htmlFor = id;
  labelRow.textContent = label || "";

  const select = document.createElement("select");
  select.id = id;
  select.className =
    "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:ring-ring/50 focus-visible:ring-[3px]";

  const inputRow = document.createElement("div");
  inputRow.className = "mt-2";
  inputRow.appendChild(select);

  const setOptions = (items) => {
    select.innerHTML = "";
    items.forEach((option) => {
      const opt = document.createElement("option");
      opt.value = option.value;
      opt.textContent = option.label;
      select.appendChild(opt);
    });
  };
  setOptions(options);

  wrapper.appendChild(labelRow);
  wrapper.appendChild(inputRow);

  if (help) {
    const helpEl = document.createElement("p");
    helpEl.className = "text-sm text-muted-foreground";
    helpEl.textContent = help;
    wrapper.appendChild(helpEl);
  }

  return { wrapper, select, setOptions };
}
