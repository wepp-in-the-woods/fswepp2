import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar.jsx';
import RockCliMe from './components/RockCliMe/RockCliMe.jsx';
import StationPar from './components/RockCliMe/StationPar.jsx';
import ClimateData from './components/RockCliMe/ClimateData.jsx';

const App = () => {
  const [isNavbarVisible, setNavbarVisible] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

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
      <Routes>
        <Route path="/rockclime" element={<RockCliMe />} />
        <Route path="/rockclime/station_par/:stationId" element={<StationPar />} />
        <Route path="/rockclime/climate_data/:stationId" element={<ClimateData />} />
      </Routes>
    </div>
  );
};

const AppWrapper = () => (
  <Router>
    <App />
  </Router>
);

export default AppWrapper;