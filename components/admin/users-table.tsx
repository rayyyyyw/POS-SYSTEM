"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { userRoles, type UserListItem } from "@/lib/admin/types";
import { formatDate, labelFor } from "@/lib/admin/format";
import { Button } from "@/components/ui/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  EmptyState,
  IdentityMark,
  StatusBadge,
} from "@/components/admin/page-ui";
import {
  DirectoryPagination,
  DirectorySearch,
} from "@/components/admin/directory-controls";

export function UsersTable({
  data,
  restaurants,
}: {
  data: UserListItem[];
  restaurants: { id: string; name: string }[];
}) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("ALL");
  const [restaurant, setRestaurant] = useState("ALL");
  const [page, setPage] = useState(1);
  const query = search.trim().toLowerCase();
  const filtered = data.filter(
    (user) =>
      (role === "ALL" || user.role === role) &&
      (restaurant === "ALL" ||
        (restaurant === "PLATFORM"
          ? user.restaurantId === null
          : user.restaurantId === restaurant)) &&
      [user.name, user.email].some((value) =>
        value.toLowerCase().includes(query),
      ),
  );
  function clear() {
    setSearch("");
    setRole("ALL");
    setRestaurant("ALL");
    setPage(1);
  }
  return (
    <section
      aria-label="Platform user directory"
      className="min-w-0 overflow-hidden rounded-lg border bg-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
        <DirectorySearch
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          label="Search users"
          placeholder="Search users by name or email…"
        />
        <div className="flex flex-wrap gap-2">
          <NativeSelect
            aria-label="Filter by role"
            value={role}
            onChange={(event) => {
              setRole(event.target.value);
              setPage(1);
            }}
            className="h-10"
          >
            <NativeSelectOption value="ALL">All roles</NativeSelectOption>
            {userRoles.map((value) => (
              <NativeSelectOption key={value} value={value}>
                {labelFor(value)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label="Filter by restaurant"
            value={restaurant}
            onChange={(event) => {
              setRestaurant(event.target.value);
              setPage(1);
            }}
            className="h-10 max-w-48"
          >
            <NativeSelectOption value="ALL">All restaurants</NativeSelectOption>
            <NativeSelectOption value="PLATFORM">
              Platform only
            </NativeSelectOption>
            {restaurants.map((value) => (
              <NativeSelectOption key={value.id} value={value.id}>
                {value.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {(search || role !== "ALL" || restaurant !== "ALL") && (
            <Button variant="ghost" onClick={clear}>
              Clear
            </Button>
          )}
        </div>
      </div>
      {filtered.length ? (
        <Table className="min-w-[860px]">
          <caption className="sr-only">
            Platform users, roles, associated restaurants, statuses and
            registration dates
          </caption>
          <TableHeader className="bg-background">
            <TableRow>
              <TableHead className="pl-5">User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Restaurant</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.slice((page - 1) * 8, page * 8).map((user) => (
              <TableRow key={user.id}>
                <TableCell className="py-5 pl-5">
                  <div className="flex items-center gap-3">
                    <IdentityMark name={user.name} />
                    <div>
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="rounded font-medium hover:text-primary hover:underline"
                      >
                        {user.name}
                      </Link>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className="rounded-md text-[10px] font-normal"
                  >
                    {labelFor(user.role)}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">
                  {user.restaurantId ? (
                    <Link
                      href={`/admin/restaurants/${user.restaurantId}`}
                      className="rounded hover:text-primary hover:underline"
                    >
                      {user.restaurantName}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">Platform</span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={user.status} />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(user.createdAt)}
                </TableCell>
                <TableCell className="pr-5">
                  <Button variant="ghost" size="icon-sm" asChild>
                    <Link
                      href={`/admin/users/${user.id}`}
                      aria-label={`View ${user.name}`}
                    >
                      <ArrowUpRight aria-hidden="true" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState
          action={
            <Button variant="outline" onClick={clear}>
              Clear filters
            </Button>
          }
        />
      )}
      <p className="px-5 pt-3 text-[11px] text-muted-foreground md:hidden">
        Scroll the table horizontally to see all details and actions.
      </p>
      <DirectoryPagination
        page={page}
        pageSize={8}
        total={filtered.length}
        onPageChange={setPage}
      />
    </section>
  );
}
