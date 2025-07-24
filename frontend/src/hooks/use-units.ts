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

    // Precision conversions
    mmToInches: (mm: number) => mm * 0.0393701,
    inchesToMm: (inches: number) => inches * 25.4,

    // Temperature conversions
    celsiusToFahrenheit: (celsius: number) => (celsius * 9/5) + 32,
    fahrenheitToCelsius: (fahrenheit: number) => (fahrenheit - 32) * 5/9,


  };

  return { convert };
};

export { useUnits, useConversions };