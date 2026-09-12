import { DateLabel } from "@/components/admin/date-label";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { changeUserStatus, revokeUserSessions, updateUser } from "@/app/actions/admin";
import { ActionForm, FormField } from "@/components/admin/action-form";
import { ActivityList } from "@/components/admin/activity-list";
import { DetailList, IdentityMark, PageHeading, Panel, StatusBadge } from "@/components/admin/page-ui";
import { MembershipEditor } from "@/components/admin/restaurant-management";
import { getUser } from "@/lib/server/queries";
import { labelFor } from "@/lib/admin/format";

export const metadata: Metadata = { title: "User details" };

export default async function UserDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser(id);
  if (!user) notFound();
  return <>
    <PageHeading title={user.name} description="Manage this person's profile, account access, and restaurant memberships." breadcrumbs={[{ label: "Users", href: "/admin/users" }, { label: user.name }]} />
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
      <div className="space-y-6">
        <Panel title="User profile"><div className="mb-6 flex items-center gap-4"><IdentityMark name={user.name} large /><div><p className="font-semibold">{user.name}</p><p className="mt-1 text-xs text-muted-foreground">{user.platformRole === "ADMIN" ? "Platform administrator" : "Restaurant user"}</p></div></div><DetailList items={[{ label: "Login email", value: user.email }, { label: "Account status", value: <StatusBadge status={user.status} /> }, { label: "Registered", value: <DateLabel value={user.createdAt} /> }, { label: "User ID", value: <span className="font-mono text-xs">{user.id}</span> }]} /><div className="mt-6 border-t pt-5"><ActionForm action={updateUser} submitLabel="Save profile"><input type="hidden" name="userId" value={user.id} /><FormField name="name" label="Full name" defaultValue={user.name} required maxLength={100} hint="Changing the display name does not change the login email." /></ActionForm></div></Panel>
        <Panel title="Restaurant memberships" description="Disabling a membership affects only that restaurant. Up to 100 memberships.">{user.memberships.length ? <div className="divide-y">{user.memberships.map((membership) => <div key={membership.id} className="space-y-4 py-5 first:pt-0 last:pb-0"><div className="flex flex-wrap items-center justify-between gap-3"><div><Link href={`/admin/restaurants/${membership.restaurantId}`} className="text-sm font-medium hover:text-primary hover:underline">{membership.restaurantName}</Link><p className="mt-1 text-xs text-muted-foreground">{labelFor(membership.role)}</p></div><StatusBadge status={membership.status} /></div><MembershipEditor membership={membership} /></div>)}</div> : <p className="text-sm text-muted-foreground">This user has no restaurant memberships.</p>}</Panel>
      </div>
      <aside className="space-y-6">
        <Panel title="Global account access" description="Applies across the platform and every restaurant."><ActionForm action={changeUserStatus} submitLabel={user.status === "ACTIVE" ? "Disable account" : "Restore account"} variant={user.status === "ACTIVE" ? "destructive" : "outline"} confirmation={user.status === "ACTIVE" ? "Disable this account everywhere and revoke its active sessions?" : "Restore this person's global account access?"}><input type="hidden" name="userId" value={user.id} /><input type="hidden" name="status" value={user.status === "ACTIVE" ? "DISABLED" : "ACTIVE"} /><p className="text-xs leading-6 text-muted-foreground">An owner of an active restaurant must transfer ownership or have the restaurant suspended first. The last active administrator is protected.</p></ActionForm></Panel>
        <Panel title="Active sessions" description="Require this person to sign in again on all devices."><ActionForm action={revokeUserSessions} submitLabel="Revoke all sessions" variant="outline" confirmation="Revoke every active session for this person? Revoking your own sessions will sign you out."><input type="hidden" name="userId" value={user.id} /></ActionForm></Panel>
      </aside>
    </div>
    <Panel title="Recent account activity" description="Most recent recorded changes concerning this user."><ActivityList events={user.activity} /></Panel>
  </>;
}
