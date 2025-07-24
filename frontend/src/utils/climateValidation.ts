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