const DEFAULT_TOOLTIP_STYLE = {
  position: "absolute",
  pointerEvents: "none",
  zIndex: "10",
  padding: "6px 8px",
  borderRadius: "6px",
  background: "rgba(15, 23, 42, 0.92)",
  color: "#f8fafc",
  fontSize: "12px",
  lineHeight: "1.4",
  boxShadow: "0 6px 18px rgba(15, 23, 42, 0.2)",
  maxWidth: "240px",
  opacity: "0",
  transform: "translate3d(0, 0, 0)",
  transition: "opacity 120ms ease",
};

export function getCanvasPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

export function createTooltip(container, options = {}) {
  const portalTarget =
    options.portal === "body" || options.portal === true
      ? document.body
      : options.portalTarget || container;
  const tooltip = document.createElement("div");
  tooltip.className = options.className || "fswepp-chart-tooltip";
  const style = { ...DEFAULT_TOOLTIP_STYLE, ...(options.style || {}) };
  if (portalTarget !== container && !options.style?.position) {
    style.position = "fixed";
  }
  Object.assign(tooltip.style, style);
  portalTarget.appendChild(tooltip);

  const show = (content, position) => {
    tooltip.innerHTML = content;
    tooltip.style.opacity = "1";
    if (position) {
      positionTooltip(tooltip, position, container, portalTarget);
    }
  };

  const hide = () => {
    tooltip.style.opacity = "0";
  };

  const destroy = () => {
    tooltip.remove();
  };

  return { element: tooltip, show, hide, destroy };
}

export function positionTooltip(
  tooltip,
  position,
  container,
  portalTarget = container
) {
  const bounds = container.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  let left = position.x + 12;
  let top = position.y + 12;

  if (left + tooltipRect.width > bounds.width) {
    left = position.x - tooltipRect.width - 12;
  }
  if (top + tooltipRect.height > bounds.height) {
    top = position.y - tooltipRect.height - 12;
  }

  if (portalTarget !== container) {
    const viewportLeft = bounds.left + left;
    const viewportTop = bounds.top + top;
    const maxLeft = window.innerWidth - tooltipRect.width - 4;
    const maxTop = window.innerHeight - tooltipRect.height - 4;
    tooltip.style.left = `${Math.min(Math.max(viewportLeft, 4), maxLeft)}px`;
    tooltip.style.top = `${Math.min(Math.max(viewportTop, 4), maxTop)}px`;
    return;
  }

  tooltip.style.left = `${Math.max(left, 4)}px`;
  tooltip.style.top = `${Math.max(top, 4)}px`;
}

export function createLegend(container, series = [], options = {}) {
  const legend = document.createElement("div");
  legend.className = options.className || "fswepp-chart-legend";
  Object.assign(legend.style, {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "8px",
    fontSize: "12px",
    color: "rgba(15, 23, 42, 0.85)",
  });
  container.appendChild(legend);

  const render = (nextSeries) => {
    legend.innerHTML = "";
    nextSeries.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.seriesId = item.id;
      button.style.display = "flex";
      button.style.alignItems = "center";
      button.style.gap = "6px";
      button.style.border = "none";
      button.style.background = "transparent";
      button.style.cursor = "pointer";
      button.style.opacity = item.hidden ? "0.4" : "1";

      const swatch = document.createElement("span");
      swatch.style.display = "inline-block";
      swatch.style.width = "10px";
      swatch.style.height = "10px";
      swatch.style.borderRadius = "999px";
      swatch.style.background = item.color || "#2563eb";

      const label = document.createElement("span");
      label.textContent = item.label || item.id || "Series";

      button.appendChild(swatch);
      button.appendChild(label);
      legend.appendChild(button);
    });
  };

  render(series);

  const destroy = () => {
    legend.remove();
  };

  return { element: legend, render, destroy };
}

export function findNearestPoint(points, target, radius = 8) {
  let best = null;
  let minDist = Infinity;
  points.forEach((point) => {
    const dx = point.x - target.x;
    const dy = point.y - target.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= radius && dist < minDist) {
      minDist = dist;
      best = point;
    }
  });
  return best;
}

export function findBarHit(bars, target) {
  return (
    bars.find(
      (bar) =>
        target.x >= bar.x &&
        target.x <= bar.x + bar.width &&
        target.y >= bar.y &&
        target.y <= bar.y + bar.height
    ) || null
  );
}
