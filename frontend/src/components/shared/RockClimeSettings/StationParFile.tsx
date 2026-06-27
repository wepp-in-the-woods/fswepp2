import * as React from "react";
import { useEffect, useState, useRef, useCallback } from "react";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { FieldDescription, FieldLegend } from "@/components/ui/field";
import { ChevronDown, Download } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { Spinner } from "@/components/ui/spinner";
import { apiPost, createDebounce } from "@/utils/api-client";
import { useSessionStorage } from "@/utils/session-storage";
import { ClimateState } from "@/types/climate";
import { sanitizeFilename } from "@/utils/climate-utils";

type StationParFileProps = {
    state: ClimateState;
};

export type StationParFileHandle = {
    validators: Array<() => Promise<boolean>>;
    setState: (next: Partial<ClimateState>) => void;
};

type ParFileData = {
    text: string;
    filename: string;
    cacheKey: string | null;
    loading: boolean;
    error: string | null;
};

function buildStationParKey(state: ClimateState): string | null {
    if (!state.parId) return null;

    const locationKey = state.location
        ? `${state.location.longitude},${state.location.latitude}`
        : "";

    const modKey = state.userDefinedParMod
        ? `${state.userDefinedParMod.ppts.join(",")}|${state.userDefinedParMod.tmaxs.join(",")}|${state.userDefinedParMod.tmins.join(",")}`
        : "";

    const prismKey = state.usePrism ? "prism" : "base";

    return [
        state.database || "legacy",
        state.parId,
        prismKey,
        locationKey,
        modKey,
    ].join("|");
}

function buildStationParFilename(parId: string | null, state: ClimateState): string {
    if (!parId) return "station.par";

    let baseId = sanitizeFilename(parId);
    if (baseId.toLowerCase().endsWith(".par")) {
        baseId = baseId.slice(0, -4);
    }

    const parts: string[] = [];
    if (state.userDefinedParMod) parts.push("customized");
    if (state.usePrism) parts.push("prism-modified");

    const prefix = parts.length ? `${parts.join("-")}-` : "";
    return `${prefix}${baseId}.par`;
}

function getStatusMessage(
    parId: string | null,
    filename: string,
    loading: boolean,
    error: string | null
): string {
    if (!parId) return "Select a station to load the .par file.";
    if (loading) return "Loading station .par file...";
    if (error) return `Error: ${error}`;
    return `Loaded ${filename}`;
}

