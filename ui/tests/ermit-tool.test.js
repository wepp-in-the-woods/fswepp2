import { expect, test, beforeEach } from "bun:test";
import { mountErmitTool } from "../public/js/tools/ermit.js";

beforeEach(() => {
  document.body.innerHTML = `<div id="ermit-root"></div>`;
  localStorage.clear();
});

test("mountErmitTool renders core fields", () => {
  const root = document.getElementById("ermit-root");
  mountErmitTool(root);

  expect(document.getElementById("ermit_soil_texture")).not.toBeNull();
  expect(document.getElementById("ermit_rock_fragments")).not.toBeNull();
  expect(document.getElementById("ermit_shrub_cover")).not.toBeNull();
  expect(document.getElementById("ermit_grass_cover")).not.toBeNull();
  expect(document.getElementById("ermit_bare_cover")).not.toBeNull();
  expect(document.getElementById("ermit_top_slope")).not.toBeNull();
  expect(document.getElementById("ermit_middle_slope")).not.toBeNull();
  expect(document.getElementById("ermit_bottom_slope")).not.toBeNull();
  expect(document.getElementById("ermit_hillslope_length")).not.toBeNull();
  expect(document.getElementById("ermit_sim_years")).not.toBeNull();
  expect(document.getElementById("ermit_wepp_version")).not.toBeNull();

  const runButton = Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent === "Run ERMiT Model"
  );
  expect(runButton).not.toBeUndefined();
});

test("results section starts hidden", () => {
  const root = document.getElementById("ermit-root");
  mountErmitTool(root);
  const results = document.getElementById("ermit-results");
  expect(results).not.toBeNull();
  expect(results?.style.display).toBe("none");
});
