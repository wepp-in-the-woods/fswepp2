// For the climate customization dialog
import * as React from "react";
import { useCallback, useEffect } from "react";
import { ClimateState, DEFAULT_CLIMATE_STATE, MONTH_NAMES } from "@/types/climate";
import { useSessionStorage } from "@/utils/session-storage";
import {useFormContext} from "react-hook-form";
import { useClimateExport } from '@/hooks/useClimateExport';
import { useClimateApply } from "@/hooks/useClimateApply";
import {apiPost} from "@/utils/api-client";

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { FileBracesCorner, ListRestart, Save, SquarePen } from "lucide-react";
import {Spinner} from "@/components/ui/spinner";

type ClimateCustomizationProps = {
    state: ClimateState;
    selectedStationLabel?: string;
    onChange?: (updates: Partial<ClimateState>) => void;
};

export type ClimateFileHandle = {
    validators: Array<() => Promise<boolean>>;
    setState: (next: Partial<ClimateState>) => void;
};

type ClimateDataTableProps = {
    title: string;
    acronym: string;
    unit: string;
    values: number[];
    currentValues?: number[];
    unitizerCategory?: string;
    unitizerUnit?: string;
    adjustKind?: "percent" | "offset";
    adjustCategory?: string;
    resetToken?: number;
};

