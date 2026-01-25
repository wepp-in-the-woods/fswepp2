let tabPanelCounter = 0;

export function createTabPanel({ tabs = [], orientation = "horizontal", lazy = false } = {}) {
  const wrapper = document.createElement("div");
  const tabList = document.createElement("div");
  tabList.className =
    orientation === "vertical"
      ? "flex flex-col gap-2 border-r border-border pr-3"
      : "flex items-center gap-2 border-b border-border";
  tabList.setAttribute("role", "tablist");
  tabList.setAttribute("aria-orientation", orientation === "vertical" ? "vertical" : "horizontal");

  const panels = document.createElement("div");
  panels.className = orientation === "vertical" ? "pl-4" : "pt-4";
  const baseId = `tab-panel-${tabPanelCounter++}`;

  function setActive(index) {
    tabs.forEach((tab, i) => {
      const button = tab._button;
      const panel = tab._panel;
      const isActive = i === index;
      button.setAttribute("aria-selected", String(isActive));
      button.setAttribute("tabindex", isActive ? "0" : "-1");
      if (orientation === "vertical") {
        button.classList.toggle("border-l-2", isActive);
      } else {
        button.classList.toggle("border-b-2", isActive);
      }
      button.classList.toggle("border-primary", isActive);
      button.classList.toggle("text-primary", isActive);
      if (!lazy) {
        panel.style.display = isActive ? "block" : "none";
      } else if (isActive && !panel.dataset.mounted) {
        panel.dataset.mounted = "true";
        if (typeof tab.content === "string") {
          panel.innerHTML = tab.content;
        } else if (tab.content instanceof HTMLElement) {
          panel.appendChild(tab.content);
        }
        panel.style.display = "block";
      } else if (!isActive) {
        panel.style.display = "none";
      }
    });
  }

  tabs.forEach((tab, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "px-3 py-2 text-sm font-medium border-primary";
    button.textContent = tab.label;
    button.setAttribute("role", "tab");
    button.id = `${baseId}-tab-${index}`;
    button.addEventListener("click", () => setActive(index));
    button.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") {
        if (orientation === "vertical") return;
        event.preventDefault();
        setActive((index + 1) % tabs.length);
        tabs[(index + 1) % tabs.length]._button.focus();
      } else if (event.key === "ArrowLeft") {
        if (orientation === "vertical") return;
        event.preventDefault();
        setActive((index - 1 + tabs.length) % tabs.length);
        tabs[(index - 1 + tabs.length) % tabs.length]._button.focus();
      } else if (event.key === "ArrowDown") {
        if (orientation !== "vertical") return;
        event.preventDefault();
        setActive((index + 1) % tabs.length);
        tabs[(index + 1) % tabs.length]._button.focus();
      } else if (event.key === "ArrowUp") {
        if (orientation !== "vertical") return;
        event.preventDefault();
        setActive((index - 1 + tabs.length) % tabs.length);
        tabs[(index - 1 + tabs.length) % tabs.length]._button.focus();
      } else if (event.key === "Home") {
        event.preventDefault();
        setActive(0);
        tabs[0]._button.focus();
      } else if (event.key === "End") {
        event.preventDefault();
        setActive(tabs.length - 1);
        tabs[tabs.length - 1]._button.focus();
      }
    });

    const panel = document.createElement("div");
    panel.setAttribute("role", "tabpanel");
    panel.id = `${baseId}-panel-${index}`;
    panel.setAttribute("aria-labelledby", button.id);
    panel.setAttribute("tabindex", "0");
    button.setAttribute("aria-controls", panel.id);
    panel.style.display = "none";
    if (!lazy) {
      if (typeof tab.content === "string") {
        panel.innerHTML = tab.content;
      } else if (tab.content instanceof HTMLElement) {
        panel.appendChild(tab.content);
      }
    }

    tab._button = button;
    tab._panel = panel;
    tabList.appendChild(button);
    panels.appendChild(panel);
  });

  if (orientation === "vertical") {
    const layout = document.createElement("div");
    layout.className = "flex items-start gap-4";
    layout.appendChild(tabList);
    layout.appendChild(panels);
    wrapper.appendChild(layout);
  } else {
    wrapper.appendChild(tabList);
    wrapper.appendChild(panels);
  }
  setActive(0);
  return wrapper;
}
