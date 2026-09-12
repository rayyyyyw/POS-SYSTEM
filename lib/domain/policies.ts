export class DomainError extends Error {}
export function assertTransition(from: string, to: string) {
  const allowed: Record<string, string[]> = {
    PENDING: ["ACTIVE", "ARCHIVED"], ACTIVE: ["SUSPENDED", "ARCHIVED"],
    SUSPENDED: ["ACTIVE", "ARCHIVED"], ARCHIVED: ["PENDING"],
  };
  if (!allowed[from]?.includes(to)) throw new DomainError("This status change is not allowed. Restore archived restaurants to pending first.");
}
export function assertInvitation(invite: { status: string; expiresAt: Date } | null, now = new Date()) {
  if (!invite || invite.status !== "PENDING" || invite.expiresAt <= now) throw new DomainError("This invitation is invalid, expired, or already used. Ask an administrator for a new invitation.");
}
export function assertOwnerMutation(role: string) {
  if (role === "OWNER") throw new DomainError("Transfer ownership before changing or removing the owner membership.");
}
