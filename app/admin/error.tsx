"use client";

import { Button } from "@/components/ui/button";

export default function AdminError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <section role="alert" className="rounded-lg border bg-card p-8"><h1 className="text-lg font-semibold">Platform data could not be loaded</h1><p className="mb-5 mt-2 max-w-xl text-sm leading-6 text-muted-foreground">The request failed. Your existing records have not been replaced. Please try again; if this continues, check the application and database connection.</p><Button onClick={retry} variant="outline">Try again</Button></section>;
}
