import { expect, test, beforeEach } from "bun:test";
import { encodeConfig } from "../public/js/utils/url.js";
import { readErmitState } from "../public/js/core/ermit-state.js";

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, "", "http://localhost/fswepp2/ermit");
});

test("readErmitState returns defaults when empty", () => {
  const state = readErmitState();
  expect(state.soil_texture).toBe("clay");
  expect(state.rfg_pct).toBe(20);
  expect(state.top_slope_pct).toBe(0.001);
  expect(state.middle_slope_pct).toBe(50);
  expect(state.bottom_slope_pct).toBe(30);
  expect(state.length_m).toBeCloseTo(91.44);
  expect(state.vegetation_type).toBe("Chaparral");
  expect(state.burn_severity).toBe("Low");
  expect(state.user_shrub_pct).toBe(80);
  expect(state.user_grass_pct).toBe(0);
  expect(state.user_bare_pct).toBe(20);
  expect(state.simulation_years).toBe(100);
  expect(state.wepp_version).toBe("wepp2010");
});

test("readErmitState applies stored values with normalization", () => {
  localStorage.setItem(
    "fswepp_ermit_state",
    JSON.stringify({
      soil_texture: "sand",
      rfg_pct: 30,
      vegetation_type: "Forest",
      user_shrub_pct: 10,
      user_grass_pct: 20,
    })
  );
  const state = readErmitState();
  expect(state.soil_texture).toBe("sand");
  expect(state.rfg_pct).toBe(30);
  expect(state.vegetation_type).toBe("Forest");
  expect(state.user_shrub_pct).toBeNull();
  expect(state.user_grass_pct).toBeNull();
  expect(state.user_bare_pct).toBeNull();
});

test("readErmitState respects URL config overrides", () => {
  const config = encodeConfig({
    ermit_pars: {
      soil_texture: "loam",
      rfg_pct: 55,
      top_slope_pct: 2.5,
      middle_slope_pct: 20,
      bottom_slope_pct: 5,
      length_m: 120,
      vegetation_type: "Range",
      burn_severity: "Moderate",
      user_shrub_pct: 15,
      user_grass_pct: 75,
      user_bare_pct: 10,
    },
    simulation_years: 25,
    wepp_version: "wepp_dcc52a6_hill",
  });
  window.history.replaceState(
    {},
    "",
    `http://localhost/fswepp2/ermit?config=${config}`
  );
  const state = readErmitState();
  expect(state.soil_texture).toBe("loam");
  expect(state.rfg_pct).toBe(55);
  expect(state.top_slope_pct).toBe(2.5);
  expect(state.middle_slope_pct).toBe(20);
  expect(state.bottom_slope_pct).toBe(5);
  expect(state.length_m).toBe(120);
  expect(state.vegetation_type).toBe("Range");
  expect(state.burn_severity).toBe("Moderate");
  expect(state.user_shrub_pct).toBe(15);
  expect(state.user_grass_pct).toBe(75);
  expect(state.user_bare_pct).toBe(10);
  expect(state.simulation_years).toBe(25);
  expect(state.wepp_version).toBe("wepp_dcc52a6_hill");
});
