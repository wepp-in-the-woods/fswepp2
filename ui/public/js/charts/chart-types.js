import { ChartCore, getChartColors } from "./chart-core.js";
import {
  createLinearScale,
  createLogScale,
  createPointScale,
  createBandScale,
  extent,
} from "./chart-scales.js";
import {
  clearCanvas,
  drawAxes,
  drawGrid,
  drawLine,
  drawArea,
  drawScatter,
  drawBars,
} from "./chart-renderers.js";
import {
  createTooltip,
  createLegend,
  getCanvasPoint,
  findNearestPoint,
  findBarHit,
} from "./chart-interactions.js";

const DEFAULT_POINT_RADIUS = 3;

const isNumber = (value) => Number.isFinite(value);
const isDate = (value) => value instanceof Date;

function resolveTheme() {
  const styles = window.getComputedStyle(document.documentElement);
  const border = styles.getPropertyValue("--color-border").trim();
  const foreground = styles.getPropertyValue("--color-foreground").trim();
  const muted = styles.getPropertyValue("--color-muted-foreground").trim();
  return {
    axisColor: border || "rgba(15, 23, 42, 0.4)",
    gridColor: border || "rgba(15, 23, 42, 0.08)",
    textColor: muted || foreground || "rgba(15, 23, 42, 0.75)",
  };
}

function padDomain([min, max], padding = 0.05) {
  if (min === max) return [min - 1, max + 1];
  const span = max - min;
  return [min - span * padding, max + span * padding];
}

function padLogDomain([min, max], padding = 0.05) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [min, max];
  if (min <= 0 || max <= 0) return [min, max];
  const factor = 1 + padding;
  return [min / factor, max * factor];
}

function normalizeSeriesColors(series) {
  const palette = getChartColors();
  series.forEach((item, index) => {
    if (!item.color) item.color = palette[index % palette.length];
  });
}

function normalizeLineSeries(data = {}, options = {}) {
  const series = [];
  let xValues = [];

  if (Array.isArray(data)) {
    if (data.length && typeof data[0] === "object") {
      series.push({
        id: "series-1",
        label: options.label || "Series 1",
        values: data.map((point) => ({
          x: point.x,
          y: point.y,
        })),
      });
      xValues = data.map((point) => point.x);
    } else {
      xValues = data.map((_, index) => index);
      series.push({
        id: "series-1",
        label: options.label || "Series 1",
        values: data.map((value, index) => ({
          x: xValues[index],
          y: value,
        })),
      });
    }
  } else if (data && Array.isArray(data.series)) {
    xValues = Array.isArray(data.x) ? data.x.slice() : [];
    data.series.forEach((item, index) => {
      const values = Array.isArray(item.values) ? item.values : [];
      const resolved = values.map((value, idx) => {
        if (value && typeof value === "object") {
          return { x: value.x, y: value.y };
        }
        const x = xValues[idx] ?? idx;
        return { x, y: value };
      });
      series.push({
        id: item.id || `series-${index + 1}`,
        label: item.label || item.name || `Series ${index + 1}`,
        values: resolved,
        color: item.color,
        dashed: item.dashed,
        area: item.area,
      });
      if (!xValues.length) {
        xValues = resolved.map((point) => point.x);
      }
    });
  } else if (data && typeof data === "object") {
    Object.entries(data).forEach(([key, values], index) => {
      if (!Array.isArray(values)) return;
      const resolved = values.map((value, idx) => {
        if (value && typeof value === "object") {
          return { x: value.x, y: value.y };
        }
        const x = idx;
        return { x, y: value };
      });
      series.push({
        id: key,
        label: key,
        values: resolved,
      });
      if (!xValues.length) {
        xValues = resolved.map((point) => point.x);
      }
    });
  }

  normalizeSeriesColors(series);
  return { series, xValues };
}

