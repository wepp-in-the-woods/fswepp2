import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
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
    <Card className="flex h-full w-full cursor-pointer flex-row items-start gap-5 px-5 transition hover:shadow-md">
      <CardHeader className="flex w-20 flex-shrink-0 justify-center p-0">
        {icon && (
          <div className="flex w-fit items-center">
            <img src={icon} alt="" className="w-16" />
          </div>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-2 p-0">
        <CardTitle className="flex flex-row items-center gap-2 text-lg font-semibold">
          {title}
          {isExternal && <Icon icon={ExternalLink} className="h-4 w-4" />}
        </CardTitle>
        <p className="line-clamp-2 text-base text-slate-800">{description}</p>
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
