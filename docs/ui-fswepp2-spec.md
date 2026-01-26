# FSWEPP2 UI Specification

## Overview

This document specifies the user interface design for FSWEPP2, a Hono/Bun-based single-page application implementation of the Forest Service Water Erosion Prediction Project tools. The specification covers three primary tools: WEPP Road, Disturbed WEPP, and ERMiT.

### Design Philosophy

- **Single Page Applications**: Each tool operates as a standalone SPA with controls and results on the same page
- **Shared Components**: All tools share common UI components and client-side code for consistency
- **Minimal Dependencies**: Vanilla JavaScript with minimal external dependencies
- **Canvas-Based Visualizations**: Replace legacy gnuplot charts with canvas-based rendering
- **Async Model Execution**: Non-blocking API calls with loading states
- **Stateless Architecture**: No user authentication or server-side user database; all user preferences stored in cookies
- **Test-Driven Quality**: All components and workflows require corresponding test coverage; testing is mandatory during implementation

### Technical Stack

- **Frontend Framework**: Hono/Bun
- **Client-Side**: Vanilla JavaScript (ES6+)
- **Rendering**: Server-side HTML generation with client-side hydration
- **Mapping**: deck.gl for interactive map views
- **Plotting**: HTML5 Canvas API for charts and graphs

### Architecture Decisions

**Stateless, Cookie-Based Design:**

FSWEPP2 uses a stateless architecture with no user authentication or server-side user database. This design choice provides several benefits:

- **Simplicity**: No user account management, password resets, or authentication flows
- **Privacy**: No server-side tracking or storage of user data
- **Performance**: No database queries for user preferences on each request
- **Maintenance**: Reduced infrastructure and security concerns
- **Portability**: Users can clear cookies to reset, export/import configurations via URL

Climate preferences and user-defined climate modifications are stored in browser cookies with 365-day expiry, persisting across all tool pages on the site. Users who want to save scenarios long-term can use URL query parameters to bookmark or share complete configurations.

---

## Key Decisions Summary

This section summarizes critical design decisions confirmed during specification development. See Appendix D for detailed rationale.

### User Experience
- ✅ **RockClim Map**: Inline expansion within panel via a "Map Location" collapsible (no separate Hide Map button)
- ✅ **Location Input**: Two separate longitude/latitude fields (editable for precision)
- ✅ **Units Toggle**: Immediate switch in top-right header (Metric ↔ English, default: Metric)
- ✅ **Form Validation**: Hybrid blur-then-change with inline error messages
- ✅ **Dark Mode**: Light mode only for MVP (infrastructure ready for future)

### Technical Implementation
- ✅ **Testing Requirements**: Mandatory test coverage for all components (90% utils, 80% components); Bun test + Playwright
- ✅ **Icon Strategy**: Hybrid inline SVG (UI) + static files (tools) from React frontend
- ✅ **deck.gl**: Self-hosted (local bundle or static asset), OpenStreetMap basemap
- ✅ **Modal Component**: Custom modal (not native `<dialog>`)
- ✅ **Asset Bundling**: Individual ES modules with a single `app.js` entrypoint
- ✅ **Chart Interactivity**: Hover tooltips with value details (MVP), pan/zoom deferred
- ✅ **Table Pagination**: Client-side, 25 rows default, options: 10/25/50/100/All
- ✅ **Error Handling**: HTTP status-specific messages with actionable guidance
- ✅ **URL Sharing**: Base64-encoded JSON query parameter (`?config=<base64url>`)

### API and Data
- ✅ **Unit System**: API uses SI units only; frontend converts for display
- ✅ **State Management**: Cookies for global (climate, units), localStorage for tool params
- ✅ **Configuration Sharing**: URL query params override cookies/localStorage

### Scope
- ✅ **MVP Exports**: CSV tables + PNG charts
- ⏸️ **Post-MVP**: Intermediate file downloads, PDF reports, batch processing
- ⏸️ **Future**: Dark mode toggle, advanced chart interactions, per-category units

---

## Architecture

### Page Structure

Each tool page follows this common structure:

```
┌──────────────────────────────────────────────┐
│ Navigation / Header                          │
├──────────────────────────────────────────────┤
│ Rock Climate Control (Collapsible)           │
├──────────────────────────────────────────────┤
│ Tool-Specific Control Panel                  │
│ - Input Fields                               │
│ - Run Model Button                           │
├──────────────────────────────────────────────┤
│ Results Section (Initially Hidden)           │
│ - Summary Statistics                         │
│ - Visualizations (Canvas Charts)             │
│ - Detailed Tables                            │
└──────────────────────────────────────────────┘
```

### State Management

State is managed entirely client-side using cookies and JavaScript objects:

- **Climate State (Global)**: ClimatePars object stored in site-wide cookie, persists across all tools
- **Tool State (Page-Specific)**: Tool-specific parameters (WepproadPars, DisturbedWeppPars, ErmitPars) stored in localStorage per tool
- **Results State (Session)**: API response data maintained in memory for current page session
- **UI State (Session)**: Loading indicators, expanded sections, active tabs maintained in memory

**Cookie Storage:**
- `fswepp_climate`: JSON-serialized ClimatePars object (site-wide, 365-day expiry)
- `fswepp_units`: Unit preferences (global SI/English preference + category-specific overrides, 365-day expiry)

**LocalStorage:**
- `fswepp_wepproad_state`: Last used WEPP Road parameters
- `fswepp_disturbed_state`: Last used Disturbed WEPP parameters
- `fswepp_ermit_state`: Last used ERMiT parameters

State is maintained in vanilla JavaScript objects with change detection triggering re-renders of affected components and cookie updates.

---

## Shared Component Library

### Core Components

#### 1. RockClimControl

Implements the climate selection interface as specified by the user. This control builds a `ClimatePars` object that persists across all tools via site-wide cookie.

**Props:**
- `collapsible`: Boolean to enable collapse/expand

**Sub-components:**
- `DatabaseSelect`: Dropdown for selecting database (legacy, 2015, au, ghcn)
- `CligenVersionSelect`: Dropdown for CLIGEN version (4.3, 5.3.2)
- `LocationFields`: Two separate numeric inputs for longitude and latitude
- `MapLocationSection`: Collapsible section containing the deck.gl map
- `MapView`: deck.gl map for location selection (expands inline within panel)
- `StationSelect`: Dynamically populated dropdown of closest stations
- `CustomizeClimateButton`: Opens modal for manual climate adjustment
- `CustomizeClimateModal`: Modal with monthly precip, tmin, tmax adjustments
- `StationParFileSection`: Collapsible section that fetches and displays the station PAR file
- `ClimateFileSection`: Collapsible section that fetches and displays the climate `.cli` file
- `PreformattedBlock`: Shared component for consistent `<pre>` formatting
- `DropAndUpload`: Drag-and-drop upload for importing ClimatePars JSON

**Interactions:**
- On page load, reads climate state from `fswepp_climate` cookie
- Database and CLIGEN version selects update immediately and save to cookie
- **Map Location collapsible** toggles map visibility inline within RockClim panel:
  - Default state: Collapsed, map hidden
  - Click: Section expands to show map inline
  - Collapse: Section header toggles back to hidden map
- **Map interaction**: User clicks point on map to set location
  - Click updates longitude/latitude input fields
  - Triggers API call to `/api/rockclim/GET/closest_stations` with clicked coordinates
  - Station dropdown populates with 10 closest stations
- **Station Par File**: When expanded, prefetches `/api/rockclim/GET/station_par`
  - Displays content in `PreformattedBlock`
  - Provides download link with descriptive filename (`id108137.par`, `prism-modified-id108137.par`, `customized-prism-modified-id108137.par`)
- **Climate File**: When expanded, prefetches `/api/rockclim/GET/climate`
  - Displays content in `PreformattedBlock`
  - Provides download link with descriptive filename mirroring the station par naming
- **Import Climate JSON**: Drop/upload box accepts a formatted ClimatePars JSON file
  - Hydrates climate state and updates controls client-side only
  - Validates schema (arrays length 12, numeric values, known enums)
  - Preserves custom climate descriptions and monthlies
- **Location fields**: User can manually enter exact longitude/latitude values
  - On change, triggers same closest stations API call
  - Updates map center to show entered location
- Station select updates par_id in state and saves to cookie
- Customize button opens modal with current par file monthly data pre-populated
- Modal "Apply" updates the current climate customization
- **State summary**: The collapsible subtitle (beneath "Rock Climate Control") shows
  `Climate: <station>` plus location `(lat, lon)`. Prefixes:
  - `PRISM modified` when `use_prism` is true and no custom climate is active.
  - `Customized <description>` when `user_defined_par_mod` is set.

**Cookie Persistence:**
- Every state change writes updated ClimatePars to `fswepp_climate` cookie
- Climate state automatically available when navigating to any tool page

**Climate State (Cookie-Persisted):**
```javascript
// Cookie: fswepp_climate
{
  database: "legacy" | "2015" | "au" | "ghcn",
  cligen_version: "4.3" | "5.3.2",
  location: { latitude: float, longitude: float } | null,
  par_id: string | null,
  input_years: int,
  use_prism: boolean,
  user_defined_par_mod: {
    description: string,
    ppts: [12 floats],
    tmaxs: [12 floats],
    tmins: [12 floats]
  } | null
}

// User-defined climates are stored in fswepp_climate.user_defined_par_mod only.
```

#### 2. FormField

Generic form input wrapper providing consistent styling and validation feedback.

**Variants:**
- TextInput
- NumberInput
- Select
- RadioGroup
- Checkbox

**Features:**
- Label with optional tooltip
- Validation state (valid, invalid, warning)
- Error message display
- Unit conversion helpers (metric/imperial)
- Real-time validation

#### 3. RunButton

Standardized button for model execution.

**States:**
- Enabled: Ready to run
- Running: Disabled with loading spinner
- Error: Shows error state with retry option
- Success: Brief success state before transitioning back to enabled

**Props:**
- `onClick`: Handler for model execution
- `isRunning`: Boolean indicating execution state
- `error`: Error message if execution failed

#### 4. CollapsibleSection

Expandable/collapsible content container.

**Features:**
- Smooth animation
- Persistent state (localStorage)
- Optional icon/badge in header
- Click-anywhere-to-toggle header

#### 5. PreformattedBlock

Standardized `<pre>` wrapper for showing large text files (station PAR, climate CLI).

**Features:**
- Consistent typography and padding
- Horizontal scrolling with preserved whitespace
- Optional max-height with scroll
- Neutral background for readability

#### 6. DropAndUpload

Reusable drag-and-drop upload surface for small file imports.

**Features:**
- Dotted border with muted label text
- Click-to-upload and drag/drop support
- Optional status messaging for success/error

#### 7. TabPanel

Multi-tab content container.

**Features:**
- Horizontal or vertical orientation
- Active tab indicator
- Lazy rendering of inactive tabs
- Keyboard navigation

#### 8. DataTable

Sortable, filterable data table with client-side pagination.

**Features:**
- Column sorting (ascending/descending)
- Column visibility toggles
- Export to CSV (exports all rows, not just visible page)
- Responsive stacking on mobile
- Fixed header on scroll
- **Client-side pagination**:
  - Default: 25 rows per page
  - Options: 10, 25, 50, 100, All
  - Previous/Next navigation
  - Page number display
  - Jump to page input
  - Total row count display
  - Pagination controls at top and bottom of table

#### 9. StatCard

Display widget for summary statistics.

**Features:**
- Primary value with unit
- Optional trend indicator
- Supporting text/subtitle
- Optional icon or badge

### Visualization Components

#### 8. CanvasChart

Base component for all chart types.

**Features:**
- Responsive canvas sizing
- Export to PNG
- Interactive tooltips
- Legend support
- Axis labeling

**Chart Types:**
- LineChart: Time series and trend lines
- BarChart: Categorical comparisons
- ScatterPlot: Correlation displays
- ExceedanceCurve: Probability distributions
- HistogramChart: Distribution analysis

#### 9. SlopeProfile

Specialized visualization for hillslope geometry.

**Features:**
- 2D cross-section rendering
- OFE (Overland Flow Element) boundaries
- Gradient labels
- Length dimensions
- Vertical exaggeration control

---

## Rock Climate Control Specification

### Layout

The Rock Climate Control appears at the top of every tool page as a collapsible panel.

**Default State:** Collapsed with summary badge showing selected station and location

