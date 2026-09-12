// Serializable presentation types. Authorization is always enforced on the server.
export interface RestaurantDTO {
  id: string;
  name: string;
  slug: string;
  city: string;
  email: string;
  phone: string;
  status: RestaurantStatus;
  version: number;
  createdAt: string;
  ownerName: string | null;
  ownerEmail: string | null;
}

export interface MembershipDTO {
  id: string;
  userId: string;
  updatedAt: string;
  name: string;
  email: string;
  role: "OWNER" | "MANAGER" | "CASHIER";
  status: "ACTIVE" | "DISABLED";
}

export interface InvitationDTO {
  id: string;
  email: string;
  role: "OWNER" | "MANAGER" | "CASHIER";
  status: "PENDING" | "ACCEPTED" | "REVOKED";
  expiresAt: string;
  deliveryStatus: "PENDING" | "SENT" | "FAILED";
}

export interface ActivityDTO {
  id: string;
  title: string;
  detail: string;
  actor: string;
  occurredAt: string;
  restaurantId: string | null;
  userId: string | null;
  tone: "info";
}

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  platformRole: "ADMIN" | "NONE";
  status: "ACTIVE" | "DISABLED";
  createdAt: string;
  memberships: (MembershipDTO & { restaurantName: string; restaurantId: string })[];
}

export type DirectoryParams = Record<string, string | string[] | undefined>;

export interface DirectoryResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const restaurantStatuses = [
  "ACTIVE",
  "PENDING",
  "SUSPENDED",
  "ARCHIVED",
] as const;
export type RestaurantStatus = (typeof restaurantStatuses)[number];