const MonthTable: React.FC<ClimateDataTableProps> = (props) => {
    const { control, setValue } = useFormContext();
    const [adjustValue, setAdjustValue] = React.useState<number>();
    const [customValues, setCustomValues] = React.useState<number[]>(props.currentValues ?? props.values);
    const initialCustomValuesRef = React.useRef<number[]>([
        ...(props.currentValues ?? props.values),
    ]); // Store previous custom values for comparison

    useEffect(() => {
        // Apply adjustments to all values if adjust value changes
        if (adjustValue === undefined) return;
        const adjustedValues = initialCustomValuesRef.current.map((value, index) => {
            if (props.adjustKind == "percent") {
                return (value + (adjustValue / 100) * value);
            } else {
                return (value + adjustValue);
            }
        });
        setCustomValues(adjustedValues);
    }, [adjustValue]);

    useEffect(() => {
        MONTH_NAMES.forEach((month, index) => {
            const next = customValues[index];
            if (typeof next === "number" && !Number.isNaN(next)) {
                setValue(
                    `custom_${props.acronym}_${month.toLowerCase()}`,
                    Number(next.toFixed(2)),
                    { shouldDirty: false, shouldTouch: false, shouldValidate: false }
                );
            }
        });
    }, [customValues, setValue]);

    // Reset logic
    useEffect(() => {
        if (props.resetToken == undefined) return;

        const resetValues = [...initialCustomValuesRef.current];
        setCustomValues(resetValues);
        setAdjustValue(undefined);

        MONTH_NAMES.forEach((month, index) => {
            const next = resetValues[index];
            if (typeof next === "number" && !Number.isNaN(next)) {
                setValue(
                    `custom_${props.acronym}_${month.toLowerCase()}`,
                    Number(next.toFixed(2)),
                    { shouldDirty: false, shouldTouch: false, shouldValidate: false }
                );
            }
        });

        setValue(
            `custom_${props.acronym}_adjustment`,
            "",
            { shouldDirty: false, shouldTouch: false, shouldValidate: false }
        );
    }, [props.resetToken, setValue]);

    return (
        <div className="flex flex-col gap-2 w-full">
            <h4 className="font-semibold">
                {props.title}
            </h4>
            <Table className="border border-border table-fixed">
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[20%]">Month</TableHead>
                        <TableHead className="text-right w-[40%]">Original ({props.unit})</TableHead>
                        <TableHead className="text-right w-[40%]">Custom ({props.unit})</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {MONTH_NAMES.map((month: string, index: number) => {
                        return (
                            <TableRow key={month}>
                                <TableCell className="font-medium">{month}</TableCell>
                                <TableCell className="text-right">{props.values[index].toFixed(2)}</TableCell>
                                <TableCell className="text-right">
                                    <FormField
                                        control={control}
                                        name={`custom_${props.acronym}_${month.toLowerCase()}`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input
                                                        id={`custom_${props.acronym}_${month.toLowerCase()}`}
                                                        type="number"
                                                        inputMode="decimal"
                                                        step="0.01"
                                                        className="w-21 ml-auto"
                                                        data-unitizer-category = {props.unitizerCategory}
                                                        data-unitizer-unit = {props.unitizerUnit}
                                                        data-unitizer-precision = "2"
                                                        value={field.value ?? customValues[index]?.toFixed(2) ?? ""}
                                                        onChange={(e) => {
                                                            const raw = e.target.value;

                                                            const isTemperature = props.unitizerCategory === "temperature";
                                                            const validPattern = isTemperature
                                                                ? /^-?\d*(\.\d*)?$/
                                                                : /^\d*(\.\d*)?$/;

                                                            if (!validPattern.test(raw)) return;

                                                            if (
                                                                raw === "" ||
                                                                raw === "." ||
                                                                raw === "-" ||
                                                                raw === "-."
                                                            ) {
                                                                field.onChange(raw);
                                                                return;
                                                            }

                                                            const parsed = Number(raw);
                                                            if (!Number.isNaN(parsed)) field.onChange(parsed);
                                                        }}
                                                        onBlur={(e) => {
                                                            const parsed = Number(e.target.value);
                                                            field.onBlur();
                                                            if (!Number.isNaN(parsed)) {
                                                                const newValues = [...customValues];
                                                                newValues[index] = parsed;
                                                                setCustomValues(newValues);
                                                                field.onChange(parsed);
                                                            }
                                                        }}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
                <TableFooter>
                    <TableRow>
                        <TableCell colSpan={2}>Adjust all</TableCell>
                        <TableCell className="text-right">
                            <div className="flex items-center gap-2 justify-end">
                                <span className="text-sm font-semibold">+/-</span>
                                <FormField
                                    control={control}
                                    name={`custom_${props.acronym}_adjustment`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input
                                                    id={`custom_${props.acronym}_adjustment`}
                                                    type="number"
                                                    inputMode="decimal"
                                                    pattern="-?[0-9]+(\.[0-9]+)?"
                                                    className="w-24"
                                                    placeholder="0"
                                                    value={field.value ?? adjustValue ?? ""}
                                                    onChange={(e) => {
                                                        const raw = e.target.value;
                                                        if (["", "-", ".", "-."].includes(raw)) {
                                                            field.onChange(raw);
                                                            return;
                                                        }
                                                        const parsed = Number(raw);
                                                        if (!Number.isNaN(parsed)) field.onChange(parsed);
                                                    }}
                                                    onBlur={(e) => {
                                                        const parsed = Number(e.target.value);
                                                        field.onBlur();
                                                        if (!Number.isNaN(parsed)) {
                                                            setAdjustValue(parsed);
                                                            field.onChange(parsed);
                                                        }
                                                    }}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                {props.adjustKind == "percent" ?
                                    <span className="text-xs text-muted-foreground">%</span> :
                                    <span
                                        className="text-xs text-muted-foreground"
                                        data-unitizer-label = {props.unitizerCategory && props.unitizerUnit ? "" : undefined}
                                        data-unitizer-category = {props.unitizerCategory && props.unitizerUnit ? props.unitizerCategory : undefined}
                                        data-unitizer-unit = {props.unitizerCategory && props.unitizerUnit ? props.unitizerUnit : undefined}
                                    >
                                    {props.unit}
                                </span>
                                }
                            </div>
                        </TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
        </div>
    );
}



export const ClimateCustomization = React.forwardRef<ClimateFileHandle, ClimateCustomizationProps>(
    ({
         state,
         selectedStationLabel,
         onChange,
     },
     ref
    ) => {
        const { control, getValues } = useFormContext();

        // UI state
        const [climateCustomizationOpen, setClimateCustomizationOpen] = useSessionStorage(
            "rockclime_climate_customization_open",
            false
        );

        const [loadingMonthlies, setLoadingMonthlies] = React.useState<boolean>(false);
        const [resetToken, setResetToken] = React.useState<number>(0);

        const [originalMonthlies, setOriginalMonthlies] = React.useState<Record<string, any>>([]);

        const [customClimateDescription, setCustomClimateDescription] = React.useState<string>(
            () => state.userDefinedParMod?.description || selectedStationLabel || "Custom climate",
        );
        useEffect(() => {
            setCustomClimateDescription(state.userDefinedParMod?.description || selectedStationLabel || "Custom climate");
        }, [selectedStationLabel]);

        // Fetch monthlies data
        const fetchMonthlies = useCallback(async () => {
            if (!state.parId) return;
            try {
                setLoadingMonthlies(true);
                const payload: Record<string, any> = {
                    par_id: state.parId,
                    database: state.database,
                    use_prism: Boolean(state.usePrism),
                };
                if (state.location) payload.location = state.location;
                const response = await apiPost(
                    "/api/rockclim/GET/station_par_monthlies",
                    payload,
                    { timeoutMs: 20000 }
                );
                setOriginalMonthlies(response);
                console.log("[rockclim] Station monthlies", response);
            } catch (error) {
                console.error("[rockclim] Failed to load station monthlies", error);
            } finally {
                setLoadingMonthlies(false);
            }
        }, [state]);

        const { exportToJSON } = useClimateExport();

        const handleExport = useCallback(() => {
            const values = getValues();

            // Collect custom values from form
            const ppts = MONTH_NAMES.map((month) =>
                Number(values[`custom_ppt_${month.toLowerCase()}`]) || 0
            );
            const tmaxs = MONTH_NAMES.map((month) =>
                Number(values[`custom_tmax_${month.toLowerCase()}`]) || 0
            );
            const tmins = MONTH_NAMES.map((month) =>
                Number(values[`custom_tmin_${month.toLowerCase()}`]) || 0
            );

            exportToJSON(
                { ...state, userDefinedParMod: { description: customClimateDescription, ppts, tmaxs, tmins } },
                customClimateDescription,
                originalMonthlies
            );
        }, [getValues, exportToJSON, state, customClimateDescription, originalMonthlies]);

        const { applyChanges } = useClimateApply();

        // Collect custom values from form
        const collectCustomValues = useCallback(() => {
            const values = getValues();

            const ppts = MONTH_NAMES.map((month) =>
                Number(values[`custom_ppt_${month.toLowerCase()}`]) ?? 0
            ).filter(v => Number.isFinite(v));

            const tmaxs = MONTH_NAMES.map((month) =>
                Number(values[`custom_tmax_${month.toLowerCase()}`]) ?? 0
            ).filter(v => Number.isFinite(v));

            const tmins = MONTH_NAMES.map((month) =>
                Number(values[`custom_tmin_${month.toLowerCase()}`]) ?? 0
            ).filter(v => Number.isFinite(v));

            return { ppts, tmaxs, tmins };
        }, [getValues]);

        // Handle form submission (Apply Changes)
        const handleApplyChanges = useCallback(async () => {
            const customValues = collectCustomValues();

            if (
                !customValues.ppts.length ||
                !customValues.tmaxs.length ||
                !customValues.tmins.length
            ) {
                console.error('[climate-customization] Invalid monthly data for apply');
                return;
            }

            // Apply changes
            const updatedState = applyChanges(
                state,
                customClimateDescription,
                customValues
            );

            if (!updatedState) {
                console.error('[climate-customization] Failed to apply changes');
                return;
            }

            // Call parent onChange callback to notify of state update
            if (onChange) {
                onChange(updatedState);
                console.log('[climate-customization] State updated:', updatedState);
            }

            // setClimateCustomizationOpen(false);
        }, [collectCustomValues, applyChanges, state, customClimateDescription, onChange]);

        return (
            <Dialog
                open={climateCustomizationOpen}
                onOpenChange={(open) => {
                    setClimateCustomizationOpen(open);
                }}
            >
                <DialogTrigger asChild>
                    <Button
                        variant="outline"
                        disabled={loadingMonthlies}
                        onClick={() => {
                            void fetchMonthlies();
                            setClimateCustomizationOpen(true);
                        }}
                    >
                        {loadingMonthlies ? (
                            <>
                                <Spinner data-icon="inline-start" />
                                Loading
                            </>
                        ) : (
                            <>
                                <Icon icon={SquarePen} className="h-5 w-5"/>
                                Customize Climate
                            </>
                        )}
                    </Button>
                </DialogTrigger>
                {!loadingMonthlies && climateCustomizationOpen && (
                    <DialogContent className="xl:max-w-6xl">
                        <DialogHeader>
                            <DialogTitle>Customize climate parameters</DialogTitle>
                            <DialogDescription>
                                Station: {selectedStationLabel}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="-mx-4 max-h-[70vh] overflow-y-auto px-4 space-y-4">
                            <FormField
                                control={control}
                                name="rockclim_custom_desc"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel htmlFor="rockclim_custom_desc">
                                            Custom Climate Name
                                        </FormLabel>
                                        <FormControl>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    {...field}
                                                    value={field.value ?? customClimateDescription ?? ""}
                                                    id="rockclim_custom_desc"
                                                    type="text"
                                                    placeholder="Enter a custom climate name"
                                                    onChange={(e) => {
                                                        field.onChange(e.target.value);
                                                    }}
                                                    onBlur={(e) => {
                                                        field.onBlur();
                                                        setCustomClimateDescription(e.target.value);
                                                    }}
                                                />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {/*Tables*/}
                            <div className="flex flex-col lg:flex-row gap-4">
                                <MonthTable
                                    title="Monthly Precipitation (per wet day)"
                                    acronym="ppt"
                                    unit="mm"
                                    values={originalMonthlies.ppts || []}
                                    currentValues={state.userDefinedParMod?.ppts ?? originalMonthlies.ppts ?? []}
                                    unitizerCategory="xs-distance"
                                    unitizerUnit="mm"
                                    adjustKind="percent"
                                    adjustCategory="xs-distance"
                                    resetToken={resetToken}
                                />
                                <MonthTable
                                    title="Monthly Max Temperature"
                                    acronym="tmax"
                                    unit="°C"
                                    values={originalMonthlies.tmaxs || []}
                                    currentValues={state.userDefinedParMod?.tmaxs ?? originalMonthlies.tmaxs ?? []}
                                    unitizerCategory="temperature"
                                    unitizerUnit="degc"
                                    adjustKind="offset"
                                    adjustCategory="temperature"
                                    resetToken={resetToken}
                                />
                                <MonthTable
                                    title="Monthly Min Temperature"
                                    acronym="tmin"
                                    unit="°C"
                                    values={originalMonthlies.tmins || []}
                                    currentValues={state.userDefinedParMod?.tmins ?? originalMonthlies.tmins ?? []}
                                    unitizerCategory="temperature"
                                    unitizerUnit="degc"
                                    adjustKind="offset"
                                    adjustCategory="temperature"
                                    resetToken={resetToken}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <div className="flex w-full shrink flex-col justify-between gap-2 sm:flex-row">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleExport}
                                >
                                    <Icon icon={FileBracesCorner} className="h-5 w-5"/>
                                    Export to JSON
                                </Button>
                                <div className="flex shrink flex-col gap-2 sm:flex-row">
                                    <Button
                                        variant="outline"
                                        onClick={() => setResetToken((prev) => prev + 1)}
                                    >
                                        <Icon icon={ListRestart} className="h-5 w-5"/>
                                        Reset to Original
                                    </Button>
                                    <Button
                                        type="submit"
                                        onClick={() => {
                                            void handleApplyChanges();
                                            setClimateCustomizationOpen(false);
                                        }}
                                    >
                                        <Icon icon={Save} className="h-5 w-5"/>
                                        Apply Changes
                                    </Button>
                                    <DialogClose asChild>
                                        <Button variant="outline">Cancel</Button>
                                    </DialogClose>
                                </div>
                            </div>
                        </DialogFooter>
                    </DialogContent>
                )}
            </Dialog>
        );
    }
);

ClimateCustomization.displayName = "ClimateCustomization";