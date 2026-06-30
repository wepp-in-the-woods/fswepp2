import { expect, test, beforeEach } from "bun:test";
import { mountRockClimControl } from "../public/js/components/rockclim-control.js";

function setClimateCookie(payload) {
  document.cookie = `fswepp_climate=${encodeURIComponent(
    JSON.stringify(payload)
  )}; path=/`;
}

beforeEach(() => {
  document.body.innerHTML = `
    <div id="rockclim-control-root"></div>
  `;
  document.cookie = "fswepp_climate=; Max-Age=0; path=/";
});

test("mountRockClimControl renders core inputs", () => {
  const root = document.getElementById("rockclim-control-root");
  mountRockClimControl(root);
  const databaseSelect = document.getElementById("rockclim_database");
  const cligenSelect = document.getElementById("rockclim_cligen");
  const lonInput = document.getElementById("rockclim_longitude");
  const latInput = document.getElementById("rockclim_latitude");
  const stationSelect = document.getElementById("rockclim_station");
  expect(databaseSelect).not.toBeNull();
  expect(cligenSelect).not.toBeNull();
  expect(lonInput).not.toBeNull();
  expect(latInput).not.toBeNull();
  expect(stationSelect).not.toBeNull();
});

test("location toggle expands map area", () => {
  const root = document.getElementById("rockclim-control-root");
  mountRockClimControl(root);
  const mapSection = document.getElementById("rockclim-map-section");
  const toggle = mapSection?.querySelector("button");
  toggle?.click();
  const mapBody = mapSection?.children?.[1];
  expect(mapBody?.style.display).toBe("block");
  const mapShell = document.getElementById("rockclim-map");
  expect(mapShell).not.toBeNull();
});

test("state summary shows station and location", () => {
  setClimateCookie({
    database: "legacy",
    cligen_version: "5.3.2",
    location: { longitude: -113.41235, latitude: 48.286 },
    par_id: "TEST123",
    input_years: 100,
    use_prism: false,
    user_defined_par_mod: null,
  });
  const root = document.getElementById("rockclim-control-root");
  mountRockClimControl(root);
  const header = root.querySelector("#rockclim-control > button");
  const summary = header?.querySelector("p");
  expect(summary?.textContent || "").toContain("Climate: TEST123");
  expect(summary?.textContent || "").toContain("(48.286, -113.412)");
});

test("state summary uses PRISM modified prefix", () => {
  setClimateCookie({
    database: "legacy",
    cligen_version: "5.3.2",
    location: { longitude: -113.41235, latitude: 48.286 },
    par_id: "TEST123",
    input_years: 100,
    use_prism: true,
    user_defined_par_mod: null,
  });
  const root = document.getElementById("rockclim-control-root");
  mountRockClimControl(root);
  const header = root.querySelector("#rockclim-control > button");
  const summary = header?.querySelector("p");
  expect(summary?.textContent || "").toContain("Climate: PRISM modified TEST123");
});

test("state summary uses custom description and disables PRISM", () => {
  setClimateCookie({
    database: "legacy",
    cligen_version: "5.3.2",
    location: { longitude: -113.41235, latitude: 48.286 },
    par_id: "TEST123",
    input_years: 100,
    use_prism: false,
    user_defined_par_mod: {
      description: "My Custom Climate",
      ppts: Array(12).fill(1),
      tmaxs: Array(12).fill(2),
      tmins: Array(12).fill(0),
    },
  });
  const root = document.getElementById("rockclim-control-root");
  mountRockClimControl(root);
  const header = root.querySelector("#rockclim-control > button");
  const summary = header?.querySelector("p");
  expect(summary?.textContent || "").toContain(
    "Climate: Customized My Custom Climate"
  );
  const prism = document.getElementById("rockclim_prism");
  expect(prism?.disabled).toBe(true);
});

test("delete climate button only visible when customized", () => {
  const root = document.getElementById("rockclim-control-root");
  mountRockClimControl(root);
  let deleteButton = Array.from(root.querySelectorAll("button")).find(
    (button) => button.textContent === "Delete Climate"
  );
  expect(deleteButton?.style.display).toBe("none");

  setClimateCookie({
    database: "legacy",
    cligen_version: "5.3.2",
    location: { longitude: -113.41235, latitude: 48.286 },
    par_id: "TEST123",
    input_years: 100,
    use_prism: false,
    user_defined_par_mod: {
      description: "My Custom Climate",
      ppts: Array(12).fill(1),
      tmaxs: Array(12).fill(2),
      tmins: Array(12).fill(0),
    },
  });
  root.innerHTML = "";
  mountRockClimControl(root);
  deleteButton = Array.from(root.querySelectorAll("button")).find(
    (button) => button.textContent === "Delete Climate"
  );
  expect(deleteButton?.style.display).toBe("");
});

