import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';

const ClimateData = () => {
  const { state } = useLocation();
  const { years, par_id, stationDesc } = state || {};
  const [loading, setLoading] = useState(false);

  const downloadClimateData = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:8080/api/rockclim/GET/climate",
        {
          par_id,
          input_years: years
        }
      );
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'text/plain' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `climate_data_${par_id}.txt`;
      link.click();
    } catch (error) {
      console.error("Error fetching climate data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Climate Data for {stationDesc.desc}</h1>
      <button
        onClick={downloadClimateData}
        disabled={loading}
        className={`px-4 py-2 rounded ${loading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-700'} text-white font-bold`}
      >
        {loading ? 'Downloading...' : 'Download climate data'}
      </button>
    </div>
  );
};

export default ClimateData;