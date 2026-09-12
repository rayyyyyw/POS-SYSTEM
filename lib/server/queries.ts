import "server-only";
import { cache } from "react";
import { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { requireAdmin, requireUser } from "./authorization";

type Params = Record<string, string | string[] | undefined>;
const scalar = (value: string | string[] | undefined) => typeof value === "string" ? value : "";
function pagination(params: Params) {
  const value = Number(scalar(params.page));
  const page = Number.isSafeInteger(value) && value > 0 ? Math.min(value, 100000) : 1;
  return { page, pageSize: 20, skip: (page - 1) * 20 };
}
const membershipSelect = { id: true, userId: true, role: true, status: true, user: { select: { name: true, email: true } } } satisfies Prisma.RestaurantMembershipSelect;
const restaurantSelect = {
  id: true, name: true, slug: true, city: true, email: true, phone: true, status: true, version: true, createdAt: true,
  memberships: { where: { role: "OWNER" }, select: { user: { select: { name: true, email: true } } }, take: 1 },
} satisfies Prisma.RestaurantSelect;
type RestaurantRow = Prisma.RestaurantGetPayload<{ select: typeof restaurantSelect }>;
function restaurantDTO(row: RestaurantRow) {
  const { memberships, createdAt, ...fields } = row;
  return { ...fields, createdAt: createdAt.toISOString(), ownerName: memberships[0]?.user.name ?? null, ownerEmail: memberships[0]?.user.email ?? null };
}
const activitySelect = { id: true, title: true, detail: true, actor: true, occurredAt: true, restaurantId: true, userId: true } satisfies Prisma.AuditEventSelect;
function activityDTO(row: Prisma.AuditEventGetPayload<{ select: typeof activitySelect }>) {
  return { ...row, occurredAt: row.occurredAt.toISOString(), tone: "info" as const };
}
export async function listRestaurants(params: Params = {}) {
  await requireAdmin();
  const paging = pagination(params);
  const q = scalar(params.q).trim().slice(0, 100);
  const status = scalar(params.status);
  const where: Prisma.RestaurantWhereInput = {
    ...(q ? { OR: ["name", "slug", "city", "email"].map(field => ({ [field]: { contains: q, mode: "insensitive" } })) } : {}),
    ...(["PENDING", "ACTIVE", "SUSPENDED", "ARCHIVED"].includes(status) ? { status: status as "ACTIVE" } : {}),
  };
  const orderBy: Prisma.RestaurantOrderByWithRelationInput[] = scalar(params.sort) === "name" ? [{ name: "asc" }, { id: "asc" }] : scalar(params.sort) === "oldest" ? [{ createdAt: "asc" }, { id: "asc" }] : [{ createdAt: "desc" }, { id: "desc" }];
  const [items, total] = await db.$transaction([
    db.restaurant.findMany({ where, select: restaurantSelect, orderBy, take: paging.pageSize, skip: paging.skip }),
    db.restaurant.count({ where }),
  ]);
  return { items: items.map(restaurantDTO), total, page: paging.page, pageSize: paging.pageSize };
}
export async function getRestaurant(id: string) {
  await requireAdmin();
  const row = await db.restaurant.findUnique({ where: { id }, select: restaurantSelect });
  if (!row) return null;
  const [memberships, invitations, activity] = await Promise.all([
    db.restaurantMembership.findMany({ where: { restaurantId: id }, select: membershipSelect, orderBy: { createdAt: "asc" }, take: 100 }),
    db.invitation.findMany({ where: { restaurantId: id }, select: { id: true, email: true, role: true, status: true, expiresAt: true, deliveryStatus: true }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.auditEvent.findMany({ where: { restaurantId: id }, select: activitySelect, orderBy: { occurredAt: "desc" }, take: 100 }),
  ]);
  return { ...restaurantDTO(row), memberships: memberships.map(({ user, ...member }) => ({ ...member, ...user })),
    invitations: invitations.map(i => ({ ...i, expiresAt: i.expiresAt.toISOString() })), activity: activity.map(activityDTO) };
}
const userSelect = {
  id: true, name: true, email: true, platformRole: true, status: true, createdAt: true,
  memberships: { select: { id: true, userId: true, role: true, status: true, restaurantId: true, restaurant: { select: { name: true } } }, orderBy: { createdAt: "asc" }, take: 100 },
} satisfies Prisma.UserSelect;
function userDTO(row: Prisma.UserGetPayload<{ select: typeof userSelect }>) {
  return { ...row, createdAt: row.createdAt.toISOString(), memberships: row.memberships.map(({ restaurant, ...m }) => ({ ...m, name: row.name, email: row.email, restaurantName: restaurant.name })) };
}
export async function listUsers(params: Params = {}) {
  await requireAdmin();
  const paging = pagination(params);
  const q = scalar(params.q).trim().slice(0, 100);
  const role = scalar(params.role);
  const restaurantId = scalar(params.restaurantId || params.restaurant);
  const status = scalar(params.status);
  const where: Prisma.UserWhereInput = {
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}),
    ...(role === "ADMIN" ? { platformRole: "ADMIN" } : {}),
    ...(["ACTIVE", "DISABLED"].includes(status) ? { status: status as "ACTIVE" } : {}),
    ...(restaurantId || ["OWNER", "MANAGER", "CASHIER"].includes(role) ? { memberships: { some: { ...(restaurantId ? { restaurantId } : {}), ...(["OWNER", "MANAGER", "CASHIER"].includes(role) ? { role: role as "OWNER" } : {}) } } } : {}),
  };
  const [items, total] = await db.$transaction([
    db.user.findMany({ where, select: userSelect, orderBy: scalar(params.sort) === "name" ? [{ name: "asc" }, { id: "asc" }] : [{ createdAt: "desc" }, { id: "desc" }], take: paging.pageSize, skip: paging.skip }),
    db.user.count({ where }),
  ]);
  return { items: items.map(userDTO), total, page: paging.page, pageSize: paging.pageSize };
}
export async function getUser(id: string) {
  await requireAdmin();
  const row = await db.user.findUnique({ where: { id }, select: userSelect });
  if (!row) return null;
  const activity = await db.auditEvent.findMany({ where: { userId: id }, select: activitySelect, orderBy: { occurredAt: "desc" }, take: 100 });
  return { ...userDTO(row), activity: activity.map(activityDTO) };
}
export async function getOverview() {
  await requireAdmin();
  const grouped = db.restaurant.groupBy({ by: ["status"], orderBy: { status: "asc" }, _count: { _all: true } });
  const [restaurants, activeRestaurants, pendingRestaurants, users, pendingRequests, recent, activity, counts] = await db.$transaction([
    db.restaurant.count(), db.restaurant.count({ where: { status: "ACTIVE" } }), db.restaurant.count({ where: { status: "PENDING" } }),
    db.user.count(), db.accessRequest.count({ where: { status: "NEW" } }),
    db.restaurant.findMany({ select: restaurantSelect, take: 5, orderBy: { createdAt: "desc" } }),
    db.auditEvent.findMany({ select: activitySelect, take: 10, orderBy: { occurredAt: "desc" } }),
    grouped,
  ]);
  return { restaurants, activeRestaurants, pendingRestaurants, users, pendingRequests, recentRestaurants: recent.map(restaurantDTO), activity: activity.map(activityDTO), statusCounts: counts.map(c => ({ status: c.status, count: c._count._all })) };
}
export const getPlatformSettings = cache(async function getPlatformSettings() {
  await requireAdmin();
  const row = await db.platformSettings.findUnique({ where: { id: "platform" } });
  // Defaults describe application behavior, never fabricated business records.
  return { name: row?.name ?? "POS System", supportEmail: row?.supportEmail ?? "", timezone: (row?.timezone ?? "Asia/Manila") as "Asia/Manila" | "UTC", dateFormat: (row?.dateFormat ?? "DMY") as "DMY" | "YMD", version: row?.version ?? 0 };
});
export async function listAccessRequests(params: Params = {}) {
  await requireAdmin();
  const paging = pagination(params);
  const q = scalar(params.q).trim().slice(0, 100), status = scalar(params.status);
  const where: Prisma.AccessRequestWhereInput = {
    ...(["NEW", "REVIEWED", "CLOSED"].includes(status) ? { status: status as "NEW" } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { restaurantName: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [items, total] = await db.$transaction([
    db.accessRequest.findMany({ where, select: { id: true, name: true, email: true, restaurantName: true, city: true, status: true, createdAt: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: paging.pageSize, skip: paging.skip }),
    db.accessRequest.count({ where }),
  ]);
  return { items: items.map(i => ({ ...i, createdAt: i.createdAt.toISOString() })), total, page: paging.page, pageSize: paging.pageSize };
}
export async function getRestaurantOptions() {
  await requireAdmin();
  return db.restaurant.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "desc" }, take: 100 });
}
export async function getAccessRequest(id: string) {
  await requireAdmin();
  return db.accessRequest.findUnique({ where: { id }, select: { id: true, name: true, email: true, restaurantName: true, city: true, status: true } });
}
export async function getWorkspaceMemberships() {
  const user = await requireUser();
  return db.restaurantMembership.findMany({ where: { userId: user.id, status: "ACTIVE" }, select: { id: true, role: true, restaurant: { select: { id: true, name: true, slug: true, status: true } } }, take: 100, orderBy: { createdAt: "asc" } });
}
