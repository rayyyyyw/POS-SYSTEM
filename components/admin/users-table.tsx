import { DateLabel } from "@/components/admin/date-label";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { DirectoryParams, DirectoryResult, UserDTO } from "@/lib/admin/types";
import { labelFor } from "@/lib/admin/format";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, IdentityMark, StatusBadge } from "@/components/admin/page-ui";
import { DirectoryPagination, DirectorySearch, paramValue } from "@/components/admin/directory-controls";

export function UsersTable({ result, params, restaurants }: { result: DirectoryResult<UserDTO>; params: DirectoryParams; restaurants: { id: string; name: string }[] }) {
  return <section aria-label="User directory" className="min-w-0 overflow-hidden rounded-lg border bg-card">
    <form action="/admin/users" method="get" className="flex flex-wrap items-center gap-3 border-b p-5">
      <DirectorySearch value={paramValue(params, "q")} label="Search users" placeholder="Search users by name or email…" />
      <NativeSelect name="role" aria-label="Filter by role" defaultValue={paramValue(params, "role")} className="h-10"><NativeSelectOption value="">All roles</NativeSelectOption>{["ADMIN", "OWNER", "MANAGER", "CASHIER"].map((role) => <NativeSelectOption key={role} value={role}>{role === "ADMIN" ? "Platform administrator" : labelFor(role)}</NativeSelectOption>)}</NativeSelect>
      <NativeSelect name="restaurantId" aria-label="Filter by restaurant" defaultValue={paramValue(params, "restaurantId")} className="h-10 max-w-48"><NativeSelectOption value="">All restaurants</NativeSelectOption>{restaurants.map((restaurant) => <NativeSelectOption key={restaurant.id} value={restaurant.id}>{restaurant.name}</NativeSelectOption>)}</NativeSelect>
      <NativeSelect name="status" aria-label="User account status" defaultValue={paramValue(params, "status")} className="h-10"><NativeSelectOption value="">All statuses</NativeSelectOption><NativeSelectOption value="ACTIVE">Active</NativeSelectOption><NativeSelectOption value="DISABLED">Disabled</NativeSelectOption></NativeSelect>
      <Button type="submit" variant="outline">Apply</Button><Button asChild variant="ghost"><Link href="/admin/users">Clear</Link></Button>
    </form>
    {result.items.length ? <Table className="min-w-[820px]">
      <caption className="sr-only">Users and their individual restaurant memberships</caption>
      <TableHeader className="bg-background"><TableRow><TableHead className="pl-5">User</TableHead><TableHead>Access</TableHead><TableHead>Status</TableHead><TableHead>Registered</TableHead><TableHead><span className="sr-only">View</span></TableHead></TableRow></TableHeader>
      <TableBody>{result.items.map((user) => <TableRow key={user.id}>
        <TableCell className="py-5 pl-5"><div className="flex items-center gap-3"><IdentityMark name={user.name} /><div><Link href={`/admin/users/${user.id}`} className="rounded font-medium hover:text-primary hover:underline">{user.name}</Link><p className="mt-1 text-[11px] text-muted-foreground">{user.email}</p></div></div></TableCell>
        <TableCell className="space-y-1 text-xs">{user.platformRole === "ADMIN" && <p className="font-medium">Platform administrator</p>}{user.memberships.map((membership) => <p key={membership.id}><Link href={`/admin/restaurants/${membership.restaurantId}`} className="hover:text-primary hover:underline">{membership.restaurantName}</Link><span className="text-muted-foreground"> · {labelFor(membership.role)}{membership.status === "DISABLED" ? " (disabled)" : ""}</span></p>)}{user.platformRole !== "ADMIN" && !user.memberships.length && <span className="text-muted-foreground">No restaurant memberships</span>}</TableCell>
        <TableCell><StatusBadge status={user.status} /></TableCell><TableCell className="text-xs text-muted-foreground"><DateLabel value={user.createdAt} /></TableCell><TableCell className="pr-5"><Button asChild variant="ghost" size="icon-sm"><Link href={`/admin/users/${user.id}`} aria-label={`View ${user.name}`}><ArrowUpRight aria-hidden="true" /></Link></Button></TableCell>
      </TableRow>)}</TableBody>
    </Table> : <EmptyState title="No users found" description="Invite an owner from a restaurant, or adjust your search filters." />}
    <p className="px-5 py-3 text-[11px] text-muted-foreground md:hidden">Scroll the table horizontally for all details.</p>
    <DirectoryPagination {...result} params={params} path="/admin/users" />
  </section>;
}
