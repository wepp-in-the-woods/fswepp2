let openModalId = null;
let previousFocus = null;

function trapFocus(modal) {
  const focusable = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  function handleKey(event) {
    if (event.key !== "Tab") return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  modal.addEventListener("keydown", handleKey);
  modal.dataset.focusTrap = "true";
  first.focus();
}

export function createModal({ id, title, content, actions = [] }) {
  const modal = document.createElement("div");
  modal.className = "fixed inset-0 z-50 hidden items-center justify-center";
  modal.id = id;
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", `${id}-title`);

  const overlay = document.createElement("div");
  overlay.className = "absolute inset-0 bg-black/40";
  overlay.addEventListener("click", () => closeModal(id));

  const dialog = document.createElement("div");
  dialog.className =
    "relative w-full max-w-6xl mx-4 rounded-lg bg-card text-card-foreground shadow-lg p-6";

  const header = document.createElement("div");
  header.className = "mb-4";

  const heading = document.createElement("h2");
  heading.id = `${id}-title`;
  heading.className = "text-xl font-semibold";
  heading.textContent = title || "Modal";

  header.appendChild(heading);

  const body = document.createElement("div");
  body.className = "max-h-[70vh] overflow-y-auto pr-2";
  if (typeof content === "string") {
    body.innerHTML = content;
  } else if (content instanceof HTMLElement) {
    body.appendChild(content);
  }

  const footer = document.createElement("div");
  footer.className = "mt-6 flex justify-end gap-2";
  actions.forEach((action) => footer.appendChild(action));

  dialog.appendChild(header);
  dialog.appendChild(body);
  if (actions.length) dialog.appendChild(footer);

  modal.appendChild(overlay);
  modal.appendChild(dialog);

  return modal;
}

export function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  previousFocus = document.activeElement;
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  openModalId = id;
  trapFocus(modal);
}

export function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  openModalId = null;
  if (previousFocus && previousFocus.focus) {
    previousFocus.focus();
  }
}

export function bindModalTriggers() {
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-modal-open]");
    if (!trigger) return;
    const targetId = trigger.getAttribute("data-modal-open");
    if (!targetId || targetId === "true") return;
    event.preventDefault();
    openModal(targetId);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && openModalId) {
      closeModal(openModalId);
    }
  });
}
