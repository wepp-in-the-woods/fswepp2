const DEFAULT_MARGINS = { top: 24, right: 24, bottom: 44, left: 56 };

function ensureRelative(container) {
  const style = window.getComputedStyle(container);
  if (style.position === "static") {
    container.style.position = "relative";
  }
}

export function getChartColors() {
  const root = document.documentElement;
  const styles = window.getComputedStyle(root);
  const colors = [];
  for (let i = 1; i <= 5; i += 1) {
    const value = styles.getPropertyValue(`--color-chart-${i}`).trim();
    if (value) colors.push(value);
  }
  if (colors.length) return colors;
  return ["#f97316", "#14b8a6", "#1d4ed8", "#a3e635", "#facc15"];
}

export class ChartCore {
  constructor(container, options = {}) {
    if (!container) {
      throw new Error("ChartCore requires a container element");
    }
    this.container = container;
    this.options = options;
    this.margins = { ...DEFAULT_MARGINS, ...(options.margins || {}) };
    this.devicePixelRatio = window.devicePixelRatio || 1;
    this.canvas = document.createElement("canvas");
    this.canvas.className = options.canvasClass || "fswepp-chart-canvas";
    this.canvas.style.display = "block";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    ensureRelative(container);
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    this.width = 0;
    this.height = 0;
    this.plotArea = { x: 0, y: 0, width: 0, height: 0 };
    this._resizeObserver = null;
    this._handleResize = this._handleResize.bind(this);
    this.observeResize();
    this._handleResize();
  }

  observeResize() {
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", this._handleResize);
      return;
    }
    this._resizeObserver = new ResizeObserver(this._handleResize);
    this._resizeObserver.observe(this.container);
  }

  _handleResize() {
    const rect = this.container.getBoundingClientRect();
    const width = Math.max(rect.width, this.options.minWidth || 200);
    const height = Math.max(rect.height, this.options.minHeight || 160);
    this.setSize(width, height);
    if (typeof this.onResize === "function") {
      this.onResize();
    }
  }

  setSize(width, height) {
    this.width = width;
    this.height = height;
    const dpr = this.devicePixelRatio;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    this.plotArea = {
      x: this.margins.left,
      y: this.margins.top,
      width: Math.max(0, width - this.margins.left - this.margins.right),
      height: Math.max(0, height - this.margins.top - this.margins.bottom),
    };
  }

  setMargins(margins = {}) {
    this.margins = { ...this.margins, ...margins };
    this.setSize(this.width || 0, this.height || 0);
  }

  clear(background) {
    this.ctx.clearRect(0, 0, this.width, this.height);
    if (background) {
      this.ctx.fillStyle = background;
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  toDataURL(type = "image/png", quality) {
    return this.canvas.toDataURL(type, quality);
  }

  downloadImage(filename = "chart.png") {
    const link = document.createElement("a");
    link.href = this.toDataURL("image/png");
    link.download = filename;
    link.click();
  }

  destroy() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    } else {
      window.removeEventListener("resize", this._handleResize);
    }
    this.canvas.remove();
  }
}
