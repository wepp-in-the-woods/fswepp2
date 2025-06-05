import { cn } from "@/lib/utils"; // Shadcn's utility function

export function Icon({ icon: IconComponent, className, ...props }) {
  return <IconComponent className={cn("h-5 w-5", className)} {...props} />;
}
