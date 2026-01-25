export function createAlert({ title, message, variant = "info" } = {}) {
  const alert = document.createElement("div");
  const base = "relative w-full rounded-lg border px-4 py-3 text-sm";
  const variants = {
    info: "border-border bg-background",
    warning: "border-amber-300 bg-amber-50",
    error: "border-destructive/50 bg-destructive/10",
  };
  alert.className = `${base} ${variants[variant] || variants.info}`;

  if (title) {
    const heading = document.createElement("p");
    heading.className = "font-medium";
    heading.textContent = title;
    alert.appendChild(heading);
  }
  if (message) {
    const body = document.createElement("p");
    body.className = "text-muted-foreground";
    body.textContent = message;
    alert.appendChild(body);
  }

  return alert;
}
