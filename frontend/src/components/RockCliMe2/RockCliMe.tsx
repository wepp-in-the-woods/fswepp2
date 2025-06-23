import { useState, useEffect, lazy } from "react";
// import axios from "axios";
import { api } from "@/api.ts";
import { useNavigate } from "react-router-dom";

// Types/interfaces
interface Station {
  id: string;
  desc: string;
  latitude: number;
  longitude: number;
  distance_to_query_location: number;
  par: string;
}

interface CustomParameter {
  par_id: string;
  use_prism: boolean;
  user_defined_par_mod: {
    description: string;
    [key: string]: any;
  };
}

interface SavedParameters {
  [key: string]: CustomParameter;
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

const ChooseLocation = lazy(() => import("./ChooseLocation.tsx"));

const RockCliMe = () => {
  // State variables. This is the main reason refactoring may be necessary.
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [latInput, setLatInput] = useState<string>("");
  const [lngInput, setLngInput] = useState<string>("");
  const [closestStations, setClosestStations] = useState<string[]>([]);
  const [savedParameters, setSavedParameters] = useState([]);
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [years, setYears] = useState<String>("");
  const [usePrismPar, setUsePrismPar] = useState<boolean>(false);
  const [usePrismClim, setUsePrismClim] = useState<boolean>(false);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>("closestStations");
  const [showLocationDiv, setShowLocationDiv] = useState<boolean>(false);
  const [prevCoordinates, setPrevCoordinates] = useState<[number | null, number | null]>([null, null]);
  const [parametersFetched, setParametersFetched] = useState<boolean>(false);
  const [selectedPar, setSelectedPar] = useState<string | null>(null);
  const [cligenVersion] = useState<string>("5.3.2");
  const [databaseVersion] = useState<string>("legacy");

  // Fetch and display closest stations
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

  // Fetch and display saved parameters
  useEffect(() => {
    if (
      activeTab === "savedParameters" &&
      !parametersFetched &&
      parametersFetched !== null
    ) {
      handleGetSavedParameters();
    }
  }, [savedParameters, activeTab]);

  // Fetch saved parameters from the database based on user cookies. Cookies stay for one week.
  const handleGetSavedParameters = async () => {
    try {
      const response = await api.get("/api/rockclim/GET/user_defined_pars", {
        withCredentials: true,
      });
      setSavedParameters(response.data);
      setParametersFetched(true);
    } catch (error) {
      console.error("Error fetching saved parameters:", error);
      setParametersFetched(true);
    }
  };

  // Fetch closest stations from the database based on user inputted/selected coordinates.
  const handleGetClosestStations = async () => {
    if (!coordinates) return;
    const [lat, lng] = coordinates;
    if (!isNaN(lat) && !isNaN(lng)) {
      console.log("database: " + databaseVersion);
      try {
        const response = await api.post("/api/rockclim/GET/closest_stations", {
          database: databaseVersion === "None" ? null : databaseVersion,
          cligen_version: cligenVersion,
          location: {
            longitude: lng,
            latitude: lat,
          },
        });
        setClosestStations(response.data);
      } catch (error) {
        console.error("Error fetching closest stations:", error);
      }
    }
  };

  // Sets the selected station to the station that was clicked on.
  const handleStationClick = (station: string) => {
    setSelectedStation(selectedStation === station ? null : station);
  };

  // Sets the selected parameter to the parameter that was clicked on.
  const handleSavedParClick = (par: string) => {
    setSelectedPar(selectedPar === par ? null : par);
  };

  // Navigates to /rockclime/par/:par_id based on user's selected station.
  const handleViewStationPar = () => {
    if (!selectedStation || !selectedStation.id) {
      console.error("No station selected or par_id is missing");
      return;
    }

    // Location is either inputted coordinates if the user wants to use PRISM
    // or just the station's coordinates.
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

  // Navigates to /rockclime/climate/:par_id based on user's selected station.
  const handleViewStationClimateData = async () => {
    if (!selectedStation || !selectedStation.id) {
      console.error("No station selected or par_id is missing");
      return;
    }

    if (!years) {
      console.error("Number of years is missing");
      return;
    }

    // Location is either inputted coordinates if the user wants to use PRISM
    // or just the station's coordinates.
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

  // Navigates to /rockclime/par/:par_id based on user's selected saved parameter.
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

  // Navigates to /rockclime/climate/:par_id based on user's selected saved parameter.
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
    <div className="flex h-screen flex-col">
      {/* Mobile Navbar */}
      <div className="top-0 right-0 left-0 z-0 flex h-16 items-center justify-between p-4 shadow-md lg:hidden">
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
      {/* Current Location Div */}
      <div className="mt-2 mb-2 flex w-full flex-row items-center justify-between pt-2 pr-2 pb-2 pl-2">
        <div className="text-sm md:text-base">
          Current Location:{" "}
          {latInput && lngInput
            ? `${parseFloat(latInput).toFixed(3)}, ${parseFloat(
                lngInput,
              ).toFixed(3)}`
            : "None"}
        </div>
        <button
          className="text-sm underline md:text-base"
          onClick={() => setShowLocationDiv(true)}
        >
          Choose Location
        </button>
      </div>
      {/* Conditionally render ChooseLocation */}
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
        <div className="flex w-1/2 flex-row border-r-2">
          <button
            onClick={() => {
              setActiveTab("closestStations");
              setParametersFetched(false);
            }}
            className={`w-full px-4 py-2 ${
              activeTab === "closestStations"
                ? "border-b border-green-700 bg-gray-100"
                : "border-b border-white bg-white pb-2"
            }`}
          >
            Closest Stations
          </button>
        </div>
        <div className="flex w-1/2 flex-row">
          <button
            onClick={() => {
              setActiveTab("savedParameters");
              setSelectedStation(null);
            }}
            className={`w-full px-4 py-2 ${
              activeTab === "savedParameters"
                ? "border-b border-green-700 bg-gray-100"
                : "border-b border-white bg-white pb-2"
            }`}
          >
            Saved Parameters
          </button>
        </div>
      </div>
      <div className="grow overflow-auto p-4">
        {activeTab === "closestStations" && (
          <div className="grid grid-cols-1 gap-4">
            {/* Gets the 6 closest stations. When clicked, 
            the selected station is set and additional options appear. */}

            {closestStations.slice(0, 6).map((station, index) => (
              <div key={index}>
                <button
                  className={`w-full rounded-sm border p-2 text-left ${
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
                  <div className="mt-2 rounded-sm border bg-gray-100 p-2">
                    <div className="mb-2">
                      {/* "au" e.g. the Australia database does not have PRISM, so we grey out the option. */}
                      {databaseVersion !== "au" && (
                        <label className="mb-2 inline-flex items-center">
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
                        className="mb-2 block w-full rounded-sm bg-[#16a34a] p-2 text-left text-white"
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
                        className="mt-1 block w-full rounded-sm border border-gray-300 p-2"
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
                      className="block w-full rounded-sm bg-[#16a34a] p-2 text-left text-white"
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
        {/* Display the fetched saved parameters. */}
        {activeTab === "savedParameters" && (
          <div className="grid grid-cols-1 gap-4">
            {Object.keys(savedParameters).map((par, index) => (
              <div key={index}>
                <button
                  className={`w-full rounded-sm border p-2 text-left ${
                    selectedPar === par ? "bg-[#015838] text-white" : ""
                  }`}
                  onClick={() => handleSavedParClick(par)}
                >
                  <strong>
                    {savedParameters[par].user_defined_par_mod.description}
                  </strong>
                </button>
                {selectedPar === par && (
                  <div className="mt-2 rounded-sm border bg-gray-100 p-2">
                    <div className="mb-2">
                      <button
                        className="mb-2 block w-full rounded-sm bg-[#16a34a] p-2 text-left text-white"
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
                        className="mt-1 block w-full rounded-sm border border-gray-300 p-2"
                        value={years}
                        onChange={(e) => setYears(e.target.value)}
                      />
                    </div>
                    <button
                      className="block w-full rounded-sm bg-[#16a34a] p-2 text-left text-white"
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
