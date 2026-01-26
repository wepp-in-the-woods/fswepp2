import { expect, test, beforeEach, afterEach } from "bun:test";
import { createSoilProperties } from "../public/js/components/soil-properties.js";

const CLIMATE_COOKIE = "fswepp_climate";

function setClimateCookie(payload) {
  document.cookie = `${CLIMATE_COOKIE}=${encodeURIComponent(
    JSON.stringify(payload)
  )}; path=/`;
}

beforeEach(() => {
  document.body.innerHTML = "";
  document.cookie = `${CLIMATE_COOKIE}=; Max-Age=0; path=/`;
});

afterEach(() => {
  document.cookie = `${CLIMATE_COOKIE}=; Max-Age=0; path=/`;
});

test("ISRIC WMS uses lat/lon axis order in EPSG:4326 bbox", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return {
      ok: true,
      status: 200,
      json: async () => ({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { pixel_value: 10, unit: "g/kg" },
          },
        ],
      }),
    };
  };

  try {
    const lon = -121.88867187500002;
    const lat = 47.87682421268098;
    setClimateCookie({
      location: { longitude: lon, latitude: lat },
    });

    createSoilProperties({
      state: { soil_texture: "loam", rfg_pct: 10, isric_enabled: true },
      onChange: () => {},
    });

    await Promise.resolve();

    expect(calls.length).toBeGreaterThan(0);
    const firstUrl = new URL(calls[0]);
    const bbox = firstUrl.searchParams.get("BBOX");
    expect(bbox).not.toBeNull();
    const parts = (bbox || "").split(",").map(Number);
    expect(parts.length).toBe(4);

    const delta = 0.05;
    expect(parts[0]).toBeCloseTo(lat - delta, 6);
    expect(parts[1]).toBeCloseTo(lon - delta, 6);
    expect(parts[2]).toBeCloseTo(lat + delta, 6);
    expect(parts[3]).toBeCloseTo(lon + delta, 6);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
