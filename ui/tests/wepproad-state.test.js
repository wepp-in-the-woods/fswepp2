import { expect, test, beforeEach } from "bun:test";
import { encodeConfig } from "../public/js/utils/url.js";
import { readWeppRoadState } from "../public/js/core/wepproad-state.js";

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, "", "http://localhost/fswepp2/wepproad");
});

test("readWeppRoadState returns defaults when empty", () => {
  const state = readWeppRoadState();
  expect(state.soil_texture).toBe("clay");
  expect(state.road.length_m).toBeGreaterThan(0);
  expect(state.simulation_years).toBe(100);
  expect(state.isric_enabled).toBe(false);
  expect(state.wepp_version).toBe("wepp2010");
});

test("readWeppRoadState applies stored values", () => {
  localStorage.setItem(
    "fswepp_wepproad_state",
    JSON.stringify({
      soil_texture: "sand",
      road: { length_m: 123 },
      simulation_years: 55,
    })
  );
  const state = readWeppRoadState();
  expect(state.soil_texture).toBe("sand");
  expect(state.road.length_m).toBe(123);
  expect(state.simulation_years).toBe(55);
});

test("readWeppRoadState respects URL config overrides", () => {
  const config = encodeConfig({
    wepproad_pars: { soil_texture: "loam", road: { length_m: 10 } },
    simulation_years: 25,
    wepp_version: "wepp_dcc52a6_hill",
  });
  window.history.replaceState(
    {},
    "",
    `http://localhost/fswepp2/wepproad?config=${config}`
  );
  const state = readWeppRoadState();
  expect(state.soil_texture).toBe("loam");
  expect(state.road.length_m).toBe(10);
  expect(state.simulation_years).toBe(25);
  expect(state.wepp_version).toBe("wepp_dcc52a6_hill");
});
