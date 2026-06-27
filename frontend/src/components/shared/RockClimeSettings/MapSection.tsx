// map section
import * as React from "react";
import { useEffect, useRef, useState, useCallback } from "react";
import { useFormContext } from "react-hook-form";
import { DeckGL } from "@deck.gl/react";
import { TileLayer } from '@deck.gl/geo-layers';
import { BitmapLayer, ScatterplotLayer, IconLayer } from "@deck.gl/layers";
import { MapViewState, WebMercatorViewport } from "@deck.gl/core";
import * as GeoTIFF from 'geotiff';
import { useRockclimData } from "@/hooks/useRockclimData";

import {
    FieldDescription,
    FieldLegend,
} from "@/components/ui/field"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { useSessionStorage } from "@/utils/session-storage";

const INITIAL_VIEW_STATE: MapViewState = {
    latitude: 47,
    longitude: -116,
    zoom: 11,
    pitch: 0,
    bearing: 0,
};

const COPYRIGHT_LICENSE_STYLE: React.CSSProperties = {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: 'hsla(0,0%,100%,.5)',
    padding: '0 5px',
    font: '12px/20px Helvetica Neue,Arial,Helvetica,sans-serif'
};

const PRISM_OVERLAY_OPACITY_DEFAULT = 0.15;
const PRISM_PPT_COG_URL =
    "/prism_data/prism_ppt_us_30s_2020_avg_30y/prism_ppt_us_30s_2020_avg_30y_cog.tif";
const PRISM_OVERLAY_MAX_WIDTH = 2048;

const PRISM_PPT_LEGEND_BINS = [
    { min: -Infinity, max: 0, color: "#FFFFFF" },
    { min: 0, max: 4, color: "#660000" },
    { min: 4, max: 8, color: "#B33000" },
    { min: 8, max: 12, color: "#E65C00" },
    { min: 12, max: 16, color: "#FF9900" },
    { min: 16, max: 20, color: "#FFCC00" },
    { min: 20, max: 24, color: "#FFFF00" },
    { min: 24, max: 28, color: "#CCFF00" },
    { min: 28, max: 32, color: "#80FF00" },
    { min: 32, max: 36, color: "#00FF00" },
    { min: 36, max: 40, color: "#00FF80" },
    { min: 40, max: 50, color: "#00FFFF" },
    { min: 50, max: 60, color: "#33CCFF" },
    { min: 60, max: 70, color: "#3366FF" },
    { min: 70, max: 80, color: "#0000FF" },
    { min: 80, max: 100, color: "#7F00FF" },
    { min: 100, max: 120, color: "#FF00FF" },
    { min: 120, max: 140, color: "#FF66FF" },
    { min: 140, max: 160, color: "#FFB3FF" },
    { min: 160, max: Infinity, color: "#FFE6FF" },
];
const PRISM_PPT_COLOR_STOPS = [
    { min: -Infinity, max: 0, color: [255, 255, 255] },
    { min: 0, max: 4, color: [102, 0, 0] },
    { min: 4, max: 8, color: [179, 48, 0] },
    { min: 8, max: 12, color: [230, 92, 0] },
    { min: 12, max: 16, color: [255, 153, 0] },
    { min: 16, max: 20, color: [255, 204, 0] },
    { min: 20, max: 24, color: [255, 255, 0] },
    { min: 24, max: 28, color: [204, 255, 0] },
    { min: 28, max: 32, color: [128, 255, 0] },
    { min: 32, max: 36, color: [0, 255, 0] },
    { min: 36, max: 40, color: [0, 255, 128] },
    { min: 40, max: 50, color: [0, 255, 255] },
    { min: 50, max: 60, color: [51, 204, 255] },
    { min: 60, max: 70, color: [51, 102, 255] },
    { min: 70, max: 80, color: [0, 0, 255] },
    { min: 80, max: 100, color: [127, 0, 255] },
    { min: 100, max: 120, color: [255, 0, 255] },
    { min: 120, max: 140, color: [255, 102, 255] },
    { min: 140, max: 160, color: [255, 179, 255] },
    { min: 160, max: Infinity, color: [255, 230, 255] },
];

