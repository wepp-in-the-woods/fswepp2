import { useCallback, useMemo, useState } from "react";
import { apiPost } from "@/utils/api-client";

const STATION_LIMIT = 10;

function createDebounce(fn: (...args: any[]) => void, delayMs: number) {
    let timer: NodeJS.Timeout | null = null;
    return (...args: any[]) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delayMs);
    };
}

function formatStationLabel(station: { desc: any; id: any; par: any; distance_to_query_location: any; elevation: any; }) {
    const name = station.desc || station.id || station.par || "Station";
    const distance = Number(station.distance_to_query_location);
    const elevation = Number(station.elevation);
    const parts = [name];
    if (Number.isFinite(distance)) {
        parts.push(`${distance.toFixed(1)} km`);
    }
    if (Number.isFinite(elevation)) {
        parts.push(`${Math.round(elevation)} m`);
    }
    return parts.length > 1 ? `${parts[0]} - ${parts.slice(1).join(", ")}` : parts[0];
}

export function useRockclimData() {
    const [stations, setStations] = useState<any[]>([]);
    const [stationFieldOptions, setStationFieldOptions] = useState<any[]>([]);
    const [stationsGeojson, setStationsGeojson] = useState<any>(null);

    // Fetch closest stations when location changes
    const fetchClosestStations = useCallback(
        async (database: string, location: any) => {
            if (!location) return;
            try {
                const lon = Number(location.longitude);
                const lat = Number(location.latitude);

                if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
                    console.warn("[rockclim] Invalid location coordinates", location);
                    return;
                }

                const payload: Record<string, any> = {
                    location: {
                        longitude: lon,
                        latitude: lat,
                    },
                };

                if (database) {
                    payload.database = database;
                }

                console.debug("[rockclim] Fetching closest stations with payload:", payload);

                const response = await apiPost(
                    "/api/rockclim/GET/closest_stations",
                    payload,
                    { timeoutMs: 20000 }
                );

                // Nearest 10 unique stations
                const uniqueStations = Array.isArray(response)
                    ? Array.from(
                        new Map(response.map((station) => [station.id, station])).values()
                    ).slice(0, STATION_LIMIT)
                    : [];

                setStations(uniqueStations);
                const options = uniqueStations.length
                    ? uniqueStations.map((station) => ({
                        value: station.id,
                        label: formatStationLabel(station),
                    }))
                    : [{ value: "", label: "No stations found" }];
                setStationFieldOptions(options);
                console.debug("[rockclim] Loaded stations:", uniqueStations);
            } catch (error: any) {
                console.error("[rockclim] Failed to load closest stations:", {
                    error,
                    status: error?.status,
                    body: error?.body,
                });
                setStations([]);
                setStationFieldOptions([
                    { value: "", label: "Unable to load stations" },
                ]);
            }
        }, []);

    const debouncedFetchStations = useMemo(
        () => createDebounce(fetchClosestStations, 450),
        [fetchClosestStations]
    );

    // Fetch stations GeoJSON for the current map view
    const fetchStationsGeojson = useCallback(
        async (database: string, bbox: any) => {
            if (!bbox || !Array.isArray(bbox) || bbox.length !== 4) return;
            try {
                const validBbox = bbox.map((v: any) => Number(v));
                if (!validBbox.every(Number.isFinite)) return;

                const payload: Record<string, any> = {
                    bbox: validBbox,
                };

                if (database) {
                    payload.database = database;
                }

                const response = await apiPost(
                    "/api/rockclim/GET/stations_geojson",
                    payload,
                    { timeoutMs: 20000 }
                );
                setStationsGeojson(response);
            } catch (error: any) {
                console.error("[rockclim] Failed to load stations geojson:", {
                    error,
                    status: error?.status,
                    body: error?.body,
                });
            }
        }, []);

    const debouncedFetchStationsGeo = useMemo(
        () => createDebounce(fetchStationsGeojson, 400),
        [fetchStationsGeojson]
    );

    return {
        stations,
        stationFieldOptions,
        stationsGeojson,
        fetchClosestStations: debouncedFetchStations,
        fetchStationsGeojson: debouncedFetchStationsGeo,
    };
}