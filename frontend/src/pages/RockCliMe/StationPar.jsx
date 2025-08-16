import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { api } from "../../api";
import { validatePrecipitation, validateTemperature } from "@/utils/climateValidation";
import { useUnits, useConversions } from "@/hooks/use-units.ts";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { Toaster, toast } from "sonner"
import { Save, SquarePen, Trash } from "lucide-react";
import { Label } from "@/components/ui/label";

// StationPar Component that displays custom or station parameter data
function StationPar() {
  const navigate = useNavigate();
  const urlLocation = useLocation();
  const { units, setUnits } = useUnits();
  const { convert } = useConversions();

  // Destructure location state from RockCliMe component
  const {
    databaseVersion,
    cligenVersion,
    stationCoords: coordinates = { latitude: 0, longitude: 0 },
    location,
    usePrismPar,
    stationDesc = "",
    par_id,
    elevation,
    selected_par,
    user_defined_par_mod,
  } = urlLocation.state || {};
  const [parData, setParData] = useState(null);
  const [isModified, setIsModified] = useState(false);
  const [description, setDescription] = useState(stationDesc);
  const [latInput, setLatInput] = useState(location.latitude || "");
  const [lngInput, setLngInput] = useState(location.longitude || "");

  // Initialize input values for precipitation, max temp, min temp, and number of wet days
  const [inputValues, setInputValues] = useState({
    ppts: [],
    tmaxs: [],
    tmins: [],
    nwds: [],
  });

  // PRISM values for comparison
  const [prismValues, setPrismValues] = useState({
    ppts: [],
    tmaxs: [],
    tmins: [],
    nwds: [],
  });

  // Location coordinates for PRISM
  // const [prismCoordinates, setPrismCoordinates] = useState({location.latitude, location.longitude});

  // Handle click event to save or modify parameter data
  const handleButtonClick = () => {
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
  const handleSave = async () => {
    const user_defined_par = {
      par_id: par_id,
      location: {
        latitude: latInput,
        longitude: lngInput,
      },
      usePrismPar: usePrismPar,
      user_defined_par_mod: {
        description: description,
        ppts: inputValues.ppts,
        tmaxs: inputValues.tmaxs,
        tmins: inputValues.tmins,
      },
    };

    // Post user-defined parameter data to server
    try {
      const response = await api.post("/api/rockclim/PUT/user_defined_par", user_defined_par, {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      });
      console.log("Server response:", response);
      setParData(prev => ({
        ...prev,
        description: description
      }));
      // Check if par_mod_key exists before navigation
      if (response?.data?.par_mod_key) {
        const target = `/rock-clime/par/${response.data.par_mod_key}`;
        console.log('navigating to', target);
        navigate(target,{
        state: {
          par_id: response.data.par_mod_key,
          selected_par: response.data.par_mod_key,
          usePrismPar: user_defined_par.use_prism,
          user_defined_par_mod: user_defined_par.user_defined_par_mod,
          location: user_defined_par.location,
        },
        });
      } else {
        console.error("No par_mod_key in response:", response.data);
        // Navigate back to main page with success state
        navigate("/rock-clime/", { 
          state: { 
            showSaveToast: true,
            savedParDescription: description 
          } 
        });
      }
      toast.success("Parameters saved to " + description);
    } catch (error) {
      console.error("Error posting data:", error);
    } finally {
      // Once saved, reset view
      setIsModified(false);
      setDescription("");
    }
  };

  // Function to handle cancel event and reset input values from parData
  const resetInputValues = () => {
    if (parData) {
      setInputValues({
        ppts: [...parData.ppts],
        tmaxs: [...parData.tmaxs],
        tmins: [...parData.tmins],
        nwds: parData.nwds ? [...parData.nwds] : [],
      });
    }
  };

  useEffect(() => {
    resetInputValues();
  }, [parData]);

  // Function to handle discard changes event
  const handleDiscard = () => {
    resetInputValues(); // Reset to original parData values
    setIsModified(false); // Exit edit mode
    setDescription(stationDesc); // Reset description to original
    toast.info("Changes discarded");
  };

  // Function to delete the user-defined parameter data
  const handleDelete = async () => {
    if (!parData) {
      console.error("No parData available");
      return;
    }
    const user_defined_par = {
      par_id: par_id,
      location: location,
      user_defined_par_mod: {
        description: parData.description,
        ppts: [...parData.ppts],
        tmaxs: [...parData.tmaxs],
        tmins: [...parData.tmins],
      },
    };
    console.log("Deleting user-defined parameter:", par_id);

    // Delete user-defined parameter data from server
    try {
      const response = await api.post("/api/rockclim/DEL/user_defined_par", user_defined_par, {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      });
      console.log("Delete response:", response.data);
      console.log("Server response:", response);
      navigate("/rock-clime/", { state: { showDeleteToast: true } });
    } catch (error) {
      console.error("Error deleting saved parameters:", error);
      toast.error("Failed to delete parameters");
    }
  };

  // TODO: get PRISM parameters to compare data within the page instead of navigating to a new page
  // Compare PRISM and non-PRISM data
  const getPrismData = async () => {
    console.log(urlLocation.state);
    const key = urlLocation.state?.selected_par || par_id;
    try {
      navigate(`/rock-clime/par/${key}`, {
        state: {
          par_id: par_id,
          selected_par: key,
          location: {
            latitude: latInput || location.latitude,
            longitude: lngInput || location.longitude,
          },
          usePrismPar: true,
          user_defined_par_mod: user_defined_par_mod,
        },
      });
    } catch (error) {
      console.error("Error fetching PRISM data:", error);
    }
  };

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
            location: location,
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
  }, [par_id, location, usePrismPar, user_defined_par_mod]);

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
    <>
      <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <div className="page-container">
          {/* Main Content */}
          <div
            className="flex flex-col justify-between md:items-start md:flex-row px-4 lg:px-6 gap-2"
            dataslot="page-header"
          >
            <div className="flex w-full flex-col items-start gap-3">
              <div className="flex w-full flex-row text-2xl font-semibold">
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
                    className={`h-fit w-full !text-xl font-medium`}
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
              {/* Saved location coordinates if custom parameter */}
              {location && (
                <div className="flex flex-col gap-2">
                  <h3 className="font-bold">{user_defined_par_mod ? "Coordinates" : "Station Coordinates"}</h3>
                  {!isModified ? (
                    // TODO: Add ChooseLocation Dialog to select location
                    <div className="flex flex-col sm:flex-row gap-4 text-gray-800 ">
                      <p className="text-sm md:text-base">
                        <strong>Latitude:</strong> {location.latitude}
                      </p>
                      <p className="text-sm md:text-base">
                        <strong>Longitude:</strong> {location.longitude}
                      </p>
                    </div>
                  ) : (
                    <div className="flex w-full flex-col sm:flex-row justify-center gap-4 mr-2">
                      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 grow w-full">
                        <Label htmlFor="latInput" className="block text-sm font-medium text-gray-700">
                          Latitude
                        </Label>
                        <Input
                          id="latInput"
                          type="text"
                          placeholder="Latitude"
                          defaultValue={location.latitude}
                          value={latInput}
                          onChange={(e) => setLatInput(e.target.value)}
                          className="rounded-sm border border-gray-300 px-2 py-1"
                        />
                      </div>
                      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 grow w-full">
                        <Label htmlFor="lngInput" className="block text-sm font-medium text-gray-700">
                          Longitude
                        </Label>
                        <Input
                          id="lngInput"
                          type="text"
                          placeholder="Longitude"
                          defaultValue={location.latitude}
                          value={lngInput}
                          onChange={(e) => setLngInput(e.target.value)}
                          className="rounded-sm border border-gray-300 px-2 py-1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>


            {/* Save or Modify Button */}
            <div className="flex flex-row xs:items-end xs:justify-end gap-2">
              <Button
                variant="outline"
                className={`${!isModified ? "hidden" : ""} w-fill grow-1 xs:w-fit`}
                onClick={handleDiscard}
              >
                Discard Changes
              </Button>
              <Button
                variant={isModified ? "default" : "outline"}
                onClick={handleButtonClick}
                className="transition-none w-fill grow-1 xs:w-fit"
              >
                {isModified ? (
                  <>
                    <Icon icon={Save} className="h-5 w-5" />
                    Save parameters
                  </>
                ) : (
                  <>
                    <Icon icon={SquarePen} className="h-5 w-5" />
                    Modify Parameters
                  </>
                )}
              </Button>
              {user_defined_par_mod && !isModified && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50">
                      <Icon icon={Trash} className="h-5 w-5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm delete</AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogDescription>
                      Are you sure you would like to delete these parameters?
                    </AlertDialogDescription>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction type="button" variant="destructive" onClick={handleDelete}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
          <div className="flex flex-col items-start px-4 lg:px-6">
            {/* Display station data in a table*/}
            <div className="mb-4 w-full">
              <div className="mb-3 flex w-full flex-col xs:flex-row xs:items-center gap-1 xs:justify-between">
                <div className="gap-2">
                  <h3 className="text-xl font-semibold">Station Data</h3>
                  {usePrismPar && (
                    <p className="text-sm">* Precip & Mean Temps. from PRISM</p>
                  )}
                </div>
                <div className="flex flex-row xs:items-end xs:justify-end gap-2">
                  {isModified && (
                    <div className="flex flex-row gap 2">
                      <Button
                        variant="outline"
                        className="w-fill grow-1 xs:w-fit rainbow text-white hover:text-white"
                        onClick={getPrismData}
                      >
                        Show PRISM Data
                      </Button>
                    </div>
                  )}
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
                        {units === "imperial" ? " (in)" : " (mm)"}
                      </th>
                      <th className="w-1/5 border border-gray-300 px-2 py-2 text-left">
                        Mean Max Temp.
                        {units === "imperial" ? " (°F)" : " (°C)"}
                      </th>
                      <th className="w-1/5 border border-gray-300 px-2 py-2 text-left">
                        Mean Min Temp.
                        {units === "imperial" ? " (°F)" : " (°C)"}
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
                          <span className="md:hidden">
                              {monthsAbbrev[index]}
                            </span>
                        </td>
                        {/*TODO: Color highlight to indicate values changed from original PAR data*/}
                        <td className="w-1/5 border border-gray-300 px-2 py-2">
                          {/* Allow user to change values if isModified state is true*/}
                          {isModified ? (
                            <Input
                              type="number"
                              defaultValue={units === "metric" ? (
                                `${ppt.toFixed(2)}`
                              ) : (
                                `${(convert.mmToInches(ppt)).toFixed(2)}`
                              )}
                              onBlur={(e) => {
                                // database uses metric units, so we need to convert values accordingly
                                const inputValue = parseFloat(e.target.value);
                                const valueInMm = units === "metric" ? inputValue : convert.inchesToMm(inputValue);
                                const valueInInches = units === "imperial" ? inputValue : convert.mmToInches(inputValue);
                                const result = units === "metric" ? validatePrecipitation(valueInMm, "metric") : validatePrecipitation(valueInInches, "imperial");

                                if (!result.isValid) {
                                  alert(result.message);
                                  e.target.value = units === "metric" ? ppt.toFixed(2) : (convert.mmToInches(ppt)).toFixed(2);
                                  return;
                                }

                                const eventForHandler = units === "metric"
                                  ? e
                                  : { target: { value: valueInMm } };

                                handleInputChange(eventForHandler, index, "ppts");
                              }}
                              className={``}
                            />
                          ) : (
                            <>
                              {units === "metric" ? (
                                `${ppt.toFixed(2)}`
                              ) : (
                                `${(convert.mmToInches(ppt)).toFixed(2)}`
                              )}
                            </>
                          )}
                        </td>
                        <td className="w-1/5 border border-gray-300 px-2 py-2">
                          {/* Allow user to change values if isModified state is true*/}
                          {isModified ? (
                            <Input
                              type="number"
                              defaultValue={units === "metric" ? (
                                `${parData.tmaxs[index].toFixed(2)}`
                              ) : (
                                `${(convert.celsiusToFahrenheit(parData.tmaxs[index])).toFixed(2)}`
                              )}
                              onBlur={(e) => {
                                // database uses metric units, so we need to convert values accordingly
                                const inputValue = parseFloat(e.target.value);
                                const valueInC = units === "metric" ? inputValue : convert.fahrenheitToCelsius(inputValue);
                                const valueInF = units === "imperial" ? inputValue : convert.celsiusToFahrenheit(inputValue);
                                const result = units === "metric" ? validateTemperature(valueInC, "metric") : validateTemperature(valueInF, "imperial");

                                if (!result.isValid) {
                                  alert(result.message);
                                  e.target.value = units === "metric" ? parData.tmaxs[index].toFixed(2) : (convert.celsiusToFahrenheit(parData.tmaxs[index])).toFixed(2);
                                  return;
                                }

                                const eventForHandler = units === "metric"
                                  ? e
                                  : { target: { value: valueInC } };

                                handleInputChange(eventForHandler, index, "tmaxs");
                              }}
                              className={``}
                            />
                          ) : (
                            <>
                              {units === "metric" ? (
                                `${parData.tmaxs[index].toFixed(2)}`
                              ) : (
                                `${(convert.celsiusToFahrenheit(parData.tmaxs[index])).toFixed(2)}`
                              )}
                            </>
                          )}
                        </td>
                        <td className="w-1/5 border border-gray-300 px-2 py-2">
                          {/* Allow user to change values if isModified state is true*/}
                          {isModified ? (
                            <Input
                              type="number"
                              defaultValue={units === "metric" ? (
                                `${parData.tmins[index].toFixed(2)}`
                              ) : (
                                `${(convert.celsiusToFahrenheit(parData.tmins[index])).toFixed(2)}`
                              )}
                              onBlur={(e) => {
                                // database uses metric units, so we need to convert values accordingly
                                const inputValue = parseFloat(e.target.value);
                                const valueInC = units === "metric" ? inputValue : convert.fahrenheitToCelsius(inputValue);
                                const valueInF = units === "imperial" ? inputValue : convert.celsiusToFahrenheit(inputValue);
                                const result = units === "metric" ? validateTemperature(valueInC, "metric") : validateTemperature(valueInF, "imperial");

                                if (!result.isValid) {
                                  alert(result.message);
                                  e.target.value = units === "metric" ? parData.tmins[index].toFixed(2) : (convert.celsiusToFahrenheit(parData.tmins[index])).toFixed(2);
                                  return;
                                }

                                const eventForHandler = units === "metric"
                                  ? e
                                  : { target: { value: valueInC } };

                                handleInputChange(eventForHandler, index, "tmins");
                              }}
                              className={``}
                            />
                          ) : (
                            <>
                              {units === "metric" ? (
                                `${parData.tmins[index].toFixed(2)}`
                              ) : (
                                `${(convert.celsiusToFahrenheit(parData.tmins[index])).toFixed(2)}`
                              )}
                            </>
                          )}
                        </td>
                        {/*TODO: Fill recalculated nwds based on new precip. values*/}
                        {parData.nwds && parData.nwds.length > 0 && (
                          <td className="w-1/5 border border-gray-300 px-2 py-2">
                            {/* Allow user to change values if isModified state is true*/}
                            {/*{isModified ? (*/}
                            {/*  <Input*/}
                            {/*    type="number"*/}
                            {/*    defaultValue={parData.nwds[index].toFixed(2)}*/}
                            {/*    onChange={(e) =>*/}
                            {/*      handleInputChange(e, index, "nwds")*/}
                            {/*    }*/}
                            {/*    className={``}*/}
                            {/*  />*/}
                            {/*) : (*/}
                            {/*  <>{parData.nwds[index].toFixed(2)}</>*/}
                            {/*)}*/}
                            <>{parData.nwds[index].toFixed(2)}</>
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
    <Toaster position="top-right" richColors/>
    </>
  );
}

export default StationPar;
