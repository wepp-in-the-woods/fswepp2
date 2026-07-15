import { readJsonCookie, writeJsonCookie } from "./utils/cookies.js";
import { getConfigFromUrl } from "./utils/url.js";
import { createToolSection } from "./components/tool-section.js";
import { mountRockClimControl } from "./components/rockclim-control.js";
import { mountWeppRoadTool } from "./tools/wepproad.js";
import { mountDisturbedTool } from "./tools/disturbed.js";
import { mountPeakFlowTool } from "./tools/peakflow.js";
import { mountErmitTool } from "./tools/ermit.js";
import { mountFumeTool } from "./tools/fume.js";
import { mountBurnedAreaReports } from "./tools/burnedarea-report.js";
import { mountGallery } from "./gallery.js";

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

function initToolSections() {
  const root = document.getElementById("fswepp-tools"); // Add this container to your HTML
  if (!root) return;

  const hillslopeModels = [
    {
      title: "WEPP: Road",
      label: "WEPP: Road",
      description: "Predict erosion from insloped or outsloped forest roads. WEPP: Road allows users to easily describe numerous road erosion conditions.",
      icon: "/public/wepp-road-icon.svg",
      href: "/fswepp2/wepproad",
      isExternal: false
    },
    {
      title: "WEPP: Road Batch",
      label: "WEPP: Road Batch",
      description: "Predict erosion from multiple insloped or outsloped forest roads.",
      icon: "/public/wepp-road-batch-icon.svg",
      href: "/fswepp2/wepproad-batch",
      isExternal: false
    },
    {
      title: "ERMiT",
      label: "ERMiT",
      description: "ERMiT allows users to predict the probability of a given amount of sediment delivery from the base of a hillslope following variable burns on forest, rangeland, and chaparral conditions in each of five years following wildfire.",
      icon: "/public/ermit-icon.svg",
      href: "/fswepp2/ermit",
      isExternal: false
    },
    {
      title: "ERMiT Batch",
      label: "ERMiT Batch",
      description: "Download the Batch ERMiT Interface Excel spreadsheet to run multiple ERMiT scnearios.",
      icon: "/public/ermit-batch-icon.svg",
      href: "/fswepp2/ermit-batch",
      isExternal: false
    },
    {
      title: "Disturbed WEPP",
      label: "Disturbed WEPP",
      description: "Predict erosion from rangeland, forestland, and forest skid trails. Disturbed WEPP allows users to easily describe numerous disturbed forest and rangeland erosion conditions. The interface  presents the probability of a given level of erosion occurring the year following a disturbance.",
      icon: "/public/placeholder-model-icon.svg",
      href: "/fswepp2/distributed",
      isExternal: false
    },
    {
      title: "Disturbed WEPP Batch",
      label: "Disturbed WEPP Batch",
      description: "Download the Batch Disturbed WEPP Interface Excel spreadsheet to run multiple Distributed WEPP scenarios.",
      icon: "/public/placeholder-model-icon.svg",
      href: "/fswepp2/distributed-batch",
      isExternal: false
    },
    {
      title: "FuME (Fuel Management)",
      label: "FuME (Fuel Management)",
      description: "The FuME interface predicts soil erosion associated with fuel management practices including prescribed thinning, and a road network, and compares that prediction with erosion from wildfire.",
      icon: "/public/placeholder-model-icon.svg",
      href: "/fswepp2/fume",
      isExternal: false
    },
  ];
  const watershedModels = [
    {
      title: "WEPPcloud",
      label: "WEPPcloud",
      description: "Simulation tool that estimates hillslope soil erosion, etc.",
      icon: "/public/placeholder-model-icon.svg",
      href: "https://wepp.cloud/weppcloud/",
      isExternal: true
    },
    {
      title: "QWEPP",
      label: "QWEPP",
      description: "Access QWEPP Manual from Rapid Response Erosion Database (RRED) website Instructions: Follow the link to RRED and click on 'Manuals' tab. Download 'QWEPP Manual for RRED,' and follow the instructions.",
      icon: "/public/placeholder-model-icon.svg",
      href: "https://rred.mtri.org/rred/",
      isExternal: true
    },
    {
      title: "Peak Flow Calculator",
      label: "Peak Flow Calculator",
      description: "Estimate peak flow for burned areas using Curve Number technology.",
      icon: "/public/peak-flow-icon.svg",
      href: "/fswepp2/peakflow",
      isExternal: false
    }
  ];
  const baerTools = [
    {
      title: "BAER Burned Area Reports DB",
      label: "BAER Burned Area Reports DB",
      description: "View database containing post-fire assessment information from four decades of US Forest Service Burned Area Reports.",
      icon: "/public/baer-reports.svg",
      href: "/baertools/baer-reports",
      isExternal: false
    }
  ];

  const hillslopeSection = createToolSection({
    id: "hillslope-models",
    title: "Hillslope Scale Erosion and Runoff Prediction",
    tools: hillslopeModels,
    className: "bg-green-50 text-green-900"
  });

  const watershedSection = createToolSection({
    id: "watershed-models",
    title: "Watershed Prediction",
    tools: watershedModels,
    className: "bg-blue-50 text-blue-900"
  });

  const baerSection = createToolSection({
    id: "baer-tools",
    title: "BAER Tools",
    tools: baerTools,
  })

  root.appendChild(hillslopeSection);
  root.appendChild(watershedSection);
  root.appendChild(baerSection);
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

function initPeakFlow() {
  const root = document.getElementById("peakflow-root");
  if (!root) return;
  mountPeakFlowTool(root);
}

function initErmit() {
  const root = document.getElementById("ermit-root");
  if (!root) return;
  mountErmitTool(root);
}

function initFume() {
  const root = document.getElementById("fume-root");
  if (!root) return;
  mountFumeTool(root);
}

function initBurnedAreaReport() {
  const root = document.getElementById("burnedarea-report-root");
  if (!root) return;
  mountBurnedAreaReports(root);
}

function initGallery() {
  const root = document.getElementById("component-gallery-root");
  if (!root) return;
  mountGallery(root);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initUnitizer();
    initToolSections();
    initRockClim();
    initWeppRoad();
    initDisturbed();
    initPeakFlow();
    initErmit();
    initFume();
    initBurnedAreaReport();
    initGallery();
  });
} else {
  initUnitizer();
  initToolSections();
  initRockClim();
  initWeppRoad();
  initDisturbed();
  initPeakFlow();
  initErmit();
  initFume();
  initBurnedAreaReport();
  initGallery();
}
