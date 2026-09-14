import { getRestaurantContext } from "@/lib/server/restaurant/authorization";
import { readRestaurantSettings } from "@/lib/server/restaurant/queries";
import { canAccessRestaurant } from "@/lib/domain/restaurant/policies";
import {
  RestaurantAccessNotice,
  RestaurantHeading,
  RestaurantPanel,
} from "@/components/restaurant/page-ui";
import { RestaurantSettingsForm } from "@/components/restaurant/settings/settings-form";

export const metadata = { title: "Settings" };
export default async function SettingsPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;
  const context = await getRestaurantContext(restaurantId);
  if (
    !canAccessRestaurant(
      context.role,
      context.restaurant.status,
      "settingsRead",
    )
  )
    return <RestaurantAccessNotice status={context.restaurant.status} />;
  const data = await readRestaurantSettings(context.user.id, restaurantId);
  return (
    <>
      <RestaurantHeading
        title="Restaurant settings"
        description="Business details, regional preferences, and service defaults for your restaurant."
      />
      <RestaurantPanel
        title={
          context.role === "OWNER"
            ? "Business configuration"
            : "Business configuration · Read only"
        }
      >
        {context.role === "OWNER" ? (
          <RestaurantSettingsForm data={data} />
        ) : (
          <>
            <p className="mb-5 text-sm text-muted-foreground">
              Only your restaurant owner can update these settings.
            </p>
            <dl className="grid gap-5 sm:grid-cols-2">
              {Object.entries({
                Restaurant: data.name,
                City: data.city,
                Email: data.email,
                Phone: data.phone,
                Address: data.settings?.addressLine1,
                Timezone: data.settings?.timezone,
                Currency: data.settings?.currencyCode,
                "Service mode": data.settings?.serviceMode.replaceAll("_", " "),
              }).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-xs text-muted-foreground">{key}</dt>
                  <dd className="mt-1 break-words text-sm">
                    {value || "Not configured"}
                  </dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </RestaurantPanel>
    </>
  );
}
