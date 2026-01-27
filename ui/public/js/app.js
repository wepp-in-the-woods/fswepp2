import { readJsonCookie, writeJsonCookie } from "./utils/cookies.js";
import { getConfigFromUrl } from "./utils/url.js";
import { mountRockClimControl } from "./components/rockclim-control.js";
import { mountWeppRoadTool } from "./tools/wepproad.js";
import { mountDisturbedTool } from "./tools/disturbed.js";
import { mountErmitTool } from "./tools/ermit.js";

window.FSWEPP = window.FSWEPP || {};
window.FSWEPP.cookies = { readJsonCookie, writeJsonCookie };
window.FSWEPP.url = { getConfigFromUrl };
window.FSWEPP.apiBase = "/fswepp2/api";

const UNIT_COOKIE = "fswepp_units";

function initUnitizer() {
  if (!window.UnitizerClient || !window.UnitizerClient.ready) return;
  window.UnitizerClient.ready().then((client) => {
    const stored = readJsonCookie(UNIT_COOKIE, null);
    let globalIndex = 0;
    if (stored && typeof stored === "object") {
      if (Number.isFinite(stored.globalIndex)) {
        globalIndex = stored.globalIndex;
        client.setGlobalPreference(globalIndex);
      } else if (stored.global === "english") {
        globalIndex = 1;
        client.setGlobalPreference(1);
      } else if (stored.global === "metric") {
        globalIndex = 0;
        client.setGlobalPreference(0);
      } else {
        client.setGlobalPreference(0);
      }

      const overrides = stored.overrides || stored.preferences;
      if (overrides && typeof overrides === "object") {
        Object.entries(overrides).forEach(([category, unitKey]) => {
          client.setPreference(category, unitKey);
        });
      }
    } else {
      client.setGlobalPreference(0);
    }

    client.registerNumericInputs(document);
    client.updateNumericFields(document);
    client.updateUnitLabels(document);
    client.dispatchPreferenceChange();

    const toggle = document.getElementById("unit_toggle_input");
    if (toggle) {
      const metricLabel = document.querySelector('[data-unit-label="metric"]');
      const englishLabel = document.querySelector('[data-unit-label="english"]');
      const isEnglish = globalIndex === 1;
      toggle.checked = isEnglish;
      if (metricLabel) metricLabel.classList.toggle("font-semibold", !isEnglish);
      if (englishLabel) englishLabel.classList.toggle("font-semibold", isEnglish);

      const applyPreference = (english) => {
        globalIndex = english ? 1 : 0;
        toggle.checked = english;
        client.setGlobalPreference(english ? 1 : 0);
        client.updateNumericFields(document);
        client.updateUnitLabels(document);
        client.dispatchPreferenceChange();
        if (metricLabel) metricLabel.classList.toggle("font-semibold", !english);
        if (englishLabel) englishLabel.classList.toggle("font-semibold", english);
        writeJsonCookie(
          UNIT_COOKIE,
          {
            globalIndex,
            preferences: client.getPreferencePayload(),
          },
          { maxAge: 60 * 60 * 24 * 365, path: "/" }
        );
      };

      if (metricLabel) {
        metricLabel.addEventListener("click", () => applyPreference(false));
      }
      if (englishLabel) {
        englishLabel.addEventListener("click", () => applyPreference(true));
      }

      toggle.addEventListener("change", () => {
        applyPreference(toggle.checked);
      });
    }

    document.addEventListener("unitizer:preferences-changed", () => {
      writeJsonCookie(
        UNIT_COOKIE,
        {
          globalIndex,
          preferences: client.getPreferencePayload(),
        },
        { maxAge: 60 * 60 * 24 * 365, path: "/" }
      );
    });
  });
}

function initRockClim() {
  const root = document.getElementById("rockclim-control-root");
  if (!root) return;
  mountRockClimControl(root);
}

function initWeppRoad() {
  const root = document.getElementById("wepproad-root");
  if (!root) return;
  mountWeppRoadTool(root);
}

function initDisturbed() {
  const root = document.getElementById("disturbed-root");
  if (!root) return;
  mountDisturbedTool(root);
}

function initErmit() {
  const root = document.getElementById("ermit-root");
  if (!root) return;
  mountErmitTool(root);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initUnitizer();
    initRockClim();
    initWeppRoad();
    initDisturbed();
    initErmit();
  });
} else {
  initUnitizer();
  initRockClim();
  initWeppRoad();
  initDisturbed();
  initErmit();
}
