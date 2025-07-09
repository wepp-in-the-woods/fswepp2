import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "@/components/ui/icon.tsx";
import { ChevronDown, ChevronUp, ExternalLink, Menu, X } from "lucide-react";

import { hillslopeModels, watershedModels } from "@/data/models.js";
import { cligen, otherWeppResources } from "@/data/tools.js";

// Type definitions
interface NavLinkProps {
  href: string;
  label: string;
  isExternal?: boolean;
  className?: string;
  onClick?: () => void;
}

interface MenuItem {
  href: string;
  label: string;
  external?: boolean;
}

interface MenuSectionProps {
  title: string;
  items: MenuItem[];
  onLinkClick: () => void;
}

interface NavbarProps {
  isVisible: boolean;
  toggleVisibility: () => void;
}

const menuConfig = {
  predictionModels: [
    {
      title: "Hillslope and Runoff",
      items: hillslopeModels,
    },
    {
      title: "Watershed",
      items: watershedModels,
    },
  ],
  tools: [
    {
      title: "Cligen Resources",
      items: cligen,
    },
    {
      title: "Other WEPP Resources",
      items: otherWeppResources,
    },
  ],
};

function NavLink({
  href,
  label,
  isExternal = false,
  className = "",
  onClick,
}: NavLinkProps){
  return isExternal ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex flex-row items-start justify-start gap-2 py-2 pl-4 text-lg leading-none font-medium lg:p-0 lg:text-base lg:whitespace-nowrap ${className}`}
      onClick={onClick}
    >
      {label}
      <Icon icon={ExternalLink} className="h-3.5 w-3.5" />
    </a>
  ) : (
    <Link
      to={href}
      className={`inline-flex flex-row items-start justify-start gap-1 py-2 pl-4 text-lg leading-none font-medium lg:p-0 lg:text-base lg:whitespace-nowrap ${className}`}
      onClick={onClick}
    >
      {label}
    </Link>
  );
}

function MenuSection ({ title, items, onLinkClick }: MenuSectionProps) {
  return (
    <div className="inline-flex flex-col items-start justify-start lg:gap-3">
      <div
        className="inline-flex grow-1 flex-col items-start justify-start gap-2.5 self-stretch rounded-md bg-white px-6 py-2 lg:p-3">
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
            <NavLink {...item} onClick={onLinkClick} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Navbar component
function Navbar ({ isVisible, toggleVisibility }: NavbarProps) {
  // State to keep track of which dropdown is open
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // State to manage mobile menu visibility
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Hook to navigate to different pages
  const navigate = useNavigate();

  // Function to toggle the dropdown
  const toggleDropdown = (dropdown: string) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  // Function to handle link click
  const handleDropdownLinkClick = () : void => {
    setOpenDropdown(null);
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }

  };

  // Function to handle the logo click
  const handleLogoClick = () :void => {
    toggleVisibility();
    navigate("/");
  };

  // Function to handle mobile menu toggle
  const toggleMobileMenu = () :void => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    isVisible && (
      <nav className="bg-background w-full">
        {/* Set a fixed height for the navbar */}
        <div className="flex h-14 flex-col items-center px-6 lg:flex-row lg:gap-6">
          <div className="flex h-full w-full flex-row items-center justify-between border-none lg:w-auto">
            {/* FSWEPP Logo */}
            <Link
              to="/"
              className="flex items-center lg:h-full"
              onClick={handleLogoClick}
            >
              <img
                src="/fswepp-logo.png"
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
                className="nav-link flex w-full items-center justify-between gap-2 border-b border-gray-200 px-4 py-2 text-left whitespace-nowrap hover:cursor-pointer lg:border-none"
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
                      <MenuSection
                        key={index}
                        {...section}
                        onLinkClick={handleDropdownLinkClick}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Tools and Resources Button */}
            <div className="relative w-full border-b border-gray-200 lg:w-auto lg:border-none">
              <button
                onClick={() => toggleDropdown("tools")}
                className="nav-link flex w-full items-center justify-between gap-2 border-b border-gray-200 px-4 py-2 text-left leading-tight font-medium whitespace-nowrap text-slate-800 hover:cursor-pointer lg:border-none"
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
                      <MenuSection
                        key={index}
                        {...section}
                        onLinkClick={handleDropdownLinkClick}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Documentation, Contact Us, and Tutorials Button */}
            <div className="relative w-full border-b border-gray-200 lg:w-auto lg:border-none">
              <a
                href="/documentation"
                className="nav-link flex w-full items-center px-4 py-2 text-left whitespace-nowrap"
              >
                Documentation
              </a>
            </div>
            <div className="relative w-full border-b border-gray-200 lg:w-auto lg:border-none">
              <a
                href="/contact-us"
                className="nav-link flex w-full items-center px-4 py-2 text-left lg:whitespace-nowrap"
              >
                Contact Us
              </a>
            </div>
            <div className="relative w-full border-b border-gray-200 lg:w-auto lg:border-none">
              <a
                href="https://www.youtube.com/@fswepp4700/playlists"
                className="nav-link flex w-full items-center justify-between gap-2 px-4 py-2 text-left lg:whitespace-nowrap"
              >
                <span>Tutorials</span>
                <Icon icon={ExternalLink} className="" />
              </a>
            </div>
          </div>
        </div>
        {/* Mobile Primary Navigation (visible when hamburger is clicked) */}
        {mobileMenuOpen && (
          <div className="absolute top-14 left-0 flex max-h-[calc(100vh-3.5rem)] w-full flex-col items-center overflow-y-auto bg-white shadow-lg lg:hidden">
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
                  <MenuSection
                    key={index}
                    {...section}
                    onLinkClick={handleDropdownLinkClick}
                  />
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
                  <MenuSection
                    key={index}
                    {...section}
                    onLinkClick={handleDropdownLinkClick}
                  />
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
                href="https://www.youtube.com/@fswepp4700/playlists"
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
