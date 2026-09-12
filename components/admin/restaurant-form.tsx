import Link from "next/link";
import { createRestaurant, updateRestaurant } from "@/app/actions/admin";
import type { RestaurantDTO } from "@/lib/admin/types";
import { Button } from "@/components/ui/button";
import { ActionForm, FormField } from "@/components/admin/action-form";
import { Panel } from "@/components/admin/page-ui";

export function RestaurantForm({ restaurant, requestId, defaults }: { restaurant?: RestaurantDTO; requestId?: string; defaults?: { name?: string; ownerName?: string; ownerEmail?: string; city?: string } }) {
  return <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
    <ActionForm action={restaurant ? updateRestaurant : createRestaurant} submitLabel={restaurant ? "Save restaurant" : "Create restaurant and invite owner"} pendingLabel={restaurant ? "Saving changes…" : "Creating restaurant…"}>
      {restaurant && <><input type="hidden" name="id" value={restaurant.id} /><input type="hidden" name="version" value={restaurant.version} /></>}
      {requestId && <input type="hidden" name="requestId" value={requestId} />}
      <Panel title="Restaurant information" description="The business identity and contact details.">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField name="name" label="Restaurant name" defaultValue={restaurant?.name ?? defaults?.name} required maxLength={100} />
          <FormField name="slug" label="Restaurant slug" defaultValue={restaurant?.slug} required maxLength={60} hint="Unique lowercase letters, numbers, and single hyphens." />
          <FormField name="city" label="City" defaultValue={restaurant?.city ?? defaults?.city} maxLength={100} required />
          <FormField name="email" label="Business email" defaultValue={restaurant?.email} type="email" maxLength={254} required />
          <FormField name="phone" label="Business phone" defaultValue={restaurant?.phone} type="tel" maxLength={40} />
        </div>
      </Panel>
      {!restaurant && <Panel title="Initial owner" description="Invite the individual who will own this restaurant."><div className="grid gap-5 sm:grid-cols-2"><FormField name="ownerName" label="Owner full name" defaultValue={defaults?.ownerName} required maxLength={100} /><FormField name="ownerEmail" label="Owner email" defaultValue={defaults?.ownerEmail} required type="email" maxLength={254} hint="Use the owner's individual address, not a shared restaurant login." /></div></Panel>}
    </ActionForm>
    <aside className="space-y-5 rounded-lg border bg-card p-5 text-xs leading-6 text-muted-foreground"><h2 className="font-semibold text-foreground">{restaurant ? "Business information" : "Invitation-based onboarding"}</h2><p>{restaurant ? "Changes to the business profile do not change the owner's identity. Use the separate ownership workflow to transfer control." : "A new restaurant starts as pending. Its owner accepts an invitation using an individual account before the restaurant can be activated."}</p>{!restaurant && <p>The invitation delivery status appears on the restaurant page. If delivery fails, the restaurant remains saved and the invitation can be resent.</p>}<Button asChild variant="outline" size="sm"><Link href={restaurant ? `/admin/restaurants/${restaurant.id}` : "/admin/restaurants"}>Cancel</Link></Button></aside>
  </div>;
}
