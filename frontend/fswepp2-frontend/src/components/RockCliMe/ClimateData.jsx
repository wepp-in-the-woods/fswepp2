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
    return { name, state };
  }
  return { name: "", state: "" };
};

const ClimateData = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    stationCoords: coordinates = { latitude: 0, longitude: 0 },
    location: loc = [0, 0],
    years,
    usePrismClim,
    par_id,
    stationDesc,
    user_defined_par_mod,
    customPar,
  } = location.state || {};
  const [climateData, setClimateData] = useState(null);

  let name = "",
    state = "";
  if (stationDesc) {
    ({ name, state } = parseStationDesc(stationDesc));
  }

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
    "Jan.",
    "Feb.",
    "Mar.",
    "Apr.",
    "May.",
    "Jun.",
    "Jul.",
    "Aug.",
    "Sep.",
    "Oct.",
    "Nov.",
    "Dec.",
  ];

  useEffect(() => {
    const fetchClimateData = async () => {
      if(customPar) {
        console.log("Custom Par:", customPar);
      }
      
      try {
        const response = await axios.post(
          "http://localhost:8080/api/rockclim/GET/climate_monthlies",
          customPar || {
            par_id: par_id,
            input_years: years,
            location: loc,
            use_prism: usePrismClim,
            user_defined_par_mod: user_defined_par_mod,
          }
        );
        setClimateData(response.data);
        console.log("Climate Data:", response.data);
      } catch (error) {
        console.error("Error generating climate data:", error);
      }
    };

    fetchClimateData();
  }, [par_id, loc, usePrismClim, user_defined_par_mod]);

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
      <div className="flex flex-col items-start ml-4 mr-4">
        <div className="text-2xl font-semibold">
          {name}, {state}
        </div>
        <div className="text-xl font-semibold mb-4">Station ID: {par_id}</div>
        {coordinates && (
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
        )}
        <div className="mt-4 w-full mb-4">
          <h3 className="text-2xl font-semibold">Climate Data:</h3>
          {usePrismClim && (
            <p className="text-[12px] mb-2">
              *Precip. & Mean Min/Max Temp. from PRISM
            </p>
          )}
          {climateData && (
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
                  {climateData.ppts.map((ppt, index) => (
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
                        {climateData.tmaxs[index].toFixed(2)}
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        {climateData.tmins[index].toFixed(2)}
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        {climateData.nwds[index].toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClimateData;
