import * as React from "react";
import {useFormContext} from "react-hook-form";
import {FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {AlertTriangle} from "lucide-react";
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
    FieldTitle,
} from "@/components/ui/field"

const FT_TO_M = 0.3048;
const BUFFER_DELTA_M = 0.1 * FT_TO_M;
const BUFFER_LENGTH_MIN_M = 1.0 * FT_TO_M;
const BUFFER_LENGTH_MAX_M = 1000 * FT_TO_M;

export type HillslopeGeometryState = {
    context: string; // ermit or fume
    total_length_m: number;
    buffer_length_m?: number;
    top_slope_pct: number;
    mid_slope_pct: number;
    bottom_slope_pct: number;
};

type HillslopeGeometryProps = {
    state: HillslopeGeometryState;
    idPrefix?: string;
    onChange?: (updates: Partial<HillslopeGeometryState>) => void;
};

export type HillslopeGeometryHandle = {
    validators: Array<() => Promise<boolean>>;
};

export const HillslopeGeometry = React.forwardRef<HillslopeGeometryHandle, HillslopeGeometryProps>(
    (
        {
            state,
            idPrefix = `${state.context}`,
            onChange
        },
        ref
    ) => {
        const { control, setValue, watch, trigger } = useFormContext();

        // 1. Watch raw values to compute real-time reactive UI dependencies
        const totalLength = watch(`${idPrefix}_total_length_m`) ?? 0;
        const totalLengthStep = state.context === "ermit" ? 0.1 : 0.01;
        const totalLengthMin = state.context === "ermit" ? 0 : (1.1 * FT_TO_M);
        const totalLengthMax = state.context === "ermit" ? 300 : (1500 * FT_TO_M);
        const bufferLength = watch(`${idPrefix}_buffer_length_m`) ?? 0;
        const topSlope = watch(`${idPrefix}_top_slope_pct`) ?? 0;
        const midSlope = watch(`${idPrefix}_mid_slope_pct`) ?? 0;
        const bottomSlope = watch(`${idPrefix}_bottom_slope_pct`) ?? 0;
        const slopeStep = state.context === "ermit" ? 0.001 : 0.1; // Default step based on context, can be overridden by state
        const slopeMin = state.context === "ermit" ? 0.001 : 0.5;
        const slopeMax = state.context === "ermit" ? 100 : 90;
        const showLengthDetail = state.context === "fume"; // Flags for FuME-specific UI
        const slopeWarningVisibility = state.context === "fume";

        // 2. Derive computed fields gracefully on every render cycle
        const treatedLength = Math.max(0, totalLength - bufferLength); // Relevant for FuME
        const showSlopeWarning = topSlope > 50 || midSlope > 50 || bottomSlope > 50; // Relevant for FuME

        // Expose validation triggers to parent if requested via forwardRef handles
        React.useImperativeHandle(ref, () => ({
            validators: [
                async () => {
                    return await trigger([
                        `${idPrefix}_total_length_m`,
                        `${idPrefix}_buffer_length_m`,
                        `${idPrefix}_top_slope_pct`,
                        `${idPrefix}_mid_slope_pct`,
                        `${idPrefix}_bottom_slope_pct`,
                    ]);
                },
            ],
        }));

        // 3. Keep upstream parent logic updated whenever input values mutate
        React.useEffect(() => {
            onChange?.({
                total_length_m: Number(totalLength),
                buffer_length_m: Number(bufferLength),
                top_slope_pct: Number(topSlope),
                mid_slope_pct: Number(midSlope),
                bottom_slope_pct: Number(bottomSlope),
            });
        }, [totalLength, bufferLength, topSlope, midSlope, bottomSlope, onChange]);

        // 4. Ported canonical blur correction algorithm
        const handleCoerceLengthsOnBlur = () => {
            let currentTotal = Number(totalLength);
            let currentBuffer = Number(bufferLength);

            if (!Number.isFinite(currentTotal) || !Number.isFinite(currentBuffer)) return;

            if (currentBuffer >= currentTotal) {
                currentBuffer = currentTotal - BUFFER_DELTA_M;
                if (currentBuffer < BUFFER_LENGTH_MIN_M) {
                    currentBuffer = BUFFER_LENGTH_MIN_M;
                    const minTotal = currentBuffer + BUFFER_DELTA_M;
                    if (currentTotal <= currentBuffer) {
                        currentTotal = Math.min(minTotal, totalLengthMax);
                    }
                }

                // Cleanly update react-hook-form fields context without direct DOM access
                setValue(`${idPrefix}_total_length_m`, Number(currentTotal.toFixed(4)));
                setValue(`${idPrefix}_buffer_length_m`, Number(currentBuffer.toFixed(4)));

                void trigger([`${idPrefix}_total_length_m`, `${idPrefix}_buffer_length_m`]);
            }
        };

        return (
            <section className="rounded-lg border border-border bg-card p-6 space-y-4">
                <h2 className="text-base font-semibold">Hillslope Geometry</h2>

                {/* Distance Grid */}
                <FieldSet className="w-full">
                    <FieldGroup className="grid gap-4 md:grid-cols-2">
                        {/* Total Length Field */}
                        <FormField
                            control={control}
                            name={`${idPrefix}_total_length_m`}
                            rules={{
                                required: "Total hillslope length is required",
                                min: {
                                    value: Number(totalLengthMin.toFixed(4)),
                                    message: `Total hillslope length must be at least ${totalLengthMin.toFixed(4)} m`
                                },
                                max: {
                                    value: Number(totalLengthMax.toFixed(1)),
                                    message: `Total hillslope length cannot exceed ${totalLengthMax.toFixed(1)} m`
                                }
                            }}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel htmlFor={`${idPrefix}_total_length_m`}>
                                        Total Hillslope Horizontal Length
                                    </FormLabel>
                                    <FormControl>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                {...field}
                                                type="number"
                                                step={`${totalLengthStep}`}
                                                onBlur={(e) => {
                                                    field.onBlur();
                                                    handleCoerceLengthsOnBlur();
                                                }}
                                            />
                                            <span className="text-sm text-muted-foreground">m</span>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Buffer Length Field */}
                        {showLengthDetail && (
                            <FormField
                                control={control}
                                name={`${idPrefix}buffer_length_m`}
                                rules={{
                                    required: "Buffer length is required",
                                    min: {
                                        value: Number(BUFFER_LENGTH_MIN_M.toFixed(4)),
                                        message: `Buffer length must be at least ${BUFFER_LENGTH_MIN_M.toFixed(4)} m`
                                    },
                                    max: {
                                        value: Number(BUFFER_LENGTH_MAX_M.toFixed(1)),
                                        message: `Buffer length cannot exceed ${BUFFER_LENGTH_MAX_M.toFixed(1)} m`
                                    }
                                }}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Buffer Length</FormLabel>
                                        <FormControl>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    {...field}
                                                    type="number"
                                                    step="0.01"
                                                    onBlur={(e) => {
                                                        field.onBlur();
                                                        handleCoerceLengthsOnBlur();
                                                    }}
                                                />
                                                <span className="text-sm text-muted-foreground">m</span>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                        
                        {/* Derived Treated Length Field (ReadOnly) */}
                        {showLengthDetail && (
                            <FormItem className="md:col-span-2">
                                <FormLabel>Treated Hillslope Length</FormLabel>
                                <FormControl>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            readOnly
                                            value={treatedLength.toFixed(2)}
                                            className="bg-muted/30 select-none cursor-not-allowed"
                                        />
                                        <span className="text-sm text-muted-foreground">m</span>
                                    </div>
                                </FormControl>
                            </FormItem>
                        )}
                    </FieldGroup>

                    {/* Slope Grid */}
                    <FieldGroup className="flex flex-row md:flex-row gap-4">
                        {/* Top Slope */}
                        <FormField
                            control={control}
                            name={`${idPrefix}top_slope_pct`}
                            rules={{
                                required: "Top slope is required",
                                min: { value: slopeMin, message: `Top slope must be at least ${slopeMin}%` },
                                max: { value: slopeMax, message: `Top slope cannot exceed ${slopeMax}%` }
                            }}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Top slope</FormLabel>
                                    <FormControl>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                {...field}
                                                type="number"
                                                step={`${slopeStep}`}
                                            />
                                            <span className="text-sm text-muted-foreground">%</span>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Middle Slope */}
                        <FormField
                            control={control}
                            name={`${idPrefix}mid_slope_pct`}
                            rules={{
                                required: "Middle slope is required",
                                min: { value: slopeMin, message: `Middle slope must be at least ${slopeMin}%` },
                                max: { value: slopeMax, message: `Middle slope cannot exceed ${slopeMax}%` }
                            }}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Middle slope</FormLabel>
                                    <FormControl>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                {...field}
                                                type="number"
                                                step={`${slopeStep}`}
                                            />
                                            <span className="text-sm text-muted-foreground">%</span>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Bottom Slope */}
                        <FormField
                            control={control}
                            name={`${idPrefix}bottom_slope_pct`}
                            rules={{
                                required: "Bottom slope is required",
                                min: { value: slopeMin, message: `Bottom slope must be at least ${slopeMin}%` },
                                max: { value: slopeMax, message: `Bottom slope cannot exceed ${slopeMax}%` }
                            }}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Bottom slope</FormLabel>
                                    <FormControl>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                {...field}
                                                type="number"
                                                step={`${slopeStep}`}
                                            />
                                            <span className="text-sm text-muted-foreground">%</span>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </FieldGroup>
                </FieldSet>

                {/* Reactive Slope Warning Alert Box */}
                {slopeWarningVisibility && showSlopeWarning && (
                    <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-4 w-4 stroke-amber-600 dark:stroke-amber-400" />
                        <AlertTitle>Steep Slope Warning</AlertTitle>
                        <AlertDescription>
                            Hillslopes with greater than 50% gradient may be prone to mass failure.
                        </AlertDescription>
                    </Alert>
                )}
            </section>
        );
    }
);

HillslopeGeometry.displayName = "HillslopeGeometry";