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

import { useState } from "react";
import { PeakFlowResults, calculatePeakFlow, conversions } from "@/pages/PeakFlow/peakFlowCalculations";

const formSchema = z.object({
  description: z.string().min(2).max(255),
  stormRunoff: z.number(),
  stormPrecipitation: z.number(),
  watershedArea: z.number(),
  watershedFlowLength: z.number(),
  avgWatershedGradient: z.number(),
  curveNumber: z.number(),
  curveNumberEstimate: z.number(),
  timeOfConcentration: z.number(),
  timeOfConcentrationDrySoil: z.number(),
  pondingAdjustmentFactor: z.number(),
  culvertDistance: z.number(),
});

type FormFieldConfig = {
  name: keyof z.infer<typeof formSchema>;
  label: string;
  abbreviation?: string;
  type?: string;
  placeholder?: string;
  description: string;
  unit: {
    imperial: string;
    metric: string;
  };
};

const PeakFlow = () => {
  const { units } = useUnits();
  const { convert } = useConversions();

  const defaultValues = {
      description: "",
      stormRunoff: 0,
      stormPrecipitation: 0,
      watershedArea: 0,
      watershedFlowLength: 0,
      avgWatershedGradient: 0,
      curveNumber: 0,
      curveNumberEstimate: 0,
      timeOfConcentration: 0,
      timeOfConcentrationDrySoil: 0,
      pondingAdjustmentFactor: 0,
      culvertDistance: 1.83,
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues,
  });

  // Mica Creek data in metric
  const micaCreekData = {
    description: "Severe wildfire in a watershed in the Mica Creek Experimental Forest, Northern Idaho",
    stormRunoff: 25.5,
    stormPrecipitation: 49.3,
    watershedArea: 575,
    watershedFlowLength: 2572,
    avgWatershedGradient: 0.133,
    curveNumber: 90,
    curveNumberEstimate: 90,
    timeOfConcentration: 10,
    timeOfConcentrationDrySoil: 0.56,
    pondingAdjustmentFactor: 1,
    culvertDistance: 1.83,
  }

  const formFields: FormFieldConfig[] = [
    {
      name: "description",
      label: "Description",
      type: "text",
      placeholder: "Enter a description",
      description: "Enter a description for the peak flow calculation",
      unit: { imperial: "", metric: "" },
    },
    {
      name: "stormRunoff",
      label: "Storm Runoff",
      type: "number",
      abbreviation: "Q",
      placeholder: "0",
      description: `Enter the storm runoff in ${units === "imperial" ? "inches" : "mm"}`,
      unit: { imperial: "in", metric: "mm" },
    },
    {
      name: "stormPrecipitation",
      label: "Storm Precipitation",
      type: "number",
      abbreviation: "P",
      placeholder: "0",
      description: `If Q > P use P ~ 2 Q`,
      unit: { imperial: "in", metric: "mm" },
    },
    {
      name: "watershedArea",
      label: "Watershed Area",
      type: "number",
      abbreviation: "A",
      placeholder: "0",
      description: `Enter the watershed area in ${units === "imperial" ? "acres" : "hectares"}`,
      unit: { imperial: "ac", metric: "ha" },
    },
    {
      name: "watershedFlowLength",
      label: "Watershed Flow Length",
      type: "number",
      abbreviation: "L",
      placeholder: "0",
      description: `Enter the watershed flow length in ${units === "imperial" ? "feet" : "meters"}`,
      unit: { imperial: "ft", metric: "m" },
    },
    {
      name: "avgWatershedGradient",
      label: "Average Watershed Gradient",
      type: "number",
      abbreviation: "Sg",
      placeholder: "0",
      description: `Enter the average watershed gradient in ${units === "imperial" ? "ft/ft" : "m/m"}`,
      unit: { imperial: "ft/ft", metric: "m/m" },
    },
    {
      name: "curveNumber",
      label: "Curve Number",
      type: "number",
      abbreviation: "CN",
      placeholder: "0",
      description: `Enter the curve number (CN)`,
      unit: { imperial: "", metric: "" },
    },
    {
      name: "timeOfConcentration",
      label: "Time of Concentration",
      type: "number",
      abbreviation: "Tc",
      placeholder: "0",
      description: `Enter the time of concentration in ${units === "imperial" ? "hours" : "hours"}`,
      unit: { imperial: "hr", metric: "hr" },
    },
    {
      name: "pondingAdjustmentFactor",
      label: "Ponding Adjustment Factor",
      type: "number",
      abbreviation: "Fp",
      placeholder: "",
      description: `Enter the ponding adjustment factor (default is 1.0)`,
      unit: { imperial: "", metric: "" },
    },
  ];

  const peakFlowInputs = {
    Q: form.watch("stormRunoff"),
    P: form.watch("stormPrecipitation"),
    A: form.watch("watershedArea"),
    L: form.watch("watershedFlowLength"),
    Sg: form.watch("avgWatershedGradient"),
    Tc: form.watch("timeOfConcentration"),
    CN: form.watch("curveNumber"),
    Fp: form.watch("pondingAdjustmentFactor"),
    h: form.watch("culvertDistance"),
  }

  const [results, setResults] = useState<PeakFlowResults | null>(null);

  const handleCalculate = () => {
    try {
      // In your actual implementation, use: calculatePeakFlow(inputs as PeakFlowInputs)
      const calculatedResults = calculatePeakFlow(peakFlowInputs);
      setResults(calculatedResults);
    } catch (error) {
      console.error(error);
      setResults(null);
    }
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    handleCalculate();
    console.log(values);
  }

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
          <div className="flex flex-col gap-4 px-4 py-2 lg:gap-6 lg:px-6 lg:py-6">
            <div className="flex flex-row gap-4">
              <div className="flex grow flex-col gap-4">
                <h3 className="text-xl font-semibold">Input</h3>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
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
                                className=""
                                onChange={
                                  formFields[0].type === "number"
                                    ? (e) =>
                                        field.onChange(
                                          Number(e.target.value) || 0,
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
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col">
                        <span className="font-semibold text-green-500">
                          From ERMit
                        </span>
                        <div className="mt-2 flex flex-col space-y-4 rounded border-2 border-green-300 bg-green-50/5 p-4">
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
                                  <div className="flex flex-row items-center gap-2">
                                    <FormControl>
                                      <Input
                                        type={fieldConfig.type}
                                        placeholder={fieldConfig.placeholder}
                                        {...field}
                                        className="w-24"
                                        onChange={
                                          fieldConfig.type === "number"
                                            ? (e) =>
                                                field.onChange(
                                                  Number(e.target.value) || 0,
                                                )
                                            : field.onChange
                                        }
                                      />
                                    </FormControl>
                                    {fieldConfig.unit && (
                                      <span>
                                        {units === "imperial"
                                          ? fieldConfig.unit.imperial
                                          : fieldConfig.unit.metric}
                                      </span>
                                    )}
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
                        <span className="font-semibold text-orange-500">
                          From wepp.cloud
                        </span>
                        <div className="mt-2 flex flex-col space-y-4 rounded border-2 border-orange-300 bg-orange-50/5 p-4">
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
                                    <FormControl>
                                      <Input
                                        type={fieldConfig.type}
                                        placeholder={fieldConfig.placeholder}
                                        {...field}
                                        className="w-24"
                                        onChange={
                                          fieldConfig.type === "number"
                                            ? (e) =>
                                                field.onChange(
                                                  Number(e.target.value) || 0,
                                                )
                                            : field.onChange
                                        }
                                      />
                                    </FormControl>
                                    {fieldConfig.unit && (
                                      <span>
                                        {units === "imperial"
                                          ? fieldConfig.unit.imperial
                                          : fieldConfig.unit.metric}
                                      </span>
                                    )}
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex grow flex-col">
                        <span className="font-semibold text-blue-500">
                          Manual Entry
                        </span>
                        <div className="mt-2 flex flex-col space-y-4 rounded border-2 border-blue-300 bg-blue-50/5 p-4">
                          {/*Curve Number */}
                          <div className="flex flex-row gap-6">
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
                                        className="w-24"
                                        onChange={
                                          formFields[6].type === "number"
                                            ? (e) =>
                                                field.onChange(
                                                  Number(e.target.value) || 0,
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
                            <FormField
                              key="curveNumberEstimate"
                              control={form.control}
                              name="curveNumberEstimate"
                              render={({ field }) => (
                                <FormItem className="">
                                  <FormLabel>CN Estimate from ERMiT</FormLabel>
                                  <div className="flex flex-row items-center gap-2">
                                    <FormControl>
                                      <Input
                                        type="number"
                                        placeholder="0"
                                        {...field}
                                        className="w-24"
                                        onChange={(e) =>
                                          field.onChange(Number(e.target.value))
                                        }
                                      />
                                    </FormControl>
                                    <span>(forest)</span>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          {/*Time of Concerntration*/}
                          <div className="flex flex-row gap-6">
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
                                        className="w-24"
                                        onChange={
                                          formFields[7].type === "number"
                                            ? (e) =>
                                                field.onChange(
                                                  Number(e.target.value) || 0,
                                                )
                                            : field.onChange
                                        }
                                      />
                                    </FormControl>
                                    {formFields[7].unit && (
                                      <span>
                                        {units === "imperial"
                                          ? formFields[7].unit.imperial
                                          : formFields[7].unit.metric}
                                      </span>
                                    )}
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              key="timeOfConcentrationDrySoil"
                              control={form.control}
                              name="timeOfConcentrationDrySoil"
                              render={({ field }) => (
                                <FormItem className=" items-center">
                                  <FormLabel>Tc ~</FormLabel>
                                  <div className="flex flex-col lg:flex-row lg:items-center">
                                    <FormControl>
                                      <Input
                                        type="number"
                                        placeholder="0"
                                        {...field}
                                        className="w-24"
                                        onChange={(e) =>
                                          field.onChange(Number(e.target.value))
                                        }
                                      />
                                    </FormControl>
                                    <span className="ml-2 flex w-full">
                                      hr (flat watershed; dry soil)
                                    </span>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          {/*Ponding Adjustment Factor*/}
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
                                      className="w-24"
                                      onChange={
                                        formFields[8].type === "number"
                                          ? (e) =>
                                              field.onChange(
                                                Number(e.target.value) || 0,
                                              )
                                          : field.onChange
                                      }
                                    />
                                  </FormControl>
                                  {formFields[8].unit && (
                                    <span>
                                      {units === "imperial"
                                        ? formFields[8].unit.imperial
                                        : formFields[8].unit.metric}
                                    </span>
                                  )}
                                </div>
                                <FormDescription>
                                  Pond and swamp adjustment (0-1, typically 1)<br/>
                                  0% pond: 1.0; 1.0%: 0.87; 5.0%: 0.72
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            key="culvertDistance"
                            control={form.control}
                            name="culvertDistance"
                            render={({ field }) => (
                              <FormItem className="">
                                <FormLabel>
                                  Distance between culvert center to ~1ft below
                                  the road surface, h
                                </FormLabel>
                                <div className="flex flex-row items-center gap-2">
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="0"
                                      {...field}
                                      className="w-24"
                                      onChange={(e) =>
                                        field.onChange(Number(e.target.value))
                                      }
                                    />
                                  </FormControl>
                                  <span>
                                    {units === "imperial" ? "ft" : "m"}
                                  </span>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="link"
                      className="w-full shrink cursor-pointer"
                      onClick={() => {
                        units == "metric"
                          ? form.reset(micaCreekData)
                          : form.reset({
                              ...micaCreekData,
                              stormRunoff: convert.mmToInches(
                                micaCreekData.stormRunoff,
                              ),
                              stormPrecipitation: convert.mmToInches(
                                micaCreekData.stormPrecipitation,
                              ),
                              watershedArea: convert.hectaresToAcres(
                                micaCreekData.watershedArea,
                              ),
                              watershedFlowLength: convert.mToFt(
                                micaCreekData.watershedFlowLength,
                              ),
                              culvertDistance: convert.mToFt(
                                micaCreekData.culvertDistance,
                              ),
                            });
                      }}
                    >
                      Use Mica Creek example data
                    </Button>
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
                  </form>
                </Form>
              </div>
              <div className="hidden w-1/2 lg:flex lg:flex-col">
                {/*<StormRunoffInfo />*/}
              </div>
            </div>
            <div className="flex flex-col gap-4 lg:w-1/2 lg:grow-0">
              <h3 className="text-xl font-semibold">Results</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                <Card>
                  <CardHeader>
                    <CardDescription className="text-md text-gray-800">
                      Surface storage, <strong>S</strong>
                    </CardDescription>
                    <CardTitle>
                      <span className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {results
                          ? units === "metric"
                            ? results.S
                            : conversions.mmToInches(results.S).toFixed(2)
                          : "--"}
                      </span>{" "}
                      {units === "imperial" ? "in" : "mm"}
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
                    <CardTitle>
                      <span className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {results
                          ? units === "metric"
                            ? results.Ia
                            : conversions.mmToInches(results.Ia).toFixed(2)
                          : "--"}
                      </span>{" "}
                      {units === "imperial" ? "in" : "mm"}
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
                    <CardTitle>
                      <span className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {results
                          ? units === "metric"
                            ? results.S
                            : conversions.mmToInches(results.S).toFixed(2)
                          : "--"}
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
                    <CardTitle>
                      <span className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {results
                          ? units === "metric"
                            ? results.qu
                            : conversions.cubicMetersPerSecToCubicFeetPerSec(results.qu).toFixed(2)
                          : "--"}
                      </span>{" "}
                      {units === "imperial" ? (
                        <span>
                          ft<sup>3</sup>/s per ac/in × 10<sup>-3</sup>
                        </span>
                      ) : (
                        <span>
                          m<sup>3</sup>/s per ha/mm × 10<sup>-3</sup>
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                <Card className="bg-amber-50">
                  <CardHeader>
                    <CardDescription className="text-md text-gray-800">
                      Estimated peak flow rate, <strong>q</strong>
                    </CardDescription>
                    <CardTitle>
                      <span className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {results
                          ? units === "metric"
                            ? results.q
                            : conversions.cubicMetersPerSecToCubicFeetPerSec(results.q).toFixed(2)
                          : "--"}
                      </span>{" "}
                      {units === "imperial" ? "ft³/s" : "m³/s"}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card className="bg-amber-50">
                  <CardHeader>
                    <CardDescription className="text-md text-gray-800">
                      Culvert Diameter, <strong>D</strong>
                    </CardDescription>
                    <CardTitle>
                      <span className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {results
                          ? units === "metric"
                            ? results.S
                            : conversions.cmToInches(results.D).toFixed(2)
                          : "--"}
                      </span>{" "}
                      {units === "imperial" ? "in" : "cm"}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {/*<div className="mt-2 flex flex-col space-y-4 rounded border-2 border-gray-300 bg-gray-50/50 p-4">*/}
              {/*  <div className="flex flex-col gap-0.5">*/}
              {/*    <span className="">*/}
              {/*      Surface storage, <strong>S</strong>*/}
              {/*    </span>*/}
              {/*    <span className="text-lg font-bold">*/}
              {/*      [value] {units === "imperial" ? "in" : "mm"}*/}
              {/*    </span>*/}
              {/*  </div>*/}
              {/*  <div className="flex flex-col gap-0.5">*/}
              {/*    <span className="">*/}
              {/*      Initial abstraction,{" "}*/}
              {/*      <strong>*/}
              {/*        I<sub>a</sub>*/}
              {/*      </strong>*/}
              {/*    </span>*/}
              {/*    <span className="text-lg font-bold">*/}
              {/*      [value] {units === "imperial" ? "in" : "mm"}*/}
              {/*    </span>*/}
              {/*  </div>*/}
              {/*  <div className="flex flex-col gap-0.5">*/}
              {/*    <span className="">*/}
              {/*      <strong>I<sub>a</sub>/P</strong></span>*/}
              {/*    <span className="text-lg font-bold">[value]</span>*/}
              {/*  </div>*/}
              {/*  <div className="flex flex-col gap-0.5">*/}
              {/*    <span className="">Unit peak flow rate,{" "}<strong>q<sub>u</sub></strong></span>*/}
              {/*    <span className="text-lg font-bold">*/}
              {/*      /!*"ft³/s per acre/in × 10⁻³" : "m³/s per ha/mm × 10⁻³"*!/*/}
              {/*      [value]{" "}*/}
              {/*      {units === "imperial" ? (*/}
              {/*        <span>*/}
              {/*          ft<sup>3</sup>/s per ac/in × 10<sup>-3</sup>*/}
              {/*        </span>*/}
              {/*      ) : (*/}
              {/*        <span>*/}
              {/*          m<sup>3</sup>/s per ha/mm × 10<sup>-3</sup>*/}
              {/*        </span>*/}
              {/*      )}*/}
              {/*    </span>*/}
              {/*  </div>*/}
              {/*</div>*/}
              {/*<div className="mt-2 flex flex-col space-y-4 rounded border-2 border-yellow-300 bg-yellow-50/50 p-4">*/}
              {/*  <div className="flex flex-col gap-0.5">*/}
              {/*    <span className="">*/}
              {/*      Estimated peak flow rate, <strong>q</strong>*/}
              {/*    </span>*/}
              {/*    <span className="text-lg font-bold">*/}
              {/*      [value] {units === "imperial" ? "ft³/s" : "m³/s"}*/}
              {/*    </span>*/}
              {/*  </div>*/}
              {/*  <div className="flex flex-col gap-0.5">*/}
              {/*    <span className="">*/}
              {/*      Culvert Diameter, <strong>D</strong>*/}
              {/*    </span>*/}
              {/*    <span className="text-lg font-bold">*/}
              {/*      [value] {units === "imperial" ? "in" : "cm"}*/}
              {/*    </span>*/}
              {/*  </div>*/}
              {/*</div>*/}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default PeakFlow;
