import { DateLabel } from "@/components/admin/date-label";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { History, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DetailList, IdentityMark, PageHeading, Panel, StatusBadge } from "@/components/admin/page-ui";
import { OwnershipTransfer, RestaurantInvitations, RestaurantLifecycle, RestaurantMembers } from "@/components/admin/restaurant-management";
import { getRestaurant } from "@/lib/server/queries";


export const metadata: Metadata = { title: "Restaurant details" };

export default async function RestaurantDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const restaurant = await getRestaurant(id);
  if (!restaurant) notFound();
  return <>
    <PageHeading title={restaurant.name} description="Business identity, individual access, and owner onboarding." breadcrumbs={[{ label: "Restaurants", href: "/admin/restaurants" }, { label: restaurant.name }]} actions={<><Button asChild variant="outline"><Link href={`/admin/restaurants/${id}/activity`}><History aria-hidden="true" />Activity</Link></Button><Button asChild><Link href={`/admin/restaurants/${id}/edit`}><Pencil aria-hidden="true" />Edit restaurant</Link></Button></>} />
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
      <div className="space-y-6">
        <Panel title="Business profile"><div className="mb-6 flex items-center gap-4"><IdentityMark name={restaurant.name} large /><div><p className="font-semibold">{restaurant.name}</p><div className="mt-2"><StatusBadge status={restaurant.status} /></div></div></div><DetailList items={[{ label: "Restaurant slug", value: restaurant.slug }, { label: "City", value: restaurant.city || "Not set" }, { label: "Business email", value: restaurant.email || "Not set" }, { label: "Business phone", value: restaurant.phone || "Not set" }, { label: "Owner", value: restaurant.ownerName ?? "Awaiting invitation acceptance" }, { label: "Owner email", value: restaurant.ownerEmail ?? "No accepted owner yet" }, { label: "Created", value: <DateLabel value={restaurant.createdAt} /> }, { label: "Restaurant ID", value: <span className="font-mono text-xs">{restaurant.id}</span> }]} /></Panel>
        <RestaurantMembers members={restaurant.memberships} />
        <RestaurantInvitations restaurant={restaurant} invitations={restaurant.invitations} />
      </div>
      <aside className="space-y-6"><RestaurantLifecycle restaurant={restaurant} /><OwnershipTransfer restaurant={restaurant} members={restaurant.memberships} /><Panel title="Restaurant operations"><p className="text-xs leading-6 text-muted-foreground">Menus, inventory, orders, payments, and POS reporting will be available in a future restaurant workspace release.</p></Panel></aside>
    </div>
  </>;
}
