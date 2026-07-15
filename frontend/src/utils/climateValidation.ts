import { ClimateState, ALLOWED_DATABASES, ALLOWED_CLIGEN } from "@/types/climate";
import { isLatitude, isLongitude } from "@/utils/validators";
import { writeClimateState } from "@/utils/climate-utils";

// Types
export interface ValidationResult {
  isValid: boolean;
  value: number;
  message?: string;
}

// Constants
export const DAYS_IN_MONTH = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// Utility functions
export function isNumber(value: any): boolean {
  const str = String(value);
  let hasDecimal = false;

  for (let i = 0; i < str.length; i++) {
    const char = str.charAt(i);

    if (i === 0 && char === '-') continue;
    if (char === '.' && !hasDecimal) {
      hasDecimal = true;
      continue;
    }
    if (char < '0' || char > '9') return false;
  }

  return true;
}

export function precision(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// Validation functions: based on metric measurements
// Temperature validation
export function validateTemperature(value: number, units: 'imperial' | 'metric' = 'imperial'): ValidationResult {
  const min = units === 'metric' ? -200 : -50;
  const max = units === 'metric' ? 200 : 130;
  const unit = units === 'metric' ? 'deg C' : 'deg F';

  if (!isNumber(value)) {
    return { isValid: false, value: 0, message: `Invalid temperature entry: ${value}` };
  }

  if (value < min) {
    return { isValid: false, value: min, message: `Temperature must be between ${min} and ${max} ${unit}` };
  }

  if (value > max) {
    return { isValid: false, value: max, message: `Temperature must be between ${min} and ${max} ${unit}` };
  }

  return { isValid: true, value };
}

// Precipitation validation
export function validatePrecipitation(value: number, units: 'imperial' | 'metric' = 'imperial'): ValidationResult {
  const min = 0;
  const max = units === 'metric' ? 999 : 39;
  const unit = units === 'metric' ? 'mm' : 'in';

  if (!isNumber(value)) {
    return { isValid: false, value: 0, message: 'Invalid precipitation entry' };
  }

  if (value < min || value > max) {
    const clampedValue = Math.max(min, Math.min(max, value));
    return { isValid: false, value: clampedValue, message: `Precipitation must be between ${min} and ${max} ${unit}` };
  }

  return { isValid: true, value };
}

// Wet days validation
export function validateWetDays(value: number, monthIndex: number): ValidationResult {
  const maxDays = DAYS_IN_MONTH[monthIndex];

  if (!isNumber(value)) {
    return { isValid: false, value: 0, message: 'Invalid wet days entry' };
  }

  if (value < 0 || value > maxDays) {
    const clampedValue = Math.max(0, Math.min(maxDays, value));
    return { isValid: false, value: clampedValue, message: `Wet days must be between 0 and ${maxDays}` };
  }

  return { isValid: true, value };
}

/** * Validates an imported climate payload against schema */
export function isValidClimateImport(payload: any): boolean {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const hasAnyClimateField =
      payload.database !== undefined ||
      payload.cligen_version !== undefined ||
      payload.location !== undefined ||
      payload.par_id !== undefined ||
      payload.input_years !== undefined ||
      payload.use_prism !== undefined ||
      payload.user_defined_par_mod !== undefined;

  if (!hasAnyClimateField) {
    return false;
  }

  // Validate database if present
  if (payload.database !== undefined) {
    if (typeof payload.database !== "string" || !ALLOWED_DATABASES.has(payload.database)) {
      return false;
    }
  }

  // Validate cligen version if present
  if (payload.cligen_version !== undefined) {
    if (typeof payload.cligen_version !== "string" || !ALLOWED_CLIGEN.has(payload.cligen_version)) {
      return false;
    }
  }

  // Validate location if present
  if (payload.location !== undefined && payload.location !== null) {
    if (typeof payload.location !== "object") {
      return false;
    }
    const lon = Number(payload.location.longitude);
    const lat = Number(payload.location.latitude);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      return false;
    }
    if (!isLongitude(String(lon)) || !isLatitude(String(lat))) {
      return false;
    }
  }

  // Validate par_id if present
  if (payload.par_id !== undefined && payload.par_id !== null) {
    if (typeof payload.par_id !== "string") {
      return false;
    }
  }

  // Validate input_years if present
  if (payload.input_years !== undefined && payload.input_years !== null) {
    const years = Number(payload.input_years);
    if (!Number.isFinite(years) || years < 1 || years > 200) {
      return false;
    }
  }

  // Validate use_prism if present
  if (payload.use_prism !== undefined && payload.use_prism !== null) {
    if (typeof payload.use_prism !== "boolean") {
      return false;
    }
  }

  // Validate user_defined_par_mod if present
  if (payload.user_defined_par_mod !== undefined && payload.user_defined_par_mod !== null) {
    const mod = payload.user_defined_par_mod;
    if (typeof mod !== "object") {
      return false;
    }

    // All three arrays are required if user_defined_par_mod is defined
    const isNumberArray = (arr: any): boolean =>
        Array.isArray(arr) &&
        arr.length === 12 &&
        arr.every((value) => Number.isFinite(Number(value)));

    if (!isNumberArray(mod.ppts) || !isNumberArray(mod.tmaxs) || !isNumberArray(mod.tmins)) {
      return false;
    }

    // description is optional but must be string if present
    if (mod.description !== undefined && mod.description !== null && typeof mod.description !== "string") {
      return false;
    }
  }

  return true;
}

/** * Normalizes imported climate payload from snake_case to camelCase */
export function normalizeClimateImport(payload: any): Partial<ClimateState> {
  return {
    database: payload.database,
    cligenVersion: payload.cligen_version,
    location: payload.location,
    parId: payload.par_id,
    inputYears: payload.input_years,
    usePrism: payload.use_prism,
    userDefinedParMod: payload.user_defined_par_mod,
  };
}

/** * Handles climate file import and validation * Returns the normalized state if successful, null if failed */
export async function handleClimateImport(
    file: File,
    setStatus: (message: string, isError?: boolean) => void
): Promise<Partial<ClimateState> | null> {
  if (!file) return null;

  // Check file size (3KB limit)
  if (Number.isFinite(file.size) && file.size > 3072) {
    setStatus("File too large. Max size is 3KB.", true);
    return null;
  }

  setStatus("Importing...");

  try {
    const text = await file.text();
    let payload = JSON.parse(text);

    // Handle wrapped climate object
    if (payload && typeof payload === "object" && payload.climate) {
      payload = payload.climate;
    }

    // Validate against schema
    if (!isValidClimateImport(payload)) {
      setStatus("Invalid climate JSON file.", true);
      return null;
    }

    // Normalize and persist
    const normalizedState = normalizeClimateImport(payload);
    writeClimateState(normalizedState);
    setStatus(`Imported ${file.name || "climate.json"}`);

    return normalizedState;
  } catch (error) {
    console.error("[rockclim] Failed to import climate JSON", error);
    setStatus("Unable to import climate file.", true);
    return null;
  }
}