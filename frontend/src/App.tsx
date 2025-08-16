import { Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
} from "react-router-dom";
import { Home } from "@/pages/Home/Home";

// Lazy load route components
const RockCliMe = lazy(() => import("@/pages/RockCliMe/RockCliMe.jsx"));
const StationPar = lazy(() => import("@/pages/RockCliMe/StationPar.jsx"));
const ClimateData = lazy(() => import("@/pages/RockCliMe/ClimateData.jsx"));
const PeakFlow = lazy(() => import("@/pages/PeakFlow/PeakFlow.tsx"));
const ERMiT = lazy(() => import("@/pages/ERMiT/ERMiT.tsx"));

const App = () => {

  return (
    <div className="min-h-screen">
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
          <Route path="/rock-clime/climate/:stationId" element={<ClimateData />} />
          <Route path="/peak-flow-calculator" element={<PeakFlow />} />
          <Route path="/ermit" element={<ERMiT />} />
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
