import * as React from "react";
import { useFormContext } from "react-hook-form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
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
    FieldTitle,
} from "@/components/ui/field"
import {SoilPropertiesHandle} from "@/components/shared/SoilProperties";

const VEGETATION_OPTIONS = [
    { value: "forest", label: "Forest" },
    { value: "range", label: "Range" },
    { value: "chaparral", label: "Chaparral" },
];

const SEVERITY_OPTIONS = [
    { value: "high", label: "High" },
    { value: "moderate", label: "Moderate" },
    { value: "low", label: "Low" },
    { value: "unburned", label: "Unburned" },
];

function getDefaultCovers(vegetationType: string) {
    if (vegetationType === "range") {
        return { shrub: 15, grass: 75, bare: 10 };
    }
    if (vegetationType === "chaparral") {
        return { shrub: 80, grass: 0, bare: 20 };
    }
    return { shrub: null, grass: null, bare: null };
}

type VegetationBurnSeverityState = {
    vegetation_type: string;
    user_shrub_pct: number | null;
    user_grass_pct: number | null;
    user_bare_pct: number | null;
    burn_severity: string;
};

type VegetationBurnSeverityProps = {
    state: VegetationBurnSeverityState;
    idPrefix?: string;
    onChange?: (updates: Partial<VegetationBurnSeverityState>) => void;
};

export type VegetationBurnSeverityHandle = {
    validators: Array<() => boolean>;
    setState: (next: Partial<VegetationBurnSeverityState>) => void;
};

