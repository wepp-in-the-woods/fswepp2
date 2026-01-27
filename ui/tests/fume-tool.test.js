import { expect, test, beforeEach } from "bun:test";
import { mountFumeTool } from "../public/js/tools/fume.js";

beforeEach(() => {
  document.body.innerHTML = `<div id="fume-root"></div>`;
  localStorage.clear();
});

test("mountFumeTool renders core fields", () => {
  const root = document.getElementById("fume-root");
  mountFumeTool(root);

  expect(document.getElementById("fume_soil_texture")).not.toBeNull();
  expect(document.getElementById("fume_road_density")).not.toBeNull();
  expect(document.getElementById("fume_total_length")).not.toBeNull();
  expect(document.getElementById("fume_buffer_length")).not.toBeNull();
  expect(document.getElementById("fume_treated_length")).not.toBeNull();
  expect(document.getElementById("fume_top_slope")).not.toBeNull();
  expect(document.getElementById("fume_mid_slope")).not.toBeNull();
  expect(document.getElementById("fume_bottom_slope")).not.toBeNull();
  expect(document.getElementById("fume_wildfire_cycle")).not.toBeNull();
  expect(document.getElementById("fume_rx_cycle")).not.toBeNull();
  expect(document.getElementById("fume_thinning_cycle")).not.toBeNull();
  expect(document.getElementById("fume_sim_years")).not.toBeNull();
  expect(document.getElementById("fume_wepp_version")).not.toBeNull();

  const runButton = Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent === "Run FuME Model"
  );
  expect(runButton).not.toBeUndefined();
});

test("results section starts hidden", () => {
  const root = document.getElementById("fume-root");
  mountFumeTool(root);
  const results = document.getElementById("fume-results");
  expect(results).not.toBeNull();
  expect(results?.style.display).toBe("none");
});
