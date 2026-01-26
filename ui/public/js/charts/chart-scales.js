const DEFAULT_TICK_COUNT = 5;

const isFiniteNumber = (value) => Number.isFinite(value);

export function extent(values) {
  let min = Infinity;
  let max = -Infinity;
  values.forEach((value) => {
    if (!isFiniteNumber(value)) return;
    if (value < min) min = value;
    if (value > max) max = value;
  });
  if (!isFiniteNumber(min) || !isFiniteNumber(max)) {
    return [0, 1];
  }
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1;
    return [min - pad, max + pad];
  }
  return [min, max];
}

function niceNumber(range, round) {
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / Math.pow(10, exponent);
  let niceFraction;
  if (round) {
    if (fraction < 1.5) {
      niceFraction = 1;
    } else if (fraction < 3) {
      niceFraction = 2;
    } else if (fraction < 7) {
      niceFraction = 5;
    } else {
      niceFraction = 10;
    }
  } else if (fraction <= 1) {
    niceFraction = 1;
  } else if (fraction <= 2) {
    niceFraction = 2;
  } else if (fraction <= 5) {
    niceFraction = 5;
  } else {
    niceFraction = 10;
  }
  return niceFraction * Math.pow(10, exponent);
}

export function niceTicks(min, max, tickCount = DEFAULT_TICK_COUNT) {
  if (!isFiniteNumber(min) || !isFiniteNumber(max)) return [];
  if (min === max) return [min];
  const range = niceNumber(max - min, false);
  const step = niceNumber(range / (tickCount - 1), true);
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const ticks = [];
  for (let value = niceMin; value <= niceMax + step * 0.5; value += step) {
    ticks.push(Number(value.toFixed(10)));
  }
  return ticks;
}

export function createLinearScale(domain, range) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  const scale = (value) => r0 + ((value - d0) / span) * (r1 - r0);
  scale.invert = (value) => d0 + ((value - r0) / (r1 - r0 || 1)) * span;
  scale.domain = () => [d0, d1];
  scale.range = () => [r0, r1];
  scale.ticks = (count = DEFAULT_TICK_COUNT) => niceTicks(d0, d1, count);
  return scale;
}

export function createLogScale(domain, range, base = 10) {
  const [d0, d1] = domain;
  if (d0 <= 0 || d1 <= 0) {
    return createLinearScale(domain, range);
  }
  const [r0, r1] = range;
  const log = (value) => Math.log(value) / Math.log(base);
  const logMin = log(d0);
  const logMax = log(d1);
  const span = logMax - logMin || 1;
  const scale = (value) =>
    r0 + ((log(value) - logMin) / span) * (r1 - r0);
  scale.invert = (value) =>
    Math.pow(base, logMin + ((value - r0) / (r1 - r0 || 1)) * span);
  scale.domain = () => [d0, d1];
  scale.range = () => [r0, r1];
  scale.ticks = () => {
    const ticks = [];
    const start = Math.floor(logMin);
    const end = Math.ceil(logMax);
    for (let exponent = start; exponent <= end; exponent += 1) {
      ticks.push(Math.pow(base, exponent));
    }
    return ticks;
  };
  return scale;
}

export function createPointScale(domain, range) {
  const [r0, r1] = range;
  const count = domain.length;
  const step = count > 1 ? (r1 - r0) / (count - 1) : 0;
  const positions = new Map();
  domain.forEach((value, index) => {
    positions.set(value, r0 + step * index);
  });
  const scale = (value) => positions.get(value);
  scale.domain = () => domain.slice();
  scale.range = () => [r0, r1];
  scale.ticks = () => domain.slice();
  return scale;
}

export function createBandScale(domain, range, padding = 0.1) {
  const [r0, r1] = range;
  const count = domain.length;
  const span = r1 - r0;
  const totalPadding = padding * (count - 1);
  const step = count > 0 ? span / (count + totalPadding) : span;
  const bandwidth = step;
  const positions = new Map();
  domain.forEach((value, index) => {
    positions.set(value, r0 + index * step * (1 + padding));
  });
  const scale = (value) => positions.get(value);
  scale.domain = () => domain.slice();
  scale.range = () => [r0, r1];
  scale.bandwidth = () => bandwidth;
  return scale;
}