**Expanded State:** Shows all controls in two-column layout:

**Left Column:**
- Database selection dropdown
- CLIGEN version selection dropdown
- Longitude input field (numeric, editable)
- Latitude input field (numeric, editable)

**Right Column:**
- Station selection dropdown (populated after location set)
- Customize Climate button
- Drop/upload ClimatePars (.json) box

**Below Columns:**
- Map Location collapsible (deck.gl map inline)
- Station Par File collapsible (prefetched, preformatted, downloadable)
- Climate File collapsible (prefetched, preformatted, downloadable)

**Map View** (when visible):
- Expands inline within the RockClim panel inside the Map Location collapsible
- Appears below the control rows
- Full width of panel
- Height: 300-400px (or responsive)

### Location Selection Flow

1. User expands the "Map Location" collapsible
2. RockClim panel shows deck.gl map inline
3. User clicks on map to set location, OR manually enters coordinates
5. **Map Click**:
   - Clicked coordinates populate longitude and latitude input fields
   - Map marker placed at clicked location
6. **Manual Entry**:
   - User types longitude/latitude values directly into input fields
   - Map re-centers to show entered location
   - Marker placed at entered coordinates
7. On location change (click or manual entry):
   - API call to `/api/rockclim/GET/closest_stations` with location
   - Station dropdown populates with 10 closest stations (showing station name, distance, elevation)
   - First station auto-selected by default
8. User collapses "Map Location"
   - Panel contracts back to controls-only view
   - Location coordinates remain in input fields

### Station Selection

Station dropdown displays each station with format:
```
[Station Name] - [Distance] km, [Elevation] m
```

Selection updates `par_id` in climate state and optionally triggers preview of monthly climate data.

### Climate Customization

**Button Label:** "Customize Climate"

**Modal Contents:**

**Header:**
- Modal title: "Customize Climate Parameters"
- Station information display
- Description text field for naming this custom climate

**Body - Three Tables (Side by Side or Stacked):**

1. **Monthly Precipitation (per wet day, mm)**
   - 12 rows (Jan-Dec)
   - Editable number inputs
   - Original value displayed alongside

2. **Monthly Max Temperature (°C)**
   - 12 rows (Jan-Dec)
   - Editable number inputs
   - Original value displayed alongside

3. **Monthly Min Temperature (°C)**
   - 12 rows (Jan-Dec)
   - Editable number inputs
   - Original value displayed alongside

**Footer:**
- "Export to JSON" button (downloads current ClimatePars with custom monthlies)
- "Reset to Original" button (restores PAR file defaults)
- "Apply" button (applies to current session, updates `fswepp_climate` cookie)
- "Cancel" button

**Behavior:**
- On open, fetch `/api/rockclim/GET/station_par_monthlies` to populate with current values
- Input changes update preview calculations in real-time
- "Apply" updates `user_defined_par_mod` in climate state and saves to `fswepp_climate` cookie
- Applied customizations persist in cookie and are available across all tool pages
- "Delete Climate" clears `user_defined_par_mod` and reverts to base station values (outside the modal)

### PRISM Spatialization

**UI Element:** Checkbox "Use PRISM adjustment for this location"

**Behavior:**
- Only enabled when location is set and no custom climate is active
- When checked, sets `use_prism: true` in climate state
- When unchecked, resets to the base station PAR monthlies
- Custom climates disable this checkbox until deleted

### Visual Design Notes

- Use subdued color scheme to not distract from tool-specific controls
- Clear visual hierarchy: database/version → location → station → customize
- Disable station select until location is set
- Show loading spinner while fetching closest stations
- Station dropdown shows "No location set" placeholder when location is null

---

## WEPP Road Tool Specification

### Tool Overview

WEPP Road predicts erosion from forest roads with three profile elements: road surface, fill slope, and buffer slope.

### API Endpoint
- **Run Model:** `POST /api/wepproad/RUN/wepp`
  - **Backend requirement:** run WEPP with detailed annual output so the response includes `annuals` for charts/tables.

### Request Schema (WeppRoadState)

```
{
  climate: ClimatePars,
  wepproad_pars: {
    soil_texture: "clay" | "silt" | "sand" | "loam",
    rfg_pct: 0-100,
    road: {
      slope_pct: 0.1-40,
      length_m: 1-300,
      width_m: 0.3-100,
      surface: "gravel" | "paved",
      design: "inveg" | "inbare" | "outunrut" | "outrut",
      traffic: "high" | "low" | "none"
    },
    fill: {
      slope_pct: 0.1-150,
      length_m: 0.3-100
    },
    buffer: {
      slope_pct: 0.1-100,
      length_m: 0.3-300
    }
  },
  wepp_version: "wepp2010"
}
```

### Control Panel Layout

**Section 1: Soil Properties**
- Soil Texture: Dropdown (clay loam, silt loam, sandy loam, loam)
- Rock Fragment Content: Number input with slider (0-50%)

**Section 2: Road Geometry**
- Road Design: Radio buttons with visual icons
  - Insloped with vegetated ditch
  - Insloped with bare ditch
  - Outsloped with unrutted surface
  - Outsloped with rutted surface
- Road Surface: Radio buttons (Native/Graveled/Paved)
- Traffic Level: Radio buttons (High/Low/None)
- Road Gradient: Number input (0.3-40%)
- Road Length: Number input (3-1000 ft or 1-300 m)
- Road Width: Number input (varies by design)

**Section 3: Fill Slope**
- Fill Gradient: Number input (0.3-150%)
- Fill Length: Number input (0.3-100 m)

**Section 4: Buffer Slope**
- Buffer Gradient: Number input (0.3-100%)
- Buffer Length: Number input (0.3-300 m)

**Section 5: Simulation Options**
- Simulation Years: Number input (1-200, default 100)

### Run Button

Label: "Run WEPP Road Model"

Behavior:
- Validates all inputs before submission
- Disables during API call
- Shows loading spinner with estimated wait time
- On error, displays error message inline
- On success, scrolls to results section

### Results Display

Legacy results only (match the legacy results page):

**Inputs Summary Table**
- Climate name plus CLIGEN parameter summary (from legacy `GetParSummary`)
- Soil texture + rock fragments
- Road design, surface, traffic
- Road, fill, and buffer geometry (gradient/length/width)

**`{years} - YEAR MEAN ANNUAL AVERAGES` table**
- Header includes the "Total in {years} years" label (legacy wording).
- Values are mean annual averages; storm/event counts are totals across all simulated years.
- Rows (legacy order/wording):
  1. `{precip}` `{units}` precipitation from `{storms}` storms
  2. `{rro}` `{units}` runoff from rainfall from `{rain_events}` events
  3. `{sro}` `{units}` runoff from snowmelt or winter rainstorm from `{snow_events}` events
  4. `{syra}` `{sed_units}` road prism erosion
  5. `{sypa}` `{sed_units}` sediment leaving buffer

**Provenance of annual-average values (legacy source: `fswepp-docker/var/www/cgi-bin/fswepp/wr/wr.pl`)**
- `precip`: parsed from WEPP output section **I. RAINFALL AND RUNOFF SUMMARY -> annual averages -> Mean annual precipitation**.
- `storms`: parsed from **I. RAINFALL AND RUNOFF SUMMARY -> total summary -> "{storms} storms produced ..."**.
- `rro`: parsed from **I. RAINFALL AND RUNOFF SUMMARY -> annual averages -> Mean annual runoff from rainfall**.
- `rain_events`: parsed from **I. RAINFALL AND RUNOFF SUMMARY -> total summary -> "{events} rain storm runoff events produced ..."**.
- `sro`: parsed from **I. RAINFALL AND RUNOFF SUMMARY -> annual averages -> Mean annual runoff from snow melt and/or rain storm during winter**.
- `snow_events`: parsed from **I. RAINFALL AND RUNOFF SUMMARY -> total summary -> "{events} snow melts and/or events during winter produced ..."**.
- `syra` (road prism erosion): computed as `syr * effective_road_length * WeppRoadWidth`, where:
  - `syr` is the **Soil Loss MEAN (kg/m^2)** from **II.A. AREA OF NET SOIL LOSS** (first net-loss row in WEPP output),
  - `effective_road_length` is the **Area of Net Loss (m)** from that same row,
  - `WeppRoadWidth` is the profile width written into the slope file by `CreateSlopeFileWeppRoad` (`fswepp-docker/etc/perl/MoscowFSL/FSWEPP/WeppRoad.pm`).
- `sypa` (sediment leaving buffer): computed as `syp * WeppRoadWidth`, where:
  - `syp` is the **Average annual sediment leaving profile (kg/m of width)** from **III.A. OFF SITE EFFECTS**,
  - `WeppRoadWidth` is as above.
- Unit conversions (legacy behavior):
  - If `units == "m"`, precipitation/runoff remain in **mm**, sediment in **kg**.
  - If `units != "m"`, precipitation/runoff are converted from **mm -> in** (`/ 25.4`) and sediment from **kg -> lb** (`* 2.2046`).

---

## Disturbed WEPP Tool Specification

### Tool Overview

Disturbed WEPP predicts erosion from disturbed forest lands (post-fire, harvest, etc.) using a two-element hillslope.

### API Endpoint
- **Run Model:** `POST /api/disturbedwepp/RUN/wepp`

### Request Schema (DisturbedWeppState)

```
{
  climate: ClimatePars,
  disturbedwepp_pars: {
    soil_texture: "clay" | "silt" | "sand" | "loam",
    upper_ofe: {
      landuse: "OldForest" | "YoungForest" | "Shrub" | "Bunchgrass" |
               "Sod" | "LowFire" | "HighFire" | "Skid",
      slope_point1_pct: 0-1000,
      slope_point2_pct: 0-1000,
      length_m: 0-3000,
      cover_pct: 0-150,
      rfg_pct: 0-75
    },
    lower_ofe: {
      landuse: [same as upper],
      slope_point1_pct: 0-1000,
      slope_point2_pct: 0-1000,
      length_m: 0-3000,
      cover_pct: 0-150,
      rfg_pct: 0-75
    },
    width_m: 0-10000
  },
  wepp_version: "wepp2010"
}
```

### Control Panel Layout

**Section 1: Soil Properties**
- Soil Texture: Dropdown (clay loam, silt loam, sandy loam, loam)

**Section 2: Upper Slope Element (OFE 1)**
- Treatment Type: Dropdown with descriptions
  - Old Forest: Undisturbed mature forest
  - Young Forest: 15-30 year old forest
  - Shrub: Shrub-dominated
  - Bunchgrass: Perennial bunchgrass
  - Sod: Sod-forming grass
  - Low Severity Fire: Low burn severity
  - High Severity Fire: High burn severity
  - Skid Trail: Tractor skid trail
- Top Slope Gradient: Number input (%)
- Mid Slope Gradient: Number input (%)
- Length: Number input (m)
- Plant Cover: Number input with slider (0-150%)
- Rock Fragment Content: Number input with slider (0-75%)

**Section 3: Lower Slope Element (OFE 2)**
- Same fields as Upper Slope Element
- Independent values for toe-slope conditions

**Section 4: Hillslope Properties**
- Representative Width: Number input (m or acres/hectares)
- Simulation Years: Number input (1-200)

**Visual Aid:**
- Dual-segment slope profile showing both OFEs with treatments labeled

### Run Button

Label: "Run Disturbed WEPP Model"

### Results Display

Legacy results only (match the legacy results page):

**Inputs Summary Table**
- Climate name plus CLIGEN parameter summary (from legacy `GetParSummary`)
- Soil texture
- Upper/Lower OFE table: treatment, gradients (top/mid/bottom), length, cover, rock
- Description field (free text)

**Mean annual averages table**
- Title: "Mean annual averages for {simyears} years"
- Header includes "Total in {years2sim} years" label.
- Values are mean annual averages; storm/event counts are totals across all simulated years.
- Rows (legacy order/wording):
  1. `{precip}` `{pcp_unit}` precipitation from `{storms}` storms
  2. `{rro}` `{pcp_unit}` runoff from rainfall from `{rain_events}` events
  3. `{sro}` `{pcp_unit}` runoff from snowmelt or winter rainstorm from `{snow_events}` events
  4. `{asyra}` `{rate}` upland erosion rate (`{syra} kg m^-2`)
  5. `{asypa}` `{rate}` sediment leaving profile (`{sypa} kg m^-1 width`)

