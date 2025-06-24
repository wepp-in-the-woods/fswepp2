import ToolCard from "./ToolCard";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils"
import { HTMLAttributes } from "react";

// Type definition for individual tool items
interface Tool {
  title: string;
  description: string;
  icon?: string;
  href?: string;
}

// Props interface for ToolSection component
interface ToolSectionProps extends HTMLAttributes<HTMLElement>{
  title: string;
  tools: Tool[];
  className?: string;
}

function ToolSection({ title, tools, className, ...props }: ToolSectionProps) {
  return (
    <section
      className={cn("flex w-full flex-col p-6 md:rounded-xl", className)}
      {...props}
    >
      <Accordion
        type="single"
        collapsible
        className="w-full"
        defaultValue="item-1"
      >
        <AccordionItem value="item-1" className="">
          <AccordionTrigger className="items-center p-0 hover:cursor-pointer">
            <h2 className="text-xl font-bold">{title}</h2>
          </AccordionTrigger>
          <AccordionContent className="">
            <div className="mt-4 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
              {tools.map((tool) => (
                <ToolCard
                  key={tool.title}
                  {...tool}
                  className="break-inside-avoid"
                />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}

export default ToolSection;
