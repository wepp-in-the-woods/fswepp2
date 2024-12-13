import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Navbar({ isVisible, toggleVisibility }) {
  const [openDropdown, setOpenDropdown] = useState(null);
  const navigate = useNavigate();

  const toggleDropdown = (dropdown) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  const handleLogoClick = () => {
    toggleVisibility();
    navigate("/");
  };

  return (
    isVisible && (
      <nav className="flex items-center justify-between flex-wrap shadow w-full py-2">
        <div className="w-full flex flex-col items-center lg:flex-row">
          {/* FSWEPP Logo */}
          <Link to="/" className="mb-4 px-4" onClick={handleLogoClick}>
            <img
              src="/FSWEPPLOGO.png"
              alt="FSWEPP Logo"
              className="w-full max-w-xs lg:w-48"
            />
          </Link>
          {/* Prediction Models Button */}
          <div className="w-full lg:w-auto lg:pr-6 relative">
            <button
              onClick={() => toggleDropdown("predictionModels")}
              className="nav-link w-full text-left p-2 border-b border-gray-200 lg:border-white text-left text-xl flex justify-between items-center lg:justify-start lg:space-x-2 whitespace-nowrap"
            >
              <span>Prediction Models</span>
              <img
                src={
                  openDropdown === "predictionModels"
                    ? "/upArrow.png"
                    : "/downArrow.png"
                }
                alt="Toggle Dropdown"
                className="ml-2 h-5 w-5 lg:ml-0 lg:h-3 lg:w-3 lg:relative lg:top-0.5"
              />
            </button>
            {/* Prediction Models Dropdown */}
            {openDropdown === "predictionModels" && (
              <div className="dropdown-content w-full flex flex-col lg:absolute lg:top-full lg:left-0 lg:w-auto lg:bg-white lg:shadow-lg lg:z-10 lg:flex-row lg:border-2 lg:min-w-max">
                <div className="list1 p-2 border-b border-gray-200 text-l lg:border-none">
                  <div className="text-m p-2 border-b border-gray-200 font-bold lg:border-none">
                    Hillslope and Runoff
                  </div>
                  <a
                    href="/list1-item1"
                    className="block pl-4 py-2 whitespace-nowrap"
                  >
                    WEPP: Road
                  </a>
                  <a
                    href="/list1-item2"
                    className="block pl-4 py-2 whitespace-nowrap"
                  >
                    WEPP: Road Batch
                  </a>
                  <a
                    href="/list1-item3"
                    className="block pl-4 py-2 whitespace-nowrap"
                  >
                    ERMiT
                  </a>
                  <a
                    href="/list1-item4"
                    className="block pl-4 py-2 whitespace-nowrap"
                  >
                    ERMiT Batch
                  </a>
                  <a
                    href="/list1-item5"
                    className="block pl-4 py-2 whitespace-nowrap"
                  >
                    Distributed WEPP
                  </a>
                  <a
                    href="/list1-item6"
                    className="block pl-4 py-2 flex items-center whitespace-nowrap"
                  >
                    Distributed WEPP Batch
                    <img
                      src="/external-link.svg"
                      alt="External Link"
                      className="ml-2 h-4 w-4"
                    />
                  </a>
                  <div className="text-m p-2 border-b border-gray-200 font-bold lg:border-none">
                    Watershed
                  </div>
                  <a
                    href="/list2-item1"
                    className="block pl-4 py-2 whitespace-nowrap"
                  >
                    Tahoe Basin Sediment Model
                  </a>
                  <a
                    href="/list2-item2"
                    className="block pl-4 py-2 flex items-center whitespace-nowrap"
                  >
                    WEPPcloud
                    <img
                      src="/external-link.svg"
                      alt="External Link"
                      className="ml-2 h-4 w-4"
                    />
                  </a>
                </div>
              </div>
            )}
          </div>
          {/* Tools and Resources Button */}
          <div className="w-full lg:w-auto lg:pr-6 relative">
            <button
              onClick={() => toggleDropdown("tools")}
              className="nav-link w-full text-left p-2 border-b border-gray-200 lg:border-white text-left text-xl flex justify-between items-center lg:justify-start lg:space-x-2 whitespace-nowrap"
            >
              <span>Tools and Resources</span>
              <img
                src={
                  openDropdown === "tools" ? "/upArrow.png" : "/downArrow.png"
                }
                alt="Toggle Dropdown"
                className="ml-2 h-5 w-5 lg:ml-0 lg:h-3 lg:w-3 lg:relative lg:top-0.5"
              />
            </button>
            {/* Tools and Resources Dropdown */}
            {openDropdown === "tools" && (
              <div className="dropdown-content w-full flex flex-col lg:absolute lg:top-full lg:left-0 lg:w-auto lg:bg-white lg:shadow-lg lg:z-10 lg:flex-row lg:border-2 lg:min-w-max">
                <div className="list1 p-2 text-l lg:border-none">
                  <div className="text-m p-2 font-bold lg:border-none">
                    Cligen Resources
                  </div>
                  <a
                    href="/rockclime"
                    className="block pl-4 py-2 whitespace-nowrap"
                  >
                    Rock CliMe
                  </a>
                  <a
                    href="/list1-item2"
                    className="block pl-4 py-2 whitespace-nowrap"
                  >
                    CliGen Weather Generator
                  </a>
                  <a
                    href="/list1-item3"
                    className="block pl-4 py-2 whitespace-nowrap"
                  >
                    Distributed WEPP
                  </a>
                  <a
                    href="/list1-item4"
                    className="block pl-4 py-2 whitespace-nowrap"
                  >
                    ARS Water Database
                  </a>
                  <a
                    href="/list1-item5"
                    className="block pl-4 py-2 whitespace-nowrap"
                  >
                    FuME (Fuel Management)
                  </a>
                  <div className="text-m p-2 font-bold lg:border-none">
                    Other WEPP Resources
                  </div>
                  <a
                    href="/list2-item1"
                    className="block pl-4 py-2 whitespace-nowrap"
                  >
                    Legacy MFSL WEPP Interfaces
                  </a>
                  <a
                    href="/list2-item2"
                    className="block pl-4 py-2 flex items-center whitespace-nowrap"
                  >
                    USDA ARS WEPP
                    <img
                      src="/external-link.svg"
                      alt="External Link"
                      className="ml-2 h-4 w-4"
                    />
                  </a>
                  <a
                    href="/list2-item3"
                    className="block pl-4 py-2 flex items-center whitespace-nowrap"
                  >
                    NSERL WEPP Web Interface
                    <img
                      src="/external-link.svg"
                      alt="External Link"
                      className="ml-2 h-4 w-4"
                    />
                  </a>
                </div>
              </div>
            )}
          </div>
          {/* Documentation, Contact Us, and Tutorials Button */}
          <a
            href="/documentation"
            className="nav-link w-full text-left p-2 border-b border-gray-200 text-left text-xl lg:w-auto lg:whitespace-nowrap lg:border-white lg:pr-6"
          >
            Documentation
          </a>
          <a
            href="/contact-us"
            className="nav-link w-full text-left p-2 border-b border-gray-200 lg:border-white text-left text-xl lg:w-auto lg:whitespace-nowrap lg:border-white lg:pr-6"
          >
            Contact Us
          </a>
          <a
            href="/tutorials"
            className="nav-link w-full text-left p-2 text-left text-xl flex items-center lg:w-auto lg:whitespace-nowrap lg:border-white lg:pr-6"
          >
            Tutorials
            <img
              src="/external-link.svg"
              alt="External Link"
              className="ml-1 h-5 w-5 relative top-0.5"
            />
          </a>
        </div>
      </nav>
    )
  );
}

export default Navbar;
