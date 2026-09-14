import { saveSettings } from "@/app/actions/restaurant";
import { ActionForm, FormField } from "@/components/forms/action-form";
import type { readRestaurantSettings } from "@/lib/server/restaurant/queries";

export function RestaurantSettingsForm({
  data,
}: {
  data: Awaited<ReturnType<typeof readRestaurantSettings>>;
}) {
  const settings = data.settings;
  return (
    <ActionForm action={saveSettings} submitLabel="Save restaurant settings">
      <input type="hidden" name="restaurantId" value={data.id} />
      <input type="hidden" name="version" value={data.version} />
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          name="name"
          label="Restaurant name"
          defaultValue={data.name}
          required
          maxLength={100}
        />
        <FormField
          name="city"
          label="City"
          defaultValue={data.city}
          maxLength={100}
        />
        <FormField
          name="email"
          label="Business email"
          type="email"
          defaultValue={data.email}
          maxLength={254}
        />
        <FormField
          name="phone"
          label="Business phone"
          type="tel"
          defaultValue={data.phone}
          maxLength={40}
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          name="addressLine1"
          label="Address line 1"
          defaultValue={settings?.addressLine1}
        />
        <FormField
          name="addressLine2"
          label="Address line 2"
          defaultValue={settings?.addressLine2}
        />
        <FormField
          name="postalCode"
          label="Postal code"
          defaultValue={settings?.postalCode}
          maxLength={20}
        />
        <FormField
          name="countryCode"
          label="Country code"
          defaultValue={settings?.countryCode}
          maxLength={2}
          hint="Two-letter code, for example PH."
        />
      </div>
      <div className="border-t pt-5">
        <h3 className="mb-5 text-sm font-semibold">Regional preferences</h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            name="timezone"
            label="Timezone"
            defaultValue={settings?.timezone ?? data.defaultTimezone}
            maxLength={100}
            required
            hint="IANA timezone, for example Asia/Manila or UTC."
          />
          <FormField
            name="currencyCode"
            label="Currency"
            defaultValue={settings?.currencyCode}
            required
            options={[
              { value: "", label: "Choose a currency" },
              ...Intl.supportedValuesOf("currency").map((value) => ({
                value,
                label: value,
              })),
            ]}
          />
          <FormField
            name="locale"
            label="Locale"
            defaultValue={settings?.locale ?? "en"}
            maxLength={40}
            required
            hint="For example en-PH or en-US."
          />
        </div>
      </div>
      <div className="border-t pt-5">
        <h3 className="mb-2 text-sm font-semibold">Service preferences</h3>
        <p className="mb-5 text-xs leading-5 text-muted-foreground">
          These preferences prepare your account for upcoming order tools. Table
          service, tax calculation, and receipt printing are not available yet.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            name="serviceMode"
            label="Service mode"
            defaultValue={settings?.serviceMode ?? "QUICK_SERVICE"}
            options={[
              { value: "QUICK_SERVICE", label: "Quick service" },
              { value: "TABLE_SERVICE", label: "Table service (planned)" },
            ]}
          />
          <FormField
            name="defaultOrderType"
            label="Default order type"
            defaultValue={settings?.defaultOrderType ?? "TAKEOUT"}
            options={[
              { value: "TAKEOUT", label: "Takeaway" },
              { value: "DINE_IN", label: "Dine in" },
            ]}
          />
          <FormField
            name="orderNumberPrefix"
            label="Order number prefix"
            defaultValue={settings?.orderNumberPrefix ?? "ORD"}
            required
            maxLength={10}
            hint="Letters and numbers only. Number generation comes with ordering."
          />
          <FormField
            name="receiptHeader"
            label="Receipt header"
            defaultValue={settings?.receiptHeader}
            maxLength={200}
          />
          <FormField
            name="receiptFooter"
            label="Receipt footer"
            defaultValue={settings?.receiptFooter}
            maxLength={300}
          />
        </div>
      </div>
    </ActionForm>
  );
}
