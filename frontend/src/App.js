import React, { useState, useEffect, Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import Navbar from "./components/Navbar/Navbar.jsx";
import ToolSection from "@/components/ToolSection";
import { ExternalLink } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { icon } from "leaflet";

import { hillslopeModels, watershedModels } from "@/data/models.js";

// Lazy load route components
const RockCliMe = lazy(() => import("./components/RockCliMe/RockCliMe.jsx"));
const StationPar = lazy(() => import("./components/RockCliMe/StationPar.jsx"));
const ClimateData = lazy(
  () => import("./components/RockCliMe/ClimateData.jsx"),
);

const Home = () => (
  <main className="mx-auto flex w-full flex-col gap-0 md:max-w-2xl lg:max-w-3xl xl:max-w-6xl">
    <div className="flex w-full flex-col justify-between gap-3 p-6 align-middle xl:flex-row">
      <p className="text-foreground">
        The <strong>Water Erosion Prediction Project (WEPP)</strong> is a
        process based model that predicts soil erosion.
      </p>
      <a
        href="https://www.nrcs.usda.gov/resources/tech-tools/water-erosion-prediction-project"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-blue-600 hover:underline"
      >
        Learn more
        <Icon icon={ExternalLink} className="h-3.5 w-3.5" />
      </a>
    </div>
    <ToolSection
      title="Hillslope Scale Erosion and Runoff Prediction"
      tools={hillslopeModels}
      className="mb-6 bg-green-50 text-green-900"
    />
    <ToolSection
      title="Watershed Prediction"
      tools={watershedModels}
      className="mb-6 bg-blue-50 text-blue-900"
    />
  </main>
);

const App = () => {
  const [isNavbarVisible, setNavbarVisible] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.matchMedia("(max-width: 1023px)").matches;
      if (location.pathname.startsWith("/rockclime") && isMobile) {
        setNavbarVisible(false);
      } else {
        setNavbarVisible(true);
      }
    };

    handleResize(); // Check on initial load
    window.addEventListener("resize", handleResize); // Check on resize

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [location]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 w-full shadow-sm">
        <Navbar
          isVisible={isNavbarVisible}
          toggleVisibility={() => setNavbarVisible(!isNavbarVisible)}
        />
      </header>

      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center">
            Loading...
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/rockclime" element={<RockCliMe />} />
          <Route path="/rockclime/par/:stationId" element={<StationPar />} />
          <Route
            path="/rockclime/climate/:stationId"
            element={<ClimateData />}
          />
        </Routes>
      </Suspense>
    </div>
  );
};

const AppWrapper = () => (
  <Router future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
    <App />
  </Router>
);

export default AppWrapper;
