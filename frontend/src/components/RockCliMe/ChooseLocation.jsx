// @ts-nocheck
// ...rest of your code

import React, { useState, useEffect, useRef, memo } from "react";
import axios from "axios";
import { api } from "../../api";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
  Popup,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css";
import "leaflet-defaulticon-compatibility";

// Defines the location marker on the map based on the user's click.
const LocationMarker = memo(
  ({ coordinates, setCoordinates, setLatInput, setLngInput }) => {
    const [position, setPosition] = useState(null);
    // useMapEvents is a hook from react-leaflet that allows you to listen to events on the map.
    const map = useMapEvents({
      click(e) {
        setPosition(e.latlng);
        setCoordinates([e.latlng.lat, e.latlng.lng]);
        setLatInput(e.latlng.lat.toFixed(6));
        setLngInput(e.latlng.lng.toFixed(6));
      },
    });

    // Set the marker position based on the coordinates.
    useEffect(() => {
      if (coordinates) {
        setPosition({ lat: coordinates[0], lng: coordinates[1] });
      }
    }, [coordinates]);

    // Set the input values based on the marker position.
    useEffect(() => {
      if (position) {
        setLatInput(position.lat.toFixed(6));
        setLngInput(position.lng.toFixed(6));
      }
    }, [position, setLatInput, setLngInput]);

    // Return the marker on the map.
    return position === null ? null : <Marker position={position}></Marker>;
  },
);

// Updates the map based on the coordinates.
const MapUpdater = ({ coordinates }) => {
  // useMap is a hook from react-leaflet that allows you to access the map instance.
  const map = useMap();

  // Set the map view based on the coordinates and the current zoom.
  useEffect(() => {
    if (coordinates) {
      map.setView(coordinates, map.getZoom());
    }
  }, [coordinates, map]);
  return null;
};

// MapEvents handles the zoom and move events on the map.
const MapBBoxHandler = ({
  setZoom,
  setBbox,
  fetchStations,
  zoom,
  bbox,
  minZoomLevel,
  prevBboxRef,
}) => {
  const map = useMapEvents({
    // Once user is no longer changing zoom level, update BBox bounds.
    zoomend: () => {
      setZoom(map.getZoom());
      const bounds = map.getBounds();
      setBbox([
        bounds.getWest(),
        bounds.getNorth(),
        bounds.getEast(),
        bounds.getSouth(),
      ]);
    },
    // Once user is no longer moving the map, update BBox bounds.
    moveend: () => {
      const bounds = map.getBounds();
      setBbox([
        bounds.getWest(),
        bounds.getNorth(),
        bounds.getEast(),
        bounds.getSouth(),
      ]);
    },
  });
  useEffect(() => {
    if (
      zoom >= minZoomLevel &&
      JSON.stringify(bbox) !== JSON.stringify(prevBboxRef.current)
    ) {
      prevBboxRef.current = bbox;
      fetchStations(bbox);
    }
  }, [zoom, bbox]);
  return null;
};

