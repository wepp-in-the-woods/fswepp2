import { expect, test, beforeEach } from "bun:test";
import { encodeConfig } from "../public/js/utils/url.js";
import { readDisturbedState } from "../public/js/core/disturbed-state.js";

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, "", "http://localhost/fswepp2/disturbed");
});

test("readDisturbedState returns defaults when empty", () => {
  const state = readDisturbedState();
  expect(state.soil_texture).toBe("clay");
  expect(state.upper_ofe.length_m).toBeGreaterThan(0);
  expect(state.lower_ofe.length_m).toBeGreaterThan(0);
  expect(state.simulation_years).toBe(100);
  expect(state.isric_enabled).toBe(false);
  expect(state.ignore_snowmelt_runoff_events).toBe(false);
  expect(state.wepp_version).toBe("wepp2010");
});

test("readDisturbedState applies stored values", () => {
  localStorage.setItem(
    "fswepp_disturbed_state",
    JSON.stringify({
      soil_texture: "sand",
      upper_ofe: { length_m: 123 },
      simulation_years: 55,
      width_m: 200,
    })
  );
  const state = readDisturbedState();
  expect(state.soil_texture).toBe("sand");
  expect(state.upper_ofe.length_m).toBe(123);
  expect(state.simulation_years).toBe(55);
  expect(state.width_m).toBe(200);
});

test("readDisturbedState respects URL config overrides", () => {
  const config = encodeConfig({
    disturbedwepp_pars: {
      soil_texture: "loam",
      upper_ofe: { length_m: 10 },
      ignore_snowmelt_runoff_events: true,
      wepp_version: "wepp_dcc52a6_hill",
    },
    simulation_years: 25,
  });
  window.history.replaceState(
    {},
    "",
    `http://localhost/fswepp2/disturbed?config=${config}`
  );
  const state = readDisturbedState();
  expect(state.soil_texture).toBe("loam");
  expect(state.upper_ofe.length_m).toBe(10);
  expect(state.simulation_years).toBe(25);
  expect(state.ignore_snowmelt_runoff_events).toBe(true);
  expect(state.wepp_version).toBe("wepp_dcc52a6_hill");
});
