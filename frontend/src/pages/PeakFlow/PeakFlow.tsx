import React, { useEffect, useState } from "react";
import { useWatch } from "react-hook-form";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { useUnits, useConversions } from "@/hooks/use-units.ts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button";
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
// import StormRunoffInfo from "@/pages/PeakFlow/PeakFlowFieldsInfo";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon.tsx";
import { Info, HelpCircle } from "lucide-react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { PeakFlowInputs, PeakFlowResults, calculatePeakFlow, estimateCN, calculateTc } from "@/pages/PeakFlow/peakFlowCalculations";

const formSchema = z.object({
  description: z.string()
    .min(2, "Description should be longer than 2 characters."),
  stormRunoff: z.object({
    SI: z.number().gt(0),
    US: z.number().gt(0),
  }).refine((data) => data.SI > 0 && data.US > 0, {
    message: "Storm Runoff should be greater than 0.",
  }),
  stormPrecipitation: z.object({
    SI: z.number().gt(0),
    US: z.number().gt(0),
  }).refine((data) => data.SI > 0 && data.US > 0, {
    message: "Storm Precipitation should be greater than 0.",
  }),
  watershedArea: z.object({
    SI: z.number().gt(0),
    US: z.number().gt(0),
  }).refine((data) => data.SI > 0 && data.US > 0, {
    message: "Watershed Area should be greater than 0.",
  }),
  watershedFlowLength: z.object({
    SI: z.number().gt(0),
    US: z.number().gt(0),
  }).refine((data) => data.SI > 0 && data.US > 0, {
    message: "Watershed Flow Length should be greater than 0.",
  }),
  avgWatershedGradient: z.object({
    SI: z.number().min(0).max(100),
    US: z.number().min(0).max(100),
  }).refine((data) => data.SI >= 0 && data.SI <= 100 && data.US > 0 && data.US <= 100, {
    message: "Average Watershed Gradient should be between 0 and 100.",
  }),
  curveNumber: z.number()
    .min(15, "Curve number should be greater than or equal to 15.")
    .max(100, "Curve number should be less than or equal to 100."),
  curveNumberEstimate: z.number(),
  timeOfConcentration: z.number()
    .min(0.1, "Time of Concentration should be greater than or equal to 0.1 hours.")
    .max(10, "Time of Concentration should be less than or equal to 10 hours."),
  timeOfConcentrationDrySoil: z.number(),
  pondingAdjustmentFactor: z.number()
    .min(0, "Ponding Adjustment Factor should be greater than or equal to 0.")
    .max(1, "Ponding Adjustment Factor should be less than or equal to 1."),
  culvertDistance: z.object({
    SI: z.number().min(1).max(60),
    US: z.number(),
  }).refine((data) => data.SI >= 1 && data.SI <= 60, {
    message: "Culvert Distance should be between 1 and 60 meters. (3.2 and 197 feet).",
  }),
});

type FormFieldConfig = {
  name: keyof z.infer<typeof formSchema>;
  label: string;
  abbreviation?: string;
  type?: string;
  placeholder?: string;
  description?: string;
  unit?: {
    SI: string;
    US: string;
  } | string;
}