function normalizeScatterSeries(data = {}, options = {}) {
  const series = [];
  if (Array.isArray(data)) {
    series.push({
      id: "series-1",
      label: options.label || "Series 1",
      values: data.map((point) => ({ x: point.x, y: point.y })),
    });
  } else if (data && Array.isArray(data.series)) {
    data.series.forEach((item, index) => {
      series.push({
        id: item.id || `series-${index + 1}`,
        label: item.label || item.name || `Series ${index + 1}`,
        values: item.values || [],
        color: item.color,
        radius: item.radius,
      });
    });
  } else if (data && typeof data === "object") {
    Object.entries(data).forEach(([key, values]) => {
      if (!Array.isArray(values)) return;
      series.push({
        id: key,
        label: key,
        values,
      });
    });
  }
  normalizeSeriesColors(series);
  return series;
}

function defaultTooltipHtml(title, entries = []) {
  const lines = entries
    .map(
      (entry) =>
        `<div style="display:flex;gap:6px;align-items:center;">
          <span style="display:inline-block;width:8px;height:8px;border-radius:999px;background:${entry.color};"></span>
          <span>${entry.label}: ${entry.value}</span>
        </div>`
    )
    .join("");
  return `<div style="font-weight:600;margin-bottom:4px;">${title}</div>${lines}`;
}

class BaseChart extends ChartCore {
  constructor(container, options = {}) {
    super(container, options);
    this.theme = resolveTheme();
    this.series = [];
    this.data = null;
    this.tooltip = createTooltip(container, options.tooltip || {});
    const legendHost = options.legendContainer || container;
    this.legend = options.legend === false ? null : createLegend(legendHost);
    this._hover = null;
    this._boundMove = this._onPointerMove.bind(this);
    this._boundLeave = this._onPointerLeave.bind(this);
    this.canvas.addEventListener("mousemove", this._boundMove);
    this.canvas.addEventListener("mouseleave", this._boundLeave);
    this.onResize = () => this.render();

    if (this.legend) {
      this.legend.element.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-series-id]");
        if (!button) return;
        const id = button.dataset.seriesId;
        const targetSeries = this.series.find((item) => item.id === id);
        if (!targetSeries) return;
        targetSeries.hidden = !targetSeries.hidden;
        this.updateLegend();
        this.render();
        if (typeof this.options.onLegendToggle === "function") {
          this.options.onLegendToggle(targetSeries);
        }
      });
    }
  }

  setData(data) {
    this.data = data;
  }

  updateLegend() {
    if (this.legend) {
      this.legend.render(this.series);
    }
  }

  _isSameHit(next, prev) {
    if (!next || !prev) return false;
    if (next.index != null || prev.index != null) {
      return next.index === prev.index;
    }
    if (next.bar || prev.bar) {
      return next.bar === prev.bar;
    }
    if (next.point || prev.point) {
      return next.point === prev.point;
    }
    return false;
  }

  _onPointerMove(event) {
    const point = getCanvasPoint(event, this.canvas);
    const hit = this.hitTest(point);
    if (hit) {
      const sameHit = this._isSameHit(hit, this._hover);
      this._hover = hit;
      const content = this.formatTooltip(hit);
      this.tooltip.show(content, point);
      if (!sameHit) {
        this.render();
      }
    } else if (this._hover) {
      this._hover = null;
      this.tooltip.hide();
      this.render();
    }
  }

  _onPointerLeave() {
    if (this._hover) {
      this._hover = null;
      this.tooltip.hide();
      this.render();
    }
  }

  hitTest() {
    return null;
  }

  formatTooltip(hit) {
    return hit?.label || "";
  }

  destroy() {
    this.canvas.removeEventListener("mousemove", this._boundMove);
    this.canvas.removeEventListener("mouseleave", this._boundLeave);
    this.tooltip?.destroy();
    this.legend?.destroy();
    super.destroy();
  }
}

export class LineChart extends BaseChart {
  constructor(container, options = {}) {
    super(container, options);
    if (options.data) this.setData(options.data);
  }

  setData(data) {
    this.data = data;
    const { series, xValues } = normalizeLineSeries(data, this.options);
    this.series = series;
    this.xValues = xValues;
    this.updateLegend();
    this.render();
  }

