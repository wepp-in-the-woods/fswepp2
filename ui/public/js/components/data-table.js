export function createDataTable({
  columns = [],
  rows = [],
  pageSizes = [10, 25, 50, 100, "All"],
  defaultPageSize = 25,
  filename = "table.csv",
} = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = "rounded-lg border border-border overflow-hidden";

  let pageSize = defaultPageSize;
  let currentPage = 1;
  let totalPages = 1;
  let sortKey = null;
  let sortDir = "asc";
  const visibleColumns = new Set(columns.map((col) => col.key));

  const toolbar = document.createElement("div");
  toolbar.className = "flex flex-wrap items-center justify-between gap-2 p-3";

  const leftControls = document.createElement("div");
  leftControls.className = "flex flex-wrap items-center gap-2";

  const pageSizeSelect = document.createElement("select");
  pageSizeSelect.className =
    "h-9 rounded-md border border-input bg-background px-2 text-sm";
  pageSizes.forEach((size) => {
    const option = document.createElement("option");
    option.value = String(size);
    option.textContent = String(size);
    if (size === defaultPageSize) option.selected = true;
    pageSizeSelect.appendChild(option);
  });

  const exportBtn = document.createElement("button");
  exportBtn.className =
    "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium border border-border bg-background hover:bg-accent";
  exportBtn.type = "button";
  exportBtn.textContent = "Export CSV";

  const columnToggle = document.createElement("details");
  columnToggle.className = "relative";
  const columnSummary = document.createElement("summary");
  columnSummary.className =
    "cursor-pointer rounded-md border border-border px-3 py-2 text-sm";
  columnSummary.textContent = "Columns";
  const columnMenu = document.createElement("div");
  columnMenu.className =
    "absolute z-10 mt-2 w-48 rounded-md border border-border bg-card p-2 shadow";
  columns.forEach((col) => {
    const label = document.createElement("label");
    label.className = "flex items-center gap-2 text-sm py-1";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        visibleColumns.add(col.key);
      } else {
        visibleColumns.delete(col.key);
      }
      renderBody();
      renderHead();
    });
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(col.label));
    columnMenu.appendChild(label);
  });
  columnToggle.appendChild(columnSummary);
  columnToggle.appendChild(columnMenu);

  leftControls.appendChild(pageSizeSelect);
  leftControls.appendChild(columnToggle);
  toolbar.appendChild(leftControls);
  toolbar.appendChild(exportBtn);

  const table = document.createElement("table");
  table.className = "min-w-full text-sm";

  const thead = document.createElement("thead");

  const tbody = document.createElement("tbody");

  function createPager() {
    const footer = document.createElement("div");
    footer.className =
      "flex flex-wrap items-center justify-between gap-2 border-t border-border p-3 text-sm";
    const pagination = document.createElement("div");
    pagination.className = "flex items-center gap-2";
    const prevBtn = document.createElement("button");
    prevBtn.className =
      "rounded-md border border-border px-2 py-1 hover:bg-accent";
    prevBtn.textContent = "Prev";
    const nextBtn = document.createElement("button");
    nextBtn.className =
      "rounded-md border border-border px-2 py-1 hover:bg-accent";
    nextBtn.textContent = "Next";
    const pageInfo = document.createElement("span");
    const totalInfo = document.createElement("span");
    const jump = document.createElement("input");
    jump.type = "number";
    jump.min = "1";
    jump.className =
      "w-20 rounded-md border border-input px-2 py-1 text-sm";
    jump.placeholder = "Page";

    jump.addEventListener("change", () => {
      const value = Number(jump.value);
      if (Number.isFinite(value) && value >= 1) {
        currentPage = Math.min(Math.max(1, value), totalPages);
        renderBody();
      } else {
        jump.value = String(currentPage);
      }
    });

    pagination.appendChild(prevBtn);
    pagination.appendChild(pageInfo);
    pagination.appendChild(nextBtn);
    pagination.appendChild(jump);
    footer.appendChild(pagination);
    footer.appendChild(totalInfo);

    return { footer, prevBtn, nextBtn, pageInfo, totalInfo, jump };
  }

  const topPager = createPager();
  const bottomPager = createPager();

  function sortedRows() {
    if (!sortKey) return rows.slice();
    return rows.slice().sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === bv) return 0;
      if (sortDir === "asc") return av > bv ? 1 : -1;
      return av < bv ? 1 : -1;
    });
  }

  function pagedRows(data) {
    if (pageSize === "All") return data;
    const size = Number(pageSize);
    const start = (currentPage - 1) * size;
    return data.slice(start, start + size);
  }

  function renderBody() {
    tbody.innerHTML = "";
    const data = sortedRows();
    const pageRows = pagedRows(data);
    pageRows.forEach((row) => {
      const tr = document.createElement("tr");
      tr.className = "border-t border-border";
      columns.forEach((col) => {
        if (!visibleColumns.has(col.key)) return;
        const td = document.createElement("td");
        td.className = "px-3 py-2";
        td.textContent = row[col.key] ?? "";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    const totalRows = data.length;
    totalPages =
      pageSize === "All" ? 1 : Math.max(1, Math.ceil(totalRows / pageSize));
    currentPage = Math.min(currentPage, totalPages);
    [topPager, bottomPager].forEach((pager) => {
      pager.pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
      pager.totalInfo.textContent = `${totalRows} rows`;
      pager.prevBtn.disabled = currentPage === 1;
      pager.nextBtn.disabled = currentPage === totalPages;
      pager.jump.max = String(totalPages);
      pager.jump.value = String(currentPage);
      pager.jump.disabled = totalPages <= 1;
    });
  }

  function exportCsv() {
    const visible = columns.filter((c) => visibleColumns.has(c.key));
    const header = visible.map((c) => c.label).join(",");
    const lines = rows.map((row) =>
      visible.map((c) => JSON.stringify(row[c.key] ?? "")).join(",")
    );
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  pageSizeSelect.addEventListener("change", () => {
    const value = pageSizeSelect.value;
    pageSize = value === "All" ? "All" : Number(value);
    currentPage = 1;
    renderBody();
  });
  [topPager, bottomPager].forEach((pager) => {
    pager.prevBtn.addEventListener("click", () => {
      currentPage = Math.max(1, currentPage - 1);
      renderBody();
    });
    pager.nextBtn.addEventListener("click", () => {
      currentPage += 1;
      renderBody();
    });
  });
  exportBtn.addEventListener("click", exportCsv);

  table.appendChild(thead);
  table.appendChild(tbody);
  wrapper.appendChild(toolbar);
  wrapper.appendChild(topPager.footer);
  wrapper.appendChild(table);
  wrapper.appendChild(bottomPager.footer);

  function renderHead() {
    thead.innerHTML = "";
    const headRow = document.createElement("tr");
    columns.forEach((col) => {
      if (!visibleColumns.has(col.key)) return;
      const th = document.createElement("th");
      th.className = "text-left px-3 py-2 bg-muted cursor-pointer sticky top-0";
      th.textContent = col.label;
      th.addEventListener("click", () => {
        if (sortKey === col.key) {
          sortDir = sortDir === "asc" ? "desc" : "asc";
        } else {
          sortKey = col.key;
          sortDir = "asc";
        }
        renderBody();
      });
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
  }

  renderHead();
  renderBody();
  return wrapper;
}
