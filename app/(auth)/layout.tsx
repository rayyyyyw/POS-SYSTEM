import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, UtensilsCrossed } from "lucide-react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-6 sm:px-8">
        <Link href="/" className="inline-flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <UtensilsCrossed className="size-4" aria-hidden="true" />
          </span>
          POS System
        </Link>
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to home
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="px-5 pb-7 text-center text-xs text-muted-foreground">
        Your account. Your restaurant team. One place to begin.
      </footer>
    </div>
  );
}
