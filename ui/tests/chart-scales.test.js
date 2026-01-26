import { expect, test } from "bun:test";
import {
  createLinearScale,
  createLogScale,
  createBandScale,
  niceTicks,
} from "../public/js/charts/chart-scales.js";
import { LineChart } from "../public/js/charts/chart-types.js";

function setupDomStubs() {
  if (globalThis.document && globalThis.window) return;
  const noop = () => {};
  const createMockContext = () => ({
    clearRect: noop,
    fillRect: noop,
    save: noop,
    restore: noop,
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
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
  });
  const createMockElement = (tag) => {
    const el = {
      tagName: tag?.toUpperCase?.() || "DIV",
      style: {},
      dataset: {},
      children: [],
      appendChild(child) {
        this.children.push(child);
        return child;
      },
      remove() {},
      setAttribute(name, value) {
        this[name] = value;
      },
      addEventListener: noop,
      removeEventListener: noop,
      getBoundingClientRect() {
        return {
          left: 0,
          top: 0,
          width: this._width || 400,
          height: this._height || 300,
        };
      },
      closest() {
        return null;
      },
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
    };
    if (tag === "canvas") {
      el.getContext = () => createMockContext();
    }
    return el;
  };
  globalThis.document = {
    createElement: createMockElement,
    documentElement: createMockElement("html"),
    addEventListener: noop,
    removeEventListener: noop,
  };
  globalThis.window = {
    devicePixelRatio: 1,
    getComputedStyle: () => ({ getPropertyValue: () => "" }),
    addEventListener: noop,
    removeEventListener: noop,
  };
  globalThis.ResizeObserver = function ResizeObserver() {
    this.observe = noop;
    this.disconnect = noop;
  };
}

function createContainer(width = 400, height = 300) {
  setupDomStubs();
  const container = document.createElement("div");
  container._width = width;
  container._height = height;
  return container;
}

test("linear scale maps domain to range", () => {
  const scale = createLinearScale([0, 10], [0, 100]);
  expect(scale(5)).toBeCloseTo(50);
  expect(scale.invert(25)).toBeCloseTo(2.5);
});

test("log scale falls back when domain invalid", () => {
  const scale = createLogScale([-1, 10], [0, 100]);
  expect(Number.isFinite(scale(1))).toBe(true);
});

test("band scale returns consistent bandwidth", () => {
  const scale = createBandScale(["a", "b", "c"], [0, 300], 0.2);
  const bandwidth = scale.bandwidth();
  expect(bandwidth).toBeGreaterThan(0);
  expect(scale("a")).toBeCloseTo(0);
});

test("niceTicks produces ordered ticks", () => {
  const ticks = niceTicks(3, 97, 5);
  expect(ticks.length).toBeGreaterThan(2);
  expect(ticks[0]).toBeLessThan(ticks[ticks.length - 1]);
});

test("line chart hitTest uses shared x-values", () => {
  const container = createContainer();
  const chart = new LineChart(container);
  chart.setData({
    x: [0, 1, 2],
    series: [
      { label: "Short", values: [10] },
      { label: "Full", values: [1, 2, 3] },
    ],
  });
  chart.render();
  const hit = chart.hitTest({ x: chart._xScale(2), y: 120 });
  expect(hit?.index).toBe(2);
  chart.destroy();
});

test("line chart log scale falls back when domain is non-positive", () => {
  const container = createContainer();
  const chart = new LineChart(container, { yAxis: { scale: "log" } });
  chart.setData([
    { x: 0, y: 0 },
    { x: 1, y: 10 },
  ]);
  const { yTicks } = chart.buildScales();
  const isPowerOfTen = (value) => {
    const exponent = Math.log10(value);
    return Number.isFinite(exponent) && Math.abs(exponent - Math.round(exponent)) < 1e-6;
  };
  expect(yTicks.every(isPowerOfTen)).toBe(false);
  chart.destroy();
});

test("line chart log scale uses log ticks for positive domains", () => {
  const container = createContainer();
  const chart = new LineChart(container, { yAxis: { scale: "log" } });
  chart.setData([
    { x: 0, y: 0.2 },
    { x: 1, y: 20 },
  ]);
  const { yTicks } = chart.buildScales();
  const isPowerOfTen = (value) => {
    const exponent = Math.log10(value);
    return Number.isFinite(exponent) && Math.abs(exponent - Math.round(exponent)) < 1e-6;
  };
  expect(yTicks.every((tick) => tick > 0)).toBe(true);
  expect(yTicks.every(isPowerOfTen)).toBe(true);
  chart.destroy();
});
