import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { api } from "../../api";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";

// Parse station description to get name and state
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
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <div className="page-container">
          {/* Climate Data page header*/}
          <div
            className="flex flex-col justify-between lg:flex-row px-4 lg:px-6"
            dataslot="page-header"
          >
            <div className="flex w-full flex-col items-start gap-3">
              <div className="flex w-full flex-row text-2xl font-semibold">
                {/* If custom parameters are present, render the
                description, otherwise parsed name and state from station*/}
                {customPar
                  ? customPar.user_defined_par_mod.description
                  : `${name}, ${state}`}
              </div>
              <div className="text-mdtext-gray-800">
                {/* Render station or custom par ID */}
                {customPar ? `Parameter ID: ${selectedPar}` : `Station ID: ${par_id}`}
              </div>{" "}
              {/* If not a custom par, display coordinates.*/}
              {!customPar && coordinates && (
                <div className="text-gray-800">
                  <h3 className="font-bold">
                    Station Coordinates
                  </h3>
                  <p className="text-sm md:text-base">
                    Latitude: {coordinates.latitude}
                  </p>
                  <p className="text-sm md:text-base">
                    Longitude: {coordinates.longitude}
                  </p>
                </div>
              )}
              <div>
                {years} years of data.
              </div>
            </div>
          </div>

          {/*TODO: Add button to download climate data as a .cli file*/}
          {/*TODO: Units in table header*/}
          {/*TODO: Add button to remove custom parameters*/}
          {/* Div for climate data table*/}
          <div className="flex flex-col items-start px-4 lg:px-6 mb-4 w-full">
            <div className="mb-3 flex flex-row w-full gap-2">
              <h3 className="text-xl font-semibold">Climate Data</h3>
              {usePrismClim && (
                <p className="text-sm">
                  *Precip. & Mean Min/Max Temp. from PRISM
                </p>
              )}
            </div>
            {climateData && (
              <div className="w-full">
                <table className="w-full table-auto border-collapse border border-gray-400 max-[374px]:text-xs">
                  <thead>
                  <tr>
                    <th className="w-1/5 border border-gray-300 px-2 py-2 text-left">
                      Month
                    </th>
                    <th className="w-1/5 border border-gray-300 px-2 py-2 text-left">
                      Mean Precip.
                    </th>
                    <th className="w-1/5 border border-gray-300 px-2 py-2 text-left">
                      Mean Max Temp.
                    </th>
                    <th className="w-1/5 border border-gray-300 px-2 py-2 text-left">
                      Mean Min Temp.
                    </th>
                    <th className="w-1/5 border border-gray-300 px-2 py-2 text-left">
                      # of Wet Days
                    </th>
                  </tr>
                  </thead>
                  <tbody>
                  {climateData.ppts.map((ppt, index) => (
                    <tr key={index}>
                      <td className="w-1/5 border border-gray-300 px-2 py-2 text-left">
                            <span className="hidden md:inline">
                              {months[index]}
                            </span>
                        <span className="md:hidden">{monthsAbbrev[index]}</span>
                      </td>
                      <td className="w-1/5 border border-gray-300 px-2 py-2">
                        {ppt.toFixed(2)}
                      </td>
                      <td className="w-1/5 border border-gray-300 px-2 py-2">
                        {climateData.tmaxs[index].toFixed(2)}
                      </td>
                      <td className="w-1/5 border border-gray-300 px-2 py-2">
                        {climateData.tmins[index].toFixed(2)}
                      </td>
                      <td className="w-1/5 border border-gray-300 px-2 py-2">
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
      </SidebarInset>
    </SidebarProvider>
  );
}

export default ClimateData;
