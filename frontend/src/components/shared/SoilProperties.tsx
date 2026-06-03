import * as React from "react";
import {useFormContext} from "react-hook-form";
import {readClimateState} from "@/core/rockclim-state";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Checkbox} from "@/components/ui/checkbox";
import {Input} from "@/components/ui/input";
import {FormControl, FormField, FormItem, FormLabel, FormMessage,} from "@/components/ui/form";

const SOIL_OPTIONS = [
    { value: "clay", label: "Clay loam" },
    { value: "silt", label: "Silt loam" },
    { value: "sand", label: "Sandy loam" },
    { value: "loam", label: "Loam" },
];

function simpleTexture(clay: number, sand: number) {
    const cs = clay + sand;
    if ((clay <= 27.0 && cs <= 50.0) || (clay > 27.0 && sand <= 20.0 && cs <= 50.0)) {
        return "silt loam";
    }
    if (clay >= 6.0 && clay <= 27.0 && cs > 50.0 && cs <= 72.0 && sand <= 52) {
        return "loam";
    }
    if ((sand > 52 || (cs > 50 && clay < 6)) && sand >= 50) {
        return "sand loam";
    }
    if ((cs > 72 && sand < 50) || (clay > 27 && sand > 20 && sand <= 45) || (sand <= 20 && cs > 50)) {
        return "clay loam";
    }

    const silt = 100 - clay - sand;
    if (sand >= 70) return "sand loam";
    if (clay >= 35) return "clay loam";
    if (silt >= 50) return "silt loam";
    return "loam";
}

function mapToSoilOption(label: string | null) {
    if (!label) return null;
    const lower = label.toLowerCase();
    if (lower.includes("silt")) return "silt";
    if (lower.includes("sand")) return "sand";
    if (lower.includes("clay")) return "clay";
    if (lower.includes("loam")) return "loam";
    return null;
}

function hasValidLocation(state: { location: { longitude: any; latitude: any; }; }) {
    const lon = Number(state?.location?.longitude);
    const lat = Number(state?.location?.latitude);
    return Number.isFinite(lon) && Number.isFinite(lat);
}

function formatPercent(value: unknown) {
    if (!Number.isFinite(value as number)) return "—";
    return `${(value as number).toFixed(1)}%`;
}

const ISRIC_WMS_ENDPOINT = "https://maps.isric.org/mapserv";
const ISRIC_WMS_VERSION = "1.3.0";
const ISRIC_WMS_CRS = "EPSG:4326";
const ISRIC_WMS_SIZE = 256;
const ISRIC_WMS_BBOX_BUFFER = 0.05;

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

function buildWmsFeatureInfoUrl({ map, layer, lon, lat }: { map: string; layer: string; lon: number; lat: number }) {
    const safeLon = clamp(Number(lon), -180, 180);
    const safeLat = clamp(Number(lat), -89.9999, 89.9999);
    const delta = ISRIC_WMS_BBOX_BUFFER;
    let minLon = safeLon - delta;
    let maxLon = safeLon + delta;
    let minLat = safeLat - delta;
    let maxLat = safeLat + delta;
    minLon = clamp(minLon, -180, 180);
    maxLon = clamp(maxLon, -180, 180);
    minLat = clamp(minLat, -89.9999, 89.9999);
    maxLat = clamp(maxLat, -89.9999, 89.9999);

    const width = ISRIC_WMS_SIZE;
    const height = ISRIC_WMS_SIZE;
    const bboxWidth = Math.max(maxLon - minLon, 1e-9);
    const bboxHeight = Math.max(maxLat - minLat, 1e-9);
    const i = Math.round(((safeLon - minLon) / bboxWidth) * (width - 1));
    const j = Math.round(((maxLat - safeLat) / bboxHeight) * (height - 1));
    const bbox =
        ISRIC_WMS_VERSION === "1.3.0" && ISRIC_WMS_CRS === "EPSG:4326"
            ? `${minLat},${minLon},${maxLat},${maxLon}`
            : `${minLon},${minLat},${maxLon},${maxLat}`;

    const params = new URLSearchParams();
    params.set("map", `/map/${map}.map`);
    params.set("REQUEST", "GetFeatureInfo");
    params.set("SERVICE", "WMS");
    params.set("VERSION", ISRIC_WMS_VERSION);
    params.set("FORMAT", "image/png");
    params.set("STYLES", "");
    params.set("TRANSPARENT", "TRUE");
    params.set("LAYERS", layer);
    params.set("QUERY_LAYERS", layer);
    params.set("INFO_FORMAT", "application/geo+json");
    params.set("WIDTH", String(width));
    params.set("HEIGHT", String(height));
    params.set("CRS", ISRIC_WMS_CRS);
    params.set("BBOX", bbox);
    params.set("I", String(clamp(i, 0, width - 1)));
    params.set("J", String(clamp(j, 0, height - 1)));

    return `${ISRIC_WMS_ENDPOINT}?${params.toString()}`;
}