export const VegetationBurnSeverity = React.forwardRef<VegetationBurnSeverityHandle, VegetationBurnSeverityProps>(
    (
        {
            state,
            idPrefix = "ermit",
            onChange,
        },
        ref
    ) => {
        const { control, setValue, watch, setError, clearErrors } = useFormContext();
        const currentVegetation = watch(`${idPrefix}_vegetation`) || state.vegetation_type || "";
        const showPrefireFields = currentVegetation !== "" && currentVegetation !== "forest";
        const shrubValue = watch(`${idPrefix}_shrub_cover`);
        const grassValue = watch(`${idPrefix}_grass_cover`);

        React.useEffect(() => {
            if (currentVegetation === "forest") return;

            // Convert form strings to numbers safely
            const shrub = shrubValue !== "" && shrubValue !== undefined ? Number(shrubValue) : NaN;
            const grass = grassValue !== "" && grassValue !== undefined ? Number(grassValue) : NaN;

            if (Number.isFinite(shrub) && Number.isFinite(grass)) {
                const bare = 100 - shrub - grass;

                setValue(`${idPrefix}_bare_cover`, String(bare));
                clearErrors(`${idPrefix}_bare_cover`);

                onChange?.({
                    ...state, // Spread existing state to preserve vegetation types
                    user_shrub_pct: shrub,
                    user_grass_pct: grass,
                    user_bare_pct: bare,
                });
            } else {
                // Fallback if inputs are cleared or invalid numbers
                setValue(`${idPrefix}_bare_cover`, "");

                onChange?.({
                    ...state,
                    user_shrub_pct: Number.isFinite(shrub) ? shrub : null,
                    user_grass_pct: Number.isFinite(grass) ? grass : null,
                    user_bare_pct: null,
                });
            }
        }, [shrubValue, grassValue, currentVegetation, idPrefix, setValue, clearErrors, onChange]);

        const handleVegetationChange = (value: string, applyDefaults: boolean = true) => {
            let shrub: number | null = null;
            let grass: number | null = null;
            let bare: number | null = null;

            // Instead of updating UI inputs manually, calculate data objects
            if (value !== "forest" && applyDefaults) {
                const defaults = getDefaultCovers(value);
                shrub = defaults.shrub;
                grass = defaults.grass;
                bare = defaults.bare;
            }

            const shrubStr = shrub !== null && Number.isFinite(shrub) ? String(shrub) : "";
            const grassStr = grass !== null && Number.isFinite(grass) ? String(grass) : "";
            const bareStr  = bare !== null && Number.isFinite(bare) ? String(bare)  : "";

            // Sync changes down to react-hook-form context values instead of input elements
            setValue(`${idPrefix}_vegetation`, value);
            setValue(`${idPrefix}_shrub_cover`, shrubStr);
            setValue(`${idPrefix}_grass_cover`, grassStr);
            setValue(`${idPrefix}_bare_cover`, bareStr);

            // Clear layout errors instantly since the field states have changed
            clearErrors([
                `${idPrefix}_shrub_cover`,
                `${idPrefix}_grass_cover`,
                `${idPrefix}_bare_cover`
            ]);

            // Emit values back up to your parent tracking container immutably
            onChange?.({
                vegetation_type: value,
                user_shrub_pct: shrub,
                user_grass_pct: grass,
                user_bare_pct: bare,
            });
        };

        return (
            <section className="rounded-lg border border-border bg-card p-6 space-y-4">
                <h2 className="text-base font-semibold">Vegetation & Burn Severity</h2>

                {/*Vegetation Type*/}
                <FieldSet className="w-full">
                    <FieldLegend variant="label" htmlFor={`${idPrefix}_vegetation`}>
                        Vegetation Type
                    </FieldLegend>
                    <RadioGroup
                        value={currentVegetation ?? ""}
                        onValueChange={(value) => handleVegetationChange(value, true)}
                        className="flex flex-row gap-2"
                    >
                        {VEGETATION_OPTIONS.map((opt) => (
                            <FieldLabel
                                key={opt.value}
                                htmlFor={`${idPrefix}_vegetation_${opt.value}`}
                                className="flex-1"
                            >
                                <Field orientation="horizontal">
                                    <RadioGroupItem
                                        value={opt.value}
                                        id={`${idPrefix}_vegetation_${opt.value}`}
                                    />
                                    <FieldContent>
                                        <FieldTitle>{opt.label}</FieldTitle>
                                    </FieldContent>
                                </Field>
                            </FieldLabel>
                        ))}
                    </RadioGroup>
                </FieldSet>

                {showPrefireFields && (
                    <FieldSet className="w-full">
                        <FieldDescription>
                            Describe the pre-fire community composition for Range or Chaparral conditions.
                        </FieldDescription>
                        <FieldGroup className="flex flex-row md:flex-row gap-4">
                            {/*Shrub Cover*/}
                            <FormField
                                control={control}
                                name="user_shrub_pct"
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel htmlFor={`${idPrefix}_shrub_cover`}>
                                            Shrub Cover
                                        </FormLabel>
                                        <FormControl>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    id={`${idPrefix}_shrub_cover`}
                                                    type="number"
                                                    placeholder="0"
                                                    step="1"
                                                    min="0"
                                                    max="100"
                                                    value={state.user_shrub_pct !== null ? String(state.user_shrub_pct) : ""}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        const parsed = Number(value);
                                                        if (Number.isFinite(parsed)) {
                                                            state.user_shrub_pct = parsed;
                                                            onChange?.({ user_shrub_pct: state.user_shrub_pct });
                                                        }
                                                    }}
                                                    onBlur={(e) => {
                                                        field.onBlur();
                                                        // handleRockBlur();
                                                    }}
                                                />
                                                <span className="text-sm text-muted-foreground">%</span>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/*Grass Cover*/}
                            <FormField
                                control={control}
                                name="user_grass_pct"
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel htmlFor={`${idPrefix}_grass_cover`}>
                                            Grass Cover
                                        </FormLabel>
                                        <FormControl>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    id={`${idPrefix}_grass_cover`}
                                                    type="number"
                                                    placeholder="0"
                                                    step="1"
                                                    min="0"
                                                    max="100"
                                                    value={state.user_grass_pct !== null ? String(state.user_grass_pct) : ""}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        const parsed = Number(value);
                                                        if (Number.isFinite(parsed)) {
                                                            state.user_grass_pct = parsed;
                                                            onChange?.({ user_grass_pct: state.user_grass_pct });
                                                        }
                                                    }}
                                                    onBlur={(e) => {
                                                        field.onBlur();
                                                        // handleRockBlur();
                                                    }}
                                                />
                                                <span className="text-sm text-muted-foreground">%</span>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/*Bare Ground*/}
                            <FormField
                                control={control}
                                name="user_bare_pct"
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel htmlFor={`${idPrefix}_bare_cover`}>
                                            Shrub Cover
                                        </FormLabel>
                                        <FormControl>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    id={`${idPrefix}_bare_cover`}
                                                    type="number"
                                                    placeholder="0"
                                                    step="1"
                                                    readOnly={true}
                                                    aria-readonly="true"
                                                    className="bg-muted/40"
                                                    value={state.user_bare_pct !== null ? String(state.user_bare_pct) : ""}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        const parsed = Number(value);
                                                        if (Number.isFinite(parsed)) {
                                                            state.user_bare_pct = parsed;
                                                            onChange?.({ user_bare_pct: state.user_bare_pct });
                                                        }
                                                    }}
                                                    onBlur={(e) => {
                                                        field.onBlur();
                                                        // handleRockBlur();
                                                    }}
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
                )}

                {/*Soil Burn Severity*/}
                <FieldSet className="w-full">
                    <FieldLegend variant="label" htmlFor={`${idPrefix}_burn_severity`}>
                        Soil Burn Severity
                    </FieldLegend>
                    <RadioGroup
                        value={state.burn_severity ?? ""}
                        onValueChange={(value) => {
                            state.burn_severity = value;
                            onChange?.({ burn_severity: state.burn_severity });
                        }}
                        className="flex flex-row gap-2"
                    >
                        {SEVERITY_OPTIONS.map((opt) => (
                            <FieldLabel
                                key={opt.value}
                                htmlFor={`${idPrefix}_burn_${opt.value}`}
                                className="flex-1"
                            >
                                <Field orientation="horizontal">
                                    <RadioGroupItem
                                        value={opt.value}
                                        id={`${idPrefix}_burn_${opt.value}`}
                                    />
                                    <FieldContent>
                                        <FieldTitle>{opt.label}</FieldTitle>
                                    </FieldContent>
                                </Field>
                            </FieldLabel>
                        ))}
                    </RadioGroup>
                </FieldSet>
            </section>
        );
    }
);

VegetationBurnSeverity.displayName = "VegetationBurnSeverity";