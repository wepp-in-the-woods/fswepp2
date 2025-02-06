import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import ChooseLocation from "./ChooseLocation";

const RockCliMe = () => {
  const [coordinates, setCoordinates] = useState(null);
  const [latInput, setLatInput] = useState("");
  const [lngInput, setLngInput] = useState("");
  const [closestStations, setClosestStations] = useState([]);
  const [savedParameters, setSavedParameters] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [years, setYears] = useState("");
  const [usePrismPar, setUsePrismPar] = useState(false);
  const [usePrismClim, setUsePrismClim] = useState(false);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("closestStations");
  const [showLocationDiv, setShowLocationDiv] = useState(false);
  const [prevCoordinates, setPrevCoordinates] = useState([null, null]);
  const [parametersFetched, setParametersFetched] = useState(false);
  const [selectedPar, setSelectedPar] = useState(null);
  const [cligenVersion] = useState("5.3.2");
  const [databaseVersion] = useState("legacy");

  useEffect(() => {
    if (
      coordinates &&
      !showLocationDiv &&
      activeTab === "closestStations" &&
      (coordinates[0] !== prevCoordinates[0] ||
        coordinates[1] !== prevCoordinates[1])
    ) {
      handleGetClosestStations();
      setPrevCoordinates(coordinates);
    }
  }, [coordinates, showLocationDiv, activeTab]);

  useEffect(() => {
    if (
      activeTab === "savedParameters" &&
      !parametersFetched &&
      parametersFetched !== null
    ) {
      handleGetSavedParameters();
    }
  }, [savedParameters, activeTab]);

  const handleCoordinateSubmit = () => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    if (!isNaN(lat) && !isNaN(lng)) {
      if (coordinates[0] !== lat || coordinates[1] !== lng) {
        setCoordinates([lat, lng]);
      }
    } else {
      console.log("Invalid coordinates input.");
    }
  };

  const handleGetSavedParameters = async () => {
    try {
      const response = await axios.get(
        "http://localhost:8080/api/rockclim/GET/user_defined_pars",
        { withCredentials: true }
      );
      setSavedParameters(response.data);
      setParametersFetched(true);
    } catch (error) {
      console.error("Error fetching saved parameters:", error);
      setParametersFetched(true);
    }
  };

  const handleGetClosestStations = async () => {
    const [lat, lng] = coordinates;
    if (!isNaN(lat) && !isNaN(lng)) {
      console.log("database: " + databaseVersion);
      try {
        const response = await axios.post(
          "http://localhost:8080/api/rockclim/GET/closest_stations",
          {
            database: databaseVersion === "None" ? null : databaseVersion,
            cligen_version: cligenVersion,
            location: {
              longitude: lng,
              latitude: lat,
            },
          }
        );
        setClosestStations(response.data);
      } catch (error) {
        console.error("Error fetching closest stations:", error);
      }
    }
  };

  const handleStationClick = (station) => {
    setSelectedStation(selectedStation === station ? null : station);
  };

  const handleSavedParClick = (par) => {
    setSelectedPar(selectedPar === par ? null : par);
  };

  const handleViewStationPar = () => {
    if (!selectedStation || !selectedStation.id) {
      console.error("No station selected or par_id is missing");
      return;
    }

    const location = usePrismPar
      ? { longitude: parseFloat(lngInput), latitude: parseFloat(latInput) }
      : {
          longitude: selectedStation.longitude,
          latitude: selectedStation.latitude,
        };

    const stationCoords = {
      longitude: selectedStation.longitude,
      latitude: selectedStation.latitude,
    };
    navigate(`/rockclime/par/${selectedStation.id}`, {
      state: {
        databaseVersion,
        cligenVersion,
        stationCoords,
        location,
        usePrismPar,
        stationDesc: selectedStation.desc,
        par_id: selectedStation.par,
      },
    });
  };

  const handleViewStationClimateData = async () => {
    if (!selectedStation || !selectedStation.id) {
      console.error("No station selected or par_id is missing");
      return;
    }

    if (!years) {
      console.error("Number of years is missing");
      return;
    }

    const location = usePrismClim
      ? { longitude: parseFloat(lngInput), latitude: parseFloat(latInput) }
      : {
          longitude: selectedStation.longitude,
          latitude: selectedStation.latitude,
        };

    const stationCoords = {
      longitude: selectedStation.longitude,
      latitude: selectedStation.latitude,
    };

    navigate(`/rockclime/climate/${selectedStation.id}`, {
      state: {
        stationCoords,
        location,
        years,
        usePrismClim,
        par_id: selectedStation.id,
        stationDesc: selectedStation.desc,
      },
    });
  };

  const handleViewSavedPar = () => {
    if (!selectedPar) {
      console.error("No saved parameter selected");
      return;
    }

    const customPar = savedParameters[selectedPar];

    console.log(customPar.par_id);

    navigate(`/rockclime/par/${selectedPar}`, {
      state: {
        par_id: customPar.par_id,
        selected_par: selectedPar,
        usePrismPar: customPar.use_prism,
        user_defined_par_mod: customPar.user_defined_par_mod,
      },
    });
  };

  const handleViewSavedParClimateData = async () => {
    if (!years) {
      console.error("Number of years is missing");
      return;
    }

    const customPar = savedParameters[selectedPar];

    navigate(`/rockclime/climate/${selectedPar}`, {
      state: {
        selectedPar,
        years,
        customPar,
      },
    });
  };

  return (
    // Main div
    <div className="flex flex-col h-screen">
      {/* Mobile Navbar */}
      <div
        className="top-0 left-0 right-0 shadow-md p-4 flex justify-between items-center h-16 lg:hidden z-0"
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
      <div className="flex flex-row w-full pt-2 pb-2 justify-between items-center mt-2 mb-2 pl-2 pr-2">
        <div className="text-sm md:text-base">
          Current Location:{" "}
          {latInput && lngInput
            ? `${parseFloat(latInput).toFixed(3)}, ${parseFloat(
                lngInput
              ).toFixed(3)}`
            : "None"}
        </div>
        <button
          className="underline text-sm md:text-base"
          onClick={() => setShowLocationDiv(true)}
        >
          Choose Location
        </button>
      </div>
      {showLocationDiv && (
        <ChooseLocation
          coordinates={coordinates}
          setCoordinates={setCoordinates}
          setLatInput={setLatInput}
          setLngInput={setLngInput}
          setShowLocationDiv={setShowLocationDiv}
        />
      )}
      {/* Tabs */}
      <div className="flex w-full border-t border-gray-300">
        <div className="flex flex-row w-1/2 border-r-2">
          <button
            onClick={() => {
              setActiveTab("closestStations");
              setParametersFetched(false);
            }}
            className={`px-4 py-2 w-full ${
              activeTab === "closestStations"
                ? "border-b border-green-700 bg-gray-100"
                : "bg-white border-b border-white pb-2"
            }`}
          >
            Closest Stations
          </button>
        </div>
        <div className="flex flex-row w-1/2">
          <button
            onClick={() => {
              setActiveTab("savedParameters");
              setSelectedStation(null);
            }}
            className={`px-4 py-2 w-full ${
              activeTab === "savedParameters"
                ? "border-b border-green-700 bg-gray-100"
                : "bg-white border-b border-white pb-2"
            }`}
          >
            Saved Parameters
          </button>
        </div>
      </div>
      <div className="flex-grow overflow-auto p-4">
        {activeTab === "closestStations" && (
          <div className="grid grid-cols-1 gap-4">
            {closestStations.slice(0, 6).map((station, index) => (
              <div key={index}>
                <button
                  className={`border p-2 rounded text-left w-full ${
                    selectedStation === station ? "bg-[#015838] text-white" : ""
                  }`}
                  onClick={() => {
                    handleStationClick(station);
                  }}
                >
                  <strong>{station.desc.slice(0, -2)}</strong> <br />
                  Latitude: {station.latitude}, Longitude: {station.longitude}
                  <br />
                  Distance: {station.distance_to_query_location.toFixed(2)} km
                </button>
                {selectedStation === station && (
                  <div className="mt-2 p-2 border rounded bg-gray-100">
                    <div className="mb-2">
                      {databaseVersion !== "au" && (
                        <label className="inline-flex items-center mb-2">
                          <input
                            type="checkbox"
                            className="form-checkbox"
                            checked={usePrismPar}
                            onChange={(e) => setUsePrismPar(e.target.checked)}
                          />
                          <span className="ml-2">Use Prism monthlies</span>
                        </label>
                      )}
                      <button
                        className="block w-full text-left p-2 mb-2 bg-[#16a34a] text-white rounded"
                        onClick={handleViewStationPar}
                      >
                        View Station Parameters
                      </button>
                    </div>
                    <div className="mb-2 border-t-2 border-gray-300">
                      <label className="mt-2 block text-sm font-medium text-gray-700">
                        Number of Years
                      </label>
                      <input
                        type="number"
                        className="mt-1 block w-full p-2 border border-gray-300 rounded"
                        value={years}
                        onChange={(e) => setYears(e.target.value)}
                      />
                      {databaseVersion !== "au" && (
                        <label className="mt-2 inline-flex items-center">
                          <input
                            type="checkbox"
                            className="form-checkbox"
                            checked={usePrismClim}
                            onChange={(e) => setUsePrismClim(e.target.checked)}
                          />
                          <span className="ml-2">Use Prism monthlies</span>
                        </label>
                      )}
                    </div>
                    <button
                      className="block w-full text-left p-2 bg-[#16a34a] text-white rounded"
                      onClick={handleViewStationClimateData}
                    >
                      Generate Climate Data
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {activeTab === "savedParameters" && (
          <div className="grid grid-cols-1 gap-4">
            {Object.keys(savedParameters).map((par, index) => (
              <div key={index}>
                <button
                  className={`border p-2 rounded text-left w-full ${
                    selectedPar === par ? "bg-[#015838] text-white" : ""
                  }`}
                  onClick={() => handleSavedParClick(par)}
                >
                  <strong>
                    {savedParameters[par].user_defined_par_mod.description}
                  </strong>
                </button>
                {selectedPar === par && (
                  <div className="mt-2 p-2 border rounded bg-gray-100">
                    <div className="mb-2">
                      <button
                        className="block w-full text-left p-2 mb-2 bg-[#16a34a] text-white rounded"
                        onClick={handleViewSavedPar}
                      >
                        View Saved Parameters
                      </button>
                    </div>
                    <div className="mb-2 border-t-2 border-gray-300">
                      <label className="mt-2 block text-sm font-medium text-gray-700">
                        Number of Years
                      </label>
                      <input
                        type="number"
                        className="mt-1 block w-full p-2 border border-gray-300 rounded"
                        value={years}
                        onChange={(e) => setYears(e.target.value)}
                      />
                    </div>
                    <button
                      className="block w-full text-left p-2 bg-[#16a34a] text-white rounded"
                      onClick={handleViewSavedParClimateData}
                    >
                      Generate Climate Data
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RockCliMe;