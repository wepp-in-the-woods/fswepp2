import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
// import axios from "axios";
import { api } from "@/api.ts";

// Parse station description to get name and state
function parseStationDesc (desc: string) {
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

// Component to display climate data
function ClimateData() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    // For station parameters
    stationCoords: coordinates = { latitude: 0, longitude: 0 },
    location: loc = [0, 0],
    years,
    usePrismClim,
    par_id,
    stationDesc,
    user_defined_par_mod,

    // For custom parameters
    selectedPar,
    customPar,
  } = location.state || {};
  const [climateData, setClimateData] = useState(null);

  let name = "",
    state = "";
  if (stationDesc) {
    ({ name, state } = parseStationDesc(stationDesc));
  }

  // Unabbreviated months
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

  // Abbreviated months
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

  // When page is loaded, fetch the climate data based on parameters.
  useEffect(() => {
    const fetchClimateData = async () => {
      // Fetch climate data based on station parameters OR custom parameters
      try {
        const updatedCustomPar = customPar
          ? {
              ...customPar,
              input_years: years || customPar.input_years,
            }
          : {
              par_id: par_id,
              input_years: years,
              location: loc,
              use_prism: usePrismClim,
              user_defined_par_mod: user_defined_par_mod,
            };

        // API Call to get climate data
        const response = await api.post(
          "/api/rockclim/GET/climate_monthlies",
          updatedCustomPar,
        );
        // Set climate data
        setClimateData(response.data);
        console.log("Climate data:", response.data);
      } catch (error) {
        console.error("Error generating climate data:", error);
      }
    };

    // Fetch climate data if it doesn't exist
    if (!climateData) {
      fetchClimateData();
    }
  }, [par_id, loc, usePrismClim, user_defined_par_mod]);

  return (
    <div className="flex h-screen flex-col">
      {/* Mobile Navbar */}
      <div
        className="top-0 right-0 left-0 flex h-16 items-center justify-between p-4 shadow-md lg:hidden"
        style={{ zIndex: 10 }}
      >
        <div>
          <h1 className="text-xl font-semibold">RockClime</h1>
          <p className="text-sm text-gray-700">RMRS Climate Generator</p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="rounded-sm bg-[#16a34a] px-4 py-2 text-white"
        >
          Home
        </button>
      </div>
      <div className="flex items-center">
        <button
          onClick={() => navigate("/rockclime")}
          className="items-start rounded-sm bg-white px-4 py-2 text-black underline"
        >
          Back
        </button>
      </div>
      {/* Climate Data page header*/}
      <div className="mr-4 ml-4 flex flex-col items-start">
        <div className="text-2xl font-semibold">
          {/* If custom parameters are present, render the 
          description, otherwise parsed name and state from station*/}
          {customPar
            ? customPar.user_defined_par_mod.description
            : `${name}, ${state}`}
        </div>
        <div className="text-l mb-4">
          {/* Render station or custom par ID */}
          {customPar ? `Parameter ID: ${selectedPar}` : `Station ID: ${par_id}`}
        </div>{" "}
        {/* If not a custom par, display coordinates.*/}
        {!customPar && coordinates && (
          <div className="text-xl">
            <h3 className="-mt-2 text-[17px] font-semibold">
              Station Coordinates
            </h3>
            <p className="-mt-1 text-[14px]">
              Latitude: {coordinates.latitude}
            </p>
            <p className="-mt-2 text-[14px]">
              Longitude: {coordinates.longitude}
            </p>
          </div>
        )}
        {/* Div for climate data table*/}
        <div className="mt-4 mb-4 w-full">
          <h3 className="text-2xl font-semibold">Climate Data:</h3>
          {usePrismClim && (
            <p className="mb-2 text-[12px]">
              *Precip. & Mean Min/Max Temp. from PRISM
            </p>
          )}
          {climateData && (
            <div>
              <table className="w-full table-auto border-collapse border border-gray-400 max-[374px]:text-xs">
                <thead>
                  <tr>
                    <th className="border border-gray-300 px-2 py-2 text-left">
                      Month
                    </th>
                    <th className="border border-gray-300 px-2 py-2 text-left">
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
}

export default ClimateData;