function parseWmsFeatureValue(payload: { features: any[]; }) {
    const feature = payload?.features?.[0];
    const props = feature?.properties;
    if (!props) return { value: null, unit: null };
    const raw =
        props.pixel_value ??
        props.GRAY_INDEX ??
        props.value ??
        props.VALUE ??
        null;
    const unit = typeof props.unit === "string" ? props.unit : null;
    return { value: raw, unit };
}

function normalizeWmsValue(value: any, unit: string) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return value;
    if (!unit) return numeric;
    const normalized = unit.toLowerCase();
    if (normalized === "g/kg" || normalized === "gkg") return numeric / 10;
    if (normalized.includes("cm") && normalized.includes("dm")) return numeric / 10;
    if (normalized.includes("%")) return numeric;
    return numeric;
}

async function fetchWmsValue({ map, layer, lon, lat }: { map: string; layer: string; lon: number; lat: number }) {
    const url = buildWmsFeatureInfoUrl({ map, layer, lon, lat });
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`ISRIC WMS request failed (${response.status})`);
    }
    const payload = await response.json();
    const { value, unit } = parseWmsFeatureValue(payload);
    return { value: normalizeWmsValue(value, unit), unit };
}

type SoilPropertiesState = {
    soil_texture: string;
    rfg_pct: number;
    isric_enabled: boolean;
};

type SoilPropertiesProps = {
    state: SoilPropertiesState;
    idPrefix?: string;
    rfgMin?: number;
    rfgMax?: number;
    rfgStep?: number;
    onChange?: (updates: Partial<SoilPropertiesState>) => void;
};

export type SoilPropertiesHandle = {
    validators: Array<() => boolean>;
    setState: (next: Partial<SoilPropertiesState>) => void;
};

