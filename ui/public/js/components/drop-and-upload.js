export function createDropAndUpload({
  id,
  label,
  buttonText,
  helper,
  accept = ".json,application/json",
  height = 50,
  onFile,
} = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = "space-y-2";

  if (label) {
    const labelEl = document.createElement("p");
    labelEl.className = "text-sm text-muted-foreground";
    labelEl.textContent = label;
    wrapper.appendChild(labelEl);
  }

  const dropZone = document.createElement("button");
  dropZone.type = "button";
  dropZone.id = id || "";
  dropZone.className =
    "flex w-full items-center justify-center rounded-md border border-border bg-muted/30 text-sm text-muted-foreground transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  dropZone.style.height = `${height}px`;
  dropZone.style.borderStyle = "dashed";
  dropZone.style.borderColor = "oklch(0.75 0.01 286)";
  dropZone.textContent =
    buttonText || "Drop file here or click to upload";

  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept;
  input.className = "sr-only";
  input.tabIndex = -1;

  const helperEl = document.createElement("p");
  helperEl.className = "text-xs text-muted-foreground";
  helperEl.textContent = helper || "";
  if (helper) wrapper.appendChild(helperEl);

  const statusEl = document.createElement("p");
  statusEl.className = "text-xs text-muted-foreground";
  wrapper.appendChild(dropZone);
  wrapper.appendChild(input);
  wrapper.appendChild(statusEl);

  const setStatus = (message, isError = false) => {
    statusEl.textContent = message || "";
    statusEl.classList.toggle("text-destructive", Boolean(isError));
    if (!isError) {
      statusEl.classList.add("text-muted-foreground");
    } else {
      statusEl.classList.remove("text-muted-foreground");
    }
  };

  const handleFiles = (files) => {
    if (!files || !files.length) return;
    const file = files[0];
    if (onFile) {
      onFile(file, { setStatus });
    }
  };

  dropZone.addEventListener("click", () => input.click());
  input.addEventListener("change", () => handleFiles(input.files));

  const highlight = () => {
    dropZone.classList.add("border-muted-foreground", "text-foreground");
  };
  const unhighlight = () => {
    dropZone.classList.remove("border-muted-foreground", "text-foreground");
  };

  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    highlight();
  });
  dropZone.addEventListener("dragleave", () => unhighlight());
  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    unhighlight();
    handleFiles(event.dataTransfer?.files);
  });

  return { wrapper, dropZone, input, setStatus };
}
