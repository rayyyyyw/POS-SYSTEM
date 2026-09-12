"use client";

import { useRef, useState, type FormEvent } from "react";
import { Bell, Eye, Info, LockKeyhole, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DetailList, Panel } from "@/components/admin/page-ui";

type SettingsPreview = {
  name: string;
  supportEmail: string;
  timezone: string;
  dateFormat: string;
  registrationNotifications: boolean;
  lifecycleNotifications: boolean;
};

export function SettingsForm() {
  const [preview, setPreview] = useState<SettingsPreview | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("platformName") ?? "").trim();
    if (!name) {
      const input = form.elements.namedItem("platformName") as HTMLInputElement;
      input.setCustomValidity("Enter a platform name.");
      input.reportValidity();
      return;
    }
    setPreview({
      name,
      supportEmail: String(data.get("supportEmail") ?? "").trim(),
      timezone: String(data.get("timezone")),
      dateFormat: String(data.get("dateFormat")),
      registrationNotifications: data.has("registrationNotifications"),
      lifecycleNotifications: data.has("lifecycleNotifications"),
    });
    requestAnimationFrame(() => previewRef.current?.focus());
  }
  return (
    <form
      onSubmit={submit}
      onChange={() => setPreview(null)}
      onReset={() => setPreview(null)}
      className="space-y-6"
    >
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Panel
            title="General settings"
            description="The platform's public name and support contact."
            action={
              <Settings2
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
            }
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="platformName">Platform name</Label>
                <Input
                  id="platformName"
                  name="platformName"
                  defaultValue="POS System"
                  required
                  maxLength={100}
                  onInput={(event) => event.currentTarget.setCustomValidity("")}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportEmail">Support email</Label>
                <Input
                  id="supportEmail"
                  name="supportEmail"
                  type="email"
                  defaultValue="support@example.com"
                  required
                  maxLength={254}
                  className="h-10"
                />
              </div>
            </div>
          </Panel>
          <Panel
            title="Branding"
            description="A consistent platform identity across the admin workspace."
          >
            <div className="flex items-center gap-4">
              <span
                className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-primary text-lg font-semibold text-primary-foreground"
                aria-hidden="true"
              >
                PS
              </span>
              <div>
                <p className="text-sm font-medium">POS System identity</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Neutral surfaces and a restrained green accent.
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between border-t pt-4">
              <div className="text-xs">
                <p className="font-medium">Primary accent</p>
                <p className="mt-1 text-muted-foreground">
                  Forest green · system theme
                </p>
              </div>
              <span
                className="size-7 rounded-md border bg-primary"
                aria-label="Green primary color"
              />
            </div>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              Custom logo uploads and theme editing will be available in a later
              phase.
            </p>
          </Panel>
          <Panel
            title="Notification preferences"
            description="Preview which platform events should generate notifications."
            action={
              <Bell
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
            }
          >
            <div className="divide-y">
              {[
                {
                  id: "registrationNotifications",
                  label: "Restaurant registrations",
                  description: "When a restaurant is added to the platform.",
                },
                {
                  id: "lifecycleNotifications",
                  label: "Lifecycle changes",
                  description:
                    "When a restaurant is activated, suspended, or archived.",
                },
              ].map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-5 py-4 first:pt-0 last:pb-0"
                >
                  <div>
                    <Label htmlFor={item.id}>{item.label}</Label>
                    <p
                      id={`${item.id}-help`}
                      className="mt-2 text-xs leading-5 text-muted-foreground"
                    >
                      {item.description}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    id={item.id}
                    name={item.id}
                    defaultChecked
                    aria-describedby={`${item.id}-help`}
                    className="size-4 shrink-0 accent-primary"
                  />
                </div>
              ))}
            </div>
          </Panel>
          <Panel
            title="System preferences"
            description="Display conventions for platform-level reporting."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="timezone">Reporting timezone</Label>
                <NativeSelect
                  id="timezone"
                  name="timezone"
                  defaultValue="Asia/Manila"
                  className="h-10"
                >
                  <NativeSelectOption value="Asia/Manila">
                    Asia/Manila (UTC+08)
                  </NativeSelectOption>
                  <NativeSelectOption value="UTC">UTC</NativeSelectOption>
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateFormat">Date format</Label>
                <NativeSelect
                  id="dateFormat"
                  name="dateFormat"
                  defaultValue="Day, month, year"
                  className="h-10"
                >
                  <NativeSelectOption>Day, month, year</NativeSelectOption>
                  <NativeSelectOption>Year-month-day</NativeSelectOption>
                </NativeSelect>
              </div>
            </div>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              Preview choices do not change the sample reports or restaurant
              settings.
            </p>
          </Panel>
        </div>
        <aside className="space-y-6">
          <Alert role="note" className="border-info/15 bg-info-muted">
            <Info aria-hidden="true" />
            <AlertTitle>Settings preview</AlertTitle>
            <AlertDescription>
              Explore platform preferences. No notifications are sent and no
              settings are saved.
            </AlertDescription>
          </Alert>
          <Panel
            title="Security"
            description="Planned for the authentication phase."
            action={
              <LockKeyhole
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
            }
          >
            <ul className="space-y-4 text-xs text-muted-foreground">
              <li className="flex justify-between gap-3">
                Session management <span>Not configured</span>
              </li>
              <li className="flex justify-between gap-3">
                Role permissions <span>Not configured</span>
              </li>
              <li className="flex justify-between gap-3">
                Multi-factor authentication <span>Not configured</span>
              </li>
            </ul>
            <p className="mt-5 border-t pt-4 text-xs leading-5 text-muted-foreground">
              Security controls will be implemented together with authentication
              and authorization.
            </p>
          </Panel>
        </aside>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="reset" variant="outline">
          Reset preview
        </Button>
        <Button type="submit">
          <Eye aria-hidden="true" />
          Preview preferences
        </Button>
      </div>
      {preview && (
        <div
          ref={previewRef}
          tabIndex={-1}
          className="space-y-4 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Alert role="status" className="border-info/15 bg-info-muted">
            <Info aria-hidden="true" />
            <AlertTitle>Preferences reviewed · nothing saved</AlertTitle>
            <AlertDescription>
              This preview will reset when you leave or reload the page.
            </AlertDescription>
          </Alert>
          <Panel title="Your preview">
            <DetailList
              items={[
                { label: "Platform", value: preview.name },
                { label: "Support email", value: preview.supportEmail },
                { label: "Reporting timezone", value: preview.timezone },
                { label: "Date format", value: preview.dateFormat },
                {
                  label: "Registration notices",
                  value: preview.registrationNotifications
                    ? "Enabled in preview"
                    : "Disabled in preview",
                },
                {
                  label: "Lifecycle notices",
                  value: preview.lifecycleNotifications
                    ? "Enabled in preview"
                    : "Disabled in preview",
                },
              ]}
            />
          </Panel>
        </div>
      )}
    </form>
  );
}
