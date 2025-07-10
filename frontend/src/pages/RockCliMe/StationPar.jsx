import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { api } from "../../api";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, SquarePen } from "lucide-react";
import { Icon } from "@/components/ui/icon";

// StationPar Component that displays custom or station parameter data
function StationPar() {
  const navigate = useNavigate();
  const location = useLocation();

  // Destructure location state from RockCliMe component
  const {
    databaseVersion,
    cligenVersion,
    stationCoords: coordinates = { latitude: 0, longitude: 0 },
    location: loc = [0, 0],
    usePrismPar,
    stationDesc = "",
    par_id,
    selected_par,
    user_defined_par_mod,
  } = location.state || {};
  const [parData, setParData] = useState(null);
  const [isModified, setIsModified] = useState(false);
  const [description, setDescription] = useState(stationDesc);

  // Initialize input values for precipitation, max temp, min temp, and number of wet days
  const [inputValues, setInputValues] = useState({
    ppts: [],
    tmaxs: [],
    tmins: [],
    nwds: [],
  });

  // Handle click event to save or modify parameter data
  const handleClick = () => {
    if (isModified) {
      handleSave();
    } else {
      setIsModified(true);
    }
  };

  // Handle input change for precipitation, max temp, min temp, and number of wet days
  const handleInputChange = (e, index, type) => {
    const newValue = parseFloat(e.target.value);
    setInputValues((prevValues) => {
      const updatedValues = { ...prevValues };
      updatedValues[type][index] = isNaN(newValue) ? 0 : newValue;
      return updatedValues;
    });
  };

  // Handle title change for description
  const handleTitleChange = (e, field) => {
    const value = e.target.value;
    if (field === "description") {
      setDescription(value);
    }
  };

  // Handle save event to update user-defined parameter data
  const handleSave = () => {
    const user_defined_par = {
      par_id: par_id,
      user_defined_par_mod: {
        description: description,
        ppts: parData.ppts,
        tmaxs: parData.tmaxs,
        tmins: parData.tmins,
      },
    };

    // Post user-defined parameter data to server
    api
      .post("/api/rockclim/PUT/user_defined_par", user_defined_par, {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      })
      .then((response) => {
        console.log("Server response:", response);
        setDescription("");
      })
      .catch((error) => {
        console.error("Error posting data:", error);
      });

    // Once saved, reset view
    setIsModified(false);
    setDescription("");
  };

  // Handle cancel event to reset view and table values
  useEffect(() => {
    if (parData) {
      setInputValues({
        ppts: parData.ppts,
        tmaxs: parData.tmaxs,
        tmins: parData.tmins,
        nwds: parData.nwds || [],
      });
    }
  }, [parData]);

  // Fetch station parameter data from server
  useEffect(() => {
    const fetchStationData = async () => {
      try {
        // API Call
        const response = await api.post(
          "/api/rockclim/GET/station_par_monthlies",
          {
            database: databaseVersion,
            cligen_version: cligenVersion,
            par_id: par_id,
            location: loc,
            use_prism: usePrismPar,
          },
        );
        setParData(response.data);
      } catch (error) {
        console.error("Error fetching station par monthlies:", error);
      }
    };

    // If not user defined parameter, fetch station data
    if (!user_defined_par_mod) {
      fetchStationData();
      // Otherwise set user defined parameter data
    } else {
      setParData(user_defined_par_mod);
    }
  }, [par_id, loc, usePrismPar, user_defined_par_mod]);

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
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <div className="page-container">
          {/* Main Content */}
          <div
            className="flex flex-col justify-between lg:flex-row"
            dataslot="page-header"
          >
            <div className="flex w-full flex-col items-start gap-3 p-6 pb-2">
              <div className="flex flex-row w-full h-8 text-2xl font-semibold">
                {/* Parameter description with modifiable state */}
                {isModified ? (
                  <Input
                    type="text"
                    defaultValue={
                      user_defined_par_mod
                        ? user_defined_par_mod.description
                        : stationDesc
                    }
                    onChange={(e) => handleTitleChange(e, "description")}
                    className={`w-full h-fit font-medium !text-xl`}
                  />
                ) : (
                  <>
                    {user_defined_par_mod
                      ? user_defined_par_mod.description
                      : stationDesc}
                  </>
                )}
              </div>

              {/* Station ID or Parameter ID*/}
              <div className="text-md text-gray-800">
                {user_defined_par_mod
                  ? `Par. ID: ${selected_par}`
                  : `Par. ID: ${par_id.slice(0, -4)}`}
              </div>

              {/* Station Coordinates if not a custom parameter */}
              {!user_defined_par_mod && (
                <div className="text-gray-800">
                  <h3 className="font-bold">
                    Station Coordinates
                  </h3>
                  {!user_defined_par_mod && (
                    <>
                      <p className="text-sm md:text-base">
                        Latitude: {coordinates.latitude}
                      </p>
                      <p className="text-sm md:text-base">
                        Longitude: {coordinates.longitude}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col p-6 items-start">
            {/* Display station data in a table*/}
            <div className="mb-4 w-full">
              <div className="mb-3 flex flex-row items-center justify-between w-full">
                <div className="gap-2">
                  <h3 className="text-xl font-semibold">Station Data</h3>
                  {usePrismPar && (
                    <p className="text-sm">* Precip & Mean Temps. from PRISM</p>
                  )}
                </div>

                {/* Save or Modify Button */}
                <div className="flex grow items-end justify-end gap-2">
                  <Button
                    variant="outline"
                    className={`${!isModified ? "hidden" : ""}`} onClick={() => setIsModified(false)}
                  >
                    Discard Changes
                  </Button>
                  <Button
                    variant={isModified ? "default" : "outline"}
                    onClick={handleClick}
                    className="transition-none"
                  >
                    {isModified ? (
                      <>
                        <Icon icon={Save} className="h-5 w-5" />
                        Save Parameters
                      </>
                    ) : (
                      <>
                        <Icon icon={SquarePen} className="h-5 w-5" />
                        Modify Parameters
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Table of station data */}
              {parData && (
                <div>
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
                        {parData.nwds && parData.nwds.length > 0 && (
                          <th className="w-1/5 border border-gray-300 px-2 py-2 text-left">
                            # of Wet Days
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Map par data to table */}
                      {parData.ppts.map((ppt, index) => (
                        <tr key={index}>
                          <td className="w-1/5 border border-gray-300 px-2 py-2">
                            <span className="hidden md:inline">
                              {months[index]}
                            </span>
                            <span className="md:hidden">{monthsAbbrev[index]}</span>
                          </td>
                          <td className="w-1/5 border border-gray-300 px-2 py-2">
                            {/* Allow user to change values if isModified state is true*/}
                            <input
                              type="text"
                              defaultValue={ppt.toFixed(2)}
                              onChange={(e) => handleInputChange(e, index, "ppts")}
                              className={`w-full rounded-sm border-none ${
                                isModified
                                  ? "outline-rounded-sm outline-1 outline-offset-1 outline-gray-300"
                                  : ""
                              }`}
                              readOnly={!isModified}
                            />
                          </td>
                          <td className="w-1/5 border border-gray-300 px-2 py-2">
                            {/* Allow user to change values if isModified state is true*/}
                            <input
                              type="text"
                              defaultValue={parData.tmaxs[index].toFixed(2)}
                              onChange={(e) => handleInputChange(e, index, "tmaxs")}
                              className={`w-full rounded-sm border-none ${
                                isModified
                                  ? "outline-rounded-sm outline-1 outline-offset-1 outline-gray-300"
                                  : ""
                              }`}
                              readOnly={!isModified}
                            />
                          </td>
                          <td className="w-1/5 border border-gray-300 px-2 py-2">
                            {/* Allow user to change values if isModified state is true*/}
                            <input
                              type="text"
                              defaultValue={parData.tmins[index].toFixed(2)}
                              onChange={(e) => handleInputChange(e, index, "tmins")}
                              className={`w-full rounded-sm border-none ${
                                isModified
                                  ? "outline-rounded-sm outline-1 outline-offset-1 outline-gray-300"
                                  : ""
                              }`}
                              readOnly={!isModified}
                            />
                          </td>
                          {parData.nwds && parData.nwds.length > 0 && (
                            <td className="w-1/5 border border-gray-300 px-2 py-2">
                              {/* Allow user to change values if isModified state is true*/}
                              <input
                                type="text"
                                defaultValue={parData.nwds[index].toFixed(2)}
                                onChange={(e) =>
                                  handleInputChange(e, index, "nwds")
                                }
                                className={`w-full rounded-sm border-none ${
                                  isModified
                                    ? "outline-rounded-sm outline-1 outline-offset-1 outline-gray-300"
                                    : ""
                                }`}
                                readOnly={!isModified}
                              />
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default StationPar;
