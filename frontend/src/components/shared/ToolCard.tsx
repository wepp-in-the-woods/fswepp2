import { Card, CardContent, CardHeader } from "@/components/ui/card.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { ExternalLink } from "lucide-react";
// import { HTMLAttributes } from "react";

// Type definition
interface ToolCardProps {
  title: string;
  description: string;
  icon?: string;
  href?: string;
  className?: string;
}

function ToolCard({ title, description, icon, href }: ToolCardProps) {
  const isExternal = href?.startsWith("http") || href?.includes("http");

  const content = (
    <Card className="flex h-full w-full cursor-pointer flex-col items-start gap-5 px-6 transition hover:shadow-md">
      <CardHeader className="flex flex-row w-full flex-shrink-0 items-center p-0 gap-4">
        {icon && (
          <img src={icon} alt="" className="w-16" />
        )}
        <div className="flex flex-row items-center gap-2 text-lg font-semibold">
          {title}
          {isExternal && <Icon icon={ExternalLink} className="h-4 w-4" />}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 p-0 h-full">
        <p className="line-clamp-4 text-base text-slate-800">{description}</p>
      </CardContent>
    </Card>
  );

  return href ? (
    <a
      href={href}
      target={isExternal ? "_blank" : "_self"}
      rel="noopener noreferrer"
    >
      {content}
    </a>
  ) : (
    content
  );
}

export default ToolCard;
