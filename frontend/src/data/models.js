const hillslopeModels = [
  {
    title: "WEPP: Road",
    label: "WEPP: Road",
    description:
      "Predict erosion from insloped or outsloped forest roads. WEPP: Road allows users to easily describe numerous road erosion conditions.",
    icon: "wepp-road-icon.svg",
    href: "/wepp-road",
    isExternal: false,
  },
  {
    title: "WEPP: Road Batch",
    label: "WEPP: Road Batch",
    description:
      "Predict erosion from multiple insloped or outsloped forest roads.",
    icon: "wepp-road-batch-icon.svg",
    href: "/wepp-road-batch",
    isExternal: false,
  },
  {
    title: "ERMiT",
    label: "ERMiT",
    description:
      "ERMiT allows users to predict the probability of a given amount of sediment delivery from the base of a hillslope following variable burns on forest, rangeland, and chaparral conditions in each of five years following wildfire.",
    icon: "/ermit-icon.svg",
    href: "/ermit",
    isExternal: false,
  },
  {
    title: "ERMiT Batch",
    label: "ERMiT Batch",
    description:
      "Download the Batch ERMiT Interface Excel spreadsheet to run multiple ERMiT scnearios.",
    icon: "/ermit-batch-icon.svg",
    href: "/ermit-batch",
    isExternal: false,
  },
  {
    title: "Disturbed WEPP",
    label: "Disturbed WEPP",
    description:
      "Predict erosion from rangeland, forestland, and forest skid trails. Disturbed WEPP allows users to easily describe numerous disturbed forest and rangeland erosion conditions. The interface  presents the probability of a given level of erosion occurring the year following a disturbance.",
    icon: "/placeholder-model-icon.svg",
    href: "/distributed-wepp",
    isExternal: false,
  },
  {
    title: "Disturbed WEPP Batch",
    label: "Disturbed WEPP Batch",
    description:
      "Download the Batch Disturbed WEPP Interface Excel spreadsheet to run multiple Distributed WEPP scenarios.",
    icon: "/placeholder-model-icon.svg",
    href: "/distributed-wepp-batch",
    isExternal: false,
  },
  {
    title: "FuME (Fuel Management)",
    label: "FuME (Fuel Management)",
    description:
      "The FuME interface predicts soil erosion associated with fuel management practices including prescribed thinning, and a road network, and compares that prediction with erosion from wildfire.",
    icon: "/placeholder-model-icon.svg",
    href: "/fume",
    isExternal: false,
  },
  {
    title: "Rock CliMe",
    label: "Rock CliMe",
    description:
      " The Rocky Mountain Climate Generator creates a daily weather file using the ARS CLIGEN weather generator. The file is intended to be used with the WEPP Windows and GeoWEPP interfaces, but also can be a source of weather data for any application. It creates up to 200 years of simlated weather values from a database of more than 2600 weather stations and the PRISM 2.5-mile grid of precipitation data.",
    icon: "rockclime-icon.svg",
    href: "/rock-clime",
    isExternal: false,
  },
];

const watershedModels = [
  // {
  //   title: "Tahoe Basin Sediment Model",
  //   label: "Tahoe Basin Sediment Model",
  //   description:
  //     "The Tahoe Basin Sediment Model is an offshoot of Disturbed WEPP customized for the Lake Tahoe Basin.",
  //   icon: "/placeholder-model-icon.svg",
  //   href: "/tahoe-model",
  //   isExternal: false,
  // },
  // {
  //   title: "Lake Tahoe WEPP Watershed GIS Interface",
  //   label: "Lake Tahoe WEPP Watershed GIS Interface",
  //   description: "View the interface on WEPPcloud.",
  //   icon: "/placeholder-model-icon.svg",
  //   href: "https://wepp.cloud/weppcloud/#lt",
  //   isExternal: true,
  // },
  {
    title: "WEPPcloud",
    label: "WEPPcloud",
    description: "Simulation tool that estimates hillslope soil erosion, etc.",
    icon: "/placeholder-model-icon.svg",
    href: "https://wepp.cloud/weppcloud/",
    isExternal: true,
  },
  // {
  //   title: "WEPPcloud Postfire Erosion Prediction (PEP)",
  //   label: "WEPPcloud Postfire Erosion Prediction (PEP)",
  //   description:
  //     "A computer simulation tool that estimates soil erosion following an actual or simulated wildfire from soil burn severity maps.",
  //   icon: "/placeholder-model-icon.svg",
  //   href: "https://wepp.cloud/weppcloud/#pep",
  //   isExternal: true,
  // },
  {
    title: "QWEPP",
    label: "QWEPP",
    description:
      "Access QWEPP Manual from Rapid Response Erosion Database (RRED) website Instructions: Follow the link to RRED and click on 'Manuals' tab. Download 'QWEPP Manual for RRED,' and follow the instructions.",
    icon: "/placeholder-model-icon.svg",
    href: "https://rred.mtri.org/rred/",
    isExternal: true,
  },
  {
    //set up as a js script tool
    title: "Peak Flow Calculator",
    label: "Peak Flow Calculator",
    description:
      "Estimate peak flow for burned areas using Curve Number technology.",
    icon: "/peak-flow-icon.svg",
    href: "/peak-flow-calculator",
    isExternal: false,
  },
];

export { hillslopeModels, watershedModels };
