import React from 'react';

const RockCliMe = () => {
  return (
    // Main div
    <div>
      <div className="max-w-6xl mx-auto p-8 space-y-8">
  <div className="text-center">
    <h1 className="text-2xl font-bold">Rock: Clime</h1>
    <p className="text-gray-500">Rocky Mountain Research Station Climate Generator</p>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
    <div className="space-y-4">
      <label className="block text-lg font-semibold">Region</label>
      <input type="text" placeholder="Search for a region" className="w-full px-4 py-2 border border-gray-300 rounded"/>
      <div className="space-y-2">
        <label className="flex items-center space-x-2">
          <input type="radio" name="region" className="text-green-500 focus:ring-green-500"/>
          <span>Alabama</span>
        </label>
        <label className="flex items-center space-x-2">
          <input type="radio" name="region" className="text-green-500 focus:ring-green-500"/>
          <span>Arizona</span>
        </label>
        <label className="flex items-center space-x-2">
          <input type="radio" name="region" className="text-green-500 focus:ring-green-500"/>
          <span>California</span>
        </label>
        <label className="flex items-center space-x-2">
          <input type="radio" name="region" checked className="text-green-500 focus:ring-green-500"/>
          <span>Idaho</span>
        </label>
        <label className="flex items-center space-x-2">
          <input type="radio" name="region" className="text-green-500 focus:ring-green-500"/>
          <span>Oregon</span>
        </label>
      </div>
    </div>

    <div className="space-y-4">
      <label className="block text-lg font-semibold">Climate station</label>
      <input type="text" placeholder="Search for climate station" className="w-full px-4 py-2 border border-gray-300 rounded"/>
      <div className="space-y-2">
        <label className="flex items-center space-x-2">
          <input type="radio" name="station" className="text-green-500 focus:ring-green-500"/>
          <span>ARBON 2NW ID</span>
        </label>
        <label className="flex items-center space-x-2">
          <input type="radio" name="station" className="text-green-500 focus:ring-green-500"/>
          <span>BURLEY CAA AP ID</span>
        </label>
        <label className="flex items-center space-x-2">
          <input type="radio" name="station" className="text-green-500 focus:ring-green-500"/>
          <span>CRATERS OF MOON NM ID</span>
        </label>
        <label className="flex items-center space-x-2">
          <input type="radio" name="station" className="text-green-500 focus:ring-green-500"/>
          <span>IDAHO FALLS CAA AP ID</span>
        </label>
        <label className="flex items-center space-x-2">
          <input type="radio" name="station" checked className="text-green-500 focus:ring-green-500"/>
          <span>MOSCOW U OF I ID</span>
        </label>
      </div>
    </div>
    <div className="space-y-4">
      <label className="block text-lg font-semibold">Number of years of climate</label>
      <input type="number" value="30" className="w-full px-4 py-2 border border-gray-300 rounded"/>
      <p className="text-gray-500">Approx 26k per year</p>
      <div className="space-y-2">
        <button className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">View Climate data</button>
        <button className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">Modify Climate data</button>
        <button className="w-full px-4 py-2 border border-green-500 text-green-500 rounded hover:bg-green-100">Download Climate file</button>
      </div>
    </div>
  </div>
</div>
    </div>
  );
};

export default RockCliMe;