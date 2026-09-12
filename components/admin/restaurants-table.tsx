import { DateLabel } from "@/components/admin/date-label";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { restaurantStatuses, type DirectoryParams, type DirectoryResult, type RestaurantDTO } from "@/lib/admin/types";
import { labelFor } from "@/lib/admin/format";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, IdentityMark, StatusBadge } from "@/components/admin/page-ui";
import { DirectoryPagination, DirectorySearch, paramValue } from "@/components/admin/directory-controls";

export function RestaurantsTable({ result, params }: { result: DirectoryResult<RestaurantDTO>; params: DirectoryParams }) {
  return <section aria-label="Restaurant directory" className="min-w-0 overflow-hidden rounded-lg border bg-card">
    <form action="/admin/restaurants" method="get" className="flex flex-wrap items-center gap-3 border-b p-5">
      <DirectorySearch value={paramValue(params, "q")} label="Search restaurants" placeholder="Search restaurants, city, or email…" />
      <NativeSelect name="status" aria-label="Restaurant status" defaultValue={paramValue(params, "status")} className="h-10"><NativeSelectOption value="">All statuses</NativeSelectOption>{restaurantStatuses.map((status) => <NativeSelectOption key={status} value={status}>{labelFor(status)}</NativeSelectOption>)}</NativeSelect>
      <NativeSelect name="sort" aria-label="Sort restaurants" defaultValue={paramValue(params, "sort") || "newest"} className="h-10"><NativeSelectOption value="newest">Newest first</NativeSelectOption><NativeSelectOption value="oldest">Oldest first</NativeSelectOption><NativeSelectOption value="name">Name A–Z</NativeSelectOption></NativeSelect>
      <Button type="submit" variant="outline">Apply</Button><Button asChild variant="ghost"><Link href="/admin/restaurants">Clear</Link></Button>
    </form>
    {result.items.length ? <Table className="min-w-[780px]">
      <caption className="sr-only">Restaurants, owners, registration dates, and lifecycle statuses</caption>
      <TableHeader className="bg-background"><TableRow><TableHead className="pl-5">Restaurant</TableHead><TableHead>Owner</TableHead><TableHead>Registered</TableHead><TableHead>Status</TableHead><TableHead><span className="sr-only">View</span></TableHead></TableRow></TableHeader>
      <TableBody>{result.items.map((restaurant) => <TableRow key={restaurant.id}>
        <TableCell className="py-5 pl-5"><div className="flex items-center gap-3"><IdentityMark name={restaurant.name} /><div><Link href={`/admin/restaurants/${restaurant.id}`} className="rounded font-medium hover:text-primary hover:underline">{restaurant.name}</Link><p className="mt-1 text-[11px] text-muted-foreground">{restaurant.slug} · {restaurant.city || "City not set"}</p></div></div></TableCell>
        <TableCell><p className="text-xs font-medium">{restaurant.ownerName ?? "Awaiting owner"}</p><p className="mt-1 text-[11px] text-muted-foreground">{restaurant.ownerEmail ?? "Invitation pending"}</p></TableCell>
        <TableCell className="text-xs text-muted-foreground"><DateLabel value={restaurant.createdAt} /></TableCell>
        <TableCell><StatusBadge status={restaurant.status} /></TableCell><TableCell className="pr-5"><Button asChild variant="ghost" size="icon-sm"><Link href={`/admin/restaurants/${restaurant.id}`} aria-label={`View ${restaurant.name}`}><ArrowUpRight aria-hidden="true" /></Link></Button></TableCell>
      </TableRow>)}</TableBody>
    </Table> : <EmptyState title="No restaurants found" description="Create your first restaurant or adjust the search filters." action={<Button asChild variant="outline"><Link href="/admin/restaurants/create">Create restaurant</Link></Button>} />}
    <p className="px-5 py-3 text-[11px] text-muted-foreground md:hidden">Scroll the table horizontally for all details.</p>
    <DirectoryPagination {...result} params={params} path="/admin/restaurants" />
  </section>;
}
