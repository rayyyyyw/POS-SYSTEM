import type { ReactNode } from "react";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import type { RestaurantStatus } from "@/generated/prisma/enums";
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function RestaurantHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {title}
      </h1>
      <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
export function RestaurantPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <h2 className="text-base font-semibold">{title}</h2>
        {description && (
          <CardDescription className="leading-6">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
export function RestaurantAccessNotice({
  status,
}: {
  status: RestaurantStatus;
}) {
  const title =
    status === "SUSPENDED"
      ? "Restaurant access is suspended"
      : status === "ARCHIVED"
        ? "This restaurant is archived"
        : status === "PENDING"
          ? "Your restaurant is awaiting activation"
          : "This page is restricted";
  const detail =
    status === "ACTIVE"
      ? "Your restaurant role does not have access to this page. Contact your restaurant owner if you need help."
      : status === "PENDING"
        ? "Your owner can complete setup while the platform administrator reviews activation."
        : "Your restaurant records are preserved. Contact the platform administrator about restoring access.";
  return (
    <div className="mx-auto max-w-lg space-y-5 py-16 text-center">
      <LockKeyhole
        className="mx-auto size-9 text-muted-foreground"
        aria-hidden="true"
      />
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm leading-6 text-muted-foreground">{detail}</p>
      <Button asChild variant="outline">
        <Link href="/workspace">Your restaurants</Link>
      </Button>
    </div>
  );
}
export function RestaurantPagination({
  path,
  page,
  total,
  pageSize,
  parameter,
  otherPage,
}: {
  path: string;
  page: number;
  total: number;
  pageSize: number;
  parameter: "page" | "invitesPage";
  otherPage: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (target: number) =>
    `${path}?${parameter}=${target}&${parameter === "page" ? "invitesPage" : "page"}=${otherPage}`;
  return (
    <nav
      aria-label={parameter === "page" ? "Team pages" : "Invitation pages"}
      className="mt-5 flex flex-wrap items-center gap-3 text-sm"
    >
      <span className="mr-auto text-muted-foreground">
        {total} total · Page {page} of {pages}
      </span>
      {page > 1 && (
        <Button asChild variant="outline" size="sm">
          <Link href={href(page - 1)}>Previous</Link>
        </Button>
      )}
      {page < pages && (
        <Button asChild variant="outline" size="sm">
          <Link href={href(page + 1)}>Next</Link>
        </Button>
      )}
    </nav>
  );
}
