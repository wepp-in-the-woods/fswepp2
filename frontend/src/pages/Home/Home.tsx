import React from "react";
import { SidebarProvider, SidebarInset} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import ToolSection from "@/components/shared/ToolSection";
import { ExternalLink } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { hillslopeModels, watershedModels } from "@/data/models";

export const Home: React.FC = () => (
  <SidebarProvider>
    <AppSidebar />
    <SidebarInset>
      <AppHeader />
      <div className="page-container">
        <div className="flex w-full flex-col justify-between gap-3 p-6 align-middle xl:flex-row">
          <p className="text-foreground">
            The <strong>Water Erosion Prediction Project (WEPP)</strong> is a
            process based model that predicts soil erosion.
          </p>
          <a
            href="https://www.nrcs.usda.gov/resources/tech-tools/water-erosion-prediction-project"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-600 hover:underline"
          >
            Learn more
            <Icon icon={ExternalLink} className="h-3.5 w-3.5" />
          </a>
        </div>
        <ToolSection
          id="hillslope-models"
          title="Hillslope Scale Erosion and Runoff Prediction"
          tools={hillslopeModels}
          className="mb-6 bg-green-50 text-green-900"
        />
        <ToolSection
          id="watershed-models"
          title="Watershed Prediction"
          tools={watershedModels}
          className="mb-6 bg-blue-50 text-blue-900"
        />
      </div>
    </SidebarInset>
  </SidebarProvider>
);