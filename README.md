# FSWEPP2 Frontend Info Doc

**Author:** Damien Flutre  
**Date:** 2/11/2025  

## Links

- **FSWEPP Old Interface:** [https://forest.moscowfsl.wsu.edu/fswepp/](https://forest.moscowfsl.wsu.edu/fswepp/)
- **FSWEPP Mockups:** [Figma Prototype](https://www.figma.com/proto/TuWyx6iGytyIz8fGr6B6Oy/FSWEPP-Mockups?page-id=227%3A3553&node-id=259-4289&viewport=1763%2C965%2C0.23&t=QUhvvcPe2mccdsFT-8&scaling=min-zoom&content-scaling=fixed&starting-point-node-id=227%3A3554&hide-ui=1)
- **FSWEPP2 Repository:** [https://github.com/wepp-in-the-woods/fswepp2](https://github.com/wepp-in-the-woods/fswepp2)

## Introduction

This is a ground-up re-write of FSWEPP, a collection of tools for running the WEPP hydrological model. This document describes the development environment and the frontend.

## Setup and Docker

I started developing FSWEPP(2) using **React** and **Tailwind CSS**. The frontend is set up so that you can simply clone the repository and run the setup defined in `.devcontainer/setup.sh`. The setup commands before line 34 relate to setting up the dev container and downloading dependencies. Lines 36 to 43 define how to start the frontend, while the command on line 33 can be executed in the console to start the backend. Navigating to `localhost:8080/docs` will display a Swagger UI with details about the backend and available API calls.

Without Docker, the setup becomes slow and manual. When using VS Code, creating a unique volume for FSWEPP is as simple as clicking the prompt “create unique volume”. Otherwise, you will need to create a unique volume manually, which will improve performance.

When running `npm list` in `/fswepp/frontend/fswepp2-frontend`, you should see the full dependency list (refer to the repository for the complete output). You may need to run `npm install` on the first run to install all necessary packages.

## Code Setup

- **Navbar.jsx:**  
  The main navigation bar at `localhost:3000/`. It provides both mobile and desktop views.

- **RockCliMe/ Folder:**  
  Contains components for the **RockCliMe** feature, available at `localhost:3000/rockclime`. For reference on the original implementation, check the old FSWEPP interface. Currently, only the mobile view is mostly completed. Although the code is split into four files, a refactoring to a more component-based structure is recommended.
  
  - **RockCliMe.jsx:**  
    The primary file. It currently only implements a mobile view. Using Tailwind, adding a desktop view should be straightforward. This file defines everything except the “Choose Location” flow.
    
  - **ChooseLocation.jsx:**  
    Defines the Map component that appears when “Choose Location” is clicked on the mobile view. This component is a work in progress due to issues encountered during refactoring. To revert to the pre-refactor version, refer to commit SHA `ca6b6a88b8bd8b592741a1c2e025aaa6d300a123`, labelled “Stations on map appear once zoomed in enough, update based on viewed area.”
    
  - **StationPar.jsx:**  
    Displays parameter data and provides options when “View Station/Saved Parameters” is clicked.
    
  - **ClimateData.jsx:**  
    Generates and displays climate data based on API parameters when “Generate Climate Data” is clicked.

- **Main.py:**  
  Contains middleware code to manage cookies and route API calls. Most of its functionality pertains to the backend.

## Additional Notes

Planned enhancements include:

- Allowing users to download the climate file.
- Adding loading and movement animations.
- Developing a desktop view for RockCliMe.
- Refactoring RockCliMe components.
- Implementing error messages for incorrect inputs.

For further context on development decisions and conversations, refer to the FSWEPP Discord. If you do not have access, please contact Roger or another team member.

**Tailwind CSS Tip:**  
For efficient CSS development, define mobile components first. Then, add styles for larger screens using the `md:` and `lg:` prefixes, as demonstrated in `Navbar.jsx`.
