import React, { Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
} from "react-router-dom";
import { Home } from "@/pages/Home/Home";

// Lazy load route components
const RockCliMe = lazy(() => import("@/pages/RockCliMe/RockCliMe.jsx"));
const StationPar = lazy(() => import("@/pages/RockCliMe/StationPar.jsx"));
const ClimateData = lazy(
  () => import("@/pages/RockCliMe/ClimateData.jsx"),
);

const App: React.FC = () => {

  return (
    <div className="min-h-screen">
      {/*<header className="sticky top-0 z-50 w-full shadow-sm">*/}
      {/*  <Navbar*/}
      {/*    isVisible={isNavbarVisible}*/}
      {/*    toggleVisibility={() => setNavbarVisible(!isNavbarVisible)}*/}
      {/*  />*/}
      {/*</header>*/}
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center">
            Loading...
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/rock-clime" element={<RockCliMe />} />
          <Route path="/rock-clime/par/:stationId" element={<StationPar />} />
          <Route
            path="/rock-clime/climate/:stationId"
            element={<ClimateData />}
          />
        </Routes>
      </Suspense>
    </div>
  );
};

const AppWrapper: React.FC = () => (
  <Router future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
    <App />
  </Router>
);

export default AppWrapper;