**Return period analysis table**
- Title: "Return period analysis based on {simyears} years of climate"
- Rows for 1st, 2nd, 5th, 10th, 20th largest events (if available) plus an "Average" row.
- Columns: Return Period, Precipitation, Runoff, Erosion, Sediment.

**Probabilities of occurrence table**
- Title: "Probabilities of occurrence first year following disturbance based on {simyears} years of climate"
- Three rows: runoff, erosion, sediment delivery, each with percent and bar indicator.

**Provenance of annual-average values (legacy source: `fswepp-docker/var/www/cgi-bin/fswepp/wd/wd.pl`)**
- `precip`: parsed from WEPP output section **I. RAINFALL AND RUNOFF SUMMARY -> annual averages -> Mean annual precipitation**.
- `storms`: parsed from **I. RAINFALL AND RUNOFF SUMMARY -> total summary -> "{storms} storms produced ..."**.
- `rro`: parsed from **I. RAINFALL AND RUNOFF SUMMARY -> annual averages -> Mean annual runoff from rainfall**.
- `rain_events`: parsed from **I. RAINFALL AND RUNOFF SUMMARY -> total summary -> "{events} rain storm runoff events produced ..."**.
- `sro`: parsed from **I. RAINFALL AND RUNOFF SUMMARY -> annual averages -> Mean annual runoff from snow melt and/or rain storm during winter**.
- `snow_events`: parsed from **I. RAINFALL AND RUNOFF SUMMARY -> total summary -> "{events} snow melts and/or events during winter produced ..."**.
- `syra` (upland erosion rate): `syr` from **II.A. AREA OF NET SOIL LOSS -> Soil Loss MEAN (kg/m^2)**.
- `sypa` (sediment leaving profile): `syp` from **III. OFF SITE EFFECTS -> Average annual sediment leaving profile (kg/m of width)**.
- `asyra`: `syra * 10` (kg/m^2 -> t/ha).
- `asypa`: `(sypa * 10) / slope_length` (kg/m width -> t/ha using total slope length).
- Unit conversions (legacy behavior):
  - If `units == "m"`, precipitation/runoff remain in **mm**, rate units are **t ha^-1**.
  - If `units == "ft"`, precipitation/runoff are converted from **mm -> in** (`* 0.0394`) and rates from **t/ha -> t/ac** (`* 0.445`).

**Note:** The FSWEPP2 API returns JSON (not HTML) and uses metric-only units; see `api/DEVIATIONS.md` for current deviations and mapping.

---

## ERMiT Tool Specification

### Tool Overview

ERMiT (Erosion Risk Management Tool) predicts post-fire erosion with probabilistic analysis across multiple burn severities and soil conditions.

### API Endpoint
- **Run Model:** `POST /api/ermit/RUN/wepp`

### Request Schema (ErmitState)

```
{
  climate: ClimatePars,
  ermit_pars: {
    top_slope_pct: 0.001-100,
    middle_slope_pct: 0.001-100,
    bottom_slope_pct: 0.001-100,
    length_m: 0-300,
    soil_texture: "clay" | "silt" | "sand" | "loam",
    rfg_pct: 5-85,
    vegetation_type: "Forest" | "Range" | "Chaparral",
    burn_severity: "High" | "Moderate" | "Low" | "Unburned",
    user_shrub_pct: 0-100 | null,
    user_grass_pct: 0-100 | null,
    user_bare_pct: 0-100 | null
  },
  wepp_version: "wepp2010"
}
```

### Control Panel Layout

**Section 1: Hillslope Geometry**
- Top Gradient: Number input (%)
- Middle Gradient: Number input (%)
- Bottom Gradient: Number input (%)
- Horizontal Length: Number input (0-300 m)

**Section 2: Soil Properties**
- Soil Texture: Dropdown
- Rock Fragment Content: Number input with slider (5-85%)

**Section 3: Vegetation and Fire**
- Vegetation Type: Radio buttons (Forest/Range/Chaparral)
- Soil Burn Severity: Radio buttons with severity indicators
  - High: Red badge
  - Moderate: Orange badge
  - Low: Yellow badge
  - Unburned: Green badge

**Section 4: Pre-Fire Community (Conditional on Range/Chaparral)**
- Shrub Cover: Number input (%, defaults: Range=15, Chaparral=80)
- Grass Cover: Number input (%, defaults: Range=75, Chaparral=0)
- Bare Ground: Calculated automatically (100 - shrub - grass)

**Section 5: Simulation Options**
- Simulation Years: Number input (default 100)

**Visual Aid:**
- 3-point slope profile with burn severity shading
- Pre-fire community composition pie chart (when applicable)

### Run Button

Label: "Run ERMiT Model"

**Note:** ERMiT runs are more complex (multiple WEPP runs in parallel), so loading indication should show progress if possible.

### Results Display

Legacy results only (match the legacy results page):

**Inputs Summary Table**
- Climate name plus CLIGEN parameter summary (from legacy `GetParSummary`)
- Soil texture + rock fragment percent
- Slope gradients (top/average/toe) and hillslope length
- Burn severity + vegetation type
- Prefire community (shrub/grass/bare) for non-forest vegetation

**`{years2sim} - YEAR MEAN ANNUAL AVERAGES` table**
- Header includes "Total in {years2sim} years".
- Values are mean annual averages; storm/event counts are totals across all simulated years.
- Rows (legacy order/wording):
  1. `{precip}` `{precip_units}` annual precipitation from `{storms}` storms
  2. `{rro}` `{precip_units}` annual runoff from rainfall from `{rain_events}` events
  3. `{sro}` `{precip_units}` annual runoff from snowmelt or winter rainstorm from `{snow_events}` events

**Rainfall Event Rankings and Characteristics table**
- Title: "Rainfall Event Rankings and Characteristics from the Selected Storms"
- Columns: Storm rank (based on runoff / return interval), storm runoff, storm precipitation, duration, 10-min peak intensity, 30-min peak intensity, date.
- Ranks are selected from the 100-year event file; reduced if fewer runoff events exist.

**Sediment delivery exceedance plot (gnuplot PNG)**
- Clickable image that opens the untreated (or unburned) sediment delivery exceedance table.
- Plot specification is captured in `api/DEVIATIONS.md` (Legacy ERMiT gnuplot specification).

**Sediment Delivery table (interactive probability selector)**
- User sets a target exceedance probability (default 20%).
- Columns for years 1-5 following the fire.
- Rows:
  - Unburned (if severity = unburned), otherwise:
  - Untreated
  - Seeding
  - Mulch 47% cover
  - Mulch 72% cover
  - Mulch 89% cover
  - Mulch 94% cover
  - Logs & Wattles (erosion barriers; diameter/spacing inputs shown in-table)
- Links to popup tables for treatment-specific exceedance probabilities and event sediment delivery.

**Footer metadata**
- Observed annual precipitation, July-August-September precipitation, and climate classification (MONSOONAL / NON-MONSOONAL).

**Provenance of annual-average values (legacy source: `fswepp-docker/var/www/cgi-bin/fswepp/ermit/erm.pl`)**
- `precip`: parsed from WEPP output section **I. RAINFALL AND RUNOFF SUMMARY -> annual averages -> Mean annual precipitation**.
- `storms`: parsed from **I. RAINFALL AND RUNOFF SUMMARY -> total summary -> "{storms} storms produced ..."**.
- `rro`: parsed from **I. RAINFALL AND RUNOFF SUMMARY -> annual averages -> Mean annual runoff from rainfall**.
- `rain_events`: parsed from **I. RAINFALL AND RUNOFF SUMMARY -> total summary -> "{events} rain storm runoff events produced ..."**.
- `sro`: parsed from **I. RAINFALL AND RUNOFF SUMMARY -> annual averages -> Mean annual runoff from snow melt and/or rain storm during winter**.
- `snow_events`: parsed from **I. RAINFALL AND RUNOFF SUMMARY -> total summary -> "{events} snow melts and/or events during winter produced ..."**.
- Unit conversions (legacy behavior):
  - If `units == "m"`, precipitation/runoff remain in **mm**.
  - If `units == "ft"`, precipitation/runoff are converted from **mm -> in** (`/ 25.4`).

**Note:** The FSWEPP2 API returns JSON (not HTML), uses metric-only units, and differs in parameter handling; see `api/DEVIATIONS.md` for current deviations and mapping.

---

## Shared Interactions and Behaviors

### Form Validation

**Validation Strategy**: Hybrid blur-then-change approach

**Timing**:
- Initial validation triggers on blur (when user leaves field)
- After field has been touched and has error, subsequent validation on change with 300ms debounce
- This prevents annoying mid-typing errors while still being responsive

**Display**:
- **Error State**: Red border on input field
- **Error Message**: Displayed inline directly below the input in red text
- **Required Fields**: Asterisk (*) in field label
- **Submit Button**: Disabled if any validation errors exist

**Validation Types**:
- **Range validation**: Numeric min/max constraints (e.g., slope 0.1-40%)
- **Required validation**: Non-empty check for required fields
- **Format validation**: Numeric, email, etc.
- **Unit-aware validation**: Works with unitizer canonical values

**Error Messages**:
- Specific and actionable (e.g., "Road gradient must be between 0.1 and 40%")
- Not generic (avoid "Invalid input")

**Visual Feedback**:
- Valid: Default border color
- Invalid (touched): Red border + inline message
- Valid (after fixing): Green border briefly, then return to default

### Unit Conversion

Each tool includes unit toggle (Imperial/Metric):
- Toggle button in header
- Persists in localStorage
- All relevant fields convert automatically
- API always receives metric units

### Loading States

During model execution:
- Run button shows spinner and "Running..." text
- Disable all form inputs
- Optional: Progress bar if supported by API
- Cancel button to abort long-running requests
- Timeout handling with user notification

### Error Handling

**Display Strategy**:
- Inline error message below Run button
- Error details in expandable section
- Retry button to resubmit
- Link to report issue (if supported)

**HTTP Status Code Handling** (Best Practices):

**400 Bad Request**:
- Display: "Invalid request parameters"
- Action: Show which fields are invalid if response includes validation details
- User can fix and retry

**422 Unprocessable Entity**:
- Display: "Unable to process this configuration"
- Action: Parse response for specific validation errors
- Highlight problematic form fields if identifiable

**500 Internal Server Error**:
- Display: "Server error occurred. Please try again."
- Action: Show generic error, don't expose technical details
- Provide retry button
- Log error details to console for debugging

**503 Service Unavailable**:
- Display: "Service temporarily unavailable. Please try again shortly."
- Action: Show maintenance/downtime message
- Optional: Disable retry button temporarily (30s cooldown)

**Timeout (No Response)**:
- Display: "Request timed out. The server may be busy."
- Action: Offer retry with same parameters
- Suggest: "Try reducing simulation years if problem persists"

**Network Error (Connection Failed)**:
- Display: "Unable to connect to server. Check your internet connection."
- Action: Retry button
- Don't auto-retry (user may be offline)

**Unknown Errors**:
- Display: "An unexpected error occurred"
- Action: Show error message from exception
- Retry button
- Log full error to console

**Error Message Style**:
- Use plain language, not technical jargon
- Be specific about what failed
- Always provide an action (retry, fix fields, contact support)
- Don't blame the user ("Invalid input" → "Please enter a value between X and Y")

### State Persistence

User inputs persist across sessions using client-side storage:

**Climate State (Site-Wide):**
- Stored in `fswepp_climate` cookie
- Persists across all tool pages
- 365-day expiry
- Updated on any climate parameter change

**User-Defined Climates:**
- Stored in `fswepp_climate.user_defined_par_mod` only
- Applies to the current climate selection
- 365-day expiry with the climate cookie

**Tool-Specific Parameters:**
- Stored in localStorage per tool
- Restored when returning to tool page
- Clear/Reset button to restore defaults

**URL Query Parameters**:

Support for sharing complete configurations via URL for collaboration and documentation.

**Format**: Base64url-encoded JSON
```
/fswepp2/wepproad?config=eyJjbGltYXRlIjp7InBhcl9pZCI6IldBNDU5MDc0...
```

**Implementation**:
- Encode entire state (climate + tool parameters) as JSON, then base64url
- URL parameter: `config=<base64url_encoded_json>`
- On page load: Check for `config` parameter
- If present: Decode, validate, apply to state
- Override cookie/localStorage values with URL config
- Handle decode errors gracefully (show warning, fall back to defaults)
- Use URL-safe base64 encoding (`+`→`-`, `/`→`_`, trim `=`) to avoid URL parsing issues

