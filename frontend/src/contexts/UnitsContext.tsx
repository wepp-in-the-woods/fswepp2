import React, { createContext, useContext, useState, useEffect } from 'react';

type Units = 'metric' | 'imperial';

interface UnitsContextType {
  units: Units;
  setUnits: (units: Units) => void;
  toggleUnits: () => void;
}

const UnitsContext = createContext<UnitsContextType | undefined>(undefined);

const useUnits = () => {
  const context = useContext(UnitsContext);
  if (!context) {
    throw new Error('useUnits must be used within a UnitsProvider');
  }
  return context;
};

const UnitsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [units, setUnits] = useState<Units>(() =>
    (localStorage.getItem('units') as Units) || 'metric'
  );

  useEffect(() => {
    localStorage.setItem('units', units);
  }, [units]);

  const toggleUnits = () => {
    setUnits(prev => prev === 'metric' ? 'imperial' : 'metric');
  };

  // Unit formatting for distance
  const formatDistanceUnits = (value: number, unit: string) => {
    if (units === 'metric') {
      // Convert values based on the unit: km, m or mm
      return unit === 'km'
        ? `${value.toFixed(2)} km`
        : unit === 'm'
          ? `${value.toFixed(2)} m`
          : unit === 'mm'
            ? `${value.toFixed(2)} mm`
            : `${value.toFixed(2)} ${unit}`; // Default case for other units
    }
    else {
      // Convert values based on the metric unit
      return unit === 'km'
        ? `${(value * 0.621371).toFixed(2)} mi`
        : unit === 'm'
          ? `${(value * 3.28084).toFixed(2)} ft`
          : unit === 'mm'
            ? `${(value * 39.3701).toFixed(2)} in`
            : `${(value).toFixed(2)} ${unit}`;
    }
  };

  // Unit formatting for temperature
  const formatTemperatureUnits = (value: number) => {
    return units === 'metric'
      ? `${value.toFixed(2)} °C`
      : `${(value * 9/5 + 32).toFixed(2)} °F`;
  };

  // Unit formatting for area
  const formatAreaUnits = (value: number, unit: string = "ha") => {
    if (units === 'metric') {
      // Convert values based on the unit: km, m or mm
      return unit === 'ha'
        ? `${value.toFixed(2)} ha`
        : unit === 'squareMeter'
          ? `${value.toFixed(2)} m²`
          : unit === 'squareKm'
            ? `${value.toFixed(2)} km²`
            : `${value.toFixed(2)} ${unit}`; // Default case for other units
    }
    else {
      // Convert values based on the metric unit
      return unit === 'ha'
        ? `${(value * 2.47105).toFixed(2)} acres`
        : unit === 'squareMeter'
          ? `${(value * 10.7639).toFixed(2)} ft²`
          : unit === 'squareKm'
            ? `${(value * 0.386102).toFixed(2)} mi²`
            : `${(value).toFixed(2)} ${unit}`;
    }
  };

  // Unit formatting for weight: Tonne, kg, g
  const formatWeightUnits = (value: number, unit: string = "kg") => {
    if (units === 'metric') {
      // Convert values based on the unit: tonne, kg or gm
      return unit === 'tonne'
        ? `${value.toFixed(2)} t`
        : unit === 'kg'
          ? `${value.toFixed(2)} kg`
          : unit === 'g'
            ? `${value.toFixed(2)} g`
            : `${value.toFixed(2)} ${unit}`; // Default case for other units
    }
    else {
      // Convert values based on the metric unit
      return unit === 'tonne'
        ? `${(value * 2204.62).toFixed(2)} lb`
        : unit === 'kg'
          ? `${(value * 2.20462).toFixed(2)} lb`
          : unit === 'g'
            ? `${(value * 0.00220462).toFixed(2)} oz`
            : `${(value).toFixed(2)} ${unit}`;
    }
  };

  // Unit formatting for volume: m³
  const formatVolumeUnits = (value: number) => {
    return units === 'metric'
      ? `${value.toFixed(2)} m³`
      : `${(value * 35.3147).toFixed(2)} ft³`;
  };

  // // Unit formatting for concentration: g/L, mg/L, μg/L, ppm
  // const formatConcentrationUnits = (mgPerLiter) => {
  //   return units === 'metric'
  //     ? `${mgPerLiter.toFixed(2)} mg/L`
  //     : `${(mgPerLiter * 0.001).toFixed(2)} g/gal`;
  // };

  // Unit formatting for precipitation: mm or in
  const formatPrecipitationUnits = (value: number) => {
    return units === 'metric'
      ? `${value.toFixed(2)} mm`
      : `${(value * 0.0393701).toFixed(2)} in`;
  };

  return (
    <UnitsContext.Provider value={{ units, setUnits, toggleUnits }}>
      {children}
    </UnitsContext.Provider>
  );
};

export { UnitsProvider, useUnits };