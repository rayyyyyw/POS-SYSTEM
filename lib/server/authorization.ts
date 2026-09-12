import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "./db";

export async function currentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: {
    id: true, name: true, email: true, platformRole: true, status: true, emailVerified: true,
  } });
  return user?.status === "ACTIVE" && user.emailVerified ? user : null;
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}
export async function requireAdmin() {
  const user = await requireUser();
  if (user.platformRole !== "ADMIN") redirect("/workspace");
  return user;
}
// Future restaurant services must use this boundary, never a browser role claim.
export async function requireRestaurantMember(restaurantId: string, roles: readonly string[] = ["OWNER", "MANAGER", "CASHIER"]) {
  const user = await requireUser();
  const membership = await db.restaurantMembership.findUnique({
    where: { restaurantId_userId: { restaurantId, userId: user.id } },
    include: { restaurant: { select: { status: true } } },
  });
  if (!membership || membership.status !== "ACTIVE" || membership.restaurant.status !== "ACTIVE" || !roles.includes(membership.role)) {
    throw new Error("Restaurant access denied.");
  }
  return { user, membership };
}
