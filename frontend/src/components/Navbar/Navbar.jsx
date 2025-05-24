import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

// Navbar component
function Navbar({ isVisible, toggleVisibility }) {

  // State to keep track of which dropdown is open
  const [openDropdown, setOpenDropdown] = useState(null);

  // State to manage mobile menu visibility
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Hook to navigate to different pages
  const navigate = useNavigate();

  // Function to toggle the dropdown
  const toggleDropdown = (dropdown) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  // Function to handle the logo click
  const handleLogoClick = () => {
    toggleVisibility();
    navigate("/");
  };

  // Function to handle mobile menu toggle
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    isVisible && (
      <nav className="w-full py-3 shadow navbar h-16">
        {" "}
        
        {/* Set a fixed height for the navbar */}
        <div className="w-full flex flex-col items-center lg:flex-row h-full space-x-6">
          <div className="w-full items-center justify-between flex lg:flex-row border-none lg:w-auto lg:h-full">
            {/* FSWEPP Logo */}
            <Link
              to="/"
              className="px-4 flex items-center lg:h-full "
              onClick={handleLogoClick}
            >
              <img
                src="/FSWEPPLOGO.png"
                alt="FSWEPP Logo"
                className="mb-2 h-full max-h-8 items-center object-contain"
              />
            </Link>
            {/* Hamburger Menu Button (visible on mobile) */}
            <button onClick={toggleMobileMenu} className="px-4 lg:hidden">
              {mobileMenuOpen ? (
                  <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )
            }
            </button>
          </div>
          {/* Primary navigation for desktop */}
          <div aria-label="Primary Navigation" className="hidden lg:flex w-fit flex flex-col lg:flex-row lg:items-center lg:justify-center lg:h-full">
            {/* Prediction Models Button */}
            <div className="w-full relative lg:w-auto">
              <button
                onClick={() => toggleDropdown("predictionModels")}
                className="nav-link w-full text-left px-4 py-2 border-b border-gray-200 lg:border-none space-x-2 text-left text-xl md:text-2xl lg:text-base xl:text-l 2xl:text-xl flex justify-between items-center whitespace-nowrap"
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
                className="nav-link w-full text-left px-4 py-2 border-b border-gray-200 lg:border-none space-x-2 text-left text-xl md:text-2xl lg:text-base xl:text-l 2xl:text-xl flex justify-between items-center whitespace-nowrap"
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
                className="nav-link w-full text-left px-4 py-2 text-left text-xl md:text-2xl lg:text-base xl:text-l 2xl:text-xl flex items-center"
              >
                Documentation
              </a>
            </div>
            <div className="w-full relative border-b border-gray-200 lg:border-none lg:w-auto lg:whitespace-nowrap">
              <a
                href="/contact-us"
                className="nav-link w-full text-left px-4 py-2 text-left text-xl md:text-2xl lg:text-base xl:text-l 2xl:text-xl flex items-center"
              >
                Contact Us
              </a>
            </div>
            <div className="w-full relative border-b border-gray-200 lg:border-none lg:w-auto lg:whitespace-nowrap lg:mr-4">
              <a
                href="/tutorials"
                className="nav-link w-full text-left px-4 py-2 space-x-2 text-left text-xl md:text-2xl lg:text-base xl:text-l 2xl:text-xl flex items-center"
              >
                Tutorials
                <img
                  src="/external-link.svg"
                  alt="External Link"
                  className="h-5 w-5 relative top-0.5 lg:w-4 lg:h-4"
                />
              </a>
            </div>
          </div>
        </div>
        {/* Mobile Primary Navigation (visible when hamburger is clicked) */}
        {mobileMenuOpen && (
          <div className="block lg:hidden w-full mt-3 flex flex-col items-center bg-white border-t">
            <button
              onClick={() => toggleDropdown("predictionModels")}
              className="nav-link w-full text-left px-4 py-2 border-b border-gray-200 text-xl flex justify-between items-center"
            >
              <span>Prediction Models</span>
              <img
                src={
                  openDropdown === "predictionModels"
                    ? "/upArrow.png"
                    : "/downArrow.png"
                }
                alt="Toggle Dropdown"
                className="ml-2 h-5 w-5"
              />
            </button>
            {openDropdown === "predictionModels" && (
              <div className="w-full flex flex-col border-b border-gray-200">
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
            )}
            <button
              onClick={() => toggleDropdown("tools")}
              className="nav-link w-full text-left px-4 py-2 border-b border-gray-200 text-xl flex justify-between items-center"
            >
              <span>Tools and Resources</span>
              <img
                src={
                  openDropdown === "tools"
                    ? "/upArrow.png"
                    : "/downArrow.png"
                }
                alt="Toggle Dropdown"
                className="ml-2 h-5 w-5"
              />
            </button>
            {openDropdown === "tools" && (
              <div className="w-full flex flex-col border-b border-gray-200">
                <div className="text-m p-2 border-b border-gray-200 font-bold lg:border-none">
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
                  href="/list1-item6"
                  className="block pl-4 py-2 flex items-center whitespace-nowrap"
                >
                  Legacy MFSL WEPP Interfaces
                  <img
                    src="/external-link.svg"
                    alt="External Link"
                    className="ml-2 h-4 w-4 mt-0.5"
                  />
                </a>
                <a
                  href="/list2-item1"
                  className="block pl-4 py-2 whitespace-nowrap"
                >
                  USDA ARS WEPP
                  <img
                    src="/external-link.svg"
                    alt="External Link"
                    className="ml-2 h-4 w-4 mt-0.5"
                  />
                </a>
                <a
                  href="/list2-item2"
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
            )}
            {/* Documentation, Contact Us, and Tutorials Button */}
            <div className="w-full relative border-b border-gray-200 lg:border-none lg:w-auto">
              <a
                href="/documentation"
                className="nav-link w-full text-left px-4 py-2 text-left text-xl md:text-2xl lg:text-base xl:text-l 2xl:text-xl flex items-center"
              >
                Documentation
              </a>
            </div>
            <div className="w-full relative border-b border-gray-200 lg:border-none lg:w-auto lg:whitespace-nowrap">
              <a
                href="/contact-us"
                className="nav-link w-full text-left px-4 py-2 text-left text-xl md:text-2xl lg:text-base xl:text-l 2xl:text-xl flex items-center"
              >
                Contact Us
              </a>
            </div>
            <div className="w-full relative border-b border-gray-200 lg:border-none lg:w-auto lg:whitespace-nowrap lg:mr-4">
              <a
                href="/tutorials"
                className="nav-link w-full text-left px-4 py-2 space-x-2 text-left text-xl md:text-2xl lg:text-base xl:text-l 2xl:text-xl flex items-center"
              >
                Tutorials
                <img
                  src="/external-link.svg"
                  alt="External Link"
                  className="h-5 w-5 relative top-0.5 lg:w-4 lg:h-4"
                />
              </a>
            </div>
          </div>
        )}
      </nav>
    )
  );
}

export default Navbar;