**State Included**:
- Climate parameters (station, location, custom modifications)
- Tool-specific parameters (all form values)
- Unit preferences (optional)
- Exclude: Results data (too large)

**Best Practices**:
- Only encode non-default values to minimize URL length
- Provide "Copy Share Link" button in UI
- Warn if URL exceeds 2000 characters (browser safety limit)
- Validate decoded config against current schema
- Log parsing errors to console for debugging

**Precedence**:
1. URL query parameter (highest priority)
2. LocalStorage (tool-specific state)
3. Cookies (climate and unit preferences)
4. Default values (lowest priority)

**Use Cases**:
- Share specific scenario with colleague
- Bookmark commonly-used configurations
- Include in documentation/tutorials
- QA testing with specific parameter sets

### Responsive Design

All layouts adapt to viewport:
- Mobile: Stacked single-column layout
- Tablet: Two-column layout for forms
- Desktop: Multi-column with sidebar for results
- Charts resize responsively while maintaining aspect ratio

### Accessibility

All components meet WCAG 2.1 AA standards:
- Keyboard navigation for all interactive elements
- ARIA labels for screen readers
- Sufficient color contrast ratios
- Focus indicators on all interactive elements
- Form validation announcements

---

## Canvas Plotting Specifications

### Implementation Status (Phase 4 Complete)

FSWEPP2 now includes a lightweight canvas charting library with the modules described below:

- **Core**: canvas sizing, resize observers, PNG export (`chart-core.js`)
- **Scales**: linear/log/band scales + tick helpers (`chart-scales.js`)
- **Renderers**: line/bar/area/text primitives (`chart-renderers.js`)
- **Interactions**: hover tooltips + legend toggles (`chart-interactions.js`)
- **Chart types**: line/bar/scatter/exceedance/histogram (`chart-types.js`)
- **SlopeProfile**: hillslope cross-section renderer (`slope-profile.js`)

Pan/zoom and crosshair interactions remain post-MVP.

### Chart Components

All charts share common features:

#### Base Chart Features
- Responsive sizing based on container dimensions
- Retina display support (2x pixel density)
- Export to PNG via right-click or button
- Print-friendly rendering
- Configurable margins and padding

#### Axes
- Automatic scale calculation with nice numbers
- Grid lines with configurable style
- Axis labels with units
- Optional logarithmic scales
- Tick mark customization

#### Interactivity

**MVP Features**:
- **Hover tooltips**: Show exact values on mouse hover with formatted units
  - Display: X value, Y value(s) for all series at that point
  - Styling: Matches theme, semi-transparent background
  - Position: Near cursor, avoid edge overflow
- Export to PNG: Right-click or download button

**Post-MVP (Future Enhancement)**:
- Click-to-highlight series
- Pan and zoom capabilities
- Crosshair for precise reading
- Data point selection
- Brush/zoom selection

#### Legend
- Automatic or manual positioning
- Toggle series visibility
- Show/hide on click
- Draggable legend box

### Chart Types and Use Cases

#### 1. Line Chart
**Used for:** Time series, trends, probability curves

**Features:**
- Multiple series support
- Line style customization (solid, dashed, dotted)
- Filled areas under curves
- Data point markers (optional)
- Smoothing options (none, moving average, spline)

#### 2. Bar Chart
**Used for:** Categorical comparisons, annual summaries

**Features:**
- Vertical or horizontal orientation
- Grouped or stacked bars
- Custom bar colors per category
- Value labels on bars
- Threshold lines

#### 3. Scatter Plot
**Used for:** Event analysis, correlation displays

**Features:**
- Variable point sizes
- Color coding by category
- Trend line overlay
- Point labels on hover
- Filtering by region

#### 4. Probability Exceedance Curve
**Used for:** Risk analysis across all tools

**Features:**
- Multiple curves for comparison
- Logarithmic X or Y axis
- Threshold markers
- Confidence intervals (if available)
- Return period annotations

#### 5. Histogram
**Used for:** Distribution analysis

**Features:**
- Configurable bin sizes
- Overlay of normal distribution
- Cumulative frequency option
- Multiple series overlay

### Plotting Library Architecture

Implement a lightweight canvas plotting library with modules:

1. **Core Module** (`chart-core.js`)
   - Canvas setup and management
   - Coordinate transformations
   - Event handling
   - Export functionality

2. **Scales Module** (`chart-scales.js`)
   - Linear, logarithmic, time scales
   - Domain/range calculations
   - Tick generation

3. **Renderers Module** (`chart-renderers.js`)
   - Line renderer
   - Bar renderer
   - Point renderer
   - Area renderer
   - Text renderer

4. **Interaction Module** (`chart-interactions.js`)
   - Hover tooltips
   - Click handlers
   - Zoom/pan logic
   - Legend interactions

5. **Chart Types Module** (`chart-types.js`)
   - LineChart class
   - BarChart class
   - ScatterPlot class
   - ExceedanceCurve class
   - HistogramChart class

### Example Chart Configurations

#### WEPP Road Exceedance Curve
```javascript
{
  type: 'exceedance',
  data: [
    { x: sediment_delivery, y: probability }
  ],
  xAxis: {
    label: 'Sediment Delivery (kg/m²)',
    scale: 'linear'
  },
  yAxis: {
    label: 'Probability of Exceedance',
    scale: 'linear',
    domain: [0, 1]
  },
  series: [{
    name: 'Sediment Delivery',
    color: '#e74c3c',
    lineWidth: 2
  }],
  tooltip: {
    format: (d) => `${d.x.toFixed(2)} kg/m²: ${(d.y * 100).toFixed(1)}%`
  }
}
```

#### ERMiT Treatment Comparison
```javascript
{
  type: 'line',
  data: {
    'Untreated': [...],
    'Seeding': [...],
    'Mulching 47%': [...],
    'Mulching 72%': [...],
    'Mulching 89%': [...],
    'Mulching 94%': [...]
  },
  xAxis: {
    label: 'Sediment Delivery (kg/m²)',
    scale: 'linear'
  },
  yAxis: {
    label: 'Probability of Exceedance',
    scale: 'linear',
    domain: [0, 1]
  },
  legend: {
    position: 'top-right',
    interactive: true
  },
  colors: ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c']
}
```

---

## Additional UI Elements

### Navigation

Top navigation bar (fixed position):

**Left Side**:
- FSWEPP2 logo/title
- Tool selector dropdown or links
  - WEPP Road
  - Disturbed WEPP
  - ERMiT
- Documentation link
- About/Help link

**Right Side** (fixed top-right):
- **Units Toggle**: Switch control labeled "Metric ⇄ English"
  - Default: Metric (SI units)
  - Visual: Toggle switch (like WEPPcloud implementation)
  - **Behavior**: Click immediately toggles between Metric and English defaults
  - Updates all values on page instantly (no modal, no confirmation)
  - Preference saved to `fswepp_units` cookie
  - **Advanced Options** (optional): Gear icon or secondary button next to toggle to open modal for category-specific unit overrides
- Climate badge showing current station (clickable to expand RockClimControl)
 - **Header Layout**: Fixed/sticky header with centered content container and right-aligned unit toggle

### Footer

Bottom footer with:
- USFS acknowledgment
- Version information
- Links to legacy FSWEPP
- Contact/feedback link
- Privacy policy

### Help System

Context-sensitive help:
- Tooltip icons next to complex fields
- "Learn more" expandable sections
- Glossary modal for technical terms
- Video tutorials (if available)

### Export Options

**Initial MVP Scope**:
- CSV data tables: Export results tables to CSV format
- PNG charts: Right-click or button to save chart as image

**Post-MVP (Future Enhancement)**:
- PDF report: Server-generated comprehensive report
- Complete run summary (JSON): Export entire run configuration and results
- **Intermediate files**: Download buttons for model input files
  - Slope file (.slp)
  - Soil file (.sol)
  - Climate file (.cli)
  - Management file (.man)
  - Raw WEPP output (.dat)
  - API endpoints already exist (e.g., `/wepproad/GET/soil`)
  - UI download buttons to be added post-MVP

---

## Browser Compatibility

Target browsers:
- Chrome/Edge (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android 10+)

No Internet Explorer support.

---

## Performance Targets

- Initial page load: < 2 seconds
- API response: < 5 seconds (95th percentile)
- Chart rendering: < 500ms for datasets up to 1000 points
- Form interaction responsiveness: < 100ms
- Map interaction: 60fps during pan/zoom

---

## Accessibility Standards

Compliance with WCAG 2.1 Level AA:
- Semantic HTML5 elements
- Proper heading hierarchy
- ARIA labels and roles where needed
- Keyboard navigation support
- Focus management
- Color contrast ratios ≥ 4.5:1
- Text resize support up to 200%
- Screen reader compatible

---

## API Integration Patterns

### Request Format

All tool endpoints accept POST requests with JSON body. Climate state is read from cookie:

```javascript
const runModel = async (toolState) => {
  // Read climate state from cookie
  const climateState = readClimateCookie();

  const response = await fetch('/api/[tool]/RUN/wepp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      climate: climateState,
      [tool]_pars: toolState,
      wepp_version: 'wepp2010'
    })
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return await response.json();
};
```

**API Base Path**: All backend endpoints are mounted under `/api`, so every tool request must use the `/api/...` prefix.

### Error Handling Pattern

```javascript
try {
  const results = await runModel(climate, pars);
  displayResults(results);
} catch (error) {
  if (error.name === 'AbortError') {
    showMessage('Request cancelled');
  } else if (error.message.includes('timeout')) {
    showError('Request timed out. Please try again.');
  } else {
    showError(`An error occurred: ${error.message}`);
  }
}
```

### Loading State Pattern

```javascript
const submitButton = document.getElementById('run-model');
const resultsSection = document.getElementById('results');

submitButton.disabled = true;
submitButton.innerHTML = '<spinner> Running...';

try {
  const results = await runModel(climate, pars);
  resultsSection.innerHTML = renderResults(results);
  resultsSection.scrollIntoView({ behavior: 'smooth' });
} finally {
  submitButton.disabled = false;
  submitButton.innerHTML = 'Run Model';
}
```

### Unit Conversion System

#### Architecture

FSWEPP2 supports both SI (metric) and English (imperial) units with a client-side conversion architecture:

**API Contract**: All API endpoints accept and return values in SI units (metric)
**Frontend Responsibility**: Convert displayed values to user's preferred unit system
**Preference Storage**: Unit preferences stored in cookie for site-wide persistence

This approach ensures:
- Consistent server-side calculations in metric units
- No ambiguity in API contracts
- User preference independence from backend
- Easy addition of new unit systems if needed

#### Source Implementation

The unit conversion system is adapted from WEPPcloud (wepppy project):

**Primary Reference**: `/workdir/wepppy/docs/ui-docs/control-ui-styling/unitizer-developer-guide.md`

**Core Components to Port**:

1. **Unitizer Client** (`unitizer_client.js`)
   - Client-side conversion engine
   - Exposes `window.UnitizerClient` API
   - Handles value conversion, rendering, preference management
   - Registers numeric inputs for auto-conversion
   - Emits preference change events

2. **Unit Conversion Map** (`unitizer_map.js`)
   - Generated ES module with conversion table
   - Maps between canonical units and display units
   - Includes precision definitions per unit
   - Organized by category (length, area, temperature, etc.)
   - **Trim to FSWEPP categories only** to control bundle size

3. **Map Builder** (`unitizer_map_builder.py`)
   - Python script to generate `unitizer_map.js` from backend registry
   - Reads from canonical unit registry (`unitizer.py`)
   - Outputs JavaScript module with conversion factors

4. **Backend Unit Registry** (`unitizer.py`)
   - Canonical source of truth for supported units
   - Defines conversion factors and precision
   - Categories: length, area, volume, mass, temperature, etc.

5. **CSS Styles** (`ui-foundation.css`)
   - `.unitizer-wrapper`, `.unitizer`, `.wc-unitizer` classes
   - Modal layout for unit preference dialog
   - Display formatting for unit labels

6. **HTML Templates**
   - `unitizer.htm`: Modal body with global + per-category radio buttons
   - `unitizer_modal.htm`: Modal shell (optional, can use existing modal component)

#### Unit Categories for FSWEPP

Based on tool requirements:

