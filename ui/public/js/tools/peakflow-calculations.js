/**
 * Peak Flow Calculator using Curve Number Technology
 * Originally from USDA Forest Service, Rocky Mountain Research Station, Moscow, ID
 * forest.moscowfsl.wsu.edu/ermit/peakflow/
 *
 * This module contains functions for calculating peak flow rates in watersheds
 * using the SCS Curve Number method and related hydrological calculations.
 */

export function validateInputs(inputs) {
  const errors = [];

  if (inputs.Q !== undefined && inputs.Q <= 0) {
    errors.push("Runoff depth (Q) must be greater than 0");
  }
  if (inputs.P !== undefined && inputs.P <= 0) {
    errors.push("Rainfall (P) must be greater than 0");
  }
  if (inputs.A !== undefined && inputs.A <= 0) {
    errors.push("Watershed area (A) must be greater than 0");
  }
  if (inputs.L !== undefined && inputs.L <= 0) {
    errors.push("Flow length (L) must be greater than 0");
  }
  if (inputs.Sg !== undefined && (inputs.Sg < 0 || inputs.Sg > 1)) {
    errors.push("Watershed gradient (Sg) must be between 0 and 1 (0-100%)");
  }
  if (inputs.Tc !== undefined && (inputs.Tc < 0.1 || inputs.Tc > 10)) {
    errors.push("Time of concentration (Tc) must be between 0.1 and 10 hours");
  }
  if (inputs.CN !== undefined && (inputs.CN < 15 || inputs.CN > 100)) {
    errors.push("Curve number (CN) must be between 15 and 100");
  }
  if (inputs.Fp !== undefined && (inputs.Fp < 0 || inputs.Fp > 1)) {
    errors.push("Pond adjustment factor (Fp) must be between 0 and 1");
  }
  if (inputs.h !== undefined && (inputs.h < 0.3 || inputs.h > 18.3)) {
    errors.push(
      "Culvert height (h) must be between 0.3 and 18.3 meters (1-60 feet)"
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function calculateTc(Sg, CN, L) {
  const num = Math.pow(1000 / CN - 9, 0.7);
  const den = 4407 * Math.pow(Sg, 0.5);
  return Math.pow(L, 0.8) * num / den;
}

export function calculateSurfaceStorage(CN) {
  let S = 25400 / CN - 254;
  let Ia = 0.2 * S;
  S = Number(S.toFixed(0));
  Ia = Number(Ia.toFixed(1));
  return { S, Ia };
}

export function estimateCN(Q, P) {
  const numerator = 0.4 * P + 0.8 * Q;
  const underSqrt = Math.pow(numerator, 2) - 0.16 * (P * P - Q * P);
  const sqrtTerm = Math.sqrt(underSqrt);
  return 25400 / ((numerator - sqrtTerm) / 0.08 + 254);
}

export function calculateRainfallFraction(Ia, P) {
  return Ia / P;
}

function twodInterp(x, y, xl, xh, yl, yh, zll, zlr, zul, zur) {
  const xrat = (x - xl) / (xh - xl);
  const yrat = (y - yl) / (yh - yl);
  const yyl = zll + (zul - zll) * yrat;
  const yyr = zlr + (zur - zlr) * yrat;
  return yyl + (yyr - yyl) * xrat;
}

export function estimateQu(tc, iap) {
  if (tc < 0.1 || tc > 10) return null;

  let qu;

  if (tc <= 0.2) {
    if (iap <= 0.3) {
      qu = twodInterp(iap, tc, 0.1, 0.3, 0.1, 0.2, 4.6, 4.1, 3.44, 3.0);
    } else if (iap <= 0.35) {
      qu = twodInterp(iap, tc, 0.3, 0.35, 0.1, 0.2, 4.1, 3.8, 3.0, 2.28);
    } else if (iap <= 0.4) {
      qu = twodInterp(iap, tc, 0.35, 0.4, 0.1, 0.2, 3.8, 3.5, 2.28, 2.47);
    } else if (iap <= 0.45) {
      qu = twodInterp(iap, tc, 0.4, 0.45, 0.1, 0.2, 3.5, 3.0, 2.47, 2.9);
    } else {
      qu = twodInterp(iap, tc, 0.45, 0.5, 0.1, 0.2, 3.0, 2.28, 2.9, 1.6);
    }
  } else if (tc <= 0.4) {
    if (iap <= 0.3) {
      qu = twodInterp(iap, tc, 0.1, 0.3, 0.2, 0.4, 3.44, 3.0, 2.55, 2.1);
    } else if (iap <= 0.35) {
      qu = twodInterp(iap, tc, 0.3, 0.35, 0.2, 0.4, 3.0, 2.82, 2.1, 1.88);
    } else if (iap <= 0.4) {
      qu = twodInterp(iap, tc, 0.35, 0.4, 0.2, 0.4, 2.82, 2.47, 1.88, 1.7);
    } else if (iap <= 0.45) {
      qu = twodInterp(iap, tc, 0.4, 0.45, 0.2, 0.4, 2.47, 2.9, 1.7, 1.42);
    } else {
      qu = twodInterp(iap, tc, 0.45, 0.5, 0.2, 0.4, 2.9, 1.6, 1.42, 1.15);
    }
  } else if (tc <= 0.6) {
    if (iap <= 0.3) {
      qu = twodInterp(iap, tc, 0.1, 0.3, 0.4, 0.6, 2.55, 2.1, 1.95, 1.67);
    } else if (iap <= 0.35) {
      qu = twodInterp(iap, tc, 0.3, 0.35, 0.4, 0.6, 2.1, 1.88, 1.67, 1.51);
    } else if (iap <= 0.4) {
      qu = twodInterp(iap, tc, 0.35, 0.4, 0.4, 0.6, 1.88, 1.7, 1.51, 1.38);
    } else if (iap <= 0.45) {
      qu = twodInterp(iap, tc, 0.4, 0.45, 0.4, 0.6, 1.7, 1.42, 1.38, 1.15);
    } else {
      qu = twodInterp(iap, tc, 0.45, 0.5, 0.4, 0.6, 1.42, 1.15, 1.15, 0.95);
    }
  } else if (tc <= 0.8) {
    if (iap <= 0.3) {
      qu = twodInterp(iap, tc, 0.1, 0.3, 0.6, 0.8, 1.95, 1.67, 1.55, 1.38);
    } else if (iap <= 0.35) {
      qu = twodInterp(iap, tc, 0.3, 0.35, 0.6, 0.8, 1.67, 1.51, 1.38, 1.25);
    } else if (iap <= 0.4) {
      qu = twodInterp(iap, tc, 0.35, 0.4, 0.6, 0.8, 1.51, 1.38, 1.25, 1.15);
    } else if (iap <= 0.45) {
      qu = twodInterp(iap, tc, 0.4, 0.45, 0.6, 0.8, 1.38, 1.15, 1.15, 0.95);
    } else {
      qu = twodInterp(iap, tc, 0.45, 0.5, 0.6, 0.8, 1.15, 0.95, 0.95, 0.83);
    }
  } else if (tc <= 1.0) {
    if (iap <= 0.3) {
      qu = twodInterp(iap, tc, 0.1, 0.3, 0.8, 1.0, 1.55, 1.38, 1.2, 1.08);
    } else if (iap <= 0.35) {
      qu = twodInterp(iap, tc, 0.3, 0.35, 0.8, 1.0, 1.38, 1.25, 1.08, 1.0);
    } else if (iap <= 0.4) {
      qu = twodInterp(iap, tc, 0.35, 0.4, 0.8, 1.0, 1.25, 1.15, 1.0, 0.93);
    } else if (iap <= 0.45) {
      qu = twodInterp(iap, tc, 0.4, 0.45, 0.8, 1.0, 1.15, 0.95, 0.93, 0.85);
    } else {
      qu = twodInterp(iap, tc, 0.45, 0.5, 0.8, 1.0, 0.95, 0.83, 0.85, 0.77);
    }
  } else if (tc <= 1.2) {
    if (iap <= 0.3) {
      qu = twodInterp(iap, tc, 0.1, 0.3, 1.0, 1.2, 1.2, 1.08, 1.0, 0.9);
    } else if (iap <= 0.35) {
      qu = twodInterp(iap, tc, 0.3, 0.35, 1.0, 1.2, 1.08, 1.0, 0.9, 0.83);
    } else if (iap <= 0.4) {
      qu = twodInterp(iap, tc, 0.35, 0.4, 1.0, 1.2, 1.0, 0.93, 0.83, 0.79);
    } else if (iap <= 0.45) {
      qu = twodInterp(iap, tc, 0.4, 0.45, 1.0, 1.2, 0.93, 0.85, 0.79, 0.72);
    } else {
      qu = twodInterp(iap, tc, 0.45, 0.5, 1.0, 1.2, 0.85, 0.77, 0.72, 0.67);
    }
  } else if (tc <= 1.5) {
    if (iap <= 0.3) {
      qu = twodInterp(iap, tc, 0.1, 0.3, 1.2, 1.5, 1.0, 0.9, 0.83, 0.75);
    } else if (iap <= 0.35) {
      qu = twodInterp(iap, tc, 0.3, 0.35, 1.2, 1.5, 0.9, 0.83, 0.75, 0.7);
    } else if (iap <= 0.4) {
      qu = twodInterp(iap, tc, 0.35, 0.4, 1.2, 1.5, 0.83, 0.79, 0.7, 0.65);
    } else if (iap <= 0.45) {
      qu = twodInterp(iap, tc, 0.4, 0.45, 1.2, 1.5, 0.79, 0.72, 0.65, 0.6);
    } else {
      qu = twodInterp(iap, tc, 0.45, 0.5, 1.2, 1.5, 0.72, 0.67, 0.6, 0.56);
    }
  } else if (tc <= 2.0) {
    if (iap <= 0.3) {
      qu = twodInterp(iap, tc, 0.1, 0.3, 1.5, 2.0, 0.83, 0.75, 0.65, 0.58);
    } else if (iap <= 0.35) {
      qu = twodInterp(iap, tc, 0.3, 0.35, 1.5, 2.0, 0.75, 0.7, 0.58, 0.54);
    } else if (iap <= 0.4) {
      qu = twodInterp(iap, tc, 0.35, 0.4, 1.5, 2.0, 0.7, 0.65, 0.54, 0.5);
    } else if (iap <= 0.45) {
      qu = twodInterp(iap, tc, 0.4, 0.45, 1.5, 2.0, 0.65, 0.6, 0.5, 0.47);
    } else {
      qu = twodInterp(iap, tc, 0.45, 0.5, 1.5, 2.0, 0.6, 0.56, 0.47, 0.44);
    }
  } else if (tc <= 3.0) {
    if (iap <= 0.3) {
      qu = twodInterp(iap, tc, 0.1, 0.3, 2.0, 3.0, 0.65, 0.58, 0.5, 0.45);
    } else if (iap <= 0.35) {
      qu = twodInterp(iap, tc, 0.3, 0.35, 2.0, 3.0, 0.58, 0.54, 0.45, 0.42);
    } else if (iap <= 0.4) {
      qu = twodInterp(iap, tc, 0.35, 0.4, 2.0, 3.0, 0.54, 0.5, 0.42, 0.39);
    } else if (iap <= 0.45) {
      qu = twodInterp(iap, tc, 0.4, 0.45, 2.0, 3.0, 0.5, 0.47, 0.39, 0.36);
    } else {
      qu = twodInterp(iap, tc, 0.45, 0.5, 2.0, 3.0, 0.47, 0.44, 0.36, 0.34);
    }
  } else if (tc <= 4.0) {
    if (iap <= 0.3) {
      qu = twodInterp(iap, tc, 0.1, 0.3, 3.0, 4.0, 0.5, 0.45, 0.4, 0.36);
    } else if (iap <= 0.35) {
      qu = twodInterp(iap, tc, 0.3, 0.35, 3.0, 4.0, 0.45, 0.42, 0.36, 0.34);
    } else if (iap <= 0.4) {
      qu = twodInterp(iap, tc, 0.35, 0.4, 3.0, 4.0, 0.42, 0.39, 0.34, 0.32);
    } else if (iap <= 0.45) {
      qu = twodInterp(iap, tc, 0.4, 0.45, 3.0, 4.0, 0.39, 0.36, 0.32, 0.3);
    } else {
      qu = twodInterp(iap, tc, 0.45, 0.5, 3.0, 4.0, 0.36, 0.34, 0.3, 0.28);
    }
  } else if (tc <= 6.0) {
    if (iap <= 0.3) {
      qu = twodInterp(iap, tc, 0.1, 0.3, 4.0, 6.0, 0.4, 0.36, 0.32, 0.28);
    } else if (iap <= 0.35) {
      qu = twodInterp(iap, tc, 0.3, 0.35, 4.0, 6.0, 0.36, 0.34, 0.28, 0.26);
    } else if (iap <= 0.4) {
      qu = twodInterp(iap, tc, 0.35, 0.4, 4.0, 6.0, 0.34, 0.32, 0.26, 0.24);
    } else if (iap <= 0.45) {
      qu = twodInterp(iap, tc, 0.4, 0.45, 4.0, 6.0, 0.32, 0.3, 0.24, 0.22);
    } else {
      qu = twodInterp(iap, tc, 0.45, 0.5, 4.0, 6.0, 0.3, 0.28, 0.22, 0.2);
    }
  } else if (tc <= 8.0) {
    if (iap <= 0.3) {
      qu = twodInterp(iap, tc, 0.1, 0.3, 6.0, 8.0, 0.32, 0.28, 0.25, 0.22);
    } else if (iap <= 0.35) {
      qu = twodInterp(iap, tc, 0.3, 0.35, 6.0, 8.0, 0.28, 0.26, 0.22, 0.2);
    } else if (iap <= 0.4) {
      qu = twodInterp(iap, tc, 0.35, 0.4, 6.0, 8.0, 0.26, 0.24, 0.2, 0.19);
    } else if (iap <= 0.45) {
      qu = twodInterp(iap, tc, 0.4, 0.45, 6.0, 8.0, 0.24, 0.22, 0.19, 0.18);
    } else {
      qu = twodInterp(iap, tc, 0.45, 0.5, 6.0, 8.0, 0.22, 0.2, 0.18, 0.17);
    }
  } else {
    if (iap <= 0.3) {
      qu = twodInterp(iap, tc, 0.1, 0.3, 8.0, 10.0, 0.25, 0.22, 0.2, 0.18);
    } else if (iap <= 0.35) {
      qu = twodInterp(iap, tc, 0.3, 0.35, 8.0, 10.0, 0.22, 0.2, 0.18, 0.17);
    } else if (iap <= 0.4) {
      qu = twodInterp(iap, tc, 0.35, 0.4, 8.0, 10.0, 0.2, 0.19, 0.17, 0.16);
    } else if (iap <= 0.45) {
      qu = twodInterp(iap, tc, 0.4, 0.45, 8.0, 10.0, 0.19, 0.18, 0.16, 0.15);
    } else {
      qu = twodInterp(iap, tc, 0.45, 0.5, 8.0, 10.0, 0.18, 0.17, 0.15, 0.14);
    }
  }

  return qu;
}

export function calculateQ(qu, A, Q, Fp) {
  return qu * A * Q * Fp * 1e-3;
}

export function calculateCulvertDiameter(q, Sg, h) {
  if (Sg <= 0.05 || h < 0.3 || h > 18.3) {
    return null;
  }

  const g = 32.2;
  const pi = 3.1415926;

  const qCfs = q * 35.31;
  const hFeet = Number((h * 3.281).toFixed(1));

  const num = 8 * qCfs;
  const den = pi * Math.sqrt(2 * g * hFeet);
  const diameterInches = 12 * Math.sqrt(num / den);

  return Number((diameterInches * 2.54).toFixed(2));
}

export function calculatePeakFlow(inputs) {
  const validation = validateInputs(inputs);
  if (!validation.isValid) {
    throw new Error(`Invalid inputs: ${validation.errors.join(", ")}`);
  }

  const TcCalculated = calculateTc(inputs.Sg, inputs.CN, inputs.L);
  const useCalculatedTc = inputs.Tc || TcCalculated;

  const { S, Ia } = calculateSurfaceStorage(inputs.CN);

  const CNEstimated = inputs.Q && inputs.P ? estimateCN(inputs.Q, inputs.P) : inputs.CN;

  const IaOnP = calculateRainfallFraction(Ia, inputs.P);

  const qu = estimateQu(useCalculatedTc, IaOnP);
  if (qu === null) {
    throw new Error(
      "Unable to calculate unit peak flow rate - time of concentration or Ia/P ratio out of range"
    );
  }

  const q = calculateQ(qu, inputs.A, inputs.Q, inputs.Fp);

  const D = calculateCulvertDiameter(q, inputs.Sg, inputs.h);

  return {
    S: Number(S.toFixed(0)),
    Ia: Number(Ia.toFixed(1)),
    IaOnP: Number(IaOnP.toFixed(2)),
    qu: Number(qu.toFixed(2)),
    q: Number(q.toFixed(2)),
    D: D ? Number(D.toFixed(2)) : 0,
    CNEstimated: Number(CNEstimated.toFixed(0)),
    TcCalculated: Number(TcCalculated.toFixed(2)),
  };
}

export const exampleData = {
  Q: 26.5,
  P: 49.3,
  L: 2572,
  A: 575,
  Sg: 0.133,
  Tc: 10,
  CN: 90,
  Fp: 1,
  h: 1.83,
};
