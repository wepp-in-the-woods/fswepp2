import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar.jsx';
import RockCliMe from './components/RockCliMe/RockCliMe.jsx';

const App = () => {
  const [isNavbarVisible, setNavbarVisible] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.matchMedia('(max-width: 1024px)').matches;
      if (location.pathname === '/rockclime' && isMobile) {
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
    <>
      <Navbar isVisible={isNavbarVisible} toggleVisibility={() => setNavbarVisible(!isNavbarVisible)} />
      <Routes>
        <Route path="/rockclime" element={<RockCliMe />} />
        {/* Add other routes here */}
      </Routes>
      {!isNavbarVisible && (
        <button onClick={() => setNavbarVisible(true)} className="fixed bottom-4 right-4 bg-blue-500 text-white p-2 rounded">
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