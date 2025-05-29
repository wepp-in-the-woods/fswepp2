import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar.jsx';

// Lazy load route components
const RockCliMe = lazy(() => import('./components/RockCliMe/RockCliMe.jsx'));
const StationPar = lazy(() => import('./components/RockCliMe/StationPar.jsx'));
const ClimateData = lazy(() => import('./components/RockCliMe/ClimateData.jsx'));

const App = () => {
  const [isNavbarVisible, setNavbarVisible] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.matchMedia('(max-width: 1023px)').matches;
      if (location.pathname.startsWith('/rockclime') && isMobile) {
        setNavbarVisible(false);
      } else {
        setNavbarVisible(true);
      }
    };

    handleResize(); // Check on initial load
    window.addEventListener('resize', handleResize); // Check on resize

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [location]);

  return (
    <div className="min-h-screen">
      <Navbar isVisible={isNavbarVisible} toggleVisibility={() => setNavbarVisible(!isNavbarVisible)} />
      <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
        <Routes>
          <Route path="/rockclime" element={<RockCliMe />} />
          <Route path="/rockclime/par/:stationId" element={<StationPar />} />
          <Route path="/rockclime/climate/:stationId" element={<ClimateData />} />
        </Routes>
      </Suspense>
    </div>
  );
};

const AppWrapper = () => (
  <Router>
    <App />
  </Router>
);

export default AppWrapper;