import * as React from "react";
import { Link } from "react-router-dom";
import { useUnits } from "@/hooks/use-units";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible.tsx"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuSub,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar
} from "@/components/ui/sidebar";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";

import UnitsDialog from "@/components/shared/UnitsDialog";

import { Icon } from "@/components/ui/icon";
import {
  BookOpenText,
  Check,
  ChevronRight,
  Earth,
  ExternalLink,
  Mail,
  MonitorPlay,
  MountainSnow,
  Waves,
  type LucideIcon,
} from "lucide-react";

// Type definitions
interface NavLinkProps {
  title: string; // Optional title for the link
  label: string;
  href: string;
  isExternal?: boolean;
  className?: string;
  icon?: null | LucideIcon;
  // onClick?: () => void;
}

// Link data
const data = {
  versions: ["2.0"],
  navMain: [
    {
      title: "Hillslope and Runoff Models",
      url: "/#hillslope-models",
      icon: MountainSnow,
      items: [
        {
          title: "WEPP: Road",
          label: "WEPP: Road",
          description:
            "Predict erosion from insloped or outsloped forest roads. WEPP: Road allows users to easily describe numerous road erosion conditions.",
          href: "/wepp-road",
          isExternal: false,
        },
        {
          title: "WEPP: Road Batch",
          label: "WEPP: Road Batch",
          description:
            "Predict erosion from multiple insloped or outsloped forest roads.",
          href: "/wepp-road-batch",
          isExternal: false,
        },
        {
          title: "ERMiT",
          label: "ERMiT",
          description:
            "ERMiT allows users to predict the probability of a given amount of sediment delivery from the base of a hillslope following variable burns on forest, rangeland, and chaparral conditions in each of five years following wildfire.",
          href: "/ermit",
          isExternal: false,
        },
        {
          title: "ERMiT Batch",
          label: "ERMiT Batch",
          description:
            "Download the Batch ERMiT Interface Excel spreadsheet to run multiple ERMiT scnearios.",
          href: "/ermit-batch",
          isExternal: false,
        },
        {
          title: "Disturbed WEPP",
          label: "Disturbed WEPP",
          description:
            "Predict erosion from rangeland, forestland, and forest skid trails. Disturbed WEPP allows users to easily describe numerous disturbed forest and rangeland erosion conditions. The interface  presents the probability of a given level of erosion occurring the year following a disturbance.",
          href: "/distributed-wepp",
          isExternal: false,
        },
        {
          title: "Disturbed WEPP Batch",
          label: "Disturbed WEPP Batch",
          description:
            "Download the Batch Disturbed WEPP Interface Excel spreadsheet to run multiple Distributed WEPP scenarios.",
          href: "/distributed-wepp-batch",
          isExternal: false,
        },
        {
          title: "FuME (Fuel Management)",
          label: "FuME (Fuel Management)",
          description:
            "The FuME interface predicts soil erosion associated with fuel management practices including prescribed thinning, and a road network, and compares that prediction with erosion from wildfire.",
          href: "/fume",
          isExternal: false,
        },
        {
          title: "Rock CliMe",
          label: "Rock CliMe",
          description:
            " The Rocky Mountain Climate Generator creates a daily weather file using the ARS CLIGEN weather generator. The file is intended to be used with the WEPP Windows and GeoWEPP interfaces, but also can be a source of weather data for any application. It creates up to 200 years of simlated weather values from a database of more than 2600 weather stations and the PRISM 2.5-mile grid of precipitation data.",
          href: "/rock-clime",
          isExternal: false,
        },
      ],
    },
    {
      title: "Watershed Models",
      url: "/#watershed-models",
      icon: Waves,
      items: [
        {
          title: "WEPPcloud",
          label: "WEPPcloud",
          description: "Simulation tool that estimates hillslope soil erosion, etc.",
          href: "https://wepp.cloud/weppcloud/",
          isExternal: true,
        },
        {
          title: "QWEPP",
          label: "QWEPP",
          description:
            "Access QWEPP Manual from Rapid Response Erosion Database (RRED) website Instructions: Follow the link to RRED and click on 'Manuals' tab. Download 'QWEPP Manual for RRED,' and follow the instructions.",
          href: "https://rred.mtri.org/rred/",
          isExternal: true,
        },
        {
          //set up as a js script tool
          title: "Peak Flow Calculator",
          label: "Peak Flow Calculator",
          description:
            "Estimate peak flow for burned areas using Curve Number technology.",
          href: "/peak-flow-calculator",
          isExternal: false,
        },
      ],
    },
    {
      title: "Other Resources",
      url: "#",
      icon: Earth,
      items: [
        {
          title: "CLIGEN Weather Generator",
          label: "CLIGEN Weather Generator",
          description: "Cligen software from USDA ARS NSERL.",
          href: "https://www.ars.usda.gov/midwest-area/west-lafayette-in/national-soil-erosion-research/docs/wepp/cligen/",
          isExternal: true,
        },
        {
          title: "Legacy MFSL WEPP Interface",
          label: "Legacy MFSL WEPP Interface",
          description:
            " The Rocky Mountain Climate Generator creates a daily weather file using the ARS CLIGEN weather generator. The file is intended to be used with the WEPP Windows and GeoWEPP interfaces, but also can be a source of weather data for any application. It creates up to 200 years of simlated weather values from a database of more than 2600 weather stations and the PRISM 2.5-mile grid of precipitation data.",
          href: "https://forest.moscowfsl.wsu.edu/fswepp/",
          isExternal: true,
        },
        {
          title: "USDA ARS WEPP software",
          label: "USDA ARS WEPP software",
          description: "Downloadable WEPP software from USDA ARS NSERL.",
          href: "https://www.ars.usda.gov/midwest-area/west-lafayette-in/national-soil-erosion-research/docs/wepp/cligen/",
          isExternal: true,
        },
        {
          title: "NSERL WEPP Web Interface",
          label: "NSERL WEPP Web Interface",
          description: "Rangeland and cropland WEPP Web Interface (USDA ARS NSERL).",
          href: "https://milford.nserl.purdue.edu/wepp/weppV1.html",
          isExternal: true,
        },
        {
          title: "PRISM",
          label: "PRISM",
          description:
            "Spatial climate analysis service and weather databse by Northwest Alliance for Computational Science & Engineering (NACSE) and Oregon State University.",
          href: "https://prism.oregonstate.edu/",
          isExternal: true,
        },
      ],
    },
  ],
  navExtra: [
    {
      title: "Documentation",
      label: "Documentation",
      href: "/documentation",
      isExternal: false,
      icon: BookOpenText
    },
    {
      title: "Contact Us",
      label: "Contact Us",
      href: "/contact-us",
      isExternal: false,
      icon: Mail
    },
    {
      title: "Tutorials",
      label: "Tutorials",
      href: "https://www.youtube.com/@fswepp4700/playlists",
      isExternal: true,
      icon: MonitorPlay
    }
  ],
}

