const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.BASE_URL || "http://caddy:8091";

const CLIMATE_COOKIE = {
  name: "fswepp_climate",
  value: JSON.stringify({
    database: "legacy",
    cligen_version: "5.3.2",
    location: null,
    par_id: "ID106152",
    input_years: 100,
    use_prism: false,
    user_defined_par_mod: null,
  }),
  url: BASE_URL,
};

const UNIT_COOKIE = {
  name: "fswepp_units",
  value: JSON.stringify({ globalIndex: 0, preferences: {} }),
  url: BASE_URL,
};

async function runErmit(page) {
  const runButton = page.getByRole("button", { name: "Run ERMiT Model" });
  await expect(runButton).toBeVisible();

  const runResponse = page.waitForResponse((response) =>
    response.url().includes("/ermit/RUN/wepp")
  );
  await runButton.click();
  const response = await runResponse;
  const status = response.status();
  if (status >= 400) {
    const body = await response.text();
    throw new Error(`ERMiT run failed (${status}): ${body}`);
  }

  const results = page.locator("#ermit-results");
  await expect(results).toBeVisible({ timeout: 60000 });
}

test("ERMiT Logs & Wattles updates all years and converts with Unitizer", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  await context.addCookies([CLIMATE_COOKIE, UNIT_COOKIE]);
  await page.goto(`${BASE_URL}/fswepp2/ermit`, { waitUntil: "networkidle" });

  const highSeverity = page.getByRole("radio", { name: /High/i });
  if (await highSeverity.isVisible()) {
    await highSeverity.click();
  }

  await runErmit(page);

  const logsRow = page
    .locator("tr", { hasText: "Logs & Wattles" })
    .first();
  await expect(logsRow).toBeVisible();

  const diameterInput = page.locator("#ermit_logs_diameter");
  const spacingInput = page.locator("#ermit_logs_spacing");
  await expect(diameterInput).toBeVisible();
  await expect(spacingInput).toBeVisible();

  const probInput = page.getByLabel("Target exceedance probability (%)");
  await probInput.fill("1");
  await probInput.blur();

  const getYearValues = async () => {
    const cells = await logsRow.locator("td").allTextContents();
    return cells
      .slice(1, 6)
      .map((value) => Number(value.trim()))
      .map((value) => (Number.isFinite(value) ? value : null));
  };

  const computeExpectedValues = async () =>
    page.evaluate(() => {
      const row = Array.from(document.querySelectorAll("tr")).find((tr) =>
        tr.textContent.includes("Logs & Wattles")
      );
      if (!row) return null;

      const untreatedRow = Array.from(document.querySelectorAll("tr")).find((tr) =>
        tr.textContent.trim().startsWith("Untreated")
      );
      if (!untreatedRow) return null;

      const untreatedCells = Array.from(untreatedRow.querySelectorAll("td"))
        .slice(1, 6)
        .map((cell) => Number(cell.textContent.trim()));

      const sedimentTable = row.closest("table");
      const unitLabel =
        sedimentTable?.querySelector("thead tr th:nth-child(2)")?.textContent ||
        "";
      const usingTonAcre = unitLabel.includes("ton/acre");

      const toMgHa = (value) =>
        usingTonAcre ? value / 0.4461 : value;
      const fromMgHa = (value) =>
        usingTonAcre ? value * 0.4461 : value;

      const diameterInput = document.querySelector("#ermit_logs_diameter");
      const spacingInput = document.querySelector("#ermit_logs_spacing");
      const diameterUnit = diameterInput?.parentElement?.querySelector("span")
        ?.textContent;
      const spacingUnit = spacingInput?.parentElement?.querySelector("span")
        ?.textContent;

      const diameter = Number(diameterInput?.value);
      const spacing = Number(spacingInput?.value);
      const diameter_m = diameterUnit === "ft" ? diameter * 0.3048 : diameter;
      const spacing_m = spacingUnit === "ft" ? spacing * 0.3048 : spacing;

      const slopeInput = document.querySelector("#ermit_middle_slope");
      const slope = Number(slopeInput?.value);

      const textureSelect = document.querySelector(
        'select[id="ermit_soil_texture"]'
      );
      const textureLabel = textureSelect?.value || "clay";
      const densities = {
        clay: 1.1,
        silt: 0.97,
        sand: 1.23,
        loam: 1.16,
      };
      const density = densities[textureLabel] || 1;

      const rainfallTable = document
        .querySelector("#ermit-rainfall-peak10")
        ?.closest("table");
      const peakRows = Array.from(
        rainfallTable?.querySelectorAll("tbody tr") || []
      ).filter((tr) => tr.textContent.includes("year)"));
      const weights = { 5: 0.075, 10: 0.075, 20: 0.2, 50: 0.275, 75: 0.375 };
      let weightedI10 = 0;
      peakRows.forEach((row) => {
        const cells = row.querySelectorAll("td");
        if (!cells.length) return;
        const rankMatch = cells[0].textContent.match(/^\s*(\d+)/);
        const rank = rankMatch ? Number(rankMatch[1]) : null;
        const weight = weights[rank];
        if (!weight) return;
        const peakValue = Number(cells[4]?.textContent.trim());
        if (!Number.isFinite(peakValue)) return;
        const peakMmHr = document
          .querySelector("#ermit-rainfall-peak10")
          ?.textContent.includes("in/hour")
          ? peakValue * 25.4
          : peakValue;
        weightedI10 += weight * peakMmHr;
      });

      if (!Number.isFinite(slope) || slope < 0.05 || spacing_m < 1.5) {
        return untreatedCells.map((value) =>
          Number.isFinite(value) ? Number(value.toFixed(2)) : null
        );
      }

      const diam_cm = diameter_m * 100;
      let capacityVol =
        1342 / slope + 0.0029 * diam_cm * diam_cm + 272 / spacing_m - 35.4;
      if (capacityVol < 0) capacityVol = 0;
      const capacityMgHa = capacityVol * density;

      const eff0 = Math.min(Math.max(113.97 - 0.8425 * weightedI10, 0), 100);
      const eff1 = Math.min(Math.max(116 - 1.4 * weightedI10, 0), 100);
      const eff2 = eff1 * 0.75;
      const eff3 = eff2 * 0.55;
      const eff4 = eff3 * 0.45;
      const effs = [eff0, eff1, eff2, eff3, eff4];

      return untreatedCells.map((value, idx) => {
        if (!Number.isFinite(value)) return null;
        const untreated = toMgHa(value);
        const caught = Math.min((capacityMgHa * effs[idx]) / 100, untreated);
        const treated = untreated - caught;
        return Number(fromMgHa(treated).toFixed(2));
      });
    });

  const expectedBefore = await computeExpectedValues();
  expect(expectedBefore).toBeTruthy();
  const beforeValues = await getYearValues();
  expectedBefore.forEach((value, idx) => {
    if (value === null) return;
    expect(beforeValues[idx]).toBeCloseTo(value, 0);
  });

  await diameterInput.fill("0.15");
  await diameterInput.blur();
  await spacingInput.fill("25");
  await spacingInput.blur();

  const expectedAfter = await computeExpectedValues();
  const afterValues = await getYearValues();
  expectedAfter.forEach((value, idx) => {
    if (value === null) return;
    expect(afterValues[idx]).toBeCloseTo(value, 0);
  });

  const getUnitState = async () =>
    page.evaluate(() => {
      const input = document.querySelector("#ermit_logs_diameter");
      const unit = input?.parentElement?.querySelector("span")?.textContent?.trim();
      return {
        unit,
        value: Number(input?.value),
      };
    });

  const unitBefore = await getUnitState();
  expect(unitBefore.unit).toBeTruthy();

  if (unitBefore.unit === "ft") {
    await page.getByRole("button", { name: "Metric" }).click();
    await expect
      .poll(() =>
        page.evaluate(
          () => window.UnitizerClient?.getClientSync?.()?.getPreferencePayload?.()?.["sm-distance"]
        )
      )
      .toBe("m");
    await expect.poll(async () => (await getUnitState()).unit).toBe("m");
    await expect
      .poll(async () => (await getUnitState()).value)
      .toBeCloseTo(unitBefore.value * 0.3048, 1);
  } else {
    await page.getByRole("button", { name: "English" }).click();
    await expect
      .poll(() =>
        page.evaluate(
          () => window.UnitizerClient?.getClientSync?.()?.getPreferencePayload?.()?.["sm-distance"]
        )
      )
      .toBe("ft");
    await expect.poll(async () => (await getUnitState()).unit).toBe("ft");
    await expect
      .poll(async () => (await getUnitState()).value)
      .toBeCloseTo(unitBefore.value * 3.28084, 1);
  }
});
