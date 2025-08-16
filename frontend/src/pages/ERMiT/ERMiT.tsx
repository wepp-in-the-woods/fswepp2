import { SidebarProvider, SidebarInset} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar.tsx";
import { AppHeader } from "@/components/layout/AppHeader.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
// import {
//   Form,
//   FormControl,
//   FormDescription,
//   FormField,
//   FormItem,
//   FormLabel,
//   FormMessage,
// } from "@/components/ui/form";
// import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon.tsx";
import { Info } from "lucide-react";
import { z } from "zod";
import React from "react";

const formSchema = z.object({
  climate: z.object({
    parId: z.string(),
  }),
  ermitPars: z.object({
    topSlopePct: z.number().min(0).max(100),
    middleSlopePct: z.number().min(0).max(100),
    bottomSlopePct: z.number().min(0).max(100),
    hillslopeHorizontalLength: z.number(),
    soilTexture: z.string(),
    rockContentPct: z.number().min(0).max(100),
    vegetationType: z.string(),
    burnSeverityClass: z.string(),
  })
});

type FormFieldConfig = {
  name: keyof z.infer<typeof formSchema>;
  label: string;
  unit?: {
    SI: string;
    US: string;
  } | string;
  fieldInfo?: React.ReactNode;
}

const ERMiT = () => {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <div className="page-container">
          <div className="flex flex-row justify-between gap-3 px-4 lg:px-6 items-start">
            <img src="/ermit-icon.svg" alt="ERMiT icon" className="w-16" />
            <div className="flex w-full flex-col items-start gap-3">
              <div className="flex flex-row items-center gap-3">
                <h1 className="text-foreground">
                  Erosion Risk Management Tool (ERMiT)
                </h1>
                <Dialog>
                  <DialogTrigger asChild>
                    <Icon
                      icon={Info}
                      className="h-5 w-5 hover:cursor-pointer"
                      title="Info"
                    />
                  </DialogTrigger>
                  <DialogContent
                    className="sm:max-w-prose"
                    aria-describedby="about-rock-clime-dialog"
                  >
                    <DialogHeader>
                      <DialogTitle>About ERMiT</DialogTitle>
                    </DialogHeader>
                    <DialogDescription className="flex flex-col gap-4 text-neutral-800">
                      <span>
                        This version of ERMiT is based on the legacy
                        version of ERMiT available at <br />
                        <a
                          href="https://forest.moscowfsl.wsu.edu/cgi-bin/fswepp/ermit/ermit.pl"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline"
                        >
                          https://forest.moscowfsl.wsu.edu/cgi-bin/fswepp/ermit/ermit.pl
                        </a>
                      </span>
                      <span>
                        <strong>Citation:</strong>
                        <br />
                        Robichaud, Peter R.; Elliot, William J.; Pierson, Fredrick B.; Hall, David E.; Moffet, Corey A. 2014. Erosion Risk Management Tool (ERMiT). [Online
                        at{" "}
                        <a
                          href="https://forest.moscowfsl.wsu.edu/fswepp/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline"
                        >
                          https://forest.moscowfsl.wsu.edu/fswepp/
                        </a>
                        ].  Moscow, ID: U.S. Department of Agriculture, Forest Service, Rocky Mountain Research Station.
                      </span>
                    </DialogDescription>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-gray-700">
                ERMiT allows users to predict the probability of a given amount of sediment delivery from the base of a hillslope following variable burns on forest, rangeland, and chaparral conditions in each of five years following wildfire.
              </p>
            </div>
          </div>
          <div className="@container flex flex-col gap-4 self-center px-4 py-2 lg:gap-6 lg:px-6 lg:py-6 w-full">
            {/*Inputs*/}
            <div className="flex flex-col xl:flex-row grow w-full gap-4 max-w-xl self-center">
              {/*Climate Station input*/}

              {/*Soil Texture input*/}

              {/*Vegetation Type input*/}

              {/*Hillslope Gradient input*/}

              {/*Hillslope Length input*/}

              {/*Soil burn severity class input*/}

            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default ERMiT;