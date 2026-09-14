import {
  inviteMember,
  updateMembership,
  resendInvitation,
  revokeInvitation,
} from "@/app/actions/restaurant";
import { ActionForm, FormField } from "@/components/forms/action-form";
import { Badge } from "@/components/ui/badge";
import {
  RestaurantPagination,
  RestaurantPanel,
} from "@/components/restaurant/page-ui";
import type { readRestaurantTeam } from "@/lib/server/restaurant/queries";

type Team = Awaited<ReturnType<typeof readRestaurantTeam>>;
const roleOptions = [
  { value: "CASHIER", label: "Cashier" },
  { value: "MANAGER", label: "Manager" },
];
const label = (value: string) => value.charAt(0) + value.slice(1).toLowerCase();

export function InviteTeamMember({ restaurantId }: { restaurantId: string }) {
  return (
    <RestaurantPanel
      title="Invite a team member"
      description="Each person uses their own account. Invitation links expire after 72 hours."
    >
      <ActionForm action={inviteMember} submitLabel="Send invitation">
        <input type="hidden" name="restaurantId" value={restaurantId} />
        <div className="grid gap-5 sm:grid-cols-3">
          <FormField name="name" label="Full name" required maxLength={100} />
          <FormField
            name="email"
            label="Email address"
            type="email"
            required
            maxLength={254}
          />
          <FormField
            name="role"
            label="Restaurant role"
            options={roleOptions}
          />
        </div>
      </ActionForm>
    </RestaurantPanel>
  );
}

export function RestaurantTeamMembers({
  restaurantId,
  team,
  editable,
}: {
  restaurantId: string;
  team: Team;
  editable: boolean;
}) {
  return (
    <RestaurantPanel
      title="Team members"
      description="Membership access applies only to this restaurant. Global account access is managed by the platform administrator."
    >
      {team.members.length ? (
        <ul className="divide-y">
          {team.members.map((member) => (
            <li key={member.id} className="space-y-4 py-5 first:pt-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="break-words text-sm font-semibold">
                    {member.user.name}
                  </h3>
                  <p className="mt-1 break-all text-sm text-muted-foreground">
                    {member.user.email}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Joined{" "}
                    <time dateTime={member.createdAt}>
                      {new Date(member.createdAt).toISOString().slice(0, 10)}{" "}
                      (UTC)
                    </time>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{label(member.role)}</Badge>
                  <Badge variant="secondary">{label(member.status)}</Badge>
                  {(member.user.status === "DISABLED" ||
                    !member.user.emailVerified) && (
                    <Badge variant="destructive">
                      {member.user.status === "DISABLED"
                        ? "Account disabled"
                        : "Email unverified"}
                    </Badge>
                  )}
                </div>
              </div>
              {editable && member.role !== "OWNER" ? (
                <ActionForm
                  action={updateMembership}
                  submitLabel="Save member access"
                  variant="outline"
                  confirmation="Apply this member's restaurant access changes?"
                >
                  <input
                    type="hidden"
                    name="restaurantId"
                    value={restaurantId}
                  />
                  <input type="hidden" name="membershipId" value={member.id} />
                  <input
                    type="hidden"
                    name="expectedUpdatedAt"
                    value={member.updatedAt}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      name="role"
                      label={`Role for ${member.user.name}`}
                      defaultValue={member.role}
                      options={roleOptions}
                    />
                    <FormField
                      name="status"
                      label={`Access for ${member.user.name}`}
                      defaultValue={member.status}
                      options={[
                        { value: "ACTIVE", label: "Active" },
                        { value: "DISABLED", label: "Disabled" },
                      ]}
                    />
                  </div>
                </ActionForm>
              ) : (
                member.role === "OWNER" && (
                  <p className="text-xs text-muted-foreground">
                    Ownership changes are managed by the platform administrator.
                  </p>
                )
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          No team members on this page.
        </p>
      )}
      <RestaurantPagination
        path={`/workspace/${restaurantId}/team`}
        page={team.page}
        total={team.total}
        pageSize={team.pageSize}
        parameter="page"
        otherPage={team.invitesPage}
      />
    </RestaurantPanel>
  );
}

export function RestaurantTeamInvitations({
  restaurantId,
  team,
}: {
  restaurantId: string;
  team: Team;
}) {
  return (
    <RestaurantPanel
      title="Pending invitations"
      description="Resend creates a new link. Revoking an invitation prevents it from being accepted."
    >
      {team.invitations.length ? (
        <ul className="divide-y">
          {team.invitations.map((invite) => {
            const expired = new Date(invite.expiresAt) <= new Date();
            return (
              <li key={invite.id} className="space-y-4 py-5 first:pt-0">
                <div className="space-y-2">
                  <h3 className="break-words text-sm font-semibold">
                    {invite.name}
                  </h3>
                  <p className="break-all text-sm text-muted-foreground">
                    {invite.email}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{label(invite.role)}</Badge>
                    <Badge
                      variant={
                        invite.deliveryStatus === "FAILED"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {invite.deliveryStatus === "SENT"
                        ? "Email sent"
                        : invite.deliveryStatus === "FAILED"
                          ? "Delivery failed"
                          : "Delivery pending"}
                    </Badge>
                    {expired && <Badge variant="outline">Expired</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {expired ? "Expired" : "Expires"}{" "}
                    {new Date(invite.expiresAt)
                      .toISOString()
                      .replace("T", " ")
                      .slice(0, 16)}{" "}
                    UTC
                  </p>
                </div>
                {invite.role !== "OWNER" && (
                  <div className="flex flex-wrap gap-3">
                    <ActionForm
                      action={resendInvitation}
                      submitLabel={
                        invite.deliveryStatus === "FAILED"
                          ? "Retry delivery"
                          : "Resend invitation"
                      }
                      variant="outline"
                    >
                      <input
                        type="hidden"
                        name="restaurantId"
                        value={restaurantId}
                      />
                      <input
                        type="hidden"
                        name="invitationId"
                        value={invite.id}
                      />
                    </ActionForm>
                    <ActionForm
                      action={revokeInvitation}
                      submitLabel="Revoke invitation"
                      variant="outline"
                      confirmation="Revoke this invitation and invalidate its link?"
                    >
                      <input
                        type="hidden"
                        name="restaurantId"
                        value={restaurantId}
                      />
                      <input
                        type="hidden"
                        name="invitationId"
                        value={invite.id}
                      />
                    </ActionForm>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          No pending invitations. Invite a manager or cashier to get started.
        </p>
      )}
      <RestaurantPagination
        path={`/workspace/${restaurantId}/team`}
        page={team.invitesPage}
        total={team.invitationTotal}
        pageSize={team.pageSize}
        parameter="invitesPage"
        otherPage={team.page}
      />
    </RestaurantPanel>
  );
}
