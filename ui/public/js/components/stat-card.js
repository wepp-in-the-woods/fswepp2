export function createStatCard({ label, value, unit, helper } = {}) {
  const card = document.createElement("div");
  card.className = "rounded-xl border border-border bg-card p-4 shadow-sm";

  const title = document.createElement("p");
  title.className = "text-sm text-muted-foreground";
  title.textContent = label || "Metric";

  const main = document.createElement("div");
  main.className = "mt-2 flex items-baseline gap-2";

  const val = document.createElement("span");
  val.className = "text-2xl font-semibold";
  val.textContent = value ?? "--";

  const unitEl = document.createElement("span");
  unitEl.className = "text-sm text-muted-foreground";
  unitEl.textContent = unit || "";

  main.appendChild(val);
  if (unit) main.appendChild(unitEl);

  card.appendChild(title);
  card.appendChild(main);

  if (helper) {
    const helperEl = document.createElement("p");
    helperEl.className = "mt-2 text-xs text-muted-foreground";
    helperEl.textContent = helper;
    card.appendChild(helperEl);
  }

  return card;
}
