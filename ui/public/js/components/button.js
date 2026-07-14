export function createButton(text, variant = "default", options = {}, icon = null) {
  const button = document.createElement("button");
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-base font-medium transition-all";
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    outline: "border border-border bg-background hover:bg-accent",
    secondary: "bg-secondary text-secondary-foreground hover:bg-accent",
    destructive: "bg-destructive text-white hover:bg-destructive/90",
  };
  button.className = `${base} ${variants[variant] || variants.default}`;
  button.type = options.type || "button";
  if (icon) {
    icon.classList.add("h-4", "w-4");
    button.appendChild(icon);
  }
  const textSpan = document.createElement("span");
  textSpan.textContent = text;
  button.appendChild(textSpan);
  if (options.id) button.id = options.id;
  if (options.disabled) button.disabled = true;
  if (options.onClick) button.addEventListener("click", options.onClick);
  return button;
}