  buildScales() {
    const visibleSeries = this.series.filter((item) => !item.hidden);
    const xValues = this.xValues || [];
    const xIsNumeric = xValues.every((value) => isNumber(value) || isDate(value));
    const xHasDates = xValues.some((value) => isDate(value));
    let xDomain;
    if (xIsNumeric) {
      const numericValues = xValues.map((value) =>
        isDate(value) ? value.getTime() : value
      );
      xDomain = this.options?.xAxis?.domain || extent(numericValues);
    } else {
      xDomain = xValues;
    }

    const yValues = [];
    visibleSeries.forEach((series) => {
      series.values.forEach((point) => {
        if (isNumber(point.y)) yValues.push(point.y);
      });
    });
    const rawYDomain = this.options?.yAxis?.domain || extent(yValues);
    const yDomain =
      this.options?.yAxis?.scale === "log"
        ? padLogDomain(rawYDomain)
        : padDomain(rawYDomain);

    const xRange = [this.plotArea.x, this.plotArea.x + this.plotArea.width];
    const yRange = [this.plotArea.y + this.plotArea.height, this.plotArea.y];

    const xScale = xIsNumeric
      ? createLinearScale(xDomain, xRange)
      : createPointScale(xDomain, xRange);

    const yScale =
      this.options?.yAxis?.scale === "log"
        ? createLogScale(yDomain, yRange)
        : createLinearScale(yDomain, yRange);

    const xTicks = xIsNumeric
      ? xScale.ticks(this.options?.xAxis?.ticks || 6)
      : xValues;
    const yTicks = yScale.ticks(this.options?.yAxis?.ticks || 5);

    const xFormat =
      this.options?.xAxis?.format ||
      ((value) => {
        if (xHasDates) {
          const dateValue = isDate(value) ? value : new Date(value);
          return dateValue.toLocaleDateString();
        }
        return `${value}`;
      });
    const yFormat =
      this.options?.yAxis?.format || ((value) => `${value}`);

    return {
      xScale,
      yScale,
      xTicks,
      yTicks,
      xFormat,
      yFormat,
      xIsNumeric,
    };
  }

  render() {
    if (!this.ctx) return;
    clearCanvas(this.ctx, this.width, this.height, this.options.background);
    if (!this.series.length) return;

    const {
      xScale,
      yScale,
      xTicks,
      yTicks,
      xFormat,
      yFormat,
      xIsNumeric,
    } = this.buildScales();
    this._xScale = xScale;
    this._yScale = yScale;
    this._xIsNumeric = xIsNumeric;

    if (this.options.showGrid !== false) {
      drawGrid(
        this.ctx,
        this.plotArea,
        xTicks,
        yTicks,
        xScale,
        yScale,
        { color: this.theme.gridColor }
      );
    }

    const xAxis = {
      scale: xScale,
      ticks: xTicks,
      label: this.options?.xAxis?.label,
      format: xFormat,
    };
    const yAxis = {
      scale: yScale,
      ticks: yTicks,
      label: this.options?.yAxis?.label,
      format: yFormat,
    };
    drawAxes(this.ctx, this.plotArea, xAxis, yAxis, {
      axisColor: this.theme.axisColor,
      textColor: this.theme.textColor,
    });

    const visibleSeries = this.series.filter((item) => !item.hidden);
    this._pointsBySeries = [];
    visibleSeries.forEach((series) => {
      const points = series.values.map((point) => {
        const xValue = isDate(point.x) ? point.x.getTime() : point.x;
        const x = xScale(xValue);
        const y = yScale(point.y);
        return { x, y, value: point.y, rawX: point.x };
      });
      if (series.area) {
        drawArea(
          this.ctx,
          points,
          yScale(0),
          { color: series.color, opacity: 0.2 }
        );
      }
      drawLine(this.ctx, points, {
        color: series.color,
        lineWidth: series.lineWidth || 2,
        dash: series.dashed ? [6, 4] : null,
      });
      this._pointsBySeries.push({ series, points });
    });

    if (this._hover && this._hover.index != null) {
      const hoverX = this._hover.x;
      this.ctx.save();
      this.ctx.strokeStyle = "rgba(15, 23, 42, 0.3)";
      this.ctx.beginPath();
      this.ctx.moveTo(hoverX, this.plotArea.y);
      this.ctx.lineTo(hoverX, this.plotArea.y + this.plotArea.height);
      this.ctx.stroke();
      this.ctx.restore();

      this._pointsBySeries.forEach(({ series, points }) => {
        const point = points[this._hover.index];
        if (!point) return;
        drawScatter(this.ctx, [point], {
          color: series.color,
          radius: 4,
          stroke: "#ffffff",
        });
      });
    }
  }

