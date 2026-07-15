import React, { useState, useCallback, useMemo } from 'react';
import { Calculator, AlertTriangle, Info, Download, RotateCcw } from 'lucide-react';

// Import the types and functions from your peakflow calculations file
// import { PeakFlowInputs, PeakFlowResults, calculatePeakFlow, validateInputs, exampleData, conversions } from './peakflowCalculations';

// For this demo, I'll inline the essential types and a simplified version of the functions
interface PeakFlowInputs {
  Q: number;    // Runoff depth (mm)
  P: number;    // Rainfall (mm)
  A: number;    // Watershed area (hectares)
  L: number;    // Flow length (meters)
  Sg: number;   // Watershed gradient (decimal)
  Tc: number;   // Time of concentration (hours)
  CN: number;   // Curve number
  Fp: number;   // Pond adjustment factor
  h: number;    // Culvert height (meters)
}

interface PeakFlowResults {
  S: number;
  Ia: number;
  IaOnP: number;
  qu: number;
  q: number;
  D: number;
  TcCalculated: number;
  CNEstimated: number;
}

// Simplified calculation function for demo
const mockCalculatePeakFlow = (inputs: PeakFlowInputs): PeakFlowResults => {
  // This would be your actual calculatePeakFlow function
  return {
    S: 111,
    Ia: 22.2,
    IaOnP: 0.45,
    qu: 0.58,
    q: 8.87,
    D: 91.4,
    TcCalculated: 2.85,
    CNEstimated: 87
  };
};

const exampleData: PeakFlowInputs = {
  Q: 26.5, P: 49.3, L: 2572, A: 575, Sg: 0.133, Tc: 10, CN: 90, Fp: 1, h: 1.83
};

