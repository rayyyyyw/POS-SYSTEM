export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

// Fixture amounts are in centavos. This is a display helper, not a pricing engine.
export function formatMoney(minorUnits: number, compact = false) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
    ...(compact
      ? { notation: "compact" as const, maximumFractionDigits: 1 }
      : {}),
  }).format(minorUnits / 100);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-PH").format(value);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function labelFor(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