function colorForPrecipInches(value: number): [number, number, number, number] {
    if (!Number.isFinite(value)) return [0, 0, 0, 0];
    for (const stop of PRISM_PPT_COLOR_STOPS) {
        if (value >= stop.min && value < stop.max) {
            return [...stop.color, 255] as [number, number, number, number];
        }
    }
    return [...PRISM_PPT_COLOR_STOPS[0].color, 255] as [number, number, number, number];
}

function getTooltip({object}: any) {
    if (!object) return null;
    const props = object.properties || object;
    if (!props) return null;
    const name = props.desc || props.id || "Station";
    const elevation = props.elevation ? `${Math.round(props.elevation)} m` : "";
    return {
        text: [name, elevation].filter(Boolean).join(" • "),
    };
}


export type MapSectionState = {
    location: {
        latitude: number | string;
        longitude: number | string;
    } | null;
    database?: string;
    usePrism?: boolean;
};

type MapSectionProps = {
    state: MapSectionState;
    onChange?: (updates: Partial<MapSectionState>) => void;
};

export type MapSectionHandle = {
    validators: Array<() => Promise<boolean>>;
    setState: (next: Partial<MapSectionState>) => void;
};

function formatLegendValue(valueInches: number, unitKey: string): string {
    if (unitKey === "in") {
        const rounded = Math.round(valueInches);
        return Number.isFinite(rounded) ? `${rounded}` : "";
    }
    const mm = Math.round(valueInches * 25.4);
    return Number.isFinite(mm) ? `${mm}` : "";
}

function buildLegendItems(unitKey: string) {
    return PRISM_PPT_LEGEND_BINS.map((bin) => {
        if (!Number.isFinite(bin.min)) {
            return {
                color: bin.color,
                label: `< ${formatLegendValue(bin.max, unitKey)} ${unitKey}`,
            };
        }
        if (!Number.isFinite(bin.max)) {
            return {
                color: bin.color,
                label: `> ${formatLegendValue(bin.min, unitKey)} ${unitKey}`,
            };
        }
        return {
            color: bin.color,
            label: `${formatLegendValue(bin.min, unitKey)} - ${formatLegendValue(
                bin.max,
                unitKey
            )} ${unitKey}`,
        };
    });
}

function getLegendUnitKey(): string {
    const client = (window as any).UnitizerClient?.getClientSync?.();
    if (client && typeof client.getPreferencePayload === "function") {
        const prefs = client.getPreferencePayload();
        if (prefs && prefs["xs-distance"]) {
            return prefs["xs-distance"];
        }
    }
    return "mm";
}

