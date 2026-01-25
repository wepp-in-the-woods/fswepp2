import { beforeEach, expect, test } from "bun:test";
import {
  readClimateState,
  writeClimateState,
} from "../public/js/core/rockclim-state.js";

function clearCookies() {
  document.cookie = "fswepp_climate=; Max-Age=0; path=/";
}

beforeEach(() => {
  clearCookies();
});

test("readClimateState falls back to defaults", () => {
  const state = readClimateState();
  expect(state.database).toBe("legacy");
  expect(state.cligen_version).toBe("5.3.2");
  expect(state.location).toBeNull();
});

test("writeClimateState persists climate cookie", () => {
  const updated = writeClimateState({
    database: "2015",
    cligen_version: "4.3",
    location: { longitude: -116.5, latitude: 47.2 },
    par_id: "WA459074",
    input_years: 50,
    use_prism: true,
  });
  const reloaded = readClimateState();
  expect(reloaded.database).toBe("2015");
  expect(reloaded.cligen_version).toBe("4.3");
  expect(reloaded.location.longitude).toBe(updated.location.longitude);
  expect(reloaded.par_id).toBe("WA459074");
  expect(reloaded.use_prism).toBe(true);
});
