import { cn } from "@/lib/utils"; // Shadcn's utility function
import { LucideIcon } from "lucide-react";
import { HTMLAttributes } from "react";

interface IconProps extends HTMLAttributes<SVGElement> {
  icon: LucideIcon;
  className?: string;
}

export function Icon({ icon: IconComponent, className, ...props }: IconProps) {
  return <IconComponent className={cn("h-5 w-5", className)} {...props} />;
}

