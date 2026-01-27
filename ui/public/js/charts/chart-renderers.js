const DEFAULT_FONT = "12px 'Inter', system-ui, -apple-system, sans-serif";

export function clearCanvas(ctx, width, height, background) {
  ctx.clearRect(0, 0, width, height);
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }
}

export function drawGrid(ctx, area, xTicks, yTicks, xScale, yScale, options = {}) {
  const { color = "rgba(15, 23, 42, 0.08)", lineWidth = 1 } = options;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  xTicks.forEach((tick) => {
    const x = xScale(tick);
    ctx.moveTo(x, area.y);
    ctx.lineTo(x, area.y + area.height);
  });
  yTicks.forEach((tick) => {
    const y = yScale(tick);
    ctx.moveTo(area.x, y);
    ctx.lineTo(area.x + area.width, y);
  });
  ctx.stroke();
  ctx.restore();
}

export function drawAxes(ctx, area, xAxis, yAxis, options = {}) {
  const {
    axisColor = "rgba(15, 23, 42, 0.6)",
    textColor = "rgba(15, 23, 42, 0.75)",
    tickSize = 6,
  } = options;
  ctx.save();
  ctx.strokeStyle = axisColor;
  ctx.fillStyle = textColor;
  ctx.lineWidth = 1;
  ctx.font = DEFAULT_FONT;

  // X axis line
  ctx.beginPath();
  ctx.moveTo(area.x, area.y + area.height);
  ctx.lineTo(area.x + area.width, area.y + area.height);
  ctx.stroke();

  // Y axis line
  ctx.beginPath();
  ctx.moveTo(area.x, area.y);
  ctx.lineTo(area.x, area.y + area.height);
  ctx.stroke();

  // X ticks and labels
  if (xAxis && xAxis.ticks) {
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    xAxis.ticks.forEach((tick) => {
      const x = xAxis.scale(tick);
      ctx.beginPath();
      ctx.moveTo(x, area.y + area.height);
      ctx.lineTo(x, area.y + area.height + tickSize);
      ctx.stroke();
      const label = xAxis.format ? xAxis.format(tick) : `${tick}`;
      ctx.fillText(label, x, area.y + area.height + tickSize + 2);
    });
  }

  // Y ticks and labels
  if (yAxis && yAxis.ticks) {
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    yAxis.ticks.forEach((tick) => {
      const y = yAxis.scale(tick);
      ctx.beginPath();
      ctx.moveTo(area.x - tickSize, y);
      ctx.lineTo(area.x, y);
      ctx.stroke();
      const label = yAxis.format ? yAxis.format(tick) : `${tick}`;
      ctx.fillText(label, area.x - tickSize - 4, y);
    });
  }

  // Axis labels
  if (xAxis?.label) {
    const labelOffset = Number.isFinite(xAxis.labelOffset)
      ? xAxis.labelOffset
      : 20;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(
      xAxis.label,
      area.x + area.width / 2,
      area.y + area.height + tickSize + labelOffset
    );
  }

  if (yAxis?.label) {
    ctx.save();
    ctx.translate(area.x - 40, area.y + area.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(yAxis.label, 0, 0);
    ctx.restore();
  }

  ctx.restore();
}

export function drawLine(ctx, points, options = {}) {
  if (!points.length) return;
  const {
    color = "#2563eb",
    lineWidth = 2,
    dash = null,
    lineJoin = "round",
  } = options;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = lineJoin;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
  ctx.restore();
}

export function drawArea(ctx, points, baseline, options = {}) {
  if (!points.length) return;
  const { color = "rgba(37, 99, 235, 0.2)", opacity } = options;
  ctx.save();
  if (typeof opacity === "number") {
    ctx.globalAlpha = opacity;
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0].x, baseline);
  for (let i = 0; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.lineTo(points[points.length - 1].x, baseline);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawScatter(ctx, points, options = {}) {
  const { color = "#2563eb", radius = 3, stroke = null } = options;
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = stroke || color;
  points.forEach((point) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, point.radius || radius, 0, Math.PI * 2);
    ctx.fill();
    if (stroke) ctx.stroke();
  });
  ctx.restore();
}

export function drawBars(ctx, bars, options = {}) {
  const { stroke = null } = options;
  ctx.save();
  bars.forEach((bar) => {
    ctx.fillStyle = bar.color || "#2563eb";
    ctx.fillRect(bar.x, bar.y, bar.width, bar.height);
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.strokeRect(bar.x, bar.y, bar.width, bar.height);
    }
  });
  ctx.restore();
}

export function drawText(ctx, text, x, y, options = {}) {
  const {
    color = "rgba(15, 23, 42, 0.8)",
    font = DEFAULT_FONT,
    align = "left",
    baseline = "alphabetic",
  } = options;
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(text, x, y);
  ctx.restore();
}
