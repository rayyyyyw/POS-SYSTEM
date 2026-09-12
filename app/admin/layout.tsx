import type { Metadata } from "next";
import { AdminHeader, AdminSidebar } from "@/components/admin/admin-navigation";
import { demoAdmin } from "@/lib/mock-data/admin";

export const metadata: Metadata = {
  title: {
    default: "Platform Admin | POS System",
    template: "%s | POS System Admin",
  },
  description:
    "Platform administration for POS System. Phase 1 with sample data.",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh">
      <a
        href="#admin-content"
        className="sr-only z-[100] rounded-md bg-card px-4 py-3 text-sm focus:fixed focus:left-4 focus:top-4 focus:not-sr-only"
      >
        Skip to content
      </a>
      <AdminSidebar />
      <div className="min-w-0 lg:pl-60">
        <AdminHeader profile={demoAdmin} />
        <main
          id="admin-content"
          tabIndex={-1}
          className="mx-auto max-w-[1500px] space-y-7 px-4 py-7 outline-none sm:px-6 lg:px-8 lg:py-8"
        >
          {children}
        </main>
        <footer className="mx-auto flex max-w-[1500px] flex-col justify-between gap-2 px-4 pb-6 pt-2 text-[11px] text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <span>POS System · Platform Admin</span>
          <span>Sample data only. Changes are not saved.</span>
        </footer>
      </div>
    </div>
  );
}
