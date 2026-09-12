import type { Metadata } from "next";
import { AdminHeader, AdminSidebar } from "@/components/admin/admin-navigation";
import { requireAdmin } from "@/lib/server/authorization";
import { getPlatformSettings } from "@/lib/server/queries";

export const metadata: Metadata = {
  title: {
    default: "Platform Admin | POS System",
    template: "%s | POS System Admin",
  },
  description:
    "Restaurant onboarding, accounts, and platform administration for POS System.",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  const settings = await getPlatformSettings();
  return (
    <div className="min-h-svh">
      <a
        href="#admin-content"
        className="sr-only z-100 rounded-md bg-card px-4 py-3 text-sm focus:fixed focus:left-4 focus:top-4 focus:not-sr-only"
      >
        Skip to content
      </a>
      <AdminSidebar platformName={settings.name} />
      <div className="min-w-0 lg:pl-60">
        <AdminHeader profile={admin} platformName={settings.name} />
        <main
          id="admin-content"
          tabIndex={-1}
          className="mx-auto max-w-375 space-y-7 px-4 py-7 outline-none sm:px-6 lg:px-8 lg:py-8"
        >
          {children}
        </main>
        <footer className="mx-auto flex max-w-375 flex-col justify-between gap-2 px-4 pb-6 pt-2 text-[11px] text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <span>{settings.name} · Platform Admin</span>
          {settings.supportEmail ? <a href={`mailto:${settings.supportEmail}`} className="hover:text-primary hover:underline">Contact support</a> : <span>Account and restaurant administration</span>}
        </footer>
      </div>
    </div>
  );
}
