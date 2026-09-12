import "server-only";

import type {
  ActivityEvent,
  PlatformUser,
  Restaurant,
  RestaurantListItem,
  UserListItem,
} from "@/lib/admin/types";

// Fictional, deterministic fixtures. No database reads, writes, or session context.
// URL IDs select mock detail records only; they must never establish tenant authority.
export const snapshotLabel = "11 September 2026";
export const reportPeriod = "1–10 September 2026";
export const demoAdmin = {
  name: "Alex Morgan",
  email: "alex.morgan@example.com",
};

export const restaurants: readonly Restaurant[] = [
  {
    id: "rst-001",
    name: "Sinta Kitchen",
    slug: "sinta-kitchen",
    city: "Makati",
    email: "hello@sinta.example.com",
    phone: "+63 2 8000 0101",
    ownerId: "usr-001",
    status: "ACTIVE",
    createdAt: "2026-04-03T02:00:00Z",
  },
  {
    id: "rst-002",
    name: "Common Ground",
    slug: "common-ground",
    city: "Quezon City",
    email: "hello@common.example.com",
    phone: "+63 2 8000 0102",
    ownerId: "usr-002",
    status: "ACTIVE",
    createdAt: "2026-04-18T02:00:00Z",
  },
  {
    id: "rst-003",
    name: "Mesa Verde",
    slug: "mesa-verde",
    city: "Taguig",
    email: "hello@mesa.example.com",
    phone: "+63 2 8000 0103",
    ownerId: "usr-003",
    status: "ACTIVE",
    createdAt: "2026-05-12T02:00:00Z",
  },
  {
    id: "rst-004",
    name: "Salt & Shore",
    slug: "salt-and-shore",
    city: "Cebu City",
    email: "hello@salt.example.com",
    phone: "+63 32 800 0104",
    ownerId: "usr-004",
    status: "ACTIVE",
    createdAt: "2026-06-04T02:00:00Z",
  },
  {
    id: "rst-005",
    name: "The Daily Table",
    slug: "the-daily-table",
    city: "Pasig",
    email: "hello@daily.example.com",
    phone: "+63 2 8000 0105",
    ownerId: "usr-005",
    status: "ACTIVE",
    createdAt: "2026-06-19T02:00:00Z",
  },
  {
    id: "rst-006",
    name: "Kanto Coffee",
    slug: "kanto-coffee",
    city: "Mandaluyong",
    email: "hello@kanto.example.com",
    phone: "+63 2 8000 0106",
    ownerId: "usr-006",
    status: "SUSPENDED",
    createdAt: "2026-07-09T02:00:00Z",
  },
  {
    id: "rst-007",
    name: "Little Seoul",
    slug: "little-seoul",
    city: "Makati",
    email: "hello@seoul.example.com",
    phone: "+63 2 8000 0107",
    ownerId: "usr-007",
    status: "ACTIVE",
    createdAt: "2026-07-22T02:00:00Z",
  },
  {
    id: "rst-008",
    name: "Sunday House",
    slug: "sunday-house",
    city: "Baguio",
    email: "hello@sunday.example.com",
    phone: "+63 74 800 0108",
    ownerId: "usr-008",
    status: "ARCHIVED",
    createdAt: "2026-08-02T02:00:00Z",
  },
  {
    id: "rst-009",
    name: "Basil & Co.",
    slug: "basil-and-co",
    city: "Quezon City",
    email: "hello@basil.example.com",
    phone: "+63 2 8000 0109",
    ownerId: "usr-009",
    status: "ACTIVE",
    createdAt: "2026-08-20T02:00:00Z",
  },
  {
    id: "rst-010",
    name: "Ember Dining",
    slug: "ember-dining",
    city: "Taguig",
    email: "hello@ember.example.com",
    phone: "+63 2 8000 0110",
    ownerId: "usr-010",
    status: "SUSPENDED",
    createdAt: "2026-09-02T02:00:00Z",
  },
  {
    id: "rst-011",
    name: "Narra Bistro",
    slug: "narra-bistro",
    city: "Davao City",
    email: "hello@narra.example.com",
    phone: "+63 82 800 0111",
    ownerId: "usr-011",
    status: "PENDING",
    createdAt: "2026-09-09T03:30:00Z",
  },
  {
    id: "rst-012",
    name: "Oat & Honey",
    slug: "oat-and-honey",
    city: "Pasig",
    email: "hello@oat.example.com",
    phone: "+63 2 8000 0112",
    ownerId: "usr-012",
    status: "PENDING",
    createdAt: "2026-09-10T06:15:00Z",
  },
];

