import type { Metadata } from "next";
import { PageHeading } from "@/components/admin/page-ui";
import { UsersTable } from "@/components/admin/users-table";
import { getUserList, restaurants, users } from "@/lib/mock-data/admin";

export const metadata: Metadata = { title: "Users" };

export default function UsersPage() {
  return (
    <>
      <PageHeading
        eyebrow="Management"
        title="Users"
        description="An overview of individual users across restaurants and the platform."
      />
      <div className="flex flex-wrap gap-6 text-xs text-muted-foreground">
        <span>
          <strong className="text-foreground">{users.length}</strong> total
          users
        </span>
        <span>
          <strong className="text-primary">
            {users.filter((user) => user.status === "ACTIVE").length}
          </strong>{" "}
          active
        </span>
        <span>
          <strong className="text-info">
            {users.filter((user) => user.status === "INVITED").length}
          </strong>{" "}
          invited · sample status
        </span>
      </div>
      <UsersTable
        data={getUserList()}
        restaurants={restaurants.map(({ id, name }) => ({ id, name }))}
      />
    </>
  );
}
