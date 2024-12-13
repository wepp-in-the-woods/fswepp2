import React, { useState, useEffect } from "react";
import "./custom-scrollbar.css";

const regions = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "Washington, D.C.",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
];

const additionalRegions = [
  "Pacific Islands",
  "Puerto Rico",
  "Tahoe Basin",
  "Virgin Islands",
  "International",
];

const RockCliMe = () => {
  const [searchInput, setSearchInput] = useState("");
  const [filteredRegions, setFilteredRegions] = useState([...regions, ...additionalRegions]);

  useEffect(() => {
    const filteredMainRegions = regions.filter((region) =>
      region.toLowerCase().startsWith(searchInput.toLowerCase())
    );
    const filteredAdditionalRegions = additionalRegions.filter((region) =>
      region.toLowerCase().startsWith(searchInput.toLowerCase())
    );
    if (filteredAdditionalRegions.length > 0) {
      setFilteredRegions([...filteredMainRegions, "separator", ...filteredAdditionalRegions]);
    } else {
      setFilteredRegions(filteredMainRegions);
    }
  }, [searchInput]);

  return (
    <div className="ml-24 mr-24 mx-auto p-8 space-y-8">
      <div className="text-left">
        <h1 className="text-4xl font-semibold">Rock: Clime</h1>
        <p className="text-xl text-gray-700">
          Rocky Mountain Research Station Climate Generator
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-4">
          <div>
            <label className="block text-xl font-semibold mb-1.5">Region</label>
            <label className="text-md text-gray-600 mt-2">
              Select a region to display the climate stations in the region
            </label>
          </div>
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search for a region"
              className="w-full px-4 py-2 border border-gray-300 rounded pr-10"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <img
              src="search-icon.svg"
              alt="Search Icon"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
            />
          </div>
          <div className="space-y-2 h-64 overflow-y-auto border border-gray-300 rounded custom-scrollbar">
            <div className="mb-3"></div>
            {filteredRegions.map((region, index) => {
              if (region === "separator") {
                return (
                  <div
                    key={index}
                    className="border-b-2 border-dotted border-gray-400 mx-4"
                  ></div>
                );
              }
              return (
                <label
                  key={index}
                  className={`flex items-center space-x-2 ml-4 mr-4 pb-2 ${
                    index !== filteredRegions.length - 1 &&
                    filteredRegions[index + 1] !== "separator"
                      ? "border-b border-gray-300"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="region"
                    className="text-green-500 focus:ring-green-500"
                  />
                  <span>{region}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RockCliMe;
