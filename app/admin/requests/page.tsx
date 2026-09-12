import type { Metadata } from "next";
import Link from "next/link";
import { reviewAccessRequest } from "@/app/actions/admin";
import { ActionForm, FormField } from "@/components/admin/action-form";
import { DirectoryPagination, DirectorySearch, paramValue } from "@/components/admin/directory-controls";
import { EmptyState, PageHeading, StatusBadge } from "@/components/admin/page-ui";
import { DateLabel } from "@/components/admin/date-label";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { listAccessRequests } from "@/lib/server/queries";
import type { DirectoryParams } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Access requests" };

export default async function AccessRequestsPage({ searchParams }: { searchParams: Promise<DirectoryParams> }) {
  const params = await searchParams;
  const result = await listAccessRequests(params);
  return <>
    <PageHeading eyebrow="Management" title="Early-access requests" description="Review interested restaurants, follow up, and create approved business accounts." />
    <section className="overflow-hidden rounded-lg border bg-card" aria-label="Early-access request directory">
      <form action="/admin/requests" method="get" className="flex flex-wrap items-center gap-3 border-b p-5"><DirectorySearch value={paramValue(params, "q")} label="Search access requests" placeholder="Search people, restaurants, or email…" /><NativeSelect name="status" aria-label="Request status" defaultValue={paramValue(params, "status")} className="h-10"><NativeSelectOption value="">All statuses</NativeSelectOption><NativeSelectOption value="NEW">New</NativeSelectOption><NativeSelectOption value="REVIEWED">Reviewed</NativeSelectOption><NativeSelectOption value="CLOSED">Closed</NativeSelectOption></NativeSelect><Button type="submit" variant="outline">Apply</Button><Button asChild variant="ghost"><Link href="/admin/requests">Clear</Link></Button></form>
      {result.items.length ? <ul className="divide-y">{result.items.map((request) => {
        const query = new URLSearchParams({ requestId: request.id });
        return <li key={request.id} className="grid items-start gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.6fr)]"><div><div className="flex flex-wrap items-center gap-3"><h2 className="text-sm font-semibold">{request.restaurantName}</h2><StatusBadge status={request.status} /></div><p className="mt-3 text-sm">{request.name} · {request.city}</p><p className="mt-1 break-all text-sm text-muted-foreground">{request.email}</p><p className="mt-2 text-xs text-muted-foreground">Requested <DateLabel value={request.createdAt} /></p>{request.status !== "CLOSED" && <Button asChild variant="outline" className="mt-5"><Link href={`/admin/restaurants/create?${query}`}>Create restaurant and invite owner</Link></Button>}</div><ActionForm action={reviewAccessRequest} submitLabel="Save review" variant="outline"><input type="hidden" name="id" value={request.id} /><FormField name="status" label="Review status" defaultValue={request.status} options={[{ value: "NEW", label: "New" }, { value: "REVIEWED", label: "Reviewed" }, { value: "CLOSED", label: "Closed" }]} /></ActionForm></li>;
      })}</ul> : <EmptyState title="No access requests found" description="New submissions from the public website will appear here. Adjust your filters to see other requests." />}
      <DirectoryPagination {...result} params={params} path="/admin/requests" />
    </section>
    <p className="text-xs leading-6 text-muted-foreground">Creating a restaurant from a request closes that request after the business is saved. Marking a request reviewed or closed does not send an email or create an account.</p>
  </>;
}
