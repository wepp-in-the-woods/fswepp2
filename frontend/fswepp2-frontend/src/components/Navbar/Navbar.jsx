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
      <nav className="w-full py-2 lg:shadow navbar h-16">
        {" "}
        {/* Set a fixed height for the navbar */}
        <div className="w-full flex flex-col items-center lg:flex-row h-full">
          <div className="w-full items-center flex lg:flex-row border-b border-gray-200 lg:border-none lg:w-auto lg:h-full">
            {/* FSWEPP Logo */}
            <Link
              to="/"
              className="mb-4 px-4 flex items-center lg:h-full "
              onClick={handleLogoClick}
            >
              <img
                src="/FSWEPPLOGO.png"
                alt="FSWEPP Logo"
                className="h-full max-h-full"
              />
            </Link>
          </div>
          {/* Prediction Models Button */}
          <div className="w-full relative lg:w-auto">
            <button
              onClick={() => toggleDropdown("predictionModels")}
              className="nav-link w-full text-left p-2 border-b border-gray-200 lg:border-none text-left text-xl md:text-2xl lg:text-base xl:text-l 2xl:text-xl flex justify-between items-center whitespace-nowrap"
            >
              <span>Prediction Models</span>
              <img
                src={
                  openDropdown === "predictionModels"
                    ? "/upArrow.png"
                    : "/downArrow.png"
                }
                alt="Toggle Dropdown"
                className="ml-2 h-5 w-5 lg:w-3 lg:h-3 lg:ml-1 lg:mt-1"
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
                      className="ml-2 h-4 w-4 mt-0.5"
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
          <div className="w-full relative lg:w-auto">
            <button
              onClick={() => toggleDropdown("tools")}
              className="nav-link w-full text-left p-2 border-b border-gray-200 lg:border-none text-left text-xl md:text-2xl lg:text-base xl:text-l 2xl:text-xl flex justify-between items-center whitespace-nowrap"
            >
              <span>Tools and Resources</span>
              <img
                src={
                  openDropdown === "tools" ? "/upArrow.png" : "/downArrow.png"
                }
                alt="Toggle Dropdown"
                className="ml-2 h-5 w-5 lg:w-3 lg:h-3 lg:ml-1 lg:mt-1"
              />
            </button>
            {/* Tools and Resources Dropdown */}
            {openDropdown === "tools" && (
              <div className="dropdown-content w-full flex flex-col lg:absolute lg:top-full lg:left-0 lg:w-auto lg:bg-white lg:shadow-lg lg:z-20 lg:flex-row lg:border-2 lg:min-w-max">
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
          <div className="w-full relative border-b border-gray-200 lg:border-none lg:w-auto">
            <a
              href="/documentation"
              className="nav-link w-full text-left p-2 text-left text-xl md:text-2xl lg:text-base xl:text-l 2xl:text-xl flex items-center"
            >
              Documentation
            </a>
          </div>
          <div className="w-full relative border-b border-gray-200 lg:border-none lg:w-auto lg:whitespace-nowrap">
            <a
              href="/contact-us"
              className="nav-link w-full text-left p-2 text-left text-xl md:text-2xl lg:text-base xl:text-l 2xl:text-xl flex items-center"
            >
              Contact Us
            </a>
          </div>
          <div className="w-full relative border-b border-gray-200 lg:border-none lg:w-auto lg:whitespace-nowrap lg:mr-4">
            <a
              href="/tutorials"
              className="nav-link w-full text-left p-2 text-left text-xl md:text-2xl lg:text-base xl:text-l 2xl:text-xl flex items-center"
            >
              Tutorials
              <img
                src="/external-link.svg"
                alt="External Link"
                className="ml-1 h-5 w-5 relative top-0.5 lg:w-4 lg:h-4 lg:ml-1 lg:-mt-0.5"
              />
            </a>
          </div>
        </div>
      </nav>
    )
  );
}

export default Navbar;