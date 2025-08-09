import { useEffect, useState } from 'react';

type Units = 'metric' | 'imperial';

function useUnits() {
  const [units, setUnits] = useState<Units>(() =>
    (localStorage.getItem("units") as Units) || "metric"
  );

  useEffect(() => {
    const handleStorageChange = () => {
      const newUnits = (localStorage.getItem("units") as Units) || "metric";
      setUnits(newUnits);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("unitsChanged", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("unitsChanged", handleStorageChange);
    };
  }, []);

  const updateUnits = (newUnits: Units) => {
    setUnits(newUnits);
    localStorage.setItem("units", newUnits);
    window.dispatchEvent(new Event("unitsChanged"));
  };

  return { units, setUnits: updateUnits };
}

const useConversions = () => {
  const convert = {
    // Distance conversions
    kmToMiles: (km: number) => km * 0.621371,
    milesToKm: (miles: number) => miles * 1.60934,

    // Length conversions
    mmToInches: (mm: number) => mm / 25.4,
    inchesToMm: (inches: number) => inches * 25.4,
    cmToInches: (cm: number) => cm / 2.54,
    inchesToCm: (inches: number) => inches * 2.54,
    mToFt: (m: number) => m * 3.281,
    ftToM: (ft: number) => ft / 3.281,

    // Temperature conversions
    celsiusToFahrenheit: (celsius: number) => (celsius * 9/5) + 32,
    fahrenheitToCelsius: (fahrenheit: number) => (fahrenheit - 32) * 5/9,

    // Area conversions
    hectaresToAcres: (hectares: number) => hectares * 2.471,
    acresToHectares: (acres: number) => acres / 2.471,

    // Flow rate
    cubicMetersPerSecToCubicFeetPerSec: (cms: number) => cms * 35.31,
    cubicFeetPerSecToCubicMetersPerSec: (cfs: number) => cfs / 35.31,

    // Unit peak flow rate (complex conversion)
    quSItoUS: (qu: number) => qu * 35.31 / 2.471 / 25.4,
    quUStoSI: (quUS: number) => quUS / (35.31 / 2.471 / 25.4)
  };

  return { convert };
};

export { useUnits, useConversions };