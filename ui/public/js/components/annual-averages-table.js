export function createAnnualAveragesTable({ idPrefix } = {}) {
  if (!idPrefix) {
    throw new Error("createAnnualAveragesTable requires idPrefix");
  }
  const table = document.createElement("table");
  table.className = "w-full text-sm border border-border rounded-md table-fixed";
  table.innerHTML = `
    <colgroup>
      <col style="width:16%" />
      <col style="width:10%" />
      <col style="width:44%" />
      <col style="width:15%" />
      <col style="width:15%" />
    </colgroup>
    <thead class="bg-muted text-left">
      <tr>
        <th colspan="5" class="px-3 py-2" id="${idPrefix}-results-title"></th>
      </tr>
      <tr>
        <th colspan="3" class="px-3 py-2"></th>
        <th colspan="2" class="px-3 py-2 text-xs font-medium text-muted-foreground" id="${idPrefix}-results-total"></th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const titleCell = table.querySelector(`#${idPrefix}-results-title`);
  const totalCell = table.querySelector(`#${idPrefix}-results-total`);
  const tableBody = table.querySelector("tbody");

  function setHeader(years) {
    titleCell.textContent = `${years} - YEAR MEAN ANNUAL AVERAGES`;
    totalCell.textContent = `Total in ${years} years`;
  }

  return {
    table,
    tableBody,
    setHeader,
  };
}