export const SoilProperties = React.forwardRef<SoilPropertiesHandle, SoilPropertiesProps>(
    (
        {
            state,
            idPrefix = "wepproad",
            rfgMin = 0,
            rfgMax = 50,
            rfgStep = 1,
            onChange,
        },
        ref
    ) => {
        const { control, setValue, watch, setError, clearErrors } = useFormContext();

        // local state for ISRIC summary
        const [current, setCurrent] = React.useState<SoilPropertiesState>({ ...state });
        const [summaryStatus, setSummaryStatus] = React.useState("");
        const [summaryLines, setSummaryLines] = React.useState<string[]>([]);
        const [isricEnabled, setIsricEnabled] = React.useState(state.isric_enabled || false);
        const [isricAvailable, setIsricAvailable] = React.useState(false);

        // Refs for tracking state
        const currentRef = React.useRef<SoilPropertiesState>({ ...state });
        const requestIdRef = React.useRef(0);
        const lastLocationKeyRef = React.useRef<string | null>(null);
        const rockTouchedRef = React.useRef(false);
        const rockTimerRef = React.useRef<NodeJS.Timeout | null>(null);

        const rfgPct = watch("rfg_pct");

        // Update currentRef when state changes
        React.useEffect(() => {
            currentRef.current = { ...current };
        }, [current]);

        // setSummary helper
        function setSummary(lines: string[], status: string) {
            setSummaryStatus(status || "");
            setSummaryLines(lines || []);
        }

        // Rock fragment validator (matches JS version exactly)
        const rockValidator = React.useCallback(() => {
            const value = Number(rfgPct);
            if (!Number.isFinite(value)) {
                setError("rfg_pct", {
                    type: "manual",
                    message: "Rock fragment content must be a number.",
                });
                return false;
            }
            if (value < rfgMin || value > rfgMax) {
                setError("rfg_pct", {
                    type: "manual",
                    message: `Rock fragment content must be between ${rfgMin} and ${rfgMax}.`,
                });
                return false;
            }
            clearErrors("rfg_pct");
            return true;
        }, [rfgPct, rfgMin, rfgMax, setError, clearErrors]);

        // Debounced validation for rock field (matches JS version)
        const handleRockBlur = React.useCallback(() => {
            rockTouchedRef.current = true;
            rockValidator();
        }, [rockValidator]);

        const handleRockInput = React.useCallback(() => {
            if (!rockTouchedRef.current) return;
            if (rockTimerRef.current) clearTimeout(rockTimerRef.current);
            rockTimerRef.current = setTimeout(rockValidator, 300);
        }, [rockValidator]);

        // fetchIsric function
        const fetchIsric = React.useCallback(
            async (lon: number, lat: number) => {
                const id = ++requestIdRef.current;
                setSummary([], "Fetching ISRIC soil data…");
                try {
                    const [clayResult, sandResult, cfvoResult, wrbResult] = await Promise.all([
                        fetchWmsValue({
                            map: "clay",
                            layer: "clay_0-5cm_mean",
                            lon,
                            lat,
                        }),
                        fetchWmsValue({
                            map: "sand",
                            layer: "sand_0-5cm_mean",
                            lon,
                            lat,
                        }),
                        fetchWmsValue({
                            map: "cfvo",
                            layer: "cfvo_0-5cm_mean",
                            lon,
                            lat,
                        }),
                        fetchWmsValue({
                            map: "wrb",
                            layer: "MostProbable",
                            lon,
                            lat,
                        }),
                    ]);
                    if (id !== requestIdRef.current) return;

                    const clay = clayResult?.value;
                    const sand = sandResult?.value;
                    const cfvo = cfvoResult?.value;

                    const textureLabel = Number.isFinite(clay) && Number.isFinite(sand)
                        ? simpleTexture(clay, sand)
                        : null;
                    const mappedTexture = mapToSoilOption(textureLabel);

                    if (Number.isFinite(cfvo)) {
                        const clampedRfg = Math.min(Math.max(cfvo, rfgMin), rfgMax);
                        currentRef.current.rfg_pct = clampedRfg;
                        setValue("rfg_pct", Math.round(clampedRfg));
                    }
                    if (mappedTexture) {
                        currentRef.current.soil_texture = mappedTexture;
                        setValue("soil_texture", mappedTexture);
                    }

                    onChange?.({
                        soil_texture: currentRef.current.soil_texture,
                        rfg_pct: currentRef.current.rfg_pct,
                    });

                    const wrbName = typeof wrbResult?.value === "string" ? wrbResult.value : null;
                    const lines = [
                        `Clay: ${formatPercent(clay)} • Sand: ${formatPercent(sand)} • Rock fragments: ${formatPercent(cfvo)}`,
                        textureLabel ? `Derived texture: ${textureLabel}` : "Derived texture: —",
                        wrbName ? `WRB: ${wrbName}` : "WRB: —",
                    ];
                    setSummary(lines, "ISRIC WMS 0–5 cm mean.");
                } catch (error) {
                    if (id !== requestIdRef.current) return;
                    console.error("[wepproad] ISRIC fetch failed", error);
                    setSummary([], "Unable to load ISRIC soil data.");
                }
            },
            [rfgMin, rfgMax, setValue, onChange]
        );

        // updateIsricAvailability function
        const updateIsricAvailability = React.useCallback(() => {
            const climateState = readClimateState();
            const hasLocation = hasValidLocation(climateState);
            setIsricAvailable(hasLocation);
            if (!hasLocation && isricEnabled) {
                setSummary([], "Set a Rock Climate location to query ISRIC.");
            }
        }, [isricEnabled]);

        // handleIsricToggle function
        const handleIsricToggle = React.useCallback(
            (enabled: boolean) => {
                setIsricEnabled(enabled);
                onChange?.({ isric_enabled: enabled });
                if (!enabled) {
                    setSummary([], "");
                    return;
                }
                const climateState = readClimateState();
                if (!hasValidLocation(climateState)) {
                    setSummary([], "Set a Rock Climate location to query ISRIC.");
                    return;
                }

                lastLocationKeyRef.current = `${climateState.location.longitude},${climateState.location.latitude}`;
                fetchIsric(climateState.location.longitude, climateState.location.latitude);
            },
            [onChange, fetchIsric]
        );

        // Setup event listeners and initialization
        React.useEffect(() => {
            updateIsricAvailability();
            if (state.isric_enabled) {
                const climateState = readClimateState();
                if (hasValidLocation(climateState)) {
                    handleIsricToggle(true);
                }
            }

            const handleClimateChanged = (event: Event) => {
                const customEvent = event as CustomEvent;
                const climateState = customEvent?.detail || readClimateState();
                updateIsricAvailability();
                if (!currentRef.current.isric_enabled) return;
                if (!hasValidLocation(climateState)) return;
                const key = `${climateState.location.longitude},${climateState.location.latitude}`;
                if (key === lastLocationKeyRef.current) return;
                lastLocationKeyRef.current = key;
                fetchIsric(climateState.location.longitude, climateState.location.latitude);
            };

            document.addEventListener("fswepp:climate-changed", handleClimateChanged);
            return () => {
                document.removeEventListener("fswepp:climate-changed", handleClimateChanged);
                if (rockTimerRef.current) clearTimeout(rockTimerRef.current);
            };
        }, [state.isric_enabled, updateIsricAvailability, handleIsricToggle, fetchIsric]);

        // Expose validators and setState via ref (matches JS return value)
        React.useImperativeHandle(
            ref,
            () => ({
                validators: [rockValidator],
                setState(next: Partial<SoilPropertiesState>) {
                    const updated = { ...currentRef.current, ...next };
                    setCurrent(updated);
                    currentRef.current = updated;
                    setValue("soil_texture", updated.soil_texture);
                    setValue("rfg_pct", updated.rfg_pct);
                    setIsricEnabled(updated.isric_enabled);
                },
            }),
            [rockValidator, setValue]
        );

        // Handle soil texture change
        const handleSoilTextureChange = React.useCallback(
            (value: string) => {
                currentRef.current.soil_texture = value;
                setCurrent((prev) => ({ ...prev, soil_texture: value }));
                onChange?.({ soil_texture: value });
            },
            [onChange]
        );

        // Handle rock fragment change
        const handleRockChange = React.useCallback(
            (value: string) => {
                const num = Number(value);
                if (Number.isFinite(num)) {
                    currentRef.current.rfg_pct = num;
                    setCurrent((prev) => ({ ...prev, rfg_pct: num }));
                    onChange?.({ rfg_pct: num });
                }
            },
            [onChange]
        );

        return (
            <section className="rounded-lg border border-border bg-card p-6 space-y-4">
                <h2 className="text-base font-semibold">Soil Properties</h2>

                <div className="grid gap-4 md:grid-cols-2">
                    {/* Soil Texture (select) */}
                    <FormField
                        control={control}
                        name="soil_texture"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel htmlFor={`${idPrefix}_soil_texture`}>
                                    Soil Texture
                                </FormLabel>
                                <FormControl>
                                    <Select
                                        value={field.value ?? ""}
                                        onValueChange={(value) => {
                                            field.onChange(value);
                                            handleSoilTextureChange(value);
                                        }}
                                    >
                                        <SelectTrigger id={`${idPrefix}_soil_texture`}>
                                            <SelectValue placeholder="Select soil texture" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {SOIL_OPTIONS.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </FormControl>
                            </FormItem>
                        )}
                    />

                    {/* Rock Fragment Content */}
                    <FormField
                        control={control}
                        name="rfg_pct"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel htmlFor={`${idPrefix}_rock_fragments`}>
                                    Rock Fragment Content
                                </FormLabel>
                                <FormControl>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id={`${idPrefix}_rock_fragments`}
                                            type="number"
                                            placeholder="0"
                                            step={rfgStep}
                                            min={rfgMin}
                                            max={rfgMax}
                                            value={field.value ?? ""}
                                            onChange={(e) => {
                                                field.onChange(e);
                                                handleRockChange(e.target.value);
                                                handleRockInput();
                                            }}
                                            onBlur={(e) => {
                                                field.onBlur();
                                                handleRockBlur();
                                            }}
                                        />
                                        <span className="text-sm text-muted-foreground">%</span>
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* ISRIC checkbox */}
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                            id={`${idPrefix}_isric`}
                            checked={isricEnabled}
                            disabled={!isricAvailable}
                            onCheckedChange={(checked) => {
                                handleIsricToggle(Boolean(checked));
                            }}
                        />
                        Determine Soil Texture and Rock from ISRIC
                    </label>
                    <p className="text-sm text-muted-foreground">
                        Requires latitude/longitude from Rock Climate Control.
                    </p>
                </div>

                {/* Summary */}
                <div className="text-sm text-muted-foreground space-y-1">
                    <p>{summaryStatus}</p>
                    <div className="grid gap-1">
                        {summaryLines.map((line, i) => (
                            <p key={i}>{line}</p>
                        ))}
                    </div>
                </div>
            </section>
        );
    }
);

SoilProperties.displayName = "SoilProperties";