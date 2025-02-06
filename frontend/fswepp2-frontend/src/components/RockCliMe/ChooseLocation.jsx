import React, { useState, useEffect, useRef, memo } from "react";
import axios from "axios"; // Import axios
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

const debounce = (func, delay) => {
  let debounceTimer;
  return function (...args) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => func.apply(this, args), delay);
  };
};

const MapEvents = ({ setZoom, setBbox, fetchStations, zoom, bbox, minZoomLevel, prevBboxRef }) => {
  const map = useMapEvents({
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
      debounce(fetchStations(bbox), 500);
    }
  }, [zoom, bbox]);

  return null;
};

const ChooseLocation = ({
  coordinates,
  setCoordinates,
  setLatInput,
  setLngInput,
  setShowLocationDiv,
  latInput,
  lngInput,
}) => {
  const [stations, setStations] = useState([]);
  const [zoom, setZoom] = useState(0);
  const [bbox, setBbox] = useState([-180, -90, 180, 90]);
  const minZoomLevel = 7;
  const prevBboxRef = useRef(bbox);
  const [showOptionsDiv, setShowOptionsDiv] = useState(false);
  const [cligenVersion, setCligenVersion] = useState("5.3.2");
  const [databaseVersion, setDatabaseVersion] = useState("legacy");

  useEffect(() => {
    if (coordinates) {
      fetchStations(bbox);
    }
  }, [coordinates]);

  const fetchStations = async (bbox) => {
    try {
      const response = await axios.post("http://localhost:8080/api/rockclim/GET/stations_geojson", {
        database: databaseVersion === "None" ? null : databaseVersion,
        bbox: bbox,
      });
      setStations(response.data.features);
      console.log(JSON.stringify(response.data));
    } catch (error) {
      console.error("Error fetching stations:", error);
    }
  };

  const handleCoordinateSubmit = () => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    if (!isNaN(lat) && !isNaN(lng)) {
      setCoordinates([lat, lng]);
    } else {
      console.log("Invalid coordinates input.");
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black opacity-50 z-11"></div>
      <div className="fixed inset-0 flex items-center justify-center z-40">
        <div className="bg-white pl-4 pr-4 pb-4 rounded shadow-lg w-full ml-2 mr-2 border-2 h-2.3">
          <div className="flex justify-between items-center relative">
            <button
              className="text-xl opacity-70"
              onClick={() => setShowLocationDiv(false)}
            >
              X
            </button>
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
              <MapEvents
                setZoom={setZoom}
                setBbox={setBbox}
                fetchStations={fetchStations}
                zoom={zoom}
                bbox={bbox}
                minZoomLevel={minZoomLevel}
                prevBboxRef={prevBboxRef}
              />
              <MapUpdater coordinates={coordinates} />
              {stations.map((station) => (
                <Marker
                  key={station.properties.id}
                  position={[
                    station.geometry.coordinates[1],
                    station.geometry.coordinates[0],
                  ]}
                >
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