import { expect, test, beforeEach } from "bun:test";
import { encodeConfig } from "../public/js/utils/url.js";
import { readFumeState } from "../public/js/core/fume-state.js";

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, "", "http://localhost/fswepp2/fume");
});

test("readFumeState returns defaults when empty", () => {
  const state = readFumeState();
  expect(state.soil_texture).toBe("clay");
  expect(state.total_length_m).toBeGreaterThan(0);
  expect(state.buffer_length_m).toBeGreaterThan(0);
  expect(state.simulation_years).toBe(50);
  expect(state.wepp_version).toBe("wepp2010");
});

test("readFumeState applies stored values", () => {
  localStorage.setItem(
    "fswepp_fume_state",
    JSON.stringify({
      soil_texture: "sand",
      total_length_m: 10,
      simulation_years: 80,
    })
  );
  const state = readFumeState();
  expect(state.soil_texture).toBe("sand");
  expect(state.total_length_m).toBe(10);
  expect(state.simulation_years).toBe(80);
});

test("readFumeState respects URL config overrides", () => {
  const config = encodeConfig({
    fume_pars: { soil_texture: "loam", total_length_m: 20 },
    simulation_years: 25,
    wepp_version: "wepp_dcc52a6_hill",
  });
  window.history.replaceState(
    {},
    "",
    `http://localhost/fswepp2/fume?config=${config}`
  );
  const state = readFumeState();
  expect(state.soil_texture).toBe("loam");
  expect(state.total_length_m).toBe(20);
  expect(state.simulation_years).toBe(25);
  expect(state.wepp_version).toBe("wepp_dcc52a6_hill");
});
