function createWrapper() {
  const wrapper = document.createElement("div");
  wrapper.className = "space-y-3";
  return wrapper;
}

function clampPercent(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function createOccurrenceProbabilities({ idPrefix } = {}) {
  if (!idPrefix) {
    throw new Error("createOccurrenceProbabilities requires idPrefix");
  }

  const wrapper = createWrapper();
  const heading = document.createElement("h3");
  heading.className = "text-sm font-semibold";
  wrapper.appendChild(heading);

  const table = document.createElement("table");
  table.className = "w-full text-sm border border-border rounded-md table-fixed";
  table.innerHTML = `
    <thead class="bg-muted text-left">
      <tr>
        <th class="px-3 py-2">Metric</th>
        <th class="px-3 py-2 text-right">Probability</th>
        <th class="px-3 py-2"> </th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  wrapper.appendChild(table);

  const tableBody = table.querySelector("tbody");

  function setData({ years, rows } = {}) {
    if (!rows || rows.length === 0) {
      wrapper.style.display = "none";
      tableBody.innerHTML = "";
      return;
    }
    wrapper.style.display = "";
    heading.textContent =
      `Probabilities of occurrence first year following disturbance based on ${years} years of climate`;
    tableBody.innerHTML = "";
    rows.forEach((row) => {
      const percent = clampPercent(row.percent);
      const remaining = 100 - percent;
      const tr = document.createElement("tr");
      tr.className = "border-t border-border";
      tr.innerHTML = `
        <th class="px-3 py-2 text-left font-medium">${row.label || ""}</th>
        <td class="px-3 py-2 text-right tabular-nums">${Number.isFinite(row.percent) ? `${Math.round(percent)}%` : "—"}</td>
        <td class="px-3 py-2">
          <div class="flex h-3 w-full overflow-hidden rounded-sm border border-border bg-background">
            <div class="bg-red-500" style="width:${percent}%"></div>
            <div class="bg-green-500" style="width:${remaining}%"></div>
          </div>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  }

  return { wrapper, setData };
}
