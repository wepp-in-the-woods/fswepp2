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
  Popup, LayerGroup, LayersControl
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css";
import "leaflet-defaulticon-compatibility";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MARKER_ICONS = {
  default: {
    iconUrl: "/default-map-marker.png",
    iconRetinaUrl: "/default-map-marker.png",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [1, -34],
  },
  station: {
    iconUrl: "/station-map-marker.png",
    iconRetinaUrl: "/station-map-marker.png",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -35],
  },
};

// Helper function to create Leaflet icons
const createIcon = (iconConfig) => L.icon(iconConfig);

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

    // Return the marker on the map.
    return position === null ? null : <Marker position={position} icon={createIcon(MARKER_ICONS.default)} ></Marker>;
  },
);

// Defines the station markers on the map visible when zoomed in.
const StationMarkers = memo(
  ({ stations }) => {
    const stationsList = stations.map((station) => (
      <Marker
        key={station.properties.id}
        position={[
          station.geometry.coordinates[1],
          station.geometry.coordinates[0],
        ]}
        icon={createIcon(MARKER_ICONS.station)}
      >
        <Popup>
          <div>
            <strong>{station.properties.desc}</strong>
            <br />
            ID: {station.properties.id}
          </div>
        </Popup>
      </Marker>
    ));

    return (
      <LayerGroup>{stationsList}</LayerGroup>
    );
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
  cligenVersion,
  databaseVersion,
  setSearchMethod,
}) {
  // Fixes Leaflet icon issues with Vite
  // useEffect(() => {
  //   // Fix for the missing icon issue in production builds with Vite
  //   delete L.Icon.Default.prototype._getIconUrl;
  //
  //   L.Icon.Default.mergeOptions({
  //     iconRetinaUrl:
  //       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  //     iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  //     shadowUrl:
  //       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  //     iconSize: [25, 41],
  //     iconAnchor: [12, 41], // Point of the icon which will correspond to marker's location
  //     popupAnchor: [1, -34], // Point from which the popup should open relative to the iconAnchor
  //     shadowSize: [41, 41],
  //   });
  // }, []);

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

  // // cligenVersion: The version of the Cligen model. Used in the Options dropdown. Stored in sessionStorage so that it persists across page reloads.
  // const [cligenVersion, setCligenVersion] = useState(() => sessionStorage.getItem("cligenVersion") || "5.3.2");
  // useEffect(() => {
  //   sessionStorage.setItem("cligenVersion", cligenVersion);
  // }, [cligenVersion]);

  // // databaseVersion: The version of the database. Used in the Options dropdown. Stored in sessionStorage so that it persists across page reloads.
  // const [databaseVersion, setDatabaseVersion] = useState(() => sessionStorage.getItem("databaseVersion") || "legacy");
  // useEffect(() => {
  //   sessionStorage.setItem("databaseVersion", databaseVersion);
  // }, [databaseVersion]);

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
      sessionStorage.setItem("lat", lat);
      sessionStorage.setItem("lng", lng);
      setSearchMethod("location");
      // setCligenVersion(cligenVersion);
      // setDatabaseVersion(databaseVersion);
    } else {
      console.log("Invalid coordinates input.");
    }
  };

  // Return the component.
  return (
    <>
      {/* Location div */}
      <div className="flex w-full grow flex-col">
        {/* Options button */}
        <div className="mb-2 flex w-full flex-col gap-2 sm:gap-6 text-sm text-gray-700 sm:flex-row">
          <span>Cligen Version: {cligenVersion}</span>
          <span>Database Version: {databaseVersion}</span>
        </div>

        {/* Map */}
        <div className="h-full w-full overflow-hidden">
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
            <LayersControl position="topright">
              <LayersControl.Overlay name="Show Stations" checked>
                <StationMarkers stations={stations} />
              </LayersControl.Overlay>
            </LayersControl>
          </MapContainer>
        </div>
        {/* Latitude and Longitude input fields and "Set Coords." button */}
        <div className="mt-4">
          <div className="flex w-full flex-col justify-center gap-2 sm:flex-row">
            <Input
              id="latInput"
              type="text"
              placeholder="Latitude"
              value={latInput}
              onChange={(e) => setLatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCoordinateSubmit();
                }
              }}
              // onBlur={() => {
              //   handleCoordinateSubmit();
              // }}
              className="mr-2 w-full grow rounded-sm border border-gray-300 px-2 py-1"
            />
            <Input
              id="lngInput"
              type="text"
              placeholder="Longitude"
              value={lngInput}
              onChange={(e) => setLngInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCoordinateSubmit();
                }
              }}
              // onBlur={() => {
              //   handleCoordinateSubmit();
              // }}
              className="mr-2 w-full grow rounded-sm border border-gray-300 px-2 py-1"
            />
            <div className="flex w-full shrink flex-col justify-center gap-2 sm:flex-row">
              <Button
                onClick={() => {
                  handleCoordinateSubmit();
                  setShowLocationDiv(false);
                }}
                className="w-full shrink cursor-pointer"
              >
                Set Coordinates
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowLocationDiv(false);
                }}
                className="w-full shrink cursor-pointer"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ChooseLocation;