export const StationParFile = React.forwardRef<StationParFileHandle, StationParFileProps>(
    ({ state }, ref) => {
        const downloadLinkRef = useRef<HTMLAnchorElement>(null);
        const abortControllerRef = useRef<AbortController | null>(null);

        // UI state
        const [stationParFileOpen, setStationParFileOpen] = useSessionStorage(
            "rockclime_station_par_file_open",
            false
        );

        const [parData, setParData] = useState<ParFileData>({
            text: "",
            filename: "",
            cacheKey: null,
            loading: false,
            error: null,
        });

        const [stationParBlobUrl, setStationParBlobUrl] = useState<string>("");

        const stationParDownloadEnabled = !parData.loading && !parData.error && !!parData.text;

        // Cleanup blob URL
        useEffect(() => {
            return () => {
                if (stationParBlobUrl) URL.revokeObjectURL(stationParBlobUrl);
            };
        }, []);

        // Update blob URL when text changes
        useEffect(() => {
            if (!parData.text) {
                if (stationParBlobUrl) URL.revokeObjectURL(stationParBlobUrl);
                setStationParBlobUrl("");
                return;
            }

            if (stationParBlobUrl) URL.revokeObjectURL(stationParBlobUrl);
            const blob = new Blob([parData.text], {
                type: "text/plain;charset=utf-8",
            });
            const newBlobUrl = URL.createObjectURL(blob);
            setStationParBlobUrl(newBlobUrl);
        }, [parData.text]);

        // Fetch PAR file
        const fetchParFile = useCallback(async () => {
            const cacheKey = buildStationParKey(state);

            // Clear if no parId
            if (!cacheKey || !state.parId) {
                setParData({
                    text: "",
                    filename: "",
                    cacheKey: null,
                    loading: false,
                    error: null,
                });
                return;
            }

            // Return if already cached
            if (parData.cacheKey === cacheKey && parData.text) {
                return;
            }

            // Abort previous request
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            abortControllerRef.current = new AbortController();

            setParData((prev) => ({
                ...prev,
                loading: true,
                error: null,
                text: "",
            }));

            try {
                const payload: Record<string, any> = {
                    par_id: state.parId,
                    database: state.database,
                    use_prism: Boolean(state.usePrism),
                };
                if (state.location) payload.location = state.location;
                if (state.userDefinedParMod) {
                    payload.user_defined_par_mod = state.userDefinedParMod;
                }

                const response = await apiPost(
                    "/api/rockclim/GET/station_par",
                    payload,
                    { timeoutMs: 20000 }
                );

                const filename = buildStationParFilename(state.parId, state);
                setParData({
                    text: typeof response === "string" ? response : "",
                    filename,
                    cacheKey,
                    loading: false,
                    error: null,
                });
            } catch (error) {
                console.error("[rockclim] Failed to load station par file", error);
                setParData((prev) => ({
                    ...prev,
                    loading: false,
                    error: "Unable to load station .par file.",
                    text: "",
                }));
            }
        }, [state]);

        const debouncedFetch = useCallback(
            createDebounce(fetchParFile, 450),
            [fetchParFile]
        );

        // Fetch when state changes
        useEffect(() => {
            if (state.parId) {
                debouncedFetch();
            } else {
                setParData({
                    text: "",
                    filename: "",
                    cacheKey: null,
                    loading: false,
                    error: null,
                });
            }
        }, [state, debouncedFetch]);

        // Update download link
        useEffect(() => {
            if (!stationParBlobUrl || !parData.text || !downloadLinkRef.current) {
                return;
            }
            downloadLinkRef.current.href = stationParBlobUrl;
            downloadLinkRef.current.download = parData.filename;
        }, [stationParBlobUrl, parData.text, parData.filename]);

        const handleDownload = (e: React.MouseEvent) => {
            e.preventDefault();
            if (stationParDownloadEnabled && downloadLinkRef.current) {
                downloadLinkRef.current.click();
            }
        };

        return (
            <Collapsible
                className="w-full"
                open={stationParFileOpen}
                onOpenChange={setStationParFileOpen}
            >
                <CollapsibleTrigger asChild className="text-base font-semibold">
                    <Button variant="ghost" className="group w-full h-auto p-0 has-[>svg]:p-0 hover:bg-transparent
    dark:hover:bg-transparent">
                        <div className="flex flex-col items-start">
                            <FieldLegend className="text-base font-semibold">
                                Station Par File
                            </FieldLegend>
                            <FieldDescription>
                                Prefetch and download the current station .par file.
                            </FieldDescription>
                        </div>
                        <ChevronDown className="ml-auto group-data-[state=open]:rotate-180" />
                    </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 space-y-4">
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm text-muted-foreground">
                                {getStatusMessage(
                                    state.parId,
                                    parData.filename,
                                    parData.loading,
                                    parData.error
                                )}
                            </p>
                            <a ref={downloadLinkRef} aria-disabled={!stationParDownloadEnabled}>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDownload}
                                    disabled={!stationParDownloadEnabled}
                                >
                                    {parData.loading ? (
                                        <>
                                            <Spinner data-icon="inline-start" />
                                            Loading
                                        </>
                                    ) : (
                                        <>
                                            <Icon icon={Download} className="h-5 w-5" />
                                            Download .par
                                        </>
                                    )}
                                </Button>
                            </a>
                        </div>
                        {parData.text && (
                            <pre
                                id="rockclim-station-par"
                                className="rounded-lg border border-border bg-muted/20 p-3 text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-80 overflow-y-auto"
                            >
                                {parData.text}
                            </pre>
                        )}
                    </div>
                </CollapsibleContent>
            </Collapsible>
        )
    }
);

StationParFile.displayName = "StationParFile";