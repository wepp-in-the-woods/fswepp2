import React from 'react';

const RockCliMe = () => {
  return (
    // Main div
    <div>
      <div class="max-w-6xl mx-auto p-8 space-y-8">
  <div class="text-center">
    <h1 class="text-2xl font-bold">Rock: Clime</h1>
    <p class="text-gray-500">Rocky Mountain Research Station Climate Generator</p>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
    <div class="space-y-4">
      <label class="block text-lg font-semibold">Region</label>
      <input type="text" placeholder="Search for a region" class="w-full px-4 py-2 border border-gray-300 rounded"/>
      <div class="space-y-2">
        <label class="flex items-center space-x-2">
          <input type="radio" name="region" class="text-green-500 focus:ring-green-500"/>
          <span>Alabama</span>
        </label>
        <label class="flex items-center space-x-2">
          <input type="radio" name="region" class="text-green-500 focus:ring-green-500"/>
          <span>Arizona</span>
        </label>
        <label class="flex items-center space-x-2">
          <input type="radio" name="region" class="text-green-500 focus:ring-green-500"/>
          <span>California</span>
        </label>
        <label class="flex items-center space-x-2">
          <input type="radio" name="region" checked class="text-green-500 focus:ring-green-500"/>
          <span>Idaho</span>
        </label>
        <label class="flex items-center space-x-2">
          <input type="radio" name="region" class="text-green-500 focus:ring-green-500"/>
          <span>Oregon</span>
        </label>
      </div>
    </div>

    <div class="space-y-4">
      <label class="block text-lg font-semibold">Climate station</label>
      <input type="text" placeholder="Search for climate station" class="w-full px-4 py-2 border border-gray-300 rounded"/>
      <div class="space-y-2">
        <label class="flex items-center space-x-2">
          <input type="radio" name="station" class="text-green-500 focus:ring-green-500"/>
          <span>ARBON 2NW ID</span>
        </label>
        <label class="flex items-center space-x-2">
          <input type="radio" name="station" class="text-green-500 focus:ring-green-500"/>
          <span>BURLEY CAA AP ID</span>
        </label>
        <label class="flex items-center space-x-2">
          <input type="radio" name="station" class="text-green-500 focus:ring-green-500"/>
          <span>CRATERS OF MOON NM ID</span>
        </label>
        <label class="flex items-center space-x-2">
          <input type="radio" name="station" class="text-green-500 focus:ring-green-500"/>
          <span>IDAHO FALLS CAA AP ID</span>
        </label>
        <label class="flex items-center space-x-2">
          <input type="radio" name="station" checked class="text-green-500 focus:ring-green-500"/>
          <span>MOSCOW U OF I ID</span>
        </label>
      </div>
    </div>
    <div class="space-y-4">
      <label class="block text-lg font-semibold">Number of years of climate</label>
      <input type="number" value="30" class="w-full px-4 py-2 border border-gray-300 rounded"/>
      <p class="text-gray-500">Approx 26k per year</p>
      <div class="space-y-2">
        <button class="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">View Climate data</button>
        <button class="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">Modify Climate data</button>
        <button class="w-full px-4 py-2 border border-green-500 text-green-500 rounded hover:bg-green-100">Download Climate file</button>
      </div>
    </div>
  </div>
</div>
    </div>
  );
};

export default RockCliMe;