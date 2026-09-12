import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActivityList } from "@/components/admin/activity-list";
import {
  DetailList,
  IdentityMark,
  PageHeading,
  Panel,
  StatusBadge,
} from "@/components/admin/page-ui";
import { getRestaurant, getUser, getUserActivity } from "@/lib/mock-data/admin";
import { formatDate, labelFor } from "@/lib/admin/format";

export const metadata: Metadata = { title: "User details" };

export default async function UserDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = getUser(id);
  if (!user) notFound();
  const restaurant = user.restaurantId
    ? getRestaurant(user.restaurantId)
    : null;
  return (
    <>
      <PageHeading
        title={user.name}
        description="Individual identity and platform account information."
        breadcrumbs={[
          { label: "Users", href: "/admin/users" },
          { label: user.name },
        ]}
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/users">
              <ArrowLeft aria-hidden="true" />
              All users
            </Link>
          </Button>
        }
      />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
        <Panel title="User profile">
          <div className="mb-6 flex items-center gap-4">
            <IdentityMark name={user.name} large />
            <div>
              <p className="font-semibold">{user.name}</p>
              <Badge variant="outline" className="mt-2 rounded-md font-normal">
                {labelFor(user.role)}
              </Badge>
            </div>
          </div>
          <DetailList
            items={[
              { label: "Email", value: user.email },
              {
                label: "Account status",
                value: <StatusBadge status={user.status} />,
              },
              {
                label: "User ID",
                value: <span className="font-mono text-xs">{user.id}</span>,
              },
              { label: "Registered", value: formatDate(user.createdAt) },
            ]}
          />
        </Panel>
        <Panel
          title="Platform association"
          description="Context for this user's platform role."
        >
          {restaurant ? (
            <>
              <div className="mb-5 flex items-center gap-3">
                <IdentityMark name={restaurant.name} />
                <div>
                  <p className="text-sm font-medium">{restaurant.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {restaurant.city}
                  </p>
                </div>
              </div>
              <StatusBadge status={restaurant.status} />
              <Button asChild variant="outline" className="mt-5 w-full">
                <Link href={`/admin/restaurants/${restaurant.id}`}>
                  View restaurant
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              </Button>
            </>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              Platform administrator. This sample user is not associated with an
              individual restaurant.
            </p>
          )}
          <p className="mt-5 text-xs leading-5 text-muted-foreground">
            Roles and statuses are sample labels in this phase. They do not
            grant or enforce access.
          </p>
        </Panel>
      </div>
      <Panel
        title="Recent account activity"
        description="Sample account and platform events · Asia/Manila"
      >
        <ActivityList events={getUserActivity(id)} />
      </Panel>
    </>
  );
}
