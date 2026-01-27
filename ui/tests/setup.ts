import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register();
window.location.href = "http://localhost/fswepp2/wepproad";

const noop = () => {};
const canvasStub = {
  clearRect: noop,
  fillRect: noop,
  save: noop,
  restore: noop,
  beginPath: noop,
  moveTo: noop,
  lineTo: noop,
  rect: noop,
  clip: noop,
  stroke: noop,
  fill: noop,
  fillText: noop,
  arc: noop,
  setLineDash: noop,
  strokeRect: noop,
  scale: noop,
  setTransform: noop,
  translate: noop,
  rotate: noop,
  createImageData: (width, height) => ({
    data: new Uint8ClampedArray(width * height * 4),
  }),
  putImageData: noop,
};
const originalGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (...args) {
  const ctx = originalGetContext ? originalGetContext.apply(this, args) : null;
  return ctx || canvasStub;
};

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
