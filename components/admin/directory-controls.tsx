import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { DirectoryParams } from "@/lib/admin/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function paramValue(params: DirectoryParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export function DirectorySearch({ value, label, placeholder }: { value: string; label: string; placeholder: string }) {
  return <div className="relative w-full sm:max-w-sm">
    <Search className="absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden="true" />
    <Input type="search" name="q" aria-label={label} placeholder={placeholder} defaultValue={value} maxLength={200} className="h-10 bg-card pl-9" />
  </div>;
}

export function DirectoryPagination({ page, pageSize, total, params, path }: {
  page: number; pageSize: number; total: number; params: DirectoryParams; path: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  function pageUrl(nextPage: number) {
    const query = new URLSearchParams();
    for (const key of Object.keys(params)) {
      const value = paramValue(params, key);
      if (value && key !== "page") query.set(key, value);
    }
    query.set("page", String(nextPage));
    return `${path}?${query}`;
  }
  return <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4">
    <p role="status" className="text-xs text-muted-foreground">{total === 0 ? "0 results" : `Showing ${Math.min((page - 1) * pageSize + 1, total)}–${Math.min(page * pageSize, total)} of ${total}`}</p>
    <nav aria-label="Pagination" className="flex items-center gap-2">
      {page > 1 ? <Button asChild variant="outline" size="icon-sm"><Link href={pageUrl(page - 1)} aria-label="Previous page"><ChevronLeft aria-hidden="true" /></Link></Button> : <Button disabled variant="outline" size="icon-sm" aria-label="Previous page"><ChevronLeft aria-hidden="true" /></Button>}
      <span className="px-2 text-xs text-muted-foreground">Page {page} of {pages}</span>
      {page < pages ? <Button asChild variant="outline" size="icon-sm"><Link href={pageUrl(page + 1)} aria-label="Next page"><ChevronRight aria-hidden="true" /></Link></Button> : <Button disabled variant="outline" size="icon-sm" aria-label="Next page"><ChevronRight aria-hidden="true" /></Button>}
    </nav>
  </div>;
}
