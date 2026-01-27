import { expect, test } from "bun:test";
import { unitizerMap } from "../public/js/unitizer_map.js";

function getCategory(key) {
  return unitizerMap.categories.find((category) => category.key === key);
}

function getConversion(category, fromUnit, toUnit) {
  return category.conversions.find(
    (conversion) =>
      conversion.from === fromUnit && conversion.to === toUnit
  );
}

test("unitizer map includes road-density units", () => {
  const category = getCategory("road-density");
  expect(category).toBeTruthy();
  const unitKeys = category.units.map((unit) => unit.key);
  expect(unitKeys).toContain("km/km^2");
  expect(unitKeys).toContain("mi/mi^2");
});

test("road-density conversions are present", () => {
  const category = getCategory("road-density");
  expect(category).toBeTruthy();

  const toEnglish = getConversion(category, "km/km^2", "mi/mi^2");
  const toMetric = getConversion(category, "mi/mi^2", "km/km^2");

  expect(toEnglish).toBeTruthy();
  expect(toMetric).toBeTruthy();

  expect(toEnglish.offset).toBeCloseTo(0, 10);
  expect(toMetric.offset).toBeCloseTo(0, 10);

  expect(toEnglish.scale).toBeCloseTo(1.609344, 6);
  expect(toMetric.scale).toBeCloseTo(0.621371, 6);
});

test("road-density unit mapping is wired", () => {
  expect(unitizerMap.unitToCategory["km/km^2"]).toBe("road-density");
  expect(unitizerMap.unitToCategory["mi/mi^2"]).toBe("road-density");
});
