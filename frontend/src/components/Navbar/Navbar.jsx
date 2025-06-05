import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "@/components/ui/icon";
import { ChevronDown, ChevronUp, ExternalLink, Menu, X } from "lucide-react";

const menuConfig = {
  predictionModels: [
    {
      title: "Hillslope and Runoff",
      items: [
        { href: "/list1-item1", label: "WEPP: Road", external: false },
        { href: "/list1-item2", label: "WEPP: Road Batch", external: false },
        { href: "/list1-item3", label: "ERMiT", external: false },
        { href: "/list1-item4", label: "ERMiT Batch", external: false },
        { href: "/list1-item5", label: "Distributed WEPP", external: false },
        {
          href: "/list1-item6",
          label: "Distributed WEPP Batch",
          external: true,
        },
      ],
    },
    {
      title: "Watershed",
      items: [
        {
          href: "/list2-item1",
          label: "Tahoe Basin Sediment Model",
          external: false,
        },
        { href: "/list2-item2", label: "WEPPcloud", external: true },
        {
          href: "/list2-item3",
          label: "Lake Tahoe WEPP Watershed GIS Interface",
          external: true,
        },
        { href: "/list2-item4", label: "QWEPP", external: true },
        {
          href: "/list2-item5",
          label: "FuME (Fuel Management)",
          external: true,
        },
      ],
    },
  ],
  tools: [
    {
      title: "Cligen Resources",
      items: [
        { href: "/rockclime", label: "Rock CliMe", external: false },
        {
          href: "/list1-item2",
          label: "CliGen Weather Generator",
          external: true,
        },
        { href: "/list1-item3", label: "Distributed WEPP", external: false },
        { href: "/list1-item4", label: "ARS Water Database", external: true },
        {
          href: "/list1-item5",
          label: "FuME (Fuel Management)",
          external: false,
        },
      ],
    },
    {
      title: "Other WEPP Resources",
      items: [
        {
          href: "/list2-item1",
          label: "Legacy MFSL WEPP Interfaces",
          external: false,
        },
        { href: "/list2-item2", label: "USDA ARS WEPP", external: true },
        {
          href: "/list2-item3",
          label: "NSERL WEPP Web Interface",
          external: true,
        },
      ],
    },
  ],
};

