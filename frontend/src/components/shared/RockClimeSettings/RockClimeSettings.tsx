import React, { useState, useEffect, useRef, useMemo, lazy, use } from "react";
import { useFormContext } from "react-hook-form";

import {Input} from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox"
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@/components/ui/form";
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
} from "@/components/ui/field";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

import { useSessionStorage } from "@/utils/session-storage";
import { isLongitude, isLatitude } from "@/utils/validators";
import { useRockclimData } from "@/hooks/useRockclimData";
import { DEFAULT_CLIMATE_STATE, DATABASE_OPTIONS, CLIGEN_OPTIONS, ClimateState, Location, UserDefinedParMod} from "@/types/climate";
import { readClimateState, writeClimateState } from "@/utils/climate-utils";

import { MapSection, MapSectionState, MapSectionHandle } from "@/components/shared/RockClimeSettings/MapSection";
import { StationParFile, StationParFileHandle } from "@/components/shared/RockClimeSettings/StationParFile";
import { ClimateFile, ClimateFileHandle } from "@/components/shared/RockClimeSettings/ClimateFile";
import { ClimateCustomization } from "@/components/shared/RockClimeSettings/ClimateCustomization";

type RockClimSettingsProps = {
    idPrefix: string;
    onChange?: (updates: Partial<ClimateState>) => void;
};

export type RockClimSettingsHandle = {
    validators: Array<() => Promise<boolean>>;
    setState: (next: Partial<ClimateState>) => void;
};