function PrismLegend({ isVisible }: { isVisible: boolean | undefined }) {
    const unitKey = getLegendUnitKey();
    const unitLabel = unitKey === "in" ? "in." : "mm";
    const items = buildLegendItems(unitKey);

    if (!isVisible) return null;

    return (
        <div className="absolute right-3 top-3 rounded-md border border-border bg-background/90 px-3 py-2 shadow-sm">
            <h5 className="mb-2 text-xs font-bold text-muted-foreground uppercase">PRISM Annual Precip ({unitLabel})</h5>
            <div className="space-y-1">
                {items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                        <span
                            className="h-3 w-3 rounded"
                            style={{ backgroundColor: item.color }}
                        />
                        <span className="text-muted-foreground">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export const MapSection = React.forwardRef<MapSectionHandle, MapSectionProps>(
    (
        {
            state,
            onChange,
        },
        ref
    ) => {
        const { control } = useFormContext();
        const mapContainerRef = useRef<HTMLDivElement>(null);

        // UI state
        const [mapSectionOpen, setMapSectionOpen] = useSessionStorage(
            "rockclime_map_open",
            false
        );

        const [viewState, setViewState] = useState<MapViewState>(() => {
            if (state.location) {
                const lon = Number(state.location.longitude);
                const lat = Number(state.location.latitude);
                if (Number.isFinite(lon) && Number.isFinite(lat)) {
                    return {
                        longitude: lon,
                        latitude: lat,
                        zoom: 7,
                        pitch: 0,
                        bearing: 0,
                    };
                }
            }
            return INITIAL_VIEW_STATE;
        });

        const {
            stations,
            stationsGeojson,
            fetchClosestStations,
            fetchStationsGeojson,
        } = useRockclimData();

        const [prismOpacity, setPrismOpacity] = useState(
            PRISM_OVERLAY_OPACITY_DEFAULT
        );

        const [prismOverlay, setPrismOverlay] = useState<{
            canvas: HTMLCanvasElement | null;
            bounds: [number, number, number, number] | null;
            raster: any;
            width: number;
            height: number;
            status: "idle" | "loading" | "ready" | "error";
            error: Error | null;
        }>({
            canvas: null,
            bounds: null,
            raster: null,
            width: 0,
            height: 0,
            status: "idle",
            error: null,
        });

        // Load PRISM overlay
        const loadPrismOverlay = useCallback(async () => {


            if (prismOverlay.status === "loading" || prismOverlay.status === "ready") {
                console.debug("[rockclim] PRISM already loaded or loading");
                return;
            }

            setPrismOverlay((prev) => ({ ...prev, status: "loading" }));
            console.debug("[rockclim] Starting PRISM overlay load");

            try {
                console.debug("[rockclim] Loading PRISM from:", PRISM_PPT_COG_URL);

                const tiff = await GeoTIFF.fromUrl(PRISM_PPT_COG_URL);
                if (!tiff) {
                    throw new Error("Failed to load GeoTIFF");
                }

                console.debug("[rockclim] GeoTIFF loaded, reading image");
                const image = await tiff.getImage();
                const width = image.getWidth();
                const height = image.getHeight();
                const targetWidth = Math.min(PRISM_OVERLAY_MAX_WIDTH, width);
                const targetHeight = Math.max(1, Math.round((height / width) * targetWidth));

                console.debug(`[rockclim] Reading raster data: ${targetWidth}x${targetHeight}`);
                const raster = await image.readRasters({
                    width: targetWidth,
                    height: targetHeight,
                    interleave: true,
                });

                if (!raster || raster.length === 0) {
                    throw new Error("Failed to read raster data");
                }

                console.debug(`[rockclim] Raster read complete, creating canvas`);
                const canvas = document.createElement("canvas");
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                const ctx = canvas.getContext("2d");

                if (!ctx) throw new Error("Canvas 2D context unavailable.");

                const imageData = ctx.createImageData(targetWidth, targetHeight);
                const rgba = imageData.data;

                for (let i = 0; i < raster.length; i += 1) {
                    const value = raster[i];
                    const offset = i * 4;
                    if (!Number.isFinite(value) || value <= -9990) {
                        rgba[offset] = 0;
                        rgba[offset + 1] = 0;
                        rgba[offset + 2] = 0;
                        rgba[offset + 3] = 0;
                        continue;
                    }
                    const inches = value / 25.4;
                    const [r, g, b, a] = colorForPrecipInches(inches);
                    rgba[offset] = r;
                    rgba[offset + 1] = g;
                    rgba[offset + 2] = b;
                    rgba[offset + 3] = a;
                }

                ctx.putImageData(imageData, 0, 0);
                const bounds = image.getBoundingBox() as [number, number, number, number];

                // TODO: Fix misalignment of PRISM overlay
                const [west, south, east, north] = bounds;
                const LON_OFFSET = -0.1;  // Negative shifts left, positive shifts right
                const LAT_OFFSET = -0.22;  // Negative shifts down, positive shifts up
                const prismBounds: [number, number, number, number] = [
                    west + LON_OFFSET,
                    south + LAT_OFFSET,
                    east + LON_OFFSET,
                    north + LAT_OFFSET,
                ];

                console.debug("[rockclim] PRISM overlay created successfully", bounds);
                setPrismOverlay({
                    canvas,
                    bounds,
                    raster,
                    width: targetWidth,
                    height: targetHeight,
                    status: "ready",
                    error: null,
                });
            } catch (error) {
                console.error("[rockclim] Failed to load PRISM overlay", error);
                setPrismOverlay((prev) => ({
                    ...prev,
                    status: "error",
                    error: error as Error,
                }));
            }
        }, [prismOverlay.status]);

        // Update view state when location changes externally
        useEffect(() => {
            if (state.location) {
                const lat = Number(state.location.latitude);
                const lon = Number(state.location.longitude);
                if (Number.isFinite(lat) && Number.isFinite(lon)) {
                    setViewState((prev) => ({
                        ...prev,
                        latitude: lat,
                        longitude: lon,
                    }));
                }
            }
        }, [state.location?.longitude, state.location?.latitude]);

        // Fetch closest stations when location or database changes
        useEffect(() => {
            if (state.location?.latitude && state.location?.longitude) {
                fetchClosestStations(state.database || null, {
                    latitude: Number(state.location.latitude),
                    longitude: Number(state.location.longitude),
                });
            }
        }, [
            state.location?.latitude,
            state.location?.longitude,
            state.database,
            fetchClosestStations,
        ]);

        // Load PRISM when enabled
        useEffect(() => {
            if (state.usePrism && prismOverlay.status === "idle") {
                void loadPrismOverlay();
            }
        }, [state.usePrism, loadPrismOverlay]);

        // Refetch stations when database changes
        useEffect(() => {
            if (state.location?.latitude && state.location?.longitude && mapContainerRef.current) {
                try {
                    const viewport = new WebMercatorViewport({
                        longitude: Number(state.location.longitude),
                        latitude: Number(state.location.latitude),
                        bearing: viewState.bearing || 0,
                        pitch: viewState.pitch || 0,
                        width: mapContainerRef.current.clientWidth || 1,
                        height: mapContainerRef.current.clientHeight || 1,
                    });
                    const bounds = viewport.getBounds();
                    if (bounds) {
                        const [minLng, minLat, maxLng, maxLat] = bounds;
                        fetchStationsGeojson(state.database || null, [minLng, maxLat, maxLng, minLat]);
                    }
                } catch (e) {
                    console.warn("Error calculating viewport bounds", e);
                }
            }
        }, [state.database, state.location, fetchStationsGeojson]);

        const handleLocationChange = useCallback(
            (nextLocation: {
                latitude: number | string;
                longitude: number | string;
            }) => {
                onChange?.({
                    location: nextLocation,
                });
            },
            [onChange]
        );

        const handleMapClick = useCallback(
            (event: any) => {
                if (!event || !event.coordinate) return;
                const [lon, lat] = event.coordinate;
                handleLocationChange({
                    latitude: lat.toFixed(5),
                    longitude: lon.toFixed(5),
                });
            },
            [handleLocationChange]
        );

        const handleViewStateChange = useCallback(
            ({ viewState: newViewState }: any) => {
                setViewState(newViewState);

                if (mapContainerRef.current) {
                    try {
                        const viewport = new WebMercatorViewport({
                            longitude: newViewState.longitude,
                            latitude: newViewState.latitude,
                            zoom: newViewState.zoom,
                            bearing: newViewState.bearing || 0,
                            pitch: newViewState.pitch || 0,
                            width: mapContainerRef.current.clientWidth || 1,
                            height: mapContainerRef.current.clientHeight || 1,
                        });
                        const bounds = viewport.getBounds();
                        if (bounds) {
                            const [minLng, minLat, maxLng, maxLat] = bounds;
                            fetchStationsGeojson(state.database || null, [minLng, maxLat, maxLng, minLat]);
                        }
                    } catch (e) {
                        console.warn("Error calculating viewport bounds", e);
                    }
                }
            },
            [state.database, fetchStationsGeojson]
        );

        const [precipValue, setPrecipValue] = useState<{
            value: string;
            unit: string;
        } | null>(null);

        const calculatePrecipAtLocation = useCallback( () => {
            if (!state.location || !prismOverlay.raster || !prismOverlay.bounds) {
                setPrecipValue({
                    value: "--",
                    unit: getLegendUnitKey() === "in" ? "in" : "mm",
                });
                return;
            }

            const [minX, minY, maxX, maxY] = prismOverlay.bounds;
            const longitude = Number(state.location.longitude);
            const latitude = Number(state.location.latitude);
            const { width, height } = prismOverlay;

            if (!width || !height) {
                setPrecipValue({
                    value: "--",
                    unit: getLegendUnitKey() === "in" ? "in" : "mm",
                });
                return;
            }

            const xRatio = (longitude - minX) / (maxX - minX);
            const yRatio = (maxY - latitude) / (maxY - minY);
            const col = Math.round(xRatio * (width - 1));
            const row = Math.round(yRatio * (height - 1));

            if (col < 0 || row < 0 || col >= width || row >= height) {
                setPrecipValue({
                    value: "--",
                    unit: getLegendUnitKey() === "in" ? "in" : "mm",
                });
                return;
            }

            const idx = row * width + col;
            const valueMm = prismOverlay.raster[idx];

            if (!Number.isFinite(valueMm) || valueMm <= -9990) {
                setPrecipValue({
                    value: "--",
                    unit: getLegendUnitKey() === "in" ? "in" : "mm",
                });
                return;
            }

            const unitKey = getLegendUnitKey();
            if (unitKey === "in") {
                const inches = valueMm * 0.0393701;
                setPrecipValue({
                    value: inches.toFixed(2),
                    unit: "in",
                });
            } else {
                setPrecipValue({
                    value: `${Math.round(valueMm)}`,
                    unit: "mm",
                });
            }
        }, [state.location, prismOverlay.raster, prismOverlay.bounds, prismOverlay.width, prismOverlay.height]);

        useEffect(() => {
            calculatePrecipAtLocation();
            // Listen for unit preference changes
            const handleUnitChange = () => {
                calculatePrecipAtLocation();
            };
            document.addEventListener("unitizer:preferences-changed", handleUnitChange);
            return () => {
                document.removeEventListener("unitizer:preferences-changed", handleUnitChange);
            };
        }, [calculatePrecipAtLocation]);

        const [zoomLevel, setZoomLevel] = useState<number>(7);

        const [prismOverlayOpacity, setPrismOverlayOpacity] = useState<number>(PRISM_OVERLAY_OPACITY_DEFAULT);

        const mapLayers = [];
        mapLayers.push(
            new TileLayer<ImageBitmap>({
                id: "osm-tiles",
                data: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                minZoom: 0,
                maxZoom: 19,
                tileSize: 256,
                loadOptions: {
                    image: {
                        crossOrigin: "anonymous",
                    },
                },
                renderSubLayers: (props: any) => {
                    const { data } = props;
                    let bounds: [number, number, number, number] | null = null;
                    const tile = props.tile;

                    if (tile?.boundingBox && Array.isArray(tile.boundingBox)) {
                        const [[minX, minY], [maxX, maxY]] = tile.boundingBox;
                        bounds = [minX, minY, maxX, maxY];
                    } else if (tile?.bbox && typeof tile.bbox === "object") {
                        const b = tile.bbox;
                        const west = b.west ?? b.left;
                        const east = b.east ?? b.right;
                        const south = b.south ?? b.bottom;
                        const north = b.north ?? b.top;
                        if ([west, east, south, north].every(Number.isFinite)) {
                            bounds = [west, south, east, north];
                        }
                    }

                    if (!bounds) return null;

                    return new BitmapLayer({
                        id: `${props.id}-bitmap`,
                        bounds,
                        image: data,
                    });
                },
            })
        );

        // PRISM overlay (if enabled and loaded)
        if (prismOverlay.canvas && prismOverlay.bounds && state.usePrism) {
            mapLayers.push(
                new BitmapLayer({
                    id: "prism-annual-ppt",
                    bounds: prismOverlay.bounds,
                    image: prismOverlay.canvas,
                    opacity: prismOpacity,
                    pickable: false,
                })
            );
        }

        const features = stationsGeojson?.features || [];
        if (features.length) {
            mapLayers.push(
                // new GeoJsonLayer({
                //     id: "stations",
                //     data: stationsGeojson || { features: [] },
                //     pointRadiusMinPixels: 3,
                //     pointRadiusMaxPixels: 6,
                //     getPointRadius: 80,
                //     getFillColor: [33, 102, 172, 180],
                //     pickable: true,
                // })
                new IconLayer({
                    id: "stations",
                    data: features,
                    pickable: true,
                    iconAtlas: "/public/station-map-marker.png",
                    iconMapping: {
                        station: { x: 0, y: 0, width: 40, height: 40, mask: false },
                    },
                    getIcon: (d) => {
                        return "station";
                    },
                    getPosition: (d) => d.geometry.coordinates,
                    getSize: 40,
                    sizeScale: 1,
                })
            );
        }

        // Selected location marker
        if (state.location) {
            mapLayers.push(
                new ScatterplotLayer({
                    id: "selected-location",
                    data: [
                        {
                            longitude: Number(state.location.longitude),
                            latitude: Number(state.location.latitude),
                        },
                    ],
                    getPosition: (d: any) => [d.longitude, d.latitude],
                    getRadius: 250,
                    radiusMinPixels: 6,
                    radiusMaxPixels: 12,
                    getFillColor: [239, 68, 68, 200],
                    pickable: false,
                })
            );
        }

        return(
            <Collapsible
                className="w-full"
                open={mapSectionOpen}
                onOpenChange={setMapSectionOpen}
            >
                <CollapsibleTrigger asChild className="text-base font-semibold">
                    <Button variant="ghost" className="group w-full h-auto p-0 has-[>svg]:p-0 hover:bg-transparent
    dark:hover:bg-transparent">
                        <div className="flex flex-col items-start">
                            <FieldLegend className="text-base font-semibold">
                                Map Location
                            </FieldLegend>
                            <FieldDescription>
                                Pick a location to set latitude/longitude and view stations.
                            </FieldDescription>
                        </div>
                        <ChevronDown className="ml-auto group-data-[state=open]:rotate-180" />
                    </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 space-y-4">
                    <div
                        ref={mapContainerRef}
                        className="relative h-[500px] w-full overflow-hidden rounded-md border border-border"
                    >
                        <DeckGL
                            initialViewState={viewState}
                            viewState={viewState}
                            onViewStateChange={handleViewStateChange}
                            controller={true}
                            onClick={handleMapClick}
                            layers={mapLayers}
                            getTooltip={getTooltip}
                        >
                            <PrismLegend isVisible={state.usePrism && prismOverlay.canvas !== null} />
                            <div style={COPYRIGHT_LICENSE_STYLE}>
                                {"© "}
                                <a
                                    className="text-gray-600 hover:underline"
                                    href="http://www.openstreetmap.org/copyright"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    OpenStreetMap contributors
                                </a>
                            </div>
                        </DeckGL>
                    </div>
                    {/* PRISM opacity control */}
                    {state.usePrism && prismOverlay.canvas && (
                        <div className="flex items-center gap-3 text-sm">
                            {precipValue && (
                                <div className="flex items-center gap-2 mr-1">
                                    <span className="font-medium text-foreground">PRISM Annual Precipitation</span>
                                    <div className="flex items-center gap-1">
                                        <span className="text-right text-foreground tabular-nums">
                                            {precipValue.value}
                                        </span>
                                        <span className="text-muted-foreground">
                                            {precipValue.unit}
                                        </span>
                                    </div>
                                </div>
                            )}
                            <label className="font-medium text-foreground">
                                Map Opacity
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={prismOpacity}
                                onChange={(e) =>
                                    setPrismOpacity(Number(e.target.value))
                                }
                                className="flex-1 min-w-[140px]"
                            />
                            <span className="tabular-nums text-muted-foreground">
                                {Math.round(prismOpacity * 100)}%
                            </span>
                        </div>
                    )}
                </CollapsibleContent>
            </Collapsible>
        );
    }
);

MapSection.displayName = "MapSection";