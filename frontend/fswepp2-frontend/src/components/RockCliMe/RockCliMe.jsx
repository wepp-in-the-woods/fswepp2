import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css'; // Re-uses images from ~leaflet package
import 'leaflet-defaulticon-compatibility';
import axios from 'axios';
import "./custom-scrollbar.css";

const LocationMarker = ({ coordinates, setCoordinates, setLatInput, setLngInput }) => {
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

  return position === null ? null : (
    <Marker position={position}>
    </Marker>
  );
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
        const response = await axios.post('http://localhost:8080/api/rockclim/GET/closest_stations', {
          location: {
            longitude: lng,
            latitude: lat
          }
        });
        console.log("API Response:", response.data); // Debugging line
        setClosestStations(response.data);
      } catch (error) {
        console.error("Error fetching closest stations:", error);
      }
    }
  };

  return (
    <div className="ml-24 mr-24 mx-auto p-8 space-y-8">
      <div className="text-left">
        <h1 className="text-4xl font-semibold">Rock: Clime</h1>
        <p className="text-xl text-gray-700">
          Rocky Mountain Research Station Climate Generator
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="col-span-2">
          <MapContainer center={coordinates || [39.8283, -98.5795]} zoom={4} scrollWheelZoom={true} attributionControl={false} style={{ height: "400px", width: "558px" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker coordinates={coordinates} setCoordinates={setCoordinates} setLatInput={setLatInput} setLngInput={setLngInput} />
            <MapUpdater coordinates={coordinates} />
          </MapContainer>
          <div className="flex items-center space-x-2 mt-4">
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
              className="px-4 py-2 bg-blue-500 text-white rounded whitespace-nowrap"
            >
              Set Coordinates
            </button>
            <button
              onClick={handleGetClosestStations}
              className="px-4 py-2 bg-green-500 text-white rounded whitespace-nowrap"
            >
              Get Closest Stations
            </button>
          </div>
          <div className="mt-4">
            <h2 className="text-2xl font-semibold">Closest Stations</h2>
            <ul>
              {closestStations.map((station, index) => (
                <li key={index}>
                  <strong>{station.desc}</strong><br />
                  Latitude: {station.latitude}, Longitude: {station.longitude}<br />
                  Distance: {station.distance_to_query_location.toFixed(2)} km
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RockCliMe;