- **Length**: meters ↔ feet
- **Area**: hectares ↔ acres, square meters ↔ square feet
- **Slope**: percent (same in both systems), degrees
- **Precipitation**: millimeters ↔ inches
- **Temperature**: Celsius ↔ Fahrenheit
- **Mass**: kilograms ↔ pounds, tonnes ↔ tons
- **Erosion Rate**: kg/m² ↔ tons/acre
- **Runoff**: millimeters ↔ inches

#### UnitizerClient API

**Initialization**:
- Async ready pattern: `UnitizerClient.ready().then(client => {...})`
- Loads conversion map on first use
- Reads preference cookie on initialization

**Core Methods**:
- `convert(value, fromUnit, toUnit)`: Convert numeric value between units
- `renderValue(value, unitKey, options)`: Format value with units for display
- `renderUnits(unitKey, options)`: Render unit label only
- `setGlobalPreference(index)`: Set global default (0=SI, 1=English)
- `setPreference(categoryKey, unitKey)`: Set category-specific unit preference
- `updateUnitLabels(root)`: Update all unit labels in DOM subtree
- `registerNumericInputs(root)`: Attach conversion handlers to inputs
- `updateNumericFields(root)`: Refresh all registered numeric inputs
- `dispatchPreferenceChange()`: Emit custom event when preferences change

**Options Parameters**:
- `includeUnits`: Whether to append unit label to value
- `parentheses`: Wrap units in parentheses
- `precision`: Decimal places to display (overrides default)

#### DOM Conventions

**Display Values**:
Use `.unitizer-wrapper` and `.unitizer` classes for values rendered by `renderValue()`.

**Numeric Input Fields**:
Inputs requiring unit conversion must include data attributes:
- `data-unitizer-category`: Category key (e.g., "length", "area")
- `data-unitizer-unit`: Canonical unit key in SI (e.g., "m", "ha")
- `data-precision`: Optional decimal places override

Client maintains:
- `data-unitizer-canonical-value`: Value in SI units
- `data-unitizer-active-unit`: Currently displayed unit

**Dynamic Unit Labels**:
Labels that update with preference changes use `data-unitizer-label` attribute with category and unit specified.

#### Preference Management

**Cookie Storage**:
- Cookie name: `fswepp_units`
- Structure: JSON object with global preference and category overrides
- Expiry: 365 days
- Scope: Site-wide (path=/)

**Preference Cascade**:
1. Check category-specific override in cookie
2. Fall back to global preference (SI or English default)
3. Default to SI if no preference stored

**Preference UI**:
Modal dialog with:
- Global radio buttons: "SI Units (Default)" / "English Units (Default)"
- Per-category override sections with radio buttons
- "Reset to Defaults" button
- "Apply" button saves to cookie and triggers updates

#### Event System

**Custom Event**: `unitizer:preferences-changed`

Dispatched when user changes unit preferences via UI or programmatically.

**Event Detail**:
- `detail.preferences`: Object mapping category to active unit key
- `detail.tokens`: Object mapping category to display token

Components can listen for preference changes to update their displays.

#### Integration Workflow

**Page Load**:
1. Include `unitizer_map.js` (generated conversion table)
2. Include `unitizer_client.js` (conversion engine)
3. Initialize UnitizerClient and await ready state
4. Register all numeric inputs
5. Update initial display

**Form Submission**:
1. Read canonical values from inputs via `data-unitizer-canonical-value`
2. Submit SI unit values to API
3. User sees values in preferred units, API receives metric

**Results Display**:
1. Receive metric values from API response
2. Render with `client.renderValue(value, unitKey, options)`
3. Insert rendered HTML with `.unitizer-wrapper` structure
4. Values automatically update if user changes preferences

**Preference Change**:
1. User opens unit preference modal
2. Selects global or category-specific preferences
3. On Apply: preferences saved to cookie
4. `dispatchPreferenceChange()` emits event
5. All registered inputs and labels update automatically

#### Map Generation

To rebuild the unit conversion map:

**Build Script**: `/workdir/wepppy/wepppy/weppcloud/controllers_js/build_controllers_js.py`

**Process**:
1. Reads unit definitions from `unitizer.py` (backend registry)
2. Generates conversion factors for all unit pairs
3. Includes precision defaults per unit
4. Outputs JavaScript ES module: `unitizer_map.js`

**Customization for FSWEPP2**:
- Review `unitizer.py` for supported units
- Add/remove categories as needed for FSWEPP tools
- Run builder to regenerate map
- Copy generated `unitizer_map.js` to `/ui/public/js/`

#### Tool-Specific Considerations

**WEPP Road**:
- Length fields: road length, fill length, buffer length
- Slope: typically percent (no conversion needed)
- Erosion results: kg/m² ↔ tons/acre

**Disturbed WEPP**:
- Length fields: OFE lengths
- Area: width in meters ↔ feet, or area in hectares ↔ acres
- Erosion results: kg/m² ↔ tons/acre

**ERMiT**:
- Length: hillslope length
- Slope: percent or degrees
- Precipitation/Runoff: mm ↔ inches
- Erosion: kg/m² ↔ tons/acre

**Rock Climate**:
- Location: latitude/longitude (no conversion)
- Precipitation: mm ↔ inches
- Temperature: °C ↔ °F
- Elevation: meters ↔ feet (if displayed)

#### Implementation Notes

**Alignment Issues to Address**:
- Update `unitizer_client.js` to load `/public/js/unitizer_map.js` (FSWEPP2 static path)
- Global preference radio names: `applyGlobalRadio()` expects `uni_main_selector` but template uses `unit_main_selector`
- Adjust function or template naming for consistency

**Optional Server Sync**:
WEPPcloud persists preferences server-side. For FSWEPP2 stateless architecture, cookie persistence is sufficient.

**CSS Integration**:
Port unitizer CSS classes to `/ui/styles/theme.css` in `@layer components`:
- `.unitizer-wrapper`: Container for converted values
- `.unitizer`: Inline span for value + unit
- `.wc-unitizer`: Alternative wrapper class
- Modal styles for preference dialog

**Modal Implementation**:
Reuse existing modal component from shared components library. Populate with unit preference controls (global radios + category sections).

#### Testing Strategy

**Unit Conversion Accuracy**:
- Verify conversion factors against known standards
- Test edge cases (zero, negative values, very large/small numbers)
- Validate precision formatting

**Preference Persistence**:
- Cookie read/write on page load
- Preference changes persist across navigation
- Global vs category-specific override logic

**Dynamic Updates**:
- Changing preference updates all fields without page reload
- Event propagation to custom components
- Chart axis labels reflect active units

**Cross-Browser**:
- Cookie handling differences
- Event listener compatibility
- Number formatting locale issues

---

### Cookie Management Pattern

Climate state and user preferences are stored in site-wide cookies for persistence across tool pages.

**Cookie Storage Strategy:**

Primary cookie manages application state:
- `fswepp_climate`: JSON-serialized ClimatePars object with 365-day expiry

**Cookie Operations Required:**

1. **Read Climate Cookie**: Retrieve and parse climate state, falling back to defaults if missing or invalid
2. **Write Climate Cookie**: Serialize and store updated climate state with 365-day expiry
3. **Generic Cookie Helpers**: Set/get cookie values with proper encoding and expiry handling

**Climate State Update Flow:**

1. User modifies climate parameter in RockClimControl
2. Component validates and updates internal state
3. Updated state serialized and written to cookie
4. Cookie persists with 365-day expiry
5. On navigation to different tool page, cookie read on page load
6. Climate state immediately available without re-selection

**Important Considerations:**

- Cookie size limits: Keep JSON compact, climate data typically <4KB
- Path scope: Set path=/ for site-wide access
- SameSite policy: Use SameSite=Lax for security
- Error handling: Gracefully handle malformed JSON or corrupted cookies
- User control: Provide clear UI to apply and clear custom climate settings
- No server-side persistence: Cookies cleared = state reset to defaults

---

## Styling and Visual Design Reuse

### Overview

The existing React frontend at `/workdir/fswepp2/frontend` provides a complete design system built with Tailwind CSS v4.1 and shadcn/ui components. The Hono/Bun implementation will reuse this design system to ensure visual consistency and reduce development effort.

The Hono/Bun UI foundation already exists at `/workdir/fswepp2/ui` with Tailwind CSS configured using the same theme.

### Theme System

The React frontend uses a custom theme based on:
- **Color System**: OKLCH color space for perceptually uniform colors
- **Typography**: Inter font family, self-hosted (no external font CDN)
- **Component Library**: shadcn/ui built on Radix UI primitives
- **Utility Framework**: Tailwind CSS v4.1

### Reusing Styles in Vanilla JavaScript

#### 1. Shared CSS Foundation

The `/ui` directory already includes Tailwind CSS v4 configured with the same theme:

**Location**: `/workdir/fswepp2/ui/styles/theme.css`

This file imports Tailwind CSS and defines the same CSS custom properties as the React frontend:

**Color Variables**:
- `--color-background`, `--color-foreground`
- `--color-primary`, `--color-primary-foreground`
- `--color-secondary`, `--color-muted`, `--color-accent`
- `--color-destructive` (for errors/warnings)
- `--color-border`, `--color-input`, `--color-ring`
- `--color-chart-1` through `--color-chart-5` (for visualizations)

**Typography Variables**:
- `--font-sans`: Inter font stack (served from `/ui/public/fonts/` via `@font-face`)
- `--font-code`: Monospace font stack

**Utility Classes**:
- `.page-container`: Standard page layout
- `.dialog-container`: Modal/dialog layouts

#### 2. Build Process

Compile Tailwind CSS from source:

**Command**: `bun run build:css` (or `bun run build`)

**Input**: `/ui/styles/theme.css`
**Output**: `/ui/public/app.css` (minified, generated)

This generates a standalone CSS file with all Tailwind utilities and custom theme variables.

**Dev workflow**:
- `bun run dev:css` (one-time build, then watch)
- `bun run dev:all` (CSS watch + server)

**Note**: `/ui/public/app.css` is generated and not tracked in git.

#### 3. Using Tailwind Classes in Vanilla JavaScript

When creating elements dynamically, apply the same Tailwind classes used in the React components:

**Component Pattern Mapping**:

**Button** (from React):
```
Class pattern: inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium
Variants:
- Default: bg-primary text-primary-foreground hover:bg-primary/90
- Outline: border bg-background hover:bg-accent
- Destructive: bg-destructive text-white hover:bg-destructive/90
```

**Card** (from React):
```
Container: bg-card text-card-foreground rounded-xl border border-border shadow-sm py-6
Header: px-6 gap-1.5
Title: font-semibold leading-none
Description: text-sm text-muted-foreground
Content: px-6
```

**Input** (from React):
```
Class pattern: flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm
Focus: focus-visible:ring-ring/50 focus-visible:ring-[3px]
```

**Select/Dropdown** (from React):
```
Trigger: flex h-9 items-center justify-between rounded-md border border-input bg-background px-3
```

#### 4. Component Construction Pattern

Create vanilla JavaScript components that mirror React component structure:

**Step 1**: Create element with base classes
**Step 2**: Add variant classes conditionally
**Step 3**: Apply event listeners
**Step 4**: Return configured element

**Example Structure**:
```
function createButton(text, variant = 'default', onClick) {
  const button = document.createElement('button');

  // Base classes (always applied)
  const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all';

  // Variant classes (conditionally applied)
  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border bg-background hover:bg-accent',
    destructive: 'bg-destructive text-white hover:bg-destructive/90'
  };

  button.className = `${baseClasses} ${variantClasses[variant]}`;
  button.textContent = text;
  if (onClick) button.addEventListener('click', onClick);

  return button;
}
```

#### 5. Reusing Visual Assets

**Icons and Images**:

The React frontend includes SVG icons and images in `/frontend/public/`:
- Tool icons: `wepp-road-icon.svg`, `ermit-icon.svg`, `rockclime-icon.svg`
- Map markers: `default-map-marker.png`, `station-map-marker.png`
- Diagrams: `culvertgraphic.png`, `stormtypes.gif`, `fangmeier.gif`
- UI elements: `upArrow.png`, `downArrow.png`, `external-link.svg`

**Reuse Strategy**:
1. Copy relevant assets from `/frontend/public/` to `/ui/public/`
2. Reference using absolute paths: `/public/wepp-road-icon.svg`
3. For inline SVG icons, extract SVG code from React components if needed

**Lucide Icons**:

