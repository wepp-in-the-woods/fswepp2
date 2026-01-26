import {
  LineChart,
  BarChart,
  ScatterPlot,
  ExceedanceCurve,
  HistogramChart,
} from "../charts/chart-types.js";

const CHART_TYPES = {
  line: LineChart,
  bar: BarChart,
  scatter: ScatterPlot,
  exceedance: ExceedanceCurve,
  histogram: HistogramChart,
};

export function createCanvasChart({ type = "line", data, options = {} } = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = "fswepp-chart";
  wrapper.style.width = "100%";
  wrapper.style.minHeight = options.minHeight
    ? `${options.minHeight}px`
    : "240px";

  const canvasHost = document.createElement("div");
  canvasHost.className = "fswepp-chart-canvas-host";
  canvasHost.style.width = "100%";
  canvasHost.style.minHeight = wrapper.style.minHeight;
  wrapper.appendChild(canvasHost);

  const ChartClass = CHART_TYPES[type] || LineChart;
  const chartOptions = {
    ...options,
    legendContainer: options.legendContainer || wrapper,
  };
  const chart = new ChartClass(canvasHost, chartOptions);
  if (data) chart.setData(data);

  return {
    wrapper,
    chart,
    setData: (next) => chart.setData(next),
    destroy: () => chart.destroy(),
    download: (filename) => chart.downloadImage(filename),
  };
}
