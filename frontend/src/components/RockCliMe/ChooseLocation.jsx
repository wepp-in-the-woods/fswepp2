import React, { useState, useEffect, useRef, memo } from "react";
import axios from "axios";
import { api } from '../../api';
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
  Popup,
} from "react-leaflet";
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
  }
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
const MapBBoxHandler = ({ setZoom, setBbox, fetchStations, zoom, bbox, minZoomLevel, prevBboxRef }) => {
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
function ChooseLocation ({
  coordinates,
  setCoordinates,
  setLatInput,
  setLngInput,
  setShowLocationDiv,
  latInput,
  lngInput,
}) {

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
      <div className="fixed inset-0 bg-black opacity-50 z-11"></div>

      {/* Location div */}
      <div className="fixed inset-0 flex items-center justify-center z-40">
        <div className="bg-white pl-4 pr-4 pb-4 rounded shadow-lg w-full ml-2 mr-2 border-2 h-2.3">
          <div className="flex justify-between items-center relative">
            
            {/* Close button */}
            <button
              className="text-xl opacity-70"
              onClick={() => setShowLocationDiv(false)}
            >
              X
            </button>

            {/* Options button */}
            <button
              className="mb-1 flex flex-row items-end text-md rounded h-[30px] opacity-70"
              onClick={() => setShowOptionsDiv(!showOptionsDiv)}
            >
              Options
              <img
                src={showOptionsDiv ? "/upArrow.png" : "/downArrow.png"}
                alt="Arrow"
                className="ml-1 mb-1 h-3 w-3 lg:w-3 lg:h-3 lg:ml-1 lg:mt-1"
              />
            </button>

            {/* Options dropdown */}
            {showOptionsDiv && (
              <div className="absolute border top-full right-0 w-[190px] -mt-1 -mr-1 p-2 pt-1 bg-gray-100 rounded shadow-lg z-50">
                <div className="mb-2">
                  <label className="block mb-1">Cligen version</label>
                  <select
                    className="w-full p-2 border rounded"
                    value={cligenVersion}
                    onChange={(event) => setCligenVersion(event.target.value)}
                  >
                    <option value="5.3.2">5.3.2 (WEPPcloud)</option>
                    <option value="4.3">4.3 (Legacy)</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1">Database version</label>
                  <select
                    className="w-full p-2 border rounded"
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
          <div className="flex-grow z-0 h-60">
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
            <div className="flex flex-row justify-center w-full">
              <input
                type="text"
                placeholder="Latitude"
                value={
                  isNaN(parseFloat(latInput)) ? "" : parseFloat(latInput).toFixed(5)
                }
                onChange={(e) => setLatInput(parseFloat(e.target.value).toFixed(5))}
                className="flex-shrink px-2 py-1 border border-gray-300 rounded mr-2 w-1/3"
              />
              <input
                type="text"
                placeholder="Longitude"
                value={
                  isNaN(parseFloat(lngInput)) ? "" : parseFloat(lngInput).toFixed(5)
                }
                onChange={(e) => setLngInput(parseFloat(e.target.value).toFixed(5))}
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
    </>
  );
};

export default ChooseLocation;