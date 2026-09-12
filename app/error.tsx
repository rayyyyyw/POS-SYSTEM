"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AppError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-start justify-center gap-5 px-6" role="alert">
    <h1 className="text-2xl font-semibold tracking-tight">This page is temporarily unavailable</h1>
    <p className="text-sm leading-6 text-muted-foreground">We couldn&apos;t load the requested information. Please try again in a moment.</p>
    <div className="flex gap-3"><Button onClick={retry}>Try again</Button><Button asChild variant="outline"><Link href="/">Back to home</Link></Button></div>
  </main>;
}
