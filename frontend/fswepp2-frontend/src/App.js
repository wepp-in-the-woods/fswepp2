import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar.jsx'; // Assuming you have a Navbar component
import RockCliMe from './components/RockCliMe/RockCliMe.jsx';

const App = () => {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/rockclime" element={<RockCliMe />} />
        {/* Add other routes here */}
      </Routes>
    </Router>
  );
};

export default App;