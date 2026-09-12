"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, History, MoreHorizontal, Pencil } from "lucide-react";
import { restaurantStatuses, type RestaurantListItem } from "@/lib/admin/types";
import { formatDate, labelFor } from "@/lib/admin/format";
import { Button } from "@/components/ui/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  EmptyState,
  IdentityMark,
  StatusBadge,
} from "@/components/admin/page-ui";
import {
  DirectoryPagination,
  DirectorySearch,
} from "@/components/admin/directory-controls";

export function RestaurantsTable({ data }: { data: RestaurantListItem[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const query = search.trim().toLowerCase();
  const filtered = data.filter(
    (item) =>
      (status === "ALL" || item.status === status) &&
      [
        item.name,
        item.slug,
        item.ownerName,
        item.email,
        item.ownerEmail,
        item.city,
      ].some((value) => value.toLowerCase().includes(query)),
  );
  function clear() {
    setSearch("");
    setStatus("ALL");
    setPage(1);
  }
  return (
    <section
      aria-label="Restaurant directory"
      className="min-w-0 overflow-hidden rounded-lg border bg-card"
    >
      <div className="flex flex-col justify-between gap-3 border-b p-5 sm:flex-row">
        <DirectorySearch
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          label="Search restaurants"
          placeholder="Search restaurants, owners, or email…"
        />
        <div className="flex flex-wrap items-center gap-2">
          <NativeSelect
            aria-label="Filter by restaurant status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="h-10"
          >
            <NativeSelectOption value="ALL">All statuses</NativeSelectOption>
            {restaurantStatuses.map((value) => (
              <NativeSelectOption key={value} value={value}>
                {labelFor(value)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {(search || status !== "ALL") && (
            <Button variant="ghost" onClick={clear}>
              Clear
            </Button>
          )}
        </div>
      </div>
      {filtered.length ? (
        <Table className="min-w-[780px]">
          <caption className="sr-only">
            Restaurants, owners, contacts, registration dates and lifecycle
            statuses
          </caption>
          <TableHeader className="bg-background">
            <TableRow>
              <TableHead className="pl-5">Restaurant</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-5">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered
              .slice((page - 1) * pageSize, page * pageSize)
              .map((restaurant) => (
                <TableRow key={restaurant.id}>
                  <TableCell className="py-5 pl-5">
                    <div className="flex items-center gap-3">
                      <IdentityMark name={restaurant.name} />
                      <div>
                        <Link
                          href={`/admin/restaurants/${restaurant.id}`}
                          className="rounded text-sm font-medium hover:text-primary hover:underline"
                        >
                          {restaurant.name}
                        </Link>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {restaurant.slug} <span className="px-1">·</span>{" "}
                          {restaurant.city}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs font-medium">
                      {restaurant.ownerName}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {restaurant.email}
                    </p>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(restaurant.createdAt)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={restaurant.status} />
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Actions for ${restaurant.name}`}
                        >
                          <MoreHorizontal aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/restaurants/${restaurant.id}`}>
                            <Eye aria-hidden="true" />
                            View restaurant
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/admin/restaurants/${restaurant.id}/edit`}
                          >
                            <Pencil aria-hidden="true" />
                            Edit restaurant
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/admin/restaurants/${restaurant.id}/activity`}
                          >
                            <History aria-hidden="true" />
                            View activity
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
        pageSize={pageSize}
        total={filtered.length}
        onPageChange={setPage}
      />
    </section>
  );
}