test("PRISM toggle disabled for non-US datasets", () => {
  setClimateCookie({
    database: "au",
    cligen_version: "5.3.2",
    location: { longitude: -113.41235, latitude: 48.286 },
    par_id: "TEST123",
    input_years: 100,
    use_prism: true,
    user_defined_par_mod: null,
  });
  const root = document.getElementById("rockclim-control-root");
  mountRockClimControl(root);
  const prism = document.getElementById("rockclim_prism");
  expect(prism?.disabled).toBe(true);
  expect(prism?.checked).toBe(false);
});

function getClimateCookie() {
  const match = document.cookie.match(/(?:^|; )fswepp_climate=([^;]+)/);
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

test("import climate JSON validates payload", async () => {
  const root = document.getElementById("rockclim-control-root");
  mountRockClimControl(root);
  const dropZone = document.getElementById("rockclim-climate-upload");
  const wrapper = dropZone?.parentElement;
  const input = wrapper?.querySelector('input[type="file"]');
  const status = wrapper?.querySelector("p.text-xs");
  if (!input) throw new Error("Missing climate upload input");

  const badPayload = {
    database: "legacy",
    cligen_version: "5.3.2",
    par_id: "TEST123",
    user_defined_par_mod: {
      description: "Bad data",
      ppts: Array(11).fill(1),
      tmaxs: Array(12).fill(2),
      tmins: Array(12).fill(0),
    },
  };
  const badFile = new File([JSON.stringify(badPayload)], "bad.json", {
    type: "application/json",
  });
  Object.defineProperty(input, "files", { value: [badFile] });
  input.dispatchEvent(new Event("change"));
  await new Promise((resolve) => setTimeout(resolve, 0));

  expect(status?.textContent || "").toContain("failed validation");
});

test("import climate JSON updates cookie and inputs", async () => {
  const root = document.getElementById("rockclim-control-root");
  mountRockClimControl(root);
  const dropZone = document.getElementById("rockclim-climate-upload");
  const wrapper = dropZone?.parentElement;
  const input = wrapper?.querySelector('input[type="file"]');
  const status = wrapper?.querySelector("p.text-xs");
  if (!input) throw new Error("Missing climate upload input");

  const payload = {
    database: "legacy",
    cligen_version: "5.3.2",
    location: { longitude: -113.41235, latitude: 48.286 },
    par_id: "TEST123",
    input_years: 100,
    use_prism: true,
    user_defined_par_mod: {
      description: "Imported Climate",
      ppts: Array(12).fill(1.25),
      tmaxs: Array(12).fill(20),
      tmins: Array(12).fill(5),
    },
  };
  const file = new File([JSON.stringify(payload)], "climate.json", {
    type: "application/json",
  });
  Object.defineProperty(input, "files", { value: [file] });
  input.dispatchEvent(new Event("change"));
  await new Promise((resolve) => setTimeout(resolve, 0));

  expect(status?.textContent || "").toContain("Imported");
  const cookie = getClimateCookie();
  expect(cookie?.par_id).toBe("TEST123");
  expect(cookie?.use_prism).toBe(false);
  expect(cookie?.user_defined_par_mod?.description).toBe("Imported Climate");

  const stationSelect = document.getElementById("rockclim_station");
  expect(stationSelect?.value).toBe("TEST123");
  const prism = document.getElementById("rockclim_prism");
  expect(prism?.checked).toBe(false);
  expect(prism?.disabled).toBe(true);
});

test("PRISM overlay summary reflects unit toggle", async () => {
  const prevDeck = window.deck;
  const prevGeoTiff = window.GeoTIFF;
  const prevUnitizer = window.UnitizerClient;
  const prevGetContext = HTMLCanvasElement.prototype.getContext;
  let currentUnit = "mm";

  window.UnitizerClient = {
    getClientSync: () => ({
      getPreferencePayload: () => ({ "xs-distance": currentUnit }),
    }),
  };

  HTMLCanvasElement.prototype.getContext = () => ({
    createImageData: (width, height) => ({
      data: new Uint8ClampedArray(width * height * 4),
    }),
    putImageData: () => {},
  });

  window.GeoTIFF = {
    fromUrl: async () => ({
      getImage: async () => ({
        getWidth: () => 2,
        getHeight: () => 2,
        readRasters: async () => new Float32Array([0, 0, 0, 254]),
        getBoundingBox: () => [-1, -1, 1, 1],
      }),
    }),
  };

  window.deck = {
    DeckGL: class {
      constructor(options) {
        this.options = options;
      }
      setProps() {}
    },
    WebMercatorViewport: class {
      getBounds() {
        return [-1, -1, 1, 1];
      }
    },
    TileLayer: class {
      constructor(props) {
        this.props = props;
      }
    },
    BitmapLayer: class {
      constructor(props) {
        this.props = props;
      }
    },
    GeoJsonLayer: class {
      constructor(props) {
        this.props = props;
      }
    },
    ScatterplotLayer: class {
      constructor(props) {
        this.props = props;
      }
    },
  };

  setClimateCookie({
    database: "legacy",
    cligen_version: "5.3.2",
    location: { longitude: 0, latitude: 0 },
    par_id: "TEST123",
    input_years: 100,
    use_prism: true,
    user_defined_par_mod: null,
  });

  const root = document.getElementById("rockclim-control-root");
  mountRockClimControl(root);
  const mapSection = document.getElementById("rockclim-map-section");
  const toggle = mapSection?.querySelector("button");
  toggle?.click();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));

  const summaryLabel = Array.from(root.querySelectorAll("span")).find(
    (el) => el.textContent === "PRISM Annual Precip"
  );
  const summaryValue = summaryLabel?.nextElementSibling;
  const summaryUnit = summaryValue?.nextElementSibling;
  expect(summaryValue?.textContent).toBe("254");
  expect(summaryUnit?.textContent).toBe("mm");

  currentUnit = "in";
  document.dispatchEvent(new Event("unitizer:preferences-changed"));
  expect(summaryValue?.textContent).toBe("10.00");
  expect(summaryUnit?.textContent).toBe("in");

  window.deck = prevDeck;
  window.GeoTIFF = prevGeoTiff;
  window.UnitizerClient = prevUnitizer;
  HTMLCanvasElement.prototype.getContext = prevGetContext;
});

