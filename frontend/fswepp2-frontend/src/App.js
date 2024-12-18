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
      const isMobile = window.matchMedia('(max-width: 1024px)').matches;
      if ((location.pathname === '/rockclime' || location.pathname === '/climatedata') && isMobile) {
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

  const handleHomeClick = () => {
    setNavbarVisible(true);
    navigate('/');
  };

  return (
    <>
      <Navbar isVisible={isNavbarVisible} toggleVisibility={() => setNavbarVisible(!isNavbarVisible)} />
      <Routes>
        <Route path="/rockclime" element={<RockCliMe />} />
        <Route path="/rockclime/station_par/:stationId" element={<StationPar />} />
        <Route path="/rockclime/climatedata/:stationId" element={<ClimateData />} />
      </Routes>
      {!isNavbarVisible && (
        <button onClick={handleHomeClick} className="fixed bottom-4 right-4 bg-blue-500 text-white p-2 rounded">
          Home
        </button>
      )}
    </>
  );
};

const AppWrapper = () => (
  <Router>
    <App />
  </Router>
);

export default AppWrapper;