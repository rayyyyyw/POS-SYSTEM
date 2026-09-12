import { cache } from "react";
import { getPlatformSettings } from "@/lib/server/queries";
import { formatDate, formatTime } from "@/lib/admin/format";

// React cache is request-scoped; private preferences never cross user requests.
const getDatePreferences = cache(getPlatformSettings);

export async function DateLabel({ value, includeTime = false }: { value: string; includeTime?: boolean }) {
  const preferences = await getDatePreferences();
  return <>{formatDate(value, preferences)}{includeTime && ` · ${formatTime(value, preferences)}`}</>;
}
