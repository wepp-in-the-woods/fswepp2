/**
 * Publications
 *
 * A page to view all publications from Moscow Forestry Sciences Laboratory.
 *
 */

import { createFormField, createMultiSelectField } from "../components/form-field.js";
import { createCollapsibleSection } from "../components/collapsible.js";
import { createButton } from "../components/button.js";
import { createElement, Funnel, RotateCcw, Copy } from 'lucide';
import { createDataTable } from "../components/data-table.js";

// Sample reference data
const publications = [
    {
        "id": "2025a",
        "title": "Evaluating Polymeric Additives for Post‑Wildfire Erosion Reduction with Indoor Rainfall Simulation.",
        "year": "2025",
        "authors": "Robichaud",
        "citation": "Ahmed A., Robichaud P.R., Hohner A.K., Akin I.D. 2025.\n <i><a>Evaluating Polymeric Additives for Post‑Wildfire Erosion Reduction with Indoor Rainfall Simulation.</a></i>\n <b>Geotech Geol Eng (2025).</b> 43, 104 DOI: 10.1007/s10706-025-03070-w.",
        "category": "",
        "publisher": "Springer",
        "abstract": "Critically burnt slopes are treated after a\nwildfire to reduce erosion and the impacts of eroded\nsoil and ash on downstream water quality. Conventional\npost-wildfire erosion mitigation methods\nincluding mulch, barrier, and seeding treatments have\nsome drawbacks that may result in low efficiency.\nPolymeric materials, xanthan gum (XG) and polyacrylamide\n(PAM), are shown to be effective alternatives\nto the conventional methods in controlling postwildfire\nerosion of bare soil. This study evaluates\nthe use of XG and PAM for controlling post-wildfire\nerosion when the soil surface is covered with hydrophilic\nash, which is a common scenario after wildfires\nin moderate to high soil burn severity regions.\nIndoor rainfall simulation experiments are performed with soil and ash samples collected after the 2021\nGreen Ridge Wildfire near Walla Walla, WA to determine\nthe effects of three concentrations (11, 33, and\n60 kg/ha) of XG and PAM on infiltration, runoff, and\nsediment loss in ash-covered soil plots during three\nwet-dry cycles. Results show that XG and PAM treatments\nreduce the total sediment loss by up to 68%\n(XG) and 87% (PAM) during three wetting events\nfor the study soil and ash. Both XG and PAM induce\npartial surface sealing, which results in higher runoff.\nHowever, with subsequent wettings, surface sealing\nreduces due to redistribution of XG and PAM.\nThe results are explained through the distribution of\nwater along plot depth, scanning electron microscope\nimages, and binding of ash and additives.",
        "keywords": "Green Ridge Fire, erosion control, xanthan gum, Polyacrylamide, rainfall simulation",
        "type": "",
        "treesearch": "",
        "plynx": "",
        "links": ""
    },
    {
        "id": "2024c",
        "title": "Informing Sustainable Forest Management: Remote Sensing Strategies for Assessing Soil Disturbance after: Wildfire and Salvage Logging.",
        "year": "2024",
        "authors": "Lewis, Robichaud, Hudak",
        "citation": "Lewis S.A., Robichaud P.R., Archer V.A., Hudak A.T., Eitel J.U.H., Strand E.K. 2024.\n <i><a>Informing Sustainable Forest Management: Remote Sensing Strategies for Assessing Soil Disturbance after: Wildfire and Salvage Logging.</a></i>\n <b>Forests (2024).</b> 14, 2218 DOI: 10.3390/f14112218.",
        "category": "",
        "publisher": "MDPI",
        "abstract": "Wildfires have nearly become a guaranteed annual event in most western National Forests. Severe fire effects can be mitigated with a goal of minimizing the hydrologic response and promoting soil and vegetation recovery towards the pre-disturbance condition. Sometimes, post-fire actions include salvage logging to recover timber value and to remove excess fuels. Salvage logging was conducted after three large wildfires on the Lolo National Forest in Montana, USA, between 2017 and 2019. We evaluated detrimental soil disturbance (DSD) on seven units that were burned at low, moderate, and high soil burn severity in 2022, three to five years after the logging occurred. We found a range of exposed soil of 5%–25% and DSD from 3% to 20%, and these values were significantly correlated at r = 0.88. Very-high-resolutionWorldView-2 imagery that coincided with the field campaign was used to calculate Normal Differenced Vegetation Index (NDVI) across the salvaged areas; we found that NDVI values were significantly correlated to DSD at r = 0.87. We were able to further examine this relationship and determined NDVI threshold values that corresponded to high-DSD areas, as well as develop a model to estimate the contributions of equipment type, seasonality, topography, and burn severity to DSD. A decision-making tool which combines these factors and NDVI is presented to support land managers in planning, evaluating, and monitoring disturbance from post-fire salvage logging.",
        "keywords": "salvage logging; soil burn severity; WorldView; NDVI; detrimental soil disturbance; Montana",
        "type": "",
        "treesearch": "",
        "plynx": "",
        "links": ""
    },
    {
        "id": "2024b",
        "title": "Runoff And Erosion Following A Prescribed Fire On A Sagebrush-Steppe Rangeland In Idaho, Usa.",
        "year": "2024",
        "authors": "Elliot",
        "citation": "Elliot W.J. 2024\n <i><a>Runoff And Erosion Following A Prescribed Fire On A Sagebrush-Steppe Rangeland In Idaho, USA.</a></i>\n <b>ASABE (2024).</b> 67(6), 1481-1498 DOI: 10.13031/ja.15738.",
        "category": "",
        "publisher": "American Society of Agricultural and Biological Engineers",
        "abstract": "A study was carried out to compare runoff and erosion from natural rainfall on plots that had been treated with prescribed fire to unburned plots on a sagebrush-steppe rangeland in Southeast Idaho, U.S. Prescribed fire on rangeland sites is intended to maintain healthy shrub-steppe ecosystems but sometimes results in undesirable consequences such as increased runoff and soil erosion. Information is lacking on plot-scale erosion studies from natural precipitation in this ecosystem. Such plot-scale studies are needed to better understand sediment sources (uplands or channels) to support the management and modeling of rangeland watersheds. In this study, there were two treatments: four prescribed burn plots and three adjacent unburned control plots. Runoff and erosion were measured from natural rainfall for water years (WY) 2004 to 2010 following a prescribed burn in October 2003. Runoff and erosion were also measured from nearby unburned plots for WY 2005–2010. Ground cover on the burned plots averaged 57% (standard error (s.e. = 4%) in the summer of 2004, compared to 95% (s.e. = 5%) on the unburned plots. By the end of the study in 2010, ground cover had increased to 81% (s.e. = 4%) on the burned plots but decreased to 74% (s.e. = 5%) on the unburned plots. Annual runoff averaged 6 mm (s.e. = 7) from four burned plots, compared to 34 mm (s.e. = 8.7) from three unburned plots. In WY 2006, high rates of runoff from snowmelt on the unburned plots resulted in 122 mm (s.e. = 16) of runoff compared to only 12 mm (s.e. = 14) of runoff from the burned plots. An analysis of variance showed significant differences in runoff due to either precipitation (p = 0002) or year (p = 0.004) and treatment (burned vs. unburned; p=0.03). There were also significant differences in seasonal runoff (p = 0.05), as 90% of the measured runoff occurred in the spring, with all large runoff events associated with snowmelt. Erosion on the burned plots averaged 233 kg ha-1 (s.e. = 21) compared to 133 kg ha-1 (s.e. = 29) on the unburned plots. From two years after the burn and for the remainder of the study, there were no significant differences in erosion between burned and unburned plots (p < 0.05). Future studies are needed to link upland runoff and erosion with channel deposition, erosion, and sediment delivery, and more detailed studies on erosion associated with snowmelt on rangelands are needed to aid in the development of watershed modeling tools. Future studies should include observations of plant community regeneration in addition to ground cover, runoff, and sediment delivery.",
        "keywords": "Soil Erosion, Hydrology, Prescribed fire, Rangelands, Idaho",
        "type": "",
        "treesearch": "",
        "plynx": "",
        "links": ""
    },
]

