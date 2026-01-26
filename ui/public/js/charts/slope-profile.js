import { ChartCore, getChartColors } from "./chart-core.js";
import { createLinearScale } from "./chart-scales.js";
import { clearCanvas, drawLine, drawText } from "./chart-renderers.js";

const DEFAULT_MARGINS = { top: 24, right: 24, bottom: 48, left: 48 };

function resolveTheme() {
  const styles = window.getComputedStyle(document.documentElement);
  const foreground = styles.getPropertyValue("--color-foreground").trim();
  const muted = styles.getPropertyValue("--color-muted-foreground").trim();
  const border = styles.getPropertyValue("--color-border").trim();
  return {
    text: muted || foreground || "rgba(15, 23, 42, 0.7)",
    line: foreground || "rgba(15, 23, 42, 0.8)",
    boundary: border || "rgba(15, 23, 42, 0.25)",
  };
}

export class SlopeProfile extends ChartCore {
  constructor(container, options = {}) {
    super(container, { ...options, margins: { ...DEFAULT_MARGINS, ...(options.margins || {}) } });
    this.segments = [];
    this.theme = resolveTheme();
    this._unitHandler = null;
    this.onResize = () => this.render();
    this._bindUnitizer();
    if (options.data) this.setData(options.data);
  }

  setData(data) {
    const segments = Array.isArray(data)
      ? data
      : Array.isArray(data?.segments)
      ? data.segments
      : [];
    const palette = getChartColors();
    this.segments = segments.map((segment, index) => ({
      ...segment,
      color: segment.color || palette[index % palette.length],
    }));
    this.render();
  }

  _bindUnitizer() {
    if (typeof document === "undefined") return;
    this._unitHandler = () => this.render();
    document.addEventListener("unitizer:preferences-changed", this._unitHandler);
  }

  _getLengthUnitPreference() {
    const client = window.UnitizerClient?.getClientSync?.();
    const prefs = client?.getPreferencePayload?.();
    return prefs?.["sm-distance"] || "m";
  }

  _formatLength(valueMeters) {
    const client = window.UnitizerClient?.getClientSync?.();
    const preferredUnit = this._getLengthUnitPreference();
    if (!client || !Number.isFinite(valueMeters)) {
      return { value: valueMeters, unit: "m" };
    }
    let converted = valueMeters;
    try {
      converted = client.convert(valueMeters, "m", preferredUnit);
    } catch {
      converted = valueMeters;
    }
    const category = client.getCategory?.("sm-distance");
    const unitMeta = category?.unitByKey?.get(preferredUnit);
    const precision = unitMeta?.precision ?? 2;
    const label = unitMeta?.label || preferredUnit;
    const rounded = Number.parseFloat(Number(converted).toPrecision(precision));
    return { value: rounded, unit: label };
  }

  buildProfile() {
    let x = 0;
    let y = 0;
    const points = [{ x, y }];
    const boundaries = [];
    this.segments.forEach((segment) => {
      const length = Number(segment.length) || 0;
      const slopePct = Number(segment.slopePct) || 0;
      x += length;
      y += (length * slopePct) / 100;
      points.push({ x, y });
      boundaries.push({ x, y, segment });
    });
    return { points, boundaries, totalLength: x, totalDrop: y };
  }

  render() {
    clearCanvas(this.ctx, this.width, this.height, this.options.background);
    if (!this.segments.length) return;

    const { points, boundaries, totalLength, totalDrop } = this.buildProfile();
    const safeLength = totalLength || 1;
    const safeDrop = totalDrop || 1;
    const xScale = createLinearScale(
      [0, safeLength],
      [this.plotArea.x, this.plotArea.x + this.plotArea.width]
    );
    const yScale = createLinearScale(
      [0, safeDrop],
      [this.plotArea.y, this.plotArea.y + this.plotArea.height]
    );
    const scaledPoints = points.map((point) => ({
      x: xScale(point.x),
      y: yScale(point.y),
    }));

    drawLine(this.ctx, scaledPoints, { color: this.theme.line, lineWidth: 2 });

    // Segment boundaries and labels
    boundaries.forEach((boundary, index) => {
      const xPos = xScale(boundary.x);
      const yPos = yScale(boundary.y);
      this.ctx.save();
      this.ctx.strokeStyle = this.theme.boundary;
      this.ctx.setLineDash([4, 4]);
      this.ctx.beginPath();
      this.ctx.moveTo(xPos, this.plotArea.y);
      this.ctx.lineTo(xPos, this.plotArea.y + this.plotArea.height);
      this.ctx.stroke();
      this.ctx.restore();

      const prevPoint = scaledPoints[index];
      const nextPoint = scaledPoints[index + 1];
      const midX = (prevPoint.x + nextPoint.x) / 2;
      const midY = (prevPoint.y + nextPoint.y) / 2;
      const label = boundary.segment.label || `Segment ${index + 1}`;
      const slopeLabel = `${boundary.segment.slopePct ?? 0}%`;
      drawText(
        this.ctx,
        `${label} • ${slopeLabel}`,
        midX,
        midY - 12,
        { align: "center", baseline: "bottom", color: boundary.segment.color }
      );
      const lengthInfo = this._formatLength(boundary.segment.length ?? 0);
      const lengthLabel = `${lengthInfo.value} ${lengthInfo.unit}`;
      drawText(
        this.ctx,
        lengthLabel,
        midX,
        this.plotArea.y + this.plotArea.height + 14,
        { align: "center", baseline: "top", color: this.theme.text }
      );
    });
  }

  destroy() {
    if (this._unitHandler) {
      document.removeEventListener("unitizer:preferences-changed", this._unitHandler);
    }
    super.destroy();
  }
}
