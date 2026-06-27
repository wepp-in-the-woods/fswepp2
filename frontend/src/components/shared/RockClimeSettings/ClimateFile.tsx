// Cli file view and download
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
import { apiPost, createDebounce } from "@/utils/api-client";
import { useSessionStorage } from "@/utils/session-storage";
import { Icon } from "@/components/ui/icon";
import { Spinner } from "@/components/ui/spinner";
import { ClimateState } from "@/types/climate";
import { sanitizeFilename } from "@/utils/climate-utils";
import {StationParFileHandle} from "@/components/shared/RockClimeSettings/StationParFile";

type ClimateFileProps = {
    state: ClimateState;
}

export type ClimateFileHandle = {
    validators: Array<() => Promise<boolean>>;
    setState: (next: Partial<ClimateState>) => void;
};

type ClimateFileData = {
    text: string;
    filename: string;
    cacheKey: string | null;
    loading: boolean;
    error: string | null;
};

function buildClimateFileKey(state: ClimateState): string | null {
    if (!state.parId) return null;

    const locationKey = state.location
        ? `${state.location.longitude},${state.location.latitude}`
        : "";

    const modKey = state.userDefinedParMod
        ? `${state.userDefinedParMod.ppts.join(",")}|${state.userDefinedParMod.tmaxs.join(",")}|${state.userDefinedParMod.tmins.join(",")}`
        : "";

    const prismKey = state.usePrism ? "prism" : "base";

    const yearsKey = Number.isFinite(Number(state.inputYears))
        ? Number(state.inputYears)
        : "";

    return [
        state.database || "legacy",
        state.parId,
        prismKey,
        locationKey,
        modKey,
        state.cligenVersion || "",
        yearsKey,
    ].join("|");
}

function buildClimateFileFilename(parId: string | null, state: ClimateState): string {
    if (!parId) return "climate.cli";

    let baseId = sanitizeFilename(parId);
    if (baseId.toLowerCase().endsWith(".par")) {
        baseId = baseId.slice(0, -4);
    }
    const parts: string[] = [];
    if (state.userDefinedParMod) parts.push("customized");
    if (state.usePrism) parts.push("prism-modified");

    const prefix = parts.length ? `${parts.join("-")}-` : "";
    return `${prefix}${baseId || "station"}.cli`;
}

function getStatusMessage(
    parId: string | null,
    filename: string,
    loading: boolean,
    error: string | null
): string {
    if (!parId) return "Select a station to load the climate file.";
    if (loading) return "Loading climate file...";
    if (error) return `Error: ${error}`;
    return `Loaded ${filename}`;
}

export const ClimateFile = React.forwardRef<ClimateFileHandle, ClimateFileProps>(
    ({ state }, ref) => {
        const downloadLinkRef = useRef<HTMLAnchorElement>(null);
        const abortControllerRef = useRef<AbortController | null>(null);

        // UI state
        const [climateFileOpen, setClimateFileOpen] = useSessionStorage(
            "rockclime_climate_file_open",
            false
        );

        const [cliData, setCliData] = useState<ClimateFileData>({
            text: "",
            filename: "",
            cacheKey: null,
            loading: false,
            error: null,
        });

        const [climateBlobUrl, setClimateBlobUrl] = useState<string>("");

        const climateDownloadEnabled = !cliData.loading && !cliData.error && !!cliData.text;

        // Cleanup blob URL
        useEffect(() => {
            return () => {
                if (climateBlobUrl) URL.revokeObjectURL(climateBlobUrl);
            };
        }, []);

        // Update blob URL when text changes
        useEffect(() => {
            if (!cliData.text) {
                if (climateBlobUrl) URL.revokeObjectURL(climateBlobUrl);
                setClimateBlobUrl("");
                return;
            }

            if (climateBlobUrl) URL.revokeObjectURL(climateBlobUrl);
            const blob = new Blob([cliData.text], {
                type: "text/plain;charset=utf-8",
            });
            const newBlobUrl = URL.createObjectURL(blob);
            setClimateBlobUrl(newBlobUrl);
        }, [cliData.text]);

        // Fetch cli file
        const fetchCliFile = useCallback(async () => {
            const cacheKey = buildClimateFileKey(state);

            // Clear if no parId
            if (!cacheKey || !state.parId) {
                setCliData({
                    text: "",
                    filename: "",
                    cacheKey: null,
                    loading: false,
                    error: null,
                });
                return;
            }

            // Return if already cached
            if (cliData.cacheKey === cacheKey && cliData.text) {
                return;
            }

            // Abort previous request
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            abortControllerRef.current = new AbortController();

            setCliData((prev) => ({
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
                    "/api/rockclim/GET/climate",
                    payload,
                    { timeoutMs: 20000 }
                );

                const filename = buildClimateFileFilename(state.parId, state);
                setCliData({
                    text: typeof response === "string" ? response : "",
                    filename,
                    cacheKey,
                    loading: false,
                    error: null,
                });
            } catch (error) {
                console.error("[rockclim] Failed to load climate file", error);
                setCliData((prev) => ({
                    ...prev,
                    loading: false,
                    error: "Unable to load climate file.",
                    text: "",
                }));
            }
        }, [state]);

        const debouncedFetch = useCallback(
            createDebounce(fetchCliFile, 450),
            [fetchCliFile]
        );

        // Fetch when state changes
        useEffect(() => {
            if (state.parId) {
                debouncedFetch();
            } else {
                setCliData({
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
            if (!climateBlobUrl || !cliData.text || !downloadLinkRef.current) {
                return;
            }
            downloadLinkRef.current.href = climateBlobUrl;
            downloadLinkRef.current.download = cliData.filename;
        }, [climateBlobUrl, cliData.text, cliData.filename]);

        const handleDownload = (e: React.MouseEvent) => {
            e.preventDefault();
            if (climateDownloadEnabled && downloadLinkRef.current) {
                downloadLinkRef.current.click();
            }
        };
        return(
            <Collapsible
                className="w-full"
                open={climateFileOpen}
                onOpenChange={setClimateFileOpen}
            >
                <CollapsibleTrigger asChild className="text-base font-semibold">
                    <Button variant="ghost" className="group w-full h-auto p-0 has-[>svg]:p-0 hover:bg-transparent
    dark:hover:bg-transparent">
                        <div className="flex flex-col items-start">
                            <FieldLegend className="text-base font-semibold">
                                Climate File
                            </FieldLegend>
                            <FieldDescription>
                                Prefetch and download the generated climate .cli file.
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
                                    cliData.filename,
                                    cliData.loading,
                                    cliData.error
                                )}
                            </p>
                            <a ref={downloadLinkRef} aria-disabled={!climateDownloadEnabled}>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDownload}
                                    disabled={!climateDownloadEnabled}
                                >
                                    {cliData.loading ? (
                                        <>
                                            <Spinner data-icon="inline-start" />
                                            Loading
                                        </>
                                    ) : (
                                        <>
                                            <Icon icon={Download} className="h-5 w-5" />
                                            Download .cli
                                        </>
                                    )}
                                </Button>
                            </a>
                        </div>
                        {cliData.text && (
                            <pre
                                id="rockclim-station-cli"
                                className="rounded-lg border border-border bg-muted/20 p-3 text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-80 overflow-y-auto"
                            >
                                {cliData.text}
                            </pre>
                        )}
                    </div>
                </CollapsibleContent>
            </Collapsible>
        );
    }
);