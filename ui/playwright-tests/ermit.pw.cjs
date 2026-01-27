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

test("ERMiT smoke flow with unit toggle", async ({ page, context }) => {
  test.setTimeout(120000);
  await context.addCookies([CLIMATE_COOKIE, UNIT_COOKIE]);
  await page.goto(`${BASE_URL}/fswepp2/ermit`, { waitUntil: "networkidle" });

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

  const sedimentTable = page
    .locator("#ermit-results table")
    .filter({ hasText: "Untreated" })
    .first();

  await expect(sedimentTable).toContainText("tonne/ha");

  const englishToggle = page.getByRole("button", { name: "English" });
  await englishToggle.click();
  await expect(sedimentTable).toContainText("ton/acre");
});
