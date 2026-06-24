export type Location = {
    latitude: number | string;
    longitude: number | string;
};

export type UserDefinedParMod = {
    ppts: number[];
    tmins: number[];
    tmaxs: number[];
};

/** * Core climate state used across all RockClim components. * This is the canonical definition - use this everywhere. */
export type ClimateState = {
    database: string;
    cligenVersion: string;
    location: Location | null;
    parId: string | null;
    inputYears?: number | string;
    usePrism?: boolean;
    userDefinedParMod?: UserDefinedParMod | null;
};

// Export constants for reuse
export const DEFAULT_CLIMATE_STATE: ClimateState = {
    database: "legacy",
    cligenVersion: "5.3.2",
    location: {
        longitude: "",
        latitude: "",
    },
    parId: null,
    inputYears: 100,
    usePrism: false,
    userDefinedParMod: null,
};

export const ALLOWED_DATABASES = new Set(["legacy", "2015", "au", "ghcn"]);
export const ALLOWED_CLIGEN = new Set(["4.31", "4.30", "5.3.2"]);
export const PRISM_DATABASES = new Set([null, "legacy", "2015", "ghcn"]);

export const DATABASE_OPTIONS = [
    { value: "legacy", label: "Legacy" },
    { value: "2015", label: "2015" },
    { value: "au", label: "Australia" },
    { value: "ghcn", label: "GHCN" },
];

export const CLIGEN_OPTIONS = [
    { value: "5.3.2", label: "5.3.2" },
    { value: "4.31", label: "4.31" },
    { value: "4.30", label: "4.30 (legacy)" },
];

export const CLIMATE_COOKIE_NAME = "fswepp_climate";