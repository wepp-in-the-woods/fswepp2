import React, { useState, useEffect, useRef, useMemo, lazy, use } from "react";
import axios from "axios";
import { api } from "../../api";
import { useNavigate } from "react-router-dom";
import { useMediaQuery } from "@/hooks/use-media-query.ts";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Icons
import { Icon } from "@/components/ui/icon";
import { Info, MapPin, ChevronUp, ChevronDown, EllipsisVertical, SlidersHorizontal } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader, DrawerOverlay,
  DrawerTitle,
  DrawerTrigger
} from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
const ChooseLocation = lazy(() => import("./ChooseLocation.jsx"));

const RockCliMe = () => {
  const isMobile = useMediaQuery("(max-width: 30rem)");

  // Add loading states
  const [isLoadingRegions, setIsLoadingRegions] = useState(false);
  const [isLoadingStations, setIsLoadingStations] = useState(false);
  const [isLoadingParameters, setIsLoadingParameters] = useState(false);

  // Add refs to track ongoing requests
  const stationRequestRef = useRef(null);
  const regionRequestRef = useRef(null);

  // Search method state
  const [searchMethod, setSearchMethod] = useState(null); // 'region' or 'location'

  // State variables. This is the main reason refactoring may be necessary.
  const [coordinates, setCoordinates] = useState(() =>
    sessionStorage.getItem("lat") !== null &&
    sessionStorage.getItem("lng") !== null
      ? [
          Number(sessionStorage.getItem("lat")),
          Number(sessionStorage.getItem("lng")),
        ]
      : null,
  );
  const [latInput, setLatInput] = useState(
    () => sessionStorage.getItem("lat") || "",
  );
  const [lngInput, setLngInput] = useState(
    () => sessionStorage.getItem("lng") || "",
  );
  const [regionOptions, setRegionOptions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [locationToggle, setLocationToggle] = useState(false);
  const [closestStations, setClosestStations] = useState([]);
  const [savedParameters, setSavedParameters] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [years, setYears] = useState(30);
  const [usePrismPar, setUsePrismPar] = useState(false);
  const [usePrismClim, setUsePrismClim] = useState(false);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("stationsTab");
  const [showLocationDiv, setShowLocationDiv] = useState(false);
  const [prevCoordinates, setPrevCoordinates] = useState([null, null]);
  const [parametersFetched, setParametersFetched] = useState(false);
  const [selectedPar, setSelectedPar] = useState(null);

  // cligenVersion: The version of the Cligen model. Used in the Options dropdown. Stored in sessionStorage so that it persists across page reloads.
  const [cligenVersion, setCligenVersion] = useState(
    () => sessionStorage.getItem("cligenVersion") || "5.3.2",
  );
  useEffect(() => {
    sessionStorage.setItem("cligenVersion", cligenVersion);
  }, [cligenVersion]);

  // databaseVersion: The version of the database. Used in the Options dropdown. Stored in sessionStorage so that it persists across page reloads.
  const [databaseVersion, setDatabaseVersion] = useState(
    () => sessionStorage.getItem("databaseVersion") || "legacy",
  );
  useEffect(() => {
    sessionStorage.setItem("databaseVersion", databaseVersion);
  }, [databaseVersion]);

  // Fetch and display closest stations
  useEffect(() => {
    if (
      coordinates &&
      coordinates[0] !== null &&
      coordinates[1] !== null &&
      !showLocationDiv &&
      activeTab === "stationsTab" &&
      (coordinates[0] !== prevCoordinates[0] ||
        coordinates[1] !== prevCoordinates[1])
    ) {
      setSearchMethod("location");
      handleGetClosestStations();
      setPrevCoordinates(coordinates);
    }
  }, [coordinates, showLocationDiv, activeTab, databaseVersion, cligenVersion]);

  // Fetch and display saved parameters
  useEffect(() => {
    if (
      !showLocationDiv &&
      activeTab === "savedParametersTab" &&
      !parametersFetched &&
      parametersFetched !== null
    ) {
      handleGetSavedParameters();
    }
  }, [savedParameters, activeTab]);

  // Fetch saved parameters from the database based on user cookies. Cookies stay for one week.
  const handleGetSavedParameters = async () => {
    // if (isLoadingParameters) {
    //   return;
    // }
    setIsLoadingParameters(true);
    console.log("Saved parameters: Fetching saved parameters...");
    try {
      const response = await api.get("/api/rockclim/GET/user_defined_pars", {
        withCredentials: true,
      });
      setSavedParameters(response.data);
      setParametersFetched(true);
      console.log("Saved parameters fetched successfully.");
    } catch (error) {
      console.error("Error fetching saved parameters:", error);
      setParametersFetched(false);
      setSavedParameters({});
    } finally {
    setIsLoadingParameters(false); // Clear loading state
    }
  };

  // Fetch closest stations from the database based on user inputted/selected coordinates.
  const handleGetClosestStations = async () => {
    // Prevent duplicate calls
    if (isLoadingStations || stationRequestRef.current) {
      return;
    }

    const [lat, lng] = coordinates;
    if (!isNaN(lat) && !isNaN(lng)) {
      setIsLoadingStations(true); // Add loading state
      console.log("cligenVersion: " + cligenVersion);
      console.log("database: " + databaseVersion);
      try {
        const response = await api.post("/api/rockclim/GET/closest_stations", {
          database: databaseVersion === "None" ? null : databaseVersion,
          cligen_version: cligenVersion,
          location: {
            longitude: lng,
            latitude: lat,
          },
        });
        setClosestStations(response.data);
        setSelectedStation(null); // Clear selected station when data changes
      } catch (error) {
        console.error("Error fetching closest stations:", error);
        setClosestStations([]);
      } finally {
        setIsLoadingStations(false); // Clear loading state
      }
    }
  };

  // Re-fetch closest stations when versions change
  useEffect(() => {
    if (coordinates && !showLocationDiv && activeTab === "stationsTab") {
      handleGetClosestStations();
    }
  }, [databaseVersion, cligenVersion]); // Only trigger on version changes

  useEffect(() => {
    if (activeTab === "stationsTab") {
      handleGetClosestStations();
    } else if (activeTab === "savedParametersTab") {
      handleGetSavedParameters();
    }
  }, [activeTab]); // Re-fetch when tab changes

  // Fetch region data when component mounts or databaseVersion changes
  useEffect(() => {
    const fetchRegionData = async () => {
      setIsLoadingRegions(true);
      try {
        const response = await api.post(
          "/api/rockclim/GET/available_state_codes",
          {
            database: databaseVersion, // Use actual database version
          },
        );

        // Remove duplicates using Map (keeps first occurrence)
        const uniqueEntries = new Map();
        Object.entries(response.data).forEach(([code, name]) => {
          if (!uniqueEntries.has(code)) {
            uniqueEntries.set(code, name);
          }
        });

        const options = Array.from(uniqueEntries.entries()).map(
          ([code, name]) => ({
            value: code,
            label: name,
          }),
        );

        setRegionOptions(options);
        setSelectedRegion("");
      } catch (error) {
        console.error("Error fetching regions:", error);
        setRegionOptions([]);
      } finally {
        setIsLoadingRegions(false);
      }
    };

    fetchRegionData();
  }, [databaseVersion]);

  // Handle region selection and fetch stations by region
  const handleGetStationsByRegion = async () => {
    // Prevent duplicate calls
    if (isLoadingStations || stationRequestRef.current) {
      return;
    }

    if (selectedRegion && selectedRegion !== "") {
      setIsLoadingStations(true); // Add loading state

      try {
        const response = await api.post("/api/rockclim/GET/stations_in_state", {
          state_code: selectedRegion,
        });
        setClosestStations(response.data);
        setSelectedStation(null); // Clear selected station when data changes
      } catch (error) {
        console.error("Error fetching stations by region:", error);
        setClosestStations([]);
      } finally {
        setIsLoadingStations(false); // Clear loading state
      }
    }
  };

  // Re-fetch stations when region changes
  useEffect(() => {
    if (activeTab === "stationsTab" && selectedRegion) {
      setSearchMethod("region");
      handleGetStationsByRegion();
    }
  }, [selectedRegion]); // Only trigger on region changes

  // Sort stations differently based on search method
  const sortedStations = useMemo(() => {
    if (!closestStations.length) return [];

    if (searchMethod === "location") {
      // Sort by distance for location-based search
      return closestStations
        .filter((station) => station.distance_to_query_location !== null)
        .sort(
          (a, b) => a.distance_to_query_location - b.distance_to_query_location,
        );
    } else {
      // Sort alphabetically for region-based search
      return closestStations.sort((a, b) => a.desc.localeCompare(b.desc));
    }
  }, [closestStations, searchMethod]);

  // Allow user to set how many stations to show (when not browsing by region)
  const [numberOfStationsToShow, setNumberOfStationsToShow] = useState(6); // Default to 6 stations

  // Calculate the number of stations to show based on search method
  const stationsToShow = useMemo(() => {
    if (searchMethod === "region") {
      return closestStations.length; // Show all stations for region browsing
    } else if (searchMethod === "location") {
      // For location search, use numberOfStationsToShow but cap it at available stations
      return Math.min(numberOfStationsToShow, closestStations.length);
    }
    return 6; // Default fallback
  }, [searchMethod, closestStations.length, numberOfStationsToShow]);

  // Clear opposing method when one is selected
  useEffect(() => {
    if (searchMethod === "region" && coordinates) {
      setCoordinates(null);
      setLatInput("");
      setLngInput("");
    }
  }, [searchMethod]);

  // Clear selected region when switching to location search
  useEffect(() => {
    if (searchMethod === "location" && selectedRegion) {
      setSelectedRegion("");
    }
  }, [searchMethod]);

  // Sets the selected station to the station that was clicked on.
  const handleStationClick = (station) => {
    setSelectedStation(selectedStation === station ? null : station);
  };

  // Sets the selected parameter to the parameter that was clicked on.
  const handleSavedParClick = (par) => {
    setSelectedPar(selectedPar === par ? null : par);
  };

  // Navigates to /rock-clime/par/:par_id based on user's selected station.
  const handleViewStationPar = (station) => {
    if (!station || !station.id) {
      console.error("No station selected or par_id is missing");
      return;
    }

    // Location is either inputted coordinates if the user wants to use PRISM
    // or just the station's coordinates.
    const location = usePrismPar
      ? { longitude: parseFloat(lngInput), latitude: parseFloat(latInput) }
      : {
          longitude: station.longitude,
          latitude: station.latitude,
        };

    const stationCoords = {
      longitude: station.longitude,
      latitude: station.latitude,
    };
    navigate(`/rock-clime/par/${station.id}`, {
      state: {
        databaseVersion,
        cligenVersion,
        stationCoords,
        location,
        usePrismPar,
        stationDesc: station.desc,
        par_id: station.par,
      },
    });
  };

  // Navigates to /rock-clime/climate/:par_id based on user's selected station.
  const handleViewStationClimateData = async (station) => {
    if (!station || !station.id) {
      console.error("No station selected or par_id is missing");
      return;
    }

    if (!years) {
      console.error("Number of years is missing");
      return;
    }

    // Location is either inputted coordinates if the user wants to use PRISM
    // or just the station's coordinates.
    const location = usePrismClim
      ? { longitude: parseFloat(lngInput), latitude: parseFloat(latInput) }
      : {
          longitude: station.longitude,
          latitude: station.latitude,
        };

    const stationCoords = {
      longitude: station.longitude,
      latitude: station.latitude,
    };

    navigate(`/rock-clime/climate/${station.id}`, {
      state: {
        stationCoords,
        location,
        years,
        usePrismClim,
        par_id: station.id,
        stationDesc: station.desc,
      },
    });
  };

  // Navigates to /rock-clime/par/:par_id based on user's selected saved parameter.
  const handleViewSavedPar = (key) => {
    if (!key || !savedParameters[key]) {
      console.error("No saved parameter selected");
      return;
    }

    const customPar = savedParameters[key];

    navigate(`/rock-clime/par/${key}`, {
      state: {
        par_id: customPar.par_id,
        selected_par: key,
        usePrismPar: customPar.use_prism,
        user_defined_par_mod: customPar.user_defined_par_mod,
      },
    });
  };

  // Navigates to /rock-clime/climate/:par_id based on user's selected saved parameter.
  const handleViewSavedParClimateData = async (key) => {
    if (!key || !savedParameters[key]) {
      console.error("No saved parameter selected");
      return;
    }

    if (!years) {
      console.error("Number of years is missing");
      return;
    }

    const customPar = savedParameters[key];

    navigate(`/rock-clime/climate/${key}`, {
      state: {
        key,
        years,
        customPar,
      },
    });
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <div className="page-container">
          <div
            className="flex flex-row justify-between px-4 lg:px-6 gap-4"
            dataslot="page-title"
          >
            <div className="flex w-full flex-col items-start gap-3">
              <div className="flex flex-row items-center gap-3">
                <h1 className="text-foreground">Rock: Clime</h1>
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
                      <DialogTitle>About Rock: Clime</DialogTitle>
                    </DialogHeader>
                    <DialogDescription className="flex flex-col gap-4 text-neutral-800">
                      <p>
                        The Rocky Mountain Climate Generator (Rock: Clime)
                        creates a daily weather file using the ARS CLIGEN
                        weather generator. The file is intended to be used with
                        the WEPP Windows and GeoWEPP interfaces, but also can be
                        a source of weather data for any application. It creates
                        up to 200 years of simulated weather values from a
                        database of more than 2600 weather stations and the
                        PRISM 2.5-mile grid of precipitation data.
                      </p>
                      <p>
                        This version of Rock: Clime is based on the legacy
                        version of Rock: Clime available at <br />
                        <a
                          href="https://forest.moscowfsl.wsu.edu/cgi-bin/fswepp/rc/rockclim.pl"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline"
                        >
                          https://forest.moscowfsl.wsu.edu/cgi-bin/fswepp/rc/rockclim.pl
                        </a>
                      </p>
                      <p>
                        <strong>Citation:</strong>
                        <br />
                        Elliot, William J.; Dayna L. Scheele, Dayna L.; Hall,
                        David E. 1999. Rock:Clime – Rocky Mountain Research
                        Station Climate Generator. Moscow, ID: U.S.D.A. Forest
                        Service, Rocky Mountain Research Station, Moscow
                        Forestry Sciences Laboratory. [Online at{" "}
                        <a
                          href="https://forest.moscowfsl.wsu.edu/fswepp"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline"
                        >
                          forest.moscowfsl.wsu.edu/fswepp
                        </a>
                        ].
                      </p>
                    </DialogDescription>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-gray-700">
                Rocky Mountain Research Station Climate Generator
              </p>
            </div>
            <div className="hidden lg:flex lg:flex-row w-full sm:items-end sm:justify-end md:items-center gap-3 lg:justify-end">
              <Select value={cligenVersion} onValueChange={setCligenVersion}>
                <SelectTrigger id="cligenVersion" className="w-full sm:w-fit">
                  <SelectValue defaultValue={cligenVersion}>
                    <span>Cligen Version: {cligenVersion}</span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5.3.2">5.3.2 (WEPPcloud)</SelectItem>
                  <SelectItem value="4.3">4.3 (Legacy)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={databaseVersion} onValueChange={setDatabaseVersion}>
                <SelectTrigger id="databaseVersion" className="w-full sm:w-fit">
                  <SelectValue defaultValue={databaseVersion}>
                    <span>Database Version: {databaseVersion}</span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="legacy">Legacy</SelectItem>
                  <SelectItem value="2015">2015</SelectItem>
                  <SelectItem value="au">au</SelectItem>
                  <SelectItem value="ghcn">ghcn</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col lg:flex-row px-4 lg:px-6 py-2 lg:py-6">
            <div className="flex flex-row items-center justify-between p-4 mb-6 gap-4 border border-border rounded-2xl lg:hidden">
              <div className="flex flex-col text-sm gap-2">
                <div className="flex flex-row gap-3">
                  <span>Cligen Version: {cligenVersion}</span>
                  <Separator orientation="vertical" className="h-4 w-px" />
                  <span>Database Version: {databaseVersion}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {databaseVersion !== "au" && (
                    <div>
                      {usePrismPar && usePrismClim ? (
                        <span>Using Prism monthlies</span>
                        ) : (
                          <span>Not using Prism monthlies</span>
                        )
                      }
                    </div>
                  )}
                  <div className="flex flex-col xs:flex-row xs:items-center gap-3">
                    <p className="text-sm font-medium text-gray-700">
                      Generate climate data for {years} years.
                    </p>
                  </div>
                </div>
                <strong className="text-gray-700">
                  Current Location:
                  {coordinates && latInput && lngInput
                    ? ` ${parseFloat(coordinates[0]).toFixed(3)}, ${parseFloat(coordinates[1]).toFixed(3)}`
                    : " None"}
                </strong>
              </div>
              {/*When not in desktop mode: Show sheet to change cligen version, database version, data settings and location*/}
              <Sheet>
                <SheetTrigger asChild className="lg:hidden">
                  <Button variant="ghost">
                    <Icon icon={SlidersHorizontal} className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Filter results</SheetTitle>
                    <SheetDescription></SheetDescription>
                  </SheetHeader>
                  <div className="grid flex-1 auto-rows-min gap-6 px-4">
                    <Select value={cligenVersion} onValueChange={setCligenVersion}>
                      <SelectTrigger id="cligenVersion" className="w-full sm:w-fit">
                        <SelectValue defaultValue={cligenVersion}>
                          <span>Cligen Version: {cligenVersion}</span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5.3.2">5.3.2 (WEPPcloud)</SelectItem>
                        <SelectItem value="4.3">4.3 (Legacy)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={databaseVersion} onValueChange={setDatabaseVersion}>
                      <SelectTrigger id="databaseVersion" className="w-full sm:w-fit">
                        <SelectValue defaultValue={databaseVersion}>
                          <span>Database Version: {databaseVersion}</span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="legacy">Legacy</SelectItem>
                        <SelectItem value="2015">2015</SelectItem>
                        <SelectItem value="au">au</SelectItem>
                        <SelectItem value="ghcn">ghcn</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex flex-row gap-4">
                      {databaseVersion !== "au" && (
                        <Label htmlFor="usePrismCheckbox" className="text-sm font-medium text-gray-700">
                          <Checkbox
                            id="usePrismCheckbox"
                            checked={usePrismPar || usePrismClim}
                            onCheckedChange={(checked) => {
                              setUsePrismPar(checked);
                              setUsePrismClim(checked);
                            }}
                          />
                          <span>Use Prism monthlies</span>
                        </Label>
                      )}
                      <Separator orientation="vertical" className="h-4 w-px bg-gray-300" />
                      <div className="flex flex-col xs:flex-row xs:items-center gap-3">
                        <Label htmlFor="numberOfYearsInput" className="text-sm font-medium text-gray-700">
                          Generate data for
                        </Label>
                        <div className="flex flex-row items-center gap-2">
                          <Input
                            id="numberOfYearsInput"
                            type="number"
                            className="min-w-18 max-w-18"
                            value={years}
                            onChange={(e) =>
                              setYears(e.target.value)
                            }
                          />
                          <span className="block text-sm font-medium text-gray-700"> years</span>
                        </div>
                      </div>
                    </div>
                    {/* Method 1: Browse by chosen location */}
                    <div className="flex shrink flex-col">
                      <h3 className="text-sm font-semibold mb-2">Find by location</h3>
                      <div className="flex flex-col gap-3">
                        <p className="text-sm text-gray-600">
                          Set coordinates to find the closest climate stations
                        </p>
                        <div className="flex flex-col gap-2">
                          <div className="text-sm">
                            <span className="text-sm font-medium text-gray-700">Current Location: </span>
                            {latInput && lngInput
                              ? `${parseFloat(latInput).toFixed(3)}, ${parseFloat(
                                lngInput,
                              ).toFixed(3)}`
                              : "None"}
                          </div>
                          <ChooseLocation
                            coordinates={coordinates}
                            setCoordinates={setCoordinates}
                            setLatInput={setLatInput}
                            setLngInput={setLngInput}
                            showLocationDiv={showLocationDiv}
                            setShowLocationDiv={setShowLocationDiv}
                            latInput={latInput}
                            lngInput={lngInput}
                            cligenVersion={cligenVersion}
                            databaseVersion={databaseVersion}
                            setSearchMethod={setSearchMethod}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="numberOfStationsToShow">
                            Number of Stations to Show:
                          </Label>
                          <Input
                            id="numberOfStationsToShow"
                            type="number"
                            value={numberOfStationsToShow}
                            onChange={(e) => setNumberOfStationsToShow(e.target.value)}
                            className="w-16"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-row items-center gap-2 text-gray-500">
                      <div className="h-px grow bg-gray-300 xl:h-px" />
                      OR
                      <div className="h-px grow bg-gray-300 xl:h-px" />
                    </div>
                    {/* Method 2: Browse by Region */}
                    <div className="flex shrink flex-col">
                      <h3 className="text-sm font-semibold mb-2">
                        {(databaseVersion ===  "legacy") || (databaseVersion === "2015") ? "Browse by state" : "Browse by region"}
                      </h3>
                      <div className="flex flex-col gap-2">
                        <p className="text-sm text-gray-600">
                          Select a {(databaseVersion ===  "legacy") || (databaseVersion === "2015") ? "state" : "region"} to view all available climate stations in the {(databaseVersion ===  "legacy") || (databaseVersion === "2015") ? "state" : "region"}.
                        </p>
                        <Combobox
                          options={regionOptions}
                          value={selectedRegion}
                          onValueChange={(value) => {
                            setSelectedRegion(value);
                            setActiveTab("stationsTab");
                          }}
                          placeholder={
                            isLoadingRegions
                              ? "Loading..."
                              : `Select a ${(databaseVersion ===  "legacy") || (databaseVersion === "2015") ? "state" : "region"}...`
                          }
                          className="sm:min-w-[200px]"
                        />
                      </div>
                    </div>
                  </div>
                  <SheetFooter>
                    <Button type="submit">Save changes</Button>
                    <SheetClose asChild>
                      <Button variant="outline">Close</Button>
                    </SheetClose>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </div>
            <Accordion
              type="multiple"
              collapsible="true"
              className={`hidden lg:flex lg:flex-col flex-1/4 mb-4 lg:pr-6 min-w-60`}
              defaultValue={["dataSettings", "location"]}
            >
              <AccordionItem value="dataSettings">
                <AccordionTrigger>
                  <h2 className="text-base font-semibold mb-2">Climate Generation Settings</h2>
                </AccordionTrigger>
                <AccordionContent className="flex flex-col gap-3 pb-4 md:pb-6">
                  {/* Checkbox for using Prism monthlies for station parameters and climate data*/}
                  {/* "au" e.g. the Australia database does not have PRISM, so we grey out the option. */}
                  {databaseVersion !== "au" && (
                    <Label htmlFor="usePrismCheckbox" className="mt-2 text-sm font-medium text-gray-700">
                      <Checkbox
                        id="usePrismCheckbox"
                        checked={usePrismPar || usePrismClim}
                        onCheckedChange={(checked) => {
                          setUsePrismPar(checked);
                          setUsePrismClim(checked);
                        }}
                      />
                      <span>Use Prism monthlies</span>
                    </Label>
                  )}
                  <div className="flex flex-col gap-3">
                    <Label htmlFor="numberOfYearsInput" className="block text-sm font-medium text-gray-700">
                      Number of years to generate data:
                    </Label>
                    <Input
                      id="numberOfYearsInput"
                      type="number"
                      className="w-18"
                      value={years}
                      onChange={(e) =>
                        setYears(e.target.value)
                      }
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="location" className="w-full">
                <AccordionTrigger className="w-full">
                  <h2 className="text-base font-semibold mb-2">Location</h2>
                </AccordionTrigger>
                <AccordionContent className="flex flex-col gap-3 max-w-full">
                  {/* Method 1: Browse by chosen location */}
                  <div className="flex shrink flex-col">
                    <h3 className="text-sm font-semibold mb-2">Find by location</h3>
                    <div className="flex flex-col gap-3">
                      <p className="text-sm text-gray-600">
                        Set coordinates to find the closest climate stations
                      </p>
                      <div className="flex flex-col gap-2">
                        <div className="text-sm">
                          <span className="text-sm font-medium text-gray-700">Current Location: </span>
                          {latInput && lngInput
                            ? `${parseFloat(latInput).toFixed(3)}, ${parseFloat(
                              lngInput,
                            ).toFixed(3)}`
                            : "None"}
                        </div>
                        <ChooseLocation
                          coordinates={coordinates}
                          setCoordinates={setCoordinates}
                          setLatInput={setLatInput}
                          setLngInput={setLngInput}
                          showLocationDiv={showLocationDiv}
                          setShowLocationDiv={setShowLocationDiv}
                          latInput={latInput}
                          lngInput={lngInput}
                          cligenVersion={cligenVersion}
                          databaseVersion={databaseVersion}
                          setSearchMethod={setSearchMethod}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="numberOfStationsToShow">
                          Number of Stations to Show:
                        </Label>
                        <Input
                          id="numberOfStationsToShow"
                          type="number"
                          value={numberOfStationsToShow}
                          onChange={(e) => setNumberOfStationsToShow(e.target.value)}
                          className="w-16"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row items-center gap-2 text-gray-500">
                    <div className="h-px grow bg-gray-300 xl:h-px" />
                    OR
                    <div className="h-px grow bg-gray-300 xl:h-px" />
                  </div>
                  {/* Method 2: Browse by Region */}
                  <div className="flex shrink flex-col">
                    <h3 className="text-sm font-semibold mb-2">
                      {(databaseVersion ===  "legacy") || (databaseVersion === "2015") ? "Browse by state" : "Browse by region"}
                    </h3>
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-gray-600">
                        Select a {(databaseVersion ===  "legacy") || (databaseVersion === "2015") ? "state" : "region"} to view all available climate stations in the {(databaseVersion ===  "legacy") || (databaseVersion === "2015") ? "state" : "region"}.
                      </p>
                      <Combobox
                        options={regionOptions}
                        value={selectedRegion}
                        onValueChange={(value) => {
                          setSelectedRegion(value);
                          setActiveTab("stationsTab");
                        }}
                        placeholder={
                          isLoadingRegions
                            ? "Loading..."
                            : `Select a ${(databaseVersion ===  "legacy") || (databaseVersion === "2015") ? "state" : "region"}...`
                        }
                        className="sm:min-w-[200px]"
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Tabs */}
            <div className="w-full flex-4/5 overflow-auto">
              <Tabs defaultValue="stationsTab">
                <TabsList className="w-full sm:w-fit">
                  <TabsTrigger value="stationsTab" onClick={() => setActiveTab("stationsTab")}>
                    Climate Stations
                  </TabsTrigger>
                  <TabsTrigger value="savedParametersTab" onClick={() => setActiveTab("savedParametersTab")}>
                    Saved Parameters
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="stationsTab">
                  <div className="grid grid-cols-1 gap-4">
                    {/* Dynamic header based on search method */}
                    {searchMethod === "region" && selectedRegion && (
                      <div className="rounded-lg bg-gray-50 p-4">
                        <h3 className="font-semibold">
                          Climate Stations in{" "}
                          {
                            regionOptions.find(
                              (r) => r.value === selectedRegion,
                            )?.label
                          }
                        </h3>
                        <p className="text-sm text-gray-600">
                          Showing all available stations in this region
                        </p>
                      </div>
                    )}
                    {searchMethod === "location" && coordinates && (
                      <div className="rounded-lg bg-blue-50 p-4">
                        <h3 className="font-semibold">
                          Closest Climate Stations
                        </h3>
                        <p className="text-sm text-gray-600">
                          Showing {numberOfStationsToShow} stations nearest to{" "}
                          {coordinates[0].toFixed(3)},{" "}
                          {coordinates[1].toFixed(3)}
                        </p>
                      </div>
                    )}

                    {/* Loading state */}
                    {isLoadingStations ? (
                      <div className="flex items-center justify-center p-8">
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                          <span>Loading stations...</span>
                        </div>
                      </div>
                    ) : (
                      closestStations.length === 0 && (
                        <div className="flex w-full flex-col items-center justify-center p-12">
                          <p className="text-center text-neutral-700">
                            {searchMethod === "region"
                              ? "Select a region to view available stations"
                              : "Choose a location to find the closest stations"}
                          </p>
                        </div>
                      )
                    )}

                    {/* List of stations */}
                    {/* TODO: Use data table for sorting and filtering */}
                    {!isLoadingStations && closestStations.length !== 0 && (
                      sortedStations.slice(0, stationsToShow).map((station) => (
                        <div
                          key={station.id}
                          className="@container flex w-full flex-row xs:flex-col gap-2 p-4 mb-2 sm:flex-row justify-between sm:items-center rounded-md border border-gray-200"
                        >
                          <div className="flex flex-row items-baseline grow gap-4 w-full">
                            <span className="text-sm text-gray-500">
                              {sortedStations.indexOf(station) + 1}
                            </span>
                            <div
                              className="flex flex-col gap-1 min-w-0 w-full"
                              onClick={(e) => {
                                if (isMobile) {
                                  handleViewStationPar(station);
                                }
                              }}
                            >
                              <strong className="text-lg">
                                {station.desc.slice(0, -2)}
                              </strong>
                              <div className="flex flex-col gap-1">
                                <p className="text-sm">
                                  Latitude: {station.latitude}, Longitude: {station.longitude}
                                </p>
                                {/* Conditional distance display */}
                                {searchMethod === "location" &&
                                  station.distance_to_query_location !==
                                  null && (
                                    <p className="text-sm">
                                      Distance: {station.distance_to_query_location.toFixed(2)} km
                                    </p>
                                  )}
                              </div>
                            </div>
                            <Drawer>
                              <DrawerTrigger asChild>
                                <Button
                                  id="stationDrawerTrigger"
                                  variant="ghost"
                                  className="xs:hidden h-8 w-8 p-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Icon icon={EllipsisVertical} className="h-5 w-5" />
                                </Button>
                              </DrawerTrigger>
                              <DrawerContent>
                                <DrawerHeader>
                                  <DrawerTitle>{station.desc.slice(0, -2)}</DrawerTitle>
                                  <DrawerDescription></DrawerDescription>
                                </DrawerHeader>
                                <DrawerFooter>
                                  <Button
                                    className="grow"
                                    onClick={() => handleViewStationPar(station)}
                                  >
                                    View Station Parameters
                                  </Button>
                                  <div className="flex flex-col my-4 gap-2">
                                    <div className="flex flex-row items-center gap-3">
                                      <Label htmlFor="numberOfYearsInput" className="block text-sm font-medium text-gray-700">
                                        Number of years to generate data:
                                      </Label>
                                      <Input
                                        id="numberOfYearsInput"
                                        type="number"
                                        className="w-18"
                                        value={years}
                                        onChange={(e) =>
                                          setYears(e.target.value)
                                        }
                                      />
                                    </div>
                                    <Button
                                      className="grow"
                                      onClick={() => handleViewStationClimateData(station)}
                                    >
                                      Generate Climate Data
                                    </Button>
                                  </div>
                                  <DrawerClose className="py-2">
                                    <span>Cancel</span>
                                  </DrawerClose>
                                </DrawerFooter>
                              </DrawerContent>
                            </Drawer>
                          </div>
                          <div className="hidden xs:flex flex-col @lg:flex-row items-center gap-2 shrink">
                            <Button
                              className="w-full shrink"
                              variant="outline"
                              onClick={() => handleViewStationPar(station)}
                            >
                              View Station Parameters
                            </Button>
                            <Button
                              className="w-full shrink"
                              onClick={() => handleViewStationClimateData(station)}
                            >
                              Generate Climate Data
                            </Button>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="savedParametersTab">
                  {/* Loading state */}
                  {isLoadingParameters ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                        <span>Loading saved parameters...</span>
                      </div>
                    </div>
                  ) : (
                    savedParameters.length === 0 && (
                      <div className="flex items-center justify-center p-8">
                        <div className="flex items-center gap-2">
                          <p className="text-center text-neutral-700">
                            No saved parameters found. Please create and save parameters to view them here.
                          </p>
                        </div>
                      </div>
                    )
                  )}

                  {/*List of saved parameters*/}
                  {!isLoadingParameters && savedParameters && Object.keys(savedParameters).length !== 0 && (
                    Object.entries(savedParameters).map(([key, savedParameter]) => (
                      <div key={key} className="flex w-full flex-row xs:flex-col gap-2 p-4 mb-2 sm:flex-row justify-between sm:items-center rounded-md border border-gray-200">
                        <div className="flex flex-row items-baseline gap-4 w-full">
                          <span className="text-sm text-gray-500">
                            {Object.keys(savedParameters).indexOf(key) + 1}
                          </span>
                          <div
                            className="flex flex-col gap-1 min-w-0 w-full"
                            onClick={(e) => {
                              if (isMobile) {
                                handleViewSavedPar(key);
                              }
                            }}
                          >
                            <strong className="text-lg">
                              {savedParameter.user_defined_par_mod.description}
                            </strong>
                          </div>
                          <Drawer>
                            <DrawerTrigger asChild>
                              <Button variant="ghost" className="xs:hidden h-8 w-8 p-0">
                                <Icon icon={EllipsisVertical} className="h-5 w-5" />
                              </Button>
                            </DrawerTrigger>
                            <DrawerContent>
                              <DrawerHeader>
                                <DrawerTitle>{savedParameter.user_defined_par_mod.description}</DrawerTitle>
                                <DrawerDescription></DrawerDescription>
                              </DrawerHeader>
                              <DrawerFooter>
                                <Button
                                  className="grow"
                                  onClick={() => handleViewSavedPar(key)}
                                >
                                  View Station Parameters
                                </Button>
                                <div className="flex flex-col my-4 gap-2">
                                  <div className="flex flex-row items-center gap-3">
                                    <Label htmlFor="numberOfYearsInput" className="block text-sm font-medium text-gray-700">
                                      Number of years to generate data:
                                    </Label>
                                    <Input
                                      id="numberOfYearsInput"
                                      type="number"
                                      className="w-18"
                                      value={years}
                                      onChange={(e) =>
                                        setYears(e.target.value)
                                      }
                                    />
                                  </div>
                                  <Button
                                    className="grow"
                                    onClick={() => handleViewSavedParClimateData(key)}
                                  >
                                    Generate Climate Data
                                  </Button>
                                </div>
                                <DrawerClose className="py-2">
                                  <span>Cancel</span>
                                </DrawerClose>
                              </DrawerFooter>
                            </DrawerContent>
                          </Drawer>
                        </div>
                        <div className="hidden xs:flex flex-row items-center gap-2">
                          <Button
                            className="grow"
                            variant="outline"
                            onClick={() => handleViewSavedPar(key)}
                          >
                            View Station Parameters
                          </Button>
                          <Button
                            className="grow"
                            onClick={() => handleViewSavedParClimateData(key)}
                          >
                            Generate Climate Data
                          </Button>
                        </div>

                        {/*{Object.keys(savedParameters).map((par, index) => (*/}
                        {/*  <div key={index}>*/}
                        {/*    <button*/}
                        {/*      className={`w-full rounded-sm border p-2 text-left ${*/}
                        {/*        selectedPar === par*/}
                        {/*          ? "bg-[#015838] text-white"*/}
                        {/*          : ""*/}
                        {/*      }`}*/}
                        {/*      onClick={() => handleSavedParClick(par)}*/}
                        {/*    >*/}
                        {/*      <strong>*/}
                        {/*        {*/}
                        {/*          savedParameters[par].user_defined_par_mod*/}
                        {/*            .description*/}
                        {/*        }*/}
                        {/*      </strong>*/}
                        {/*    </button>*/}
                        {/*    {selectedPar === par && (*/}
                        {/*      <div className="mt-2 rounded-sm border bg-gray-100 p-2">*/}
                        {/*        <div className="mb-2">*/}
                        {/*          <button*/}
                        {/*            className="mb-2 block w-full rounded-sm bg-[#16a34a] p-2 text-left text-white"*/}
                        {/*            onClick={handleViewSavedPar}*/}
                        {/*          >*/}
                        {/*            View Saved Parameters*/}
                        {/*          </button>*/}
                        {/*        </div>*/}
                        {/*        <div className="mb-2 border-t-2 border-gray-300">*/}
                        {/*          <label className="mt-2 block text-sm font-medium text-gray-700">*/}
                        {/*            Number of Years*/}
                        {/*          </label>*/}
                        {/*          <input*/}
                        {/*            type="number"*/}
                        {/*            className="mt-1 block w-full rounded-sm border border-gray-300 p-2"*/}
                        {/*            value={years}*/}
                        {/*            onChange={(e) => setYears(e.target.value)}*/}
                        {/*          />*/}
                        {/*        </div>*/}
                        {/*        <button*/}
                        {/*          className="block w-full rounded-sm bg-[#16a34a] p-2 text-left text-white"*/}
                        {/*          onClick={handleViewSavedParClimateData}*/}
                        {/*        >*/}
                        {/*          Generate Climate Data*/}
                        {/*        </button>*/}
                        {/*      </div>*/}
                        {/*    )}*/}
                        {/*  </div>*/}
                        {/*))}*/}
                      </div>
                    )
                  ))}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default RockCliMe;
