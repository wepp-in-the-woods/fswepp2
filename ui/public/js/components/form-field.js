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

export function createMultiSelectField({
                                         id,
                                         label,
                                         options = [],
                                         value = [],
                                         placeholder = "Search and select...",
                                         help = "",
                                         required = false,
                                         onChange = () => {},
                                       } = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = "flex flex-col space-y-2 w-full";

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

  const container = document.createElement("div");
  container.className = "flex flex-col gap-0.5 mt-2 relative";

  // Search input wrapper
  const searchWrapper = document.createElement("div");
  searchWrapper.className = "relative flex items-center";

  // Search icon
  // const searchIcon = document.createElement("span");
  // searchIcon.className = "absolute left-3 text-muted-foreground pointer-events-none";
  // searchIcon.textContent = "🔍";

  // Search input
  const searchInput = document.createElement("input");
  searchInput.id = id;
  searchInput.type = "text";
  searchInput.placeholder = placeholder;
  searchInput.className =
      "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:ring-ring/50 focus-visible:ring-[3px]";
  searchInput.setAttribute("autocomplete", "off");

  // searchWrapper.appendChild(searchIcon);
  searchWrapper.appendChild(searchInput);

  // Dropdown menu
  const dropdown = document.createElement("div");
  dropdown.className =
      "absolute left-0 right-0 z-50 max-h-[300px] overflow-y-auto rounded-md border border-input bg-background shadow-md hidden w-full";
  dropdown.style.marginTop = "0.5rem";
  dropdown.style.top = "100%";

  function setDropdownExpanded(expanded) {
    dropdown.classList.toggle("hidden", !expanded);
    selectionSection.classList.toggle("hidden", !expanded);
  }

  // Info section
  const infoSection = document.createElement("div");
  infoSection.className = "flex flex-row justify-between items-center mt-2";

  // Selection counter
  const selectionCounter = document.createElement("div");
  selectionCounter.className = "text-sm text-muted-foreground h-5";

  const selectedValues = new Set(value);
  let filteredOptions = [...options];

  function updateSelectionCounter() {
    selectedValues.size !== 0 ? selectionCounter.textContent = `${selectedValues.size} selected` : selectionCounter.textContent = "";
  }

  infoSection.appendChild(selectionCounter);

  // Select all and select none buttons
  const selectionSection = document.createElement("div");
  selectionSection.className = "flex flex-row gap-2 justify-between items-center hidden";

  const selectAllBtn = document.createElement("button");
  selectAllBtn.className = "text-sm text-muted-foreground cursor-pointer text-primary underline";
  selectAllBtn.textContent = "Select All";
  selectAllBtn.addEventListener("click", () => {
    filteredOptions.forEach((option) => selectedValues.add(option.value));
    updateSelectionCounter();
    renderDropdown();
  });

  const selectNoneBtn = document.createElement("button");
  selectNoneBtn.className = "text-sm text-muted-foreground cursor-pointer text-primary underline";
  selectNoneBtn.textContent = "Select None";
  selectNoneBtn.addEventListener("click", () => {
    filteredOptions.forEach((option) => selectedValues.delete(option.value));
    updateSelectionCounter();
    renderDropdown();
  });

  selectionSection.appendChild(selectAllBtn);
  selectionSection.appendChild(selectNoneBtn);
  infoSection.appendChild(selectionSection);

  function filterOptions(searchTerm) {
    const term = searchTerm.toLowerCase();
    return options.filter(
        (opt) =>
            opt.label.toLowerCase().includes(term)
    );
  }

  function renderDropdown() {
    dropdown.innerHTML = "";

    if (filteredOptions.length === 0) {
      const emptyMsg = document.createElement("div");
      emptyMsg.className = "px-3 py-2 text-sm text-muted-foreground";
      emptyMsg.textContent = "No matches found";
      dropdown.appendChild(emptyMsg);
      return;
    }

    filteredOptions.forEach((option) => {
      const item = document.createElement("label");
      item.className =
          "flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent text-sm";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "h-4 w-4 rounded border border-input";
      checkbox.checked = selectedValues.has(option.value);

      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          selectedValues.add(option.value);
        } else {
          selectedValues.delete(option.value);
        }
        updateSelectionCounter();
        onChange(Array.from(selectedValues));
      });

      const labelText = document.createElement("span");
      labelText.textContent = option.label;

      item.appendChild(checkbox);
      item.appendChild(labelText);
      dropdown.appendChild(item);
    });
  }

  searchInput.addEventListener("input", (e) => {
    filteredOptions = filterOptions(e.target.value);
    setDropdownExpanded(true);
    renderDropdown();
  });

  searchInput.addEventListener("focus", () => {
    dropdown.classList.remove("hidden");
    setDropdownExpanded(true);
    renderDropdown();
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!container.contains(e.target)) {
      dropdown.classList.add("hidden");
      setDropdownExpanded(false);
    }
  });

  container.appendChild(searchInput);
  container.appendChild(dropdown);
  container.appendChild(infoSection);

  wrapper.appendChild(labelRow);
  wrapper.appendChild(container);

  if (help) {
    const helpEl = document.createElement("p");
    helpEl.className = "text-sm text-muted-foreground";
    helpEl.textContent = help;
    wrapper.appendChild(helpEl);
  }

  updateSelectionCounter();
  return {
    wrapper,
    searchInput,
    selectedValues: () => Array.from(selectedValues),
    setSelectedValues: (newValues) => {
      selectedValues.clear();
      newValues.forEach((val) => selectedValues.add(val));
      updateSelectionCounter();
      renderDropdown();
    },
  };
}