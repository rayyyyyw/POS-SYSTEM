import { saveSettings } from "@/app/actions/admin";
import { ActionForm, FormField } from "@/components/admin/action-form";
import { Panel } from "@/components/admin/page-ui";

export function SettingsForm({ settings }: { settings: { name: string; supportEmail: string; timezone: "Asia/Manila" | "UTC"; dateFormat: "DMY" | "YMD"; version: number } }) {
  return <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
    <ActionForm action={saveSettings} submitLabel="Save settings">
      <input type="hidden" name="version" value={settings.version} />
      <Panel title="Platform identity" description="The name and support contact used across the platform."><div className="grid gap-5 sm:grid-cols-2"><FormField name="name" label="Platform name" defaultValue={settings.name} required maxLength={100} /><FormField name="supportEmail" label="Support email" defaultValue={settings.supportEmail} type="email" maxLength={254} hint="Leave blank until a monitored support address is available." /></div></Panel>
      <Panel title="Date and time display" description="Applies to platform administration dates and activity."><div className="grid gap-5 sm:grid-cols-2"><FormField name="timezone" label="Timezone" defaultValue={settings.timezone} options={[{ value: "Asia/Manila", label: "Asia/Manila (UTC+08)" }, { value: "UTC", label: "UTC" }]} /><FormField name="dateFormat" label="Date format" defaultValue={settings.dateFormat} options={[{ value: "DMY", label: "Day, month, year" }, { value: "YMD", label: "Year-month-day" }]} /></div></Panel>
    </ActionForm>
    <aside className="space-y-6"><Panel title="Account security"><p className="text-xs leading-6 text-muted-foreground">Access is enforced on the server. Manage account suspension and active sessions from each user&apos;s profile.</p><p className="mt-4 text-xs leading-6 text-muted-foreground">Multi-factor authentication and configurable notification subscriptions are not available in this release.</p></Panel></aside>
  </div>;
}