The React frontend uses Lucide React for icons. For vanilla JavaScript:
- Option 1: Use Lucide icon SVGs directly from CDN or local copies
- Option 2: Extract frequently-used icon SVGs from React components
- Option 3: Implement minimal icon set using inline SVG

#### 6. Responsive Design Utilities

Tailwind responsive prefixes work identically in vanilla JavaScript:

**Breakpoints** (from Tailwind config):
- `sm:` - 640px
- `md:` - 768px
- `lg:` - 1024px
- `xl:` - 1280px

**Usage Pattern**:
```
Classes: "flex flex-col sm:flex-row gap-4 sm:gap-6"
Result: Column on mobile, row on desktop with larger gap
```

#### 7. Dark Mode (Future Consideration)

The React frontend includes dark mode support using CSS variables with a `.dark` class variant. While not required initially, the infrastructure exists:

**Dark Mode Variables**: Defined in `/frontend/src/index.css` lines 7-39
**Activation**: Apply `.dark` class to document root or theme container
**Tailwind Variants**: Use `dark:` prefix (e.g., `dark:bg-gray-900`)

To enable in Hono/Bun:
1. Copy dark mode CSS variable definitions to `/ui/styles/theme.css`
2. Implement theme toggle in JavaScript
3. Persist preference in localStorage or cookie
4. Apply `dark` class to `<html>` or `<body>` element

#### 8. Chart Color Palette

For canvas-based visualizations, use the predefined chart colors:

**Chart Colors** (from theme):
- Chart 1: `oklch(0.646 0.222 41.116)` - Warm orange
- Chart 2: `oklch(0.6 0.118 184.704)` - Teal
- Chart 3: `oklch(0.398 0.07 227.392)` - Deep blue
- Chart 4: `oklch(0.828 0.189 84.429)` - Yellow-green
- Chart 5: `oklch(0.769 0.188 70.08)` - Bright yellow

**Accessing in JavaScript**:
```
const chartColor1 = getComputedStyle(document.documentElement)
  .getPropertyValue('--color-chart-1').trim();
```

Or define directly in plotting library for consistency.

#### 9. Animation and Transitions

The React frontend uses `tailwindcss-animate` plugin. Key animations available:

**Fade In/Out**: `animate-in fade-in`, `animate-out fade-out`
**Slide**: `slide-in-from-top`, `slide-in-from-bottom`
**Transitions**: `transition-all`, `transition-colors`, `transition-transform`

If animations are needed in vanilla implementation:
1. Check compiled CSS for `@keyframes` definitions
2. Apply animation classes to elements
3. Or implement custom CSS animations using same timing functions

#### 10. Form Styling Consistency

Forms should match React frontend styling:

**Label Style**: `text-sm font-medium leading-none`
**Required Indicator**: `text-destructive` (for asterisks)
**Helper Text**: `text-sm text-muted-foreground`
**Error Message**: `text-sm font-medium text-destructive`
**Field Spacing**: `space-y-2` for vertical field groups

**Validation States**:
- Error: `border-destructive ring-destructive/20 focus-visible:ring-destructive/40`
- Success: Could use `border-primary ring-primary/20`

### Component Reference Table

| React Component | Vanilla JS Classes | Notes |
|----------------|-------------------|-------|
| Button | `inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium` | Add variant classes |
| Card | `bg-card rounded-xl border border-border shadow-sm py-6` | Container element |
| Input | `flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm` | Form inputs |
| Select | `flex h-9 items-center justify-between rounded-md border border-input px-3` | Dropdowns |
| Label | `text-sm font-medium leading-none` | Form labels |
| Badge | `inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold` | Status indicators |
| Alert | `relative w-full rounded-lg border px-4 py-3 text-sm` | Notifications |
| Separator | `h-px w-full bg-border` | Horizontal rule |
| Tabs | Various classes for tab list, trigger, content | See React component |

### Migration Workflow

When implementing a new page or component:

1. **Reference React Implementation**: Check `/frontend/src/pages/` or `/frontend/src/components/` for equivalent React component
2. **Extract Class Names**: Identify Tailwind classes used in JSX
3. **Map to Vanilla JS**: Apply same classes to vanilla JavaScript elements
4. **Test Appearance**: Verify visual match against React version
5. **Add Interactivity**: Implement JavaScript behavior using same API patterns
6. **Validate Responsive**: Test across breakpoints to ensure layout matches

### Style Maintenance

**Single Source of Truth**: `/ui/styles/theme.css`

When theme changes are needed:
1. Update CSS variables in `theme.css`
2. Rebuild CSS: `bun run build:css`
3. Changes automatically apply to all pages using `/public/app.css`

**Adding Custom Utilities**:
If additional utility classes are needed, add them in `@layer components` section of `theme.css`:

```
@layer components {
  .custom-utility {
    @apply flex items-center gap-2;
  }
}
```

Then rebuild CSS.

### Icon Strategy

**Approach**: Hybrid inline SVG + static files

The React frontend uses Lucide React for icons. For vanilla JavaScript implementation without external dependencies, use a combination of approaches:

**For UI Chrome Icons** (buttons, navigation, controls):
- **Method**: Inline SVG via JavaScript helper functions
- **Implementation**: Create `/ui/src/icons.js` module
- **Pattern**: Export functions that return SVG template literals
- **Usage**: `element.innerHTML = icons.play()`
- **Advantages**: No HTTP requests, style with CSS, no dependencies

**Example icons.js structure**:
```
export const icons = {
  play: (className = 'size-4') => `<svg class="${className}" xmlns="..." viewBox="...">...</svg>`,
  pause: (className = 'size-4') => `<svg class="${className}" ...>...</svg>`,
  settings: (className = 'size-4') => `<svg class="${className}" ...>...</svg>`,
  chevronDown: (className = 'size-4') => `<svg class="${className}" ...>...</svg>`,
  // Extract from lucide.dev or Lucide React source
};
```

**For Tool/Feature Icons** (WEPP Road, ERMiT, Rock:Clime logos):
- **Method**: Static SVG files
- **Location**: Copy from `/frontend/public/` to `/ui/public/icons/`
- **Usage**: `<img src="/public/icons/wepp-road-icon.svg" alt="WEPP Road" />`
- **Already Available**: wepp-road-icon.svg, ermit-icon.svg, rockclime-icon.svg, etc.

**Icon Extraction Process**:
1. Identify needed icons from React components
2. Visit lucide.dev and search for icon name
3. Copy SVG code
4. Wrap in JavaScript function with configurable className
5. Add to icons.js module

**Commonly Needed Icons** (based on spec):
- Navigation: menu, x (close), chevron-down, external-link
- Forms: check, x, alert-circle, info, search
- Actions: play, download, upload, save, trash, edit
- Map: map-pin, plus, minus, maximize
- Charts: bar-chart, line-chart, download

**Styling SVG Icons**:
- Use Tailwind size utilities: `size-4`, `size-5`, `size-6`
- Color via `text-*` classes: SVG inherits currentColor
- Example: `icons.play('size-4 text-primary')`

---

### deck.gl Integration

**Purpose**: Interactive map for location selection in RockClim control

**Loading Strategy**: Self-hosted (local bundle or static asset)

**Implementation**:

1. **Include deck.gl from local asset**:
```html
<script src="/public/js/deck.gl.min.js"></script>
```

2. **Minimal Configuration**:
```javascript
const map = new deck.DeckGL({
  container: 'map-container',
  initialViewState: {
    longitude: -116.0,
    latitude: 47.0,
    zoom: 6
  },
  controller: true,
  layers: [
    new deck.ScatterplotLayer({
      id: 'stations',
      data: stationsGeoJSON.features,
      getPosition: d => d.geometry.coordinates,
      getRadius: 5000,
      getFillColor: [0, 100, 200]
    })
  ],
  onClick: (info, event) => {
    const {coordinate} = info;
    setLocation(coordinate[0], coordinate[1]);
  }
});
```

3. **Basemap Options**:
- **Recommended**: OpenStreetMap (no API key required)
- Alternative: Mapbox (requires free API key)
- Alternative: No basemap (just show boundaries and points)

4. **Station Display**:
- Use `ScatterplotLayer` for station markers
- Filter stations by selected database before rendering
- Color code by database: legacy (blue), 2015 (green), ghcn (orange), au (red)
- Show station info on hover using deck.gl tooltip
- Cluster markers at low zoom levels (optional, post-MVP)

5. **Performance**:
- Load stations for selected database only (not all 2600+)
- Use GeoJSON format from API: `/api/rockclim/GET/stations_geojson`
- When requesting `stations_geojson`, compute `bbox: [ul_x, ul_y, lr_x, lr_y]` from the current map view bounds
- deck.gl handles rendering efficiently with WebGL

6. **Map Interaction**:
- Click map to set location
- Drag to pan
- Scroll to zoom
- Double-click to zoom in
- Shift+drag to rotate (optional)

7. **Responsive Sizing**:
- Container: 100% width of RockClim panel
- Height: 400px (or `max-h-96` in Tailwind)
- Resize handler: `map.setProps({width, height})` on window resize

**CSS Requirements**:
```css
#map-container {
  position: relative;
  width: 100%;
  height: 400px;
}

#map-container canvas {
  outline: none;
}
```

**Browser Compatibility**:
- Requires WebGL support (all modern browsers)
- Fallback: Show message if WebGL not available
- Mobile: Touch gestures work automatically

**CSP Note**:
- If using OSM tiles directly, ensure CSP allows tile domains under `img-src`/`connect-src`.

---

### Dark Mode

**Status**: Not implemented in MVP

**Rationale**:
- Light mode only for initial release
- CSS infrastructure exists in theme for future implementation
- Dark mode toggle and preferences can be added post-MVP

**Future Implementation** (when added):
- Theme toggle in navigation bar
- Persist preference in cookie
- Use existing `.dark` class variant CSS variables
- Apply to charts, modals, and all components

---

### Asset Organization

**Directory Structure**:
```
/ui/public/
  app.css                  # Compiled Tailwind CSS
  /icons/                  # SVG icons copied from React frontend
    wepp-road-icon.svg
    ermit-icon.svg
    rockclime-icon.svg
  /images/                 # PNG/GIF images copied from React frontend
    fswepp-logo.png
    culvertgraphic.png
    stormtypes.gif
  /markers/                # Map markers
    default-map-marker.png
    station-map-marker.png
```

### Browser Compatibility

The theme CSS uses modern features:
- OKLCH color space (requires recent browsers, fallbacks may be needed)
- CSS custom properties (widely supported)
- CSS Grid and Flexbox (widely supported)
- CSS `@layer` directive (Tailwind v4 feature)

**Fallback Strategy**: If older browser support is required, consider:
- Convert OKLCH colors to RGB/HSL equivalents
- Use PostCSS plugins for compatibility
- Test on target browsers

---

## File Organization

Recommended client-side file structure:

```
/public/js/
  /core/
    state-manager.js         # State management utilities
    api-client.js           # API communication layer
    validators.js           # Form validation functions
  /components/
    rockclim-control.js     # Rock climate component
    form-field.js           # Form field components
    run-button.js           # Run button component
    data-table.js           # Table component
    stat-card.js            # Statistics card component
  /charts/
    chart-core.js           # Base chart functionality
    chart-scales.js         # Scale calculations
    chart-renderers.js      # Drawing functions
    chart-interactions.js   # User interactions
    chart-types.js          # Specific chart implementations
  /tools/
    wepproad.js            # WEPP Road tool logic
    disturbed.js           # Disturbed WEPP tool logic
    ermit.js               # ERMiT tool logic
  /utils/
    format.js              # Number/string formatting
    storage.js             # LocalStorage helpers
    cookies.js             # Cookie management utilities
  /unitizer/
    unitizer_client.js     # Unitizer conversion engine (ported from WEPPcloud)
    unitizer_map.js        # Generated unit conversion table

/public/css/
  base.css                 # Base styles and resets
  components.css           # Component styles
  charts.css               # Chart-specific styles
  tools.css                # Tool-specific styles
  unitizer.css             # Unitizer wrapper and modal styles
  responsive.css           # Media queries
```

---

## Testing Requirements

**Testing is a mandatory requirement during implementation.** All components, utilities, and user workflows must have corresponding test coverage before being considered complete.

### Testing Framework and Tools

