export function createRunButton({ label = "Run Model", successTimeoutMs = 1500 } = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = "space-y-2";

  const button = document.createElement("button");
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-base font-medium transition-all";
  const states = {
    idle: "bg-primary text-primary-foreground hover:bg-primary/90",
    running: "bg-muted text-muted-foreground cursor-not-allowed",
    error: "bg-destructive text-white",
    success: "bg-primary text-primary-foreground",
  };

  const message = document.createElement("div");
  message.className = "text-sm text-destructive hidden";
  message.setAttribute("aria-live", "polite");

  let successTimer = null;

  function setState(state, text, detail) {
    if (successTimer) {
      clearTimeout(successTimer);
      successTimer = null;
    }
    button.className = `${base} ${states[state] || states.idle}`;
    if (state === "running") {
      button.disabled = true;
      button.textContent = text || "Running...";
      message.classList.add("hidden");
      message.textContent = "";
    } else if (state === "error") {
      button.disabled = false;
      button.textContent = text || "Retry";
      if (detail) {
        message.textContent = detail;
        message.classList.remove("hidden");
      }
    } else if (state === "success") {
      button.disabled = false;
      button.textContent = text || "Success";
      message.classList.add("hidden");
      message.textContent = "";
      successTimer = setTimeout(() => setState("idle"), successTimeoutMs);
    } else {
      button.disabled = false;
      button.textContent = text || label;
      message.classList.add("hidden");
      message.textContent = "";
    }
  }

  setState("idle");
  wrapper.appendChild(button);
  wrapper.appendChild(message);
  return { wrapper, button, setState, messageEl: message };
}
