function createToolCard({ title, description, icon, href, className } = {}) {
  const isExternal = href?.startsWith("http") || href?.includes("http");

  const card = document.createElement("div");
  card.className = `flex h-full w-full cursor-pointer flex-col items-start gap-5 px-6 transition hover:shadow-md rounded-xl border border-border bg-card shadow-sm ${className || ""}`;

  const header = document.createElement("div");
  header.className = "flex flex-row w-full flex-shrink-0 items-center gap-4 pt-4";

  if (icon) {
    const iconImg = document.createElement("img");
    iconImg.src = icon;
    iconImg.alt = "";
    iconImg.className = "w-16";
    header.appendChild(iconImg);
  }

  const titleContainer = document.createElement("div");
  titleContainer.className = "flex flex-row items-center gap-2 text-lg font-semibold";
  titleContainer.textContent = title;

  if (isExternal) {
    const externalIcon = document.createElement("svg");
    externalIcon.className = "h-4 w-4";
    externalIcon.setAttribute("viewBox", "0 0 24 24");
    externalIcon.setAttribute("fill", "none");
    externalIcon.setAttribute("stroke", "currentColor");
    externalIcon.setAttribute("stroke-width", "2");
    externalIcon.innerHTML = '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line>';
    titleContainer.appendChild(externalIcon);
  }

  header.appendChild(titleContainer);
  card.appendChild(header);

  const content = document.createElement("div");
  content.className = "flex flex-col gap-2 pb-4 h-full";

  const desc = document.createElement("p");
  desc.className = "line-clamp-4 text-base text-slate-800";
  desc.textContent = description;

  content.appendChild(desc);
  card.appendChild(content);

  if (href) {
    const link = document.createElement("a");
    link.href = href;
    if (isExternal) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    } else {
      link.target = "_self";
    }
    link.style.textDecoration = "none";
    link.style.color = "inherit";
    link.appendChild(card);
    return link;
  }

  return card;
}

export function createToolSection({ id, title, tools, className } = {}) {
  const section = document.createElement("section");
  section.className = `flex w-full flex-col p-6 ${className || ""}`;
  if (id) section.id = id;

  // Create title heading
  const titleEl = document.createElement("h2");
  titleEl.className = "text-xl font-bold mb-4";
  titleEl.textContent = title;
  section.appendChild(titleEl);

  // Create the grid container for tool cards
  const gridContainer = document.createElement("div");
  gridContainer.className = "w-full grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

  // Add tool cards to the grid
  tools.forEach((tool) => {
    const toolCard = createToolCard({
      title: tool.title,
      description: tool.description,
      icon: tool.icon,
      href: tool.href,
      className: "break-inside-avoid"
    });
    gridContainer.appendChild(toolCard);
  });

  section.appendChild(gridContainer);
  return section;
}