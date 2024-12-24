import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const parseStationDesc = (desc) => {
  const trimmedDesc = desc.replace(/\s+/g, " ").trim();
  const regex = /^(.*?)(\b[A-Z]{2}\b)\s(\d{6})\s0$/;
  const match = trimmedDesc.match(regex);
  if (match) {
    const name = match[1].trim();
    const state = match[2];
    const id = match[3];
    return { name, state, id };
  }
  return { name: "", state: "", id: "" };
};

const StationPar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    stationCoords: coordinates,
    location: loc,
    usePrism,
    stationDesc,
    par_id,
  } = location.state || {};
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
      } catch (error) {
        console.error("Error fetching station par monthlies:", error);
      }
    };

    fetchStationData();
  }, [par_id, loc, usePrism]);

  const { name, state, id } = parseStationDesc(stationDesc);

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const monthsAbbrev = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

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
      <div className="flex items-center">
        <button
          onClick={() => navigate("/rockclime")}
          className="px-4 py-2 bg-white text-black underline rounded items-start"
        >
          Back
        </button>
      </div>
      {/* Main Content */}
      <div className="flex flex-col items-start ml-4 mr-4">
        <div className="w-full">
          <div className="text-2xl font-semibold">
            {name}, {state}
          </div>
          <div className="text-xl font-semibold mb-4">Station ID: {id}</div>
          <div className="text-xl">
            <h3 className="text-[17px] font-semibold -mt-2">
              Station Coordinates
            </h3>
            <p className="text-[14px] -mt-1">
              Latitude: {coordinates.latitude}
            </p>
            <p className="text-[14px] -mt-2">
              Longitude: {coordinates.longitude}
            </p>
          </div>
        </div>
        <div className="mt-4 w-full mb-4">
          <h3 className="text-2xl font-semibold">Station Data:</h3>
          {usePrism && (
            <p className="text-[12px] mb-2">
              *Precip. & Mean Min/Max Temp. from PRISM
            </p>
          )}
          {stationData && (
            <div>
              <table className="table-auto border-collapse border border-gray-400 w-full max-[374px]:text-xs">
                <thead>
                  <tr>
                    <th className="border border-gray-300 py-2 px-2 text-left">
                      Month
                    </th>
                    <th className="border border-gray-300 py-2 px-2 text-left">
                      Mean Precip.
                    </th>
                    <th className="border border-gray-300 px-2 py-2 text-left">
                      Mean Max Temp.
                    </th>
                    <th className="border border-gray-300 px-2 py-2 text-left">
                      Mean Min Temp.
                    </th>
                    <th className="border border-gray-300 px-2 py-2 text-left">
                      # of Wet Days
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stationData.ppts.map((ppt, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 px-2 py-2">
                        <span className="hidden md:inline">
                          {months[index]}
                        </span>
                        <span className="md:hidden">{monthsAbbrev[index]}</span>
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        {ppt.toFixed(2)}
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        {stationData.tmaxs[index].toFixed(2)}
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        {stationData.tmins[index].toFixed(2)}
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        {stationData.nwds[index].toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border border-gray-300">
                    <td className="border border-gray-300 px-2 py-2">
                      <span className="hidden md:inline">Annual</span>
                      <span className="md:hidden">Ann.</span>
                    </td>
                    <td className="border border-gray-300 px-2 py-2">
                      {stationData.cumulative_ppts.toFixed(2)}
                    </td>
                    <td className="border border-gray-300 px-2 py-2"></td>
                    <td className="border border-gray-300 px-2 py-2"></td>
                    <td className="border border-gray-300 px-2 py-2"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StationPar;