export const RockClimeSettings = React.forwardRef<RockClimSettingsHandle, RockClimSettingsProps>(
    (
        {
            idPrefix,
            onChange,
        },
        ref
    ) => {
        const { control, setError, clearErrors } = useFormContext();

        let climateState = readClimateState();

        // UI state
        const [rockClimeSettingsOpen, setRockClimeSettingsOpen] = useSessionStorage(
            "rockclime_settings_open",
            false
        );

        // databaseVersion: The version of the database. Used in the Options dropdown. Stored in cookies so that it persists across page reloads.
        const [databaseVersion, setDatabaseVersion] = useState<string>(
            () => readClimateState().database || DEFAULT_CLIMATE_STATE.database || "legacy",
        );
        useEffect(() => {
            writeClimateState({ ...climateState, database: databaseVersion });
        }, [databaseVersion]);

        // cligenVersion: The version of the Cligen model. Used in the Options dropdown. Stored in cookies so that it persists across page reloads.
        const [cligenVersion, setCligenVersion] = useState<string>(
            () => readClimateState().cligenVersion || DEFAULT_CLIMATE_STATE.cligenVersion || "5.3.2",
        );
        useEffect(() => {
            writeClimateState({ ...climateState, cligen_version: cligenVersion });
        }, [cligenVersion]);

        const [locationState, setLocationState] = useState<{ latitude: number | string; longitude: number | string }>(
            () => readClimateState().location || DEFAULT_CLIMATE_STATE.location || { latitude: "", longitude: "" }
        );

        useEffect(() => {
            writeClimateState({ ...climateState, location: {
                    latitude: locationState.latitude,
                    longitude: locationState.longitude,
                } });
        }, [locationState.latitude, locationState.longitude]);

        const [parId, setParId] = useState<string | null>(
            () => readClimateState().parId || DEFAULT_CLIMATE_STATE.parId,
        );
        useEffect(() => {
            writeClimateState({ ...climateState, par_id: parId });
        }, [parId]);

        const [selectedStationLabel, setSelectedStationLabel] = useState<string | null>("");

        const [inputYears, setInputYears] = useState<number | string>(
            () => readClimateState().inputYears || DEFAULT_CLIMATE_STATE.inputYears || 100
        );
        useEffect(() => {
            writeClimateState({ ...climateState, input_years: inputYears });
        }, [inputYears]);

        const [usePrism, setUsePrism] = useState<boolean>(
            () => readClimateState().usePrism || DEFAULT_CLIMATE_STATE.usePrism || false,
        );
        useEffect(() => {
            writeClimateState({ ...climateState, use_prism: usePrism });
        }, [usePrism]);

        const [userDefinedParMod, setUserDefinedParMod] = useState<any>(
            () => readClimateState().userDefinedParMod || DEFAULT_CLIMATE_STATE.userDefinedParMod,
        );
        useEffect(() => {
            writeClimateState({ ...climateState, user_defined_par_mod: userDefinedParMod });
        }, [userDefinedParMod]);

        const validateCoordinateField = React.useCallback(
            (name: "rockclim_latitude" | "rockclim_longitude", value: string) => {
                const message =
                    name === "rockclim_longitude"
                        ? "Enter a longitude between -180 and 180."
                        : "Enter a latitude between -90 and 90.";
                const isValid =
                    value === "" ||
                    (name === "rockclim_longitude"
                        ? isLongitude(value)
                        : isLatitude(value)
                    );

                if (isValid) {
                    clearErrors(name);
                } else {
                    setError(name, {
                        type: "validate",
                        message,
                    });
                }

                return isValid;
            },
            [clearErrors, setError],
        );

        const [mapState, setMapState] = useState<MapSectionState>({
            location: locationState,
            database: databaseVersion,
            usePrism: usePrism,
        });

        useEffect(() => {
            setMapState((prev) => ({
                ...prev,
                database: databaseVersion,
                usePrism: usePrism,
            }));
        }, [databaseVersion, usePrism]);

        useEffect(() => {
            const loc = mapState.location;
            if (!loc) return;

            setLocationState((prev) => {
                if (prev.latitude === loc.latitude && prev.longitude === loc.longitude) {
                    return prev;
                }

                return {
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                };
            });
        }, [mapState.location?.latitude, mapState.location?.longitude]);

        const mapSectionRef = useRef<MapSectionHandle>(null);

        // Climate Station state
        const { stations, stationFieldOptions, fetchClosestStations } = useRockclimData();

        // Fetch closest stations when location or database changes
        useEffect(() => {
            if (locationState.latitude && locationState.longitude) {
                console.log("[station-setting] Fetching stations for database:", databaseVersion);
                fetchClosestStations(databaseVersion || null, {
                    latitude: Number(locationState.latitude),
                    longitude: Number(locationState.longitude),
                });
            }
        }, [
            locationState.latitude,
            locationState.longitude,
            databaseVersion,
            fetchClosestStations,
        ]);

        // Update the nearest station selection when closest stations are fetched
        useEffect(() => {
            if (stationFieldOptions.length > 0) {
                setParId(stationFieldOptions[0].value);
                setSelectedStationLabel(stations[0].desc);
            }
        }, [stationFieldOptions]);

        const stationParFileRef = useRef<StationParFileHandle>(null);
        const climateFileRef = useRef<ClimateFileHandle>(null);

        React.useImperativeHandle(ref, () => ({
            validators: [
                async () => {
                    const latitudeValid = validateCoordinateField(
                        "rockclim_latitude",
                        String(locationState.latitude ?? ""),
                    );
                    const longitudeValid = validateCoordinateField(
                        "rockclim_longitude",
                        String(locationState.longitude ?? ""),
                    );
                    return latitudeValid && longitudeValid;
                },
            ],
                setState: (next) => {
                    onChange?.(next);
                },
            }),
            [locationState.latitude, locationState.longitude, onChange, validateCoordinateField]
        );

        React.useEffect(() => {
            onChange?.({
                database: databaseVersion,
                cligenVersion: cligenVersion,
                location: locationState,
                parId: parId,
                inputYears: inputYears,
                usePrism: usePrism,
                userDefinedParMod: userDefinedParMod,
            });
            console.log("" +
                "databaseVersion: " + databaseVersion +
                ", cligenVersion: " + cligenVersion +
                ", locationState: " + JSON.stringify(locationState) +
                ", parId: " + parId +
                ", inputYears: " + inputYears +
                ", usePrism: " + usePrism +
                ", userDefinedParMod: " + userDefinedParMod);
        }, [databaseVersion, cligenVersion, locationState, parId, inputYears, usePrism, userDefinedParMod, onChange]);

        return(
            <section className="rounded-lg border border-border bg-card p-6 space-y-4">
                <FieldSet className="w-full">
                    <Collapsible className="w-full" open={rockClimeSettingsOpen} onOpenChange={setRockClimeSettingsOpen}>
                        <CollapsibleTrigger asChild className="text-base font-semibold">
                            <Button variant="ghost" className="group w-full h-auto p-0 has-[>svg]:p-0 hover:bg-transparent
    dark:hover:bg-transparent">
                                <div className="flex flex-col items-start">
                                    <FieldLegend className="text-base font-semibold">
                                        RockClim Settings
                                    </FieldLegend>
                                    <FieldDescription>
                                        Climate: {usePrism && (userDefinedParMod === null ? "PRISM modified" : "Customized")} {selectedStationLabel ? `${selectedStationLabel}` : ""} {locationState ? `(${locationState.latitude}, ${locationState.longitude})` : ""}
                                    </FieldDescription>
                                </div>
                                <ChevronDown className="ml-auto group-data-[state=open]:rotate-180" />
                            </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-4 space-y-4">
                            {/*DB and CliGen Version*/}
                            <FieldGroup className="grid gap-4 md:grid-cols-2 items-start">
                                <FormField
                                    control={control}
                                    name="rockclim_database"
                                    render={({ field }) => (
                                        <FormItem className="w-full">
                                            <FormLabel htmlFor="rockclim_database">Climate Database</FormLabel>
                                            <FormControl>
                                                <Select
                                                    onValueChange={(value) => {
                                                        field.onChange(value);
                                                        setDatabaseVersion(value);
                                                        climateState = {
                                                            ...climateState,
                                                            database: value,
                                                            parId: null,
                                                            userDefinedParMod: null,
                                                        };
                                                        writeClimateState(climateState);
                                                        // persistState();
                                                    }}
                                                    value={field.value ?? databaseVersion ?? climateState.database ?? DEFAULT_CLIMATE_STATE.database}
                                                >
                                                    <SelectTrigger id="rockclim_database" className="w-full">
                                                        <SelectValue placeholder="Select database version" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {DATABASE_OPTIONS.map((option) => (
                                                            <SelectItem key={option.value} value={option.value}>
                                                                {option.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name="rockclim_cligen"
                                    render={({ field }) => (
                                        <FormItem className="w-full">
                                            <FormLabel htmlFor="rockclim_cligen">CLIGEN Version</FormLabel>
                                            <FormControl>
                                                <Select
                                                    onValueChange={(value) => {
                                                        field.onChange(value);
                                                        setCligenVersion(value);
                                                        climateState = {
                                                            ...climateState,
                                                            cligenVersion: value,
                                                        };
                                                        writeClimateState(climateState);
                                                        // persistState();
                                                    }}
                                                    value={field.value ?? cligenVersion ?? climateState.cligenVersion ?? DEFAULT_CLIMATE_STATE.cligenVersion}
                                                >
                                                    <SelectTrigger id="rockclim_cligen" className="w-full">
                                                        <SelectValue placeholder="Select CLIGEN version" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {CLIGEN_OPTIONS.map((option) => (
                                                            <SelectItem key={option.value} value={option.value}>
                                                                {option.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </FieldGroup>
                            {/*Location Settings with lat, long;*/}
                            <FieldGroup className="grid gap-4 md:grid-cols-2 items-start">
                                <FormField
                                    control={control}
                                    name="rockclim_latitude"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor="rockclim_latitude">
                                                Latitude
                                            </FormLabel>
                                            <FormControl>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        {...field}
                                                        value={locationState.latitude ?? climateState.location?.latitude ?? DEFAULT_CLIMATE_STATE.location?.latitude ?? ""}
                                                        id="rockclim_latitude"
                                                        type="number"
                                                        inputMode="decimal"
                                                        placeholder="47.0000"
                                                        step="0.00001"
                                                        min="-90"
                                                        max="90"
                                                        onChange={(e) => {
                                                            const value = e.target.value;
                                                            field.onChange(value);
                                                            const isValid = validateCoordinateField("rockclim_latitude", value);
                                                            setLocationState((current) => {
                                                                const nextLocation = {
                                                                    ...current,
                                                                    latitude: value,
                                                                };
                                                                if (isValid) {
                                                                    const nextClimate = {
                                                                        ...climateState,
                                                                        location: {
                                                                            latitude: Number(value),
                                                                            longitude: current?.longitude ?? locationState.longitude,
                                                                        },
                                                                    };
                                                                    writeClimateState(nextClimate);
                                                                    climateState = nextClimate;
                                                                }
                                                                return nextLocation;
                                                            });
                                                        }}
                                                        onBlur={(e) => {
                                                            field.onBlur();
                                                            const isValid = validateCoordinateField("rockclim_latitude", e.target.value);
                                                            if (isValid) {
                                                                const nextLocation = {
                                                                    latitude: e.target.value,
                                                                    longitude: locationState.longitude,
                                                                };
                                                                setMapState((prev) => ({
                                                                    ...prev,
                                                                    location: nextLocation,
                                                                    prism_adjustment: usePrism,
                                                                }));
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name="rockclim_longitude"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor="rockclim_longitude">
                                                Longitude
                                            </FormLabel>
                                            <FormControl>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        {...field}
                                                        value={locationState.longitude ?? climateState.location?.longitude ?? DEFAULT_CLIMATE_STATE.location?.longitude ?? ""}
                                                        id="rockclim_longitude"
                                                        type="number"
                                                        inputMode="decimal"
                                                        placeholder="-116.0000"
                                                        step="0.00001"
                                                        min="-180"
                                                        max="180"
                                                        onChange={(e) => {
                                                            const value = e.target.value;
                                                            field.onChange(value);
                                                            const isValid = validateCoordinateField("rockclim_longitude", value);
                                                            setLocationState((current) => {
                                                                const nextLocation = {
                                                                    ...current,
                                                                    longitude: value,
                                                                };
                                                                if (isValid) {
                                                                    const nextClimate = {
                                                                        ...climateState,
                                                                        location: {
                                                                            latitude: current?.latitude ?? locationState.latitude,
                                                                            longitude: Number(value),
                                                                        },
                                                                    };
                                                                    writeClimateState(nextClimate);
                                                                    climateState = nextClimate;
                                                                }
                                                                return nextLocation;
                                                            });
                                                        }}
                                                        onBlur={(e) => {
                                                            field.onBlur();
                                                            const isValid = validateCoordinateField("rockclim_longitude", e.target.value);
                                                            if (isValid) {
                                                                const nextLocation = {
                                                                    latitude: locationState.latitude,
                                                                    longitude: e.target.value,
                                                                };
                                                                setMapState((prev) => ({
                                                                    ...prev,
                                                                    location: nextLocation,
                                                                    prism_adjustment: usePrism,
                                                                }));
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </FieldGroup>
                            {/*PRISM checkbox*/}
                            <FormField
                                control={control}
                                name="rockclim_prism"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start gap-3">
                                        <FormControl>
                                            <Checkbox
                                                id="rockclim_prism"
                                                checked={Boolean(field.value ?? usePrism ?? climateState.usePrism ?? DEFAULT_CLIMATE_STATE.usePrism)}
                                                onCheckedChange= {(value) => {
                                                    const checked = Boolean(value);
                                                    field.onChange(checked);
                                                    setUsePrism(checked);

                                                    const nextClimate = {
                                                        ...climateState,
                                                        usePrism: checked,
                                                    };

                                                    writeClimateState(nextClimate);
                                                    climateState = nextClimate;
                                                }}
                                            />
                                        </FormControl>
                                        <FieldContent className="gap-1">
                                            <FieldLabel htmlFor="rockclim_prism">
                                                Use PRISM adjustment for this location.
                                            </FieldLabel>
                                            <FieldDescription>Only available after setting location.</FieldDescription>
                                        </FieldContent>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={control}
                                name="rockclim_station"
                                render={({ field }) => (
                                    <FormItem className="w-full">
                                        <FormLabel htmlFor="rockclim_station">Nearest Station</FormLabel>
                                        <FormControl>
                                            <Select
                                                onValueChange={(value) => {
                                                    field.onChange(value);
                                                    setParId(value);
                                                    setSelectedStationLabel(stations.find((s) => s.id === value)?.desc ?? "");
                                                    const nextClimate = {
                                                        ...climateState,
                                                        parId: value,
                                                    };
                                                    writeClimateState(nextClimate);
                                                    climateState = nextClimate;
                                                }}
                                                value={parId ?? climateState.parId ?? DEFAULT_CLIMATE_STATE.parId ?? ""}
                                            >
                                                <SelectTrigger id="rockclim_station" className="w-full">
                                                    <SelectValue placeholder="Set location to load stations" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {stationFieldOptions.length !== 0 && (
                                                        stationFieldOptions.map((option: {value: string, label: string}, index: number) => (
                                                            <SelectItem key={`${databaseVersion}-${option.value}-${index}`} value={option.value}>
                                                                {option.label}
                                                            </SelectItem>
                                                        ))
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <ClimateCustomization
                                state={{
                                    location: locationState,
                                    parId: parId ?? climateState.parId ?? DEFAULT_CLIMATE_STATE.parId,
                                    database: databaseVersion ?? climateState.database ?? DEFAULT_CLIMATE_STATE.database,
                                    cligenVersion: cligenVersion ?? climateState.cligenVersion ?? DEFAULT_CLIMATE_STATE.cligenVersion,
                                    inputYears: inputYears ?? climateState.inputYears ?? DEFAULT_CLIMATE_STATE.inputYears,
                                    usePrism: usePrism ?? climateState.usePrism ?? DEFAULT_CLIMATE_STATE.usePrism,
                                    userDefinedParMod: userDefinedParMod ?? null,
                                }}
                                selectedStationLabel={selectedStationLabel ?? ""}
                                onChange={(next) => {
                                    if (next.userDefinedParMod !== undefined) {
                                        setUserDefinedParMod(next.userDefinedParMod);
                                    }
                                }}
                            />

                            {userDefinedParMod && (
                                <div className="mt-4">
                                    <p className="text-sm text-muted-foreground">
                                        Using customized climate: {userDefinedParMod.description}
                                    </p>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => {
                                            setUserDefinedParMod(null);
                                        }}
                                    >
                                        Delete Custom Climate
                                    </Button>
                                </div>
                            )}

                            {/*Map Section*/}
                            <MapSection
                                ref={mapSectionRef}
                                state={mapState}
                                onChange={(updates: Partial<MapSectionState>) =>
                                    setMapState((prev) => ({ ...prev, ...updates }))
                                }
                            />

                            <StationParFile
                                ref={stationParFileRef}
                                state={{
                                    location: locationState,
                                    parId: parId ?? climateState.parId ?? DEFAULT_CLIMATE_STATE.parId,
                                    database: databaseVersion ?? climateState.database ?? DEFAULT_CLIMATE_STATE.database,
                                    cligenVersion: cligenVersion ?? climateState.cligenVersion ?? DEFAULT_CLIMATE_STATE.cligenVersion,
                                    usePrism: usePrism ?? climateState.usePrism ?? DEFAULT_CLIMATE_STATE.usePrism,
                                    userDefinedParMod: userDefinedParMod ?? climateState.userDefinedParMod ?? DEFAULT_CLIMATE_STATE.userDefinedParMod,
                                }}
                            />
                            <ClimateFile
                                ref={climateFileRef}
                                state={{
                                    location: locationState,
                                    parId: parId ?? climateState.parId ?? DEFAULT_CLIMATE_STATE.parId,
                                    database: databaseVersion ?? climateState.database ?? DEFAULT_CLIMATE_STATE.database,
                                    cligenVersion: cligenVersion ?? climateState.cligenVersion ?? DEFAULT_CLIMATE_STATE.cligenVersion,
                                    inputYears: inputYears ?? climateState.inputYears ?? DEFAULT_CLIMATE_STATE.inputYears,
                                    usePrism: usePrism ?? climateState.usePrism ?? DEFAULT_CLIMATE_STATE.usePrism,
                                    userDefinedParMod: userDefinedParMod ?? climateState.userDefinedParMod ?? DEFAULT_CLIMATE_STATE.userDefinedParMod,
                                }}
                            />
                        </CollapsibleContent>
                    </Collapsible>
                </FieldSet>
            </section>
        );
    }
);
