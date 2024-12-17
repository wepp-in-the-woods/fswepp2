import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const StationPar = () => {
  const { stationId } = useParams();
  const [stationData, setStationData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStationData = async () => {
      try {
        const response = await axios.post(
          "http://localhost:8080/api/rockclim/GET/station_par",
          {
            par_id: stationId,
          }
        );
        setStationData(response.data);
      } catch (error) {
        console.error("Error fetching station par:", error);
      }
    };

    fetchStationData();
  }, [stationId]);

  return (
    <div className="ml-24 mr-24 mx-auto p-8 space-y-8">
      <button onClick={() => navigate(-1)} className="px-4 py-2 bg-blue-500 text-white rounded">
        Back
      </button>
      <h1 className="text-4xl font-semibold">Station Parameters</h1>
      {stationData ? (
        <pre className="text-gray-700">{JSON.stringify(stationData, null, 2)}</pre>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default StationPar;