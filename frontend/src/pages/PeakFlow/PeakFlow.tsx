import React from "react";
import { SidebarProvider, SidebarInset} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { Info } from "lucide-react";

const PeakFlow = () => (
  <SidebarProvider>
    <AppSidebar />
    <SidebarInset>
      <AppHeader />
      <div className="page-container">
        <div
          className="flex flex-row justify-between px-4 lg:px-6 gap-4"
        >
          <div className="flex w-full flex-col items-start gap-3">
            <div className="flex flex-row items-center gap-3">
              <h1 className="text-foreground">Forest Service Peak Flow Calculator</h1>
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
                    <DialogTitle>About Peak Flow Calculator</DialogTitle>
                  </DialogHeader>
                  <DialogDescription className="flex flex-col gap-4 text-neutral-800">

                    <span>
                        This version of Rock: Clime is based on the legacy
                        version of Peak Flow Calculator available at <br />
                        <a
                          href="https://forest.moscowfsl.wsu.edu/fswepp/ermit/peakflow/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline"
                        >
                          https://forest.moscowfsl.wsu.edu/fswepp/ermit/peakflow/
                        </a>
                      </span>
                    <span>
                        <strong>Citation:</strong>
                        <br />
                        Elliot, William J.; Hall, David E.; Robichaud, Peter R. 2010. Forest Service Peak Flow Calculator. Ver. 2015.04.05. Moscow, ID: U.S. Department of Agriculture, Forest Service, Rocky Mountain Research Station.
                        [Online at{" "}
                          <a
                            href="https://forest.moscowfsl.wsu.edu/fswepp/ermit/peakflow"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline"
                          >
                              https://forest.moscowfsl.wsu.edu/fswepp/ermit/peakflow
                            </a>
                        ].
                      </span>
                  </DialogDescription>
                </DialogContent>
              </Dialog>
            </div>
            <p className="text-gray-700">
              Estimated peak flow for burned areas using Curve Number technology
            </p>
          </div>
        </div>
      </div>
    </SidebarInset>
  </SidebarProvider>
)

export default PeakFlow;