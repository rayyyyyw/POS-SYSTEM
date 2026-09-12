type DatePreferences = { timezone?: "Asia/Manila" | "UTC"; dateFormat?: "DMY" | "YMD" };

export function formatDate(value: string, preferences: DatePreferences = {}) {
  if (preferences.dateFormat === "YMD") {
    const parts = new Intl.DateTimeFormat("en", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: preferences.timezone ?? "Asia/Manila" }).formatToParts(new Date(value));
    const part = (type: string) => parts.find((item) => item.type === type)?.value;
    return `${part("year")}-${part("month")}-${part("day")}`;
  }
  return new Intl.DateTimeFormat("en-PH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: preferences.timezone ?? "Asia/Manila",
  }).format(new Date(value));
}

export function formatTime(value: string, preferences: DatePreferences = {}) {
  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: preferences.timezone ?? "Asia/Manila",
  }).format(new Date(value));
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
