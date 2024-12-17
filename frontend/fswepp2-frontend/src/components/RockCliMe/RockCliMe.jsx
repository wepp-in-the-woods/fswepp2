import React, { useState, useEffect } from "react";
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

const LocationMarker = ({
  coordinates,
  setCoordinates,
  setLatInput,
  setLngInput,
}) => {
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
};

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
  const [selectedStation, setSelectedStation] = useState({});
  const [stationData, setStationData] = useState(null);
  const [years, setYears] = useState("");
  const navigate = useNavigate();


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
        console.log("API Response:", response.data); // Debugging line
        setClosestStations(response.data);
      } catch (error) {
        console.error("Error fetching closest stations:", error);
      }
    }
  };

  const handleStationClick = (station) => {
    console.log("Station clicked:", station);
    setSelectedStation(station);
  };

  const handleYearsChange = (e) => {
    setYears(e.target.value);
  };

   const handleViewStationPar = () => {
    if (!selectedStation || !selectedStation.id) {
      console.error("No station selected or par_id is missing");
      return;
    }

    navigate(`/rockclime/station_par/${selectedStation.id}`);
  };

  const handleDownloadStationPar = async () => {
    if (!selectedStation || !selectedStation.id) {
      console.error("No station selected or par_id is missing");
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:8080/api/rockclim/GET/station_par",
        {
          par_id: selectedStation.id,
        }
      );

      const data = response.data;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `station_par_${selectedStation.id}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading station par:", error);
    }
  };

  const handleViewClimateData = () => {
    // Implement view climate data functionality
    console.log("Viewing climate data for station:", selectedStation);
  };

  const handleDownloadClimateFile = () => {
    // Implement download climate file functionality
    console.log("Downloading climate file for station:", selectedStation);
  };

  return (
    <div className="ml-24 mr-24 mx-auto p-8 space-y-8">
      <div className="text-left">
        <h1 className="text-4xl font-semibold">RockClime</h1>
        <p className="text-xl text-gray-700">RMRS Climate Generator</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="col-span-1 space-y-4">
          <h2 className="text-2xl font-semibold mb-4">
            Select a place on the map or enter coordinates
          </h2>
          <MapContainer
            center={coordinates || [39.8283, -98.5795]}
            zoom={4}
            scrollWheelZoom={true}
            attributionControl={false}
            style={{ height: "400px", width: "738px", zIndex: 0 }}
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
          <div className="flex items-center space-x-2 mt-4">
            <input
              type="text"
              placeholder="Latitude"
              value={latInput}
              onChange={(e) => setLatInput(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded z-10"
            />
            <input
              type="text"
              placeholder="Longitude"
              value={lngInput}
              onChange={(e) => setLngInput(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded z-10"
            />
            <button
              onClick={handleCoordinateSubmit}
              className="px-4 py-2 bg-blue-500 text-white rounded whitespace-nowrap z-10"
            >
              Set Coordinates
            </button>
            <button
              onClick={handleGetClosestStations}
              className="px-4 py-2 bg-green-500 text-white rounded whitespace-nowrap z-10"
            >
              Get Closest Stations
            </button>
          </div>
        </div>
        <div className="col-span-1 mt-4 md:mt-0">
          <h2 className="text-2xl font-semibold">Closest Stations</h2>
          <p className="mb-2">Select a station to continue:</p>
          <div className="grid grid-cols-2 gap-4">
            {closestStations.slice(0, 6).map((station, index) => (
              <button
                key={index}
                className={`border p-2 rounded text-left ${
                  selectedStation === station ? "bg-blue-700 text-white" : ""
                }`}
                onClick={() => handleStationClick(station)}
              >
                <strong>{station.desc}</strong>
                <br />
                Latitude: {station.latitude}, Longitude: {station.longitude}
                <br />
                Distance: {station.distance_to_query_location.toFixed(2)} km
              </button>
            ))}
          </div>
          {selectedStation && (
            <div className="mt-4 p-4 border rounded">
              <h3 className="text-xl font-semibold">
                Station: {selectedStation.desc}
              </h3>
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700">
                  Number of years of climate:
                </label>
                <input
                  type="number"
                  value={years}
                  onChange={handleYearsChange}
                  className="mt-1 px-2 py-1 border border-gray-300 rounded"
                />
                <div className="flex items-center ml-4">
                  <input
                    type="checkbox"
                    id="usePrismMonthlies"
                    className="mr-2"
                  />
                  <label
                    htmlFor="usePrismMonthlies"
                    className="text-sm font-medium text-gray-700"
                  >
                    Use PRISM Data
                  </label>
                </div>
              </div>
              <div className="mt-4 flex space-x-2">
                <button
                  onClick={handleViewStationPar}
                  className="px-4 py-2 bg-blue-500 text-white rounded"
                >
                  View Station Par
                </button>
                <button
                  onClick={handleDownloadStationPar}
                  className="px-4 py-2 bg-green-500 text-white rounded"
                >
                  Download Station Par
                </button>
              </div>
              <div className="mt-4 flex space-x-2">
                <button
                  onClick={handleViewClimateData}
                  className="px-4 py-2 bg-blue-500 text-white rounded"
                >
                  Generate Climate Data
                </button>
                <button
                  onClick={handleDownloadClimateFile}
                  className="px-4 py-2 bg-green-500 text-white rounded"
                >
                  Download Climate File
                </button>
              </div>
              {/* Render station data */}
              {stationData && (
                <div className="mt-4 p-4 border rounded">
                  <h3 className="text-xl font-semibold">Station Data</h3>
                  <pre className="text-gray-700">
                    {JSON.stringify(stationData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RockCliMe;