  hitTest(point) {
    const xValues = this.xValues || [];
    if (!this._xScale || !xValues.length) return null;
    let bestIndex = null;
    let bestDistance = Infinity;
    xValues.forEach((value, index) => {
      const scaledValue =
        this._xIsNumeric && isDate(value) ? value.getTime() : value;
      const xValue = this._xScale(scaledValue);
      if (!Number.isFinite(xValue)) return;
      const distance = Math.abs(point.x - xValue);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    if (bestIndex === null || bestDistance > 20) return null;
    const hoverX = this._xScale(
      this._xIsNumeric && isDate(xValues[bestIndex])
        ? xValues[bestIndex].getTime()
        : xValues[bestIndex]
    );
    return { index: bestIndex, x: hoverX, y: point.y };
  }

  formatTooltip(hit) {
    const index = hit.index;
    const xValue = this.xValues?.[index];
    const title = isDate(xValue)
      ? xValue.toLocaleDateString()
      : this.options?.xAxis?.format?.(xValue) ?? `${xValue}`;
    const entries = this.series
      .filter((item) => !item.hidden)
      .map((series) => {
        const point = series.values[index];
        if (!point) return null;
        return {
          label: series.label,
          value: this.options?.yAxis?.format?.(point.y) ?? `${point.y}`,
          color: series.color,
        };
      })
      .filter(Boolean);
    return defaultTooltipHtml(title, entries);
  }
}

export class BarChart extends BaseChart {
  constructor(container, options = {}) {
    super(container, options);
    if (options.data) this.setData(options.data);
  }

  setData(data) {
    this.data = data || {};
    const categories = data?.categories || [];
    const rawSeries = Array.isArray(data?.series) ? data.series : [];
    this.categories = categories;
    this.series = rawSeries.map((item, index) => ({
      id: item.id || `series-${index + 1}`,
      label: item.label || item.name || `Series ${index + 1}`,
      values: item.values || [],
      color: item.color,
    }));
    normalizeSeriesColors(this.series);
    this.updateLegend();
    this.render();
  }

  buildScales() {
    const visibleSeries = this.series.filter((item) => !item.hidden);
    const stacked = this.options.stacked || this.data?.stacked;
    const yValues = [];
    if (stacked) {
      this.categories.forEach((_, index) => {
        const sum = visibleSeries.reduce((acc, series) => {
          const value = series.values[index] || 0;
          return acc + value;
        }, 0);
        yValues.push(sum);
      });
    } else {
      visibleSeries.forEach((series) => {
        series.values.forEach((value) => {
          if (isNumber(value)) yValues.push(value);
        });
      });
    }
    const rawYDomain = this.options?.yAxis?.domain || extent(yValues);
    const yDomain =
      this.options?.yAxis?.scale === "log"
        ? padLogDomain(rawYDomain)
        : padDomain(rawYDomain);
    const xRange = [this.plotArea.x, this.plotArea.x + this.plotArea.width];
    const yRange = [this.plotArea.y + this.plotArea.height, this.plotArea.y];
    const xScale = createBandScale(
      this.categories,
      xRange,
      this.options?.xAxis?.padding ?? 0.2
    );
    const yScale =
      this.options?.yAxis?.scale === "log"
        ? createLogScale(yDomain, yRange)
        : createLinearScale(yDomain, yRange);
    const yTicks = yScale.ticks(this.options?.yAxis?.ticks || 5);
    return { xScale, yScale, yTicks, stacked };
  }

  render() {
    clearCanvas(this.ctx, this.width, this.height, this.options.background);
    if (!this.categories || !this.categories.length) return;

    const { xScale, yScale, yTicks, stacked } = this.buildScales();
    this._xScale = xScale;
    this._yScale = yScale;
    this._bars = [];
    const bandWidth = xScale.bandwidth();
    const tickScale = (value) => xScale(value) + bandWidth / 2;

    if (this.options.showGrid !== false) {
      drawGrid(
        this.ctx,
        this.plotArea,
        this.categories,
        yTicks,
        tickScale,
        yScale,
        { color: this.theme.gridColor }
      );
    }

    const xAxis = {
      scale: tickScale,
      ticks: this.categories,
      label: this.options?.xAxis?.label,
      format: this.options?.xAxis?.format,
    };
    const yAxis = {
      scale: yScale,
      ticks: yTicks,
      label: this.options?.yAxis?.label,
      format: this.options?.yAxis?.format,
    };
    drawAxes(this.ctx, this.plotArea, xAxis, yAxis, {
      axisColor: this.theme.axisColor,
      textColor: this.theme.textColor,
    });

    const visibleSeries = this.series.filter((item) => !item.hidden);
    const barWidth = stacked
      ? bandWidth
      : bandWidth / Math.max(visibleSeries.length, 1);
    this.categories.forEach((category, categoryIndex) => {
      let stackOffset = 0;
      visibleSeries.forEach((series, seriesIndex) => {
        const rawValue = series.values[categoryIndex] ?? 0;
        const value = isNumber(rawValue) ? rawValue : 0;
        const x =
          xScale(category) + (stacked ? 0 : seriesIndex * barWidth);
        const yStart = stacked ? stackOffset : 0;
        const y0 = yScale(yStart);
        const y1 = yScale(yStart + value);
        const height = Math.abs(y1 - y0);
        const y = value >= 0 ? y1 : y0;
        const bar = {
          x,
          y,
          width: barWidth,
          height: height,
          color: series.color,
          value,
          category,
          series,
        };
        this._bars.push(bar);
        stackOffset += value;
      });
    });

    drawBars(this.ctx, this._bars);

    if (this._hover && this._hover.bar) {
      const bar = this._hover.bar;
      this.ctx.save();
      this.ctx.strokeStyle = "rgba(15, 23, 42, 0.45)";
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(bar.x, bar.y, bar.width, bar.height);
      this.ctx.restore();
    }
  }

  hitTest(point) {
    const bar = findBarHit(this._bars || [], point);
    if (!bar) return null;
    return { bar };
  }

  formatTooltip(hit) {
    const bar = hit.bar;
    const title = `${bar.category}`;
    const entries = [
      {
        label: bar.series.label,
        value: this.options?.yAxis?.format?.(bar.value) ?? `${bar.value}`,
        color: bar.series.color,
      },
    ];
    return defaultTooltipHtml(title, entries);
  }
}

export class ScatterPlot extends BaseChart {
  constructor(container, options = {}) {
    super(container, options);
    if (options.data) this.setData(options.data);
  }

  setData(data) {
    this.data = data;
    this.series = normalizeScatterSeries(data, this.options);
    this.updateLegend();
    this.render();
  }

  buildScales() {
    const visibleSeries = this.series.filter((item) => !item.hidden);
    const xValues = [];
    const yValues = [];
    visibleSeries.forEach((series) => {
      series.values.forEach((point) => {
        if (isNumber(point.x)) xValues.push(point.x);
        if (isNumber(point.y)) yValues.push(point.y);
      });
    });
    const xDomain = padDomain(
      this.options?.xAxis?.domain || extent(xValues)
    );
    const rawYDomain = this.options?.yAxis?.domain || extent(yValues);
    const yDomain =
      this.options?.yAxis?.scale === "log"
        ? padLogDomain(rawYDomain)
        : padDomain(rawYDomain);
    const xScale = createLinearScale(
      xDomain,
      [this.plotArea.x, this.plotArea.x + this.plotArea.width]
    );
    const yScale =
      this.options?.yAxis?.scale === "log"
        ? createLogScale(
            yDomain,
            [this.plotArea.y + this.plotArea.height, this.plotArea.y]
          )
        : createLinearScale(
            yDomain,
            [this.plotArea.y + this.plotArea.height, this.plotArea.y]
          );
    return {
      xScale,
      yScale,
      xTicks: xScale.ticks(this.options?.xAxis?.ticks || 6),
      yTicks: yScale.ticks(this.options?.yAxis?.ticks || 5),
    };
  }

  render() {
    clearCanvas(this.ctx, this.width, this.height, this.options.background);
    if (!this.series.length) return;

    const { xScale, yScale, xTicks, yTicks } = this.buildScales();
    this._points = [];

    if (this.options.showGrid !== false) {
      drawGrid(
        this.ctx,
        this.plotArea,
        xTicks,
        yTicks,
        xScale,
        yScale,
        { color: this.theme.gridColor }
      );
    }

    drawAxes(
      this.ctx,
      this.plotArea,
      {
        scale: xScale,
        ticks: xTicks,
        label: this.options?.xAxis?.label,
        format: this.options?.xAxis?.format,
      },
      {
        scale: yScale,
        ticks: yTicks,
        label: this.options?.yAxis?.label,
        format: this.options?.yAxis?.format,
      },
      {
        axisColor: this.theme.axisColor,
        textColor: this.theme.textColor,
      }
    );

    this.series
      .filter((item) => !item.hidden)
      .forEach((series) => {
        const points = series.values.map((point) => ({
          x: xScale(point.x),
          y: yScale(point.y),
          value: point,
          color: series.color,
          label: series.label,
          radius: series.radius || DEFAULT_POINT_RADIUS,
        }));
        this._points.push(...points);
        drawScatter(this.ctx, points, {
          color: series.color,
          radius: series.radius || DEFAULT_POINT_RADIUS,
        });
      });

    if (this._hover?.point) {
      drawScatter(this.ctx, [this._hover.point], {
        color: this._hover.point.color,
        radius: (this._hover.point.radius || DEFAULT_POINT_RADIUS) + 2,
        stroke: "#ffffff",
      });
    }
  }

  hitTest(point) {
    const hitPoint = findNearestPoint(this._points || [], point, 10);
    if (!hitPoint) return null;
    return { point: hitPoint };
  }

  formatTooltip(hit) {
    const point = hit.point;
    const title = point.label || "Point";
    const value = `(${point.value.x}, ${point.value.y})`;
    return defaultTooltipHtml(title, [
      { label: "Value", value, color: point.color },
    ]);
  }
}

export class ExceedanceCurve extends LineChart {
  constructor(container, options = {}) {
    const yAxis = { ...(options.yAxis || {}) };
    if (!yAxis.domain) yAxis.domain = [0, 1];
    super(container, { ...options, yAxis });
  }
}

export class HistogramChart extends BarChart {
  constructor(container, options = {}) {
    super(container, options);
    if (options.data) this.setData(options.data);
  }

  setData(data) {
    const values = Array.isArray(data)
      ? data
      : Array.isArray(data?.values)
      ? data.values
      : [];
    const binCount = data?.bins || this.options.bins || 10;
    const domain = extent(values);
    const span = domain[1] - domain[0];
    const binSize = data?.binSize || (span === 0 ? 1 : span / binCount);
    const bins = Array.from({ length: binCount }, (_, index) => ({
      x0: domain[0] + index * binSize,
      x1: domain[0] + (index + 1) * binSize,
      count: 0,
    }));
    values.forEach((value) => {
      if (!isNumber(value)) return;
      const index = Math.min(
        bins.length - 1,
        Math.floor((value - domain[0]) / binSize)
      );
      if (bins[index]) bins[index].count += 1;
    });
    const categories = bins.map(
      (bin) => `${bin.x0.toFixed(2)}-${bin.x1.toFixed(2)}`
    );
    const series = [
      {
        label: data?.label || "Frequency",
        values: bins.map((bin) => bin.count),
      },
    ];
    super.setData({ categories, series });
  }
}

export { BaseChart };
