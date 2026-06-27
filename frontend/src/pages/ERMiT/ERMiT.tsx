import { SidebarProvider, SidebarInset} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { Info } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import React from "react";
import {Button} from "@/components/ui/button";

import { RockClimeSettings } from "@/components/shared/RockClimeSettings/RockClimeSettings";
import { SoilProperties ,SoilPropertiesHandle } from "@/components/shared/SoilProperties";
import { VegetationBurnSeverity, VegetationBurnSeverityHandle } from "@/components/shared/VegetationBurnSeverity";
import { HillslopeGeometry, HillslopeGeometryHandle} from "@/components/shared/HillslopeGeometry";
import { SimulationOptions, SimulationOptionsHandle } from "@/components/shared/SimulationOptions";
import { readClimateState, writeClimateState} from "@/utils/climate-utils";
import { apiPost } from "@/utils/api-client";
import { useState } from "react";
import {MapSectionState} from "@/components/shared/RockClimeSettings/MapSection";
import {ClimateState} from "@/types/climate";

const formSchema = z.object({
    climate: z.object({
        parId: z.string(),
    }),
    ermitPars: z.object({
        topSlopePct: z.number().min(0).max(100),
        middleSlopePct: z.number().min(0).max(100),
        bottomSlopePct: z.number().min(0).max(100),
        hillslopeHorizontalLength: z.number(),
        soilTexture: z.string(),
        rockContentPct: z.number().min(0).max(100),
        isricEnabled: z.boolean(),
        vegetationType: z.string(),
        userShrubPct: z.number().min(0).max(100).nullable(),
        userGrassPct: z.number().min(0).max(100).nullable(),
        userBarePct: z.number().min(0).max(100).nullable(),
        burnSeverity: z.string(),
    }),
    sim_years: z.number().min(1).max(200),
    wepp_version: z.string(),
});

type FormFieldConfig = {
    name: keyof z.infer<typeof formSchema>;
    label: string;
    unit?: {
        SI: string;
        US: string;
    } | string;
    fieldInfo?: React.ReactNode;
}