const PeakFlowCalculator: React.FC = () => {
  const [inputs, setInputs] = useState<Partial<PeakFlowInputs>>({
    Q: undefined, P: undefined, A: undefined, L: undefined,
    Sg: undefined, Tc: undefined, CN: undefined, Fp: 1, h: undefined
  });

  const [results, setResults] = useState<PeakFlowResults | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showUSUnits, setShowUSUnits] = useState(false);

  // Validation function
  const validateInputs = useCallback((inputs: Partial<PeakFlowInputs>) => {
    const errors: string[] = [];
    if (!inputs.Q || inputs.Q <= 0) errors.push('Runoff depth (Q) is required and must be > 0');
    if (!inputs.P || inputs.P <= 0) errors.push('Rainfall (P) is required and must be > 0');
    if (!inputs.A || inputs.A <= 0) errors.push('Watershed area (A) is required and must be > 0');
    if (!inputs.L || inputs.L <= 0) errors.push('Flow length (L) is required and must be > 0');
    if (inputs.Sg === undefined || inputs.Sg < 0 || inputs.Sg > 1) errors.push('Gradient (Sg) must be 0-1');
    if (inputs.CN === undefined || inputs.CN < 15 || inputs.CN > 100) errors.push('Curve number (CN) must be 15-100');
    if (inputs.Fp === undefined || inputs.Fp < 0 || inputs.Fp > 1) errors.push('Pond factor (Fp) must be 0-1');
    return { isValid: errors.length === 0, errors };
  }, []);

  // Handle input changes
  const handleInputChange = useCallback((field: keyof PeakFlowInputs, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    setInputs(prev => ({ ...prev, [field]: numValue }));
    setErrors([]); // Clear errors on input change
  }, []);

  // Calculate results
  const handleCalculate = useCallback(() => {
    const validation = validateInputs(inputs);
    if (!validation.isValid) {
      setErrors(validation.errors);
      setResults(null);
      return;
    }

    setIsCalculating(true);
    setErrors([]);

    try {
      // In your actual implementation, use: calculatePeakFlow(inputs as PeakFlowInputs)
      const calculatedResults = mockCalculatePeakFlow(inputs as PeakFlowInputs);
      setResults(calculatedResults);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Calculation failed']);
      setResults(null);
    } finally {
      setIsCalculating(false);
    }
  }, [inputs, validateInputs]);

  // Load example data
  const loadExample = useCallback(() => {
    setInputs(exampleData);
    setErrors([]);
  }, []);

  // Clear all inputs
  const clearInputs = useCallback(() => {
    setInputs({
      Q: undefined, P: undefined, A: undefined, L: undefined,
      Sg: undefined, Tc: undefined, CN: undefined, Fp: 1, h: undefined
    });
    setResults(null);
    setErrors([]);
  }, []);

  // Unit conversions for display
  const conversions = useMemo(() => ({
    mmToIn: (mm: number) => (mm / 25.4).toFixed(1),
    mToFt: (m: number) => (m * 3.281).toFixed(1),
    haToAc: (ha: number) => (ha * 2.471).toFixed(1),
    cmsToCs: (cms: number) => (cms * 35.31).toFixed(2),
    cmToIn: (cm: number) => (cm / 2.54).toFixed(1)
  }), []);

  const inputFields = [
    { key: 'Q' as keyof PeakFlowInputs, label: 'Runoff Depth (Q)', unit: 'mm', usUnit: 'in', desc: '24-hour storm runoff depth' },
    { key: 'P' as keyof PeakFlowInputs, label: 'Rainfall (P)', unit: 'mm', usUnit: 'in', desc: '24-hour rainfall depth' },
    { key: 'A' as keyof PeakFlowInputs, label: 'Watershed Area (A)', unit: 'ha', usUnit: 'ac', desc: 'Total watershed area' },
    { key: 'L' as keyof PeakFlowInputs, label: 'Flow Length (L)', unit: 'm', usUnit: 'ft', desc: 'Longest flow path in watershed' },
    { key: 'Sg' as keyof PeakFlowInputs, label: 'Gradient (Sg)', unit: 'm/m', usUnit: '%', desc: 'Average watershed slope (decimal, e.g. 0.133 = 13.3%)' },
    { key: 'Tc' as keyof PeakFlowInputs, label: 'Time of Concentration (Tc)', unit: 'hours', usUnit: 'hours', desc: 'Time for water to travel from furthest point' },
    { key: 'CN' as keyof PeakFlowInputs, label: 'Curve Number (CN)', unit: '', usUnit: '', desc: 'SCS runoff curve number (15-100)' },
    { key: 'Fp' as keyof PeakFlowInputs, label: 'Pond Factor (Fp)', unit: '', usUnit: '', desc: 'Pond and swamp adjustment (0-1, typically 1)' },
    { key: 'h' as keyof PeakFlowInputs, label: 'Culvert Height (h)', unit: 'm', usUnit: 'ft', desc: 'Distance from culvert center to road surface' }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Calculator className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Peak Flow Calculator</h1>
        </div>
        <p className="text-gray-600">
          Calculate peak flow rates using SCS Curve Number methodology for watershed analysis and culvert design.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Input Parameters</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowUSUnits(!showUSUnits)}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                >
                  {showUSUnits ? 'Show SI' : 'Show US'}
                </button>
                <button
                  onClick={loadExample}
                  className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                >
                  Example
                </button>
                <button
                  onClick={clearInputs}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {inputFields.map(({ key, label, unit, usUnit, desc }) => (
                <div key={key} className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    {label}
                    <span className="text-gray-500 ml-1">
                      ({showUSUnits ? usUnit || unit : unit})
                    </span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={inputs[key] ?? ''}
                    onChange={(e) => handleInputChange(key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Enter ${label.toLowerCase()}`}
                  />
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Error Display */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-red-800 font-medium">Input Errors</h3>
                  <ul className="mt-1 text-red-700 text-sm space-y-1">
                    {errors.map((error, idx) => (
                      <li key={idx}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Calculate Button */}
          <button
            onClick={handleCalculate}
            disabled={isCalculating}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isCalculating ? 'Calculating...' : 'Calculate Peak Flow'}
          </button>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {results && (
            <div className="bg-green-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Results</h2>

              <div className="grid grid-cols-1 gap-4">
                <div className="bg-white p-4 rounded border">
                  <h3 className="font-medium text-gray-700 mb-2">Surface Storage</h3>
                  <div className="text-2xl font-bold text-blue-600">
                    {results.S} mm
                    {showUSUnits && (
                      <span className="text-sm text-gray-500 ml-2">
                        ({conversions.mmToIn(results.S)} in)
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-white p-4 rounded border">
                  <h3 className="font-medium text-gray-700 mb-2">Initial Abstraction</h3>
                  <div className="text-2xl font-bold text-blue-600">
                    {results.Ia} mm
                    {showUSUnits && (
                      <span className="text-sm text-gray-500 ml-2">
                        ({conversions.mmToIn(results.Ia)} in)
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-white p-4 rounded border">
                  <h3 className="font-medium text-gray-700 mb-2">Ia/P Ratio</h3>
                  <div className="text-2xl font-bold text-blue-600">
                    {results.IaOnP}
                  </div>
                </div>

                <div className="bg-white p-4 rounded border">
                  <h3 className="font-medium text-gray-700 mb-2">Unit Peak Flow Rate</h3>
                  <div className="text-2xl font-bold text-green-600">
                    {results.qu} m³/s/ha/mm
                  </div>
                </div>

                <div className="bg-white p-4 rounded border border-orange-200 bg-orange-50">
                  <h3 className="font-medium text-gray-700 mb-2">Peak Flow Rate</h3>
                  <div className="text-3xl font-bold text-orange-600">
                    {results.q} m³/s
                    {showUSUnits && (
                      <span className="text-lg text-gray-500 ml-2">
                        ({conversions.cmsToCs(results.q)} ft³/s)
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-white p-4 rounded border">
                  <h3 className="font-medium text-gray-700 mb-2">Culvert Diameter</h3>
                  <div className="text-2xl font-bold text-purple-600">
                    {results.D} cm
                    {showUSUnits && (
                      <span className="text-sm text-gray-500 ml-2">
                        ({conversions.cmToIn(results.D)} in)
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-white p-4 rounded border">
                  <h3 className="font-medium text-gray-700 mb-2">Calculated Tc</h3>
                  <div className="text-lg font-medium text-gray-600">
                    {results.TcCalculated} hours
                  </div>
                </div>

                <div className="bg-white p-4 rounded border">
                  <h3 className="font-medium text-gray-700 mb-2">Estimated CN</h3>
                  <div className="text-lg font-medium text-gray-600">
                    {results.CNEstimated}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Information Panel */}
          <div className="bg-blue-50 p-6 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-blue-900 mb-2">About This Calculator</h3>
                <p className="text-blue-800 text-sm leading-relaxed">
                  This calculator uses the SCS Curve Number methodology to estimate peak flow rates
                  for watershed analysis and culvert design. It's based on USDA Forest Service
                  research from the Rocky Mountain Research Station.
                </p>
                <div className="mt-3 text-xs text-blue-700">
                  <strong>Key Equations:</strong>
                  <br />• Time of concentration: Tc = L^0.8 × ((1000/CN)-9)^0.7 / (4407 × Sg^0.5)
                  <br />• Peak flow: q = qu × A × Q × Fp
                  <br />• Surface storage: S = (25400/CN) - 254
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PeakFlowCalculator;