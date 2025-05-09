import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

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
    axios
      .post(
        "http://localhost:8080/api/rockclim/PUT/user_defined_par",
        user_defined_par,
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      )
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
        const response = await axios.post(
          "http://localhost:8080/api/rockclim/GET/station_par_monthlies",
          {
            database: databaseVersion,
            cligen_version: cligenVersion,
            par_id: par_id,
            location: loc,
            use_prism: usePrismPar,
          }
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
    <div className="flex flex-col h-screen">
      {/* Mobile Navbar */}
      <div
        className="top-0 left-0 right-0 shadow-md p-4 flex justify-between items-center h-16 lg:hidden"
        style={{ zIndex: 10 }}
      >
        {/* Headers*/}
        <div>
          <h1 className="text-xl font-semibold">RockClime</h1>
          <p className="text-sm text-gray-700">RMRS Climate Generator</p>
        </div>

        {/* Home Button */}
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

            {/* Parameter description with modifiable state */}
            {isModified ? (
              <input
                type="text"
                defaultValue={
                  (user_defined_par_mod
                    ? user_defined_par_mod.description : stationDesc)
                }
                onChange={(e) => handleTitleChange(e, "description")}
                className={`w-full border-none rounded ${
                  isModified
                    ? "outline outline-1 outline-offset-1 outline-gray-300 outline-rounded"
                    : ""
                }`}
              />
            ) : (
              <>
                {user_defined_par_mod ? user_defined_par_mod.description : stationDesc}
              </>
            )}
          </div>

          {/* Station ID or Parameter ID*/}
          <div className="text-md mb-4">
            {user_defined_par_mod
              ? `Par. ID: ${selected_par}` : `Par. ID: ${par_id.slice(0, -4)}`}
          </div>

          {/* Station Coordinates if not a custom parameter */}
          {!user_defined_par_mod && (
            <div className="text-xl">
              <h3 className="text-[17px] font-semibold -mt-2">
                Station Coordinates
              </h3>
              {!user_defined_par_mod && (
                <>
                  <p className="text-[14px] -mt-1">
                    Latitude: {coordinates.latitude}
                  </p>
                  <p className="text-[14px] -mt-2">
                    Longitude: {coordinates.longitude}
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Display station data in a table*/}
        <div className="mt-4 w-full mb-4">
          <div className="mb-2 flex flex-row">
            <div className="">
              <h3 className="text-2xl font-semibold">Station Data:</h3>
              {usePrismPar && (
                <p className="text-[12px]">*Precip & Mean Temps. from PRISM</p>
              )}
            </div>

            {/* Save or Modify Button */}
            <div className="flex-grow flex items-end justify-end">
              <button
                onClick={handleClick}
                className={`px-2 py-2 rounded whitespace-nowrap w-32 ${
                  isModified
                    ? "border border-[#16a34a] bg-[#16a34a] text-white"
                    : "border border-[#16a34a] text-black bg-white"
                }`}
              >
                {isModified ? "Save Param." : "Modify Param."}
              </button>
            </div>
          </div>

          {/* Table of station data */}
          {parData && (
            <div>
              <table className="table-auto border-collapse border border-gray-400 w-full max-[374px]:text-xs">
                <thead>
                  <tr>
                    <th className="border border-gray-300 py-2 px-2 text-left w-1/5">
                      Month
                    </th>
                    <th className="border border-gray-300 py-2 px-2 text-left w-1/5">
                      Mean Precip.
                    </th>
                    <th className="border border-gray-300 px-2 py-2 text-left w-1/5">
                      Mean Max Temp.
                    </th>
                    <th className="border border-gray-300 px-2 py-2 text-left w-1/5">
                      Mean Min Temp.
                    </th>
                    {parData.nwds && parData.nwds.length > 0 && (
                      <th className="border border-gray-300 px-2 py-2 text-left w-1/5">
                        # of Wet Days
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>

                  {/* Map par data to table */}
                  {parData.ppts.map((ppt, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 px-2 py-2 w-1/5">
                        <span className="hidden md:inline">
                          {months[index]}
                        </span>
                        <span className="md:hidden">{monthsAbbrev[index]}</span>
                      </td>
                      <td className="border border-gray-300 px-2 py-2 w-1/5">

                        {/* Allow user to change values if isModified state is true*/}
                        <input
                          type="text"
                          defaultValue={ppt.toFixed(2)}
                          onChange={(e) => handleInputChange(e, index, "ppts")}
                          className={`w-full border-none rounded ${
                            isModified
                              ? "outline outline-1 outline-offset-1 outline-gray-300 outline-rounded"
                              : ""
                          }`}
                          readOnly={!isModified}
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-2 w-1/5">
                        
                        {/* Allow user to change values if isModified state is true*/}
                        <input
                          type="text"
                          defaultValue={parData.tmaxs[index].toFixed(2)}
                          onChange={(e) => handleInputChange(e, index, "tmaxs")}
                          className={`w-full border-none rounded ${
                            isModified
                              ? "outline outline-1 outline-offset-1 outline-gray-300 outline-rounded"
                              : ""
                          }`}
                          readOnly={!isModified}
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-2 w-1/5">

                        {/* Allow user to change values if isModified state is true*/}
                        <input
                          type="text"
                          defaultValue={parData.tmins[index].toFixed(2)}
                          onChange={(e) => handleInputChange(e, index, "tmins")}
                          className={`w-full border-none rounded ${
                            isModified
                              ? "outline outline-1 outline-offset-1 outline-gray-300 outline-rounded"
                              : ""
                          }`}
                          readOnly={!isModified}
                        />
                      </td>
                      {parData.nwds && parData.nwds.length > 0 && (
                        <td className="border border-gray-300 px-2 py-2 w-1/5">

                          {/* Allow user to change values if isModified state is true*/}
                          <input
                            type="text"
                            defaultValue={parData.nwds[index].toFixed(2)}
                            onChange={(e) =>
                              handleInputChange(e, index, "nwds")
                            }
                            className={`w-full border-none rounded ${
                              isModified
                                ? "outline outline-1 outline-offset-1 outline-gray-300 outline-rounded"
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
  );
};

export default StationPar;
