import React, { useState, useEffect, memo } from "react";
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
import ClimateData from "./ClimateData";

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
  const [showSavedParameters, setShowSavedParameters] = useState(false);
  const [activeTab, setActiveTab] = useState("closestStations");
  const [showTab, setShowTab] = useState(false);

  const handleCoordinateSubmit = () => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    if (!isNaN(lat) && !isNaN(lng)) {
      setCoordinates([lat, lng]);
    }
  };

  const handleGetClosestStations = async () => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
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
    setSelectedStation(station);
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

    navigate(`/rockclime/station_par/${selectedStation.id}`, {
      state: { location, usePrism, stationDesc: selectedStation.desc },
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
    <div className="w-full space-y-8">
      {/* Mobile Navbar */}
      <div className="fixed top-0 left-0 right-0 bg-white shadow-md p-4 flex justify-between items-center h-16 lg:hidden">
        <div>
          <h1 className="text-xl font-semibold">RockClime</h1>
          <p className="text-sm text-gray-700">RMRS Climate Generator</p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Home
        </button>
      </div>
      <div className="hidden pt-20 text-center ">
        <h1 className="text-5xl font-semibold w-full">RockClime</h1>
        <p className="text-2xl text-gray-700 w-full">RMRS Climate Generator</p>
      </div>
      <div className="col-span-1 space-y-4">
        <h2 className="hidden lg:block lg:text-l lg:font-semibold">
          Select a place on the map or enter coordinates
        </h2>
        <div className="h-screen w-full mb-24 pt-8 z-0">
          {/* Adjust height to take up full screen minus navbar */}
          <MapContainer
            center={coordinates || [39.8283, -98.5795]}
            zoom={4}
            scrollWheelZoom={true}
            attributionControl={false}
            style={{ zIndex: 0 }}
            className="h-full w-full z-0"
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
            />
            <MapUpdater coordinates={coordinates} />
          </MapContainer>
            <div className="fixed bottom-0 left-0 right-0 bg-white shadow-md p-4 z-50">
              <div className="flex flex-col items-center space-y-2">
                <input
                  type="text"
                  placeholder="Latitude"
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded"
                />
                <input
                  type="text"
                  placeholder="Longitude"
                  value={lngInput}
                  onChange={(e) => setLngInput(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded"
                />
                <button
                  onClick={handleCoordinateSubmit}
                  className="px-4 py-2 bg-blue-500 text-white rounded"
                >
                  Set Coordinates
                </button>
                <button
                  onClick={handleGetClosestStations}
                  className="px-4 py-2 bg-green-500 text-white rounded"
                >
                  Get Closest Stations
                </button>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default RockCliMe;
