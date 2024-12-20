import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, json } from "react-router-dom";
import axios from "axios";

const StationPar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { location: loc, usePrism, stationDesc, par_id } = location.state || {};
  const [stationData, setStationData] = useState(null);

  useEffect(() => {
    const fetchStationData = async () => {
      try {
        const response = await axios.post(
          "http://localhost:8080/api/rockclim/GET/station_par_monthlies",
          {
            par_id: par_id,
            location: loc,
            use_prism: usePrism,
          }
        );
        setStationData(response.data);
        console.log(JSON.stringify(response.data));
      } catch (error) {
        console.error("Error fetching station par monthlies:", error);
      }
    };

    fetchStationData();
  }, [par_id, loc, usePrism]);

  return (
    <div className="flex flex-col h-screen">
      {/* Mobile Navbar */}
      <div
        className="top-0 left-0 right-0 shadow-md p-4 flex justify-between items-center h-16 lg:hidden"
        style={{ zIndex: 10 }}
      >
        <div>
          <h1 className="text-xl font-semibold">RockClime</h1>
          <p className="text-sm text-gray-700">RMRS Climate Generator</p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 bg-[#16a34a] text-white rounded"
        >
          Home
        </button>
      </div>
      {/* Main Content */}
      <div className="flex flex-col items-start ml-4 mt-8">
        <div className="text-4xl font-bold mb-2">Station Parameters</div>
        <div className="text-2xl font-semibold mb-4">{stationDesc}</div>
        <div className="text-xl">
          <h3 className="font-semibold">Coordinates</h3>
          <p>Latitude: {loc?.latitude}</p>
          <p>Longitude: {loc?.longitude}</p>
        </div>
        {stationData && (
          <div className="mt-8">
            <h3 className="text-2xl font-semibold mb-4">Station Data</h3>
            <table className="table-auto border-collapse border border-gray-400">
              <thead>
                <tr>
                  <th className="border border-gray-300 px-4 py-2">Month</th>
                  <th className="border border-gray-300 px-4 py-2">PPT</th>
                  <th className="border border-gray-300 px-4 py-2">NWDS</th>
                  <th className="border border-gray-300 px-4 py-2">TMAX</th>
                  <th className="border border-gray-300 px-4 py-2">TMIN</th>
                </tr>
              </thead>
              <tbody>
                {stationData.ppts.map((ppt, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 px-4 py-2">{index + 1}</td>
                    <td className="border border-gray-300 px-4 py-2">{ppt}</td>
                    <td className="border border-gray-300 px-4 py-2">{stationData.nwds[index].toFixed(2)}</td>
                    <td className="border border-gray-300 px-4 py-2">{stationData.tmaxs[index]}</td>
                    <td className="border border-gray-300 px-4 py-2">{stationData.tmins[index]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4">
              <h3 className="text-xl font-semibold">Cumulative PPT</h3>
              <p>{stationData.cumulative_ppts}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StationPar;
