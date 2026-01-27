import { expect, test, beforeEach } from "bun:test";
import { mountDisturbedTool } from "../public/js/tools/disturbed.js";

beforeEach(() => {
  document.body.innerHTML = `<div id="disturbed-root"></div>`;
  localStorage.clear();
});

test("mountDisturbedTool renders core fields", () => {
  const root = document.getElementById("disturbed-root");
  mountDisturbedTool(root);

  expect(document.getElementById("disturbed_soil_texture")).not.toBeNull();
  expect(document.getElementById("disturbed_rock_fragments")).not.toBeNull();
  expect(document.getElementById("disturbed_upper_landuse")).not.toBeNull();
  expect(document.getElementById("disturbed_upper_slope_top")).not.toBeNull();
  expect(document.getElementById("disturbed_upper_slope_mid")).not.toBeNull();
  expect(document.getElementById("disturbed_upper_length")).not.toBeNull();
  expect(document.getElementById("disturbed_upper_cover")).not.toBeNull();
  expect(document.getElementById("disturbed_lower_landuse")).not.toBeNull();
  expect(document.getElementById("disturbed_lower_slope_mid")).not.toBeNull();
  expect(document.getElementById("disturbed_lower_slope_bottom")).not.toBeNull();
  expect(document.getElementById("disturbed_lower_length")).not.toBeNull();
  expect(document.getElementById("disturbed_lower_cover")).not.toBeNull();
  expect(document.getElementById("disturbed_sim_years")).not.toBeNull();
  expect(document.getElementById("disturbed_ignore_snowmelt")).not.toBeNull();
  expect(document.getElementById("disturbed_wepp_version")).not.toBeNull();

  const runButton = Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent === "Run Disturbed WEPP Model"
  );
  expect(runButton).not.toBeUndefined();
});

test("results section starts hidden", () => {
  const root = document.getElementById("disturbed-root");
  mountDisturbedTool(root);
  const results = document.getElementById("disturbed-results");
  expect(results).not.toBeNull();
  expect(results?.style.display).toBe("none");
});
