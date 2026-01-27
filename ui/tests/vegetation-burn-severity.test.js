import { expect, test, beforeEach } from "bun:test";
import { createVegetationBurnSeverity } from "../public/js/components/vegetation-burn-severity.js";

beforeEach(() => {
  document.body.innerHTML = "";
});

test("prefire fields initialize for chaparral", () => {
  const state = {
    vegetation_type: "Chaparral",
    burn_severity: "Low",
    user_shrub_pct: 80,
    user_grass_pct: 0,
    user_bare_pct: 20,
  };
  const { wrapper, shrubField, grassField, bareField } =
    createVegetationBurnSeverity({ state, idPrefix: "ermit" });
  document.body.appendChild(wrapper);

  expect(shrubField.input.value).toBe("80");
  expect(grassField.input.value).toBe("0");
  expect(bareField.input.value).toBe("20");
  expect(shrubField.wrapper.parentElement?.style.display).toBe("");
});

test("setVegetation applies range defaults", () => {
  const state = {
    vegetation_type: "Chaparral",
    burn_severity: "Low",
    user_shrub_pct: 80,
    user_grass_pct: 0,
    user_bare_pct: 20,
  };
  const { shrubField, grassField, bareField, setVegetation } =
    createVegetationBurnSeverity({ state, idPrefix: "ermit" });

  setVegetation("Range", true);

  expect(state.vegetation_type).toBe("Range");
  expect(state.user_shrub_pct).toBe(15);
  expect(state.user_grass_pct).toBe(75);
  expect(state.user_bare_pct).toBe(10);
  expect(shrubField.input.value).toBe("15");
  expect(grassField.input.value).toBe("75");
  expect(bareField.input.value).toBe("10");
});

test("setVegetation clears prefire fields for forest", () => {
  const state = {
    vegetation_type: "Range",
    burn_severity: "Moderate",
    user_shrub_pct: 15,
    user_grass_pct: 75,
    user_bare_pct: 10,
  };
  const { shrubField, grassField, bareField, setVegetation } =
    createVegetationBurnSeverity({ state, idPrefix: "ermit" });

  setVegetation("Forest", true);

  expect(state.vegetation_type).toBe("Forest");
  expect(state.user_shrub_pct).toBeNull();
  expect(state.user_grass_pct).toBeNull();
  expect(state.user_bare_pct).toBeNull();
  expect(shrubField.input.value).toBe("");
  expect(grassField.input.value).toBe("");
  expect(bareField.input.value).toBe("");
  expect(shrubField.wrapper.parentElement?.style.display).toBe("none");
});
