const { test, expect } = require("@playwright/test");

test("RockClim longitude label has clear separation from input", async ({
  page,
}) => {
  await page.goto("/fswepp2/wepproad");
  await page.getByRole("button", { name: "Rock Climate Control" }).click();

  const label = page.locator('label[for="rockclim_longitude"]');
  const input = page.locator("#rockclim_longitude");

  await expect(label).toBeVisible();
  await expect(input).toBeVisible();

  const labelBox = await label.boundingBox();
  const inputBox = await input.boundingBox();

  expect(labelBox).not.toBeNull();
  expect(inputBox).not.toBeNull();

  if (!labelBox || !inputBox) return;

  const gap = inputBox.y - (labelBox.y + labelBox.height);
  expect(gap).toBeGreaterThanOrEqual(6);
});
