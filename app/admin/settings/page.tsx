import type { Metadata } from "next";
import { PageHeading } from "@/components/admin/page-ui";
import { SettingsForm } from "@/components/admin/settings-form";
import { getPlatformSettings } from "@/lib/server/queries";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const settings = await getPlatformSettings();
  return <><PageHeading eyebrow="System" title="Platform settings" description="Manage the platform identity, support contact, and date display." /><SettingsForm settings={settings} /></>;
}
