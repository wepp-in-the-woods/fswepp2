import React from 'react';

function Navbar() {
    return (
      <nav className="flex items-center justify-between px-16 py-4 bg-white shadow">
        <div className="flex items-center space-x-2">
          <img
            src="/fswepp-logo.png"
            alt="Logo"
            className="h-6"
          />
          <span className="text-lg font-bold text-green-700">FSWEPP</span>
        </div>
        
        <div className="flex items-center space-x-8">
          <div className="relative group">
          <button type="button" class="inline-flex w-full justify-center gap-x-0.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900" id="prediction-models-button" aria-expanded="true" aria-haspopup="true">
            Prediction Models
            <svg class="-mr-1 size-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" data-slot="icon">
            <path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
            </svg>
          </button>
            <div className="hidden group-hover:block absolute mt-2 bg-white border rounded shadow-lg">
              <ul className="py-2">
                <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer">Option 1</li>
                <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer">Option 2</li>
              </ul>
            </div>
          </div>
          <div className="relative group">
          <button type="button" class="inline-flex w-full justify-center gap-x-0.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900" id="tools-resources-button" aria-expanded="true" aria-haspopup="true">
            Tools and Resources
            <svg class="-mr-1 size-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" data-slot="icon">
            <path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
            </svg>
          </button>
            <div className="hidden group-hover:block absolute mt-2 bg-white border rounded shadow-lg">
              <ul className="py-2">
                <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer">Tool 1</li>
                <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer">Tool 2</li>
              </ul>
            </div>
          </div>
          <a
            href="#"
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Documentation
          </a>
          <a
            href="#"
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Contact Us
          </a>
          <a
            href="#"
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Tutorials
          </a>
        </div>
  
        <div className="flex items-center space-x-2">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-l hover:bg-gray-200">
            Metric
          </button>
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border-l border-gray-300 rounded-r hover:bg-gray-200">
            US Customary
          </button>
          <button className="ml-4 text-gray-600 hover:text-gray-900">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v12m6-6H6"
              />
            </svg>
          </button>
        </div>
      </nav>
    );
  };
  
  export default Navbar;