const ownerNames = [
  "Isabel Reyes",
  "Miguel Santos",
  "Sofia Cruz",
  "Daniel Lim",
  "Andrea Garcia",
  "Paolo Mendoza",
  "Hana Park",
  "Lucas Tan",
  "Camille Torres",
  "Rafael Flores",
  "Nina Villanueva",
  "Ethan Ramos",
];

export const users: readonly PlatformUser[] = [
  ...restaurants.map((restaurant, index): PlatformUser => ({
    id: restaurant.ownerId,
    name: ownerNames[index],
    email: `${ownerNames[index].toLowerCase().replaceAll(" ", ".")}@example.com`,
    role: "RESTAURANT_OWNER",
    restaurantId: restaurant.id,
    status:
      restaurant.status === "PENDING"
        ? "INVITED"
        : restaurant.status === "ARCHIVED"
          ? "DISABLED"
          : "ACTIVE",
    createdAt: restaurant.createdAt,
  })),
  {
    id: "usr-admin",
    ...demoAdmin,
    role: "SUPER_ADMIN",
    restaurantId: null,
    status: "ACTIVE",
    createdAt: "2026-04-01T02:00:00Z",
  },
  {
    id: "usr-013",
    name: "Julia Castillo",
    email: "julia.castillo@example.com",
    role: "MANAGER",
    restaurantId: "rst-001",
    status: "ACTIVE",
    createdAt: "2026-04-05T02:00:00Z",
  },
  {
    id: "usr-014",
    name: "Marco dela Rosa",
    email: "marco.delarosa@example.com",
    role: "CASHIER",
    restaurantId: "rst-001",
    status: "ACTIVE",
    createdAt: "2026-04-06T02:00:00Z",
  },
  {
    id: "usr-015",
    name: "Lea Aquino",
    email: "lea.aquino@example.com",
    role: "MANAGER",
    restaurantId: "rst-002",
    status: "ACTIVE",
    createdAt: "2026-04-20T02:00:00Z",
  },
  {
    id: "usr-016",
    name: "Ben Navarro",
    email: "ben.navarro@example.com",
    role: "CASHIER",
    restaurantId: "rst-003",
    status: "DISABLED",
    createdAt: "2026-05-15T02:00:00Z",
  },
];

export const activity: readonly ActivityEvent[] = (
  [
    ...restaurants.flatMap((restaurant): ActivityEvent[] => [
      {
        id: `${restaurant.id}-created`,
        restaurantId: restaurant.id,
        userId: restaurant.ownerId,
        title: "Restaurant registered",
        detail: `${restaurant.name} was added to the platform.`,
        actor: demoAdmin.name,
        occurredAt: restaurant.createdAt,
        tone: "info",
      },
      {
        id: `${restaurant.id}-owner`,
        restaurantId: restaurant.id,
        userId: restaurant.ownerId,
        title: "Initial owner assigned",
        detail: `${ownerNames[restaurants.indexOf(restaurant)]} was assigned as the restaurant owner.`,
        actor: demoAdmin.name,
        occurredAt: new Date(
          Date.parse(restaurant.createdAt) + 60000,
        ).toISOString(),
        tone: "success",
      },
    ]),
    {
      id: "evt-001",
      restaurantId: "rst-001",
      userId: "usr-001",
      title: "Platform details updated",
      detail: "Restaurant contact information was reviewed and updated.",
      actor: demoAdmin.name,
      occurredAt: "2026-09-10T08:30:00Z",
      tone: "info",
    },
    {
      id: "evt-002",
      restaurantId: "rst-006",
      userId: null,
      title: "Restaurant suspended",
      detail: "Platform access suspended pending an account review.",
      actor: demoAdmin.name,
      occurredAt: "2026-09-08T05:00:00Z",
      tone: "destructive",
    },
    {
      id: "evt-003",
      restaurantId: "rst-010",
      userId: null,
      title: "Restaurant suspended",
      detail: "Registration details require a platform review.",
      actor: demoAdmin.name,
      occurredAt: "2026-09-09T05:00:00Z",
      tone: "destructive",
    },
    {
      id: "evt-004",
      restaurantId: "rst-008",
      userId: "usr-008",
      title: "Restaurant archived",
      detail: "Archived at the owner's request. Historical records retained.",
      actor: demoAdmin.name,
      occurredAt: "2026-08-28T05:00:00Z",
      tone: "warning",
    },
    {
      id: "evt-005",
      restaurantId: "rst-009",
      userId: "usr-009",
      title: "Restaurant activated",
      detail:
        "Registration review completed and lifecycle status set to active.",
      actor: demoAdmin.name,
      occurredAt: "2026-09-07T05:00:00Z",
      tone: "success",
    },
    {
      id: "evt-006",
      restaurantId: null,
      userId: "usr-admin",
      title: "Platform preferences reviewed",
      detail: "Reporting timezone and notification preferences reviewed.",
      actor: demoAdmin.name,
      occurredAt: "2026-09-06T05:00:00Z",
      tone: "info",
    },
  ] satisfies ActivityEvent[]
).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