const PeakFlow = () => {
  const { units } = useUnits();
  const { convert } = useConversions();

  const defaultValues = {
    description: "",
    stormRunoff: {
      SI: 0,
      US: 0,
    },
    stormPrecipitation: {
      SI: 0,
      US: 0,
    },
    watershedArea: {
      SI: 0,
      US: 0,
    },
    watershedFlowLength: {
      SI: 0,
      US: 0,
    },
    avgWatershedGradient: {
        SI: 0,
        US: 0,
    },
    curveNumber: 90,
    curveNumberEstimate: 90,
    timeOfConcentration: 10,
    timeOfConcentrationDrySoil: 0.56,
    pondingAdjustmentFactor: 1,
    culvertDistance: {
      SI: 1.83,
      US: 6.0,
    },
  }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues,
  });

  // Mica Creek data in metric
  const micaCreekData = {
    description: "Severe wildfire in a watershed in the Mica Creek Experimental Forest, Northern Idaho",
    stormRunoff: {
      SI: 26.5,
      US: 1.04,
    },
    stormPrecipitation: {
      SI: 49.3,
      US: 1.94,
    },
    watershedArea: {
      SI: 575,
      US: 1420.4,
    },
    watershedFlowLength: {
      SI: 2572,
      US: 8438.3,
    },
    avgWatershedGradient: {
      SI: 0.133,
      US: 0.133,
    },
    curveNumber: 90,
    curveNumberEstimate: 90,
    timeOfConcentration: 10,
    timeOfConcentrationDrySoil: 0.56,
    pondingAdjustmentFactor: 1,
    culvertDistance: {
      SI: 1.83,
      US: 6.0,
    },
  }

  const formFields: FormFieldConfig[] = [
    // Basic Information
    {
      name: "description",
      label: "Description",
      type: "text",
      placeholder: "Enter a description",
      description: "Enter a description for the peak flow calculation",
    },

    // ERMiT Data (Required inputs from external tool)
    {
      name: "stormRunoff",
      label: "Storm Runoff",
      type: "number",
      abbreviation: "Q",
      placeholder: "0.0",
      description: "Storm runoff from ERMiT analysis",
      unit: { SI: "mm", US: "in" },
    },
    {
      name: "stormPrecipitation",
      label: "Storm Precipitation",
      type: "number",
      abbreviation: "P",
      placeholder: "0.0",
      description: "If Q > P, use P ~ 2Q",
      unit: { SI: "mm", US: "in" },
    },

    // Watershed Physical Characteristics (from wepp.cloud or manual)
    {
      name: "watershedArea",
      label: "Watershed Area",
      type: "number",
      abbreviation: "A",
      placeholder: "0.0",
      description: "Watershed area above the structure of interest or watershed outlet. ",
      unit: { SI: "ha", US: "ac" },
    },
    {
      name: "watershedFlowLength",
      label: "Watershed Flow Length",
      type: "number",
      abbreviation: "L",
      placeholder: "0.0",
      description: "Watershed flow length is the horizontal distance from the top of the watershed to the structure or watershed outlet of interest.",
      unit: { SI: "m", US: "ft" },
    },
    {
      name: "avgWatershedGradient",
      label: "Average Watershed Gradient",
      type: "number",
      abbreviation: "Sg",
      placeholder: "0.0",
      description: "Average watershed gradient",
      unit: { SI: "m/m", US: "ft/ft" },
    },

    // Hydrologic Parameters (Manual entry with estimation tools)
    {
      name: "curveNumber",
      label: "Curve Number",
      type: "number",
      abbreviation: "CN",
      placeholder: "90",
      description: "Curve number from wepp.cloud",
    },
    {
      name: "timeOfConcentration",
      label: "Time of Concentration",
      type: "number",
      abbreviation: "Tc",
      placeholder: "10.0",
      description: "The theoretical time it takes a drop of rainwater to travel from the top of the watershed to the watershed outlet. ",
      unit: "hr",
    },

    // Flow Routing Adjustments
    {
      name: "pondingAdjustmentFactor",
      label: "Ponding Adjustment Factor",
      type: "number",
      abbreviation: "Fp",
      placeholder: "1.0",
      description: "The ponding adjustment factor is for standing water, bog, pond, or swamp.",
    },

    // Infrastructure Design
    {
      name: "culvertDistance",
      label: "Culvert Height",
      type: "number",
      abbreviation: "h",
      placeholder: units === "imperial" ? "6.0" : "1.83",
      description: "Distance from culvert center to 1ft below road surface",
      unit: { SI: "m", US: "ft" },
    }
  ]

  // const peakFlowInputsSI: PeakFlowInputs = {
  //   Q: form.watch("stormRunoff.SI"),
  //   P: form.watch("stormPrecipitation.SI"),
  //   A: form.watch("watershedArea.SI"),
  //   L: form.watch("watershedFlowLength.SI"),
  //   Sg: form.watch("avgWatershedGradient.SI"),
  //   Tc: form.watch("timeOfConcentration"),
  //   CN: form.watch("curveNumber"),
  //   Fp: form.watch("pondingAdjustmentFactor"),
  //   h: form.watch("culvertDistance.SI"),
  // }

  const peakFlowInputsSI: PeakFlowInputs = {
    Q: useWatch({ control: form.control, name: "stormRunoff" })?.SI || 0,
    P: useWatch({ control: form.control, name: "stormPrecipitation" })?.SI || 0,
    A: useWatch({ control: form.control, name: "watershedArea" })?.SI || 0,
    L: useWatch({ control: form.control, name: "watershedFlowLength" })?.SI || 0,
    Sg: useWatch({ control: form.control, name: "avgWatershedGradient" })?.SI || 0,
    Tc: useWatch({ control: form.control, name: "timeOfConcentration" }) || 0,
    CN: useWatch({ control: form.control, name: "curveNumber" }) || 0,
    Fp: useWatch({ control: form.control, name: "pondingAdjustmentFactor" }) || 0,
    h: useWatch({ control: form.control, name: "culvertDistance" })?.SI || 0,
  };

  // const peakFlowInputsUS: PeakFlowInputs  = {
  //   Q: form.watch("stormRunoff.US"),
  //   P: form.watch("stormPrecipitation.US"),
  //   A: form.watch("watershedArea.US"),
  //   L: form.watch("watershedFlowLength.US"),
  //   Sg: form.watch("avgWatershedGradient.US"),
  //   Tc: form.watch("timeOfConcentration"),
  //   CN: form.watch("curveNumber"),
  //   Fp: form.watch("pondingAdjustmentFactor"),
  //   h: form.watch("culvertDistance.US"),
  // }

  const peakFlowInputsUS: PeakFlowInputs = {
    Q: useWatch({ control: form.control, name: "stormRunoff" })?.US || 0,
    P: useWatch({ control: form.control, name: "stormPrecipitation" })?.US || 0,
    A: useWatch({ control: form.control, name: "watershedArea" })?.US || 0,
    L: useWatch({ control: form.control, name: "watershedFlowLength" })?.US || 0,
    Sg: useWatch({ control: form.control, name: "avgWatershedGradient" })?.US || 0,
    Tc: useWatch({ control: form.control, name: "timeOfConcentration" }) || 0,
    CN: useWatch({ control: form.control, name: "curveNumber" }) || 0,
    Fp: useWatch({ control: form.control, name: "pondingAdjustmentFactor" }) || 0,
    h: useWatch({ control: form.control, name: "culvertDistance" })?.US || 0,
  };

  // console.log(peakFlowInputs);

  const [estimatedCN, setEstimatedCN] = useState<number | null>(null);
  const [calculatedTC, setCalculatedTC] = useState<number | null>(null);

  const [resultsSI, setResultsSI] = useState<PeakFlowResults | null>(null);
  const [resultsUS, setResultsUS] = useState<PeakFlowResults | null>(null);

  const renderUnitInputs = (field: any, fieldConfig: FormFieldConfig) => {

    const handleSIChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const siValue = Number(e.target.value);
      const usValue = convertSIToUS(siValue, fieldConfig.unit);
      field.onChange({ SI: siValue, US: Number(usValue) });
    };

    const handleUSChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const usValue = Number(e.target.value);
      const siValue = convertUSToSI(usValue, fieldConfig.unit);
      field.onChange({ SI: Number(siValue), US: usValue });
    };

    return (
      <div className="flex flex-col xs:flex-row w-full min-w-40 xs:w-fit gap-2">
        {/*SI input*/}
        <div className="flex flex-row items-center gap-2">
          <FormControl>
            <Input
              type={fieldConfig.type}
              placeholder={fieldConfig.placeholder}
              value={field.value?.SI || ""}
              className="w-full xs:w-36"
              onChange={handleSIChange}
            />
          </FormControl>
          {typeof fieldConfig.unit === "object" && fieldConfig.unit !== null && "SI" in fieldConfig.unit
            ? <span>{fieldConfig.unit.SI}</span>
            : ""
          }
        </div>
        {/*US input*/}
        <div className="flex flex-row items-center gap-2">
          <FormControl>
            <Input
              type={fieldConfig.type}
              placeholder={fieldConfig.placeholder}
              value={field.value?.US || ""}
              className="w-full xs:w-36"
              onChange={handleUSChange}
            />
          </FormControl>
          {typeof fieldConfig.unit === "object" && fieldConfig.unit !== null && "US" in fieldConfig.unit
            ? <span>{fieldConfig.unit.US}</span>
            : ""
          }
        </div>
      </div>
    );
  };

  const convertSIToUS = (siValue: number, unit: any) => {
    if (unit && typeof unit === "object") {
      if (unit.SI === "mm" && unit.US === "in") return convert.mmToInches(siValue).toFixed(1);
      if (unit.SI === "cm" && unit.US === "in") return convert.cmToInches(siValue).toFixed(1);
      if (unit.SI === "ha" && unit.US === "ac") return convert.hectaresToAcres(siValue).toFixed(1);
      if (unit.SI === "m" && unit.US === "ft") return convert.mToFt(siValue).toFixed(1);
    }
    return siValue;
  };

  const convertUSToSI = (usValue: number, unit: any) => {
    if (unit && typeof unit === "object") {
      if (unit.SI === "mm" && unit.US === "in") return convert.inchesToMm(usValue).toFixed(1);
      if (unit.SI === "cm" && unit.US === "in") return convert.inchesToCm(usValue).toFixed(1);
      if (unit.SI === "ha" && unit.US === "ac") return convert.acresToHectares(usValue).toFixed(1);
      if (unit.SI === "m" && unit.US === "ft") return convert.ftToM(usValue).toFixed(1);
    }
    return usValue;
  };

  // function to convert all results from SI to US units
  const convertResultsToUS = (results: PeakFlowResults) => {
    if (!results) return null;
    return {
      ...results,
      S: Number(convert.mmToInches(results.S).toFixed(2)),
      Ia: Number(convert.mmToInches(results.Ia).toFixed(2)),
      qu: Number(convert.quSItoUS(results.qu).toFixed(4)),
      q: Number(convert.cubicMetersPerSecToCubicFeetPerSec(results.q).toFixed(2)),
      D: Number(convert.cmToInches(results.D).toFixed(2)),
    };
  };

  // function to convert all results from US to SI units
  const convertResultsToSI = (results: PeakFlowResults) => {
    if (!results) return null;
    return {
      ...results,
      S: Number(convert.inchesToMm(results.S).toFixed(2)),
      Ia: Number(convert.inchesToMm(results.Ia).toFixed(2)),
      qu: Number(convert.quUStoSI(results.qu).toFixed(4)),
      q: Number(convert.cubicFeetPerSecToCubicMetersPerSec(results.q).toFixed(2)),
      D: Number(convert.inchesToCm(results.D).toFixed(2)),
    };
  };

  //async function to calculate peak flow using curve number


  const handleCalculateSI = () => {
    console.log("Peak Flow Inputs SI:", peakFlowInputsSI);
    try {
      const calculatedResults = calculatePeakFlow(peakFlowInputsSI);
      setResultsSI(calculatedResults);
    } catch (error) {
      console.error("Error calculating SI results:", error);
      setResultsSI(null);
    }
  }

  const handleCalculateUS = (results: PeakFlowResults) => {
    console.log("Peak Flow Inputs US:", peakFlowInputsUS);
    try {
      resultsSI && setResultsUS(convertResultsToUS(results));
    } catch (error) {
      console.error("Error calculating US results:", error);
      setResultsUS(null);
    }
  }

  // Estimate CN from ERMiT data when Q and P are provided
  // useEffect(() => {
  //   if (Number(peakFlowInputs.Q) && Number(peakFlowInputs.P)) {
  //    setEstimatedCN(Number(estimateCN(peakFlowInputs.Q, peakFlowInputs.P).toFixed(0)));
  //   }
  // }, [peakFlowInputs.Q, peakFlowInputs.P]);

  useEffect(() => {
    if (Number(peakFlowInputsSI.Q) && Number(peakFlowInputsSI.P)) {
      setEstimatedCN(Number(estimateCN(peakFlowInputsSI.Q, peakFlowInputsSI.P).toFixed(0)));
    }
  }, [peakFlowInputsSI.Q, peakFlowInputsSI.P]);

  // Estimate Tc
  // useEffect(() => {
  //   // Calculate time of concentration if needed
  //   if (Number(peakFlowInputs.Sg) && Number(peakFlowInputs.CN) && Number(peakFlowInputs.L)) {
  //     setCalculatedTC(Number(calculateTc(peakFlowInputs.Sg, peakFlowInputs.CN, peakFlowInputs.L).toFixed(2)));
  //   }
  // }, [peakFlowInputs.Sg, peakFlowInputs.CN, peakFlowInputs.L]);

  useEffect(() => {
    // Calculate time of concentration if needed
    if (Number(peakFlowInputsSI.Sg) && Number(peakFlowInputsSI.CN) && Number(peakFlowInputsSI.L)) {
      setCalculatedTC(Number(calculateTc(peakFlowInputsSI.Sg, peakFlowInputsSI.CN, peakFlowInputsSI.L).toFixed(2)));
    }
  }, [peakFlowInputsSI.Sg, peakFlowInputsSI.CN, peakFlowInputsSI.L]);

  // Recalculate results when units or form values change
  // useEffect(() => {
  //   if (form.formState.isDirty) {
  //     try {
  //       const conversions = units === "imperial"
  //         ? [
  //           { field: "stormRunoff", fn: convert.mmToInches },
  //           { field: "stormPrecipitation", fn: convert.mmToInches },
  //           { field: "watershedArea", fn: convert.hectaresToAcres },
  //           { field: "watershedFlowLength", fn: convert.mToFt },
  //           { field: "culvertDistance", fn: convert.mToFt },
  //         ]
  //         : [
  //           { field: "stormRunoff", fn: convert.inchesToMm },
  //           { field: "stormPrecipitation", fn: convert.inchesToMm },
  //           { field: "watershedArea", fn: convert.acresToHectares },
  //           { field: "watershedFlowLength", fn: convert.ftToM },
  //           { field: "culvertDistance", fn: convert.ftToM },
  //         ];
  //
  //       conversions.forEach(({ field, fn }) => {
  //         const value = form.watch(field as any);
  //         if (!isNaN(value)) {
  //           form.setValue(field as any, Number(fn(value).toFixed(2)));
  //         }
  //       });
  //     } catch (error) {
  //       console.error("Unit conversion error:", error);
  //     }
  //   }
  // }, [units, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    console.log("Submit handler called!"); // Add this line
    console.log("Form values:", values);
    handleCalculateSI();
    console.log(values);
  }

  useEffect(() => {
    if (resultsSI) {
      handleCalculateUS(resultsSI);
    }
  }, [resultsSI]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <div className="page-container">
          <div className="flex flex-row justify-between gap-4 px-4 lg:px-6">
            <div className="flex w-full flex-col items-start gap-3">
              <div className="flex flex-row items-center gap-3">
                <h1 className="text-foreground">
                  Forest Service Peak Flow Calculator
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
                      <DialogTitle>About Peak Flow Calculator</DialogTitle>
                    </DialogHeader>
                    <DialogDescription className="flex flex-col gap-4 text-neutral-800">
                      <span>
                        This version of Rock: Clime is based on the legacy
                        version of Peak Flow Calculator available at <br />
                        <a
                          href="https://forest.moscowfsl.wsu.edu/fswepp/ermit/peakflow/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline"
                        >
                          https://forest.moscowfsl.wsu.edu/fswepp/ermit/peakflow/
                        </a>
                      </span>
                      <span>
                        <strong>Citation:</strong>
                        <br />
                        Elliot, William J.; Hall, David E.; Robichaud, Peter R.
                        2010. Forest Service Peak Flow Calculator. Ver.
                        2015.04.05. Moscow, ID: U.S. Department of Agriculture,
                        Forest Service, Rocky Mountain Research Station. [Online
                        at{" "}
                        <a
                          href="https://forest.moscowfsl.wsu.edu/fswepp/ermit/peakflow"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline"
                        >
                          https://forest.moscowfsl.wsu.edu/fswepp/ermit/peakflow
                        </a>
                        ].
                      </span>
                    </DialogDescription>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-gray-700">
                Estimated peak flow for burned areas using Curve Number
                technology
              </p>
            </div>
          </div>
          <div className="@container flex flex-col gap-4 self-center px-4 py-2 lg:gap-6 lg:px-6 lg:py-6 w-full">
            <div className="flex flex-row gap-4 w-full max-w-xl self-center">
              <div className="flex grow w-full flex-col gap-4">
                <h3 className="text-xl font-semibold">Inputs</h3>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit, (errors) => {
                      console.log("Form validation failed:", errors);
                    })}
                    className="space-y-4"
                  >
                    {/*Description*/}
                    <FormField
                      key={formFields[0].name}
                      control={form.control}
                      name={formFields[0].name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{formFields[0].label}</FormLabel>
                          <div className="flex flex-row items-center gap-2">
                            <FormControl>
                              <Input
                                type={formFields[0].type}
                                placeholder={formFields[0].placeholder}
                                {...field}
                                value={field.value as string}
                                className=""
                                onChange={field.onChange}
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-green-500">
                            From ERMit
                          </span>
                          {/*Storm Runoff and Storm Precipitation*/}
                          <div className="mt-2 flex flex-col space-y-4 rounded-xl border-2 border-green-300 bg-green-50/5 p-4">
                            {formFields.slice(1, 3).map((fieldConfig) => (
                              <FormField
                                key={fieldConfig.name}
                                control={form.control}
                                name={fieldConfig.name}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>
                                      {fieldConfig.label}
                                      {fieldConfig.abbreviation && (
                                        <>
                                          ,{" "}
                                          <strong>
                                            {fieldConfig.abbreviation}
                                          </strong>
                                        </>
                                      )}
                                    </FormLabel>
                                    <div className="flex flex-row items-center gap-4">
                                      {/*Render SI and US input fields for each properties*/}
                                      {renderUnitInputs(field, fieldConfig)}
                                      <Icon
                                        icon={HelpCircle}
                                        className="h-4 w-4 text-gray-700 hover:cursor-pointer"
                                      />
                                    </div>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-orange-500">
                            From wepp.cloud
                          </span>
                          <div className="mt-2 flex flex-col space-y-4 rounded-xl border-2 border-orange-300 bg-orange-50/5 p-4">
                            {formFields.slice(3, 6).map((fieldConfig) => (
                              <FormField
                                key={fieldConfig.name}
                                control={form.control}
                                name={fieldConfig.name}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>
                                      {fieldConfig.label}
                                      {fieldConfig.abbreviation && (
                                        <>
                                          ,{" "}
                                          <strong>
                                            {fieldConfig.abbreviation}
                                          </strong>
                                        </>
                                      )}
                                    </FormLabel>
                                    <div className="flex flex-row items-center gap-2">
                                      <div className="flex flex-row items-center gap-4">
                                        {renderUnitInputs(field, fieldConfig)}
                                        <Icon
                                          icon={HelpCircle}
                                          className="h-4 w-4 text-gray-700 hover:cursor-pointer"
                                        />
                                      </div>
                                    </div>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex grow flex-col">
                        <span className="font-semibold text-blue-500">
                          Manual Entry
                        </span>
                        <div className="mt-2 flex flex-col space-y-4 rounded-xl border-2 border-blue-300 bg-blue-50/5 p-4">
                          {/* Curve Number */}
                          <div className="flex flex-col gap-2">
                            <FormField
                              key={formFields[6].name}
                              control={form.control}
                              name={formFields[6].name}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>
                                    {formFields[6].label}
                                    {formFields[6].abbreviation && (
                                      <>
                                        ,{" "}
                                        <strong>
                                          {formFields[6].abbreviation}
                                        </strong>
                                      </>
                                    )}
                                  </FormLabel>
                                  <div className="flex flex-row items-center gap-2">
                                    <FormControl>
                                      <Input
                                        type={formFields[6].type}
                                        placeholder={formFields[6].placeholder}
                                        {...field}
                                        value={field.value as number}
                                        className="w-36"
                                        onChange={
                                          formFields[6].type === "number"
                                            ? (e) =>
                                              field.onChange(
                                                Number(e.target.value),
                                              )
                                            : field.onChange
                                        }
                                      />
                                    </FormControl>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="ml-4 flex flex-row items-center gap-4">
                              <span className="text-sm font-medium">
                                CN Estimate from ERMiT (forest)
                              </span>
                              {estimatedCN ? (
                                <span className="text-md font-bold">
                                  {estimatedCN}
                                  <Button
                                    variant="link"
                                    className="w-fit shrink cursor-pointer"
                                    onClick={() => {
                                      if (estimatedCN) {
                                        form.setValue(
                                          "curveNumber",
                                          estimatedCN,
                                        );
                                      }
                                    }}
                                  >
                                    Use ERMiT CN Estimate
                                  </Button>
                                </span>
                              ) : (
                                <span className="text-md font-bold"> -- </span>
                              )}
                            </div>
                          </div>
                          {/* Time of Concerntration*/}
                          <div className="flex flex-col gap-2">
                            <FormField
                              key={formFields[7].name}
                              control={form.control}
                              name={formFields[7].name}
                              render={({ field }) => (
                                <FormItem className="h-fit">
                                  <FormLabel>
                                    {formFields[7].label}
                                    {formFields[7].abbreviation && (
                                      <>
                                        ,{" "}
                                        <strong>
                                          {formFields[7].abbreviation}
                                        </strong>
                                      </>
                                    )}
                                  </FormLabel>
                                  <div className="flex flex-row items-center gap-2">
                                    <FormControl>
                                      <Input
                                        type={formFields[7].type}
                                        placeholder={formFields[7].placeholder}
                                        {...field}
                                        value={field.value as number}
                                        className="w-36"
                                        onChange={
                                          formFields[7].type === "number"
                                            ? (e) =>
                                              field.onChange(
                                                Number(e.target.value),
                                              )
                                            : field.onChange
                                        }
                                      />
                                    </FormControl>
                                    {formFields[7].unit && (
                                      <span>
                                        {formFields[7].unit as string}
                                      </span>
                                    )}
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="ml-4 flex flex-row items-center gap-4">
                              <span className="text-sm font-medium">
                                Tc ~ (flat watershed; dry soil)
                              </span>
                              {calculatedTC ? (
                                <span className="text-md font-bold">
                                  {calculatedTC + " hr"}
                                  <Button
                                    variant="link"
                                    className="w-fit shrink cursor-pointer"
                                    onClick={() => {
                                      if (calculatedTC) {
                                        form.setValue(
                                          "timeOfConcentration",
                                          calculatedTC,
                                        );
                                      }
                                    }}
                                  >
                                    Use Tc ~ Estimate
                                  </Button>
                                </span>
                              ) : (
                                <span className="text-md font-bold"> -- </span>
                              )}
                            </div>
                          </div>
                          {/* Ponding Adjustment Factor*/}
                          <FormField
                            key={formFields[8].name}
                            control={form.control}
                            name={formFields[8].name}
                            render={({ field }) => (
                              <FormItem className="">
                                <FormLabel>
                                  {formFields[8].label}
                                  {formFields[8].abbreviation && (
                                    <>
                                      ,{" "}
                                      <strong>
                                        {formFields[8].abbreviation}
                                      </strong>
                                    </>
                                  )}
                                </FormLabel>
                                <div className="flex flex-row items-center gap-2">
                                  <FormControl>
                                    <Input
                                      type={formFields[8].type}
                                      placeholder={formFields[8].placeholder}
                                      {...field}
                                      value={field.value as number}
                                      className="w-36"
                                      onChange={
                                        formFields[8].type === "number"
                                          ? (e) =>
                                            field.onChange(
                                              Number(e.target.value),
                                            )
                                          : field.onChange
                                      }
                                    />
                                  </FormControl>
                                </div>
                                <FormDescription>
                                  Pond and swamp adjustment (0-1, typically 1)
                                  <br />
                                  0% pond: 1.0; 1.0%: 0.87; 5.0%: 0.72
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          {/*Culvert Distance*/}
                          <FormField
                            key={formFields[9].name}
                            control={form.control}
                            name={formFields[9].name}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  Culvert height, h
                                </FormLabel>
                                <div className="flex flex-row items-center gap-4">
                                  {renderUnitInputs(field, formFields[9])}
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink flex-col gap-2 lg:flex-row lg:gap-4">
                      <Button
                        type="submit"
                        className="w-full shrink cursor-pointer"
                      >
                        Calculate
                      </Button>
                      <Button
                        type="reset"
                        variant="outline"
                        onClick={() => form.reset(defaultValues)}
                        className="w-full shrink cursor-pointer"
                      >
                        Clear fields
                      </Button>
                    </div>
                    <Button
                      variant="link"
                      className="w-full shrink cursor-pointer"
                      onClick={() => {
                        form.reset(micaCreekData);
                      }}
                    >
                      Use Mica Creek example data
                    </Button>
                  </form>
                </Form>
              </div>
              {/*<div className="hidden w-1/2 lg:flex lg:flex-col">*/}
              {/*  /!*<StormRunoffInfo />*!/*/}
              {/*</div>*/}
            </div>

            <div className="@container flex flex-col lg:flex-row gap-4">
              <div className="flex flex-col gap-4 flex-1/2">
                <h3 className="text-xl font-semibold">Results (SI units)</h3>
                <div className="grid grid-cols-1 gap-4 @sm:grid-cols-2 @7xl:grid-cols-4">
                  <Card>
                    <CardHeader>
                      <CardDescription className="text-md text-gray-800">
                        Surface storage, <strong>S</strong>
                      </CardDescription>
                      <CardTitle className="leading-normal">
                      <span className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {resultsSI ? resultsSI.S : "--"}
                      </span>
                        {" mm"}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardDescription className="text-md text-gray-800">
                        Initial abstraction,{" "}
                        <strong>
                          I<sub>a</sub>
                        </strong>
                      </CardDescription>
                      <CardTitle className="leading-normal">
                      <span className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {resultsSI ? resultsSI.Ia : "--"}
                      </span>{" mm"}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardDescription className="text-md text-gray-800">
                        <strong>
                          I<sub>a</sub>/P
                        </strong>
                      </CardDescription>
                      <CardTitle className="leading-normal">
                      <span className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {resultsSI ? resultsSI.IaOnP : "--"}
                      </span>
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardDescription className="text-md text-gray-800">
                        Unit peak flow rate,{" "}
                        <strong>
                          q<sub>u</sub>
                        </strong>
                      </CardDescription>
                      <CardTitle className="flex flex-col gap-1 leading-normal">
                        <span className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                          {resultsSI ? resultsSI.qu : "--"}
                        </span>{" "}
                        <span>
                          m<sup>3</sup>/s per ha/mm × 10<sup>-3</sup>
                        </span>
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>
                <div className="grid grid-cols-1 gap-4 @sm:grid-cols-2 @md:grid-cols-2">
                  <Card className="bg-amber-50">
                    <CardHeader>
                      <CardDescription className="text-md text-gray-800">
                        Estimated peak flow rate, <strong>q</strong>
                      </CardDescription>
                      <CardTitle className="leading-normal">
                      <span className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {resultsSI ? resultsSI.q : "--"}
                      </span>
                        {" m³/s"}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="bg-amber-50">
                    <CardHeader>
                      <CardDescription className="text-md text-gray-800">
                        Culvert Diameter, <strong>D</strong>
                      </CardDescription>
                      <CardTitle className="leading-normal">
                      <span className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {resultsSI ? resultsSI.D : "--"}
                      </span>
                        {" cm"}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>
              </div>
              <div className="flex flex-col gap-4 flex-1/2">
                <h3 className="text-xl font-semibold">Results (US units)</h3>
                <div className="grid grid-cols-1 gap-4 @sm:grid-cols-2 @7xl:grid-cols-4">
                  <Card>
                    <CardHeader>
                      <CardDescription className="text-md text-gray-800">
                        Surface storage, <strong>S</strong>
                      </CardDescription>
                      <CardTitle className="leading-normal">
                      <span className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {resultsUS ? resultsUS.S : "--"}
                      </span>
                        {" in"}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardDescription className="text-md text-gray-800">
                        Initial abstraction,{" "}
                        <strong>
                          I<sub>a</sub>
                        </strong>
                      </CardDescription>
                      <CardTitle className="leading-normal">
                      <span className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {resultsUS ? resultsUS.Ia : "--"}
                      </span>{" in"}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardDescription className="text-md text-gray-800">
                        <strong>
                          I<sub>a</sub>/P
                        </strong>
                      </CardDescription>
                      <CardTitle className="leading-normal">
                      <span className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {resultsUS ? resultsUS.IaOnP : "--"}
                      </span>
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardDescription className="text-md text-gray-800">
                        Unit peak flow rate,{" "}
                        <strong>
                          q<sub>u</sub>
                        </strong>
                      </CardDescription>
                      <CardTitle className="flex flex-col gap-1 leading-normal">
                        <span className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                          {resultsUS ? resultsUS.qu : "--"}
                        </span>{" "}
                          <span>
                          ft<sup>3</sup>/s per ac/in × 10<sup>-3</sup>
                        </span>
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>
                <div className="grid grid-cols-1 gap-4 @sm:grid-cols-2 @md:grid-cols-2">
                  <Card className="bg-amber-50">
                    <CardHeader>
                      <CardDescription className="text-md text-gray-800">
                        Estimated peak flow rate, <strong>q</strong>
                      </CardDescription>
                      <CardTitle className="leading-normal">
                      <span className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {resultsUS ? resultsUS.q : "--"}
                      </span>
                        {" ft³/s"}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="bg-amber-50">
                    <CardHeader>
                      <CardDescription className="text-md text-gray-800">
                        Culvert Diameter, <strong>D</strong>
                      </CardDescription>
                      <CardTitle className="leading-normal">
                      <span className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {resultsUS ? resultsUS.D : "--"}
                      </span>
                        {" in"}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default PeakFlow;