// Main Component.
// Props:
// coordinates: The coordinates of the location.
// setCoordinates: Function to set the coordinates.
// setLatInput: Function to set the latitude input.
// setLngInput: Function to set the longitude input.
// setShowLocationDiv: Function to show the location div.
// latInput: The latitude input.
// lngInput: The longitude input.
function ChooseLocation({
  coordinates,
  setCoordinates,
  setLatInput,
  setLngInput,
  setShowLocationDiv,
  latInput,
  lngInput,
}) {
  // Fixes Leaflet icon issues with Vite
  useEffect(() => {
    // Fix for the missing icon issue in production builds with Vite
    delete L.Icon.Default.prototype._getIconUrl;

    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  // State variables

  // stations: The stations to display on the map, fetched from the server as JSON.
  const [stations, setStations] = useState([]);

  // zoom: The current zoom level of the map. Ranges from 0 to 18.
  const [zoom, setZoom] = useState(0);

  // bbox: The bounding box of the map. Contains the coordinates of the top-left and bottom-right corners.
  const [bbox, setBbox] = useState([-180, -90, 180, 90]);

  // minZoomLevel: The minimum zoom level to display the stations on the map.
  // Caution: If the zoom level is lower than 5-7, then ~100+ stations will be fetched and it will be slow.
  const minZoomLevel = 7;

  // prevBboxRef: Reference to the previous bounding box.
  const prevBboxRef = useRef(bbox);

  // showOptionsDiv: Boolean to show the options div. Used to toggle the options div.
  const [showOptionsDiv, setShowOptionsDiv] = useState(false);

  // cligenVersion: The version of the Cligen model. Used in the Options dropdown.
  const [cligenVersion, setCligenVersion] = useState("5.3.2");

  // databaseVersion: The version of the database. Used in the Options dropdown.
  const [databaseVersion, setDatabaseVersion] = useState("legacy");

  // Fetch stations based on the bounding box.
  const fetchStations = async (bbox) => {
    try {
      // API call
      const response = await api.post("/api/rockclim/GET/stations_geojson", {
        // Database version is None if the user has not selected any database.
        database: databaseVersion === "None" ? null : databaseVersion,
        bbox: bbox,
      });
      // Set returned stations
      setStations(response.data.features);
    } catch (error) {
      console.error("Error fetching stations:", error);
    }
  };

  // Handle the coordinate submit button.
  const handleCoordinateSubmit = () => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    if (!isNaN(lat) && !isNaN(lng)) {
      setCoordinates([lat, lng]);
    } else {
      console.log("Invalid coordinates input.");
    }
  };

  // Return the component.
  return (
    <>
      {/* Darkened background overlay */}
      <div className="fixed inset-0 z-11 bg-black opacity-50"></div>

      {/* Location div */}
      <div className="fixed inset-0 z-40 flex items-center justify-center">
        <div className="h-2.3 mr-2 ml-2 w-full rounded-sm border-2 bg-white pr-4 pb-4 pl-4 shadow-lg">
          <div className="relative flex items-center justify-between">
            {/* Close button */}
            <button
              className="text-xl opacity-70"
              onClick={() => setShowLocationDiv(false)}
            >
              X
            </button>

            {/* Options button */}
            <button
              className="text-md mb-1 flex h-[30px] flex-row items-end rounded-sm opacity-70"
              onClick={() => setShowOptionsDiv(!showOptionsDiv)}
            >
              Options
              <img
                src={showOptionsDiv ? "/upArrow.png" : "/downArrow.png"}
                alt="Arrow"
                className="mb-1 ml-1 h-3 w-3 lg:mt-1 lg:ml-1 lg:h-3 lg:w-3"
              />
            </button>

            {/* Options dropdown */}
            {showOptionsDiv && (
              <div className="absolute top-full right-0 z-50 -mt-1 -mr-1 w-[190px] rounded-sm border bg-gray-100 p-2 pt-1 shadow-lg">
                <div className="mb-2">
                  <label className="mb-1 block">Cligen version</label>
                  <select
                    className="w-full rounded-sm border p-2"
                    value={cligenVersion}
                    onChange={(event) => setCligenVersion(event.target.value)}
                  >
                    <option value="5.3.2">5.3.2 (WEPPcloud)</option>
                    <option value="4.3">4.3 (Legacy)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block">Database version</label>
                  <select
                    className="w-full rounded-sm border p-2"
                    value={databaseVersion}
                    onChange={(event) => setDatabaseVersion(event.target.value)}
                  >
                    <option value="legacy">Legacy</option>
                    <option value="2015">2015</option>
                    <option value="au">au</option>
                    <option value="ghcn">ghcn</option>
                    <option value="None">None</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Map */}
          <div className="z-0 h-60 grow">
            <MapContainer
              center={coordinates || [39.8283, -98.5795]}
              zoom={4}
              scrollWheelZoom={true}
              attributionControl={false}
              style={{ zIndex: 0 }}
              className="h-full w-full"
            >
              {/* OpenStreetMap tile layer for map*/}
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Location Marker for when the user clicks*/}
              <LocationMarker
                coordinates={coordinates}
                setCoordinates={setCoordinates}
                setLatInput={setLatInput}
                setLngInput={setLngInput}
                style={{ color: "green" }}
              />
              {/* MapBBoxHandler for handling zoom and move events on the map */}
              <MapBBoxHandler
                setZoom={setZoom}
                setBbox={setBbox}
                fetchStations={fetchStations}
                zoom={zoom}
                bbox={bbox}
                minZoomLevel={minZoomLevel}
                prevBboxRef={prevBboxRef}
              />

              {/* MapUpdater for updating the map based on the coordinates */}
              <MapUpdater coordinates={coordinates} />

              {/* Display stations on the map, marking them with Markers. Currently
                    the marker is the same as the user placeable one, and it is possible
                    to update the Marker texture. */}
              {stations.map((station) => (
                <Marker
                  key={station.properties.id}
                  position={[
                    station.geometry.coordinates[1],
                    station.geometry.coordinates[0],
                  ]}
                >
                  {/* Popup for the station name and ID */}
                  <Popup>
                    <div>
                      <strong>{station.properties.desc}</strong>
                      <br />
                      ID: {station.properties.id}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
          {/* Latitude and Longitude input fields and "Set Coords." button */}
          <div className="mt-4">
            <div className="flex w-full flex-row justify-center">
              <input
                type="text"
                placeholder="Latitude"
                value={
                  isNaN(parseFloat(latInput))
                    ? ""
                    : parseFloat(latInput).toFixed(5)
                }
                onChange={(e) =>
                  setLatInput(parseFloat(e.target.value).toFixed(5))
                }
                className="mr-2 w-1/3 shrink rounded-sm border border-gray-300 px-2 py-1"
              />
              <input
                type="text"
                placeholder="Longitude"
                value={
                  isNaN(parseFloat(lngInput))
                    ? ""
                    : parseFloat(lngInput).toFixed(5)
                }
                onChange={(e) =>
                  setLngInput(parseFloat(e.target.value).toFixed(5))
                }
                className="mr-2 w-1/3 shrink rounded-sm border border-gray-300 px-2 py-1"
              />
              <button
                onClick={() => {
                  handleCoordinateSubmit();
                  setShowLocationDiv(false);
                }}
                className="w-1/3 shrink rounded-sm bg-[#16a34a] px-2 py-2 text-sm text-white"
              >
                Set Coords.
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ChooseLocation;