const ERMiT = () => {
    const [climateState, setClimateState] = React.useState(() => readClimateState());
    const [isRunning, setIsRunning] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const soilPropsRef = React.useRef<SoilPropertiesHandle>(null);
    const vegBurnRef = React.useRef<VegetationBurnSeverityHandle>(null);
    const hillslopeGeomRef = React.useRef<HillslopeGeometryHandle>(null);
    const simOptionsRef = React.useRef<SimulationOptionsHandle>(null);
    // Initialize form with react-hook-form
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            ermitPars: {
                soilTexture: "clay",
                rockContentPct: 20,
                isricEnabled: false,
                vegetationType: "forest",
                userShrubPct: null,
                userGrassPct: null,
                userBarePct: null,
                burnSeverity: "low",
            },
            sim_years: 100,
            wepp_version: "wepp2010",
        },
    });

    React.useEffect(() => {
        const handleClimateChanged = (event: CustomEvent) => {
            const newState = event?.detail || readClimateState();
            setClimateState(newState);
        };

        document.addEventListener("fswepp:climate-changed", handleClimateChanged as EventListener);

        return () => {
            document.removeEventListener("fswepp:climate-changed", handleClimateChanged as EventListener);
        };
    }, []);

    // Handle form submission
    const onSubmit = (values: z.infer<typeof formSchema>) => {
        // Validate soil properties
        if (soilPropsRef.current?.validators[0]?.()) {
            console.log("Form submitted:", values);
            // Send to API
        } else {
            console.log("Soil properties validation failed");
        }
    };

    // Callback when soil properties change
    const handleSoilPropertiesChange = (updates: any) => {
        form.setValue("ermitPars.soilTexture", updates.soil_texture || form.getValues("ermitPars.soilTexture"));
        form.setValue("ermitPars.rockContentPct", updates.rfg_pct ?? form.getValues("ermitPars.rockContentPct"));
        form.setValue("ermitPars.isricEnabled", updates.isric_enabled ?? form.getValues("ermitPars.isricEnabled"));
    };

    // Callback when vegetation burn severity class changes
    const handleVegetationBurnSeverityChange = (updates: any) => {
        form.setValue("ermitPars.vegetationType", updates.vegetation_type ?? form.getValues("ermitPars.vegetationType"));
        form.setValue("ermitPars.userShrubPct", updates.user_shrub_pct ?? form.getValues("ermitPars.userShrubPct"));
        form.setValue("ermitPars.userGrassPct", updates.user_grass_pct ?? form.getValues("ermitPars.userGrassPct"));
        form.setValue("ermitPars.userBarePct", updates.user_bare_pct ?? form.getValues("ermitPars.userBarePct"));
        form.setValue("ermitPars.burnSeverity", updates.burn_severity ?? form.getValues("ermitPars.burnSeverity"));
    }

    // Callback when hillslope geometry changes
    const handleHillslopeGeometryChange = (updates: any) => {
        form.setValue("ermitPars.hillslopeHorizontalLength", updates.total_length_m ?? form.getValues("ermitPars.hillslopeHorizontalLength"));
        form.setValue("ermitPars.topSlopePct", updates.top_slope_pct ?? form.getValues("ermitPars.topSlopePct"));
        form.setValue("ermitPars.middleSlopePct", updates.mid_slope_pct ?? form.getValues("ermitPars.middleSlopePct"));
        form.setValue("ermitPars.bottomSlopePct", updates.bottom_slope_pct ?? form.getValues("ermitPars.bottomSlopePct"));
    }

    const handleSimOptionsChange = (updates: any) => {
        form.setValue("sim_years", updates.sim_years ?? form.getValues("sim_years"));
        form.setValue("wepp_version", updates.wepp_version ?? form.getValues("wepp_version"));
    }
    const handleRun = async () => {
        setError(null);

        // Validate climate state
        if (!climateState.parId) {
            setError("Select a climate station in Rock Climate Control.");
            return;
        }

        // Trigger all validators
        const validations = await Promise.all([
            soilPropsRef.current?.validators[0]?.() || true,
            vegBurnRef.current?.validators[0]?.() || true,
            hillslopeGeomRef.current?.validators[0]?.() || true,
            simOptionsRef.current?.validators[0]?.() || true,
        ]);

        if (!validations.every(Boolean)) {
            setError("Fix validation errors and retry.");
            return;
        }

        setIsRunning(true);

        const formValues = form.getValues();
        const payload = {
            climate: {
                database: climateState.database,
                par_id: climateState.parId,
                input_years: formValues.sim_years,
                cligen_version: climateState.cligenVersion,
                location: climateState.location,
                use_prism: climateState.usePrism,
                user_defined_par_mod: climateState.userDefinedParMod,
            },
            ermit_pars: {
                top_slope_pct: formValues.ermitPars.topSlopePct,
                middle_slope_pct: formValues.ermitPars.middleSlopePct,
                bottom_slope_pct: formValues.ermitPars.bottomSlopePct,
                length_m: formValues.ermitPars.hillslopeHorizontalLength,
                soil_texture: formValues.ermitPars.soilTexture,
                rfg_pct: formValues.ermitPars.rockContentPct,
                vegetation_type: formValues.ermitPars.vegetationType,
                burn_severity: formValues.ermitPars.burnSeverity,
                user_shrub_pct:
                    formValues.ermitPars.vegetationType === "forest"
                        ? null
                        : formValues.ermitPars.userShrubPct,
                user_grass_pct:
                    formValues.ermitPars.vegetationType === "forest"
                        ? null
                        : formValues.ermitPars.userGrassPct,
                user_bare_pct:
                    formValues.ermitPars.vegetationType === "forest"
                        ? null
                        : formValues.ermitPars.userBarePct,
            },
            wepp_version: formValues.wepp_version,
        };

        try {
            const response = await apiPost("/api/ermit/RUN/wepp", payload, {
                timeoutMs: 60000,
            });
            setResults(response);
        } catch (err: any) {
            setError(err?.message || "Unable to run ERMiT. Please try again.");
            console.error("[ermit] run failed", err);
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <AppHeader />
                <div className="page-container">
                    <div className="flex flex-row justify-between gap-3 px-4 lg:px-6 items-start">
                        <img src="/public/ermit-icon.svg" alt="ERMiT icon" className="w-16" />
                        <div className="flex w-full flex-col items-start gap-3">
                            <div className="flex flex-row items-center gap-3">
                                <h1 className="text-foreground">
                                    Erosion Risk Management Tool (ERMiT)
                                </h1>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Icon
                                            icon={Info}
                                            className="h-5 w-5 hover:cursor-pointer"
                                            title="Info"
                                        />
                                    </DialogTrigger>
                                    <DialogContent
                                        className="sm:max-w-prose"
                                        aria-describedby="about-rock-clime-dialog"
                                    >
                                        <DialogHeader>
                                            <DialogTitle>About ERMiT</DialogTitle>
                                        </DialogHeader>
                                        <DialogDescription className="flex flex-col gap-4 text-neutral-800">
					  <span>
						This version of ERMiT is based on the legacy
						version of ERMiT available at <br />
						<a
                            href="https://forest.moscowfsl.wsu.edu/cgi-bin/fswepp/ermit/ermit.pl"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline"
                        >
						  https://forest.moscowfsl.wsu.edu/cgi-bin/fswepp/ermit/ermit.pl
						</a>
					  </span>
                                            <span>
						<strong>Citation:</strong>
						<br />
						Robichaud, Peter R.; Elliot, William J.; Pierson, Fredrick B.; Hall, David E.; Moffet, Corey A. 2014. Erosion Risk Management Tool (ERMiT). [Online
						at{" "}
                                                <a
                                                    href="https://forest.moscowfsl.wsu.edu/fswepp/"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 underline"
                                                >
						  https://forest.moscowfsl.wsu.edu/fswepp/
						</a>
						].  Moscow, ID: U.S. Department of Agriculture, Forest Service, Rocky Mountain Research Station.
					  </span>
                                        </DialogDescription>
                                    </DialogContent>
                                </Dialog>
                            </div>
                            <p className="text-gray-700">
                                ERMiT allows users to predict the probability of a given amount of sediment delivery from the base of a hillslope following variable burns on forest, rangeland, and chaparral conditions in each of five years following wildfire.
                            </p>
                        </div>
                    </div>
                    <div className="@container flex flex-col gap-4 self-center px-4 py-2 lg:gap-6 lg:px-6 lg:py-6 w-full">
                        {/*Inputs*/}
                        <div className="flex flex-col xl:flex-row grow w-full gap-4 max-w-5xl self-center">
                            <Form {...form}>
                                <form
                                    onSubmit={form.handleSubmit(onSubmit)}
                                    className="w-full space-y-4"
                                >
                                    {/*Climate Station input*/}
                                    <RockClimeSettings
                                        idPrefix={"ermit"}
                                        // onChange={(updates: Partial<ClimateState>) =>
                                        //     writeClimateState((prev: any) => ({ ...prev, ...updates }))
                                        // }
                                    />

                                    {/*Soil Texture input*/}
                                    <SoilProperties
                                        ref={soilPropsRef}
                                        state={{
                                            soil_texture: form.watch("ermitPars.soilTexture") ?? "clay",
                                            rfg_pct: form.watch("ermitPars.rockContentPct") ?? 20,
                                            isric_enabled: form.watch("ermitPars.isricEnabled") ?? false,
                                        }}
                                        idPrefix="ermit"
                                        rfgMin={5}
                                        rfgMax={85}
                                        onChange={handleSoilPropertiesChange}
                                    />

                                    {/*Vegetation Type and Soil Burn Severity input*/}
                                    <VegetationBurnSeverity
                                        ref={vegBurnRef}
                                        state={{
                                            vegetation_type: form.watch("ermitPars.vegetationType") ?? "forest",
                                            user_shrub_pct: form.watch("ermitPars.userShrubPct") ?? null,
                                            user_grass_pct: form.watch("ermitPars.userGrassPct") ?? null,
                                            user_bare_pct: form.watch("ermitPars.userBarePct") ?? null,
                                            burn_severity: form.watch("ermitPars.burnSeverity") ?? "low",
                                        }}
                                        idPrefix="ermit"
                                        onChange={handleVegetationBurnSeverityChange}
                                    />

                                    {/*Hillslope Gradient and Length input*/}
                                    <HillslopeGeometry
                                        ref={hillslopeGeomRef}
                                        state={{
                                            total_length_m: form.watch("ermitPars.hillslopeHorizontalLength") ?? null,
                                            top_slope_pct: form.watch("ermitPars.topSlopePct") ?? null,
                                            mid_slope_pct: form.watch("ermitPars.middleSlopePct") ?? null,
                                            bottom_slope_pct: form.watch("ermitPars.bottomSlopePct") ?? null,
                                        }}
                                        idPrefix="ermit"
                                        onChange={handleHillslopeGeometryChange}
                                    />

                                    {/*Simulation Option*/}
                                    <SimulationOptions
                                        ref={simOptionsRef}
                                        state={{
                                            sim_years: form.watch("sim_years") ?? 100,
                                            show_years_field: false,
                                            wepp_version: form.watch("wepp_version") ?? "wepp2010",
                                            // checkbox: {
                                            //     id: "test",
                                            //     label: "test label",
                                            //     description: "test description"
                                            // }
                                        }}
                                        idPrefix="ermit"
                                        onChange={handleSimOptionsChange}
                                    />

                                    {/*Submit button*/}
                                    <Button
                                        type="button"
                                        onClick={handleRun}
                                        disabled={isRunning}
                                        className="w-full shrink cursor-pointer"
                                    >
                                        {isRunning ? "Running..." : "Run ERMiT Model"}
                                    </Button>

                                    {error && (
                                        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                                            {error}
                                        </div>
                                    )}
                                </form>
                            </Form>
                        </div>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
};

export default ERMiT;