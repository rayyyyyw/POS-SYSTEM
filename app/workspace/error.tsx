"use client";

import { Button } from "@/components/ui/button";

export default function WorkspaceError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">We couldn&apos;t load your account</h1>
      <p className="text-sm leading-6 text-muted-foreground">Your account information is temporarily unavailable. Please try again.</p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
