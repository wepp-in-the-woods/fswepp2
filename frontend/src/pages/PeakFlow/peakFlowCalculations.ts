/**
 * Peak Flow Calculator using Curve Number Technology
 * Originally from USDA Forest Service, Rocky Mountain Research Station, Moscow, ID
 * forest.moscowfsl.wsu.edu/ermit/peakflow/
 * Converted to TypeScript for React usage
 *
 * This module contains functions for calculating peak flow rates in watersheds
 * using the SCS Curve Number method and related hydrological calculations.
 */

export interface PeakFlowInputs {
  /** Storm Runoff (mm) */
  Q: number;
  /** Precipitation (mm) */
  P: number;
  /** Watershed area (hectares) */
  A: number;
  /** Flow length (meters) */
  L: number;
  /** Average watershed gradient (m/m) */
  Sg: number;
  /** Time of concentration (hours) */
  Tc: number;
  /** Curve number */
  CN: number;
  /** Ponding adjustment factor */
  Fp: number;
  /** Culvert height (meters) */
  h: number;
}

// export interface PeakFlowResults {
//   S: number;      // Surface storage (mm)
//   Ia: number;     // Initial abstraction (mm)
//   IaOnP: number;  // Ratio of initial abstraction to precipitation (dimensionless)
//   qu: number;     // Unit peak flow rate (m³/s per hectare per mm of runoff)
//   q: number;      // Estimated Peak flow rate (m³/s)
//   D: number;      // Culvert diameter (cm)
//   TcCalculated: number; // Calculated time of concentration (hours)
//   CNEstimated: number;  // Estimated curve number from Q and P
// }

export interface PeakFlowResults {
  /** Surface storage (mm) */
  S: number;
  /** Initial abstraction (mm) */
  Ia: number;
  /** Ratio of initial abstraction to precipitation */
  IaOnP: number;
  /** Unit peak flow rate (m³/s per ha/mm x 10⁻³ of runoff) */
  qu: number;
  /** Estimated Peak flow rate (m³/s) */
  q: number;
  /** Culvert diameter (cm) */
  D: number;
}

/**
 * Validates input values according to acceptable ranges
 * @param inputs - The input parameters to validate
 * @returns Object with validation results and error messages
 */
