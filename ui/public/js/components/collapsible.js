export function createCollapsibleSection({
  id,
  title,
  description,
  content,
  persistKey,
  defaultOpen = true,
} = {}) {
  const wrapper = document.createElement("section");
  wrapper.className = "border border-border rounded-lg";
  if (id) wrapper.id = id;

  const header = document.createElement("button");
  header.className =
    "w-full flex items-center justify-between gap-3 px-4 py-3 text-left";
  header.type = "button";

  const text = document.createElement("div");
  const heading = document.createElement("h3");
  heading.className = "text-base font-semibold";
  heading.textContent = title || "Section";
  text.appendChild(heading);
  if (description) {
    const desc = document.createElement("p");
    desc.className = "text-sm text-muted-foreground";
    desc.textContent = description;
    text.appendChild(desc);
  }

  const chevron = document.createElement("span");
  chevron.textContent = "▼";
  chevron.className = "text-xs text-muted-foreground";

  header.appendChild(text);
  header.appendChild(chevron);

  const body = document.createElement("div");
  body.className = "px-4 pb-4";
  if (content instanceof HTMLElement) {
    body.appendChild(content);
  } else if (typeof content === "string") {
    body.innerHTML = content;
  }

  let open = defaultOpen;
  if (persistKey && typeof localStorage !== "undefined") {
    const stored = localStorage.getItem(persistKey);
    if (stored !== null) {
      open = stored === "open";
    }
  }
  function sync() {
    body.style.display = open ? "block" : "none";
    chevron.textContent = open ? "▼" : "▲";
    if (persistKey && typeof localStorage !== "undefined") {
      localStorage.setItem(persistKey, open ? "open" : "closed");
    }
  }
  header.addEventListener("click", () => {
    open = !open;
    sync();
  });

  sync();
  wrapper.appendChild(header);
  wrapper.appendChild(body);
  wrapper.setDescription = (next) => {
    if (!description) return;
    const descEl = text.querySelector("p");
    if (!descEl) return;
    descEl.textContent = next || "";
  };
  wrapper.setOpen = (next) => {
    open = Boolean(next);
    sync();
  };
  wrapper.isOpen = () => open;
  wrapper.body = body;
  wrapper.header = header;
  return wrapper;
}
