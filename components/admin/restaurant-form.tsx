"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Eye, Info, Store, UserRound } from "lucide-react";
import { restaurantStatuses, type RestaurantListItem } from "@/lib/admin/types";
import { labelFor } from "@/lib/admin/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DetailList, Panel, StatusBadge } from "@/components/admin/page-ui";

type Values = {
  name: string;
  slug: string;
  status: string;
  ownerName: string;
  ownerEmail: string;
};

export function RestaurantForm({
  restaurant,
  reservedSlugs,
}: {
  restaurant?: RestaurantListItem;
  reservedSlugs: string[];
}) {
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>(
    {},
  );
  const [preview, setPreview] = useState<Values | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const returnUrl = restaurant
    ? `/admin/restaurants/${restaurant.id}`
    : "/admin/restaurants";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const values = Object.fromEntries(
      ["name", "slug", "status", "ownerName", "ownerEmail"].map((key) => [
        key,
        String(formData.get(key) ?? "").trim(),
      ]),
    ) as Values;
    const nextErrors: Partial<Record<keyof Values, string>> = {};
    if (values.name.length < 2 || values.name.length > 100)
      nextErrors.name = "Enter a restaurant name between 2 and 100 characters.";
    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug) ||
      values.slug.length > 60
    )
      nextErrors.slug =
        "Use up to 60 lowercase letters, numbers, and single hyphens.";
    else if (
      reservedSlugs.includes(values.slug) &&
      values.slug !== restaurant?.slug
    )
      nextErrors.slug = "This slug already belongs to a sample restaurant.";
    if (!restaurantStatuses.some((value) => value === values.status))
      nextErrors.status = "Choose a restaurant status.";
    if (values.ownerName.length < 2 || values.ownerName.length > 100)
      nextErrors.ownerName = "Enter the owner's full name (2–100 characters).";
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.ownerEmail) ||
      values.ownerEmail.length > 254
    )
      nextErrors.ownerEmail = "Enter a valid owner email address.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setPreview(null);
      form
        .querySelector<HTMLElement>(`#${Object.keys(nextErrors)[0]}`)
        ?.focus();
      return;
    }
    setPreview(values);
    requestAnimationFrame(() => previewRef.current?.focus());
  }

  function field(
    name: keyof Values,
    label: string,
    defaultValue = "",
    hint?: string,
    type = "text",
  ) {
    return (
      <div className="space-y-2">
        <Label htmlFor={name}>
          {label}
          <span className="text-muted-foreground" aria-hidden="true">
            *
          </span>
        </Label>
        <Input
          id={name}
          name={name}
          type={type}
          defaultValue={defaultValue}
          required
          maxLength={name === "ownerEmail" ? 254 : name === "slug" ? 60 : 100}
          autoComplete={
            name === "ownerEmail"
              ? "email"
              : name === "ownerName"
                ? "name"
                : "off"
          }
          aria-invalid={Boolean(errors[name])}
          aria-describedby={
            errors[name] ? `${name}-error` : hint ? `${name}-hint` : undefined
          }
          className="h-10 bg-card"
        />
        {errors[name] ? (
          <p id={`${name}-error`} className="text-xs text-destructive">
            {errors[name]}
          </p>
        ) : (
          hint && (
            <p
              id={`${name}-hint`}
              className="text-xs leading-5 text-muted-foreground"
            >
              {hint}
            </p>
          )
        )}
      </div>
    );
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <form
        noValidate
        onSubmit={submit}
        onChange={() => setPreview(null)}
        onReset={() => {
          setErrors({});
          setPreview(null);
        }}
        className="space-y-6"
      >
        <Panel
          title="Restaurant information"
          description="The identity and lifecycle of the restaurant on the platform."
          action={
            <Store
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
          }
        >
          <div className="space-y-5">
            {field("name", "Restaurant name", restaurant?.name)}
            {field(
              "slug",
              "Restaurant slug",
              restaurant?.slug,
              "A unique, readable code. For example: sinta-kitchen.",
            )}
            <div className="space-y-2">
              <Label htmlFor="status">
                Status{" "}
                <span className="text-muted-foreground" aria-hidden="true">
                  *
                </span>
              </Label>
              <NativeSelect
                id="status"
                name="status"
                defaultValue={restaurant?.status ?? "PENDING"}
                required
                aria-invalid={Boolean(errors.status)}
                aria-describedby={
                  errors.status ? "status-error" : "status-hint"
                }
                className="h-10 min-w-48"
              >
                {restaurantStatuses.map((value) => (
                  <NativeSelectOption key={value} value={value}>
                    {labelFor(value)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {errors.status ? (
                <p id="status-error" className="text-xs text-destructive">
                  {errors.status}
                </p>
              ) : (
                <p id="status-hint" className="text-xs text-muted-foreground">
                  New restaurants start as pending until their registration is
                  reviewed.
                </p>
              )}
            </div>
          </div>
        </Panel>
        <Panel
          title={restaurant ? "Restaurant owner" : "Initial restaurant owner"}
          description="An individual user who will own and manage this restaurant."
          action={
            <UserRound
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
          }
        >
          <div className="space-y-5">
            {field("ownerName", "Owner full name", restaurant?.ownerName)}
            {field(
              "ownerEmail",
              "Owner email",
              restaurant?.ownerEmail,
              "Use the individual owner's email, not a shared restaurant login.",
              "email",
            )}
          </div>
        </Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            All fields are required.
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={returnUrl}>Cancel</Link>
            </Button>
            <Button type="submit">
              <Eye aria-hidden="true" />
              {restaurant ? "Preview changes" : "Preview restaurant"}
            </Button>
          </div>
        </div>
        {preview && (
          <div
            ref={previewRef}
            tabIndex={-1}
            className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Alert role="status" className="mb-4 border-info/20 bg-info-muted">
              <Info aria-hidden="true" />
              <AlertTitle>Preview ready · nothing saved</AlertTitle>
              <AlertDescription>
                No restaurant or owner record has been created or changed.
              </AlertDescription>
            </Alert>
            <Panel title="Review your preview">
              <DetailList
                items={[
                  { label: "Restaurant", value: preview.name },
                  { label: "Slug", value: preview.slug },
                  {
                    label: "Status",
                    value: <StatusBadge status={preview.status} />,
                  },
                  { label: "Owner", value: preview.ownerName },
                  { label: "Owner email", value: preview.ownerEmail },
                ]}
              />
            </Panel>
          </div>
        )}
      </form>
      <aside className="space-y-4">
        <Alert role="note" className="border-info/15 bg-info-muted">
          <Info aria-hidden="true" />
          <AlertTitle>Form preview</AlertTitle>
          <AlertDescription>
            Use this form to review the setup flow. Changes last only while this
            page is open.
          </AlertDescription>
        </Alert>
        <div className="px-1 text-xs leading-6 text-muted-foreground">
          <h2 className="mb-2 font-medium text-foreground">
            Two connected records
          </h2>
          <p>
            The restaurant represents the business. Its initial owner is a
            separate user with an individual identity.
          </p>
          <p className="mt-3">
            This phase previews that relationship. Account invitations and
            saving will be added in a later phase.
          </p>
          {restaurant && (
            <p className="mt-3">
              Owner edits here are a preview of that user&apos;s identity, not a
              transfer of ownership.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
