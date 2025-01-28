import React, { useState, useEffect, useRef, memo } from "react";
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
import axios from "axios";
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

const MapComponent = ({
  coordinates,
  setCoordinates,
  setLatInput,
  setLngInput,
  stations,
  setZoom,
  setBbox,
  fetchStations,
  zoom,
  bbox,
  minZoomLevel,
  prevBboxRef,
}) => {
  return (
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
  );
};

export default MapComponent;
