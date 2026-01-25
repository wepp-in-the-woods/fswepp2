import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register();
window.location.href = "http://localhost/fswepp2/wepproad";

// Stub fetch to avoid network calls during unit tests.
globalThis.fetch = async (url) => {
  const target = String(url || "");
  const json = async () => {
    if (target.includes("closest_stations")) return [];
    if (target.includes("stations_geojson")) {
      return { type: "FeatureCollection", features: [] };
    }
    if (target.includes("station_par_monthlies")) {
      return {
        ppts: Array(12).fill(0),
        tmaxs: Array(12).fill(0),
        tmins: Array(12).fill(0),
        nwds: Array(12).fill(0),
        cumulative_ppts: 0,
        cumulative_nwds: 0,
      };
    }
    return {};
  };
  return {
    ok: true,
    status: 200,
    headers: { get: () => "application/json" },
    json,
    text: async () => "",
  };
};
