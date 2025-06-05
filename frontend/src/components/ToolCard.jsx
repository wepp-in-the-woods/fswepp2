import { Card, CardContent } from "@/components/ui/card";

export default function ToolCard({ title, description, icon, href }) {
  const isExternal = href?.startsWith("http") || href?.includes("http");

  const content = (
    <Card className="h-full cursor-pointer transition hover:shadow-md">
      <CardContent className="flex flex-col gap-2 p-4">
        {icon && <div className="text-3xl">{icon}</div>}
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground text-sm shadow-sm">{description}</p>
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