**Required Testing Stack:**
- **Unit Testing**: Bun's built-in test runner (`bun test`)
- **DOM Testing**: happy-dom or jsdom for DOM manipulation tests
- **E2E Testing**: Playwright for cross-browser end-to-end tests
- **Assertions**: Bun's native `expect` API
- **Coverage**: Bun's built-in coverage reporting (`--coverage`)

**Minimum Coverage Requirements:**
- Utility functions: 90% code coverage
- Component logic: 80% code coverage
- Integration workflows: Core paths must be tested
- E2E tests: All primary user journeys covered

### Unit Tests

**Scope:** Test individual functions and modules in isolation.

**Required Test Coverage:**

1. **Validation Functions** (`src/utils/validation.js`)
   - Required field validation (empty, whitespace-only)
   - Numeric range validation (min/max, inclusive/exclusive)
   - Numeric type validation (integer, float, positive/negative)
   - Coordinate validation (longitude -180 to 180, latitude -90 to 90)
   - Edge cases: NaN, Infinity, null, undefined
   - Error message generation

2. **Unit Conversion Utilities** (`src/utils/unitizer.js`)
   - Conversion accuracy for all supported units (length, area, mass, temperature, etc.)
   - Bidirectional conversions (metric → English → metric)
   - Precision and rounding behavior
   - Edge cases: zero, negative values, very large/small numbers
   - Format display with correct significant figures
   - Unknown unit handling

3. **State Management** (`src/utils/cookies.js`, `src/utils/storage.js`)
   - Cookie read/write/delete operations
   - JSON serialization/deserialization
   - Expiry date calculation (365 days)
   - Cookie parsing with malformed data
   - LocalStorage read/write/clear
   - State precedence (URL > LocalStorage > Cookie > Default)

4. **Chart Utilities** (`src/utils/chart.js`)
   - Scale calculation (linear, logarithmic)
   - Axis tick generation with appropriate intervals
   - Data point transformation (data space → pixel space)
   - Hover hit detection (point proximity)
   - Legend generation
   - Canvas dimension calculations

5. **URL Parameter Handling** (`src/utils/url.js`)
   - Base64url JSON encoding/decoding
   - Malformed base64url handling
   - Invalid JSON handling
   - Configuration merging with defaults
   - Query parameter extraction

6. **Form State Management** (`src/utils/form.js`)
   - Field value extraction
   - Form data serialization
   - Validation state tracking
   - Error aggregation
   - Field enable/disable logic

**Test Organization:**
```
tests/
  unit/
    validation.test.js
    unitizer.test.js
    cookies.test.js
    storage.test.js
    chart.test.js
    url.test.js
    form.test.js
```

### Integration Tests

**Scope:** Test component interactions and workflows involving multiple modules.

**Required Test Coverage:**

1. **RockClimControl Component**
   - Initialize with cookie-stored climate
   - Initialize with URL parameters
   - Location button toggles map visibility
   - Map click updates longitude/latitude fields
   - Manual coordinate entry updates map center
   - Invalid coordinate handling and error display
   - Climate state updates propagate to cookie
   - Database selection changes available stations
   - Station selection populates par_id
   - Custom parameter modifications update state

2. **Form Submission Workflows**
   - Form initialization from URL/LocalStorage/defaults
   - Field validation on blur
   - Validation state updates (valid → invalid → valid)
   - Submit button disabled when validation errors exist
   - Form serialization includes all fields
   - Form reset clears validation state
   - Unit toggle updates field values and labels

3. **API Integration**
   - Successful API call updates UI with results
   - Loading state during API call (button disabled, spinner shown)
   - Error response displays appropriate user message
   - Network error handling
   - Timeout handling
   - Retry logic (if implemented)
   - Response data validation before rendering

4. **Chart Rendering**
   - Chart renders with sample data
   - Axis labels reflect active unit system
   - Hover tooltips display correct values
   - Multiple series rendering
   - Empty data handling (show message)
   - Chart responsive to container resize
   - Legend toggle shows/hides series

5. **Table Interactions**
   - Table renders with sample data
   - Client-side pagination (page navigation)
   - Sort by column (ascending/descending)
   - Empty table state displays message
   - Export button generates correct data format

6. **Unit System Toggle**
   - Toggle switches between Metric and English
   - All displayed values update immediately
   - Field labels update with unit symbols
   - Chart axis labels update
   - Cookie persists preference
   - Preference applies across page navigation

7. **URL Configuration Sharing**
   - Generate shareable URL with current form state
   - Load form state from URL on page load
   - URL parameters override localStorage/cookies
   - Invalid URL parameters show error message

**Test Organization:**
```
tests/
  integration/
    rockclim-control.test.js
    form-submission.test.js
    api-integration.test.js
    chart-rendering.test.js
    table-interactions.test.js
    unit-toggle.test.js
    url-configuration.test.js
```

### End-to-End Tests

**Scope:** Test complete user workflows in a real browser environment.

**Required Test Coverage:**

1. **WEPP Road Complete Workflow**
   - Navigate to /fswepp2/wepproad
   - Set location via map click
   - Fill all required form fields
   - Submit form
   - Verify results display (charts, tables, statistics)
   - Download result file (if in MVP)
   - Share URL and verify configuration loads

2. **Disturbed WEPP Complete Workflow**
   - Navigate to /fswepp2/disturbed
   - Set location via coordinate entry
   - Select vegetation treatment
   - Configure soil parameters
   - Submit form
   - Verify erosion predictions display
   - Verify probability table renders

3. **ERMiT Complete Workflow**
   - Navigate to /fswepp2/ermit
   - Set location from saved climate
   - Configure fire severity
   - Set slope/aspect parameters
   - Submit form
   - Verify probabilistic results display
   - Verify mitigation scenarios table

4. **Climate Persistence Workflow**
   - Set location on WEPP Road page
   - Navigate to Disturbed WEPP page
   - Verify location persisted from cookie
   - Modify location
   - Navigate to ERMiT page
   - Verify updated location persisted

5. **Unit System Persistence Workflow**
   - Toggle to English units
   - Submit form and view results
   - Navigate to different tool page
   - Verify English units still active
   - Reload page
   - Verify English units persisted from cookie

6. **Error Handling Workflows**
   - Submit form with invalid data
   - Verify validation errors display
   - Submit form with API returning 400 error
   - Verify error message displays
   - Trigger network timeout
   - Verify timeout message displays

7. **Responsive Design Workflows**
   - Test all pages at mobile viewport (375px width)
   - Test all pages at tablet viewport (768px width)
   - Test all pages at desktop viewport (1920px width)
   - Verify touch interactions work on mobile
   - Verify map interactions work on touch devices

**Cross-Browser Requirements:**
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

**Test Organization:**
```
tests/
  e2e/
    wepproad.spec.js
    disturbed.spec.js
    ermit.spec.js
    climate-persistence.spec.js
    unit-persistence.spec.js
    error-handling.spec.js
    responsive.spec.js
```

### Performance Tests

**Scope:** Validate performance meets defined targets.

**Required Performance Benchmarks:**

1. **Chart Rendering**
   - Render 500-point line chart in < 100ms
   - Render multi-series chart (3 series, 200 points each) in < 200ms
   - Hover tooltip response time < 16ms (60fps)
   - Chart resize/redraw < 100ms

2. **Table Rendering**
   - Render 1000-row table (paginated, 25 rows visible) in < 200ms
   - Sort 1000-row table in < 100ms
   - Page navigation < 50ms

3. **Form Validation**
   - Single field validation < 10ms
   - Full form validation (20 fields) < 50ms
   - Debounced validation triggers after 300ms idle

4. **API Response Time**
   - WEPP Road simulation: < 10 seconds (90th percentile)
   - Disturbed WEPP simulation: < 8 seconds (90th percentile)
   - ERMiT simulation: < 5 seconds (90th percentile)
   - RockClim location search: < 2 seconds

5. **Memory Usage**
   - No memory leaks after 10 page navigations
   - Chart cleanup releases canvas resources
   - Event listener cleanup on component destruction

6. **Bundle Size**
   - Total JavaScript bundle < 150KB (gzipped)
   - CSS bundle < 30KB (gzipped)
   - Initial page load < 1 second on 3G connection

**Test Organization:**
```
tests/
  performance/
    chart-rendering.bench.js
    table-rendering.bench.js
    form-validation.bench.js
    api-response.bench.js
    memory-leaks.bench.js
    bundle-size.bench.js
```

### Accessibility Tests

**Required Accessibility Coverage:**

1. **Keyboard Navigation**
   - All interactive elements reachable via Tab
   - Form submission via Enter key
   - Modal/dialog dismissal via Escape key
   - Map navigation via arrow keys (if implemented)

2. **Screen Reader Compatibility**
   - Form labels associated with inputs (aria-labelledby)
   - Error messages announced (aria-live regions)
   - Loading states announced
   - Chart data accessible via data table alternative

3. **Color Contrast**
   - Text meets WCAG AA contrast ratio (4.5:1 for normal text)
   - Interactive elements meet WCAG AA contrast ratio
   - Error states have sufficient contrast

4. **Focus Management**
   - Focus visible on all interactive elements
   - Focus trap in modals/dialogs
   - Focus restoration after modal close

**Test Organization:**
```
tests/
  a11y/
    keyboard-navigation.spec.js
    screen-reader.spec.js
    color-contrast.spec.js
    focus-management.spec.js
```

### UI Component Gallery (Review Harness)

To support design QA and accessibility reviews, a component gallery endpoint is provided:

- **Route**: `/fswepp2/ui-component-gallery`
- **Purpose**: single-page showcase of shared UI components and theme specimens
- **Metadata hooks**:
  - `data-contrast-suite` on the gallery root
  - `data-contrast-id` on component specimens for contrast metrics
  - `data-theme-select` reserved for future theme selector
- **Contrast metrics**: UI generates a Markdown report of contrast ratios across component primitives (buttons, inputs, alerts, table headers, stat cards, etc.)

### Testing Workflow Integration

**Pre-Commit Requirements:**
- All unit tests pass (`bun test`)
- No linting errors (`bun run lint`)
- No type errors (if using TypeScript)

**Pre-Merge Requirements:**
- All unit and integration tests pass
- Coverage meets minimum thresholds
- E2E tests pass for affected workflows
- Performance benchmarks within acceptable range

**Continuous Integration:**
- Run full test suite on every pull request
- Run E2E tests across all supported browsers
- Generate coverage report and fail if below threshold
- Run performance benchmarks and flag regressions

**Test Data Management:**
- Fixture data for API responses in `tests/fixtures/`
- Sample climate configurations in `tests/fixtures/climates/`
- Sample form data for each tool in `tests/fixtures/forms/`
- Mock API server for integration tests

### Component-Specific Testing Requirements

**Every new component MUST include:**
1. Unit tests for isolated logic
2. Integration test for component initialization
3. Integration test for primary user interactions
4. Accessibility test for keyboard navigation
5. Visual regression test (optional but recommended)

**Definition of Done for Component:**
- Tests written and passing
- Coverage meets threshold
- Accessibility tests pass
- Performance acceptable
- Code reviewed
- Documentation updated

---

## Future Enhancements (Out of Scope)

The following features are documented for potential future implementation but are not part of the initial specification:

- Batch processing multiple scenarios
- Comparison view for multiple runs side-by-side
- Advanced spatial analysis with watershed delineation
- Mobile native app versions
- Offline mode with ServiceWorker
- Integration with GIS platforms
- Export run history (currently session-only)

**Note:** User authentication and server-side user database are intentionally excluded from the architecture.

---

## Appendix A: API Reference Summary

### Rock Climate Endpoints

- `POST /api/rockclim/GET/available_state_codes` - Get states in database
- `POST /api/rockclim/GET/stations_in_state` - Get stations by state
- `POST /api/rockclim/GET/closest_stations` - Get nearest stations to location
- `POST /api/rockclim/GET/station_par_monthlies` - Get monthly climate summary
- `POST /api/rockclim/GET/climate` - Generate climate file

**Note:** User-defined climate storage is client-side only via cookies. No server-side user database exists.

### WEPP Road Endpoints

- `POST /api/wepproad/RUN/wepp` - Run WEPP Road model
- `POST /api/wepproad/GET/soil` - Get soil file
- `POST /api/wepproad/GET/slope` - Get slope file
- `POST /api/wepproad/GET/management` - Get management file

### Disturbed WEPP Endpoints

- `POST /api/disturbedwepp/RUN/wepp` - Run Disturbed WEPP model
- `POST /api/disturbed/GET/soil` - Get soil file
- `POST /api/disturbed/GET/slope` - Get slope file
- `POST /api/disturbed/GET/management` - Get management file