const NavLink = ({ href, label, external = false, className = "" }) => {
  return external ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex flex-row items-start justify-start gap-2 py-2 pl-4 text-lg leading-none font-medium lg:p-0 lg:text-base lg:whitespace-nowrap ${className}`}
    >
      {label}
      <Icon icon={ExternalLink} className="h-3.5 w-3.5" />
    </a>
  ) : (
    <Link
      to={href}
      className={`inline-flex flex-row items-start justify-start gap-1 py-2 pl-4 text-lg leading-none font-medium lg:p-0 lg:text-base lg:whitespace-nowrap ${className}`}
    >
      {label}
    </Link>
  );
};

const MenuSection = ({ title, items }) => (
  <div className="inline-flex flex-col items-start justify-start lg:gap-3">
    <div className="inline-flex grow-1 flex-col items-start justify-start gap-2.5 self-stretch rounded-md bg-white px-6 py-2 lg:p-3">
      <div className="justify-start text-base leading-tight font-normal text-slate-500 lg:text-base">
        {title}
      </div>
    </div>
    {items.map((item, index) => (
      <div
        key={index}
        className="flex grow-1 flex-row items-center justify-start gap-2.5 self-stretch rounded-md bg-white p-3"
      >
        <div className="flex flex-row items-start justify-start gap-1">
          <NavLink {...item} />
        </div>
      </div>
    ))}
  </div>
);

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
      <nav className="bg-background w-full">
        {/* Set a fixed height for the navbar */}
        <div className="flex h-14 flex-col items-center px-3 md:px-6 lg:flex-row lg:gap-6">
          <div className="flex h-full w-full flex-row items-center justify-between border-none lg:w-auto">
            {/* FSWEPP Logo */}
            <Link
              to="/"
              className="flex items-center lg:h-full"
              onClick={handleLogoClick}
            >
              <img
                src="/FSWEPPLOGO.png"
                alt="FSWEPP Logo"
                className="mb-2 h-full max-h-8 items-center object-contain"
              />
            </Link>
            {/* Hamburger Menu Button (visible on mobile) */}
            <button
              onClick={toggleMobileMenu}
              className="px-2 lg:hidden"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <Icon icon={X} className="" />
              ) : (
                <Icon icon={Menu} className="" />
              )}
            </button>
          </div>
          {/* Primary navigation for desktop */}
          <div
            aria-label="Primary Navigation"
            className="hidden w-fit flex-col lg:flex lg:h-full lg:flex-row lg:items-center lg:justify-center"
          >
            {/* Prediction Models Button */}
            <div className="relative w-full lg:w-auto">
              <button
                onClick={() => toggleDropdown("predictionModels")}
                className="nav-link xl:text-l flex w-full items-center justify-between gap-2 border-b border-gray-200 px-4 py-2 text-left text-xl whitespace-nowrap md:text-2xl lg:border-none lg:text-base 2xl:text-xl"
              >
                <span>Prediction Models</span>
                {openDropdown === "predictionModels" ? (
                  <Icon icon={ChevronUp} className="" />
                ) : (
                  <Icon icon={ChevronDown} className="" />
                )}
              </button>
              {/* Prediction Models Dropdown */}
              {openDropdown === "predictionModels" && (
                <div className="inline-flex flex-col items-start justify-start gap-2.5 bg-white p-6 outline -outline-offset-1 outline-slate-200 lg:absolute lg:top-full lg:left-0 lg:w-auto lg:rounded-md lg:shadow-[0px_4px_6px_0px_rgba(0,0,0,0.09)]">
                  <div className="inline-flex items-start justify-start gap-3">
                    {menuConfig.predictionModels.map((section, index) => (
                      <MenuSection key={index} {...section} />
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Tools and Resources Button */}
            <div className="relative w-full border-b border-gray-200 lg:w-auto lg:border-none">
              <button
                onClick={() => toggleDropdown("tools")}
                className="nav-link xl:text-l flex w-full items-center justify-between gap-2 border-b border-gray-200 px-4 py-2 text-left text-xl leading-tight font-medium whitespace-nowrap text-slate-800 md:text-lg lg:border-none lg:text-base 2xl:text-xl"
              >
                <span>Tools and Resources</span>
                {openDropdown === "tools" ? (
                  <Icon icon={ChevronUp} className="" />
                ) : (
                  <Icon icon={ChevronDown} className="" />
                )}
              </button>
              {/* Tools and Resources Dropdown */}
              {openDropdown === "tools" && (
                <div className="inline-flex flex-col items-start justify-start gap-2.5 bg-white p-6 outline -outline-offset-1 outline-slate-200 lg:absolute lg:top-full lg:left-0 lg:w-auto lg:rounded-md lg:shadow-[0px_4px_6px_0px_rgba(0,0,0,0.09)]">
                  <div className="inline-flex items-start justify-start gap-3">
                    {menuConfig.tools.map((section, index) => (
                      <MenuSection key={index} {...section} />
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Documentation, Contact Us, and Tutorials Button */}
            <div className="relative w-full border-b border-gray-200 lg:w-auto lg:border-none">
              <a
                href="/documentation"
                className="nav-link xl:text-l flex w-full items-center px-4 py-2 text-left text-xl whitespace-nowrap md:text-2xl lg:text-base 2xl:text-xl"
              >
                Documentation
              </a>
            </div>
            <div className="relative w-full border-b border-gray-200 lg:w-auto lg:border-none">
              <a
                href="/contact-us"
                className="nav-link xl:text-l flex w-full items-center px-4 py-2 text-left text-xl md:text-2xl lg:text-base lg:whitespace-nowrap 2xl:text-xl"
              >
                Contact Us
              </a>
            </div>
            <div className="relative w-full border-b border-gray-200 lg:w-auto lg:border-none">
              <a
                href="/tutorials"
                className="nav-link xl:text-l flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-xl md:text-2xl lg:text-base lg:whitespace-nowrap 2xl:text-xl"
              >
                <span>Tutorials</span>
                <Icon icon={ExternalLink} className="" />
              </a>
            </div>
          </div>
        </div>
        {/* Mobile Primary Navigation (visible when hamburger is clicked) */}
        {mobileMenuOpen && (
          <div className="absolute top-14 left-0 flex w-full flex-col items-center bg-white shadow-lg lg:hidden">
            <button
              onClick={() => toggleDropdown("predictionModels")}
              className="nav-link flex w-full items-center justify-between border-b border-gray-200 px-4 py-3 text-left text-xl md:px-6"
            >
              <span>Prediction Models</span>
              {openDropdown === "predictionModels" ? (
                <Icon icon={ChevronUp} className="" />
              ) : (
                <Icon icon={ChevronDown} className="" />
              )}
            </button>
            {openDropdown === "predictionModels" && (
              <div className="flex w-full flex-col border-b border-gray-200">
                {menuConfig.predictionModels.map((section, index) => (
                  <MenuSection key={index} {...section} />
                ))}
              </div>
            )}
            <button
              onClick={() => toggleDropdown("tools")}
              className="nav-link flex w-full items-center justify-between border-b border-gray-200 px-4 py-3 text-left text-xl md:px-6"
            >
              <span>Tools and Resources</span>
              {openDropdown === "tools" ? (
                <Icon icon={ChevronUp} className="" />
              ) : (
                <Icon icon={ChevronDown} className="" />
              )}
            </button>

            {openDropdown === "tools" && (
              <div className="flex w-full flex-col border-b border-gray-200">
                {menuConfig.tools.map((section, index) => (
                  <MenuSection key={index} {...section} />
                ))}
              </div>
            )}
            {/* Documentation, Contact Us, and Tutorials Button */}
            <div className="relative w-full items-center justify-between border-b border-gray-200 px-4 py-3 md:px-6 lg:w-auto lg:border-none">
              <a
                href="/documentation"
                className="nav-link flex w-full items-center text-left text-xl"
              >
                Documentation
              </a>
            </div>
            <div className="relative w-full items-center justify-between border-b border-gray-200 px-4 py-3 md:px-6 lg:w-auto lg:border-none">
              <a
                href="/contact-us"
                className="nav-link flex w-full items-center text-left text-xl"
              >
                Contact Us
              </a>
            </div>
            <div className="relative w-full items-center justify-between border-b border-gray-200 px-4 py-3 md:px-6 lg:w-auto lg:border-none">
              <a
                href="/tutorials"
                className="nav-link flex w-full items-center justify-between gap-2 text-left text-xl"
              >
                Tutorials
                <Icon icon={ExternalLink} className="" />
              </a>
            </div>
          </div>
        )}
      </nav>
    )
  );
}

export default Navbar;