export const restaurantPerformance = [
  { restaurantId: "rst-001", grossSalesMinor: 24800000, transactions: 620 },
  { restaurantId: "rst-002", grossSalesMinor: 18600000, transactions: 744 },
  { restaurantId: "rst-003", grossSalesMinor: 17500000, transactions: 350 },
  { restaurantId: "rst-004", grossSalesMinor: 16400000, transactions: 328 },
  { restaurantId: "rst-005", grossSalesMinor: 14200000, transactions: 568 },
  { restaurantId: "rst-006", grossSalesMinor: 4200000, transactions: 210 },
  { restaurantId: "rst-007", grossSalesMinor: 15600000, transactions: 390 },
  { restaurantId: "rst-008", grossSalesMinor: 0, transactions: 0 },
  { restaurantId: "rst-009", grossSalesMinor: 6700000, transactions: 268 },
  { restaurantId: "rst-010", grossSalesMinor: 1800000, transactions: 36 },
  { restaurantId: "rst-011", grossSalesMinor: 0, transactions: 0 },
  { restaurantId: "rst-012", grossSalesMinor: 0, transactions: 0 },
];

export const summary = {
  restaurants: restaurants.length,
  activeRestaurants: restaurants.filter((item) => item.status === "ACTIVE")
    .length,
  pendingRestaurants: restaurants.filter((item) => item.status === "PENDING")
    .length,
  users: users.length,
  grossSalesMinor: restaurantPerformance.reduce(
    (total, item) => total + item.grossSalesMinor,
    0,
  ),
  transactions: restaurantPerformance.reduce(
    (total, item) => total + item.transactions,
    0,
  ),
};

// Percentage allocation totals 100; the chart and the summary use the same total.
export const salesTrend = [8, 9, 7, 10, 13, 14, 9, 8, 10, 12].map(
  (percent, index) => ({
    label: `Sep ${index + 1}`,
    grossSalesMinor: (summary.grossSalesMinor * percent) / 100,
  }),
);

export function getRestaurant(id: string) {
  return restaurants.find((item) => item.id === id);
}
export function getUser(id: string) {
  return users.find((item) => item.id === id);
}
export function getRestaurantActivity(id: string) {
  return activity.filter((item) => item.restaurantId === id);
}
export function getUserActivity(id: string) {
  return activity.filter((item) => item.userId === id);
}

export function getRestaurantList(): RestaurantListItem[] {
  return restaurants
    .map((restaurant) => {
      const owner = getUser(restaurant.ownerId)!;
      return { ...restaurant, ownerName: owner.name, ownerEmail: owner.email };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getUserList(): UserListItem[] {
  return users.map((user) => ({
    ...user,
    restaurantName: user.restaurantId
      ? getRestaurant(user.restaurantId)!.name
      : null,
  }));
}
