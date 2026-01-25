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
