import type { Metadata } from "next";
import { getRestaurantContext } from "@/lib/server/restaurant/authorization";
import { getWorkspaceMemberships } from "@/lib/server/queries";
import { RestaurantShell } from "@/components/restaurant/restaurant-shell";

export const metadata: Metadata = {
  title: {
    default: "Restaurant workspace | POS System",
    template: "%s | Restaurant workspace",
  },
  robots: { index: false, follow: false },
};

export default async function RestaurantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;
  const context = await getRestaurantContext(restaurantId);
  const memberships = await getWorkspaceMemberships();
  return (
    <RestaurantShell {...context} memberships={memberships}>
      {children}
    </RestaurantShell>
  );
}
