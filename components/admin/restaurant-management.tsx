import { DateLabel } from "@/components/admin/date-label";
import Link from "next/link";
import { changeRestaurantStatus, inviteMember, resendInvitation, revokeInvitation, transferOwnership, updateMembership } from "@/app/actions/admin";
import type { InvitationDTO, MembershipDTO, RestaurantDTO } from "@/lib/admin/types";
import { labelFor } from "@/lib/admin/format";
import { ActionForm, FormField } from "@/components/admin/action-form";
import { Panel, StatusBadge } from "@/components/admin/page-ui";

const memberRoles = [{ value: "MANAGER", label: "Manager" }, { value: "CASHIER", label: "Cashier" }];
const memberStatuses = [{ value: "ACTIVE", label: "Active" }, { value: "DISABLED", label: "Disabled" }];

export function MembershipEditor({ membership }: { membership: MembershipDTO }) {
  if (membership.role === "OWNER") return <p className="text-xs leading-6 text-muted-foreground">Owner access is managed through the ownership-transfer workflow.</p>;
  return <ActionForm action={updateMembership} submitLabel="Save membership" variant="outline"><input type="hidden" name="membershipId" value={membership.id} /><input type="hidden" name="expectedUpdatedAt" value={membership.updatedAt} /><div className="grid gap-4 sm:grid-cols-2"><FormField name="role" label="Restaurant role" defaultValue={membership.role} options={memberRoles} /><FormField name="status" label="Restaurant access" defaultValue={membership.status} options={memberStatuses} /></div></ActionForm>;
}

export function RestaurantMembers({ members }: { members: MembershipDTO[] }) {
  return <Panel title="Restaurant members" description="Individual accounts and permissions for this restaurant. Showing up to 100 members.">
    {members.length ? <div className="divide-y">{members.map((member) => <div key={member.id} className="space-y-4 py-5 first:pt-0 last:pb-0"><div className="flex flex-wrap items-center justify-between gap-3"><div><Link href={`/admin/users/${member.userId}`} className="text-sm font-medium hover:text-primary hover:underline">{member.name}</Link><p className="mt-1 break-all text-xs text-muted-foreground">{member.email} · {labelFor(member.role)}</p></div><StatusBadge status={member.status} /></div><MembershipEditor membership={member} /></div>)}</div> : <p className="text-sm leading-6 text-muted-foreground">No accepted memberships yet. An owner appears here after accepting their invitation.</p>}
  </Panel>;
}

export function RestaurantInvitations({ restaurant, invitations }: { restaurant: RestaurantDTO; invitations: InvitationDTO[] }) {
  const canInvite = restaurant.status !== "ARCHIVED";
  return <Panel title="Invitations" description="Track delivery, resend an invitation, or revoke access before acceptance. Latest 50 invitations.">
    {canInvite && <div className="mb-6 border-b pb-6"><ActionForm action={inviteMember} submitLabel="Send invitation" pendingLabel="Sending invitation…"><input type="hidden" name="restaurantId" value={restaurant.id} /><div className="grid gap-5 sm:grid-cols-2"><FormField name="email" label="Individual email" type="email" required maxLength={254} /><FormField name="role" label="Invited role" defaultValue="MANAGER" options={restaurant.status === "PENDING" && !restaurant.ownerEmail ? [{ value: "OWNER", label: "Owner" }, ...memberRoles] : memberRoles} /></div></ActionForm></div>}
    {!canInvite && <p className="mb-5 text-sm text-muted-foreground">Restore this restaurant before sending invitations.</p>}
    {invitations.length ? <ul className="divide-y">{invitations.map((invitation) => {
      const expired = invitation.status === "PENDING" && new Date(invitation.expiresAt) <= new Date();
      return <li key={invitation.id} className="space-y-3 py-5 first:pt-0 last:pb-0"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="break-all text-sm font-medium">{invitation.email}</p><p className="mt-1 text-xs text-muted-foreground">{labelFor(invitation.role)} · {expired ? "Expired" : "Expires"} <DateLabel value={invitation.expiresAt} /></p></div><div className="flex flex-wrap gap-2"><StatusBadge status={expired ? "EXPIRED" : invitation.status} /><StatusBadge status={invitation.deliveryStatus} /></div></div>{invitation.status === "PENDING" && canInvite && <div className="flex flex-wrap items-start gap-3"><ActionForm action={resendInvitation} submitLabel={invitation.deliveryStatus === "FAILED" ? "Retry delivery" : "Resend invitation"} variant="outline" pendingLabel="Sending…"><input type="hidden" name="invitationId" value={invitation.id} /></ActionForm><ActionForm action={revokeInvitation} submitLabel="Revoke invitation" variant="outline" confirmation="Revoke this invitation? Its acceptance link will stop working."><input type="hidden" name="invitationId" value={invitation.id} /></ActionForm></div>}</li>;
    })}</ul> : <p className="text-sm text-muted-foreground">No invitations have been issued.</p>}
  </Panel>;
}

export function RestaurantLifecycle({ restaurant }: { restaurant: RestaurantDTO }) {
  const transitions = { PENDING: ["ACTIVE", "ARCHIVED"], ACTIVE: ["SUSPENDED", "ARCHIVED"], SUSPENDED: ["ACTIVE", "ARCHIVED"], ARCHIVED: ["PENDING"] } as const;
  return <Panel title={restaurant.status === "ARCHIVED" ? "Restore restaurant" : "Restaurant lifecycle"} description="Changes affect access to the restaurant and are recorded in activity."><div className="mb-5"><StatusBadge status={restaurant.status} /></div><ActionForm action={changeRestaurantStatus} submitLabel={restaurant.status === "ARCHIVED" ? "Restore to pending" : "Update status"} variant="outline" confirmation="Apply this restaurant status change? Archiving or suspending stops restaurant access; archiving also revokes outstanding invitations."><input type="hidden" name="id" value={restaurant.id} /><input type="hidden" name="version" value={restaurant.version} /><FormField name="status" label="New status" options={transitions[restaurant.status].map((status) => ({ value: status, label: status === "PENDING" ? "Restore to pending" : labelFor(status) }))} /><FormField name="reason" label="Reason for change" required maxLength={500} hint="Explain the change for the activity record." /></ActionForm><p className="mt-5 text-xs leading-6 text-muted-foreground">Activation requires an active, verified owner. Archiving preserves business records. Restored restaurants return to pending for review.</p></Panel>;
}

export function OwnershipTransfer({ restaurant, members }: { restaurant: RestaurantDTO; members: MembershipDTO[] }) {
  const candidates = members.filter((member) => member.status === "ACTIVE" && member.role !== "OWNER");
  return <Panel title="Transfer ownership" description="The current owner becomes a manager when another member takes ownership.">{restaurant.status === "ARCHIVED" ? <p className="text-xs leading-6 text-muted-foreground">Restore the restaurant before transferring ownership.</p> : candidates.length ? <ActionForm action={transferOwnership} submitLabel="Transfer ownership" variant="outline" confirmation="Transfer ownership to the selected member? The current owner will become a manager."><input type="hidden" name="restaurantId" value={restaurant.id} /><input type="hidden" name="version" value={restaurant.version} /><FormField name="userId" label="New owner" required options={candidates.map((member) => ({ value: member.userId, label: `${member.name} (${member.email})` }))} hint="The account must be active and email-verified." /></ActionForm> : <p className="text-xs leading-6 text-muted-foreground">Invite another member and wait for acceptance before transferring ownership.</p>}</Panel>;
}
