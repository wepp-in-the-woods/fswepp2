# FSWEPP2 Canvas Charts

This folder contains the lightweight, dependency-free charting library used by FSWEPP2 tool pages. It favors small, composable modules over monolithic libraries and targets the specific chart types in the UI spec.

## Quick Start

Use the convenience component wrappers for most pages:

```javascript
import { createCanvasChart } from "../components/canvas-chart.js";

const { wrapper, chart, setData, download, destroy } = createCanvasChart({
  type: "line",
  data: {
    x: [2019, 2020, 2021, 2022, 2023],
    series: [
      { label: "Runoff", values: [92, 88, 110, 95, 102] },
      { label: "Sediment", values: [2.1, 2.4, 2.2, 2.8, 2.5] },
    ],
  },
  options: {
    xAxis: { label: "Year" },
    yAxis: { label: "Metric value" },
  },
});

document.querySelector("#chart-slot").appendChild(wrapper);
```

You can also instantiate chart classes directly if you need more control.

## Modules

- `chart-core.js`: Canvas setup, resize handling, PNG export.
- `chart-scales.js`: Linear, log, band, and point scales + tick helpers.
- `chart-renderers.js`: Low-level drawing primitives (line, bar, area, text).
- `chart-interactions.js`: Tooltip, legend, hover hit testing.
- `chart-types.js`: Line, bar, scatter, exceedance, histogram.
- `slope-profile.js`: Specialized hillslope cross-section renderer.
- `index.js`: Barrel exports.

## Data Contracts (Flexible by Design)

Charts accept multiple data shapes to keep integration simple. The wrapper normalizes to internal series objects.

### Line Chart

Supported shapes:

```javascript
// Shape A: x + series list
{
  x: [2019, 2020, 2021],
  series: [
    { label: "Runoff", values: [92, 88, 110], color: "#f97316" },
    { label: "Sediment", values: [2.1, 2.4, 2.2], dashed: true, area: true },
  ],
}

// Shape B: array of {x,y}
[{ x: 1, y: 2 }, { x: 2, y: 4 }]

// Shape C: series map
{
  "Runoff": [92, 88, 110],
  "Sediment": [2.1, 2.4, 2.2],
}
```

### Bar Chart

```javascript
{
  categories: ["Road", "Fill", "Buffer"],
  series: [
    { label: "Erosion", values: [4.2, 1.4, 0.8] },
    { label: "Runoff", values: [12, 9, 5] },
  ],
  stacked: false, // optional
}
```

### Scatter Plot

```javascript
{
  series: [
    { label: "Events", values: [{ x: 2, y: 5 }, { x: 4, y: 7 }] },
  ],
}
```

### Exceedance Curve

Same as line chart with a fixed Y domain of [0, 1].

### Histogram

```javascript
// Array of values
[0.4, 0.9, 1.2, 2.1]

// Or with options
{ values: [0.4, 0.9, 1.2], bins: 12, label: "Frequency" }
```

## Options

Common options live under `options`:

```javascript
{
  xAxis: {
    label: "Year",
    format: (value) => String(value),
    ticks: 6,
    domain: [2000, 2025],
    padding: 0.2, // bar charts
  },
  yAxis: {
    label: "Sediment (kg/m2)",
    format: (value) => value.toFixed(2),
    ticks: 5,
    scale: "linear", // or "log"
    domain: [0, 10],
  },
  legend: true,      // false to hide
  showGrid: true,
  background: null,  // optional fill color
  tooltip: { className, style }, // custom tooltip styling
  onLegendToggle: (series) => {},
  legendContainer: HTMLElement, // optional host for legend UI
  margins: { top, right, bottom, left },
}
```

## Tooltip and Legend

- Hovering the chart surfaces tooltips with the nearest data value(s).
- Clicking a legend item toggles that series on/off.
- Tooltips are DOM elements, so you can style them with CSS or pass inline styles.

## Unitizer Integration Notes

Charts do not automatically convert values; they render what you provide. If you need unit-aware labels or tooltip values:

- Format values before passing them into chart data, OR
- Provide `xAxis.format` / `yAxis.format` functions that use Unitizer.

For SlopeProfile, lengths are **assumed to be meters** and are converted to the current Unitizer preference for the `sm-distance` category (m/ft) at render time.

## Log Scale Notes

`yAxis.scale = "log"` expects positive domains. If the computed or provided domain includes non-positive values, the chart will fall back to a linear scale.

## SlopeProfile

The SlopeProfile renderer is specialized for WEPP Road and Disturbed WEPP hillslopes.

```javascript
import { createSlopeProfile } from "../components/slope-profile.js";

const { wrapper, profile, setData } = createSlopeProfile({
  data: {
    segments: [
      { label: "Road", length: 30, slopePct: 4 },
      { label: "Fill", length: 20, slopePct: 35 },
      { label: "Buffer", length: 45, slopePct: 12 },
    ],
  },
});
```

Notes:
- `length` values are canonical meters.
- Labels update on `unitizer:preferences-changed`.
- Vertical scaling is based on elevation change only (no extra exaggeration).

## PNG Export

Every chart instance can export a PNG:

```javascript
chart.downloadImage("wepp-road-erosion.png");
```

## Cleanup

If you remove a chart from the DOM, call `destroy()` to disconnect observers/listeners.

```javascript
chart.destroy();
```

## Adapting wepppy Graph Data

The library supports flexible inputs. If you already have wepppy-style data:

```javascript
// wepppy line shape
{ type: "line", years: [2019, 2020], series: { id: { values: [...], label, color } } }

// FSWEPP2 adapter
const adapted = {
  x: data.years,
  series: Object.values(data.series).map((series) => ({
    label: series.label,
    values: series.values,
    color: series.color,
  })),
};
```

## Testing

Unit tests live in `ui/tests/chart-scales.test.js`. Add new tests alongside it when you extend scales or formatting helpers.
