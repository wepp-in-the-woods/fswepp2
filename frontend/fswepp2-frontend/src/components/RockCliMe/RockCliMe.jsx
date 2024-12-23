import React, { useState, useEffect, memo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css";
import "leaflet-defaulticon-compatibility";
import axios from "axios";
import "./custom-scrollbar.css";
import { useNavigate } from "react-router-dom";

const LocationMarker = memo(
  ({ coordinates, setCoordinates, setLatInput, setLngInput }) => {
    const [position, setPosition] = useState(null);
    const map = useMapEvents({
      click(e) {
        setPosition(e.latlng);
        setCoordinates([e.latlng.lat, e.latlng.lng]);
        setLatInput(e.latlng.lat.toFixed(6));
        setLngInput(e.latlng.lng.toFixed(6));
      },
    });

    useEffect(() => {
      if (coordinates) {
        setPosition({ lat: coordinates[0], lng: coordinates[1] });
      }
    }, [coordinates]);

    useEffect(() => {
      if (position) {
        setLatInput(position.lat.toFixed(6));
        setLngInput(position.lng.toFixed(6));
      }
    }, [position, setLatInput, setLngInput]);

    return position === null ? null : <Marker position={position}></Marker>;
  }
);

const MapUpdater = ({ coordinates }) => {
  const map = useMap();
  useEffect(() => {
    if (coordinates) {
      map.setView(coordinates, map.getZoom());
    }
  }, [coordinates, map]);
  return null;
};

const RockCliMe = () => {
  const [coordinates, setCoordinates] = useState(null);
  const [latInput, setLatInput] = useState("");
  const [lngInput, setLngInput] = useState("");
  const [closestStations, setClosestStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [years, setYears] = useState("");
  const [usePrism, setUsePrism] = useState(false);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("closestStations");
  const [showLocationDiv, setShowLocationDiv] = useState(false);
  const [prevCoordinates, setPrevCoordinates] = useState([null, null]);

  useEffect(() => {
    if (
      coordinates &&
      !showLocationDiv &&
      activeTab === "closestStations" &&
      (coordinates[0] !== prevCoordinates[0] || coordinates[1] !== prevCoordinates[1])
    ) {
      handleGetClosestStations();
      setPrevCoordinates(coordinates);
    }
  }, [coordinates, showLocationDiv, activeTab]);

  const handleCoordinateSubmit = () => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    if (!isNaN(lat) && !isNaN(lng)) {
      if (coordinates[0] !== lat || coordinates[1] !== lng) {
        console.log("Updating coordinates:", [lat, lng]);
        setCoordinates([lat, lng]);
      } else {
        console.log("Coordinates are the same, no update needed.");
      }
    } else {
      console.log("Invalid coordinates input.");
    }
  };

  const handleGetClosestStations = async () => {
    const [lat, lng] = coordinates;
    if (!isNaN(lat) && !isNaN(lng)) {
      try {
        const response = await axios.post(
          "http://localhost:8080/api/rockclim/GET/closest_stations",
          {
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

  const handleYearsChange = (e) => {
    setYears(e.target.value);
    console.log("Years changed:", e.target.value);
  };

  const handleViewStationPar = () => {
    if (!selectedStation || !selectedStation.id) {
      console.error("No station selected or par_id is missing");
      return;
    }

    const location = usePrism
      ? { longitude: parseFloat(lngInput), latitude: parseFloat(latInput) }
      : {
          longitude: selectedStation.longitude,
          latitude: selectedStation.latitude,
        };

    const stationCoords = {
      longitude: selectedStation.longitude,
      latitude: selectedStation.latitude,
    };

    navigate(`/rockclime/station_par/${selectedStation.id}`, {
      state: {
        stationCoords,
        location,
        usePrism,
        stationDesc: selectedStation.desc,
        par_id: selectedStation.par,
      },
    });
  };

  const handleViewClimateData = async () => {
    if (!selectedStation || !selectedStation.id) {
      console.error("No station selected or par_id is missing");
      return;
    }

    if (!years) {
      console.error("Number of years is missing");
      return;
    }

    navigate(`/rockclime/climate_data/${selectedStation.id}`, {
      state: {
        years,
        par_id: selectedStation.id,
        stationDesc: selectedStation,
      },
    });
  };

  return (
    // Main div
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
        <div className="fixed inset-0 flex items-center justify-center z-0">
          <div className="bg-white pl-4 pr-4 pb-4 rounded shadow-lg w-full ml-2 mr-2 border-2 h-2.3">
            <button
              className="mb-1 text-gray-500 flex flex-row w-full items-end text-xl rounded h-[30px] w-[30px]"
              onClick={() => setShowLocationDiv(false)}
            >
              X
            </button>
            <div className="flex-grow z-0 h-60">
              <MapContainer
                center={coordinates || [39.8283, -98.5795]}
                zoom={4}
                scrollWheelZoom={true}
                attributionControl={false}
                style={{ zIndex: 0 }}
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationMarker
                  coordinates={coordinates}
                  setCoordinates={setCoordinates}
                  setLatInput={setLatInput}
                  setLngInput={setLngInput}
                  style={{ color: "green" }}
                />
                <MapUpdater coordinates={coordinates} />
              </MapContainer>
            </div>
            <div className="mt-4">
              <div className="flex flex-row justify-center w-full">
                <input
                  type="text"
                  placeholder="Latitude"
                  value={parseFloat(latInput).toFixed(5)}
                  onChange={(e) =>
                    setLatInput(parseFloat(e.target.value).toFixed(5))
                  }
                  className="flex-shrink px-2 py-1 border border-gray-300 rounded mr-2 w-1/3"
                />
                <input
                  type="text"
                  placeholder="Longitude"
                  value={parseFloat(lngInput).toFixed(5)}
                  onChange={(e) =>
                    setLngInput(parseFloat(e.target.value).toFixed(5))
                  }
                  className="flex-shrink px-2 py-1 border border-gray-300 rounded mr-2 w-1/3"
                />
                <button
                  onClick={() => {
                    handleCoordinateSubmit();
                    setShowLocationDiv(false);
                  }}
                  className="flex-shrink px-2 py-2 bg-[#16a34a] text-white rounded w-1/3 text-sm"
                >
                  Set Coords.
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Tabs */}
      <div className="flex w-full border-t border-gray-300">
        <div className="flex flex-row w-1/2 border-r-2">
          <button
            onClick={() => {
              setActiveTab("closestStations");
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
                    selectedStation === station ? "bg-[#16a34a] text-white" : ""
                  }`}
                  onClick={() => handleStationClick(station)}
                >
                  <strong>{station.desc.slice(0, -2)}</strong> <br />
                  Latitude: {station.latitude}, Longitude: {station.longitude}
                  <br />
                  Distance: {station.distance_to_query_location.toFixed(2)} km
                </button>
                {selectedStation === station && (
                  <div className="mt-2 p-2 border rounded bg-gray-100">
                    <div className="mb-2">
                      <label className="inline-flex items-center mb-2">
                        <input
                          type="checkbox"
                          className="form-checkbox"
                          checked={usePrism}
                          onChange={(e) => setUsePrism(e.target.checked)}
                        />
                        <span className="ml-2">Use Prism monthlies</span>
                      </label>
                      <button
                        className="block w-full text-left p-2 mb-2 bg-blue-500 text-white rounded"
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
                    </div>
                    <button
                      className="block w-full text-left p-2 bg-green-500 text-white rounded"
                      onClick={handleViewClimateData}
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
          <div>
            {/* Display saved parameters data here */}
            <p>Saved Parameters content goes here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RockCliMe;
