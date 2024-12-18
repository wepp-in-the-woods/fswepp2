import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const StationPar = () => {
  const { stationId } = useParams();
  const [stationData, setStationData] = useState(null);
  const location = useLocation();
  const { stationDesc } = location.state;
  const { state } = location;
  const { location: userLocation, usePrism } = state || {};
  const [editMode, setEditMode] = useState(false);


  const extractNameAndState = (desc) => {
    const match = desc.match(/^(.+?)\s([A-Z]{2})\s/);
    return match ? `${match[1]}, ${match[2]}` : desc;
  };

  

  const handleDownloadStationPar = async () => {
    if (!stationId) {
      console.error("No station selected or par_id is missing");
      return;
    }
  
    try {
      const response = await axios.post(
        "http://localhost:8080/api/rockclim/GET/station_par",
        {
          par_id: stationId,
        }
      );

      const data = response.data;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `station_par_${stationId}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading station par:", error);
    }
  };

  const stationNameAndState = extractNameAndState(stationDesc);

  useEffect(() => {
    const fetchStationData = async () => {
      try {
        const response = await axios.post(
          "http://localhost:8080/api/rockclim/GET/station_par_monthlies",
          {
            par_id: stationId,
            location: userLocation,
            use_prism: usePrism,
          }
        );
        setStationData(response.data);
      } catch (error) {
        console.error("Error fetching station par monthlies:", error);
      }
    };

    fetchStationData();
  }, [stationId, userLocation, usePrism]);

  const handleModifyClimate = () => {
    setEditMode(!editMode);
  };

  const handleInputChange = (e, index, key) => {
    const newData = { ...stationData };
    newData[key][index] = e.target.value;
    setStationData(newData);
  };

  const renderTable = (data) => {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    return (
      <table className="min-w-full bg-white border-collapse">
        <thead>
          <tr>
            <th className="py-2 px-4 border border-gray-200 bg-gray-100 text-left text-sm font-semibold text-gray-700">Month</th>
            <th className="py-2 px-4 border border-gray-200 bg-gray-100 text-left text-sm font-semibold text-gray-700">PPT</th>
            <th className="py-2 px-4 border border-gray-200 bg-gray-100 text-left text-sm font-semibold text-gray-700">NWD</th>
            <th className="py-2 px-4 border border-gray-200 bg-gray-100 text-left text-sm font-semibold text-gray-700">TMAX</th>
            <th className="py-2 px-4 border border-gray-200 bg-gray-100 text-left text-sm font-semibold text-gray-700">TMIN</th>
          </tr>
        </thead>
        <tbody>
          {data.ppts.map((ppt, index) => (
            <tr key={index}>
              <td className="py-2 px-4 border border-gray-200 text-sm text-gray-700">{months[index]}</td>
              <td className="py-2 px-4 border border-gray-200 text-sm text-gray-700">
                {editMode ? (
                  <input
                    type="number"
                    value={ppt}
                    onChange={(e) => handleInputChange(e, index, 'ppts')}
                    className="w-full"
                  />
                ) : (
                  ppt
                )}
              </td>
              <td className="py-2 px-4 border border-gray-200 text-sm text-gray-700">
                {editMode ? (
                  <input
                    type="number"
                    value={data.nwds[index]}
                    onChange={(e) => handleInputChange(e, index, 'nwds')}
                    className="w-full"
                  />
                ) : (
                  data.nwds[index]
                )}
              </td>
              <td className="py-2 px-4 border border-gray-200 text-sm text-gray-700">
                {editMode ? (
                  <input
                    type="number"
                    value={data.tmaxs[index]}
                    onChange={(e) => handleInputChange(e, index, 'tmaxs')}
                    className="w-full"
                  />
                ) : (
                  data.tmaxs[index]
                )}
              </td>
              <td className="py-2 px-4 border border-gray-200 text-sm text-gray-700">
                {editMode ? (
                  <input
                    type="number"
                    value={data.tmins[index]}
                    onChange={(e) => handleInputChange(e, index, 'tmins')}
                    className="w-full"
                  />
                ) : (
                  data.tmins[index]
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="ml-24 mr-24 mx-auto p-8 space-y-8 flex">
      <div className="w-1/4 p-4 border-r">
        <h3 className="text-xl font-semibold">Coordinates</h3>
        <p>Latitude: {userLocation.latitude}</p>
        <p>Longitude: {userLocation.longitude}</p>
        <button
          onClick={handleModifyClimate}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
        >
          {editMode ? "Save Changes" : "Modify Climate"}
        </button>
        <button
          onClick={handleDownloadStationPar}
          className="mt-4 px-4 py-2 bg-green-500 text-white rounded"
        >
          Download Station Par File
        </button>
      </div>
      <div className="w-3/4 p-4">
        <h1 className="mb-4 text-4xl font-semibold">Station Parameters for {stationNameAndState}</h1>
        {stationData ? (
          <div className="overflow-auto">
            {renderTable(stationData)}
            <div className="mt-4">
              <h2 className="text-2xl font-semibold">Cumulative PPT</h2>
              <p className="text-lg">{stationData.cumulative_ppts}</p>
            </div>
          </div>
        ) : (
          <p>Loading...</p>
        )}
      </div>
    </div>
  );
};

export default StationPar;