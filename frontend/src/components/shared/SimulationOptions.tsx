import * as React from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
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
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
} from "@/components/ui/field"
import {writeClimateState} from "@/utils/climate-utils";

const WEPP_VERSION_OPTIONS = [
    { value: "wepp2010", label: "WEPP 2010" },
    { value: "wepp_dcc52a6_hill", label: "WEPP dcc52a6 hill" },
];

export type SimulationOptionsState = {
    sim_years?: number;
    show_years_field?: boolean;
    wepp_version: string;
    checkbox?: {
        id: string;
        label: string;
        description?: string;
    };
};

type SimulationOptionsProps = {
    state: SimulationOptionsState;
    idPrefix: string;
    onChange?: (updates: Partial<SimulationOptionsState>) => void;
};

export type SimulationOptionsHandle = {
    validators: Array<() => Promise<boolean>>;
    setState: (next: Partial<SimulationOptionsState>) => void;
};

export const SimulationOptions = React.forwardRef<SimulationOptionsHandle, SimulationOptionsProps>(
    (
        {
            state,
            idPrefix,
            onChange,
        },
        ref
    ) => {
        const { control, watch, trigger, setValue } = useFormContext();

        const simYears = watch(`${idPrefix}_sim_years`);
        const show_years_field = state.show_years_field ?? true;
        const activeWeppVersion = watch(`${idPrefix}_wepp_version`);
        const showCheckbox = state.checkbox !== undefined;
        const checkboxState = state.checkbox ? watch(`${idPrefix}_${state.checkbox.id}`) : undefined;

        // Expose form-group triggers back up to parent's multi-component orchestrator
        React.useImperativeHandle(ref, () => ({
            validators: [
                async () => {
                    const fieldsToValidate = [];
                    if (show_years_field) fieldsToValidate.push(`${idPrefix}_sim_years`);
                    fieldsToValidate.push(`${idPrefix}_wepp_version`);
                    if (state.checkbox) fieldsToValidate.push(`${idPrefix}_${state.checkbox.id}`);

                    return await trigger(fieldsToValidate);
                },
            ],
            setState: (next) => {
                if (next.sim_years !== undefined) {
                    setValue(`${idPrefix}_sim_years`, next.sim_years);
                }
                if (next.wepp_version !== undefined) {
                    setValue(`${idPrefix}_wepp_version`, next.wepp_version);
                }
                if (state.checkbox && next.checkbox?.id !== undefined) {
                    setValue(`${idPrefix}_${state.checkbox.id}`, !!next.checkbox?.id);
                }
            }
        }));

        //Keep upstream parent tracking logic synchronized via side-effect loops
        React.useEffect(() => {
            const updates: Partial<SimulationOptionsState> = {};

            if (show_years_field && simYears !== undefined) {
                updates.sim_years = simYears != null ? Number(simYears) : state.sim_years;
            }
            if (activeWeppVersion !== undefined) {
                updates.wepp_version = activeWeppVersion;
            }
            if (showCheckbox && checkboxState !== undefined) {
                updates.checkbox = state.checkbox;
            }

            if (Object.keys(updates).length > 0) {
                onChange?.(updates);
            }
            onChange?.(updates);
        }, [simYears, activeWeppVersion, checkboxState, show_years_field, state.checkbox, onChange]);

        return (
            <section className="rounded-lg border border-border bg-card p-6 space-y-4">
                <FieldSet className="w-full">
                    <FieldLegend className="text-base font-semibold">
                        Simulation Options
                    </FieldLegend>
                    <FieldGroup className="grid gap-4 md:grid-cols-2 items-start">
                        {/* Simulation Years Field */}
                        {show_years_field && (
                            <FormField
                                control={control}
                                name={`${idPrefix}_sim_years`}
                                rules={{
                                    required: "Simulation years value is required",
                                    min: { value: 1, message: "Simulation run must be at least 1 year" }
                                }}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel htmlFor={`${idPrefix}_sim_years`}>Simulation Years</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                id={`${idPrefix}_sim_years`}
                                                type="number"
                                                step="1"
                                                value={field.value ?? state.sim_years ?? ""}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {/* WEPP Version Select Field */}
                        <FormField
                            control={control}
                            name={`${idPrefix}_wepp_version`}
                            render={({ field }) => (
                                <FormItem className="w-full">
                                    <FormLabel htmlFor={`${idPrefix}_wepp_version`}>WEPP Version</FormLabel>
                                    <FormControl>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value ?? state.wepp_version ?? ""}
                                        >
                                            <SelectTrigger id={`${idPrefix}_wepp_version`} className="w-full">
                                                <SelectValue placeholder="Select version" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {WEPP_VERSION_OPTIONS.map((option) => (
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

                        {/* Optional Checkbox Field (Renders full-width below the grid) */}
                        {showCheckbox && (
                            <FormField
                                control={control}
                                name={`${idPrefix}_${state.checkbox?.id}`}
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start gap-3">
                                        <FormControl>
                                            <Checkbox
                                                id={`${idPrefix}_${state.checkbox?.id}`}
                                                checked={Boolean(field.value)}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FieldContent className="gap-1">
                                            <FieldLabel htmlFor={`${idPrefix}_${state.checkbox?.id}`}>
                                                {state.checkbox?.label}
                                            </FieldLabel>
                                            {state.checkbox?.description && (
                                                <FieldDescription>{state.checkbox.description}</FieldDescription>
                                            )}
                                        </FieldContent>
                                    </FormItem>
                                )}
                            />
                        )}
                    </FieldGroup>
                </FieldSet>
            </section>
        );
    }
);

SimulationOptions.displayName = "SimulationOptions";