### ERMiT Endpoints

- `POST /api/ermit/RUN/wepp` - Run ERMiT model
- `POST /api/ermit/GET/slope/{spatial_severity}` - Get slope file
- `POST /api/ermit/GET/soil/{spatial_severity}/{k}` - Get soil file
- `POST /api/ermit/GET/management/{spatial_severity}` - Get management file
- `POST /api/ermit/GET/pre_fire_covers` - Calculate pre-fire vegetation covers

---

## Appendix B: Legacy Comparison

### Differences from Legacy FSWEPP

**Improved:**
- Rock climate integrated into tool pages (no separate navigation)
- Location-first workflow (vs state-first)
- Real-time form validation
- Interactive charts (vs static PNG)
- Responsive design
- Faster performance

**Changed:**
- Model inputs section in reports: Removed from results (inputs remain visible on page above results)

**Deferred to Post-MVP**:
- File download options for intermediate files (slope, soil, climate, management files)
  - Files are generated and available via GET endpoints
  - Download UI buttons will be added after MVP
  - API endpoints already exist (e.g., `/wepproad/GET/soil`, `/wepproad/GET/slope`)
- Batch processing interface
- Multiple climate comparison view

**Maintained:**
- All core model functionality
- Same WEPP engine (wepp2010)
- Compatible climate databases
- Equivalent output metrics

---

## Appendix C: Glossary

**OFE**: Overland Flow Element - a segment of hillslope with uniform properties

**ClimatePars**: Climate parameter object containing station ID, location, CLIGEN version, etc.

**PAR file**: CLIGEN parameter file containing monthly climate statistics

**PRISM**: Parameter-elevation Regressions on Independent Slopes Model - spatial climate data

**CLIGEN**: Climate Generator - stochastic weather generator

**Burn Severity**: Degree of fire impact on soil properties (High/Moderate/Low/Unburned)

**Sediment Delivery**: Amount of eroded sediment that reaches the bottom of the hillslope

**Exceedance Probability**: Likelihood that a value will be exceeded in a given year

**Return Period**: Average time interval between events of a given magnitude

---

## Appendix D: Design Decisions

This section documents key design decisions made during specification development.

### 1. RockClim Map Interaction Pattern

**Decision**: Inline expansion within panel

**Rationale**:
- Keeps user in context (no modal overlay obscuring page)
- Clear affordance with a dedicated "Map Location" collapsible header
- Map state is temporary and task-focused (select location, then collapse)
- Simpler implementation than modal or side panel

**Implementation**:
- "Map Location" collapsible toggles map visibility
- Panel expands to show deck.gl map inline below controls
- Map height: 300-400px responsive
- Click map or manually enter coordinates
- Location persists in two separate longitude/latitude input fields

**User Benefits**:
- Can manually type exact coordinates for precision
- Visual confirmation of location on map
- Easy to collapse map when done
- Location stays visible in input fields when map hidden

### 2. Units Toggle Behavior

**Decision**: Immediate toggle, no modal confirmation

**Rationale**:
- Follows WEPPcloud established pattern
- Fast, frictionless interaction for most common use case
- Advanced per-category overrides available via optional secondary control

**Implementation**:
- Toggle switch in fixed top-right of header
- Labeled "Metric ⇄ English", default to Metric
- Click immediately updates all values on page
- Preference saved to `fswepp_units` cookie
- Optional gear icon/button next to toggle for advanced modal

**User Benefits**:
- Instant visual feedback
- No interruption to workflow
- Global preference persists across site
- Power users can access fine-grained control if needed

### 3. Form Validation Strategy

**Decision**: Hybrid blur-then-change with inline error display

**Rationale**:
- Balance between immediate feedback and non-intrusive UX
- Prevents annoying errors while user is still typing
- After first error, validates on change so user sees fix immediately
- Matches modern form UX best practices

**Implementation**:
- First validation on blur (field exit)
- After field touched with error, validate on change with 300ms debounce
- Red border + inline message below field
- Submit button disabled with any validation errors

**User Benefits**:
- Not disruptive during initial input
- Responsive feedback when correcting errors
- Clear visual state (red border, inline message)
- Prevents submission with invalid data

### 4. Icon Loading Strategy

**Decision**: Hybrid inline SVG + static files

**Rationale**:
- Minimal dependencies (no Lucide library dependency)
- No HTTP requests for UI icons (inline SVG)
- Self-hosted and cacheable for tool icons
- Flexible styling with CSS

**Implementation**:
- UI chrome icons: JavaScript functions returning SVG strings
- Tool icons: Copy SVG files from React frontend to `/ui/public/icons/`
- Icon module: `/ui/src/icons.js` with template literal functions

**User Benefits**:
- Fast page loads (no icon font downloads)
- Consistent with React frontend visuals
- Works offline (no CDN dependency)

### 5. Location Input Fields

**Decision**: Two separate inputs for longitude and latitude

**Rationale**:
- Allows manual entry of exact coordinates
- Clearer than single combined field
- Standard pattern for geo-coordinates
- Enables validation per field

**Implementation**:
- Numeric input for longitude (-180 to 180)
- Numeric input for latitude (-90 to 90)
- Both editable, trigger closest stations API call on change
- Sync with map click (populate from click coordinates)

**User Benefits**:
- Precision input option for users with known coordinates
- Clear labeling and validation
- Flexibility: use map or type values

### 6. Stateless Cookie-Based Architecture

**Decision**: No user authentication, no server-side user database

**Rationale**:
- Simplicity: no user account management overhead
- Privacy: no server-side tracking or data storage
- Performance: no database queries for preferences
- Maintenance: reduced infrastructure complexity
- Portability: configurations shareable via URL

**Implementation**:
- Climate state: `fswepp_climate` cookie
- User climate customization: `fswepp_climate.user_defined_par_mod`
- Unit preferences: `fswepp_units` cookie
- All 365-day expiry, site-wide scope

**Trade-offs**:
- Users can't access saved configurations from different browsers/devices
- Cookie clearing loses preferences
- No run history tracking
- Acceptable for tool's use case (scientific/engineering users on workstations)

### 7. API Contract: Metric Units Only

**Decision**: All API endpoints use SI units exclusively

**Rationale**:
- Eliminates ambiguity in API contracts
- Simplifies backend validation and calculations
- Consistent with scientific/engineering standards
- Frontend handles all display unit conversion

**Implementation**:
- API accepts/returns only metric values
- Frontend unitizer converts for display
- Form submission reads canonical SI values
- Results rendered in user's preferred units

**User Benefits**:
- See data in familiar units
- API remains simple and unambiguous
- Same backend can serve multiple frontends

### 8. Canvas-Based Charting

**Decision**: Custom lightweight canvas plotting library

**Rationale**:
- Minimal dependencies (vanilla JS requirement)
- Full control over rendering and interactions
- Smaller bundle size than Chart.js or D3
- Tailored to FSWEPP-specific chart types

**Implementation**:
- Modular architecture: core, scales, renderers, interactions, types
- Reusable across all three tools
- Export to PNG built-in
- CSS-styled using theme colors

**Trade-offs**:
- More development effort than using library
- Need to implement accessibility features
- But: better performance, full customization, no dependency overhead

### 9. Tool Icons from React Frontend

**Decision**: Copy existing SVG icons from React implementation

**Rationale**:
- Already designed and approved
- Consistent branding across old/new frontend
- High quality, professionally designed
- No design effort required

**Implementation**:
- Copy from `/frontend/public/` to `/ui/public/icons/`
- Use in vanilla JS with `<img>` tags or inline SVG
- Icons available: wepp-road-icon.svg, ermit-icon.svg, rockclime-icon.svg, etc.

### 10. deck.gl Loading Strategy

**Decision**: Self-hosted deck.gl bundle

**Rationale**:
- Avoid CDN dependency and CSP `script-src` issues
- Predictable versioning and offline-friendly dev
- Aligns with minimal external runtime dependencies

**Implementation**:
- Serve `/public/js/deck.gl.min.js` from UI static assets
- Minimal configuration for station map display
- OpenStreetMap basemap (no API key required)
- WebGL rendering for performance
- Update CSP to allow OSM tile domains (img/connect) if used

**Trade-offs**:
- Requires managing a local deck.gl build/update cadence
- Slightly larger static asset footprint

### 11. URL Configuration Sharing

**Decision**: Base64url-encoded JSON query parameters

**Rationale**:
- Simple encoding/decoding with built-in `btoa`/`atob`
- Handles complex nested state objects
- No additional dependencies
- Standard approach for state sharing

**Implementation**:
- Encode climate + tool parameters as JSON, then base64url
- URL param: `?config=<base64url_string>`
- Parse on page load, override cookies/localStorage
- Validate and handle decode errors gracefully

**Limitations**:
- URL length limits (~2000 chars) for complex configs
- Not human-readable
- Acceptable trade-off for full state preservation

### 12. Chart Interactivity MVP Scope

**Decision**: Hover tooltips only in MVP

**Rationale**:
- Most essential interactive feature
- Relatively simple to implement
- Provides significant UX value
- Advanced features (pan/zoom, selection) deferred to post-MVP

**Implementation**:
- Hover shows exact X/Y values with units
- Tooltip positioned near cursor
- Matches theme styling
- Formatted numbers with proper precision

**Future Enhancements**:
- Click to highlight series
- Zoom/pan controls
- Data point selection
- Brush selection

### 13. Table Pagination Strategy

**Decision**: Client-side pagination

**Rationale**:
- Dataset sizes reasonable for client-side handling (<1000 rows typical)
- No server round-trips for page changes
- Simpler implementation
- Works offline once data loaded

**Implementation**:
- Default: 25 rows per page
- Options: 10, 25, 50, 100, All
- Pagination controls at table top and bottom
- Export CSV includes all rows (not just current page)

**Trade-offs**:
- Initial load includes all data
- Acceptable for FSWEPP result sizes

### 14. Error Handling Best Practices

**Decision**: Status-code-specific messages with actionable guidance

**Rationale**:
- Clear user communication
- Helps users resolve issues
- Professional error UX
- Consistent across tools

**Implementation**:
- 400: Show field-specific validation errors
- 422: Parse and display validation details
- 500: Generic error with retry option
- 503: Service unavailable message
- Timeout: Suggest reducing complexity
- Network: Check connection message

**User Benefits**:
- Understand what went wrong
- Know what action to take
- Professional, non-technical language

### 15. Dark Mode Scope

**Decision**: Light mode only for MVP

**Rationale**:
- Reduces MVP complexity
- CSS infrastructure exists for future addition
- Not critical for initial release
- Can be added post-MVP without rework

**Future Implementation**:
- Theme toggle in navigation
- Cookie-based persistence
- Existing `.dark` CSS variables ready
- Charts, modals, all components supported

### 16. Mandatory Testing Requirements

**Decision**: All components and workflows require comprehensive test coverage; testing is a requirement for implementation completion

**Rationale**:
- Ensures quality and correctness from the start
- Prevents regressions during development
- Documents expected behavior through tests
- Reduces debugging time and production issues
- Enables confident refactoring
- Critical for scientific computation tools where accuracy is paramount

**Coverage Requirements**:
- Utility functions: 90% code coverage
- Component logic: 80% code coverage
- All primary user workflows: E2E test coverage
- Performance benchmarks for charts, tables, API calls
- Accessibility compliance verification

**Testing Stack**:
- Unit/Integration: Bun's built-in test runner
- E2E: Playwright for cross-browser testing
- DOM Testing: happy-dom or jsdom
- Performance: Bun benchmarking tools

**Definition of Done**:
- Component cannot be considered complete without:
  - Unit tests for isolated logic
  - Integration tests for user interactions
  - Accessibility keyboard navigation tests
  - Performance acceptable per targets
  - Tests passing in CI pipeline

**User Benefits**:
- Reliable, bug-free user experience
- Accurate scientific calculations users can trust
- Fast, responsive interface
- Accessible to all users including those with disabilities
- Consistent behavior across browsers

---

## Document Version

Version: 1.1
Date: 2026-01-24
Authors: FSWEPP2 Development Team
Status: Draft for Review

**Changelog:**
- v1.1 (2026-01-24): Added comprehensive testing requirements as mandatory implementation criteria
- v1.0 (2026-01-24): Initial specification with all design decisions documented
