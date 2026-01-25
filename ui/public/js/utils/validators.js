export function isRequired(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

export function inRange(value, min, max) {
  if (value === null || value === undefined || value === "") return false;
  const num = Number(value);
  if (!Number.isFinite(num)) return false;
  return num >= min && num <= max;
}

export function isNumber(value) {
  const num = Number(value);
  return Number.isFinite(num);
}

export function isLatitude(value) {
  return inRange(value, -90, 90);
}

export function isLongitude(value) {
  return inRange(value, -180, 180);
}
