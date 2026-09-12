import type { Metadata } from "next";
import { PageHeading } from "@/components/admin/page-ui";
import { SettingsForm } from "@/components/admin/settings-form";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeading
        eyebrow="System"
        title="Platform settings"
        description="Manage the platform's identity, notification preferences, and reporting defaults."
      />
      <SettingsForm />
    </>
  );
}