export function mountPublications(root) {
    if (!root) return;

    // Filter states
    const filterState = {
        authors: [],
        years: [],
        keywords: [],
    }

    root.innerHTML = "";
    const container = document.createElement("div");
    container.className = "space-y-8";

    // ===== FORM SECTION =====
    const form = document.createElement("form");
    form.className = "space-y-6";
    form.addEventListener("submit", (event) => event.preventDefault());

    const filterSectionContent = document.createElement("div");
    filterSectionContent.className = "grid grid-flow-row grid-cols-1 lg:grid-cols-3 gap-4";

    const authorField = createMultiSelectField({
        id: "author-filter",
        label: "Author",
        required: false,
        placeholder: "Any author",
        options: [
            { value: "Brooks", label: "Erin Brooks" },
            { value: "Brown", label: "Bob Brown" },
            { value: "Burroughs", label: "Ed Burroughs" },
            { value: "Dobre", label: "Mariana Dobre" },
            { value: "Elliot", label: "Bill Elliot" },
            { value: "Foltz", label: "Randy Foltz" },
            { value: "Glaza", label: "Brandon Glaza" },
            { value: "Hall", label: "David Hall" },
            { value: "Hudak", label: "Andy Hudak" },
            { value: "Koler", label: "Tom Koler" },
            { value: "Kopyscianski", label: "Ben Kopyscianski" },
            { value: "Lew", label: "Roger Lew" },
            { value: "Lewis", label: "Sarah Lewis" },
            { value: "Luce", label: "Charlie Luce" },
            { value: "Miller", label: "Ina Sue Miller" },
            { value: "Pannkuk", label: "Chris Pannkuk" },
            { value: "Robichaud", label: "Pete Robichaud" },
            { value: "Srivastava", label: "Anurag Srivastava" },
            { value: "Wagenbrenner", label: "Joe Wagenbrenner" },
            { value: "CopelandWagenbrenner", label: "Natalie Copeland Wagenbrenner" },
        ],
        help: "",
        onChange: (selected) => {
            filterState.authors = selected;
        },
    });

    const yearField = createMultiSelectField({
        id: "year-filter",
        label: "Year",
        required: false,
        placeholder: "Any year",
        options: [
            ...Array.from({ length: (2025 - 1977 + 1) }, (_, i) => {
                const year = 2025 - i;
                return { value: String(year), label: String(year) };
            }),
        ],
        help: "",
        onChange: (selected) => {
            filterState.years = selected;
        },
    });

    const keywordField = createMultiSelectField({
        id: "keyword-filter",
        label: "Keyword",
        required: false,
        placeholder: "Any keyword",
        options: [
            { value: "2005 School Fire", label: "2005 School Fire" },
            { value: "2006 Tripod Fire", label: "2006 Tripod Fire" },
            { value: "2019 Museum Fire", label: "2019 Museum Fire" },
            { value: "Aggregate", label: "Aggregate" },
            { value: "Air Quality", label: "Air Quality" },
            { value: "Alaska", label: "Alaska" },
            { value: "Arizona", label: "Arizona" },
            { value: "Ash", label: "Ash" },
            { value: "Australian Bushfires", label: "Australian Bushfires" },
            { value: "Baer Treatments", label: "Baer Treatments" },
            { value: "BAER", label: "BAER" },
            { value: "BARC", label: "BARC" },
            { value: "Biomass", label: "Biomass" },
            { value: "British Columbia", label: "British Columbia" },
            { value: "Burn Severity Mapping", label: "Burn Severity Mapping" },
            { value: "Burn Severity", label: "Burn Severity" },
            { value: "Burned Area Emergency Response", label: "Burned Area Emergency Response" },
            { value: "California", label: "California" },
            { value: "Char", label: "Char" },
            { value: "CLIGEN", label: "CLIGEN" },
            { value: "Climate Change", label: "Climate Change" },
            { value: "Climate Generation", label: "Climate Generation" },
            { value: "Climate", label: "Climate" },
            { value: "Colorado", label: "Colorado" },
            { value: "Contour-Felled Logs", label: "Contour-Felled Logs" },
            { value: "Critical Shear", label: "Critical Shear" },
            { value: "Debris Flow", label: "Debris Flow" },
            { value: "Decision-Support Tools", label: "Decision-Support Tools" },
            { value: "DEM", label: "DEM" },
            { value: "Disturbed WEPP", label: "Disturbed WEPP" },
            { value: "DMM600", label: "DMM600" },
            { value: "dNBR", label: "dNBR" },
            { value: "Duff", label: "Duff" },
            { value: "Drinking Water", label: "Drinking Water" },
            { value: "Duff Moisture Meter", label: "Duff Moisture Meter" },
            { value: "ERMiT", label: "ERMiT" },
            { value: "Erodibility", label: "Erodibility" },
            { value: "Erosion Barrier", label: "Erosion Barrier" },
            { value: "Erosion Control", label: "Erosion Control" },
            { value: "Erosion Mitigation", label: "Erosion Mitigation" },
            { value: "Erosion Modeling", label: "Erosion Modeling" },
            { value: "Erosion Prediction", label: "Erosion Prediction" },
            { value: "Erosion Risk", label: "Erosion Risk" },
            { value: "Evapotranspiration", label: "Evapotranspiration" },
            { value: "Filter windrow", label: "Filter windrow" },
            { value: "Fire Effects", label: "Fire Effects" },
            { value: "Fire Severity", label: "Fire Severity" },
            { value: "Forest Roads", label: "Forest Roads" },
            { value: "Forest Watershed", label: "Forest Watershed" },
            { value: "FS WEPP", label: "FS WEPP" },
            { value: "Fuel Management", label: "Fuel Management" },
            { value: "FuME", label: "FuME" },
            { value: "Geographic Information System", label: "Geographic Information System" },
            { value: "GeoWEPP", label: "GeoWEPP" },
            { value: "GIS", label: "GIS" },
            { value: "Ground Cover", label: "Ground Cover" },
            { value: "Hayman Fire", label: "Hayman Fire" },
            { value: "Hillslope Erosion", label: "Hillslope Erosion" },
            { value: "Human Impacts", label: "Human Impacts" },
            { value: "Hydraulic Conductivity", label: "Hydraulic Conductivity" },
            { value: "Hydrologic Modeling", label: "Hydrologic Modeling" },
            { value: "Hydrologic Response", label: "Hydrologic Response" },
            { value: "Hydrology", label: "Hydrology" },
            { value: "Hydromulch", label: "Hydromulch" },
            { value: "Hydrophobicity", label: "Hydrophobicity" },
            { value: "Hyperspectral", label: "Hyperspectral" },
            { value: "Idaho", label: "Idaho" },
            { value: "Infiltration", label: "Infiltration" },
            { value: "Interrill", label: "Interrill" },
            { value: "Landsat", label: "Landsat" },
            { value: "Landslide", label: "Landslide" },
            { value: "LEB", label: "LEB" },
            { value: "LiDAR", label: "LiDAR" },
            { value: "LISA", label: "LISA" },
            { value: "Mapping", label: "Mapping" },
            { value: "Mitigation", label: "Mitigation" },
            { value: "Modeling", label: "Modeling" },
            { value: "Montana", label: "Montana" },
            { value: "Mulch", label: "Mulch" },
            { value: "Mulching", label: "Mulching" },
            { value: "Multivariate Models", label: "Multivariate Models" },
            { value: "Native Seed", label: "Native Seed" },
            { value: "NDVI", label: "NDVI" },
            { value: "Needle Cast", label: "Needle Cast" },
            { value: "Nevada", label: "Nevada" },
            { value: "Nitrogen", label: "Nitrogen" },
            { value: "Normalized Burn Ratio", label: "Normalized Burn Ratio" },
            { value: "Northern Rocky Mountains", label: "Northern Rocky Mountains" },
            { value: "Nutrient Loss", label: "Nutrient Loss" },
            { value: "Oregon", label: "Oregon" },
            { value: "Overland Flow", label: "Overland Flow" },
            { value: "Pacific NW", label: "Pacific NW" },
            { value: "Paired Watersheds", label: "Paired Watersheds" },
            { value: "PM10", label: "PM10" },
            { value: "Post-fire Assessment", label: "Post-fire Assessment" },
            { value: "Post-fire Effects", label: "Post-fire Effects" },
            { value: "Post-fire Erosion", label: "Post-fire Erosion" },
            { value: "Post-fire Rehabilitation", label: "Post-fire Rehabilitation" },
            { value: "Post-fire", label: "Post-fire" },
            { value: "Prescribed Fire", label: "Prescribed Fire" },
            { value: "PRISM", label: "PRISM" },
            { value: "Probabilistic", label: "Probabilistic" },
            { value: "Quickbird", label: "Quickbird" },
            { value: "Rainfall Simulation", label: "Rainfall Simulation" },
            { value: "Rangelands", label: "Rangelands" },
            { value: "Rapid Response Research", label: "Rapid Response Research" },
            { value: "Remote Sensing", label: "Remote Sensing" },
            { value: "Residue", label: "Residue" },
            { value: "Restoration", label: "Restoration" },
            { value: "Rill Erosion", label: "Rill Erosion" },
            { value: "Risk Analysis", label: "Risk Analysis" },
            { value: "Road Erosion", label: "Road Erosion" },
            { value: "Road Obliteration", label: "Road Obliteration" },
            { value: "Road", label: "Road" },
            { value: "Root disease", label: "Root disease" },
            { value: "Runoff", label: "Runoff" },
            { value: "Sagebrush", label: "Sagebrush" },
            { value: "Salvage Logging", label: "Salvage Logging" },
            { value: "Sediment Transport", label: "Sediment Transport" },
            { value: "Sediment Yield", label: "Sediment Yield" },
            { value: "Sedimentation", label: "Sedimentation" },
            { value: "Seeding", label: "Seeding" },
            { value: "Shear Stress", label: "Shear Stress" },
            { value: "Silt Fence", label: "Silt Fence" },
            { value: "Slope Stability", label: "Slope Stability" },
            { value: "Soil Burn Severity", label: "Soil Burn Severity" },
            { value: "Soil Erosion", label: "Soil Erosion" },
            { value: "Soil Heating", label: "Soil Heating" },
            { value: "Soil Water Repellency", label: "Soil Water Repellency" },
            { value: "South Dakota", label: "South Dakota" },
            { value: "Southeastern US", label: "Southeastern US" },
            { value: "Species Diversity", label: "Species Diversity" },
            { value: "Spectral Mixture Analysis", label: "Spectral Mixture Analysis" },
            { value: "Straw Mulch", label: "Straw Mulch" },
            { value: "Subsurface Lateral Flow", label: "Subsurface Lateral Flow" },
            { value: "Surface Runoff", label: "Surface Runoff" },
            { value: "Surficial Processes", label: "Surficial Processes" },
            { value: "Timber Harvest", label: "Timber Harvest" },
            { value: "Tire Pressure", label: "Tire Pressure" },
            { value: "TMDL", label: "TMDL" },
            { value: "Uganda", label: "Uganda" },
            { value: "Utah", label: "Utah" },
            { value: "Values-At-Risk", label: "Values-At-Risk" },
            { value: "Washington State", label: "Washington State" },
            { value: "Water Quality", label: "Water Quality" },
            { value: "Water Repellency", label: "Water Repellency" },
            { value: "Water Repellent Soil", label: "Water Repellent Soil" },
            { value: "Watershed Management", label: "Watershed Management" },
            { value: "WEPP", label: "WEPP" },
            { value: "WEPP:Road", label: "WEPP:Road" },
            { value: "WEPPcloud", label: "WEPPcloud" },
            { value: "Western US", label: "Western US" },
            { value: "Wildfire Effects", label: "Wildfire Effects" },
            { value: "Wind Erosion", label: "Wind Erosion" },
            { value: "Wood Mulch", label: "Wood Mulch" },
            { value: "Wood Shreds", label: "Wood Shreds" },
            { value: "Wood Strands", label: "Wood Strands" },
            { value: "Worldview", label: "Worldview" },
            { value: "XDRAIN", label: "XDRAIN" },
            { value: "XSTABL", label: "XSTABL" }
        ],
        help: "",
        onChange: (selected) => {
            filterState.keywords = selected;
        },
    });

    const buttonGroup = document.createElement("div");
    buttonGroup.className = "flex flex-col lg:flex-row items-stretch lg:items-center lg:justify-end lg:col-span-3 gap-2";

    const filterIcon = createElement(Funnel);
    const applyFiltersButton = createButton("Apply Filters", "default", {
        onClick: () => {
            applyFilters();
        },
    }, filterIcon);

    const resetIcon = createElement(RotateCcw);
    const resetFiltersButton = createButton("Reset Filters", "outline", {
        onClick: () => {
            filterState.authors = [];
            filterState.years = [];
            filterState.keywords = [];
            form.reset();
            applyFilters();
        },
    }, resetIcon);

    buttonGroup.appendChild(applyFiltersButton);
    buttonGroup.appendChild(resetFiltersButton);

    filterSectionContent.appendChild(authorField.wrapper);
    filterSectionContent.appendChild(yearField.wrapper);
    filterSectionContent.appendChild(keywordField.wrapper);
    filterSectionContent.appendChild(buttonGroup);

    const filterSection = createCollapsibleSection({
        id: "filters-section",
        title: "Filters",
        description: "",
        content: filterSectionContent,
        persistKey: "publications_filters_open",
        defaultOpen: false,
    });

    form.appendChild(filterSection)

    // Table section
    const publicationListSection = document.createElement("div");
    publicationListSection.className = "flex flex-col gap-2";

    const totalPublicationsInfo = document.createElement("h2");
    totalPublicationsInfo.className = "text-bold text-lg";
    totalPublicationsInfo.textContent = "Showing {n} publications";

    const publicationsTableSection = document.createElement("div");
    publicationsTableSection.className = "flex flex-col gap-2";

    let filteredPublications = [...publications];

    // TODO: Add copy citation button to each row and export citation list as a table action

    // TODO: Add a search field for title

    // Helper function to apply filters
    function applyFilters() {
        filteredPublications = publications.filter(publication => {
            console.log("Applying filters:", filterState);
            // Author filter
            if (filterState.authors.length > 0 && !filterState.authors.some(author => publication.authors.includes(author))) {
                return false;
            }

            // Year filter
            if (filterState.years.length > 0 && !filterState.years.includes(publication.year)) {
                return false;
            }

            // Keyword filter
            return !(filterState.keywords.length > 0 && !filterState.keywords.some(keyword => publication.keywords.includes(keyword.toLowerCase())));
        });
        console.log("Filtered publications:", filteredPublications);
        // Update table and UI
        updatePublicationsTable();
        updateTotalPublicationsInfo();
    }

    function updateTotalPublicationsInfo() {
        totalPublicationsInfo.textContent = `Showing ${filteredPublications.length} publications`;
    }

    // Helper function to render a publication list item
    function updatePublicationsTable() {
        // Remove the old table
        publicationsTableSection.innerHTML = "";

        const newTable = createDataTable({
            columns: [
                { key: "authors", label: "Author/s" },
                { key: "year", label: "Year" },
                { key: "title", label: "Title" },
                { key: "publisher", label: "Publisher" },
                { key: "keywords", label: "Keywords" },
                { key: "row_action", label: "Actions" },
            ],
            rows: filteredPublications.map(({
                id,
                authors,
                year,
                title,
                publisher,
                keywords,
            }) => ({
                authors,
                year,
                title: `<a href="#${id}" class="text-blue-900 underline">${title}</a>`,
                publisher,
                keywords,
                row_action: "",
            }))
        });

        publicationsTableSection.appendChild(newTable);

        // Post-process table cells to render HTML in row_action column
        const tbody = newTable.querySelector("tbody");
        if (tbody) {
            tbody.querySelectorAll("tr").forEach((tr, rowIndex) => {
                const cells = tr.querySelectorAll("td");
                const titleCell = cells[2];
                const publication = filteredPublications[rowIndex];

                if (titleCell && publication) {
                    titleCell.innerHTML = `<a href="#${publication.id}" class="text-blue-900 underline">${publication.title}</a>`;
                }

                const actionCell = cells[cells.length - 1];
                if (actionCell && publication) {
                    const button = createButton("Copy citation", "outline", {
                        onClick: () => {
                            navigator.clipboard.writeText(publication.citation);
                        },
                    }, createElement(Copy));
                    actionCell.innerHTML = "";
                    actionCell.appendChild(button);
                }
            });
        }

        // Re-apply data-contrast-id attributes
        newTable.querySelectorAll("th").forEach((th, index) => {
            th.setAttribute("data-contrast-id", `table-header-${index + 1}`);
        });
        newTable
            .querySelector('button[type="button"]')
            ?.setAttribute("data-contrast-id", "table-export");
        newTable
            .querySelector("summary")
            ?.setAttribute("data-contrast-id", "table-columns-toggle");
        newTable
            .querySelector("select")
            ?.setAttribute("data-contrast-id", "table-page-size");
        newTable
            .querySelector('input[type="number"]')
            ?.setAttribute("data-contrast-id", "table-page-jump");
    }

    applyFilters();

    container.appendChild(form);

    container.appendChild(publicationsTableSection);

    root.appendChild(container);
}
