import type { MemberRole, RestaurantStatus } from "@/generated/prisma/enums";

export const restaurantPermissions = {
  overview: ["OWNER", "MANAGER", "CASHIER"],
  onboarding: ["OWNER", "MANAGER"],
  settingsRead: ["OWNER", "MANAGER"],
  settingsWrite: ["OWNER"],
  teamRead: ["OWNER", "MANAGER"],
  teamWrite: ["OWNER"],
} as const satisfies Record<string, readonly MemberRole[]>;

export type RestaurantPermission = keyof typeof restaurantPermissions;

export function canAccessRestaurant(
  role: MemberRole,
  status: RestaurantStatus,
  permission: RestaurantPermission,
) {
  const roles: readonly MemberRole[] = restaurantPermissions[permission];
  return (
    roles.includes(role) &&
    (status === "ACTIVE" || (status === "PENDING" && role === "OWNER"))
  );
}

export const restaurantNavigation = [
  { label: "Overview", segment: "", permission: "overview" },
  { label: "Onboarding", segment: "/onboarding", permission: "onboarding" },
  { label: "Team", segment: "/team", permission: "teamRead" },
  { label: "Settings", segment: "/settings", permission: "settingsRead" },
] as const;

export function buildOnboarding(input: {
  status: RestaurantStatus;
  profileComplete: boolean;
  settingsComplete: boolean;
  ownerPresent: boolean;
  staffPresent: boolean;
}) {
  const steps = [
    {
      key: "activation",
      label: "Restaurant activated",
      complete: input.status === "ACTIVE",
      detail: "The platform administrator activates your restaurant.",
      segment: null,
    },
    {
      key: "profile",
      label: "Restaurant profile",
      complete: input.profileComplete,
      detail: "Add your business contact and address.",
      segment: "/settings",
    },
    {
      key: "settings",
      label: "Regional settings",
      complete: input.settingsComplete,
      detail: "Save your currency and timezone.",
      segment: "/settings",
    },
    {
      key: "owner",
      label: "Owner confirmed",
      complete: input.ownerPresent,
      detail: "An active, verified owner manages this restaurant.",
      segment: "/team",
    },
    {
      key: "team",
      label: "First team member",
      complete: input.staffPresent,
      detail: "Add a manager or cashier, or send a valid invitation.",
      segment: "/team",
    },
  ];
  return {
    steps,
    completed: steps.filter((step) => step.complete).length,
    total: steps.length,
  };
}
