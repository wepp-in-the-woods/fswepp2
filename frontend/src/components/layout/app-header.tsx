import React from "react";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useLocation } from "react-router-dom";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";


interface BreadcrumbItemType {
  label: string;
  href?: string;
}

const getBreadcrumbs = (pathname: string): BreadcrumbItemType[] => {
  const segments = pathname.split('/').filter(Boolean);

  const breadcrumbMap: Record<string, string> = {
    'rock-clime': 'Rock: Clime',
    'par': 'Parameter File',
    'climate': 'Climate Data'
  };

  const breadcrumbs: BreadcrumbItemType[] = [
    { label: 'FSWEPP', href: '/' }
  ];

  if (segments.length > 0) {
    segments.forEach((segment, index) => {
      const isLast = index === segments.length - 1;
      const label = breadcrumbMap[segment] || segment;

      if (!isLast) {
        const href = '/' + segments.slice(0, index + 1).join('/');
        breadcrumbs.push({ label, href });
      } else {
        breadcrumbs.push({ label });
      }
    });
  }

  return breadcrumbs;
};

export const AppHeader: React.FC = () => {
  const location = useLocation();
  const breadcrumbs = getBreadcrumbs(location.pathname);
  const { state, isMobile } = useSidebar();

  // Calculate width based on sidebar state and mobile status
  const getHeaderStyle = () => {
    if (isMobile) {
      // On mobile, sidebar is an overlay, so header should span full width
      return { left: '0px' };
    }

    // On desktop, adjust based on sidebar state
    const sidebarWidth = state === "expanded" ? 320 : 48; // 20rem (320px) when expanded, 3rem (48px) when collapsed
    return { left: `${sidebarWidth}px` };
  };

  return (
    <header
      className="fixed top-0 right-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background px-4"
      style={getHeaderStyle()}
    >
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mr-2 data-[orientation=vertical]:h-4"
      />
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              <BreadcrumbItem>
                {crumb.href ? (
                  <BreadcrumbLink href={crumb.href}>
                    {crumb.label}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {index < breadcrumbs.length - 1 && (
                <BreadcrumbSeparator />
              )}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
};
