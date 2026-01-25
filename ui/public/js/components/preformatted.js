export function createPreformattedBlock({ id, text = "", className = "" } = {}) {
  const pre = document.createElement("pre");
  pre.className =
    "rounded-lg border border-border bg-muted/20 p-3 text-xs font-mono whitespace-pre-wrap overflow-x-auto";
  if (className) pre.className += ` ${className}`;
  if (id) pre.id = id;
  pre.textContent = text;

  const setText = (next) => {
    pre.textContent = next ?? "";
  };

  return { pre, setText };
}
