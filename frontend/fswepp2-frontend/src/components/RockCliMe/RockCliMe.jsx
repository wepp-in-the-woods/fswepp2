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
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Home
        </button>
      </div>
      <div className="flex-grow z-0">
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
          />
          <MapUpdater coordinates={coordinates} />
        </MapContainer>
      </div>
      <div className="flex flex-row mt-1 mb-1 justify-center w-full max-w-screen px-1">
        <input
          type="text"
          placeholder="Latitude"
          value={latInput}
          onChange={(e) => setLatInput(e.target.value)}
          className="flex-shrink px-2 py-1 border border-gray-300 rounded mr-2 w-1/3"
        />
        <input
          type="text"
          placeholder="Longitude"
          value={lngInput}
          onChange={(e) => setLngInput(e.target.value)}
          className="flex-shrink px-2 py-1 border border-gray-300 rounded mr-2 w-1/3"
        />
        <button
          onClick={handleCoordinateSubmit}
          className="flex-shrink px-2 py-2 bg-blue-500 text-white rounded w-1/3 text-sm"
        >
          Set Coordinates
        </button>
      </div>
      <div className="flex justify-center mt-2 w-full px-1 mb-2">
        <button
          onClick={handleGetClosestStations}
          className="px-4 py-2 bg-green-500 text-white rounded text-lg w-full"
        >
          Get Closest Stations
        </button>
      </div>
    </div>
  );
};

export default RockCliMe;
