import { expect, test, beforeEach } from "bun:test";
import { mountWeppRoadTool } from "../public/js/tools/wepproad.js";

beforeEach(() => {
  document.body.innerHTML = `<div id="wepproad-root"></div>`;
  localStorage.clear();
});

test("mountWeppRoadTool renders core fields", () => {
  const root = document.getElementById("wepproad-root");
  mountWeppRoadTool(root);

  expect(document.getElementById("wepproad_soil_texture")).not.toBeNull();
  expect(document.getElementById("wepproad_rock_fragments")).not.toBeNull();
  expect(document.getElementById("wepproad_road_slope")).not.toBeNull();
  expect(document.getElementById("wepproad_road_length")).not.toBeNull();
  expect(document.getElementById("wepproad_road_width")).not.toBeNull();
  expect(document.getElementById("wepproad_fill_slope")).not.toBeNull();
  expect(document.getElementById("wepproad_fill_length")).not.toBeNull();
  expect(document.getElementById("wepproad_buffer_slope")).not.toBeNull();
  expect(document.getElementById("wepproad_buffer_length")).not.toBeNull();
  expect(document.getElementById("wepproad_sim_years")).not.toBeNull();

  const runButton = Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent === "Run WEPP Road Model"
  );
  expect(runButton).not.toBeUndefined();
});

test("results section starts hidden", () => {
  const root = document.getElementById("wepproad-root");
  mountWeppRoadTool(root);
  const results = document.getElementById("wepproad-results");
  expect(results).not.toBeNull();
  expect(results?.style.display).toBe("none");
});
