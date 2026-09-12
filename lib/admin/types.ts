// Presentation types for this phase; these are not Prisma models or auth claims.
export const restaurantStatuses = [
  "ACTIVE",
  "PENDING",
  "SUSPENDED",
  "ARCHIVED",
] as const;
export type RestaurantStatus = (typeof restaurantStatuses)[number];
export const userRoles = [
  "SUPER_ADMIN",
  "RESTAURANT_OWNER",
  "MANAGER",
  "CASHIER",
] as const;
export type UserRole = (typeof userRoles)[number];
export type UserStatus = "ACTIVE" | "INVITED" | "DISABLED";

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  city: string;
  email: string;
  phone: string;
  ownerId: string;
  status: RestaurantStatus;
  createdAt: string;
}

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  restaurantId: string | null;
  status: UserStatus;
  createdAt: string;
}

export interface ActivityEvent {
  id: string;
  restaurantId: string | null;
  userId: string | null;
  title: string;
  detail: string;
  actor: string;
  occurredAt: string;
  tone: "success" | "warning" | "destructive" | "info";
}

export interface RestaurantListItem extends Restaurant {
  ownerName: string;
  ownerEmail: string;
}

export interface UserListItem extends PlatformUser {
  restaurantName: string | null;
}