test("PRISM overlay opacity slider updates label", () => {
  setClimateCookie({
    database: "legacy",
    cligen_version: "5.3.2",
    location: { longitude: -113.41235, latitude: 48.286 },
    par_id: "TEST123",
    input_years: 100,
    use_prism: true,
    user_defined_par_mod: null,
  });
  const root = document.getElementById("rockclim-control-root");
  mountRockClimControl(root);
  const range = root.querySelector('input[type="range"]');
  const valueLabel = range?.nextElementSibling;
  expect(range).not.toBeNull();
  expect(valueLabel?.textContent).toBe("15%");
  range.value = "0.5";
  range.dispatchEvent(new Event("input", { bubbles: true }));
  expect(valueLabel?.textContent).toBe("50%");
});

test("PRISM overlay handles GeoTIFF load failures", async () => {
  const prevDeck = window.deck;
  const prevGeoTiff = window.GeoTIFF;
  const prevConsoleError = console.error;
  console.error = () => {};

  window.GeoTIFF = {
    fromUrl: async () => {
      throw new Error("boom");
    },
  };
  window.deck = {
    DeckGL: class {
      constructor() {}
      setProps() {}
    },
    WebMercatorViewport: class {
      getBounds() {
        return [-1, -1, 1, 1];
      }
    },
    TileLayer: class {
      constructor(props) {
        this.props = props;
      }
    },
    BitmapLayer: class {
      constructor(props) {
        this.props = props;
      }
    },
    GeoJsonLayer: class {
      constructor(props) {
        this.props = props;
      }
    },
    ScatterplotLayer: class {
      constructor(props) {
        this.props = props;
      }
    },
  };

  setClimateCookie({
    database: "legacy",
    cligen_version: "5.3.2",
    location: { longitude: 0, latitude: 0 },
    par_id: "TEST123",
    input_years: 100,
    use_prism: true,
    user_defined_par_mod: null,
  });

  const root = document.getElementById("rockclim-control-root");
  mountRockClimControl(root);
  const mapSection = document.getElementById("rockclim-map-section");
  const toggle = mapSection?.querySelector("button");
  toggle?.click();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));

  const legendSection = root.querySelector(".gl-legend-section");
  const legend = legendSection?.parentElement;
  expect(legend?.style.display).toBe("none");

  window.deck = prevDeck;
  window.GeoTIFF = prevGeoTiff;
  console.error = prevConsoleError;
});