function NavLink({
  href,
  label,
  isExternal = false,
  className = "",
  icon = null,
}: NavLinkProps) {
  const Component = isExternal ? 'a' : Link;
  const props = isExternal
    ? { href, target: "_blank", rel: "noopener noreferrer" }
    : { to: href };

  return (
    <Component
      {...props as any}
      className={`${className} flex flex-row items-center gap-2 text-lg flex-nowrap`}
    >
      {icon && <Icon icon={icon} className="size-5! shrink-0"/>}
      <span>{label}</span>
      {isExternal && <Icon icon={ExternalLink} className="ml-1 h-3.5 w-3.5" />}
    </Component>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state, isMobile } = useSidebar();
  const {units, setUnits} = useUnits();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a
                href="/"
                className="flex items-center transition-all duration-300 ease-in-out lg:h-full"
              >
                <img
                  src={
                    state === "collapsed" && !isMobile
                      ? "/fswepp-icon.png"
                      : "/fswepp-logo.png"
                  }
                  alt="FSWEPP Logo"
                  className={`h-10 w-fit object-contain transition-all duration-300 ease-in-out`}
                />
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="transition-all duration-300 ease-in-out">
        <SidebarGroup>
          <SidebarMenu>
            {data.navMain.map((item) => (
              <Collapsible
                key={item.title}
                title={item.title}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.title}
                      className="transition-all duration-200 ease-in-out [&>svg]:size-5 [&>svg]:shrink-0"
                    >
                      {item.icon && (
                        <item.icon className="transition-transform duration-200 ease-in-out" />
                      )}
                      <span className="text-lg transition-opacity duration-200 ease-in-out">
                        {item.title}
                      </span>
                      <ChevronRight className="ml-auto transition-transform duration-200 ease-in-out group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenuSub className="gap-2">
                        {item.items?.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton size="lg" asChild>
                              <NavLink className="text-md" {...subItem} />
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        {/*  */}
        <SidebarGroup>
          <SidebarMenu>
            {data.navExtra.map((item) => (
              <SidebarMenuItem key={item.title} title={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  className="transition-all duration-200 ease-in-out"
                >
                  <NavLink {...item} />
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      {/* Info about unit of measurement used/ version*/}
      {/* Settings button */}
      <SidebarFooter className="flex flex-row items-center justify-between">
        <SidebarMenu>
          <SidebarMenuItem>
            {state === "collapsed" && !isMobile ? (
              <div className="color-foreground flex h-full w-full items-center justify-center py-1 text-sm font-bold">
                {units === "metric" ? (
                  <span className="">
                    m<br />
                    kg
                  </span>
                ) : (
                  <span className="">
                    ft
                    <br />
                    lb
                  </span>
                )}
              </div>
            ) : (
              <div className="flex flex-row items-center justify-between gap-1">
                <ButtonGroup className="flex w-full items-center rounded-4xl bg-gray-100 p-1">
                  <Button
                    variant={units === "metric" ? "outline" : "secondary"}
                    className={`hover:bg-background grow rounded-tl-4xl rounded-bl-4xl`}
                    onClick={() => {
                      if (units === "imperial") {
                        setUnits("metric");
                        console.log("Units set to metric");
                      }

                      localStorage.setItem("units", "metric");
                      window.dispatchEvent(new Event("unitsChanged"));
                    }}
                  >
                    {units === "metric" && (
                      <Icon icon={Check} className="mr-1 size-5" />
                    )}
                    Metric
                  </Button>
                  <Button
                    variant={units === "imperial" ? "outline" : "secondary"}
                    className={`hover:bg-background grow rounded-tr-4xl rounded-br-4xl`}
                    onClick={() => {
                      if (units === "metric") {
                        setUnits("imperial");
                        // change button variant to outline
                        console.log("Units set to imperial");
                      }
                      localStorage.setItem("units", "imperial");
                      window.dispatchEvent(new Event("unitsChanged"));
                    }}
                  >
                    {units === "imperial" && (
                      <Icon icon={Check} className="mr-1 size-5" />
                    )}
                    US Customary
                  </Button>
                </ButtonGroup>
              </div>
            )}
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={"Units Settings"}
              className="transition-all duration-200 ease-in-out hover:cursor-pointer"
            >
              <UnitsDialog />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
