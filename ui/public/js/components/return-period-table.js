function createWrapper() {
  const wrapper = document.createElement("div");
  wrapper.className = "space-y-3";
  return wrapper;
}

export function createReturnPeriodTable({ idPrefix } = {}) {
  if (!idPrefix) {
    throw new Error("createReturnPeriodTable requires idPrefix");
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
        <th class="px-3 py-2" id="${idPrefix}-return-period-title">Return Period</th>
        <th class="px-3 py-2" id="${idPrefix}-return-period-precip">Precipitation</th>
        <th class="px-3 py-2" id="${idPrefix}-return-period-runoff">Runoff</th>
        <th class="px-3 py-2" id="${idPrefix}-return-period-erosion">Erosion</th>
        <th class="px-3 py-2" id="${idPrefix}-return-period-sediment">Sediment</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  wrapper.appendChild(table);

  const tableBody = table.querySelector("tbody");
  const precipHeader = table.querySelector(`#${idPrefix}-return-period-precip`);
  const runoffHeader = table.querySelector(`#${idPrefix}-return-period-runoff`);
  const erosionHeader = table.querySelector(`#${idPrefix}-return-period-erosion`);
  const sedimentHeader = table.querySelector(`#${idPrefix}-return-period-sediment`);

  function setData({ years, rows, average, units } = {}) {
    if (!rows || rows.length === 0) {
      wrapper.style.display = "none";
      tableBody.innerHTML = "";
      return;
    }
    wrapper.style.display = "";
    heading.textContent = `Return period analysis based on ${years} years of climate`;
    if (units) {
      precipHeader.textContent = `Precipitation (${units.precip || ""})`.trim();
      runoffHeader.textContent = `Runoff (${units.runoff || ""})`.trim();
      erosionHeader.textContent = `Erosion (${units.erosion || ""})`.trim();
      sedimentHeader.textContent = `Sediment (${units.sediment || ""})`.trim();
    }

    tableBody.innerHTML = "";
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      tr.className = "border-t border-border";
      tr.innerHTML = `
        <th class="px-3 py-2 text-left font-medium">${row.label || ""}</th>
        <td class="px-3 py-2 text-right">${row.precip ?? "—"}</td>
        <td class="px-3 py-2 text-right">${row.runoff ?? "—"}</td>
        <td class="px-3 py-2 text-right">${row.erosion ?? "—"}</td>
        <td class="px-3 py-2 text-right">${row.sediment ?? "—"}</td>
      `;
      tableBody.appendChild(tr);
    });

    if (average) {
      const tr = document.createElement("tr");
      tr.className = "border-t border-border bg-yellow-50/40";
      tr.innerHTML = `
        <th class="px-3 py-2 text-left font-semibold">Average</th>
        <td class="px-3 py-2 text-right">${average.precip ?? "—"}</td>
        <td class="px-3 py-2 text-right">${average.runoff ?? "—"}</td>
        <td class="px-3 py-2 text-right">${average.erosion ?? "—"}</td>
        <td class="px-3 py-2 text-right">${average.sediment ?? "—"}</td>
      `;
      tableBody.appendChild(tr);
    }
  }

  return { wrapper, setData };
}
