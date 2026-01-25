import { createButton } from "./components/button.js";
import { createFormField } from "./components/form-field.js";
import { createModal, bindModalTriggers, closeModal } from "./components/modal.js";
import { createCollapsibleSection } from "./components/collapsible.js";
import { createTabPanel } from "./components/tabs.js";
import { createDataTable } from "./components/data-table.js";
import { createRunButton } from "./components/run-button.js";
import { createStatCard } from "./components/stat-card.js";
import { createAlert } from "./components/alert.js";
import { createPreformattedBlock } from "./components/preformatted.js";
import { createDropAndUpload } from "./components/drop-and-upload.js";

function mountGallery() {
  const root = document.getElementById("component-gallery-root");
  if (!root) return;

  const section = (title, description) => {
    const wrapper = document.createElement("section");
    wrapper.className = "space-y-4";
    const h2 = document.createElement("h2");
    h2.className = "text-xl font-semibold";
    h2.textContent = title;
    const p = document.createElement("p");
    p.className = "text-sm text-muted-foreground";
    p.textContent = description || "";
    wrapper.appendChild(h2);
    if (description) wrapper.appendChild(p);
    return wrapper;
  };

  const buttons = section("Buttons", "Primary, secondary, outline, and destructive variants.");
  const buttonRow = document.createElement("div");
  buttonRow.className = "flex flex-wrap gap-2";
  const btnPrimary = createButton("Primary", "default", { id: "btn_primary" });
  btnPrimary.setAttribute("data-contrast-id", "button-primary");
  const btnSecondary = createButton("Secondary", "secondary", { id: "btn_secondary" });
  btnSecondary.setAttribute("data-contrast-id", "button-secondary");
  const btnOutline = createButton("Outline", "outline", { id: "btn_outline" });
  btnOutline.setAttribute("data-contrast-id", "button-outline");
  const btnDestructive = createButton("Destructive", "destructive", { id: "btn_destructive" });
  btnDestructive.setAttribute("data-contrast-id", "button-destructive");
  buttonRow.appendChild(btnPrimary);
  buttonRow.appendChild(btnSecondary);
  buttonRow.appendChild(btnOutline);
  buttonRow.appendChild(btnDestructive);
  buttons.appendChild(buttonRow);

  const runButtons = section("Run Button", "Idle, running, error, and success states.");
  const runRow = document.createElement("div");
  runRow.className = "grid gap-3 sm:grid-cols-2 lg:grid-cols-4";
  const runIdle = createRunButton({ label: "Run Model" });
  runIdle.button.setAttribute("data-contrast-id", "run-button-idle");
  const runRunning = createRunButton({ label: "Run Model" });
  runRunning.setState("running");
  runRunning.button.setAttribute("data-contrast-id", "run-button-running");
  const runError = createRunButton({ label: "Run Model" });
  runError.setState("error", "Retry", "Server error. Please try again.");
  runError.button.setAttribute("data-contrast-id", "run-button-error");
  runError.messageEl.setAttribute("data-contrast-id", "run-button-error-message");
  const runSuccess = createRunButton({ label: "Run Model" });
  runSuccess.setState("success", "Success");
  runSuccess.button.setAttribute("data-contrast-id", "run-button-success");
  runRow.appendChild(runIdle.wrapper);
  runRow.appendChild(runRunning.wrapper);
  runRow.appendChild(runError.wrapper);
  runRow.appendChild(runSuccess.wrapper);
  runButtons.appendChild(runRow);

  const fields = section("Form Fields", "Core input styles with helper and error states.");
  const fieldGrid = document.createElement("div");
  fieldGrid.className = "grid gap-4 md:grid-cols-2";
  const textField = createFormField({
    id: "field_text",
    label: "Text Field",
    value: "Sample",
    help: "Helper text for context.",
    validator: (value) => (value.trim() ? true : "Value required."),
  });
  textField.input.setAttribute("data-contrast-id", "form-input-text");
  const numberField = createFormField({
    id: "field_number",
    label: "Number Field",
    type: "number",
    value: "10",
    unitLabel: "m",
    help: "Unit-aware numeric field.",
    validator: (value) => {
      const num = Number(value);
      if (!Number.isFinite(num) || num < 0 || num > 100) {
        return "Enter a value between 0 and 100.";
      }
      return true;
    },
  });
  numberField.input.setAttribute("data-contrast-id", "form-input-number");
  const errorField = createFormField({
    id: "field_error",
    label: "Required Field",
    value: "",
    required: true,
    error: "This field is required.",
  });
  errorField.input.setAttribute("data-contrast-id", "form-input-error");
  fieldGrid.appendChild(textField.wrapper);
  fieldGrid.appendChild(numberField.wrapper);
  fieldGrid.appendChild(errorField.wrapper);
  fields.appendChild(fieldGrid);

  const validationHint = document.createElement("p");
  validationHint.className = "text-xs text-muted-foreground";
  validationHint.textContent = "Type in the fields to see validation hooks.";
  fields.appendChild(validationHint);

  // Validation hooks are now wired through the shared FormField helper.

  const alerts = section("Alerts", "Info, warning, and error alerts.");
  const alertStack = document.createElement("div");
  alertStack.className = "space-y-3";
  alertStack.appendChild(
    createAlert({
      title: "Info",
      message: "Model ready. Configure inputs and run.",
      variant: "info",
    })
  );
  const warningAlert = createAlert({
    title: "Warning",
    message: "Some fields are near their limits.",
    variant: "warning",
  });
  warningAlert.setAttribute("data-contrast-id", "alert-warning");
  alertStack.appendChild(warningAlert);
  const errorAlert = createAlert({
    title: "Error",
    message: "Run failed. Adjust inputs and retry.",
    variant: "error",
  });
  errorAlert.setAttribute("data-contrast-id", "alert-error");
  alertStack.appendChild(errorAlert);
  alertStack.firstElementChild?.setAttribute("data-contrast-id", "alert-info");
  alerts.appendChild(alertStack);

  const stats = section("Stat Cards", "Summary statistics display.");
  const statRow = document.createElement("div");
  statRow.className = "grid gap-3 sm:grid-cols-2 lg:grid-cols-3";
  const statA = createStatCard({
      label: "Avg Precipitation",
      value: "820",
      unit: "mm",
      helper: "30-year mean",
    });
  statA.setAttribute("data-contrast-id", "stat-card-precip");
  statRow.appendChild(statA);
  const statB = createStatCard({
      label: "Runoff",
      value: "120",
      unit: "mm",
    });
  statB.setAttribute("data-contrast-id", "stat-card-runoff");
  statRow.appendChild(statB);
  const statC = createStatCard({
      label: "Sediment Delivery",
      value: "0.84",
      unit: "kg/m²",
    });
  statC.setAttribute("data-contrast-id", "stat-card-sediment");
  statRow.appendChild(statC);
  stats.appendChild(statRow);

  const modalSection = section("Modal", "Custom modal with focus trap and overlay.");
  const modalTrigger = createButton("Open Modal", "default", {
    id: "open_modal_btn",
  });
  modalTrigger.setAttribute("data-modal-open", "demo_modal");
  modalSection.appendChild(modalTrigger);

  const modalContent = document.createElement("div");
  modalContent.innerHTML =
    "<p class='text-sm text-muted-foreground'>Modal content goes here.</p>";
  const modal = createModal({
    id: "demo_modal",
    title: "Demo Modal",
    content: modalContent,
    actions: [
      createButton("Close", "outline", {
        onClick: () => closeModal("demo_modal"),
      }),
      createButton("Confirm", "default"),
    ],
  });
  modalSection.appendChild(modal);

  const collapsibleSection = section("Collapsible Section", "Expandable content container.");
  const collapsible = createCollapsibleSection({
    title: "Advanced Options",
    description: "Optional tuning controls.",
    content: "<p class='text-sm text-muted-foreground'>Hidden content.</p>",
    persistKey: "fswepp2_gallery_collapsible",
  });
  collapsibleSection.appendChild(collapsible);

  const preSection = section(
    "Preformatted Blocks",
    "Standardized preformatted text styling."
  );
  const preBlock = createPreformattedBlock({
    text: "Sample output:\nMEAN P   0.40  0.35  0.28  0.20\nTMAX AV 72.0  75.1  82.3  90.2",
  });
  preBlock.pre.setAttribute("data-contrast-id", "preformatted-block");
  preSection.appendChild(preBlock.pre);

  const dropSection = section(
    "Drop & Upload",
    "Drag-and-drop upload surface with optional status messaging."
  );
  const dropUpload = createDropAndUpload({
    id: "gallery-drop-upload",
    buttonText: "Drop or Upload .json",
    helper: "Accepts JSON files.",
  });
  dropUpload.dropZone.setAttribute("data-contrast-id", "drop-upload-zone");
  dropSection.appendChild(dropUpload.wrapper);

  const tabsSection = section("Tabs", "Keyboard navigable tabbed interface.");
  const tabs = createTabPanel({
    tabs: [
      { label: "Overview", content: "<p class='text-sm'>Overview content.</p>" },
      { label: "Details", content: "<p class='text-sm'>Detail content.</p>" },
      { label: "Results", content: "<p class='text-sm'>Result content.</p>" },
    ],
  });
  tabsSection.appendChild(tabs);

  const tabsVertical = createTabPanel({
    orientation: "vertical",
    lazy: true,
    tabs: [
      { label: "Inputs", content: "<p class='text-sm'>Lazy inputs panel.</p>" },
      { label: "Outputs", content: "<p class='text-sm'>Lazy outputs panel.</p>" },
      { label: "Logs", content: "<p class='text-sm'>Lazy logs panel.</p>" },
    ],
  });
  tabsSection.appendChild(tabsVertical);

  const tableSection = section(
    "Data Table",
    "Sortable/paginated table with CSV export and column toggles."
  );
  const table = createDataTable({
    columns: [
      { key: "year", label: "Year" },
      { key: "precip", label: "Precip (mm)" },
      { key: "runoff", label: "Runoff (mm)" },
    ],
    rows: [
      { year: 1, precip: 820, runoff: 120 },
      { year: 2, precip: 790, runoff: 98 },
      { year: 3, precip: 910, runoff: 140 },
    ],
  });
  tableSection.appendChild(table);
  table.querySelectorAll("th").forEach((th, index) => {
    th.setAttribute("data-contrast-id", `table-header-${index + 1}`);
  });
  table
    .querySelector('button[type="button"]')
    ?.setAttribute("data-contrast-id", "table-export");
  table
    .querySelector("summary")
    ?.setAttribute("data-contrast-id", "table-columns-toggle");
  table
    .querySelector("select")
    ?.setAttribute("data-contrast-id", "table-page-size");
  table
    .querySelector('input[type="number"]')
    ?.setAttribute("data-contrast-id", "table-page-jump");

  const themeLab = section(
    "Theme Lab",
    "Contrast tokens and layout specimens for accessibility review."
  );
  const themeGrid = document.createElement("div");
  themeGrid.className = "grid gap-4 md:grid-cols-2 lg:grid-cols-3";
  const themeCard = (id, title, description, content) => {
    const card = document.createElement("article");
    card.className = "rounded-xl border border-border bg-card p-4 shadow-sm";
    card.setAttribute("data-contrast-id", `theme-card-${id}`);
    const header = document.createElement("div");
    header.className = "mb-3";
    const h3 = document.createElement("h3");
    h3.className = "text-base font-semibold";
    h3.textContent = title;
    const p = document.createElement("p");
    p.className = "text-sm text-muted-foreground";
    p.textContent = description;
    header.appendChild(h3);
    header.appendChild(p);
    const body = document.createElement("div");
    if (content instanceof HTMLElement) body.appendChild(content);
    card.appendChild(header);
    card.appendChild(body);
    return card;
  };
  themeGrid.appendChild(
    themeCard(
      "primary-button",
      "Primary action",
      "Check primary button contrast.",
      (() => {
        const btn = createButton("Run WEPP", "default");
        btn.setAttribute("data-contrast-id", "theme-primary-button");
        return btn;
      })()
    )
  );
  themeGrid.appendChild(
    themeCard(
      "secondary-button",
      "Secondary action",
      "Secondary/outline button contrast.",
      (() => {
        const btn = createButton("Cancel", "outline");
        btn.setAttribute("data-contrast-id", "theme-secondary-button");
        return btn;
      })()
    )
  );
  themeGrid.appendChild(
    themeCard(
      "helper-text",
      "Helper copy",
      "Helper text legibility on card.",
      (() => {
        const field = createFormField({
          id: "theme_lab_field",
          label: "Watershed name",
          value: "South Fork Fire",
          help: "Helper text should remain legible.",
        });
        field.input.setAttribute("data-contrast-id", "theme-input-field");
        field.wrapper
          .querySelector("p.text-muted-foreground")
          ?.setAttribute("data-contrast-id", "theme-helper-text");
        return field.wrapper;
      })()
    )
  );
  themeGrid.appendChild(
    themeCard(
      "alert-info",
      "Info alert",
      "Alert text contrast check.",
      (() => {
        const alert = createAlert({
          title: "Info",
          message: "This is an informational alert.",
          variant: "info",
        });
        alert.setAttribute("data-contrast-id", "theme-alert-info");
        return alert;
      })()
    )
  );
  themeGrid.appendChild(
    themeCard(
      "alert-error",
      "Error alert",
      "Error alert text contrast check.",
      (() => {
        const alert = createAlert({
          title: "Error",
          message: "This is an error alert.",
          variant: "error",
        });
        alert.setAttribute("data-contrast-id", "theme-alert-error");
        return alert;
      })()
    )
  );
  themeGrid.appendChild(
    themeCard(
      "input-field",
      "Input field",
      "Input text contrast check.",
      (() => {
        const field = createFormField({
          id: "theme_lab_input",
          label: "Road length",
          value: "120",
          help: "Meters",
        });
        field.input.setAttribute("data-contrast-id", "theme-input-plain");
        return field.wrapper;
      })()
    )
  );
  themeGrid.appendChild(
    themeCard(
      "preformatted",
      "Preformatted block",
      "Preformatted text contrast check.",
      (() => {
        const block = createPreformattedBlock({
          text: "CLIGEN STATION OUTPUT\nMEAN P   0.40  0.35  0.28",
        });
        block.pre.setAttribute("data-contrast-id", "theme-preformatted");
        return block.pre;
      })()
    )
  );
  themeGrid.appendChild(
    themeCard(
      "drop-upload",
      "Drop upload",
      "Drop zone border and label contrast check.",
      (() => {
        const drop = createDropAndUpload({
          id: "theme-drop-upload",
          buttonText: "Drop or Upload .json",
        });
        drop.dropZone.setAttribute("data-contrast-id", "theme-drop-upload");
        return drop.wrapper;
      })()
    )
  );
  themeLab.appendChild(themeGrid);

  const metricsSection = section(
    "Contrast Metrics",
    "Generate a markdown report of contrast ratios across component primitives."
  );
  const metricsControls = document.createElement("div");
  metricsControls.className = "flex items-center gap-2";
  const metricsButton = createButton("Generate Report", "outline");
  const metricsDownload = createButton("Download Markdown", "default");
  metricsDownload.disabled = true;
  metricsControls.appendChild(metricsButton);
  metricsControls.appendChild(metricsDownload);
  metricsSection.appendChild(metricsControls);

  const metricsOutput = createPreformattedBlock({ className: "mt-3" });
  metricsSection.appendChild(metricsOutput.pre);

  root.appendChild(buttons);
  root.appendChild(runButtons);
  root.appendChild(fields);
  root.appendChild(alerts);
  root.appendChild(stats);
  root.appendChild(modalSection);
  root.appendChild(collapsibleSection);
  root.appendChild(preSection);
  root.appendChild(dropSection);
  root.appendChild(tabsSection);
  root.appendChild(tableSection);
  root.appendChild(themeLab);
  root.appendChild(metricsSection);

  bindModalTriggers();

  function parseRgb(value) {
    const match = value.match(/rgba?\(([^)]+)\)/i);
    if (!match) return null;
    const parts = match[1].split(",").map((part) => part.trim());
    const r = Number(parts[0]);
    const g = Number(parts[1]);
    const b = Number(parts[2]);
    const a = parts.length > 3 ? Number(parts[3]) : 1;
    if ([r, g, b, a].some((n) => Number.isNaN(n))) return null;
    return { r, g, b, a };
  }

  function normalizeColor(color) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return parseRgb(color);
    ctx.fillStyle = "#000";
    try {
      ctx.fillStyle = color;
    } catch (error) {
      return parseRgb(color);
    }
    return parseRgb(ctx.fillStyle);
  }

  function relativeLuminance({ r, g, b }) {
    const srgb = [r, g, b].map((v) => v / 255);
    const lin = srgb.map((v) =>
      v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
    );
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  }

  function contrastRatio(fg, bg) {
    const l1 = relativeLuminance(fg);
    const l2 = relativeLuminance(bg);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function getEffectiveBackground(el) {
    let current = el;
    while (current) {
      const style = getComputedStyle(current);
      const bg = normalizeColor(style.backgroundColor);
      if (bg && bg.a > 0) return bg;
      current = current.parentElement;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  }

  function getContrastRows() {
    const suite = document.querySelector("[data-contrast-suite]");
    if (!suite) return [];
    const items = suite.querySelectorAll("[data-contrast-id]");
    const rows = [];
    items.forEach((item) => {
      const id = item.getAttribute("data-contrast-id") || "";
      const style = getComputedStyle(item);
      const fg = normalizeColor(style.color) || { r: 0, g: 0, b: 0, a: 1 };
      const bg = getEffectiveBackground(item);
      const ratio = contrastRatio(fg, bg);
      rows.push({
        id,
        ratio: ratio.toFixed(2),
        fg: style.color,
        bg: style.backgroundColor,
        aa: ratio >= 4.5 ? "PASS" : "FAIL",
        aaLarge: ratio >= 3 ? "PASS" : "FAIL",
      });
    });
    return rows;
  }

  function buildMarkdown(rows) {
    const header =
      "| Component | Contrast Ratio | AA Normal | AA Large | Foreground | Background |\n| --- | --- | --- | --- | --- | --- |";
    const lines = rows.map(
      (row) =>
        `| ${row.id} | ${row.ratio} | ${row.aa} | ${row.aaLarge} | ${row.fg} | ${row.bg} |`
    );
    return [header, ...lines].join("\n");
  }

  function downloadMarkdown(content) {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fswepp2-contrast-metrics.md";
    link.click();
    URL.revokeObjectURL(url);
  }

  metricsButton.addEventListener("click", () => {
    const rows = getContrastRows();
    const markdown = buildMarkdown(rows);
    metricsOutput.setText(markdown);
    metricsDownload.disabled = false;
    metricsDownload.onclick = () => downloadMarkdown(markdown);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountGallery);
} else {
  mountGallery();
}
