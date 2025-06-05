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
import ToolCard from "@/components/ToolCard";

// Lazy load route components
const RockCliMe = lazy(() => import("./components/RockCliMe/RockCliMe.jsx"));
const StationPar = lazy(() => import("./components/RockCliMe/StationPar.jsx"));
const ClimateData = lazy(
  () => import("./components/RockCliMe/ClimateData.jsx"),
);

const hillslopeTools = [
  {
    title: "WEPP: Road",
    description: "Predict erosion from insloped or outsloped forest roads...",
    icon: "🛣️",
    href: "/wepp-road",
  },
  {
    title: "ERMiT",
    description:
      "Predict the probability of sediment delivery from hillslope...",
    href: "/ermit",
  },
  // more...
];

const watershedTools = [
  {
    title: "Tahoe Basin Sediment Model",
    description:
      "An offshoot of Disturbed WEPP customized for Lake Tahoe Basin...",
    href: "/tahoe-model",
  },
  {
    title: "WEPPcloud",
    description: "Simulation tool that estimates hillslope soil erosion, etc.",
    href: "https://weppcloud.org",
  },
  // more tools...
];

const Home = () => (
  <>
    <p className="text-muted-foreground mb-6">
      The <strong>Water Erosion Prediction Project (WEPP)</strong> is a computer
      simulation that predicts soil erosion.
    </p>
    <ToolSection
      title="Hillslope Scale Erosion Prediction and Runoff Prediction"
      tools={hillslopeTools}
    />
    <ToolSection title="Watershed Prediction" tools={watershedTools} />
  </>
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
      <header className="bg-background sticky top-0 z-50 w-full shadow">
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