export function validateInputs(inputs: Partial<PeakFlowInputs>): {
  isValid: boolean;
  errors: string[]
} {
  const errors: string[] = [];

  if (inputs.Q !== undefined && inputs.Q <= 0) {
    errors.push('Runoff depth (Q) must be greater than 0');
  }
  if (inputs.P !== undefined && inputs.P <= 0) {
    errors.push('Rainfall (P) must be greater than 0');
  }
  if (inputs.A !== undefined && inputs.A <= 0) {
    errors.push('Watershed area (A) must be greater than 0');
  }
  if (inputs.L !== undefined && inputs.L <= 0) {
    errors.push('Flow length (L) must be greater than 0');
  }
  if (inputs.Sg !== undefined && (inputs.Sg < 0 || inputs.Sg > 1)) {
    errors.push('Watershed gradient (Sg) must be between 0 and 1 (0-100%)');
  }
  if (inputs.Tc !== undefined && (inputs.Tc < 0.1 || inputs.Tc > 10)) {
    errors.push('Time of concentration (Tc) must be between 0.1 and 10 hours');
  }
  if (inputs.CN !== undefined && (inputs.CN < 15 || inputs.CN > 100)) {
    errors.push('Curve number (CN) must be between 15 and 100');
  }
  if (inputs.Fp !== undefined && (inputs.Fp < 0 || inputs.Fp > 1)) {
    errors.push('Pond adjustment factor (Fp) must be between 0 and 1');
  }
  if (inputs.h !== undefined && (inputs.h < 0.3 || inputs.h > 18.3)) {
    errors.push('Culvert height (h) must be between 0.3 and 18.3 meters (1-60 feet)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Calculates time of concentration using equation 5.12
 * @param Sg - Average watershed gradient (m/m)
 * @param CN - Runoff curve number
 * @param L - Longest flow length (m)
 * @returns Time of concentration in hours
 */
export function calculateTc(Sg: number, CN: number, L: number): number {
  const num = Math.pow((1000 / CN) - 9, 0.7);
  const den = 4407 * Math.pow(Sg, 0.5);
  return Math.pow(L, 0.8) * num / den;
}

/**
 * Calculates surface storage and initial abstraction from curve number
 * @param CN - Runoff curve number
 * @returns Object containing surface storage (S) and initial abstraction (Ia) in mm
 */
export function calculateSurfaceStorage(CN: number): { S: number; Ia: number } {
  let S = ((25400 / CN) - 254)  // Surface storage (mm)
  let Ia = 0.2 * S;             // Initial abstraction (mm)
  S = Number(S.toFixed(0));
  Ia = Number(Ia.toFixed(1));
  return { S, Ia };
}

/**
 * Estimates curve number from runoff and precipitation data
 * From Iowa Stormwater Management Manual 2C-5 NRCS TR-55 Methodology
 * @param Q - Runoff depth from a 24-h storm (mm)
 * @param P - 24-h rainfall (mm)
 * @returns Estimated curve number
 */
export function estimateCN(Q: number, P: number): number {
  const numerator = 0.4 * P + 0.8 * Q;
  const underSqrt = Math.pow(numerator, 2) - 0.16 * (P * P - Q * P);
  const sqrtTerm = Math.sqrt(underSqrt);
  return 25400 / ((numerator - sqrtTerm) / 0.08 + 254);
}

/**
 * Calculates the ratio of initial abstraction to precipitation
 * @param Ia - Initial abstraction (mm)
 * @param P - 24-h rainfall (mm)
 * @returns Ia/P ratio (dimensionless)
 */
export function calculateRainfallFraction(Ia: number, P: number): number {
  return Ia / P;
}

/**
 * Two-dimensional interpolation helper function
 * Used for interpolating values from lookup tables
 */
function twodInterp(
  x: number, y: number,
  xl: number, xh: number,
  yl: number, yh: number,
  zll: number, zlr: number,
  zul: number, zur: number
): number {
  const xrat = (x - xl) / (xh - xl);
  const yrat = (y - yl) / (yh - yl);
  const yyl = zll + (zul - zll) * yrat;
  const yyr = zlr + (zur - zlr) * yrat;
  return yyl + (yyr - yyl) * xrat;
}

/**
 * Estimates unit peak flow rate from Figure 5.4 using interpolation
 * This is a complex lookup table implementation with 2D interpolation
 * @param tc - Time of concentration (hours)
 * @param iap - Ia/P ratio (dimensionless)
 * @returns Unit peak flow rate (m³/s per hectare per mm of runoff) or null if out of range
 */
export function estimateQu(tc: number, iap: number): number | null {
  if (tc < 0.1 || tc > 10) return null;

  let qu: number;

  if (tc < 0.1) {
    return null;
  } else if (tc <= 0.2) {
    if (iap <= 0.30) {
      qu = twodInterp(iap, tc, 0.10, 0.30, 0.1, 0.2, 4.60, 4.10, 3.44, 3.00);
    } else if (iap <= 0.35) {
      qu = twodInterp(iap, tc, 0.30, 0.35, 0.1, 0.2, 4.10, 3.80, 3.00, 2.28);
    } else if (iap <= 0.40) {
      qu = twodInterp(iap, tc, 0.35, 0.40, 0.1, 0.2, 3.80, 3.50, 2.28, 2.47);
    } else if (iap <= 0.45) {
      qu = twodInterp(iap, tc, 0.40, 0.45, 0.1, 0.2, 3.50, 3.00, 2.47, 2.90);
    } else {
      qu = twodInterp(iap, tc, 0.45, 0.50, 0.1, 0.2, 3.00, 2.28, 2.90, 1.60);
    }
  } else if (tc <= 0.4) {
    if (iap <= 0.30) {
      qu = twodInterp(iap, tc, 0.10, 0.30, 0.2, 0.4, 3.44, 3.00, 2.55, 2.10);
    } else if (iap <= 0.35) {
      qu = twodInterp(iap, tc, 0.30, 0.35, 0.2, 0.4, 3.00, 2.82, 2.10, 1.88);
    } else if (iap <= 0.40) {
      qu = twodInterp(iap, tc, 0.35, 0.40, 0.2, 0.4, 2.82, 2.47, 1.88, 1.70);
    } else if (iap <= 0.45) {
      qu = twodInterp(iap, tc, 0.40, 0.45, 0.2, 0.4, 2.47, 2.90, 1.70, 1.42);
    } else {
      qu = twodInterp(iap, tc, 0.45, 0.50, 0.2, 0.4, 2.90, 1.60, 1.42, 1.15);
    }
  } else if (tc <= 0.6) {
    if (iap <= 0.30) {
      qu = twodInterp(iap, tc, 0.10, 0.30, 0.4, 0.6, 2.55, 2.10, 1.95, 1.67);
    } else if (iap <= 0.35) {
      qu = twodInterp(iap, tc, 0.30, 0.35, 0.4, 0.6, 2.10, 1.88, 1.67, 1.51);
    } else if (iap <= 0.40) {
      qu = twodInterp(iap, tc, 0.35, 0.40, 0.4, 0.6, 1.88, 1.70, 1.51, 1.38);
    } else if (iap <= 0.45) {
      qu = twodInterp(iap, tc, 0.40, 0.45, 0.4, 0.6, 1.70, 1.42, 1.38, 1.15);
    } else {
      qu = twodInterp(iap, tc, 0.45, 0.50, 0.4, 0.6, 1.42, 1.15, 1.15, 0.95);
    }
  } else if (tc <= 0.8) {
    if (iap <= 0.30) {
      qu = twodInterp(iap, tc, 0.10, 0.30, 0.6, 0.8, 1.95, 1.67, 1.70, 1.49);
    } else if (iap <= 0.35) {
      qu = twodInterp(iap, tc, 0.30, 0.35, 0.6, 0.8, 1.67, 1.51, 1.49, 1.33);
    } else if (iap <= 0.40) {
      qu = twodInterp(iap, tc, 0.35, 0.40, 0.6, 0.8, 1.51, 1.38, 1.33, 1.19);
    } else if (iap <= 0.45) {
      qu = twodInterp(iap, tc, 0.40, 0.45, 0.6, 0.8, 1.38, 1.15, 1.19, 0.98);
    } else {
      qu = twodInterp(iap, tc, 0.45, 0.50, 0.6, 0.8, 1.15, 0.95, 0.98, 0.79);
    }
  } else if (tc <= 1) {
    if (iap <= 0.30) {
      qu = twodInterp(iap, tc, 0.10, 0.30, 0.8, 1, 1.70, 1.49, 1.50, 1.35);
    } else if (iap <= 0.35) {
      qu = twodInterp(iap, tc, 0.30, 0.35, 0.8, 1, 1.49, 1.33, 1.35, 1.20);
    } else if (iap <= 0.40) {
      qu = twodInterp(iap, tc, 0.35, 0.40, 0.8, 1, 1.33, 1.19, 1.20, 1.03);
    } else if (iap <= 0.45) {
      qu = twodInterp(iap, tc, 0.40, 0.45, 0.8, 1, 1.19, 0.98, 1.03, 0.88);
    } else {
      qu = twodInterp(iap, tc, 0.45, 0.50, 0.8, 1, 0.98, 0.79, 0.88, 0.70);
    }
  } else if (tc <= 2) {
    if (iap <= 0.30) {
      qu = twodInterp(iap, tc, 0.10, 0.30, 1, 2, 1.50, 1.35, 1.00, 0.80);
    } else if (iap <= 0.35) {
      qu = twodInterp(iap, tc, 0.30, 0.35, 1, 2, 1.35, 1.20, 0.80, 0.75);
    } else if (iap <= 0.40) {
      qu = twodInterp(iap, tc, 0.35, 0.40, 1, 2, 1.20, 1.03, 0.75, 0.66);
    } else if (iap <= 0.45) {
      qu = twodInterp(iap, tc, 0.40, 0.45, 1, 2, 1.03, 0.88, 0.66, 0.56);
    } else {
      qu = twodInterp(iap, tc, 0.45, 0.50, 1, 2, 0.88, 0.70, 0.56, 0.48);
    }
  } else if (tc <= 4) {
    if (iap <= 0.30) {
      qu = twodInterp(iap, tc, 0.10, 0.30, 2, 4, 1.00, 0.80, 0.58, 0.47);
    } else if (iap <= 0.35) {
      qu = twodInterp(iap, tc, 0.30, 0.35, 2, 4, 0.80, 0.75, 0.47, 0.45);
    } else if (iap <= 0.40) {
      qu = twodInterp(iap, tc, 0.35, 0.40, 2, 4, 0.75, 0.66, 0.45, 0.43);
    } else if (iap <= 0.45) {
      qu = twodInterp(iap, tc, 0.40, 0.45, 2, 4, 0.66, 0.56, 0.43, 0.38);
    } else {
      qu = twodInterp(iap, tc, 0.45, 0.50, 2, 4, 0.56, 0.48, 0.38, 0.35);
    }
  } else if (tc <= 6) {
    if (iap <= 0.30) {
      qu = twodInterp(iap, tc, 0.10, 0.30, 4, 6, 0.58, 0.47, 0.42, 0.36);
    } else if (iap <= 0.35) {
      qu = twodInterp(iap, tc, 0.30, 0.35, 4, 6, 0.47, 0.45, 0.36, 0.35);
    } else if (iap <= 0.40) {
      qu = twodInterp(iap, tc, 0.35, 0.40, 4, 6, 0.45, 0.425, 0.35, 0.33);
    } else if (iap <= 0.45) {
      qu = twodInterp(iap, tc, 0.40, 0.45, 4, 6, 0.425, 0.38, 0.33, 0.30);
    } else {
      qu = twodInterp(iap, tc, 0.45, 0.50, 4, 6, 0.38, 0.35, 0.30, 0.28);
    }
  } else if (tc <= 8) {
    if (iap <= 0.30) {
      qu = twodInterp(iap, tc, 0.10, 0.30, 6, 8, 0.42, 0.36, 0.325, 0.28);
    } else if (iap <= 0.35) {
      qu = twodInterp(iap, tc, 0.30, 0.35, 6, 8, 0.36, 0.35, 0.28, 0.27);
    } else if (iap <= 0.40) {
      qu = twodInterp(iap, tc, 0.35, 0.40, 6, 8, 0.35, 0.33, 0.27, 0.26);
    } else if (iap <= 0.45) {
      qu = twodInterp(iap, tc, 0.40, 0.45, 6, 8, 0.33, 0.30, 0.26, 0.25);
    } else {
      qu = twodInterp(iap, tc, 0.45, 0.50, 6, 8, 0.30, 0.28, 0.25, 0.24);
    }
  } else if (tc <= 10) {
    if (iap <= 0.30) {
      qu = twodInterp(iap, tc, 0.10, 0.30, 8, 10, 0.325, 0.275, 0.255, 0.235);
    } else if (iap <= 0.35) {
      qu = twodInterp(iap, tc, 0.30, 0.35, 8, 10, 0.275, 0.27, 0.235, 0.23);
    } else if (iap <= 0.40) {
      qu = twodInterp(iap, tc, 0.35, 0.40, 8, 10, 0.27, 0.26, 0.23, 0.225);
    } else if (iap <= 0.45) {
      qu = twodInterp(iap, tc, 0.40, 0.45, 8, 10, 0.26, 0.25, 0.225, 0.22);
    } else {
      qu = twodInterp(iap, tc, 0.45, 0.50, 8, 10, 0.25, 0.24, 0.22, 0.215);
    }
  } else {
    return null;
  }

  return qu < 0 ? null : Number(qu.toFixed(2));
}

/**
 * Calculates peak runoff rate using equation 5.11
 * @param qu - Unit peak flow rate (m³/s per hectare per mm of runoff)
 * @param A - Watershed area (hectares)
 * @param Q - Runoff depth (mm)
 * @param Fp - Pond and swamp adjustment factor (0-1)
 * @returns Peak runoff rate (m³/s)
 */
export function calculateQ(qu: number, A: number, Q: number, Fp: number): number {
  let q: number;
  console.log('CalcQ qu:', qu, 'A:', A, 'Q:', Q, 'Fp:', Fp);
  q = (qu / 1000) * A * Q * Fp;
  return Number(q.toFixed(2));
}

/**
 * Calculates culvert diameter for gradients > ~5%
 * @param q - Peak flow rate (m³/s)
 * @param Sg - Average watershed gradient (decimal)
 * @param h - Distance from center of culvert to 1 ft below road surface (meters)
 * @returns Culvert diameter in centimeters, or null if invalid inputs
 */
export function calculateCulvertDiameter(q: number, Sg: number, h: number): number | null {
  if (Sg <= 0.05 || h < 0.3 || h > 18.3) {
    return null; // Invalid conditions for this calculation
  }

  const g = 32.2; // Acceleration due to gravity in ft/s²
  const pi = 3.1415926;

  const qCfs = q * 35.31; // Convert m³/s to ft³/s
  const hFeet = Number((h * 3.281).toFixed(1)); // Convert meters to feet

  const num = 8 * qCfs;
  const den = pi * Math.sqrt(2 * g * hFeet); // using ft/s² for g in US units
  const diameterInches = 12 * Math.sqrt(num / den);

  // Convert inches to centimeters
  return Number((diameterInches * 2.54).toFixed(2));
}

/**
 * Main calculation function that performs all peak flow calculations
 * @param inputs - Input parameters for the calculation
 * @returns Complete results object with all calculated values
 */
export function calculatePeakFlow(inputs: PeakFlowInputs): PeakFlowResults {
  const validation = validateInputs(inputs);
  if (!validation.isValid) {
    throw new Error(`Invalid inputs: ${validation.errors.join(', ')}`);
  }

  // Calculate time of concentration if needed
  const TcCalculated = calculateTc(inputs.Sg, inputs.CN, inputs.L);
  const useCalculatedTc = inputs.Tc || TcCalculated;

  // Calculate surface storage and initial abstraction
  const { S, Ia } = calculateSurfaceStorage(inputs.CN);

  // Estimate curve number from Q and P if available
  const CNEstimated = inputs.Q && inputs.P ? estimateCN(inputs.Q, inputs.P) : inputs.CN;

  // Calculate rainfall fraction
  const IaOnP = calculateRainfallFraction(Ia, inputs.P);

  // Estimate unit peak flow rate
  const qu = estimateQu(useCalculatedTc, IaOnP);
  if (qu === null) {
    throw new Error('Unable to calculate unit peak flow rate - time of concentration or Ia/P ratio out of range');
  }

  // Calculate peak runoff rate
  const q = calculateQ(qu, inputs.A, inputs.Q, inputs.Fp);

  // Calculate culvert diameter
  const D = calculateCulvertDiameter(q, inputs.Sg, inputs.h);

  return {
    S: Number(S.toFixed(0)),
    Ia: Number(Ia.toFixed(1)),
    IaOnP: Number(IaOnP.toFixed(2)),
    qu: Number(qu.toFixed(2)),
    q: Number(q.toFixed(2)),
    D: D ? Number(D.toFixed(2)) : 0,
  };
}

/**
 * Example data for testing (Severe wildfire in Mica Creek Experimental Forest, Northern Idaho)
 */
export const exampleData: PeakFlowInputs = {
  Q: 26.5,    // mm
  P: 49.3,    // mm
  L: 2572,    // m
  A: 575,     // ha
  Sg: 0.133,  // m/m (13.3% slope)
  Tc: 10,     // hours
  CN: 90,     // dimensionless
  Fp: 1,      // dimensionless
  h: 1.83     // m
};